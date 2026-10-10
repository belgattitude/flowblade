---
"@flowblade/core": minor
---

Improve `QMeta` spans

- add the `materialization` span (`QMetaMaterializationSpan`) to the known spans (`QMetaKnownSpan`)
- `getSpansByType()` now narrows the returned span from the requested type: `sql`, `map` and `materialization` return their dedicated shape, any other type returns a `QMetaCustomSpan` exposing `affectedRows`. New helper type `QMetaSpanOfType`
- add `prependSpan()` to insert a span before the existing ones
- spans are now stored as frozen shallow copies: the span given by the caller is neither kept nor frozen, and a stored span (and the `params` of a sql span) can't be modified
- `withSpan()` no longer deep clones with `structuredClone` but shares the (frozen) spans, spans holding functions or class instances are now supported (fixes `QResult.map()` throwing on such spans)
- `QMetaSqlSpan.params` is now typed as `readonly unknown[]`
