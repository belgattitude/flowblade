## @flowblade-examples/duckdb-openfoodfact

Example of an etl based on openfoodfact data.

### Quick start

```bash
pnpm tsx ./scripts/download-openfoodfact-data.ts
pnpm tsx ./scripts/generate-openfoodfact-seeds.ts
```

### Clean EAN-13 products export

```bash
pnpm tsx ./scripts/generate-openfoodfact-ean13.ts
```

Reads `data/food.parquet` and writes `data/food_ean13.parquet` (zstd, Parquet v2, sorted by `code`) with valid EAN-13 / UPC-A products sold in Europe, an `in_target_market` flag (sold in BE / DE / FR / PT), quantities converted to g / ml (multipacks included) and a 0-100 `quality_score`. Suspicious products (no name, no brand, no category, placeholder values, non-food) are filtered out.

The helper macros live in [`scripts/sql/openfoodfact-macros.sql`](./scripts/sql/openfoodfact-macros.sql) and the query in [`scripts/sql/food-ean13.sql`](./scripts/sql/food-ean13.sql). To run them in the DuckDB UI or CLI, run the macros file first, then the query after replacing the `{{source_parquet}}` and `{{output_parquet}}` placeholders.
