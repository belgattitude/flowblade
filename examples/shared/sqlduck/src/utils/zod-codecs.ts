import * as z from 'zod';

export const zodCodecs = {
  dateToString: z.codec(
    z.date(), // input schema: ISO date string
    z.iso.datetime(), // output schema: Date object
    {
      decode: (date) => date.toISOString(), // Date → ISO string
      encode: (isoString) => new Date(isoString), // ISO string → Date
    }
  ),
  bigintToString: z.codec(
    z.bigint(),
    z.string().meta({
      format: 'int64',
    }),
    {
      decode: (bigint) => bigint.toString(),
      encode: BigInt,
    }
  ),
} as const;
