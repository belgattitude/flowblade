import type { QColumnModel } from "../cm/q-column-model";
import type {
  TransactionAccessMode,
  TransactionIsolationLevel,
} from "../datasource/transaction.interface";

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
 * Span of a transaction (`transaction()` / `transactionOrThrow()`), the
 * queries run in the transaction have their own spans.
 */
export interface QMetaTransactionSpan {
  type: "transaction";
  /**
   * How the transaction ended: committed, rolled back (the callback threw or
   * called `tx.rollback()`) or failed (couldn't begin, commit or roll back).
   */
  status: "committed" | "rolled back" | "failed";
  /**
   * Time spent to begin and end (commit / rollback) the transaction in
   * milliseconds, the queries time is in their own spans.
   */
  timeMs: number;
  isolationLevel?: TransactionIsolationLevel;
  accessMode?: TransactionAccessMode;
  /**
   * Number of retries after a conflict (see the `retry` option), set when
   * retried: the spans are the ones of the last attempt.
   */
  retries?: number;
}

/**
 * Span of a savepoint (ie: `tx.savepoint()`), the queries run in the
 * savepoint have their own spans.
 */
export interface QMetaSavepointSpan {
  type: "savepoint";
  /**
   * Name of the savepoint (its label, not the SQL identifier).
   */
  name: string;
  /**
   * How the savepoint ended: released, rolled back (the callback threw or a
   * query failed in the savepoint) or failed (couldn't be created, rolled
   * back or released).
   */
  status: "released" | "rolled back" | "failed";
  /**
   * Time spent to create and end (release / rollback) the savepoint in
   * milliseconds, the queries time is in their own spans.
   */
  timeMs: number;
}

/**
 * Spans with a dedicated shape, discriminated by their `type`.
 */
export type QMetaKnownSpan =
  | QMetaSqlSpan
  | QMetaMapSpan
  | QMetaMaterializationSpan
  | QMetaTransactionSpan
  | QMetaSavepointSpan;

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
  getSpans = (): Readonly<QMetaSpan>[] => this.spans;

  /**
   * Return the most recent span or undefined there isn't any
   */
  getLatestSpan = (): Readonly<QMetaSpan> | undefined => this.spans.at(-1);

  /**
   * Return spans by type 'sql', 'map', or any custom type.
   * The returned span type is narrowed by `type`; custom types expose `affectedRows`.
   */
  getSpansByType = <TType extends string>(
    type: TType
  ): Readonly<QMetaSpanOfType<TType>>[] =>
    this.spans.filter((span) => span.type === type) as Readonly<
      QMetaSpanOfType<TType>
    >[];

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
  getTotalTimeMs = (): number =>
    Math.round(this.spans.reduce((acc, span) => acc + span.timeMs, 0));

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
