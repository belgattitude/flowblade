import { fileURLToPath } from "node:url";

const dataPath = fileURLToPath(
  import.meta.url + ["..", "..", "..", "..", "data"].join("/")
);

const foodRemoteParquetUrl =
  "https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet";

export const scriptsConfig = {
  openfoodfact: {
    downloadPath: dataPath,
    foodData: {
      duckdb: `${dataPath}/food.db`,
      remote: foodRemoteParquetUrl,
      local: `${dataPath}/food.parquet`,
    },
    foodEan13: {
      macrosSql: fileURLToPath(
        new URL("../sql/openfoodfact-macros.sql", import.meta.url)
      ),
      sql: fileURLToPath(new URL("../sql/food-ean13.sql", import.meta.url)),
      local: `${dataPath}/food_ean13.parquet`,
    },
  },
} as const;
