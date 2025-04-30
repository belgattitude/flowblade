import * as v from 'valibot';

/**
 * Validate and coerce a numeric string into an int if it is not undefined.
 */
export const vCoercedIntSchema = v.pipe(
  v.unknown(),
  v.transform((v): number | undefined => {
    if (v !== undefined) {
      if (typeof v === 'number') {
        // Ensure we're dealing with integers, not floating point
        if (!Number.isInteger(v)) {
          throw new TypeError(`Value must be an integer, got: ${v}`);
        }
        return v;
      }
      if (typeof v === 'string') {
        const parsed = Number.parseInt(v, 10);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      throw new TypeError(
        `Invalid value: ${typeof v === 'string' ? v : ''} (type: '${typeof v}'). Expected a number or numeric string.`
      );
    }
    return;
  }),
  v.optional(v.number())
);
