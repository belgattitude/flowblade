import os from 'node:os';

import prettyBytes from 'pretty-bytes';
import type { InferOutput } from 'valibot';
import * as v from 'valibot';

export const systemStatsSchema = v.object({
  totalMemory: v.number(),
  freeMemory: v.number(),
  availableParallelism: v.number(),
  prettyBytes: v.object({
    totalMemory: v.string(),
    freeMemory: v.string(),
  }),
});
type SystemStatsSchemaOutput = InferOutput<typeof systemStatsSchema>;

export const getSystemStats = async (): Promise<SystemStatsSchemaOutput> => {
  const freeMemory = os.freemem();
  const totalMemory = os.totalmem();
  return {
    totalMemory,
    freeMemory,
    availableParallelism: os.availableParallelism(),
    prettyBytes: {
      totalMemory: prettyBytes(totalMemory),
      freeMemory: prettyBytes(freeMemory),
    },
  };
};
