import {
  createKyselyMssqlDialect,
  TediousConnUtils,
} from '@flowblade/source-kysely';

const defaultPoolOptions = {
  min: 0,
  max: 10,
};

const defaultDialectConfig = {
  validateConnections: true,
  resetConnectionsOnRelease: true,
};

const defaultTediousRequestTimeout = 120_000; // 2 minutes
const defaultTediousConnectTimeout = 30_000; // 30 seconds

export type CreateDbBaseAuthDialectParams = {
  jdbcDsn: string;
  poolOptions?: {
    min: number;
    max: number;
  };
  dialectConfig?: {
    validateConnections?: boolean;
    resetConnectionsOnRelease?: boolean;
  };
};

export const createDbBaseAuthDialect = (
  params: CreateDbBaseAuthDialectParams
) => {
  const {
    jdbcDsn,
    poolOptions = defaultPoolOptions,
    dialectConfig = defaultDialectConfig,
  } = params;

  const { options, ...restTediousConfig } =
    TediousConnUtils.fromJdbcDsn(jdbcDsn);

  return createKyselyMssqlDialect({
    tediousConfig: {
      ...restTediousConfig,
      options: {
        connectTimeout: defaultTediousConnectTimeout,
        requestTimeout: defaultTediousRequestTimeout,
        ...options,
      },
    },
    poolOptions,
    dialectConfig,
  });
};
