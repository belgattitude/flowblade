/**
 * Postgres serialization failure and deadlock (`code`).
 */
const postgresCodes = new Set(["40001", "40P01"]);
/**
 * SQL Server deadlock victim and snapshot isolation update conflict
 * (tedious `number`).
 */
const mssqlNumbers = new Set([1205, 3960]);
/**
 * MySQL deadlock (mysql2 `errno`).
 */
const mysqlErrnos = new Set([1213]);

/**
 * Whether a driver error is a conflict with a concurrent transaction
 * (serialization failure, deadlock): Postgres (pg, postgres.js), SQL Server
 * (tedious) and MySQL (mysql2) errors are recognized.
 *
 * @internal
 */
export const isKyselyTransactionConflict = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const { code, sqlState, number, errno } = error as Record<string, unknown>;
  return (
    (typeof code === "string" && postgresCodes.has(code)) ||
    sqlState === "40001" ||
    (typeof number === "number" && mssqlNumbers.has(number)) ||
    (typeof errno === "number" && mysqlErrnos.has(errno))
  );
};
