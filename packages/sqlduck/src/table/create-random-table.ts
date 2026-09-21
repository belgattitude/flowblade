import { customAlphabet } from "nanoid/non-secure";

import { Table } from "../objects/table.ts";
import { isDuckdbValidIdentifier } from "../validation/core/is-duckdb-valid-identifier.ts";

type Params = {
  prefix?: string;
  schema?: string;
  database?: string;
};

export const createRandomTable = (params?: Params): Table => {
  const { schema, database, prefix = "" } = params ?? {};
  if (prefix !== "" && !isDuckdbValidIdentifier(prefix)) {
    throw new Error(
      "Invalid table prefix. Only alphanumeric characters and underscores are allowed."
    );
  }
  const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvw", 15);
  const tableName = [prefix.trim() === "" ? false : prefix, nanoid()]
    .filter(Boolean)
    .join("_");

  return new Table({
    name: tableName,
    schema,
    database,
  });
};
