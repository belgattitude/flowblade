import type { ZodRecord } from 'zod';
import * as z from 'zod';

const columnSchema = z.object({
  name: z.string(),
  duckType: z.string(),
});

const tableSchema = z.object({
  table: z.string(),
  columns: z.array(columnSchema),
});

const a: z.infer<typeof tableSchema> = {
  table: 'cool',
  columns: [
    {
      name: 'duck',
      duckType: 'VARCHAR',
    },
  ],
};

export class TableCreator {
  createFromSchema = <T extends ZodRecord>(schema: T) => {
    return void 0;
  };
}
