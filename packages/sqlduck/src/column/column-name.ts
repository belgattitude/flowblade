import * as z from 'zod';
export const columnNameSchema = z.string();
export type ColumnName = z.infer<typeof columnNameSchema>;
