import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from 'kysely';

type KyselyQueryBuilder<TDatabase> = Pick<
  Kysely<TDatabase>,
  | 'mergeInto'
  | 'selectFrom'
  | 'selectNoFrom'
  | 'deleteFrom'
  | 'updateTable'
  | 'insertInto'
  | 'replaceInto'
  | 'with'
  | 'withRecursive'
  | 'withTables'
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let kyselyCache: undefined | Kysely<any>;

export const createDuckKysekyQueryBuilder = <TDatabase>(params?: {
  schema?: string;
}): KyselyQueryBuilder<TDatabase> => {
  kyselyCache ??= new Kysely<TDatabase>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });
  if (params?.schema) {
    return kyselyCache.withSchema(params.schema);
  }
  return kyselyCache;
};
