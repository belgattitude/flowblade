import os from "node:os";

import prettyBytes from "pretty-bytes";
import type { InferOutput } from "valibot";
import * as v from "valibot";

export const systemStatsSchema = v.object({
  availableParallelism: v.number(),
  freeMemory: v.number(),
  prettyBytes: v.object({
    freeMemory: v.string(),
    totalMemory: v.string(),
  }),
  totalMemory: v.number(),
});
type SystemStatsSchemaOutput = InferOutput<typeof systemStatsSchema>;

export const getSystemStats = async (): Promise<SystemStatsSchemaOutput> => {
  const freeMemory = os.freemem();
  const totalMemory = os.totalmem();
  return {
    availableParallelism: os.availableParallelism(),
    freeMemory,
    prettyBytes: {
      freeMemory: prettyBytes(freeMemory),
      totalMemory: prettyBytes(totalMemory),
    },
    totalMemory,
  };
};
