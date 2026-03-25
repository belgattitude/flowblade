import { getLogger } from '@logtape/logtape';

import { flowbladeLogtapeSqlduckConfig } from '../config/flowblade-logtape-sqlduck.config.ts';

export const sqlduckDefaultLogtapeLogger = getLogger(
  flowbladeLogtapeSqlduckConfig.categories
);
