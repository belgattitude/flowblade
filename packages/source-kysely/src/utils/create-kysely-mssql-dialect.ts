import { MssqlDialect } from 'kysely';
import * as tarn from 'tarn';
import * as tedious from 'tedious';

/**
 * Create a Kysely dialect for Microsoft SQL Server.
 *
 * @example
 * ```typescript
 * const jdbcDsn = "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";
 * const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);
 * const tediousConnection = new Tedious.Connection(tediousConfig);
 *
 * const dialect = createKyselyMssqlDialect(tediousConfig, {
 *   // Optional tarn pool options
 *   tarnPool: {
 *     min: 0,
 *     max: 10
 *   }
 * });
 *
 * const db = new Kysely<DB>({
 *   dialect
 * })
 * ```
 */
export const createKyselyMssqlDialect = (
  tediousConfig: tedious.ConnectionConfiguration,
  options?: {
    tarnPool?: {
      /** default: 0 */
      min?: number;
      /** default: 10 */
      max?: number;
    };
  }
) => {
  const { tarnPool = {} } = options ?? {};
  const { min = 0, max = 10 } = tarnPool;
  return new MssqlDialect({
    tarn: {
      ...tarn,
      options: {
        min,
        max,
      },
      /**
       * @todo when https://github.com/kysely-org/kysely/pull/1073/files is merged
       * Controls whether connections are validated before being acquired from the pool. Connection validation performs additional requests to the database.
       *
       * Defaults to `true`.
       */
      // validateConnections: false
    },
    tedious: {
      ...tedious,
      // See https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
      TYPES: { ...tedious.TYPES, NVarChar: tedious.TYPES.VarChar },
      connectionFactory: () => {
        return new tedious.Connection(tediousConfig);
      },
      /**
       * @todo when https://github.com/kysely-org/kysely/pull/1073/files is merged
       *
       * Controls whether connections are reset to their initial states when released back to the pool. Resetting a connection performs additional requests to the database.
       * See {@link https://tediousjs.github.io/tedious/api-connection.html#function_reset | connection.reset}.
       *
       * Defaults to `true`.
       */
      // resetConnectionOnRelease: false
    },
  });
};
