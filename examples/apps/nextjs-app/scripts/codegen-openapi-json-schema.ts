import fs from 'node:fs';
import path from 'node:path';

import { generateSpecs } from 'hono-openapi';

import { honoApiConfig } from '@/server/config/hono-api.config';
import { honoApiSchemaConfig } from '@/server/config/hono-api-schema.config';

const content = await generateSpecs(honoApiConfig.app);

const openApiJsonFile = honoApiSchemaConfig.file;
const openApiJsonFileDir = path.dirname(openApiJsonFile);

if (!fs.existsSync(openApiJsonFileDir)) {
  fs.mkdirSync(openApiJsonFileDir, { recursive: true });
}

fs.writeFileSync(openApiJsonFile, JSON.stringify(content, null, 2), 'utf8');

console.log('Successfully generated OpenAPI JSON schema at:', openApiJsonFile);
