/**
 * Fully qualified table information
 */
type FQTable = {
  name: string;
  schema?: string;
  database?: string;
};

export class Table {
  #fqTable: Readonly<FQTable>;

  get tableName(): string {
    return this.#fqTable.name;
  }
  get schemaName(): string | undefined {
    return this.#fqTable.schema;
  }
  get databaseName(): string | undefined {
    return this.#fqTable.database;
  }

  constructor(fqTableOrName: FQTable | string) {
    this.#fqTable =
      typeof fqTableOrName === 'string'
        ? { name: fqTableOrName }
        : fqTableOrName;
  }

  /**
   * Return fully qualified table name by concatenating
   * database, schema and table with a 'dot' separator.
   */
  getFullName = (options?: {
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
