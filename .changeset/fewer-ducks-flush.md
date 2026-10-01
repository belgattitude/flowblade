---
"@flowblade/sqlduck": patch
---

`toTable` is ~30% faster on file databases: the default `flushSyncFrequency` goes from 10 to 100 chunks (every 204,800 rows with the default chunkSize). Pass `flushSyncFrequency: 10` to keep the previous behaviour.
