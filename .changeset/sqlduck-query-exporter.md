---
"@flowblade/sqlduck": minor
---

Add `QueryExporter` and `DuckSecretsManager` ([#1525](https://github.com/belgattitude/flowblade/pull/1525)).

- `QueryExporter` (new `@flowblade/sqlduck/export` entry) exports a query to CSV, Parquet or Excel with DuckDB's `COPY`, rows never go through JavaScript. One method per persistence strategy:
  - `toFile()` writes a local file, renamed once complete (a failed export leaves no partial file and keeps an existing one untouched).
  - `toObjectStorage()` uploads to Azure Blob Storage, S3, GCS or R2 (`az://`, `abfss://`, `s3://`, `gs://`, `r2://`), DuckDB uses the secret whose scope matches the url.
  - `toResponse()` returns a web `Response` streaming a temporary file, removed when the body is fully read, cancelled, aborted or left unread for `idleTimeoutMs` (60s by default).
- The exported query is a DuckDB query (`sql`) or a Kysely query of another database (`source`), materialized in a temporary DuckDB table for the export.
- `mapQuery` rewrites the exported query and `selectColumns` picks, reorders and renames its columns, both run in DuckDB.
- `DuckSecretsManager` manages the DuckDB secrets of object storage and http endpoints: `create`, `drop`, `list`, `which` and `withSecret` (a temporary secret for a callback). Secret values are bound as query parameters, they never appear in the logs or in the errors.
- `DuckExtensionsManager`: add `load(name)`.
