[**@flowblade/source-kysely v0.17.0**](../README.md)

---

[@flowblade/source-kysely](../README.md) / KyselyMssqlDialectParams

# Type Alias: KyselyMssqlDialectParams

> **KyselyMssqlDialectParams** = `object`

## Properties

### dialectConfig?

> `optional` **dialectConfig**: `object`

#### resetConnectionsOnRelease?

> `optional` **resetConnectionsOnRelease**: `MssqlDialectConfig`\[`"resetConnectionsOnRelease"`\]

When true, connections are reset to their initial states when released back to the pool,
resulting in additional requests to the database.

Defaults to `false`.

#### tediousTypes?

> `optional` **tediousTypes**: _typeof_ `Tedious.TYPES`

#### validateConnections?

> `optional` **validateConnections**: `MssqlDialectConfig`\[`"validateConnections"`\]

When true, connections are validated before being acquired from the pool,
resulting in additional requests to the database.

In safe scenarios, this can be set to false to improve performance.

Defaults to `true`.

---

### poolOptions?

> `optional` **poolOptions**: [`KyselyMssqlPoolOptions`](KyselyMssqlPoolOptions.md)

---

### tediousConfig

> **tediousConfig**: `Tedious.ConnectionConfiguration`
