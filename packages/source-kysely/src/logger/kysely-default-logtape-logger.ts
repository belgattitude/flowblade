import { getLogger } from '@logtape/logtape';

import { flowbladeLogtapeKyselyConfig } from '../config/flowblade-logtape-kysely.config';

export const kyselyDefaultLogtapeLogger = getLogger(
  flowbladeLogtapeKyselyConfig.categories
);
