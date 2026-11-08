---
"@flowblade/core": minor
---

Change `QErrors.DomainRollback` to accept the native `Error` options bag as its second parameter, including `{ cause }`. Domain metadata moves to `options.details`.

```typescript
// Before
throw new QErrors.DomainRollback("OUT_OF_STOCK", { productId: 7 });

// After
throw new QErrors.DomainRollback("OUT_OF_STOCK", {
  details: { productId: 7 },
  cause: validationError,
});
```

`QErrors.NoResult` accepts `ErrorOptions` as its first parameter, and `QErrors.TooManyResults` accepts it as its second parameter. All custom Flowblade errors now accept native error options, allowing causes to be passed consistently.
