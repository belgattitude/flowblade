import { describe, expect, it } from "vitest";

import {
  normalizeKnexBuilderResponse,
  normalizeKnexRawResponse,
} from "./normalize-knex-response.ts";

describe(normalizeKnexBuilderResponse, () => {
  it("should keep arrays (rows, returning, ids)", () => {
    expect(normalizeKnexBuilderResponse([{ id: 1 }])).toStrictEqual({
      rows: [{ id: 1 }],
      affectedRows: 0,
    });
    expect(normalizeKnexBuilderResponse([3])).toStrictEqual({
      rows: [3],
      affectedRows: 0,
    });
  });

  it("should use a number as affected rows", () => {
    expect(normalizeKnexBuilderResponse(2)).toStrictEqual({
      rows: [],
      affectedRows: 2,
    });
  });

  it("should wrap a single row (first)", () => {
    expect(normalizeKnexBuilderResponse({ id: 1 })).toStrictEqual({
      rows: [{ id: 1 }],
      affectedRows: 0,
    });
  });

  it("should return no rows for nothing (first without match)", () => {
    expect(normalizeKnexBuilderResponse(undefined)).toStrictEqual({
      rows: [],
      affectedRows: 0,
    });
  });
});

describe(normalizeKnexRawResponse, () => {
  it("should read the rows of a pg select", () => {
    expect(
      normalizeKnexRawResponse(
        { rows: [{ a: 1 }], rowCount: 1, command: "SELECT" },
        "postgresql"
      )
    ).toStrictEqual({ rows: [{ a: 1 }], affectedRows: 0 });
  });

  it("should read the affected rows of a pg write", () => {
    expect(
      normalizeKnexRawResponse(
        { rows: [], rowCount: 3, command: "UPDATE" },
        "postgresql"
      )
    ).toStrictEqual({ rows: [], affectedRows: 3 });
  });

  it("should read the rows of a mysql select", () => {
    expect(
      normalizeKnexRawResponse([[{ a: 1 }], [{ name: "a" }]], "mysql2")
    ).toStrictEqual({ rows: [{ a: 1 }], affectedRows: 0 });
  });

  it("should read the affected rows of a mysql write", () => {
    expect(
      normalizeKnexRawResponse([{ affectedRows: 2 }, undefined], "mysql")
    ).toStrictEqual({ rows: [], affectedRows: 2 });
  });

  it("should keep the array of mssql and sqlite", () => {
    expect(normalizeKnexRawResponse([{ a: 1 }], "mssql")).toStrictEqual({
      rows: [{ a: 1 }],
      affectedRows: 0,
    });
    expect(normalizeKnexRawResponse([], "sqlite3")).toStrictEqual({
      rows: [],
      affectedRows: 0,
    });
  });

  it("should read the changes of a better-sqlite3 write", () => {
    expect(
      normalizeKnexRawResponse(
        { changes: 1, lastInsertRowid: 3 },
        "better-sqlite3"
      )
    ).toStrictEqual({ rows: [], affectedRows: 1 });
  });

  it("should return no rows for nothing", () => {
    expect(normalizeKnexRawResponse(undefined, "mssql")).toStrictEqual({
      rows: [],
      affectedRows: 0,
    });
  });
});
