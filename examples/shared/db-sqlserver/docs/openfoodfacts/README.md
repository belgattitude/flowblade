
## Create duckdb

```sql
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

```sql
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

```sql
COPY (
    WITH duplicateCodes AS MATERIALIZED (
      SELECT code
      FROM etl_load_product
      GROUP BY code
      HAVING COUNT(*) > 1
    )
    SELECT distinct code,
                    product_name as name,
                    lang,
                    product_name_en as n_en,
                    product_name_fr as n_fr,
                    product_name_pt as n_pt,
                    brand_name as brand
    FROM etl_load_product
    ANTI JOIN duplicateCodes USING (code) 
    WHERE completeness > 0.2
      AND (countries like '%France%'
        OR countries like '%Portugal%'
        OR countries like '%Germany%'
        OR countries like '%Italy%'
        OR countries like '%Poland%'
        )    
    ORDER BY completeness DESC        
    LIMIT 100000
) TO 'product.seeds.openfoodfact.jsonl' (FORMAT JSON, ARRAY false);
```

```sql
    WITH duplicateCodes AS MATERIALIZED (
      SELECT code, count(*)
      FROM etl_load_product
      GROUP BY code
      HAVING COUNT(*) > 1
    )
    SELECT code, count(*)
    FROM etl_load_product
    WHERE completeness > 0.3
      AND (countries like '%France%'
        OR countries like '%Portugal%'
        OR countries like '%Germany%'
        OR countries like '%Italy%'
        OR countries like '%Poland%'
        )    
    GROUP BY code
    HAVING count(*) > 1

```

## Create sample json

```sql
COPY (FROM read_ndjson('openfoodfacts-products.jsonl', ignore_errors=True) OFFSET 3000000 LIMIT 3) TO 'openfoodfact-sample.json';
```