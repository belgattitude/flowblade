import type {
  DuckGlobalSettings,
  DuckSessionSettings,
} from "./duck-settings.generated.ts";

export type {
  DuckGlobalSettings,
  DuckSessionSettings,
} from "./duck-settings.generated.ts";

/**
 * All DuckDB settings: the session ones, that can be set for a single
 * connection, and the global ones, that apply to the whole instance.
 */
export type DuckSettings = DuckSessionSettings & DuckGlobalSettings;

/**
 * Value of a DuckDB setting.
 */
export type DuckSettingValue = NonNullable<DuckSettings[keyof DuckSettings]>;
