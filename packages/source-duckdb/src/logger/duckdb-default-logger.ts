import { getLogger } from '@logtape/logtape';

import { flowbladeLogtapeDuckdbConfig } from '../config/flowblade-logtape-duckdb.config';

export const duckdbDefaultLogger = getLogger(
  flowbladeLogtapeDuckdbConfig.categories
);
