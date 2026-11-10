import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { gunzipSync } from "node:zlib";

import type { DuckDBConnection } from "@duckdb/node-api";
import { DuckdbDatasource, sql } from "@flowblade/source-duckdb";
import { describe, expect, vi } from "vitest";
import * as z from "zod";

import { createDummyKyselyDb } from "#tests/utils/create-dummy-kysely-db.ts";
import { createDuckTest } from "#tests/utils/duck-test.ts";

import { KyselyQueryWithZodSchema } from "../integrations/kysely/kysely-query-with-zod-schema.ts";
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

describe("QueryExporter", () => {
  describe("toFile", () => {
    it("exports a parameterized query as CSV to the given file", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const file = path.join(directory, "answers.csv");
      const exported = await exporter.toFile({
        sql: sql`SELECT ${42}::INTEGER AS answer, ${"hello"} AS greeting`,
        format: { type: "csv", header: true, delimiter: ";" },
        file,
      });

      expect(exported).toStrictEqual({
        path: file,
        filename: "answers.csv",
        contentType: "text/csv; charset=utf-8",
        sizeBytes: 25,
        rowCount: 1,
        timeMs: expect.any(Number),
      });
      await expect(readFile(file, "utf8")).resolves.toBe(
        "answer;greeting\n42;hello\n"
      );
      // No partial file left next to the destination
      await expect(readdir(directory)).resolves.toStrictEqual(["answers.csv"]);
    });

    it("exports Parquet that DuckDB can read back", async ({
      conn,
      directory,
    }) => {
      const datasource = new DuckdbDatasource({ connection: conn });
      const exporter = new QueryExporter({ datasource });
      const exported = await exporter.toFile({
        sql: sql`SELECT ${42}::INTEGER AS answer`,
        format: { type: "parquet", compression: "zstd", rowGroupSize: 2048 },
        file: path.join(directory, "answers.parquet"),
      });

      const { data } = await datasource.queryOrThrow(
        sql`SELECT answer FROM read_parquet(${exported.path})`
      );
      expect(data).toStrictEqual([{ answer: 42 }]);
      expect(exported.contentType).toBe("application/vnd.apache.parquet");
    });

    it("reports the compression of a compressed CSV", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const exported = await exporter.toFile({
        sql: sql`SELECT 1 AS one`,
        format: { type: "csv", header: true, compression: "gzip" },
        file: path.join(directory, "one.csv.gz"),
      });

      expect(exported.contentEncoding).toBe("gzip");
      expect(gunzipSync(await readFile(exported.path)).toString()).toBe(
        "one\n1\n"
      );
    });

    it("replaces an existing file", async ({ conn, directory }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const file = path.join(directory, "one.csv");
      await writeFile(file, "previous");
      await exporter.toFile({
        sql: sql`SELECT 1 AS one`,
        format: { type: "csv", header: true },
        file,
      });
      await expect(readFile(file, "utf8")).resolves.toBe("one\n1\n");
    });

    it("keeps an existing file and leaves no partial file when the export fails", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const file = path.join(directory, "one.csv");
      await writeFile(file, "previous");

      await expect(
        exporter.toFile({
          sql: sql`SELECT * FROM missing_export_table`,
          format: { type: "csv" },
          file,
        })
      ).rejects.toThrow("missing_export_table");
      await expect(readFile(file, "utf8")).resolves.toBe("previous");
      await expect(readdir(directory)).resolves.toStrictEqual(["one.csv"]);
    });

    it("rewrites the query with mapQuery, keeping its parameters", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const { path: file } = await exporter.toFile({
        sql: sql`SELECT * FROM (VALUES (1, ${"b"}), (2, ${"a"})) AS t(id, name)`,
        format: { type: "csv", header: true },
        file: path.join(directory, "mapped.csv"),
        mapQuery: (query) =>
          sql`SELECT *, upper(name) AS name_uc FROM (${query}) WHERE id >= ${1} ORDER BY id DESC`,
      });

      await expect(readFile(file, "utf8")).resolves.toBe(
        "id,name,name_uc\n2,a,A\n1,b,B\n"
      );
    });

    it("picks, reorders and renames columns with selectColumns", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const { path: file } = await exporter.toFile({
        sql: sql`SELECT ${1}::INTEGER AS id, ${"a"} AS name, 'x' AS ignored`,
        format: { type: "csv", header: true },
        file: path.join(directory, "selected.csv"),
        selectColumns: { name: 'The "Name"', id: "User ID" },
      });

      await expect(readFile(file, "utf8")).resolves.toBe(
        '"The ""Name""",User ID\na,1\n'
      );
    });

    it("applies selectColumns on the columns produced by mapQuery", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const { path: file } = await exporter.toFile({
        sql: sql`SELECT ${"a"} AS name`,
        format: { type: "csv", header: true },
        file: path.join(directory, "both.csv"),
        mapQuery: (query) => sql`SELECT upper(name) AS name_uc FROM (${query})`,
        selectColumns: { name_uc: "Name" },
      });

      await expect(readFile(file, "utf8")).resolves.toBe("Name\nA\n");
    });

    it("rejects an empty selectColumns without creating files", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      await expect(
        exporter.toFile({
          sql: sql`SELECT 1`,
          format: { type: "csv" },
          file: path.join(directory, "empty.csv"),
          selectColumns: {},
        })
      ).rejects.toThrow("selectColumns must contain at least one column");
      await expect(readdir(directory)).resolves.toStrictEqual([]);
    });

    it("rejects invalid format options and an empty file", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      await expect(
        exporter.toFile({
          sql: sql`SELECT 1`,
          format: { type: "parquet", rowGroupSize: 0 },
          file: path.join(directory, "invalid.parquet"),
        })
      ).rejects.toThrow("rowGroupSize must be a positive safe integer");
      await expect(
        exporter.toFile({
          sql: sql`SELECT 1`,
          format: { type: "csv" },
          file: " ",
        })
      ).rejects.toThrow("file must be a non-empty path");
    });

    it(
      "exports an Excel workbook",
      { tags: ["network"], timeout: 30_000 },
      async ({ conn, directory }) => {
        const exporter = new QueryExporter({
          datasource: new DuckdbDatasource({ connection: conn }),
        });
        const exported = await exporter.toFile({
          sql: sql`SELECT ${42}::INTEGER AS answer`,
          format: { type: "excel", header: true, sheet: "Answers" },
          file: path.join(directory, "answers.xlsx"),
        });

        const content = await readFile(exported.path);
        expect(content.subarray(0, 2).toString()).toBe("PK");
      }
    );
  });

  describe("kysely source", () => {
    type DB = { user: { id: number; name: string } };
    const db = createDummyKyselyDb<DB>("postgresql");

    // The dummy driver returns no rows: the stream is replaced by fake rows
    const createSource = (
      streamRows: () => AsyncGenerator<{ id: number; name: string }>
    ) => {
      const source = new KyselyQueryWithZodSchema({
        query: db.selectFrom("user").select(["id", "name"]),
        schema: z.strictObject({ id: z.int32(), name: z.string() }),
      });
      const query = source.getQuery();
      source.getQuery = (() => {
        return {
          stream: streamRows,
          compile: () => query.compile(),
        };
      }) as unknown as typeof source.getQuery;
      return source;
    };

    const users = async function* users() {
      yield { id: 2, name: "b" };
      yield { id: 1, name: "a" };
    };

    const countMaterializedTables = async (
      conn: DuckDBConnection
    ): Promise<number> => {
      const reader = await conn.runAndReadAll(
        "SELECT count(*) AS count FROM duckdb_tables() WHERE table_name LIKE '\\_materialized%' ESCAPE '\\'"
      );
      return Number(reader.getRowObjectsJS()[0]?.count);
    };

    it("exports a kysely query to a file and drops its temporary table", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const exported = await exporter.toFile({
        source: createSource(users),
        format: { type: "csv", header: true },
        file: path.join(directory, "users.csv"),
      });

      expect(exported.rowCount).toBe(2);
      await expect(readFile(exported.path, "utf8")).resolves.toBe(
        "id,name\n2,b\n1,a\n"
      );
      await expect(countMaterializedTables(conn)).resolves.toBe(0);
    });

    it("applies mapQuery and selectColumns on the materialized rows", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const exported = await exporter.toFile({
        source: createSource(users),
        format: { type: "csv", header: true },
        file: path.join(directory, "users.csv"),
        mapQuery: (query) =>
          sql`SELECT *, upper(name) AS name_uc FROM (${query}) WHERE id >= ${1} ORDER BY id`,
        selectColumns: { name_uc: "Name", id: "User ID" },
      });

      await expect(readFile(exported.path, "utf8")).resolves.toBe(
        "Name,User ID\nA,1\nB,2\n"
      );
    });

    it("streams a kysely query as a response after dropping its temporary table", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const response = await exporter.toResponse({
        source: createSource(users),
        format: { type: "csv", header: true },
        directory,
      });

      await expect(countMaterializedTables(conn)).resolves.toBe(0);
      await expect(response.text()).resolves.toBe("id,name\n2,b\n1,a\n");
    });

    it("creates the temporary table in the given schema", async ({
      conn,
      directory,
    }) => {
      await conn.run("CREATE SCHEMA staging");
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      let materializedQuery = "";
      await exporter.toFile({
        source: createSource(users),
        materialization: { schema: "staging" },
        format: { type: "csv" },
        file: path.join(directory, "users.csv"),
        mapQuery: (query) => {
          materializedQuery = query.text;
          return query;
        },
      });

      expect(materializedQuery).toMatch(
        /^SELECT \* FROM "?staging"?\."?_materialized_\w+"?$/
      );
    });

    it("drops the temporary table and leaves no file when the source fails midway", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      await expect(
        exporter.toFile({
          // oxlint-disable-next-line require-yield
          source: createSource(async function* failing() {
            yield { id: 1, name: "a" };
            throw new Error("stream boom");
          }),
          format: { type: "csv" },
          file: path.join(directory, "users.csv"),
        })
      ).rejects.toThrow(/Can't materialize kysely source .* stream boom/);

      await expect(countMaterializedTables(conn)).resolves.toBe(0);
      await expect(readdir(directory)).resolves.toStrictEqual([]);
    });

    it("drops the temporary table when the export query fails", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      await expect(
        exporter.toFile({
          source: createSource(users),
          format: { type: "csv" },
          file: path.join(directory, "users.csv"),
          mapQuery: (query) => sql`SELECT missing_column FROM (${query})`,
        })
      ).rejects.toThrow("missing_column");

      await expect(countMaterializedTables(conn)).resolves.toBe(0);
    });

    it("rejects an invalid materialization target", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      await expect(
        exporter.toFile({
          source: createSource(users),
          materialization: { schema: "x; DROP TABLE users" },
          format: { type: "csv" },
          file: path.join(directory, "users.csv"),
        })
      ).rejects.toThrow("Invalid schema name 'x; DROP TABLE users'");
    });
  });

  describe("toObjectStorage", () => {
    it("rejects local paths and unsupported urls before running a query", async ({
      conn,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      for (const url of [
        "/tmp/users.csv",
        "https://example.com/a.csv",
        "az://",
      ]) {
        await expect(
          exporter.toObjectStorage({
            sql: sql`SELECT * FROM missing_export_table`,
            format: { type: "csv" },
            url,
          })
        ).rejects.toThrow("url must be an object storage url (az://");
      }
    });
  });

  describe("toResponse", () => {
    const expectEmptyDirectory = async (directory: string): Promise<void> => {
      await vi.waitFor(async () => {
        await expect(readdir(directory)).resolves.toStrictEqual([]);
      });
    };

    it("returns a download response and removes its temporary file once read", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const response = await exporter.toResponse({
        sql: sql`SELECT ${42}::INTEGER AS answer, ${"hello"} AS greeting`,
        format: { type: "csv", header: true },
        directory,
      });

      expect(response.status).toBe(200);
      expect(Object.fromEntries(response.headers)).toStrictEqual({
        "content-type": "text/csv; charset=utf-8",
        "content-length": "25",
        "content-disposition": `attachment; filename="export.csv"; filename*=UTF-8''export.csv`,
      });
      await expect(readdir(directory)).resolves.toHaveLength(1);

      await expect(response.text()).resolves.toBe(
        "answer,greeting\n42,hello\n"
      );
      await expectEmptyDirectory(directory);
    });

    it("removes its temporary file when the body is cancelled", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const response = await exporter.toResponse({
        sql: sql`SELECT range AS id FROM range(100000)`,
        format: { type: "csv" },
        directory,
      });

      await response.body?.cancel();
      await expectEmptyDirectory(directory);
    });

    it("stops streaming and removes its temporary file when the signal aborts", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const controller = new AbortController();
      const response = await exporter.toResponse({
        sql: sql`SELECT range AS id FROM range(100000)`,
        format: { type: "csv" },
        directory,
        signal: controller.signal,
      });

      controller.abort();
      await expect(response.text()).rejects.toThrow(/abort/i);
      await expectEmptyDirectory(directory);
    });

    it("removes the temporary file of an unread response when the signal aborts", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const controller = new AbortController();
      await exporter.toResponse({
        sql: sql`SELECT 1 AS one`,
        format: { type: "csv" },
        directory,
        signal: controller.signal,
      });

      controller.abort();
      await expectEmptyDirectory(directory);
    });

    it("fails an unread response after idleTimeoutMs and removes its temporary file", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const response = await exporter.toResponse({
        sql: sql`SELECT 1 AS one`,
        format: { type: "csv" },
        directory,
        idleTimeoutMs: 20,
      });

      await expectEmptyDirectory(directory);
      await expect(response.text()).rejects.toThrow(
        "Export response left unread for 20ms"
      );
    });

    it("fails a response stalled between two reads after idleTimeoutMs", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const response = await exporter.toResponse({
        sql: sql`SELECT range AS id FROM range(100000)`,
        format: { type: "csv" },
        directory,
        idleTimeoutMs: 20,
      });
      const reader = response.body?.getReader();
      const first = await reader?.read();
      expect(first?.value?.byteLength).toBe(64 * 1024);

      await expectEmptyDirectory(directory);
      await expect(reader?.read()).rejects.toThrow(
        "Export response left unread for 20ms"
      );
    });

    it("does not time out a response read in time", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const response = await exporter.toResponse({
        sql: sql`SELECT range AS id FROM range(100000)`,
        format: { type: "csv", header: false },
        directory,
        idleTimeoutMs: 200,
      });
      const length = Number(response.headers.get("content-length"));
      const body = await response.arrayBuffer();
      expect(body.byteLength).toBe(length);
      await expectEmptyDirectory(directory);
      // Past the timeout: nothing left to fail
      await setTimeout(250);
    });

    it("rejects an invalid idleTimeoutMs", async ({ conn, directory }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      await expect(
        exporter.toResponse({
          sql: sql`SELECT 1`,
          format: { type: "csv" },
          directory,
          idleTimeoutMs: 0,
        })
      ).rejects.toThrow("idleTimeoutMs must be a positive number");
      await expect(readdir(directory)).resolves.toStrictEqual([]);
    });

    it("uses the given filename and additional headers", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const response = await exporter.toResponse({
        sql: sql`SELECT 1 AS one`,
        format: { type: "csv" },
        directory,
        filename: 'été "2026".csv',
        headers: { "Cache-Control": "no-store", "Content-Type": "ignored" },
      });
      await response.body?.cancel();

      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("content-type")).toBe(
        "text/csv; charset=utf-8"
      );
      expect(response.headers.get("content-disposition")).toBe(
        `attachment; filename="_t_ _2026_.csv"; filename*=UTF-8''%C3%A9t%C3%A9%20%222026%22.csv`
      );
    });

    it("serves a compressed CSV as a compressed file download", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const response = await exporter.toResponse({
        sql: sql`SELECT 1 AS one`,
        format: { type: "csv", header: true, compression: "gzip" },
        directory,
      });

      expect(response.headers.get("content-type")).toBe("application/gzip");
      expect(response.headers.get("content-encoding")).toBeNull();
      expect(response.headers.get("content-disposition")).toContain(
        'filename="export.csv.gz"'
      );
      const body = new Uint8Array(await response.arrayBuffer());
      expect(gunzipSync(body).toString()).toBe("one\n1\n");
    });

    it("removes the temporary directory when the export fails", async ({
      conn,
      directory,
    }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      await expect(
        exporter.toResponse({
          sql: sql`SELECT * FROM missing_export_table`,
          format: { type: "csv" },
          directory,
        })
      ).rejects.toThrow("missing_export_table");
      await expect(readdir(directory)).resolves.toStrictEqual([]);
    });

    it("rejects an empty directory", async ({ conn }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      await expect(
        exporter.toResponse({
          sql: sql`SELECT 1`,
          format: { type: "csv" },
          directory: " ",
        })
      ).rejects.toThrow("directory must be a non-empty path");
    });
  });
});
