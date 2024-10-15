// @ts-ignore
import escape from 'regexp.escape';
const tableRegexp =
  // eslint-disable-next-line regexp/no-unused-capturing-group
  /^CREATE TABLE (?<tableName>([\w\-[\].]{1,200}))/i;

// node 20.18 bug - always recreate the regexp
const createConstraintRegexp = () =>
  // eslint-disable-next-line regexp/no-unused-capturing-group
  /CONSTRAINT \[(?<indexName>[\w\-[\]]{1,200})\] UNIQUE NONCLUSTERED \((?<keys>(.*))\),?\n?/gi;

export const fixSqlServerNullUniqueIndexes = (ddls: string[]): string[] => {
  const fixedDdls = [] as string[];
  const createIndex: string[] = [];

  for (const ddl of ddls) {
    const trimmed = ddl.trim();
    if (trimmed.startsWith('CREATE TABLE')) {
      const toRemove: string[] = [];
      const tableName = tableRegexp.exec(trimmed)?.groups?.tableName;
      if (tableName === undefined) {
        throw new TypeError(`Can't extract table name from '${trimmed}'`);
      }
      const constraintsMatches = trimmed.match(createConstraintRegexp());

      if (constraintsMatches !== null) {
        for (const match of constraintsMatches) {
          const groups = createConstraintRegexp().exec(match)?.groups;
          const { keys, indexName } = groups ?? {};
          if (keys === undefined || indexName === undefined) {
            throw new TypeError(`Can't extract keys from '${match}'`);
          }
          const isNullableColumn = (column: string): boolean => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            const escaped = escape(column.trim()) as string;
            return !new RegExp(`${escaped} .* NOT NULL`, 'gm').test(ddl);
          };
          const columns = keys.split(',');
          if (columns.some((element) => isNullableColumn(element))) {
            const cond = columns.map((c) => `${c} IS NOT NULL`).join(' AND ');
            createIndex.push(
              `CREATE UNIQUE NONCLUSTERED INDEX ${indexName}
              ON ${tableName} (${keys})
              WHERE ${cond}            
            `
            );
            toRemove.push(match);
          }
        }
      }
      let cleanedUp = trimmed;
      for (const line of toRemove) {
        cleanedUp = cleanedUp.replace(line, '');
      }
      fixedDdls.push(cleanedUp);
    } else {
      fixedDdls.push(trimmed);
    }
  }
  return [...fixedDdls, ...createIndex];
};
