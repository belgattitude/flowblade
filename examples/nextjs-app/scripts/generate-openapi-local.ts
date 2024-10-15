import path from 'node:path';
import url from 'node:url';

import { apiLocalConfig } from '@/config/api-local.config';
import { generateOpenApiTypes } from '@/lib/generators/generate-open-api-types';

const basePath = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..'
);

export const catFactSchema = apiLocalConfig.schemaUrl;
export const generatedFile = `${basePath}/src/generated/openapi/local.types.ts`;

await generateOpenApiTypes(catFactSchema, generatedFile);
