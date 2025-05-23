import path from 'node:path';
import url from 'node:url';

import { apiLocalConfig } from '@/config/api-local.config';
import { generateOpenApiTypes } from '@/lib/generators/generate-open-api-types';

const basePath = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..'
);

export const catFactSchema = apiLocalConfig.openapiSchemaUrl;
export const generatedFile = `${basePath}/src/lib/openapi/local-api.types.generated.ts`;

await generateOpenApiTypes(catFactSchema, generatedFile);
