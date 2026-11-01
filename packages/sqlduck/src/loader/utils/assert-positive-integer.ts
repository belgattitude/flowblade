/**
 * Assert that an optional option is a safe integer between 1 and `max`
 * (unbounded when `max` is omitted).
 */
export const assertPositiveInteger = (
  value: number | undefined,
  name: string,
  max?: number
): void => {
  if (value === undefined) {
    return;
  }
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    (max !== undefined && value > max)
  ) {
    throw new Error(
      max === undefined
        ? `${name} must be a positive integer, got ${value}`
        : `${name} must be an integer between 1 and ${max}, got ${value}`
    );
  }
};

/**
 * Maximum number of rows in a chunk handed to a built-in strategy (DuckDB
 * vector size).
 */
export const MAX_CHUNK_SIZE = 2048;
