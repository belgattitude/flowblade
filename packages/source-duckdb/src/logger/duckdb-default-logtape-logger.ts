import { getLogger } from '@logtape/logtape';

import { flowbladeLogtapeDuckdbConfig } from '../config/flowblade-logtape-duckdb.config';

export const duckdbDefaultLogtapeLogger = getLogger(
  flowbladeLogtapeDuckdbConfig.categories
);
