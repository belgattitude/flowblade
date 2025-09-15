import * as v from 'valibot';

import { vPipeDelimitedStringSchema } from '@/lib/valibot/valibot-openapi-extras.ts';

describe('valibot extras', () => {
  describe('vPipeDelimitedStringSchema', () => {
    it('should parse pipe delimited strings into array of strings', () => {
      const result = v.parse(vPipeDelimitedStringSchema, 'apple|banana|cherry');
      expect(result).toStrictEqual(['apple', 'banana', 'cherry']);
    });

    it('should return the output type as string[]|undefined', () => {
      type Out = v.InferOutput<typeof vPipeDelimitedStringSchema>;
      expectTypeOf<Out>().toEqualTypeOf<string[]>();

      const optionalPipeDelimined = v.optional(vPipeDelimitedStringSchema);

      type OptionalOut = v.InferOutput<typeof optionalPipeDelimined>;
      expectTypeOf<OptionalOut>().toEqualTypeOf<string[] | undefined>();
    });
  });
});
