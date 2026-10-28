---
"@flowblade/source-kysely": minor
---

Set the default `inflightQueryAbortStrategy` with `defaultOptions.query`, next to the other per-method defaults (`defaultOptions.queryOrThrow`, `defaultOptions.queryOneOrThrow`). It's used by `query()` and the methods running it: `queryOrThrow()`, `queryOne()` and `queryOneOrThrow()`.

```typescript
const ds = new KyselyDatasource({
  connection: db,
  defaultOptions: {
    query: {
      // 'ignore query' (default) | 'cancel query' | 'kill session'
      inflightQueryAbortStrategy: "cancel query",
    },
  },
});

// Still overridable per query
await ds.query(query, { signal, inflightQueryAbortStrategy: "ignore query" });
```

The `inflightQueryAbortStrategy` datasource param is deprecated, it still works (`defaultOptions` wins when both are set). New type: `KyselyDatasourceDefaultOptions`.
