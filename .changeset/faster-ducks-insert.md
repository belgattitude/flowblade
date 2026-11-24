---
"@flowblade/sqlduck": patch
---

`PreparedInsertStrategy` is ~6x faster on simple columns (~2.6x on a 42 columns schema): chunks are now inserted with a single prepared `INSERT ... SELECT unnest(?)` statement binding one list per column, instead of a multi-row `INSERT ... VALUES` statement. The default `chunkSize` goes from 256 to 2048 (pass `chunkSize: 256` to keep the previous granularity of the rows kept when a statement fails). The behavior on primary key conflicts is unchanged.
