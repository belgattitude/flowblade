import type { SqlTag } from "@flowblade/sql-tag";

import { quoteIdentifier } from "../utils/quote-value.ts";
import type { ExportColumnSelection, ExportFormat } from "./types.ts";

type CopyOption = {
  name: string;
  value: unknown;
};

type ExportFormatInfo = {
  extension: string;
  copyFormat: string;
  contentType: string;
  contentEncoding?: "gzip" | "zstd";
};

const assertNever = (value: never): never => {
  throw new Error(`Unsupported export format: ${String(value)}`);
};

const formatOptions = (format: ExportFormat): CopyOption[] => {
  switch (format.type) {
    case "csv": {
      return [
        { name: "HEADER", value: format.header },
        { name: "DELIMITER", value: format.delimiter },
        { name: "QUOTE", value: format.quote },
        { name: "ESCAPE", value: format.escape },
        { name: "NULL", value: format.nullString },
        { name: "DATEFORMAT", value: format.dateFormat },
        { name: "TIMESTAMPFORMAT", value: format.timestampFormat },
        { name: "COMPRESSION", value: format.compression },
      ];
    }
    case "parquet": {
      return [
        { name: "COMPRESSION", value: format.compression },
        { name: "ROW_GROUP_SIZE", value: format.rowGroupSize },
        { name: "PRESERVE_ORDER", value: format.preserveOrder },
      ];
    }
    case "excel": {
      return [
        { name: "HEADER", value: format.header },
        { name: "SHEET", value: format.sheet },
        { name: "SHEET_ROW_LIMIT", value: format.sheetRowLimit },
      ];
    }
    default: {
      return assertNever(format);
    }
  }
};

export const getFormatInfo = (format: ExportFormat): ExportFormatInfo => {
  switch (format.type) {
    case "csv": {
      let extension = "csv";
      let contentEncoding: "gzip" | "zstd" | undefined;
      if (format.compression === "gzip") {
        extension += ".gz";
        contentEncoding = "gzip";
      } else if (format.compression === "zstd") {
        extension += ".zst";
        contentEncoding = "zstd";
      }
      return {
        extension,
        copyFormat: "CSV",
        contentType: "text/csv; charset=utf-8",
        ...(contentEncoding === undefined ? {} : { contentEncoding }),
      };
    }
    case "parquet": {
      return {
        extension: "parquet",
        copyFormat: "PARQUET",
        contentType: "application/vnd.apache.parquet",
      };
    }
    case "excel": {
      return {
        extension: "xlsx",
        copyFormat: "XLSX",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }
    default: {
      return assertNever(format);
    }
  }
};

const isPositiveInteger = (value: number | undefined): boolean =>
  value === undefined || (Number.isSafeInteger(value) && value > 0);

export const validateFormat = (format: ExportFormat): void => {
  if (format.type === "parquet" && !isPositiveInteger(format.rowGroupSize)) {
    throw new RangeError("rowGroupSize must be a positive safe integer");
  }
  if (format.type === "excel" && !isPositiveInteger(format.sheetRowLimit)) {
    throw new RangeError("sheetRowLimit must be a positive safe integer");
  }
};

const compileSelectColumns = (
  queryText: string,
  selectColumns: ExportColumnSelection | undefined
): string => {
  if (selectColumns === undefined) {
    return queryText;
  }
  const columns = Object.entries(selectColumns);
  if (columns.length === 0) {
    throw new Error("selectColumns must contain at least one column");
  }
  const projection = columns.map(([source, exported]) => {
    if (source.length === 0 || exported.length === 0) {
      throw new Error("selectColumns names must be non-empty strings");
    }
    return `${quoteIdentifier(source)} AS ${quoteIdentifier(exported)}`;
  });
  return `SELECT ${projection.join(", ")} FROM (${queryText}) AS export_source`;
};

export const compileCopyQuery = (
  query: SqlTag<unknown[]>,
  format: ExportFormat,
  outputPath: string,
  selectColumns?: ExportColumnSelection
): { text: string; values: unknown[] } => {
  const values = [...query.values];
  const bind = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };
  const { copyFormat } = getFormatInfo(format);
  const options = formatOptions(format)
    .filter(({ value }) => value !== undefined)
    .map(({ name, value }) => `${name} ${bind(value)}`);
  return {
    text: `COPY (${compileSelectColumns(query.text, selectColumns)}) TO ${bind(outputPath)} (FORMAT ${copyFormat}${
      options.length > 0 ? `, ${options.join(", ")}` : ""
    })`,
    values,
  };
};
