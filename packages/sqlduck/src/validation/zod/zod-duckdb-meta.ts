import type { SupportedCustomDuckDbTypes } from "../../table/get-table-create-from-zod.ts";

type BuiltinCollation = "NOCASE" | "NOACCENT" | "NFC";

/**
 * Collation of a VARCHAR column: built-in (NOCASE, NOACCENT, NFC), combined
 * (ie: 'NOCASE.NOACCENT') or ICU (ie: 'fr', 'en_US').
 */
export type DuckdbCollation =
  | BuiltinCollation
  | `${BuiltinCollation}.${BuiltinCollation}`
  | Lowercase<string>
  | `${Lowercase<string>}_${Uppercase<string>}`;

/**
 * Metadata understood by sqlduck when creating a table from a zod schema.
 */
export type DuckdbZodMeta = {
  /** Explicit DuckDB column type, overrides the inferred one */
  duckdbType?: SupportedCustomDuckDbTypes;
  /** Collation of a VARCHAR column, ie: 'NOCASE' */
  duckdbCollate?: DuckdbCollation;
  primaryKey?: boolean;
};

declare module "zod" {
  // oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type, typescript/consistent-type-definitions -- module augmentation requires an interface
  interface GlobalMeta extends DuckdbZodMeta {}
}
