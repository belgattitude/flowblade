import * as v from 'valibot';

/**
 * Validate and coerce a numeric string into an int if it is not undefined.
 */
export const vCoercedIntSchema = v.pipe(
  v.unknown(),
  v.transform((v) => {
    if (v !== undefined) {
      if (typeof v === 'number') {
        return v;
      }
      if (typeof v === 'string') {
        const parsed = Number.parseInt(v, 10);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      throw new Error(
        `Invalid value: ${typeof v === 'string' ? v : ''} ('${typeof v})'`
      );
    }
  }),
  v.number()
);
