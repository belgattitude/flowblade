import * as v from 'valibot';

/**
 * Schema to parse openapi pipeDelimited style strings into string arrays.
 *
 * @todo request build-in support for @valibot/schema or zod 4.
 *
 * @see https://blog.scalar.com/p/an-introduction-to-openapi-variables
 */
export const vPipeDelimitedStringSchema = v.pipe(
  v.string(),
  v.transform((v): string[] => {
    if (typeof v !== 'string') {
      throw new TypeError(
        `Invalid value: ${typeof v === 'string' ? v : ''} (type: '${typeof v}'). Expected a string.`
      );
    }
    return v
      .split('|')
      .map((s) => s.trim())
      .filter((v) => v.length > 0);
  }),
  v.array(v.string()),
  v.metadata({
    description: 'String with multiple values separated by a pipe.',
  })
);

export const vCoercedStringArraySchema = v.pipe(
  v.unknown(),
  v.transform((v): string[] | undefined => {
    if (typeof v === 'string') {
      return v
        .split(',')
        .map((s) => s.trim())
        .filter((v) => v.length > 0);
    }
    throw new TypeError(
      `Invalid value: ${typeof v === 'string' ? v : ''} (type: '${typeof v}'). Expected a number or numeric string.`
    );
  }),
  v.optional(v.array(v.string()))
);
