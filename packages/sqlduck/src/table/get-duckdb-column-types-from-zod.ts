import {
  getTableCreateFromZod,
  type TableCreateFromZodResult,
} from './get-table-create-from-zod.ts';
import { Table } from './table.ts';
import type { TableSchemaZod } from './table-schema-zod.type.ts';

export type GetDuckdbColumnTypeFromZodParams<TSchema extends TableSchemaZod> = {
  schema: TSchema;
};

export type GetDuckdbColumnTypeFromZodResult<TSchema extends TableSchemaZod> =
  TableCreateFromZodResult<TSchema>['columnTypes'];

export const getDuckdbColumnTypesFromZod = <TSchema extends TableSchemaZod>(
  params: GetDuckdbColumnTypeFromZodParams<TSchema>
): GetDuckdbColumnTypeFromZodResult<TSchema> => {
  const { columnTypes } = getTableCreateFromZod({
    table: new Table('_unassigned'),
    schema: params.schema,
  });
  return columnTypes;
};
