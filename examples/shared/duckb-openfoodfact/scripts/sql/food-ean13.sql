-- Open Food Facts → clean products sold in Europe (EAN-13 + UPC-A), with a quality score
-- Source : data/food.parquet (Hugging Face openfoodfacts dump)
-- Output : data/food_ean13.parquet (zstd, Parquet v2, sorted by code)
--
-- Run with: pnpm tsx ./scripts/generate-openfoodfact-ean13.ts
-- Requires the macros from openfoodfact-macros.sql (loaded first by the script).
-- '{{source_parquet}}' and '{{output_parquet}}' are replaced by the script before execution.
-- Requires DuckDB 2.x (lambda syntax: lambda x: ...)


-- ─────────────────────────────────────────────────────────────
-- Clean products (CTEs) exported to parquet
-- ─────────────────────────────────────────────────────────────

COPY (
WITH p AS (
    SELECT
        code,
        code_type(code)                                                 AS code_type,

        -- names
        coalesce(name_in(product_name, 'main'),
                 nullif(trim(product_name[1].text), ''))                AS product_name_default,
        name_in(product_name, 'en')                                     AS product_name_en,
        name_in(product_name, 'fr')                                     AS product_name_fr,
        name_in(product_name, 'nl')                                     AS product_name_nl,

        nullif(trim(brands), '')                                        AS brands,
        nullif(trim(quantity), '')                                      AS quantity,
        try_cast(product_quantity AS DOUBLE)                            AS product_quantity,
        product_quantity_unit,
        nullif(nutriscore_grade, 'unknown')                             AS nutriscore_grade,
        CASE WHEN lower(trim(categories)) IN ('', 'null') THEN NULL
             ELSE categories END                                        AS categories,

        -- countries where sold, as ISO codes: ['en:france', 'en:Belgique', 'en:world'] -> ['BE', 'FR']
        list_sort(list_distinct(list_filter(
            list_transform(countries_tags, lambda t: country_iso()[country_key(t)]),
            lambda c: c IS NOT NULL)))                                  AS country_codes,

        -- category signals
        len(list_filter(categories_tags, lambda t:
            starts_with(t, 'en:') AND t <> 'en:undefined'))             AS categories_known_n,
        len(list_filter(categories_tags, lambda t:
            t <> 'en:undefined'))                                       AS categories_any_n,
        len(list_filter(categories_tags, lambda t:
            regexp_matches(t, non_food_re()))) > 0                      AS is_non_food,

        -- completeness signals
        coalesce(list_contains(states_tags, 'en:front-photo-selected'), false)      AS has_front_photo,
        coalesce(list_contains(states_tags, 'en:nutrition-facts-completed'), false) AS has_nutrition,
        coalesce(unique_scans_n, 0)                                     AS unique_scans_n,
        len(data_quality_errors_tags)                                   AS dq_errors
    FROM '{{source_parquet}}'
    WHERE is_valid_ean13(code)
      AND code_type(code) IN ('EAN-13', 'UPC-A')
),
q AS (
    SELECT
        *,
        parse_qty(quantity)                                                          AS qty,
        list_filter([
            CASE WHEN product_name_default IS NULL THEN 'no_name'
                 WHEN length(product_name_default) < 3
                   OR is_placeholder(product_name_default)
                   OR regexp_full_match(product_name_default, '[0-9 .,-]+') THEN 'junk_name' END,
            CASE WHEN brands IS NULL THEN 'no_brand'
                 WHEN is_placeholder(brands) THEN 'junk_brand' END,
            CASE WHEN categories_any_n = 0 THEN 'no_category'
                 WHEN categories_known_n = 0 THEN 'unknown_category' END,
            CASE WHEN is_non_food THEN 'non_food' END
        ], lambda r: r IS NOT NULL)                                                  AS suspicious_reasons,
        list_intersect(country_codes, target_countries())                            AS target_codes,
        list_has_any(country_codes, european_countries())                            AS in_europe
    FROM p
),
ean13_clean AS (
    SELECT
        code,
        code_type,
        product_name_default,
        product_name_en,
        product_name_fr,
        product_name_nl,
        brands,
        -- sold in at least one target market (BE / DE / FR / PT)
        len(target_codes) > 0                               AS in_target_market,

        -- quantity parsed from the pack text, per item, then total in g / ml
        --   '6 x 33 cl' -> pack_count 6, quantity_value 33, quantity_unit 'cl', quantity_total 1980, quantity_total_unit 'ml'
        --   no parsable unit in the text -> fall back to Open Food Facts' own g / ml value
        qty.pack_count                                      AS pack_count,
        qty.value                                           AS quantity_value,
        qty.u.unit                                          AS quantity_unit,
        round(coalesce(qty.pack_count * qty.value * qty.u.factor,
                       CASE WHEN product_quantity_unit IN ('g', 'ml') THEN product_quantity END), 3)
                                                            AS quantity_total,
        coalesce(qty.u.base,
                 CASE WHEN product_quantity IS NOT NULL AND product_quantity_unit IN ('g', 'ml')
                      THEN product_quantity_unit END)       AS quantity_total_unit,

        nutriscore_grade,
        categories,

        -- quality score 0-100 (identity first)
        (  CASE WHEN NOT list_has_any(suspicious_reasons, ['no_name', 'junk_name'])   THEN 20 ELSE 0 END
         + CASE WHEN NOT list_has_any(suspicious_reasons, ['no_brand', 'junk_brand']) THEN 20 ELSE 0 END
         + CASE WHEN categories_known_n >= 3 THEN 20
                WHEN categories_known_n >= 1 THEN 10 ELSE 0 END
         + CASE WHEN len(target_codes) > 0      THEN 10 ELSE 0 END   -- sold in BE / DE / FR / PT
         + CASE WHEN qty IS NOT NULL
                  OR (product_quantity IS NOT NULL AND product_quantity_unit IN ('g', 'ml'))
                                                THEN 10 ELSE 0 END   -- quantity known in g / ml
         + CASE WHEN has_front_photo           THEN  5 ELSE 0 END
         + CASE WHEN has_nutrition             THEN  5 ELSE 0 END
         + CASE WHEN unique_scans_n > 0        THEN  5 ELSE 0 END
         + CASE WHEN dq_errors = 0             THEN  5 ELSE 0 END
        )                                                   AS quality_score
    FROM q
    -- keep products sold in Europe that passed every suspicion check
    WHERE in_europe
      AND len(suspicious_reasons) = 0
)
SELECT * FROM ean13_clean
ORDER BY code
) TO '{{output_parquet}}'
    (FORMAT parquet, COMPRESSION zstd, PARQUET_VERSION v2);
