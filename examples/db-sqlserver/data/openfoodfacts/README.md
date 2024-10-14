
## Create duckdb

```genericsql
CREATE OR REPLACE TABLE etl_load_product AS
SELECT code,
       lang,
       product_name,
       product_name_en,
       product_name_fr,
       product_name_pt,
       generic_name,
       brands as brand_name,
       categories,
       origin,
       manufacturing_places,
       countries,
       images,
       completeness,
       to_timestamp(last_updated_t) as updated_at,
       to_timestamp(created_t) as created_at,
       _keywords as keywords,
FROM read_ndjson(
        'openfoodfacts-products.jsonl',
        ignore_errors=True
     )
WHERE code IS NOT NULL 
  AND date_diff('year', to_timestamp(created_t), current_timestamp) <= 2
;
```

## Create sample brands

```genericsql
COPY (
 SELECT brand_name as name, 
        count(*) AS nb_products 
 FROM etl_load_product 
 WHERE brand_name is not null and brand_name <> '' 
 GROUP BY brand_name
 HAVING nb_products > 50
 ORDER BY nb_products DESC    
) TO 'brand.seeds.openfoodfact.json' (FORMAT JSON, ARRAY true);
```

## Create sample json

```genericsql
COPY (FROM read_ndjson('openfoodfacts-products.jsonl', ignore_errors=True) OFFSET 3000000 LIMIT 3) TO 'openfoodfact-sample.json';
```