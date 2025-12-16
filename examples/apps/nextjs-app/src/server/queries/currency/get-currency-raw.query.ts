import { sql } from 'kysely';

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

/**
 * Example for a raw kysely SQL query to get currencies with i18n support
 */
export const getCurrencyRawQuery = (params: Params) => {
  const { locale } = params;
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
