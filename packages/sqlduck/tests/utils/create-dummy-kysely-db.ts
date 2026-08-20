import { assertNever } from "@httpx/assert";
import {
  Kysely,
  DummyDriver,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  MssqlAdapter,
  MssqlIntrospector,
  MssqlQueryCompiler,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from "kysely";
import type { KyselyConfig } from "kysely";

/**
 * Creates a dummy Kysely database instance for testing purposes.
 */
export const createDummyKyselyDb = <
  TDatabase extends Record<string, Record<string, unknown>>,
>(
  type: "postgresql" | "mssql" | "sqlite"
): Kysely<TDatabase> => {
  let dialect: KyselyConfig["dialect"];
  switch (type) {
    case "sqlite":
      dialect = {
        createAdapter: () => new SqliteAdapter(),
        createDriver: () => new DummyDriver(),
        createIntrospector: (db) => new SqliteIntrospector(db),
        createQueryCompiler: () => new SqliteQueryCompiler(),
      };
      break;
    case "mssql":
      dialect = {
        createAdapter: () => new MssqlAdapter(),
        createDriver: () => new DummyDriver(),
        createIntrospector: (db) => new MssqlIntrospector(db),
        createQueryCompiler: () => new MssqlQueryCompiler(),
      };
      break;
    case "postgresql":
      dialect = {
        createAdapter: () => new PostgresAdapter(),
        createDriver: () => new DummyDriver(),
        createIntrospector: (db) => new PostgresIntrospector(db),
        createQueryCompiler: () => new PostgresQueryCompiler(),
      };
      break;
    default:
      assertNever(type);
  }

  return new Kysely<TDatabase>({
    dialect,
  });
};
