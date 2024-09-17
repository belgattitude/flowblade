type Validator = {
  type: 'string';
  options: {
    minLength?: number;
    maxLength?: number;
  };
} & {
  type: 'number';
  options: {
    min?: number;
    max?: number;
  };
};

export type IColumnMeta = {
  type: 'string' | 'number' | 'boolean';
  header?: string;
  field?: string;
  nullable?: boolean | undefined;
  sortable?: boolean;
  filterable?: boolean;
  validators?: Validator[];
};
export type IColumnModel<TCol extends string | symbol | number = string> =
  Record<TCol, IColumnMeta>;
