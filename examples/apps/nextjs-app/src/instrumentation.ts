import type { DuckDBConnection } from "@duckdb/node-api";
import type { DBKyselySqlServer } from "@examples/db-sqlserver/kysely-types";
import { configure } from "@logtape/logtape";
import type { Kysely } from "kysely";

import { logtapeServerConfig } from "@/server/config/logtape-server.config.ts";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await configure(logtapeServerConfig);
  }

  // ##################################################################################
  // # HACK FOR KEEPING ONE INSTANCE OF DATABASES IN DEV MODE                         #
  // # @see https://github.com/vercel/next.js/issues/65350#issuecomment-2831480955    #
  // ##################################################################################
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_RUNTIME === "nodejs"
  ) {
    try {
      const { initializeDbKyselyMssqlConn } =
        await import("@/server/config/db.kysely-mssql.config").then(
          (mod) => mod
        );
      console.log(
        '✅ Registering global "dbKyselyMssqlConn" connection from instrumentation.ts'
      );
      (
        globalThis as unknown as {
          dbKyselyMssqlConn: Kysely<DBKyselySqlServer>;
        }
      ).dbKyselyMssqlConn = initializeDbKyselyMssqlConn();
    } catch {
      console.error(
        '❌ Could not initialize "dbKyselyMssqlConn" connection from instrumentation.ts'
      );
    }

    try {
      const { createDuckDbMemoryConnection } =
        await import("@/server/config/db.duckdb-memory.config").then(
          (mod) => mod
        );

      console.log(
        '✅ Registering global "dbDuckDbMemoryConn" connection from instrumentation.ts'
      );
      (
        globalThis as unknown as {
          dbDuckDbMemoryConn: DuckDBConnection;
        }
      ).dbDuckDbMemoryConn = await createDuckDbMemoryConnection();
    } catch (error) {
      console.error(
        `❌ Could not initialize "dbDuckDbMemoryConn" connection from instrumentation.ts: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }
}
