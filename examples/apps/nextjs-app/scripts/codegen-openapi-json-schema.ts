import fse from 'fs-extra';
import type { Hono } from 'hono';
import { generateSpecs } from 'hono-openapi';

import { honoApiConfig } from '@/server/config/hono-api.config';
import { honoApiSchemaConfig } from '@/server/config/hono-api-schema.config';

const getOpenapiSpecs = async (honoApp: Hono) => {
  return await generateSpecs(honoApp);
};

const openApiJsonFile = honoApiSchemaConfig.file;

// eslint-disable-next-line import-x/no-named-as-default-member
fse.outputFileSync(
  openApiJsonFile,
  JSON.stringify(await getOpenapiSpecs(honoApiConfig.app), null, 2),
  'utf8'
);
