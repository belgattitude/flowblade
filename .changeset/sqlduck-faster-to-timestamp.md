---
"@flowblade/sqlduck": patch
---

Faster `TIMESTAMP` column conversion (~45-80% on the converter benchmark): the microseconds value is computed directly, without an intermediate milliseconds value and `try/catch`.
