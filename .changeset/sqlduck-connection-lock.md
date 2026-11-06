---
"@flowblade/source-duckdb": minor
"@flowblade/sqlduck": minor
---

Share the DuckDB transaction lock with the code using the connection directly.

- `@flowblade/source-duckdb`: add `withConnectionLock(connection, fn, { signal })`, a `DuckdbDatasource` transaction on the same connection doesn't begin while `fn` runs. Reentrant, and in a transaction callback `fn` runs in the transaction (an error then prevents the commit).
- In a transaction callback, the queries of the other datasources on the same connection now run in the transaction (they waited forever before), beginning a transaction while the connection is held by the async context fails rather than waiting forever.
- The queries of a transaction datasource kept after the end of its callback fail ("The transaction has ended"), rather than running outside of the transaction or in another one.
- `@flowblade/sqlduck`: the loads (`toTable()`, `DuckTableLoader`), the managers queries, `DuckMemory` and the session settings take part in the transactions.
