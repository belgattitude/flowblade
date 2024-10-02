import path from 'node:path';
import url from 'node:url';

import { apiCatfactConfig } from '@/config/api-catfact.config';
import { generateOpenApiTypes } from '@/lib/generators/generate-open-api-types';

const basePath = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..'
);

export const catFactSchema = apiCatfactConfig.schemaUrl;
export const generatedFile = `${basePath}/src/generated/openapi/openapi-catfact.types.ts`;

await generateOpenApiTypes(catFactSchema, generatedFile);
