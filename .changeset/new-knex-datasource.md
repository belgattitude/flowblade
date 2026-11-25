---
"@flowblade/source-knex": minor
---

New `@flowblade/source-knex` package: a Flowblade datasource for Knex (`KnexDatasource`) with `query`, `queryOrThrow`, `queryOne`, `queryOneOrThrow`, `stream`, transactions (isolation level, access mode, retry on conflicts) and savepoints, with the same `QResult`, error and metadata contracts as the Kysely and DuckDB datasources.
