## E2E tests

### SQL Edge

```bash
yarn e2e-docker-up-d # `yarn e2e-docker-up` to not daemonize
yarn e2e-docker-down
```

# Alternatively, you can use the following command to launch docker
```bash
docker compose -f ./e2e/docker/mssql/compose.yml up -d --wait
docker compose -f ./e2e/docker/mssql/compose.yml down --volumes
```

### Run the tests

```bash
yarn test-e2e
```