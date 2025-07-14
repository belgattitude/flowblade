import { toJsonSchema } from '@valibot/to-json-schema';
import * as v from 'valibot';
import { expectTypeOf } from 'vitest';

import {
  BigintString,
  type TaggedBigintString,
} from '@/lib/utils/bigint-string.ts';

const bigintsAsString = [
  '0',
  '12345678901234567890',
  '-12345678901234567890',
] as const;

describe('BigIntString', () => {
  const schema = BigintString.valibotSchema;
  describe('when strings are valid bigints', () => {
    describe('parsing', () => {
      it.each(bigintsAsString)(
        'should parse "%s" with valibot and brand the type',
        (value) => {
          const result = BigintString.parse(value);
          expect(result).toBe(value);
          expectTypeOf(result).toEqualTypeOf<TaggedBigintString>();
        }
      );
      it.each(bigintsAsString)(
        'should parse "%s" with BigIntString.parse and brand the type',
        (value) => {
          const result = v.parse(schema, value);
          expect(result).toBe(value);
          expectTypeOf(result).toEqualTypeOf<TaggedBigintString>();
        }
      );
    });
    describe('conversion to bigint', () => {
      it.each(bigintsAsString)(
        'should parse "%s" with BigIntString.parse and brand the type',
        (value) => {
          const brandedValue = BigintString.parse(value);
          const result = BigintString.toBigint(brandedValue);
          expect(result.toString(10)).toBe(value);
          expectTypeOf(result).toEqualTypeOf<bigint>();
        }
      );
    });
  });

  describe('when string does not contain valid bigints', () => {
    it('should throw a ValiError when using v.parse()', () => {
      expect(() => {
        v.parse(schema, 'invalid');
      }).toThrowError(
        String.raw`Invalid format: Expected /^-?\d+$/ but received "invalid"`
      );
    });
    it('should throw a TypeError when using BigIntString.parse()', () => {
      expect(() => {
        BigintString.parse('invalid');
      }).toThrowError(
        new TypeError(
          String.raw`Invalid format: Expected /^-?\d+$/ but received "invalid"`
        )
      );
    });
  });
  describe('fromBigint', () => {
    it('should return a bigint string from a bigint', () => {
      expect(BigintString.fromBigint(12_345_678_901_234_567_890n)).toBe(
        '12345678901234567890'
      );
    });
    it('should return a bigint string from a number', () => {
      expect(BigintString.fromBigint(12)).toBe('12');
    });
    it('should return a bigint string from a string', () => {
      expect(BigintString.fromBigint('12')).toBe('12');
    });
  });
  describe('toJsonSchema compatibility', () => {
    it('should not throw when converting to JSON schema', () => {
      const schema = toJsonSchema(BigintString.valibotSchema, {
        errorMode: 'ignore',
      });
      expect(schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        pattern: String.raw`^-?\d+$`,
        type: 'string',
      });
    });
  });
});
