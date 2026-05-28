import type { SelectQueryBuilder } from 'kysely';

type SqlTagInformation = {
  text: string;
  values: unknown[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const compileDuckQuery = <T extends SelectQueryBuilder<any, any, any>>(
  query: T
): SqlTagInformation => {
  const { sql, parameters } = query.compile();
  return {
    text: sql,
    values: parameters as unknown[],
  };
};
