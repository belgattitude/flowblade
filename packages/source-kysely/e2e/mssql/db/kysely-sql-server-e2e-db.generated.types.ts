import type { ColumnType } from 'kysely';
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Brand = {
  id: Generated<number>;
  name: string;
  flag_active: Generated<boolean>;
  created_at: Timestamp;
  updated_at: Timestamp | null;
};
export type Currency = {
  id: Generated<number>;
  code: string;
  numeric_code: number;
  name: string;
  name_plural: string | null;
  symbol: string | null;
  symbol_native: string | null;
  rounding: Generated<string | null>;
  display_decimals: Generated<number | null>;
  withdrawal_at: Timestamp | null;
  flag_active: Generated<boolean>;
  created_at: Timestamp;
  updated_at: Timestamp | null;
};
export type CurrencyI18n = {
  id: Generated<number>;
  currency_id: number;
  locale: string;
  name: string;
  name_plural: string | null;
  created_at: Timestamp;
  updated_at: Timestamp | null;
};
export type Locale = {
  id: Generated<number>;
  locale: string;
  name_native: string;
  flag_active: Generated<boolean>;
  created_at: Timestamp;
  updated_at: Timestamp | null;
};
export type Product = {
  id: Generated<number>;
  brand_id: number | null;
  reference: string;
  name: string;
  barcode_ean13: string;
  flag_active: Generated<boolean>;
  created_at: Timestamp;
  updated_at: Timestamp | null;
};
export type ProductI18n = {
  id: Generated<number>;
  product_id: number;
  locale: string;
  name: string;
  created_at: Timestamp;
  updated_at: Timestamp | null;
};
export type DB = {
  brand: Brand;
  currency: Currency;
  currency_i18n: CurrencyI18n;
  locale: Locale;
  product: Product;
  product_i18n: ProductI18n;
};
