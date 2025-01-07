import * as os from 'node:os';

import { assertQueryResultSuccess } from '@flowblade/core';
import { DuckDBAsyncDatasource } from '@flowblade/source-duckdb';
import { sql } from '@flowblade/sql-tag';
import { SqlFormatter } from '@flowblade/sql-tag-format';
import boxen from 'boxen';
import { Database } from 'duckdb-async';
import pc from 'tinyrainbow';

import type { OpenfoodfactImage } from '../src/internal/generate-openfoodfact-image';
import { CliLogger } from '../src/lib/logger/cli-logger';
import { scriptsConfig } from './config/scripts.config';
const logger = new CliLogger('generate-openfoodfact-seeds');
const sqlFormatter = new SqlFormatter('postgresql');

const getQueryCreateEtlLoadProductTable = () => {
  type Row = {
    code: string;
    brands_tags: string[];
    categories: string;
    categories_tags: string[];
    completeness: number;
    countries_tags: string[];
    food_groups_tags: string[];
    updated_at: string;
    created_at: string;
    images: OpenfoodfactImage[];
    revision: number;
  };

  return sql<Row>`
    CREATE OR REPLACE TABLE etl_load_product AS 
    SELECT 
        code, -- sometimes a valid ean13 barcode
        rev as revision, -- integer
        brands_tags, -- array of brands
        brands as brands, -- string
        categories, -- string separated by comma
        categories_tags, -- array of strings with locale prefix
        completeness, -- complete float32 
        countries_tags, -- array of string
        food_groups_tags, -- array of string
        to_timestamp(last_updated_t) as updated_at,
        to_timestamp(created_t) as created_at,
        images, -- list
        to_timestamp(last_image_t) as image_updated_at,
        lang, -- string
        product_name, -- array of string prefixed by locales
        quantity -- string
            
    FROM '${sql.unsafeRaw(scriptsConfig.openfoodfact.foodData.local)}'  
    WHERE code IS NOT NULL
      AND date_diff('year', to_timestamp(created_t), current_timestamp) <= 3     
    LIMIT 5000000;
  `;
};

const getQueryCreateEtlBrands = () => {
  return sql`
    CREATE OR REPLACE table etl_brands as (
    WITH
        brands AS MATERIALIZED (
            SELECT p.brands as label,
                   lower(regexp_replace(
                           trim(regexp_replace(
                                   strip_accents(p.brands),
                                   '(\\s+)|["´’\`.!&,;'']', ' ', 'g'
                                )
                           ),
                           '\\s+', '-', 'g')
                   ) as label_slug,
                   count(distinct p.code) as nb_products
            FROM etl_load_product AS p
            WHERE p.brands IS NOT NULL
              AND trim(p.brands) <> ''
            GROUP BY label
            HAVING nb_products > 10
               AND label_slug is not null
            ORDER BY nb_products DESC
        )
    SELECT b.label_slug,
           array_agg(distinct { name: b.label, nb_products: b.nb_products } order by b.nb_products desc) as matches,
           array_agg(distinct b.label) as similars,
           array_agg(distinct b2.label_slug) as similar_tags
    FROM brands AS b
    FULL OUTER JOIN brands AS b2
         ON (b.label <> b2.label
         -- and jaro_similarity(lower(trim(b.label)), lower(trim(b2.label))) > 0.95
         --and levenshtein(lower(trim(b.label)), lower(trim(b2.label))) < 2
          AND jaro_similarity(lower(trim(b.label_slug)), lower(trim(b2.label_slug))) > 0.95 )
    WHERE b.label_slug IS NOT NULL
     AND b2.label_slug IS NOT NULL
    GROUP BY b.label_slug
    ORDER BY len(similar_tags) DESC, len(similars) DESC
    )
  `;
};

try {
  const threads = `${os.cpus().length - 1}`;
  console.log('Will run with threads:', threads);
  const db = await Database.create(
    `${scriptsConfig.openfoodfact.foodData.duckdb}`,
    {
      access_mode: 'READ_WRITE',
      max_memory: '1000MB',
      threads: threads,
    }
  );

  const ds = new DuckDBAsyncDatasource({ connection: db });

  // ---------------------------------------------
  // Step 1: Create product table
  // ---------------------------------------------

  console.log(`${pc.green('getQueryCreateEtlLoadProductTable')}`);
  const query = getQueryCreateEtlLoadProductTable();
  console.log(
    boxen(sqlFormatter.formatOrThrow(query), {
      title: 'sql',
      titleAlignment: 'center',
    })
  );
  const result = await ds.queryRaw(query);
  assertQueryResultSuccess(result);
  const { meta } = result;

  console.log(`${pc.green('Success')} in ${Math.round(meta?.timeMs ?? 0)} ms}`);

  /**
   *   const _data = result.data.map((row) => {
   *     return {
   *       ...row,
   *       test: generateOpenfoodfactImage({
   *         code: row.code,
   *         images: row.images,
   *       }),
   *     };
   *   });
   */

  // ---------------------------------------------
  // Step 2: Create product table
  // ---------------------------------------------

  console.log(`${pc.green('getQueryCreateEtlBrands')}`);
  const query2 = getQueryCreateEtlBrands();
  console.log(
    boxen(sqlFormatter.formatOrNull(query2) ?? query2.text, {
      title: 'sql',
      titleAlignment: 'center',
    })
  );
  const result2 = await ds.queryRaw(query2);
  assertQueryResultSuccess(result2);

  console.log(`${pc.green('Success')} in ${result2?.meta?.timeMs} ms}`);
} catch (e) {
  logger.log('error', (e as Error).message);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}
