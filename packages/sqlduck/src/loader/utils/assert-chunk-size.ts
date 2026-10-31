/**
 * Assert that a number of rows per chunk is an integer between 1 and 2048
 * (DuckDB vector size).
 */
export const assertChunkSize = (value: number, name: string): void => {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2048) {
    throw new Error(`${name} must be a number between 1 and 2048`);
  }
};
