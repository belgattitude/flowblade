import { getLogger } from "@logtape/logtape";

import { flowbladeLogtapeDuckdbConfig } from "../config/flowblade-logtape-duckdb.config.ts";

export const duckdbDefaultLogtapeLogger = getLogger(
  flowbladeLogtapeDuckdbConfig.categories
);
