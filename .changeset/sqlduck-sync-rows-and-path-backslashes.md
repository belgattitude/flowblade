---
"@flowblade/sqlduck": patch
---

Faster `toTable()` with sync row sources, path validation fix.

- `toTable()` reads synchronous row sources (generators, arrays) with `for...of` instead of `for await`, which wrapped every row in a promise: ~11% faster on a 200k rows / 9 columns insertion. Async sources are unchanged.
- The database `path` validation (zod and valibot) normalizes every backslash, not only the first one (ie: `/data\sub\db.duckdb` was rejected).
