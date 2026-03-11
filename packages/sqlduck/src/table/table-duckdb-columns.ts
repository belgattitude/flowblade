import type { DuckdbColumnTypes } from './get-table-create-from-zod.ts';

class TableDuckdbColumns<TKeys extends string> {
  constructor(private readonly columnTypes: DuckdbColumnTypes<string>) {}
}
