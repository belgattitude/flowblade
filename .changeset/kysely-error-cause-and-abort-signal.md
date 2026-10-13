---
"@flowblade/source-kysely": minor
---

Keep the driver error as cause and support aborting queries.

- `query()` failures keep the original driver error as `error.cause` (ie: the SQL Server error `number`), `queryOrThrow()` rethrows with it as error `cause`.
- `query()` and `stream()` accept an abort `signal`, passed to Kysely. An aborted `query()` returns an error result, an aborted `stream()` throws.
