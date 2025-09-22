import * as v from 'valibot';

/**
 * Schema to parse openapi pipeDelimited style strings into string arrays.
 *
 * @todo request built-in support for @valibot/schema or zod 4.
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
    description: 'Pipe delimited strings',
    example: 'string1|string2|string3',
  })
);
