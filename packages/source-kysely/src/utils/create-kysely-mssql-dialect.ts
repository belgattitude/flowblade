import { MssqlDialect, type MssqlDialectConfig } from 'kysely';
import { default as tarn } from 'tarn';
import * as Tedious from 'tedious';

import {
  createTarnPoolOptions,
  type TarnPoolOptions,
} from './create-tarn-pool-options';

export type KyselyMssqlPoolOptions = {
  /**
   * Logger function, noop by default
   */
  log?: MssqlDialectConfig['tarn']['options']['log'];
} & TarnPoolOptions;

export type KyselyMssqlDialectParams = {
  tediousConfig: Tedious.ConnectionConfiguration;
  poolOptions?: KyselyMssqlPoolOptions;
  dialectConfig?: {
    /**
     * When true, connections are reset to their initial states when released back to the pool,
     * resulting in additional requests to the database.
     *
     * Defaults to `false`.
     */
    resetConnectionsOnRelease?: MssqlDialectConfig['resetConnectionsOnRelease'];

    /**
     * When true, connections are validated before being acquired from the pool,
     * resulting in additional requests to the database.
     *
     * In safe scenarios, this can be set to false to improve performance.
     *
     * Defaults to `true`.
     */
    validateConnections?: MssqlDialectConfig['validateConnections'];
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
 *    propagateCreateError: false,   // Propagate connection creation errors, default false
 *    log: (msg) => console.log(msg) // Custom logger, default noop
 *  },
 *  // 👉 Optional tarn pool options
 *  dialectConfig: {
 *    // 👉 Validate connections before being acquired from the pool, default true
 *    validateConnections: true,
 *    // 👉 Reset connection on pool release, default false
 *    resetConnectionsOnRelease: false,
 *    // 👉 Override Tedious types to enhance compatibility and modern support
 *    tediousTypes: {
 *      ...Tedious.TYPES,
 *      // see https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
 *      NVarChar: Tedious.TYPES.VarChar,
 *      // see https://github.com/kysely-org/kysely/issues/1596#issuecomment-3341591075
 *      DateTime: Tedious.TYPES.DateTime2,
 *    }
 *  }
 * });
 *
 * const db = new Kysely<DB>({
 *   dialect
 * })
 * ```
 */
export const createKyselyMssqlDialect = (
  params: KyselyMssqlDialectParams
): MssqlDialect => {
  const { tediousConfig, poolOptions = {}, dialectConfig } = params;

  const {
    tediousTypes,
    resetConnectionsOnRelease = false,
    validateConnections = true,
  } = dialectConfig ?? {};
  return new MssqlDialect({
    tarn: {
      ...tarn,
      options: {
        ...createTarnPoolOptions(poolOptions),
      },
    },
    validateConnections,
    resetConnectionsOnRelease,
    tedious: {
      ...Tedious,
      // See https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
      ...(tediousTypes === undefined ? {} : { TYPES: tediousTypes }),
      connectionFactory: () => {
        return new Tedious.Connection(tediousConfig);
      },
    },
  });
};
