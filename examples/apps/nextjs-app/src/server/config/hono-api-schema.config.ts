import { fileURLToPath } from 'node:url';

export const honoApiSchemaConfig = {
  file: fileURLToPath(
    import.meta.resolve(
      '../lib/api/generated-openapi.referential.json',
      import.meta.url
    )
  ),
} as const;
