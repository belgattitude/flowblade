import type { ZodObject } from 'zod';

export const getTableCreateFromZod = <T extends ZodObject>(
  table: string,
  schema: T
): string => {
  const json = schema.toJSONSchema({
    target: 'openapi-3.0',
  });
  const columns: string[] = [];
  if (json.properties === undefined) {
    throw new TypeError('Schema must have at least one property');
  }
  for (const [columnName, def] of Object.entries(json.properties)) {
    const { type, nullable, format, primaryKey } = def as {
      type: 'number' | 'string';
      nullable: boolean | undefined;
      format: 'date-time' | 'int64' | undefined;
      primaryKey: boolean | undefined;
    };
    const colDDL: string[] = [`${columnName}`];
    switch (type) {
      case 'string':
        switch (format) {
          case 'date-time':
            colDDL.push(`TIMESTAMP`);
            break;
          case 'int64':
            colDDL.push(`BIGINT`);
            break;
          default:
            colDDL.push(`VARCHAR`);
        }
        break;
      case 'number':
        colDDL.push(`INTEGER`);
        break;
      default:
        throw new Error('Not a supported type');
    }
    if (primaryKey === true) {
      colDDL.push(`PRIMARY KEY`);
    } else if (nullable !== false) {
      colDDL.push('NOT NULL');
    }
    columns.push(colDDL.join(' '));
  }
  return [
    `CREATE OR REPLACE TABLE ${table} (\n`,
    columns.map((v) => `  ${v}`).join(',\n'),
    '\n)',
  ].join('');
};
