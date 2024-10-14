
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

### Create a product sample

```genericsql
COPY (
    SELECT code,
           product_name as name,
           lang,
           product_name_en as n_en,
           product_name_fr as n_fr,
           product_name_pt as n_pt,
           brand_name as brand        
    FROM etl_load_product
    WHERE completeness > 0.6
      AND (countries like '%France%'
        OR countries like '%Portugal%'
        OR countries like '%Germany%'
        OR countries like '%Italy%' OR
           countries like '%Poland%'
        )
    LIMIT 30000    
) TO 'product.seeds.openfoodfact.jsonl' (FORMAT JSON, ARRAY false);
```


```genericsql

## Create sample json

```genericsql
COPY (FROM read_ndjson('openfoodfacts-products.jsonl', ignore_errors=True) OFFSET 3000000 LIMIT 3) TO 'openfoodfact-sample.json';
```