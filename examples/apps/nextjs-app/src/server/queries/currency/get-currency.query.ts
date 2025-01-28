import { sql } from 'kysely';

import { dbKyselyMssql } from '@/server/config/db.kysely-mssql.config';

type Params = {
  locale: string;
};

type Response = {
  currency_id: number;
  code: string;
  symbol: string;
  name: string;
  namePlural: string;
};

export const getCurrencyQuery = (params: Params) => {
  const { locale } = params;
  const { fn } = dbKyselyMssql;
  return dbKyselyMssql
    .selectFrom('common.currency as cu')
    .leftJoin('common.currency_i18n as cu18', (join) =>
      join
        .onRef('cu.id', '=', 'cu18.currency_id')
        .on('cu18.locale', '=', locale)
    )
    .select([
      'cu.id as currency_id',
      'cu.code',
      fn
        .coalesce('common.currency_i18n.name', 'common.currency.name')
        .as('name'),
      fn
        .coalesce(
          'common.currency_i18n.name_plural',
          'common.currency.name_plural'
        )
        .as('namePlural'),
    ])
    .execute();

  return sql<Response>`
      SELECT cu.id as currency_id,
             cu.code,
             cu.symbol,
             COALESCE(cuI18n.name, cu.name) AS name,
             COALESCE(cuI18n.name_plural, cu.name_plural) AS namePlural
      FROM [common].[currency] AS cu
      LEFT OUTER JOIN [common].[currency_i18n] AS cuI18n
      ON cu.id = cui18n.currency_id and cuI18n.locale = ${locale}        
  `;
};
