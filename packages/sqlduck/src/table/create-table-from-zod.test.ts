import { reset } from "@logtape/logtape";
import type { LogRecord } from "@logtape/logtape";
import isInCi from "is-in-ci";
import { afterEach, beforeEach, describe, expect } from "vitest";
import * as z from "zod";

import { configureTestLogger } from "#tests/utils/configure-test-logger.ts";
import { createDuckTest } from "#tests/utils/duck-test.ts";

import { flowbladeLogtapeSqlduckConfig } from "../config/flowblade-logtape-sqlduck.config.ts";
import { Table } from "../objects/table.ts";
import { createTableFromZod } from "./create-table-from-zod.ts";

// Keep max_memory high to prevent going to .tmp directory
const it = createDuckTest({
  max_memory: isInCi ? "128M" : "256M",
  threads: 1,
});

describe(createTableFromZod, () => {
  describe("Logger", () => {
    let logBuffer: LogRecord[] = [];
    beforeEach(async () => {
      await configureTestLogger(logBuffer);
    });

    afterEach(async () => {
      await reset();
      logBuffer = [];
    });

    it("should log success", async ({ conn }) => {
      const { ddl } = await createTableFromZod({
        conn,
        table: new Table("test"),
        schema: z.object({
          id: z.string(),
        }),
        options: {
          create: "CREATE_OR_REPLACE",
        },
      });
      expect(logBuffer[0]).toMatchObject({
        category: flowbladeLogtapeSqlduckConfig.categories,
        rawMessage: "Generate DDL for table '{table}'",
        message: ["Generate DDL for table '", "test", "'"],
        level: "debug",
        properties: {
          table: "test",
          ddl,
        },
      });
      expect(logBuffer[1]).toMatchObject({
        category: flowbladeLogtapeSqlduckConfig.categories,
        rawMessage: "Table '{table}' successfully created",
        message: ["Table '", "test", "' successfully created"],
        level: "info",
        properties: {
          table: "test",
          ddl,
        },
      });
    });

    it("should log error", async ({ conn }) => {
      const _res = await conn.run("CREATE OR REPLACE TABLE test(id STRING)");
      const errMessage =
        "Failed to create table 'test': Catalog Error: Table with name \"test\" already exists!";
      await expect(
        createTableFromZod({
          conn,
          table: new Table("test"),
          schema: z.object({
            id: z.string().meta({}),
          }),
          options: {
            create: "CREATE",
          },
        })
      ).rejects.toThrow(errMessage);

      expect(logBuffer[1]).toMatchObject({
        category: flowbladeLogtapeSqlduckConfig.categories,
        rawMessage: "Failed to create table '{table}': {errorMessage}",
        level: "error",
        properties: {
          table: "test",
          errorMessage: 'Catalog Error: Table with name "test" already exists!',
          ddl: expect.stringContaining("CREATE TABLE"),
        },
      });
    });
  });
});
