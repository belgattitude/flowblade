import type { QColumnModel } from "../cm/q-column-model";

export interface QMetaMapSpan {
  type: "map";
  /**
   * Time in milliseconds
   */
  timeMs: number;
}

export interface QMetaSqlSpan {
  type: "sql";
  sql: string;
  params: readonly unknown[];
  timeMs: number;
  affectedRows: number;
}

export interface QMetaCustomSpan<T extends string> {
  type: T;
  timeMs: number;
  affectedRows: number;
}

export type QMetaSpan<TCustom extends string = string> =
  | QMetaKnownSpan
  | QMetaCustomSpan<TCustom>;

export interface QMetaMaterializationSpan {
  type: "materialization";
  /**
   * DDL used to create the materialized table
   */
  ddl: string;
  timeMs: number;
  affectedRows: number;
  /**
   * Full name of the materialized table
   */
  tableName: string;
}

/**
 * Spans with a dedicated shape, discriminated by their `type`.
 */
export type QMetaKnownSpan =
  | QMetaSqlSpan
  | QMetaMapSpan
  | QMetaMaterializationSpan;

/**
 * Span shape for a given span type: the known shape when there is one,
 * otherwise a custom span (which always carries `affectedRows`).
 */
export type QMetaSpanOfType<TType extends string> =
  TType extends QMetaKnownSpan["type"]
    ? Extract<QMetaKnownSpan, { type: TType }>
    : QMetaCustomSpan<TType>;

/**
 * Store an immutable snapshot of the span: the caller's object is left untouched
 * and the stored span (and its `params`, if any) can't be modified afterwards.
 * The freeze is shallow on purpose, spans may hold class instances or functions.
 */
const hasParams = (
  span: QMetaSpan
): span is QMetaSpan & { params: readonly unknown[] } =>
  "params" in span && Array.isArray(span.params);

const freezeSpan = <T extends QMetaSpan>(span: T): T => {
  if (Object.isFrozen(span)) {
    return span;
  }
  const copy = hasParams(span)
    ? { ...span, params: Object.freeze([...span.params]) }
    : { ...span };
  return Object.freeze(copy);
};

type ConstructorParams = {
  cm?: QColumnModel;
  spans?: QMetaSpan | QMetaSpan[];
  name?: string;
};

export type QMetaJsonifiable = {
  name?: string;
  spans: QMetaSpan[];
};

export class QMeta {
  readonly #name: string | undefined;

  get name(): string | undefined {
    return this.#name;
  }

  private readonly spans: QMetaSpan[] = [];

  /**
   * Construct a new span
   *
   * @example
   * ```typescript
   * const sqlSpan: QMetaSqlSpan = {
   *    type: 'sql',
   *    sql: 'SELECT * FROM users',
   *    params: [],
   *    timeMs: 12,
   *    affectedRows: 10
   * }
   * const meta = new QMeta({
   *   spans: sqlSpan
   * });
   * ```
   */
  constructor(params: ConstructorParams) {
    const { spans, name } = params;
    if (Array.isArray(spans)) {
      this.spans.push(...spans.map(freezeSpan));
    } else if (spans !== undefined) {
      this.spans.push(freezeSpan(spans));
    }
    this.#name = name;
  }
  getSpans = (): Readonly<QMetaSpan>[] => {
    return this.spans;
  };

  /**
   * Return the most recent span or undefined there isn't any
   */
  getLatestSpan = (): Readonly<QMetaSpan> | undefined => {
    return this.spans.at(-1)!;
  };

  /**
   * Return spans by type 'sql', 'map', or any custom type.
   * The returned span type is narrowed by `type`; custom types expose `affectedRows`.
   */
  getSpansByType = <TType extends string>(
    type: TType
  ): Readonly<QMetaSpanOfType<TType>>[] => {
    return this.spans.filter((span) => span.type === type) as Readonly<
      QMetaSpanOfType<TType>
    >[];
  };

  /**
   * @example
   * ```typescript
   * const meta = new QMeta();
   * meta.addSpan({
   *    type: 'sql',
   *    sql: 'SELECT * FROM users',
   *    params: [],
   *    timeMs: 13,
   *    affectedRows: 10
   * });
   * ```
   */
  addSpan = (span: QMetaSpan): void => {
    this.spans.push(freezeSpan(span));
  };

  /**
   * Insert a span at the beginning, before any existing span.
   *
   * @example
   * ```typescript
   * const meta = new QMeta({ spans: sqlSpan });
   * meta.prependSpan({
   *    type: 'materialization',
   *    ddl: 'CREATE TABLE ...',
   *    tableName: 'users',
   *    timeMs: 13,
   *    affectedRows: 10
   * });
   * meta.getSpans()[0]?.type; // 'materialization'
   * ```
   */
  prependSpan = (span: QMetaSpan): void => {
    this.spans.unshift(freezeSpan(span));
  };

  /**
   * Return a new instance of QMeta with the provided span added.
   *
   * @example
   * ```typescript
   * const sqlSpan: QMetaSqlSpan = {
   *    type: 'sql',
   *    sql: 'SELECT * FROM users',
   *    params: [],
   *    timeMs: 13,
   *    affectedRows: 10
   * }
   * const meta = new QMeta({
   *   spans: sqlSpan
   * });
   * const newMeta = meta.withSpan({
   *   type: 'transform',
   *   name: 'calculate user discount',
   *   timeMs: 14,
   * });
   * ```
   */
  withSpan = (span: QMetaSpan): QMeta => {
    const meta = new QMeta({
      spans: this.spans,
    });
    meta.addSpan(span);
    return meta;
  };
  /**
   * Return the total time of all spans.
   *
   * @example
   * ```typescript
   * const meta = new QMeta({}).withSpan({
   *   type: 'map',
   *   timeMs: 1000,
   * }).withSpan({
   *   type: 'map',
   *   timeMs: 2000,
   * });
   * console.log(meta.getTotalTimeMs()); // 3000
   * ```
   */
  getTotalTimeMs = (): number => {
    return Math.round(this.spans.reduce((acc, span) => acc + span.timeMs, 0));
  };

  /**
   * Provide a JSON serializable representation of the QMeta instance.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description
   */
  toJSON = (): QMetaJsonifiable => {
    const { name } = this;
    const json: QMetaJsonifiable = { spans: this.spans };
    if (name !== undefined) {
      json.name = name;
    }
    return json;
  };
}
