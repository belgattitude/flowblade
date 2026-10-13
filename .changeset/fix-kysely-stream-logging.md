---
"@flowblade/source-kysely": patch
---

Fix `KyselyDatasource.stream()` logging.

- A failed stream now only logs the error, it no longer also logs an info `Streaming query "..." executed` message.
- `affectedRows` in the stream logs is now the number of rows streamed (was always `0`).
