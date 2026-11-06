import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { sql } from "kysely";
import type { TestProject } from "vitest/node";

import {
  createPostgresDatasource,
  getPostgresConnectionInfo,
} from "./create-postgres-datasource.ts";

const postgresImage = "postgres:17-alpine";

/**
 * Start a single postgres container for all postgres e2e test files, create
 * the schema once and share its connection info through `inject("postgres")`.
 */
export default async function setup(project: TestProject) {
  let container: StartedPostgreSqlContainer | undefined;
  try {
    container = await new PostgreSqlContainer(postgresImage).start();
    const info = getPostgresConnectionInfo(container);

    const ds = createPostgresDatasource(info);
    try {
      await ds.queryOrThrow(
        sql`CREATE TABLE stock (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          quantity INTEGER NOT NULL
        )`
      );
    } finally {
      await ds.getConnection().destroy();
    }

    project.provide("postgres", info);
  } catch (error) {
    await container?.stop();
    throw error;
  }

  return async () => {
    await container?.stop();
  };
}
