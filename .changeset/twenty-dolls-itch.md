---
"@flowblade/source-kysely": minor
---

Support new Kysely validateConnections and resetConnectionOnRelease options.

**Warning this release contains a breaking change**

- [x] Kysely minimum supported version is ^0.27.5.
- [x] createKyselySqlServerDialect signature refactored

```typescript
import { default as Tedious } from 'tedious';
import { TediousConnUtils, createKyselySqlServerDialect } from '@flowblade/source-kysely';

const jdbcDsn = "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false";
const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);

const dialect = createKyselySqlServerDialect({
    tediousConfig,
    // 👉 Optional tarn pool options
    poolOptions: {
        min: 0,                        // Minimum number of connections, default 0
        max: 10,                       // Minimum number of connections, default 10
        validateConnections: true,     // Revalidate new connections, default true
        propagateCreateError: false,   // Exit immediately if true, default false    
        log: (msg) => console.log(msg) // Custom logger, default noop
    },
    // 👉 Optional tarn pool options
    dialectConfig: {
        // 👉 Reset connection on pool release, default true
        resetConnectionOnRelease: true,
        // 👉 Example based on https://github.com/kysely-org/kysely/issues/1161#issuecomment-2384539764
        tediousTypes: { ...Tedious.TYPES, NVarChar: Tedious.TYPES.VarChar}
    }
});

const db = new Kysely<DB>({
    dialect
})
```
