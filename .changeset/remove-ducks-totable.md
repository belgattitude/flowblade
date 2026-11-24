---
"@flowblade/sqlduck": minor
---

**Breaking**: remove `SqlDuck` and its deprecated `toTable` method (its only method), along with the `SqlDuckParams`, `ToTableParams`, `OnChunkAppendedCb` and `OnChunkAppendedStats` types. Use `DuckTableLoader` from `@flowblade/sqlduck/loader`, see the migration table in `UPGRADE.md`.
