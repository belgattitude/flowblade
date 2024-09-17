import type { Compilable, InferResult, Kysely } from 'kysely';

import type { IColumnModel } from '../column-model/IColumnModel';
import { KyselyHelpers } from '../helpers/KyselyHelpers';
import type { IGetQuery, QueryBuilder } from './IGetQuery';
import type { IGuardedQuery } from './IGuardedQuery';
import type { IUserContext } from './IUserContext';

export type QueryContext = {
  user: IUserContext;
};

type Params<TDatabase> = {
  db: Kysely<TDatabase>;
  context: QueryContext;
};

export type InferResultFromAbstractQuery<
  TDatabase,
  TQuery extends AbstractQuery<TDatabase>,
  TReturn = ReturnType<Exclude<TQuery, 'getColumnModel'>['getQuery']>,
> = TReturn extends Compilable<never> ? InferResult<TReturn> : unknown;

export type InferCMFromAbstractQuery<
  TDatabase,
  TQuery extends AbstractQuery<TDatabase>,
  TResult = InferResultFromAbstractQuery<TDatabase, TQuery>,
> = TResult extends unknown[]
  ? IColumnModel<keyof TResult[number]>
  : keyof TResult;

export abstract class AbstractQuery<TDatabase>
  implements IGuardedQuery, IGetQuery<TDatabase>
{
  protected readonly db: Kysely<TDatabase>;
  public readonly context: QueryContext;

  protected helpers = {
    getSelectCols: KyselyHelpers.getSelectColsFromCm,
  };
  constructor(params: Params<TDatabase>) {
    this.db = params.db;
    this.context = params.context;
  }

  /**
   * Return required permissions for this query
   */
  abstract guards: IGuardedQuery['guards'];

  /**
   * Return the underlying sql query builder
   */
  abstract getQuery: <
    TParams extends Record<string | number | symbol, unknown>,
  >(
    params: TParams
  ) => QueryBuilder<TDatabase>;
}
