import { GenericContainer, Wait } from "testcontainers";
import type { StartedTestContainer } from "testcontainers";
import type { TestProject } from "vitest/node";

import {
  type AzuriteInfo,
  createAzuriteContainer,
  getAzuriteInfo,
} from "./azurite.ts";

const azuriteImage = "mcr.microsoft.com/azure-storage/azurite:3.37.0";
const blobPort = 10_000;

export const azuriteExportsContainer = "exports";

declare module "vitest" {
  export interface ProvidedContext {
    azurite: AzuriteInfo;
  }
}

/**
 * Start a single Azurite (Azure Blob Storage emulator) container for all
 * azure e2e test files, create the `exports` blob container and share its
 * connection info through `inject("azurite")`.
 */
export default async function setup(project: TestProject) {
  let container: StartedTestContainer | undefined;
  try {
    container = await new GenericContainer(azuriteImage)
      .withCommand([
        "azurite-blob",
        "--blobHost",
        "0.0.0.0",
        // DuckDB's azure sdk may be newer than the emulator
        "--skipApiVersionCheck",
        "--inMemoryPersistence",
      ])
      .withExposedPorts(blobPort)
      .withWaitStrategy(
        Wait.forLogMessage("Azurite Blob service successfully listens")
      )
      .start();
    const info = getAzuriteInfo(
      container.getHost(),
      container.getMappedPort(blobPort)
    );
    await createAzuriteContainer(info, azuriteExportsContainer);

    project.provide("azurite", info);
  } catch (error) {
    await container?.stop();
    throw error;
  }

  return async () => {
    await container?.stop();
  };
}
