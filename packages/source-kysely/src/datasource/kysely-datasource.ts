import type {
  Compilable,
  CompiledQuery,
  InferResult,
  Kysely,
  RawBuilder,
} from 'kysely';
import type { Simplify, Writable } from 'type-fest';

import { parseBigIntToSafeInt } from '../utils/internal/internal-utils';
import type {
  DatasourceExecutorSuccess,
  DatasourceInterface,
} from './datasource.interface';

type Params<TDatabase> = {
  connection: Kysely<TDatabase>;
};

export class KyselyDatasource<TDatabase> implements DatasourceInterface {
  private db: Kysely<TDatabase>;

  constructor(params: Params<TDatabase>) {
    this.db = params.connection;
  }

  getConnection = (): Kysely<TDatabase> => this.db;

  queryRaw = async <
    TRawQuery extends RawBuilder<unknown>,
    TQueryResult = Simplify<Awaited<ReturnType<TRawQuery['execute']>>['rows']>,
  >(
    rawQuery: TRawQuery
  ): Promise<DatasourceExecutorSuccess<TQueryResult>> => {
    let compiled: CompiledQuery | null = null;
    try {
      compiled = rawQuery.compile(this.db);
      const start = performance.now();
      const { numAffectedRows, ...result } = await rawQuery.execute(this.db);
      const timeMs = performance.now() - start;
      const affectedRows = parseBigIntToSafeInt(numAffectedRows);

      const meta = {
        query: {
          sql: compiled.sql,
          params: compiled.parameters as Writable<unknown[]>,
        },
        timeMs,
        ...(affectedRows === undefined ? {} : { affectedRows }),
      };
      return {
        data: result.rows as TQueryResult,
        meta,
      };
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  query = async <
    TQuery extends Compilable<unknown>,
    TRet = InferResult<TQuery>,
  >(
    query: TQuery
  ): Promise<DatasourceExecutorSuccess<TRet>> => {
    let compiled: CompiledQuery | null = null;
    try {
      const start = performance.now();
      compiled = query.compile();
      const r = await this.db.executeQuery(query);
      const { numAffectedRows, ...result } = r;
      const timeMs = performance.now() - start;
      const affectedRows = parseBigIntToSafeInt(numAffectedRows);
      return {
        data: result.rows as TRet,
        meta: {
          query: {
            sql: compiled.sql,
            params: compiled.parameters as Writable<unknown[]>,
          },
          timeMs,
          ...(affectedRows === undefined ? {} : { affectedRows }),
        },
      };
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  // eslint-disable-next-line require-yield,sonarjs/generator-without-yield
  async *stream<TQuery extends Compilable<unknown>, TRet = InferResult<TQuery>>(
    _query: TQuery,
    _chunkSize: number
  ): AsyncIterableIterator<DatasourceExecutorSuccess<TRet>> {
    throw new Error('Not implemented yet');
  }
}
