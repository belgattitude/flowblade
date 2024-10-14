import { sql } from 'kysely';

import { dbKyselySqlServer } from '@/server/config/db.kysely-sqlserver.config';

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
  const { fn } = dbKyselySqlServer;
  return dbKyselySqlServer
    .selectFrom('currency as cu')
    .leftJoin('currency_i18n as cuI18n', (join) =>
      join
        .onRef('cu.id', '=', 'cuI18n.currency_id')
        .on('cuI18n.locale', '=', locale)
    )
    .select([
      'cu.id as currency_id',
      'cu.code',
      fn.coalesce('currency_i18n.name', 'currency.name').as('name'),
      fn
        .coalesce('currency_i18n.name_plural', 'currency.name_plural')
        .as('namePlural'),
    ])
    .execute();

  return sql<Response>`
      SELECT cu.id as currency_id,
             cu.code,
             cu.symbol,
             COALESCE(cuI18n.name, cu.name) as name,
             COALESCE(cuI18n.name_plural, cu.name_plural) as namePlural
      FROM [common].[currency] cu
      LEFT OUTER JOIN [common].[currency_i18n] cuI18n
      ON cu.id = cui18n.currency_id and cuI18n.locale = ${locale}        
  `;
};
