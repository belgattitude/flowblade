export const duckIdentifierMaxLength = 120;
export const duckIdentifierNameRegex = /^[a-z_]\w*$/i;
export const duckStorageVersionRegexp = /^v?\d{1,4}\.\d{1,4}\.\d{1,4}$/;

/**
 * DuckDB `memory_limit` value: a decimal number followed by a unit
 * (KB, MB, GB, TB for 1000^i or KiB, MiB, GiB, TiB for 1024^i, case-insensitive,
 * optional space), or a percentage of the system memory.
 *
 * @example
 * ```typescript
 * duckMemoryLimitRegex.test('2.7GB'); // true
 * duckMemoryLimitRegex.test('4 GiB'); // true
 * duckMemoryLimitRegex.test('80%'); // true
 * duckMemoryLimitRegex.test('2G'); // false
 * ```
 */
export const duckMemoryLimitRegex =
  /^(?:\d+(?:\.\d+)?\s*[KMGT]i?B|\d+(?:\.\d+)?%)$/i;

/**
 * DuckDB `threads` value as a string: a positive integer.
 */
export const duckThreadsRegex = /^[1-9]\d*$/;

export const duckMemoryLimitErrorMessage =
  'Memory limit must be a number followed by KB, MB, GB, TB, KiB, MiB, GiB or TiB, or a percentage (e.g. "512MB", "2.7GB", "4GiB", "80%")';

export const duckThreadsErrorMessage =
  'Threads must be a positive integer string (e.g. "4")';
