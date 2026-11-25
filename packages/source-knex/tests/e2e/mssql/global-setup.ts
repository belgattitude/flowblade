import { MSSQLServerContainer } from "@testcontainers/mssqlserver";
import type { StartedMSSQLServerContainer } from "@testcontainers/mssqlserver";
import type { TestProject } from "vitest/node";

import {
  createMssqlDatasource,
  getMssqlConnectionInfo,
} from "./create-mssql-datasource.ts";

const mssqlImage = "mcr.microsoft.com/mssql/server:2025-CU10-GDR1-ubuntu-24.04";

/**
 * Start a single mssql container for all mssql e2e test files, create the
 * schema once and share its connection info through `inject("mssql")`.
 */
export default async function setup(project: TestProject) {
  let container: StartedMSSQLServerContainer | undefined;
  try {
    container = await new MSSQLServerContainer(mssqlImage)
      .acceptLicense()
      .start();
    const info = getMssqlConnectionInfo(container);

    const ds = createMssqlDatasource(info);
    try {
      await ds.getConnection().raw(
        `CREATE TABLE stock (
          id INT PRIMARY KEY,
          name NVARCHAR(255) NOT NULL,
          quantity INT NOT NULL
        )`
      );
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
