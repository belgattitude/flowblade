import type { DuckDatabaseManagerDbParams } from '../database/duck-database-manager.schemas.ts';

export interface IGetRawSql {
  getRawSql: <TParams extends DuckDatabaseManagerDbParams>(
    params: TParams
  ) => string;
}
