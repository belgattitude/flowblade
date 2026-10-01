---
"@flowblade/sqlduck": patch
---

Support DECIMAL width and scale

- Value converters now use the column's DECIMAL width and scale instead of a hardcoded DECIMAL(18,3)
- Zod schemas can declare an explicit precision with `duckdbType: "DECIMAL(10,2)"` (a bare `"DECIMAL"` still maps to DECIMAL(18,3))
