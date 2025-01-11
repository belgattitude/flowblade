import type { QColumnModel } from '../cm/q-column-model';

export interface QMetaMapSpan {
  type: 'map';
  timeMs: number;
}

export interface QMetaSqlSpan {
  type: 'sql';
  sql: string;
  params: unknown[];
  timeMs: number;
  affectedRows: number;
}

export type QMetaSpan = QMetaSqlSpan | QMetaMapSpan;

type ConstructorParams = {
  cm?: QColumnModel;
  /**
   * Optional initial spans as an array or a single span.
   */
  spans?: QMetaSpan | QMetaSpan[];
  name?: string;
};

export class QMeta {
  public readonly name?: string;
  private spans: QMetaSpan[] = [];

  /**
   * Construct a new span
   *
   * @example
   * ```typescript
   * const sqlSpan: QMetaSqlSpan = {
   *    type: 'sql',
   *    sql: 'SELECT * FROM users',
   *    params: [],
   *    timeMs: 10.334,
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
      this.spans.push(...spans);
    } else if (spans !== undefined) {
      this.spans.push(spans);
    }
    this.name = name;
  }
  getSpans = (): Readonly<QMetaSpan>[] => {
    return this.spans;
  };
  /**
   * @example
   * ```typescript
   * const meta = new QMeta();
   * meta.addSpan({
   *    type: 'sql',
   *    sql: 'SELECT * FROM users',
   *    params: [],
   *    timeMs: 10.334,
   *    affectedRows: 10
   * });
   * ```
   */
  addSpan = (span: QMetaSpan): void => {
    this.spans.push(span);
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
   *    timeMs: 10.334,
   *    affectedRows: 10
   * }
   * const meta = new QMeta({
   *   spans: sqlSpan
   * });
   * const newMeta = meta.withSpan({
   *   type: 'transform',
   *   name: 'calculate user discount',
   *   timeMs: 5.123,
   * });
   * ```
   */
  withSpan = (span: QMetaSpan): QMeta => {
    const meta = new QMeta({
      spans: structuredClone(this.spans),
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
    return this.spans.reduce((acc, span) => acc + span.timeMs, 0);
  };

  /**
   * Profide a JSON serializable representation of the QMeta instance.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description
   */
  toJSON = (): {
    spans: QMetaSpan[];
  } => {
    const { name } = this;
    return {
      spans: this.spans,
      ...(name === undefined ? {} : { name }),
    };
  };
}
