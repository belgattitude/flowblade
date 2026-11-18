import * as z from "zod";

import {
  duckMemoryLimitErrorMessage,
  duckMemoryLimitRegex,
  duckThreadsErrorMessage,
  duckThreadsRegex,
} from "../core/base-validators.ts";

/**
 * Validate a DuckDB `memory_limit` setting value (e.g. "512MB", "2.7GB", "4GiB", "80%").
 */
export const duckMemoryLimitZodSchema = z
  .string()
  .regex(duckMemoryLimitRegex, duckMemoryLimitErrorMessage);

/**
 * Validate a DuckDB `threads` setting value given as a string (e.g. "4").
 */
export const duckThreadsZodSchema = z
  .string()
  .regex(duckThreadsRegex, duckThreadsErrorMessage);
