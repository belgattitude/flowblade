type DatabaseProperties = {
  alias: string;
};

export class Database {
  #params: DatabaseProperties;
  get alias() {
    return this.#params.alias;
  }
  constructor(params: DatabaseProperties) {
    this.#params = params;
  }
  toJson() {
    return {
      type: 'database',
      params: {
        alias: this.#params.alias,
      },
    };
  }
  [Symbol.toStringTag]() {
    return this.alias;
  }
}
