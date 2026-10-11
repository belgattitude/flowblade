---
"@flowblade/core": patch
---

Clearer `QResult.map()` error when a success result has no array of rows to map.

- The error message is now `"QResult.map(): expected data to be an array of rows, received <undefined|null|type>"` (was `"mapper: no rows to map"`).
- `null` (or any non-array) data now also returns this error instead of a raw `TypeError` (`Cannot read properties of null`).
- Empty results (`[]`) are not affected and still map to `[]`.
