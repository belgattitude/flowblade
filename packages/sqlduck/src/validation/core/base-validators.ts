/**
 * Constraints of DuckDB identifiers (aliases, schema and table names...).
 * Shared by the zod and valibot identifier schemas.
 */
export const duckIdentifierConstraints = {
  minLength: 1,
  maxLength: 120,
  pattern: /^[a-z_]\w*$/i,
  messages: {
    format:
      "Identifier must start with a letter or underscore, and contain only letters, numbers and underscores",
    reservedKeyword:
      "Identifier value is a DuckDB reserved keyword and cannot be used as an identifier",
  },
} as const;
