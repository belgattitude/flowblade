import * as z from 'zod';

export const zodCodecs = {
  dateToString: z.codec(
    z.date(), // input schema: Date object
    z.iso.datetime(), // output schema: ISO date string
    {
      decode: (date) => date.toISOString(),
      encode: (isoString) => new Date(isoString),
    }
  ),
  bigintToString: z.codec(
    z.bigint(), // input schema
    z.string().meta({
      format: 'int64',
    }),
    {
      decode: (bigint) => bigint.toString(),
      encode: BigInt,
    }
  ),
} as const;
