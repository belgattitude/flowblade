## @flowblade/db-sqlserver

Example of a product database using SQL Server, Prisma and Kysely. 

### Quick start

```bash
yarn db-recreate
yarn prisma-db-seed
```

DDL operations requires a SQL Server instance to be running.

```bash
docker compose -f ../../docker/sql-edge/compose.yml up
```

### Environment variables

Check the [.env](./.env) file for the environment variables used in this example.

```
DB_FLOWBLADE_SQLSERVER_JDBC="sqlserver://localhost:1433;database=flowblade;user=sa;password=FlowbladeSADev123;trustServerCertificate=true;encrypt=false"
```

> Yon can create a './env.local' file to override the default values.

### Local scripts

| Name                        | Description                                 |
|-----------------------------|---------------------------------------------|
| `yarn codegen`              | Run codegen (prisma generate...)            |
| `yarn prisma-db-reset-push` | Drop and recreate database                  |
| `yarn prisma-db-push`       | Attempt to apply schema changes to database |
| `yarn prisma-db-seed`       | Load seeds into database                    |
| `yarn prisma-studio`        | Launch prisma studio (ui admin)             |
| `yarn prisma-validate`      | Validate schema.prisma                      |
| `yarn prisma-format`        | Format schema.prisma                        |
| `yarn lint`                 | Check for lint errors                       |
| `yarn lint --fix`           | Attempt to run linter auto-fix              |
| `yarn test-unit`            | Run unit tests                              |
| `yarn clean`                | Remove all caches                           |
