---
"@flowblade/sqlduck": minor
---

The attachOrReplace can now force a detach if an already attached error is thrown


```typescript

const db = await dbManager.attachOrReplace(
    {
        type: 'filesystem',
        alias: 'duckdb_second_attached_file',
        path: '/tmp/test.duckdb',
        options: {
          accessMode: 'READ_ONLY',
        },
    },
    {
        // as tested on duckdb 1.5.5, the attach or replace might not work
        // and complain about already attached database. Set this to true
        // to implement a detach / attach if the attachOrReplace fails
        runDetachIfAttachOrReplaceFailWithAlreadyAttached: true,
    }
);
```