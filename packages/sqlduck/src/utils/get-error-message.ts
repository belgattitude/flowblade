/**
 * Return the message of a caught value (an Error, or anything thrown).
 */
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
