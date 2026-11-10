import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DuckdbDatasource, sql } from "@flowblade/source-duckdb";
import { reset } from "@logtape/logtape";
import type { LogRecord } from "@logtape/logtape";
import { afterEach, beforeEach, describe, expect, vi } from "vitest";
import * as z from "zod";

import { configureTestLogger } from "#tests/utils/configure-test-logger.ts";
import { createDummyKyselyDb } from "#tests/utils/create-dummy-kysely-db.ts";
import { createDuckTest } from "#tests/utils/duck-test.ts";

import { flowbladeLogtapeSqlduckConfig } from "../config/flowblade-logtape-sqlduck.config.ts";
import { KyselyQueryWithZodSchema } from "../integrations/kysely/kysely-query-with-zod-schema.ts";
import { sqlduckDefaultLogtapeLogger } from "../logger/sqlduck-default-logtape-logger.ts";
import { QueryExporter } from "./query-exporter.ts";

const it = createDuckTest({ threads: 1 }).extend<{ directory: string }>({
  // oxlint-disable-next-line no-empty-pattern
  directory: async ({}, use) => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "sqlduck-export-test-")
    );
    await use(directory);
    await rm(directory, { recursive: true, force: true });
  },
});

describe("QueryExporter logging", () => {
  let logBuffer: LogRecord[] = [];
  beforeEach(async () => {
    await configureTestLogger(logBuffer);
  });

  afterEach(async () => {
    await reset();
    logBuffer = [];
  });

  const findRecord = (rawMessage: string): LogRecord | undefined =>
    logBuffer.find((record) => record.rawMessage === rawMessage);

  it("logs the timings of an export to a file", async ({ conn, directory }) => {
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
    });
    const exported = await exporter.toFile({
      sql: sql`SELECT ${42}::INTEGER AS answer`,
      format: { type: "csv" },
      file: path.join(directory, "answer.csv"),
    });

    expect(
      findRecord(
        "Exported query to {format} file '{path}' ({sizeBytes} bytes) in {timeMs}ms"
      )
    ).toMatchObject({
      category: flowbladeLogtapeSqlduckConfig.categories,
      level: "info",
      properties: {
        format: "csv",
        path: exported.path,
        sizeBytes: exported.sizeBytes,
        queryTimeMs: expect.any(Number),
        timeMs: exported.timeMs,
      },
    });
  });

  it("logs the timings of a response, then the removal of its file", async ({
    conn,
    directory,
  }) => {
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
    });
    const response = await exporter.toResponse({
      sql: sql`SELECT ${42}::INTEGER AS answer`,
      format: { type: "csv" },
      directory,
      filename: "answer.csv",
    });

    expect(
      findRecord(
        "Exported query to a {format} response ({sizeBytes} bytes) in {timeMs}ms"
      )
    ).toMatchObject({
      level: "info",
      properties: {
        format: "csv",
        filename: "answer.csv",
        sizeBytes: 10,
        queryTimeMs: expect.any(Number),
        timeMs: expect.any(Number),
      },
    });

    await response.text();
    await vi.waitFor(() => {
      expect(
        findRecord(
          "Closed response '{filename}' ({outcome}) after {streamTimeMs}ms"
        )
      ).toMatchObject({
        level: "debug",
        properties: {
          filename: "answer.csv",
          outcome: "completed",
          streamTimeMs: expect.any(Number),
        },
      });
    });
  });

  it("logs an unread response as a warning", async ({ conn, directory }) => {
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
    });
    await exporter.toResponse({
      sql: sql`SELECT 1`,
      format: { type: "csv" },
      directory,
      idleTimeoutMs: 20,
    });

    await vi.waitFor(() => {
      expect(
        findRecord(
          "Closed response '{filename}' ({outcome}) after {streamTimeMs}ms"
        )
      ).toMatchObject({
        level: "warning",
        properties: { filename: "export.csv", outcome: "timeout" },
      });
    });
  });

  it("logs a failed export with the query text but not its values", async ({
    conn,
    directory,
  }) => {
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
    });
    await expect(
      exporter.toFile({
        sql: sql`SELECT * FROM missing_export_table WHERE secret = ${"s3cret"}`,
        format: { type: "parquet" },
        file: path.join(directory, "missing.parquet"),
      })
    ).rejects.toThrow("missing_export_table");

    const record = findRecord(
      "Failed to export query to {format} after {timeMs}ms - {errorMessage}"
    );
    expect(record).toMatchObject({
      level: "error",
      properties: {
        format: "parquet",
        sql: "SELECT * FROM missing_export_table WHERE secret = $1",
        timeMs: expect.any(Number),
        errorMessage: expect.stringContaining("missing_export_table"),
      },
    });
    expect(JSON.stringify(record?.properties)).not.toContain("s3cret");
  });

  it("logs a failed kysely source with its query text", async ({
    conn,
    directory,
  }) => {
    const db = createDummyKyselyDb<{ user: { id: number } }>("postgresql");
    const source = new KyselyQueryWithZodSchema({
      query: db.selectFrom("user").select(["id"]).where("id", "=", 4242),
      schema: z.strictObject({ id: z.int32() }),
    });
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
    });
    await expect(
      exporter.toFile({
        source,
        format: { type: "csv" },
        file: path.join(directory, "users.csv"),
        mapQuery: (query) => sql`SELECT missing_column FROM (${query})`,
      })
    ).rejects.toThrow("missing_column");

    expect(
      findRecord(
        "Materialized kysely source into table '{table}' ({rowCount} rows) in {timeMs}ms"
      )
    ).toMatchObject({ level: "debug", properties: { rowCount: 0 } });
    expect(
      findRecord(
        "Failed to export query to {format} after {timeMs}ms - {errorMessage}"
      )?.properties.sql
    ).toBe('select "id" from "user" where "id" = $1');
  });

  it("logs an aborted export as a warning", async ({ conn, directory }) => {
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
    });
    const controller = new AbortController();
    await expect(
      exporter.toFile({
        sql: sql`SELECT 1`,
        format: { type: "csv" },
        file: path.join(directory, "aborted.csv"),
        mapQuery: (query) => {
          controller.abort();
          return query;
        },
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ code: "ABORTED" });

    expect(
      findRecord("Aborted export of query to {format} after {timeMs}ms")
    ).toMatchObject({ level: "warning", properties: { format: "csv" } });
    expect(logBuffer.some((record) => record.level === "error")).toBe(false);
  });

  it("uses the logger given to the constructor", async ({
    conn,
    directory,
  }) => {
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
      logger: sqlduckDefaultLogtapeLogger.getChild("custom-export"),
    });
    await exporter.toFile({
      sql: sql`SELECT 1`,
      format: { type: "csv" },
      file: path.join(directory, "one.csv"),
    });

    expect(logBuffer.map((record) => record.category)).toStrictEqual([
      [...flowbladeLogtapeSqlduckConfig.categories, "custom-export"],
    ]);
  });
});
