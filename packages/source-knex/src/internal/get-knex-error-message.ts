/**
 * Return the message of an error thrown by Knex or its driver.
 *
 * Some drivers (ie: mssql / tedious) can throw an array of errors.
 */
export const getKnexErrorMessage = (error: unknown): string => {
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
