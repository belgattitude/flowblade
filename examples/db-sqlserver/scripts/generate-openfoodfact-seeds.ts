import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { assertQueryResultSuccess } from '@flowblade/core';
import { DuckDBAsyncDatasource } from '@flowblade/source-duckdb';
import { sql } from '@flowblade/sql-tag';
import { Database } from 'duckdb-async';
import { DownloaderHelper } from 'node-downloader-helper';

import {
  generateOpenfoodfactImage,
  type OpenfoodfactImage,
} from '../src/internal/generate-openfoodfact-image';
import { CliLogger } from '../src/lib/logger/cli-logger';

const tempPath = fileURLToPath(
  import.meta.url + ['..', '..', '..', 'tmp'].join('/')
);
const remoteFoodParquetUrl =
  'https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet';

const files = {
  foodParquetFile: `${tempPath}/food.parquet`,
};
console.log(tempPath);

if (!fs.existsSync(files.foodParquetFile)) {
  const dl = new DownloaderHelper(remoteFoodParquetUrl, tempPath, {
    fileName: 'food.parquet',
  });
  dl.on('progress', (stats) => {
    console.log('progress', JSON.stringify(stats));
  });
  dl.on('end', () => {
    console.log('Download Completed');
  });
  await dl.start();
}

const logger = new CliLogger('generate-openfoodfact-seeds');

try {
  const db = await Database.create(':memory:', {
    access_mode: 'READ_WRITE',
    max_memory: '200MB',
    threads: '8',
  });

  const ds = new DuckDBAsyncDatasource({ connection: db });

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

  const query = sql<Row>`
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
            
    -- FROM 'https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet'
    FROM '${sql.unsafeRaw(files.foodParquetFile)}'  
    WHERE code IS NOT NULL
      AND date_diff('year', to_timestamp(created_t), current_timestamp) <= 2     
    LIMIT 1;
  `;

  const result = await ds.queryRaw(query);
  assertQueryResultSuccess(result);
  const data = result.data.map((row) => {
    return {
      ...row,
      test: generateOpenfoodfactImage({
        code: row.code,
        images: row.images,
      }),
    };
  });
  console.debug(data);
} catch (e) {
  logger.log('error', (e as Error).message);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}
