import type { Streamable } from 'kysely';

export const isKyselyStreamable = <TData extends unknown[]>(
  v: unknown
): v is Streamable<TData> => {
  return (
    v !== null &&
    typeof v === 'object' &&
    'stream' in v &&
    typeof (v as { stream?: unknown })?.stream === 'function'
  );
};
