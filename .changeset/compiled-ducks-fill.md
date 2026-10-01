---
"@flowblade/sqlduck": patch
---

Faster `toTable` row conversion: rows are now filled by a function compiled with `new Function` (unrolled columns, static property access, one call site per converter). It falls back to the generic loops when compilation isn't allowed (ie: CSP forbidding eval).
