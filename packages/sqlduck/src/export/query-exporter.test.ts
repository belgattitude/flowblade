import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DuckdbDatasource, sql } from "@flowblade/source-duckdb";
import { describe, expect } from "vitest";

import { createDuckTest } from "#tests/utils/duck-test.ts";

import { QueryExporter } from "./query-exporter.ts";

const it = createDuckTest({ threads: 1 });

const createTestDirectory = async (): Promise<string> =>
  await mkdtemp(path.join(os.tmpdir(), "sqlduck-export-test-"));

describe("QueryExporter", () => {
  it("exports a parameterized query as CSV and disposes its temporary file", async ({
    conn,
  }) => {
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
    });
    const artifact = await exporter.export({
      sql: sql`SELECT ${42}::INTEGER AS answer, ${"hello"} AS greeting`,
      format: {
        type: "csv",
        header: true,
        delimiter: ";",
      },
    });

    expect(artifact.filename).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[\da-f]{4}-[\da-f]{12}\.csv$/
    );
    expect(artifact.contentType).toBe("text/csv; charset=utf-8");
    expect(artifact.sizeBytes).toBeGreaterThan(0);
    await expect(readFile(artifact.path, "utf8")).resolves.toBe(
      "answer;greeting\n42;hello\n"
    );

    const stream = artifact.openStream();
    stream.setEncoding("utf8");
    const chunks: string[] = [];
    for await (const chunk of stream) {
      if (typeof chunk !== "string") {
        throw new TypeError("Expected UTF-8 stream chunks");
      }
      chunks.push(chunk);
    }
    const streamedContent = chunks.join("");
    expect(streamedContent).toBe("answer;greeting\n42;hello\n");

    await artifact.dispose();
    await expect(readFile(artifact.path)).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(() => artifact.openStream()).toThrow("has been disposed");
  });

  it("exports Parquet that DuckDB can read back", async ({ conn }) => {
    const datasource = new DuckdbDatasource({ connection: conn });
    const exporter = new QueryExporter({ datasource });
    const artifact = await exporter.export({
      sql: sql`SELECT ${42}::INTEGER AS answer`,
      format: { type: "parquet", compression: "zstd", rowGroupSize: 2048 },
    });

    try {
      const { data } = await datasource.queryOrThrow(
        sql`SELECT answer FROM read_parquet(${artifact.path})`
      );
      expect(data).toStrictEqual([{ answer: 42 }]);
    } finally {
      await artifact.dispose();
    }
  });

  it("creates exports in the default directory given to the constructor", async ({
    conn,
  }) => {
    const directory = await createTestDirectory();
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
      directory,
    });

    try {
      const artifact = await exporter.export({
        sql: sql`SELECT 1 AS one`,
        format: { type: "csv" },
      });
      expect(path.dirname(path.dirname(artifact.path))).toBe(
        path.resolve(directory)
      );
      await artifact.dispose();
      await expect(readdir(directory)).resolves.toStrictEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("lets an export override the default directory", async ({ conn }) => {
    const defaultDirectory = await createTestDirectory();
    const directory = await createTestDirectory();
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
      directory: defaultDirectory,
    });

    try {
      const artifact = await exporter.export({
        sql: sql`SELECT 1 AS one`,
        format: { type: "csv" },
        directory,
      });
      try {
        expect(path.dirname(path.dirname(artifact.path))).toBe(
          path.resolve(directory)
        );
        await expect(readdir(defaultDirectory)).resolves.toStrictEqual([]);
      } finally {
        await artifact.dispose();
      }
    } finally {
      await rm(defaultDirectory, { recursive: true, force: true });
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects an empty default directory", ({ conn }) => {
    expect(
      () =>
        new QueryExporter({
          datasource: new DuckdbDatasource({ connection: conn }),
          directory: " ",
        })
    ).toThrow("directory must be a non-empty path");
  });

  it("removes the temporary directory when export fails", async ({ conn }) => {
    const directory = await createTestDirectory();
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
      directory,
    });

    try {
      await expect(
        exporter.export({
          sql: sql`SELECT * FROM missing_export_table`,
          format: { type: "csv" },
        })
      ).rejects.toThrow("missing_export_table");
      await expect(readdir(directory)).resolves.toStrictEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rewrites the query with mapQuery, keeping its parameters", async ({
    conn,
  }) => {
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
    });
    const artifact = await exporter.export({
      sql: sql`SELECT * FROM (VALUES (1, ${"b"}), (2, ${"a"})) AS t(id, name)`,
      format: { type: "csv", header: true },
      mapQuery: (query) =>
        sql`SELECT *, upper(name) AS name_uc FROM (${query}) WHERE id >= ${1} ORDER BY id DESC`,
    });

    try {
      await expect(readFile(artifact.path, "utf8")).resolves.toBe(
        "id,name,name_uc\n2,a,A\n1,b,B\n"
      );
    } finally {
      await artifact.dispose();
    }
  });

  it("picks, reorders and renames columns with selectColumns", async ({
    conn,
  }) => {
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
    });
    const artifact = await exporter.export({
      sql: sql`SELECT ${1}::INTEGER AS id, ${"a"} AS name, 'x' AS ignored`,
      format: { type: "csv", header: true },
      selectColumns: { name: 'The "Name"', id: "User ID" },
    });

    try {
      await expect(readFile(artifact.path, "utf8")).resolves.toBe(
        '"The ""Name""",User ID\na,1\n'
      );
    } finally {
      await artifact.dispose();
    }
  });

  it("applies selectColumns on the columns produced by mapQuery", async ({
    conn,
  }) => {
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
    });
    const artifact = await exporter.export({
      sql: sql`SELECT ${"a"} AS name`,
      format: { type: "csv", header: true },
      mapQuery: (query) => sql`SELECT upper(name) AS name_uc FROM (${query})`,
      selectColumns: { name_uc: "Name" },
    });

    try {
      await expect(readFile(artifact.path, "utf8")).resolves.toBe("Name\nA\n");
    } finally {
      await artifact.dispose();
    }
  });

  it("rejects an empty selectColumns before running the query", async ({
    conn,
  }) => {
    const directory = await createTestDirectory();
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
      directory,
    });
    try {
      await expect(
        exporter.export({
          sql: sql`SELECT 1`,
          format: { type: "csv" },
          selectColumns: {},
        })
      ).rejects.toThrow("selectColumns must contain at least one column");
      await expect(readdir(directory)).resolves.toStrictEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects invalid format options before creating files", async ({
    conn,
  }) => {
    const exporter = new QueryExporter({
      datasource: new DuckdbDatasource({ connection: conn }),
    });
    await expect(
      exporter.export({
        sql: sql`SELECT 1`,
        format: { type: "parquet", rowGroupSize: 0 },
      })
    ).rejects.toThrow("rowGroupSize must be a positive safe integer");
  });

  it(
    "exports an Excel workbook",
    { tags: ["network"], timeout: 30_000 },
    async ({ conn }) => {
      const exporter = new QueryExporter({
        datasource: new DuckdbDatasource({ connection: conn }),
      });
      const artifact = await exporter.export({
        sql: sql`SELECT ${42}::INTEGER AS answer`,
        format: { type: "excel", header: true, sheet: "Answers" },
      });

      try {
        const content = await readFile(artifact.path);
        expect(content.subarray(0, 2).toString()).toBe("PK");
        expect(artifact.filename).toMatch(/\.xlsx$/);
      } finally {
        await artifact.dispose();
      }
    }
  );
});
