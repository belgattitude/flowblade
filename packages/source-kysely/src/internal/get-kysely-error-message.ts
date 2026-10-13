/**
 * Return the message of an error thrown by Kysely.
 *
 * Kysely can throw either an Error or an array of Errors, depending on the
 * driver and error type (ie: Tedious / mssql).
 */
export const getKyselyErrorMessage = (error: unknown): string => {
  if (Array.isArray(error)) {
    return error
      .map((e) => (e instanceof Error ? e.message : String(e)))
      .join("; ");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
};
