---
"@flowblade/core": minor
---

Add an optional error `cause` to `QError` and an optional abort `signal` to `QueryOptions`.

- `QError.cause` holds the original error (ie: the driver error) so driver specific details, like error codes, can be inspected.
- `QResult.getOrThrow()` now throws with the `QError` cause as error `cause`.
- `QResult.toJsonifiable()` leaves the `cause` out, so driver internals aren't sent to clients.
- `QueryOptions.signal` (and so `QueryStreamOptions.signal`) lets datasources abort a query, support depends on the datasource.
