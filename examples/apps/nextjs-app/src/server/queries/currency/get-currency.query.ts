import { dbKyselyMssql } from '@/server/config/db.kysely-mssql.config';

type Params = {
  locale: string;
};

/**
 * Example for a kysely query builder query to get currencies with i18n support
 */
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
};
