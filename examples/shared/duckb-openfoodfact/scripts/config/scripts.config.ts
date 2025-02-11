import { fileURLToPath } from 'node:url';

const dataPath = fileURLToPath(
  import.meta.url + ['..', '..', '..', '..', 'data'].join('/')
);

const foodRemoteParquetUrl =
  'https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet';

export const scriptsConfig = {
  openfoodfact: {
    downloadPath: dataPath,
    foodData: {
      duckdb: `${dataPath}/food.db`,
      remote: foodRemoteParquetUrl,
      local: `${dataPath}/food.parquet`,
    },
  },
} as const;
