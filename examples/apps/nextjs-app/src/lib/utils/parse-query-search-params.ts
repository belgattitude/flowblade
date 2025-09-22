import { assertNever } from '@httpx/assert';

export type SupportedSearchParamValues = string | number | boolean;
export type ExtendedQuerySearchParams = Record<
  string,
  string[] | undefined | SupportedSearchParamValues
>;
export type SupportedSearchParams = Record<string, SupportedSearchParamValues>;

/**
 * Convert query search params to a plain object of primitives.
 * - If a value is an array, it concatenates its items according to serializeArrayStyle.
 * - Undefined values are omitted.
 */
export const parseQuerySearchParams = (params: {
  searchParams: ExtendedQuerySearchParams;
  serializeArrayStyle: 'pipe-delimited' | 'comma-delimited' | 'repeat';
}): SupportedSearchParams => {
  const { searchParams, serializeArrayStyle } = params;
  const out: SupportedSearchParams = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue; // omit undefined

    if (Array.isArray(value)) {
      const items = value.filter((v) => v !== undefined).map(String);
      if (items.length === 0) continue;
      let joined: string;
      switch (serializeArrayStyle) {
        case 'pipe-delimited':
          joined = items.join('|');
          break;
        case 'comma-delimited':
          joined = items.join(',');
          break;
        case 'repeat':
          // Unable to represent repeated keys in a flat object; fallback to comma-delimited
          joined = items.join(',');
          break;
        default:
          assertNever(serializeArrayStyle);
      }
      out[key] = joined;
      continue;
    }

    out[key] = value;
  }

  return out;
};
