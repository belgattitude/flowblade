## E2E tests

### Mssql

```bash
yarn tsx ./scripts/run-e2e-recreate-db.ts
yarn e2e-docker-up-d    # `yarn e2e-docker-up` to not daemonize
yarn e2e-docker-down
```

# Alternatively, you can use the following command to launch docker

```bash
docker compose -f ./tests/e2e/docker/mssql/compose.yml up -d --wait
docker compose -f ./tests/e2e/docker/mssql/compose.yml down --volumes
```

### Run the tests

```bash
yarn test-e2e
```
