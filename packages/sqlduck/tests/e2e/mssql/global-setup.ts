import { MSSQLServerContainer } from "@testcontainers/mssqlserver";
import type { StartedMSSQLServerContainer } from "@testcontainers/mssqlserver";
import type { TestProject } from "vitest/node";

import {
  createMssqlDatasource,
  getMssqlConnectionInfo,
} from "./create-mssql-datasource.ts";
import {
  getMssqlE2eMigrations,
  type mssqlE2eDb,
} from "./get-mssql-e2e-migrations.ts";

const mssqlImage = "mcr.microsoft.com/mssql/server:2025-CU9-ubuntu-24.04";

/**
 * Start a single mssql container for all mssql e2e test files, seed it once
 * and share its connection info through `inject("mssql")`.
 */
export default async function setup(project: TestProject) {
  let container: StartedMSSQLServerContainer | undefined;
  try {
    container = await new MSSQLServerContainer(mssqlImage)
      .acceptLicense()
      .start();
    const info = getMssqlConnectionInfo(container);

    const ds = createMssqlDatasource<mssqlE2eDb>(info);
    try {
      await getMssqlE2eMigrations(ds).up();
    } finally {
      await ds.getConnection().destroy();
    }

    project.provide("mssql", info);
  } catch (error) {
    await container?.stop();
    throw error;
  }

  return async () => {
    await container?.stop();
  };
}
