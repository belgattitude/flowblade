import { type AliasedRawBuilder, sql } from 'kysely';

import type { IColumnModel } from '../column-model/IColumnModel';

type RawAliases<TColModel> = {
  [k in keyof TColModel]?: AliasedRawBuilder<string | number | boolean, string>;
};

type KyselyHelpersSelectColsParams<TColModel extends Record<string, unknown>> =
  {
    columnModel: TColModel;
    rawAliases?: RawAliases<TColModel> | undefined;
  };

type KyselySelectCols<
  TP extends KyselyHelpersSelectColsParams<Record<string, unknown>>,
> = (TP['rawAliases'] extends Record<infer K, unknown>
  ? Exclude<keyof TP['columnModel'], K> | AliasedRawBuilder
  : keyof TP['columnModel'])[];

export const KyselyHelpers = {
  getSelectColsFromCm: <
    TColModel extends Partial<IColumnModel>,
    TP extends KyselyHelpersSelectColsParams<TColModel>,
  >(
    params: TP
  ): KyselySelectCols<TP> => {
    const { rawAliases } = params ?? {};
    return Object.keys(params.columnModel).map((colName) => {
      if (rawAliases !== undefined && colName in rawAliases) {
        return (rawAliases as Record<string, unknown>)[colName];
      }
      return colName;
    }) as KyselySelectCols<TP>;
  },

  _doNotUseYet: <TColModel extends Record<string, unknown>>(
    columnModel: TColModel
  ) => {
    /**
     * @todo Cook a bit the idea (ie: we don't want to have issues with date coercions / json / rsc cross-realms unserializable types)
     * Example to disable Date automatic conversion using an ISO 8601 date format with Z
     * @see https://learn.microsoft.com/en-us/sql/t-sql/functions/cast-and-convert-transact-sql?view=sql-server-ver16&redirectedfrom=MSDN
     * Works: CASE WHEN [Upload].[createdAt] is not null THEN CONCAT(CONVERT(NVARCHAR(40), Upload.createdAt, 126), 'Z') ELSE NULL END as [createdAt],
     * Don't work: CONVERT(NVARCHAR(40), Upload.createdAt, 127) as [createdAt127], -- Does not work according to doc
     * Don't always work: FORMAT(Upload.createdAt,'yyyy-MM-ddTHH:mm:ssZ') as [createdAt], -- -- FORMAT requires Common Language Runtime(CLR) to be enabled
     */
    // eslint-disable-next-line sonarjs/function-return-type
    return Object.keys(columnModel).map((colName) => {
      // eslint-disable-next-line sonarjs/anchor-precedence
      if (/(?:At|Date|_at)$/.test(colName)) {
        return sql<string | null>`CASE WHEN ${sql.ref(
          colName
        )} IS NOT NULL THEN CONCAT(CONVERT(NVARCHAR(40), ${sql.ref(
          colName
        )}, 126), 'Z') END`.as(sql.ref(colName));
      }
      return colName;
    });
  },
} as const;
