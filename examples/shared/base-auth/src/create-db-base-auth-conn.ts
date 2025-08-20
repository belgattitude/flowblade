import { Kysely, type KyselyPlugin, WithSchemaPlugin } from 'kysely';

import {
  createDbBaseAuthDialect,
  type CreateDbBaseAuthDialectParams,
} from './create-db-base-auth-dialect';
import { dbBaseAuthConfig } from './db-base-auth.config';
import type { DBBaseAuth } from './db-base-auth-types';
export type CreateDbBaseAuthConnParams = CreateDbBaseAuthDialectParams & {
  schema?: string;
  skipSchemaPlugin?: boolean;
};

const DEFAULT_SCHEMA = dbBaseAuthConfig.schema;

export const createDbBaseAuthConn = (
  params: CreateDbBaseAuthConnParams
): Kysely<DBBaseAuth> => {
  const {
    schema = DEFAULT_SCHEMA,
    skipSchemaPlugin = false,
    ...dialectParams
  } = params;
  const plugins: KyselyPlugin[] = [
    skipSchemaPlugin ? undefined : new WithSchemaPlugin(schema),
  ].filter((v) => v !== undefined);

  return new Kysely<DBBaseAuth>({
    dialect: createDbBaseAuthDialect(dialectParams),
    plugins,
  });
};
