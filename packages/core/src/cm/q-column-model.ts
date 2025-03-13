const columnTypes = ['string', 'number', 'boolean'] as const;
type ColumnType = (typeof columnTypes)[number];

export interface QColumn {
  id: string;
  type: ColumnType;
  headerName?: string;
  fieldName?: string;
  description?: string;
}

export class QColumnModel {
  readonly #cm: Map<string, QColumn>;

  /**
   *
   * @throws Error if duplicate column
   */
  constructor(params?: { cols?: QColumn[] }) {
    const { cols = [] } = params ?? {};
    const cm = new Map<string, QColumn>();
    for (const col of cols) {
      if (cm.has(col.id)) {
        throw new Error(`Duplicate column id: ${col.id}`);
      }
      cm.set(col.id, col);
    }
    this.#cm = cm;
  }

  hasColumn = (col: QColumn): boolean => {
    return this.#cm.has(col.id);
  };

  getColumn = (colId: string): QColumn | null => {
    return this.#cm.get(colId) ?? null;
  };

  *[Symbol.iterator](): IterableIterator<QColumn> {
    for (const col of this.#cm) {
      yield col[1];
    }
  }
}
