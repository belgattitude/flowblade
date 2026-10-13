---
"@flowblade/source-kysely": minor
---

Keep the driver error as cause and support aborting queries.

- `query()` failures keep the original driver error as `error.cause` (ie: the SQL Server error `number`), `queryOrThrow()` rethrows with it as error `cause`.
- `query()` and `stream()` accept an abort `signal`, passed to Kysely. An aborted `query()` returns an error result, an aborted `stream()` throws.
- New `inflightQueryAbortStrategy` datasource option (overridable per query) to choose what happens to an in-flight query when aborted: `'ignore query'` (Kysely default, keeps running on the database), `'cancel query'` (cancelled on the database, ie: SQL Server) or `'kill session'`.
