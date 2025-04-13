---
"@flowblade/source-kysely": minor
---

Update to kysely 0.28.0

## BC changes

Update the createKyselyMssqlDialect to use the new constructor and
move validateConnections and resetConnectionsOnRelease to the dialectConfig.

```typescript
const dialect = createKyselyMssqlDialect({
  tediousConfig: config,
  poolOptions: {
    min: 0,
    max: 10,
    propagateCreateError: true,
  },
  dialectConfig: {
    validateConnections: false,
    resetConnectionsOnRelease: false,
  },
});

```