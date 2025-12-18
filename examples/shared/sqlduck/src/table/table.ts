/**
 * Fully qualified table information
 */
type FQTable = {
  /**
   * Table name
   */
  name: string;
  schema?: string;
  database?: string;
};

export class Table {
  #fqTable: FQTable;
  get fqTable(): FQTable {
    return this.#fqTable;
  }
  constructor(fqTableOrName: FQTable | string) {
    this.#fqTable =
      typeof fqTableOrName === 'string'
        ? { name: fqTableOrName }
        : fqTableOrName;
  }
  getFullyQualifiedTableName = (options?: {
    defaultDatabase?: string;
    defaultSchema?: string;
  }) => {
    const { defaultDatabase, defaultSchema } = options ?? {};
    const {
      name,
      database = defaultDatabase,
      schema = defaultSchema,
    } = this.#fqTable;
    return [database, schema, name].filter(Boolean).join('.');
  };
  withDatabase = (database: string) => {
    return new Table({
      ...this.#fqTable,
      database: database,
    });
  };
  withSchema = (schema: string) => {
    return new Table({
      ...this.#fqTable,
      schema: schema,
    });
  };
}
