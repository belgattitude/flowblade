---
"@flowblade/core": patch
---

The default transaction `retry` delay is an exponential backoff with jitter: half of the delay is random (25-50ms, 50-100ms, 100-200ms... up to 500ms-1s), to spread the retries of concurrent conflicting transactions (they'd otherwise retry at the same time and conflict again).
