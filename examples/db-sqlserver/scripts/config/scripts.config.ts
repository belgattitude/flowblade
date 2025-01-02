import { fileURLToPath } from 'node:url';

const tempPath = fileURLToPath(
  import.meta.url + ['..', '..', '..', '..', 'tmp'].join('/')
);

const foodRemoteParquetUrl =
  'https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet';

export const scriptsConfig = {
  openfoodfact: {
    downloadPath: tempPath,
    foodData: {
      duckdb: `${tempPath}/food.db`,
      remote: foodRemoteParquetUrl,
      local: `${tempPath}/food.parquet`,
    },
  },
} as const;
