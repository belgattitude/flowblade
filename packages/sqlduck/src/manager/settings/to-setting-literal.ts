import { quoteValue } from "../../utils/quote-value.ts";
import type { DuckSettingValue } from "./duck-settings.types.ts";

/**
 * Convert a setting value to a SQL literal for `SET`.
 */
export const toSettingLiteral = (value: DuckSettingValue): string => {
  if (typeof value === "boolean" || typeof value === "string") {
    return quoteValue(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Invalid setting value ${value}`);
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${(value as readonly string[]).map((v) => quoteValue(v)).join(", ")}]`;
  }
  const entries = Object.entries(value as Readonly<Record<string, string>>);
  return `MAP {${entries.map(([k, v]) => `${quoteValue(k)}: ${quoteValue(v)}`).join(", ")}}`;
};
