import { MssqlDialect, type MssqlDialectConfig } from 'kysely';
import { default as tarn } from 'tarn';
import * as Tedious from 'tedious';

import {
  createTarnPoolOptions,
  type TarnPoolOptions,
} from './create-tarn-pool-options';

type PoolOptions = {
  /**
   * Controls whether connections are validated before being acquired from the pool.
   * Connection validation performs additional requests to the database.
   */
  validateConnections?: MssqlDialectConfig['tarn']['options']['validateConnections'];

  /**
   * Logger function, noop by default
   */
  log?: MssqlDialectConfig['tarn']['options']['log'];
} & TarnPoolOptions;

type Params = {
  tediousConfig: Tedious.ConnectionConfiguration;
  poolOptions?: PoolOptions;
  dialectConfig?: {
    /**
     * Controls whether connections are reset to their initial states when released back to the pool.
     * Resetting a connection performs additional requests to the database.
     *
     * See {@link https://tediousjs.github.io/tedious/api-connection.html#function_reset | connection.reset}.
     *
     * Defaults to `true`.
     */
    resetConnectionOnRelease?: boolean;
    tediousTypes?: typeof Tedious.TYPES;
  };
};

/**
 * Create a Kysely dialect for Microsoft SQL Server.
 *
 * @example
 * ```typescript
 * import { default as Tedious } from 'tedious';
 * import { TediousConnUtils, createKyselyMssqlDialect } from '@flowblade/source-kysely';
 *
 * const jdbcDsn = "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";
 * const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);
 *
 * const dialect = createKyselyMssqlDialect({
 *  tediousConfig,
 *  // 👉 Optional tarn pool options
 *  poolOptions: {
 *    min: 0,                        // Minimum number of connections, default 0
 *    max: 10,                       // Minimum number of connections, default 10
 *    validateConnections: true,     // Revalidate new connections, default true
 *    propagateCreateError: false,   // Propagate connection creation errors, default false
 *    log: (msg) => console.log(msg) // Custom logger, default noop
 *  },
 *  // 👉 Optional tarn pool options
 *  dialectConfig: {
 *    // 👉 Reset connection on pool release, default true
 *    resetConnectionOnRelease: true,
 *    // 👉 Example based on https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
 *    tediousTypes: { ...Tedious.TYPES, NVarChar: Tedious.TYPES.VarChar}
 *  }
 * });
 *
 * const db = new Kysely<DB>({
 *   dialect
 * })
 * ```
 */
export const createKyselyMssqlDialect = (params: Params): MssqlDialect => {
  const { tediousConfig, poolOptions = {}, dialectConfig } = params;
  const { validateConnections, ...tarnOptions } = poolOptions;

  const { tediousTypes, resetConnectionOnRelease = true } = dialectConfig ?? {};
  return new MssqlDialect({
    tarn: {
      ...tarn,
      options: {
        ...createTarnPoolOptions(tarnOptions),
        validateConnections,
      },
    },

    tedious: {
      ...Tedious,
      // See https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
      ...(tediousTypes === undefined ? {} : { TYPES: tediousTypes }),
      connectionFactory: () => {
        return new Tedious.Connection(tediousConfig);
      },
      resetConnectionOnRelease,
    },
  });
};
