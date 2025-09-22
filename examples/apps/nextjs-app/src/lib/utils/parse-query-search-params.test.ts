import { describe, expect, it } from 'vitest';

import {
  type ExtendedQuerySearchParams,
  parseQuerySearchParams,
} from './parse-query-search-params';

describe('parseQuerySearchParams', () => {
  it('should omit undefined values', () => {
    const input: ExtendedQuerySearchParams = {
      a: undefined,
      b: 'ok',
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: 'comma-delimited',
    });
    expect(out).toEqual({ b: 'ok' });
  });

  it('should concat array values with comma when comma-delimited', () => {
    const input: ExtendedQuerySearchParams = {
      tags: ['a', 'b', 'c'],
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: 'comma-delimited',
    });
    expect(out).toEqual({ tags: 'a,b,c' });
  });

  it('should concat array values with pipe when pipe-delimited', () => {
    const input: ExtendedQuerySearchParams = {
      tags: ['a', 'b', 'c'],
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: 'pipe-delimited',
    });
    expect(out).toEqual({ tags: 'a|b|c' });
  });

  it('should fallback to comma when repeat is requested (cannot repeat in object)', () => {
    const input: ExtendedQuerySearchParams = {
      tags: ['x', 'y'],
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: 'repeat',
    });
    expect(out).toEqual({ tags: 'x,y' });
  });

  it('should coerce numbers and booleans in arrays to strings before joining', () => {
    const input: ExtendedQuerySearchParams = {
      mixed: [1 as unknown as string, true as unknown as string, 'z'],
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: 'comma-delimited',
    });
    expect(out).toEqual({ mixed: '1,true,z' });
  });

  it('should pass through non-array values', () => {
    const input: ExtendedQuerySearchParams = {
      foo: 'bar',
      num: 42 as unknown as string,
      bool: false as unknown as string,
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: 'comma-delimited',
    });
    expect(out).toEqual({ foo: 'bar', num: 42, bool: false });
  });

  it('should ignore undefined items inside arrays', () => {
    const input: ExtendedQuerySearchParams = {
      tags: ['a', undefined as unknown as string, 'b'],
    };
    const out = parseQuerySearchParams({
      searchParams: input,
      serializeArrayStyle: 'comma-delimited',
    });
    expect(out).toEqual({ tags: 'a,b' });
  });
});
