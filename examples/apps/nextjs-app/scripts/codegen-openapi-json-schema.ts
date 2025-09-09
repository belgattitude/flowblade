import fse from 'fs-extra';
import { generateSpecs } from 'hono-openapi';

import { honoApiConfig } from '@/server/config/hono-api.config';
import { honoApiSchemaConfig } from '@/server/config/hono-api-schema.config';

const openApiJsonFile = honoApiSchemaConfig.file;

const content = await generateSpecs(honoApiConfig.app);

// eslint-disable-next-line import-x/no-named-as-default-member
fse.outputFileSync(openApiJsonFile, JSON.stringify(content, null, 2), 'utf8');

console.log('Successfully generated OpenAPI JSON schema at:', openApiJsonFile);
