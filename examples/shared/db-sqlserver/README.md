## @examples/db-sqlserver

Example of a product database using SQL Server, Prisma and Kysely.

> **Warning** The prisma integration is shown to demonstrate the issues with the current prisma sql-server support.

### Quick start

```bash
pnpm prisma generate
pnpm db-recreate-dev
pnpm prisma-db-seed
```

DDL operations requires a SQL Server instance to be running.

```bash
docker compose -f ../../../docker/sql-edge/compose.yml up
```

### Environment variables

Check the [.env](./.env) file for the environment variables used in this example.

```
DB_FLOWBLADE_SQLSERVER_JDBC="sqlserver://localhost:1433;database=flowblade;user=sa;password=FlowbladeSADev123;trustServerCertificate=true;encrypt=false"
```

> Yon can create a './env.local' file to override the default values.

### Schema

![schema.png](docs%2Fimages%2Fschema.png)

### Local scripts

| Name | Description |
| --- | --- |
| `pnpm codegen` | Run codegen (prisma generate...) |
| `pnpm db-recreate-dev` | Reset the database and apply the latest schema with seeds |
| `pnpm prisma-db-seed` | Load seeds into database |
| `pnpm prisma-db-reset-push` | Drop and recreate database |
| `pnpm prisma-db-push` | Attempt to apply schema changes to database |
| `pnpm prisma-studio` | Launch prisma studio (ui admin) |
| `pnpm prisma-validate` | Validate schema.prisma |
| `pnpm prisma-format` | Format schema.prisma |
| `pnpm lint` | Check for lint errors |
| `pnpm lint --fix` | Attempt to run linter auto-fix |
| `pnpm test-unit` | Run unit tests |
| `pnpm clean` | Remove all caches |
