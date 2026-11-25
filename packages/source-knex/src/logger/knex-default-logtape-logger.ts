import { getLogger } from "@logtape/logtape";

import { flowbladeLogtapeKnexConfig } from "../config/flowblade-logtape-knex.config.ts";

export const knexDefaultLogtapeLogger = getLogger(
  flowbladeLogtapeKnexConfig.categories
);
