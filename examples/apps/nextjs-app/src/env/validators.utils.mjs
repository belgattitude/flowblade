// @ts-check

import { convertJdbcToDsn, isParsableDsn } from "@httpx/dsn-parser";
import * as z from "zod";

export const zDsn = z
  .string()
  .refine((dsn) => isParsableDsn(dsn), "Invalid DSN format.");

export const zJdbcUrlDsnCompatible = z.string().refine((jdbcUrl) => {
  let dsn = "";
  try {
    dsn = convertJdbcToDsn(jdbcUrl);
  } catch {
    return false;
  }
  return isParsableDsn(dsn);
}, "Invalid JDBCUrl format.");
