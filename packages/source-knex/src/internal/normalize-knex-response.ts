export type NormalizedKnexResponse = {
  rows: unknown[];
  affectedRows: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toCount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/**
 * Normalize what awaiting a Knex query builder resolves to: an array
 * (selected or returned rows, or the inserted ids for mysql/sqlite), a number
 * (affected rows of an update/delete), an object (`first()`) or nothing.
 *
 * @internal
 */
export const normalizeKnexBuilderResponse = (
  response: unknown
): NormalizedKnexResponse => {
  if (Array.isArray(response)) {
    return { rows: response, affectedRows: 0 };
  }
  if (typeof response === "number") {
    return { rows: [], affectedRows: toCount(response) };
  }
  if (isRecord(response)) {
    return { rows: [response], affectedRows: 0 };
  }
  return { rows: [], affectedRows: 0 };
};

const isMysqlDialect = (dialect: string | undefined): boolean =>
  dialect === "mysql" || dialect === "mysql2";

/**
 * Normalize what awaiting a Knex raw query resolves to: the raw driver
 * response, which differs by dialect:
 *
 * - pg / cockroachdb: `{ rows, rowCount, command }`
 * - mysql / mysql2: `[rows, fields]` for a select, `[OkPacket, undefined]` otherwise
 * - mssql, sqlite3 (select): an array of rows
 * - better-sqlite3 (write): `{ changes, lastInsertRowid }`
 *
 * @internal
 */
export const normalizeKnexRawResponse = (
  response: unknown,
  dialect: string | undefined
): NormalizedKnexResponse => {
  if (isMysqlDialect(dialect) && Array.isArray(response)) {
    const [first] = response as unknown[];
    if (Array.isArray(first)) {
      return { rows: first, affectedRows: 0 };
    }
    return {
      rows: [],
      affectedRows: isRecord(first) ? toCount(first.affectedRows) : 0,
    };
  }
  if (Array.isArray(response)) {
    return { rows: response, affectedRows: 0 };
  }
  if (isRecord(response)) {
    if (Array.isArray(response.rows)) {
      return {
        rows: response.rows,
        affectedRows:
          response.command === "SELECT" ? 0 : toCount(response.rowCount),
      };
    }
    return { rows: [], affectedRows: toCount(response.changes) };
  }
  return { rows: [], affectedRows: 0 };
};
