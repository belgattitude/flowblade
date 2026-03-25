import * as z from 'zod';

const duckdbMaximumObjectNameLength = 120;
const duckDbObjectNameRegex = /^[a-z_]\w*$/i;

export const duckTableNameSchema = z
  .string()
  .min(1)
  .max(duckdbMaximumObjectNameLength)
  .regex(
    duckDbObjectNameRegex,
    'Table name must start with a letter or underscore, and contain only letters, numbers and underscores'
  );
export const duckTableAliasSchema = duckTableNameSchema;
