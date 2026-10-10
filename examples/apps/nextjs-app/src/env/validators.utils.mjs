// @ts-check

import { convertJdbcToDsn, isParsableDsn } from "@httpx/dsn-parser";
import * as z from "zod";

export const zDsn = z
  .string()
  .refine((dsn) => isParsableDsn(dsn), "Invalid DSN format.");

export const zJdbcUrlDsnCompatible = z.string().refine((jdbcUrl) => {
  try {
    return isParsableDsn(convertJdbcToDsn(jdbcUrl));
  } catch {
    return false;
  }
}, "Invalid JDBCUrl format.");
