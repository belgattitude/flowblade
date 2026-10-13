export const quoteValue = (
  value: string | number | boolean | null | undefined
): string => {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const escapedString = value.replaceAll("'", "''");
  return `'${escapedString}'`;
};

/**
 * Quote an identifier (ie: a column alias) so it can be safely used in a query.
 */
export const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replaceAll('"', '""')}"`;

/*
const getSqlSafeAsciiString = (name: string) => {
  const ascii = transliterate(name);
  if (!name) return '';
  return (
    ascii
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036F]/g, '')
      // eslint-disable-next-line no-control-regex
      .replaceAll(/[^\u0000-\u007F]/g, '') // leftover non-ASCII removed
      .replaceAll(/\s+/g, ' ')
      .trim()
  );
}; */
