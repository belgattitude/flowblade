import type { Kysely } from 'kysely';

declare let global: {
  // eslint-disable-next-line @typescript-eslint/naming-convention,@typescript-eslint/no-explicit-any
  __HMR_SAFE_KYSELY_INSTANCES__: Map<string, Kysely<any>> | undefined;
};

/**
 * Allow to keep only one database instance when hot module replacement / fast-refresh
 * happens (only in development)
 */
export const getHmrSafeKyselyInstance = <T>(params: {
  name: string;
  factory: () => Kysely<T>;
}) => {
  const { name, factory } = params;
  if (process.env.NODE_ENV !== 'production') {
    global.__HMR_SAFE_KYSELY_INSTANCES__ ??= new Map<string, Kysely<unknown>>();
    if (!global.__HMR_SAFE_KYSELY_INSTANCES__.has(name)) {
      global.__HMR_SAFE_KYSELY_INSTANCES__.set(name, factory());
    }
    return global.__HMR_SAFE_KYSELY_INSTANCES__.get(name) as Kysely<T>;
  }
  return factory();
};
