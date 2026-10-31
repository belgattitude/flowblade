/**
 * Assert that an optional "every N chunks" option is between 1 and 100_000.
 */
export const assertFrequency = (
  value: number | undefined,
  name: string
): void => {
  if (value !== undefined && (value < 1 || value > 100_000)) {
    throw new Error(`${name} must be a number between 1 and 100_000.`);
  }
};
