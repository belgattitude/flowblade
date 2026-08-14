---
"@flowblade/sqlduck": minor
---

Add use(), getCurrentSchema(), getCurrentCatalog() and getCurrentDatabase() to DatabaseManager


```typescript

const dbManager = new DuckDatabaseManager(conn);
const database = dbManager.attach({ type: 'memory', alias: 'mydb' })

await dbManager.use('mydb');

const dbSchema = await dbManager.getCurrentSchema();
const dbCatalog = await dbManager.getCurrentCatalog();
const dbDatabase = await dbManager.getCurrentDatabase();
```