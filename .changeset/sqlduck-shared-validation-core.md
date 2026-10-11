---
"@flowblade/sqlduck": patch
---

Share DSN parsing, database path checks and validation messages between the zod and valibot schemas. Fix database path checks only normalizing the first backslash, and make the zod DSN schema treat an empty `path` param as absent (like valibot).
