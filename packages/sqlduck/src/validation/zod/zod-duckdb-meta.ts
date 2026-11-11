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

type DuckdbVarcharMeta = {
  /** Explicit DuckDB column type, overrides the inferred one */
  duckdbType?: "VARCHAR";
  /** Collation of a VARCHAR column, ie: 'NOCASE' */
  duckdbCollate?: DuckdbCollation;
};

type DuckdbNonVarcharMeta = {
  duckdbType?: Exclude<SupportedCustomDuckDbTypes, "VARCHAR">;
  /** Only VARCHAR columns can be collated */
  duckdbCollate?: never;
};

/**
 * Metadata understood by sqlduck when creating a table from a zod schema.
 *
 * A discriminated union: `duckdbCollate` is only allowed when `duckdbType` is
 * omitted (inferred) or 'VARCHAR'.
 */
export type DuckdbZodMeta = {
  primaryKey?: boolean;
} & (DuckdbVarcharMeta | DuckdbNonVarcharMeta);

/**
 * Strictly typed helper for `.meta()`: unknown keys (ie: typos), unsupported
 * values and a `duckdbCollate` on a non VARCHAR `duckdbType` are compile errors.
 * Returns the meta unchanged.
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   id: z.int32().meta(duckMeta({ primaryKey: true })),
 *   name: z.string().meta(duckMeta({ duckdbCollate: "NOCASE" })),
 *   price: z.number().meta(duckMeta({ duckdbType: "DECIMAL(10,2)" })),
 * });
 * ```
 */
export const duckMeta = <const T extends DuckdbZodMeta>(
  meta: T & Record<Exclude<keyof T, keyof DuckdbZodMeta>, never>
): T => meta;

declare module "zod" {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- module augmentation requires an interface
  interface GlobalMeta {
    duckdbType?: SupportedCustomDuckDbTypes;
    duckdbCollate?: DuckdbCollation;
    primaryKey?: boolean;
  }
}
