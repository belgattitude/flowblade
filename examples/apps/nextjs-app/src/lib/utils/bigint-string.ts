import type { ValiError } from 'valibot';
import * as v from 'valibot';

const numericSignedRegex = /^-?\d+$/;

export type TaggedBigintString = string & v.Brand<'bigintString'>;

/**
 * @example
 * ```typescript
 * import * as v from 'valibot';
 *
 * const schema = {
 *   id: BigIntString.valibotSchema,
 * }
 * const { id } = v.parse(schema, {
 *   id: '12345678901234567890',
 * })
 *
 * // id is now typed as BigIntStringBrand,
 * // which is a string that represents a valid bigint
 * // string & v.Brand<'bigintString'>;
 *
 * You can use it to ensure that the string have been
 * validated before
 * ```
 */

export class BigintString {
  static readonly valibotSchema = v.pipe(
    v.string(),
    v.regex(numericSignedRegex),
    v.check((value) => {
      try {
        const num = BigInt(value);
        return num.toString() === value;
      } catch {
        return false;
      }
    }, 'The provided string is not a valid bigint'),
    v.brand('bigintString')
  );

  /**
   *
   * @throw TypeError if the value is not a valid bigint string
   */
  static parse = (
    value: string | number | bigint | null | undefined,
    /**
     * informational field name to include in the error message
     */
    fieldName?: string
  ): TaggedBigintString => {
    try {
      return v.parse(
        BigintString.valibotSchema,
        typeof value === 'number' ? value.toString(10) : value
      ) as TaggedBigintString;
    } catch (error) {
      const e = error as ValiError<typeof BigintString.valibotSchema>;
      throw new TypeError(`${fieldName ? `${fieldName}: ` : ''}${e.message}`);
    }
  };

  static parseOrDefault = <TReturn>(
    value: string | number | bigint | null | undefined,
    defaultValue: TReturn
  ): TaggedBigintString | TReturn => {
    try {
      return BigintString.parse(value);
    } catch {
      return defaultValue;
    }
  };

  // eslint-disable-next-line unicorn/prefer-native-coercion-functions
  static toBigint(value: TaggedBigintString): bigint {
    return BigInt(value);
  }

  static fromBigint(value: bigint | string | number): TaggedBigintString {
    if (typeof value === 'string') {
      return BigintString.parse(value);
    }
    return value.toString(10) as TaggedBigintString;
  }

  /**
   * Get the bigint value but typed as a number to circumvent limitations
   * of kysely-codegen for mssql that marks any bigint as number.
   */
  static toKyselyNumber(value: TaggedBigintString): number {
    return BigintString.toBigint(value) as unknown as number;
  }
}
