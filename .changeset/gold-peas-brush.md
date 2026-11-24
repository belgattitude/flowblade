---
"@flowblade/source-duckdb": minor
"@flowblade/sqlduck": minor
---

Support DuckDB 2.0.1 (`@duckdb/node-api` `2.0.1-r.1`).

`@flowblade/sqlduck`:

- The generated `DuckSessionSettings` and `DuckGlobalSettings` types now match DuckDB 2.0.1.
  - Added: `http_retry_quota_throttled`, `http_retry_throttled_wait_ms`, `logging_sink`, `parquet_can_have_nan` and `parquet_use_page_index`.
  - Removed: `delim_join_as_cte`, `error_on_division_by_zero`, `experimental_metadata_reuse`, `force_column_metadata_reuse`, `legacy_disable_null_type`, `logging_storage`, `regex_match_operator_semantics` and `table_function_identifier_conversion`.
- Every setting with a machine-independent default now documents it with a JSDoc `@default` tag.
