---
"@flowblade/sqlduck": patch
---

Faster DuckValueConverter: string dates/timestamps (~2x), uuid (~1.8x) and decimal from number (~7x)

- Fix timestamps strings ending with a lowercase `z` throwing a RangeError
- Decimal conversion now throws a RangeError for NaN, Infinity or values not fitting in the DECIMAL(width, scale) instead of silently inserting 0
