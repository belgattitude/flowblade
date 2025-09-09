export const honoApiSchemaConfig = {
  file: new URL(
    import.meta.resolve(
      '../lib/api/generated-openapi.referential.json',
      import.meta.url
    )
  ).pathname,
} as const;
