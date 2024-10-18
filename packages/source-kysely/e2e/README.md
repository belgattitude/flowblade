## E2E tests

### SQL Edge

```bash
docker compose -f ./e2e/docker/sql-edge/compose.yml up -d --wait
docker compose -f ./e2e/docker/sql-edge/compose.yml down --volumes
```