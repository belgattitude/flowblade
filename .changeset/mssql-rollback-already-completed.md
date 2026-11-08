---
"@flowblade/source-kysely": patch
---

Treat SQL Server error 3903 during transaction rollback cleanup as an already-completed rollback. This preserves the original callback or domain rollback error when database logic, such as a trigger, already rolled back the transaction. Other rollback errors remain transaction failures.
