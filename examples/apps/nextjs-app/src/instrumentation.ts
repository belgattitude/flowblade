import type { DuckDBConnection } from '@duckdb/node-api';
import type { DBKyselySqlServer } from '@examples/db-sqlserver/kysely-types';
import type * as Sentry from '@sentry/nextjs';
import type { Kysely } from 'kysely';

export async function register() {
  // #######################################################
  // # Sentry                                              #
  // #######################################################
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('../sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('../sentry.edge.config');
    }
  }
  // ##################################################################################
  // # HACK FOR KEEPING ONE INSTANCE OF DATABASES IN DEV MODE                         #
  // # @see https://github.com/vercel/next.js/issues/65350#issuecomment-2831480955    #
  // ##################################################################################
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_RUNTIME === 'nodejs'
  ) {
    try {
      const { initializeDbKyselyMssqlConn } = await import(
        '@/server/config/db.kysely-mssql.config'
      ).then((mod) => mod);
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
      const { initializeDuckDbMemoryConn } = await import(
        '@/server/config/db.duckdb-memory.config'
      ).then((mod) => mod);

      console.log(
        '✅ Registering global "dbDuckDbMemoryConn" connection from instrumentation.ts'
      );
      (
        globalThis as unknown as {
          dbDuckDbMemoryConn: DuckDBConnection;
        }
      ).dbDuckDbMemoryConn = await initializeDuckDbMemoryConn();
    } catch {
      console.error(
        '❌ Could not initialize "dbDuckDbMemoryConn" connection from instrumentation.ts'
      );
    }
  }
}

let captureRequestError: typeof Sentry.captureRequestError | undefined;

if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
  captureRequestError = await import('@sentry/nextjs').then(
    (mod) => mod.captureRequestError
  );
}

export const onRequestError = captureRequestError;
