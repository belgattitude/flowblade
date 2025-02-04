import type { SqlTag } from '@flowblade/sql-tag';
import {
  format as sqlFormat,
  type FormatOptions,
  type SqlLanguage,
} from 'sql-formatter';

export type SqlFormatterOptions = Omit<FormatOptions, 'indentStyle'>;
export type SqlFormatterDialect = SqlLanguage;

type FormatParams = {
  /**
   * If not provided will default to the dialect provided in the constructor
   */
  dialect?: SqlFormatterDialect;
  /**
   * If not provided will default to the formatter options provided in the constructor
   */
  options?: Partial<SqlFormatterOptions>;
};

export class SqlFormatter {
  /**
   * SqlFormatter constructor
   *
   * @example
   * ```typescript
   * const sqlFormatter = new SqlFormatter('postgresql');
   *
   * // Alternatively, you can pass in options
   * // @see https://github.com/sql-formatter-org/sql-formatter/tree/master?tab=readme-ov-file#configuration-options
   *
   * const pgsqlFormatter = new SqlFormatter('postgresql', {
   *    keywordCase: 'preserve',
   *    identifierCase: 'preserve',
   *    dataTypeCase: 'preserve',
   *    functionCase: 'preserve',
   *    logicalOperatorNewline: 'before',
   *    expressionWidth: 50,
   *    linesBetweenQueries: 1,
   *    denseOperators: false,
   *    newlineBeforeSemicolon: false,
   *    useTabs: false,
   *    tabWidth: 2,
   * });
   *
   * try {
   *  const formatted = pgsqlFormatter.formatOrThrow(
   *     'SELECT * FROM table WHERE id = 1'
   *  );
   * } catch (e) {
   *   // Might throw something similar to: Parse error: Unexpected "[col] from" at line 1 column 8
   *   console.log('Error:', e);
   * }
   * ```
   */
  constructor(
    private dialect: SqlFormatterDialect,
    private formatterOptions?: SqlFormatterOptions
  ) {}

  /**
   * Format sql to string or return null if sql cannot be parsed
   *
   * @example
   * ```typescript
   * const sqlFormatter = new SqlFormatter('postgresql');
   *
   * const formatted = sqlFormatter.formatOrNull(
   *     'SELECT * FROM table WHERE id = 1'
   * );
   * ```
   *
   * @return string if sql can be parsed, null otherwise
   */
  formatOrNull = (
    sql: SqlTag<unknown> | string,
    params?: FormatParams
  ): string | null => {
    try {
      return this.formatOrThrow(sql, params);
    } catch {
      return null;
    }
  };

  /**
   * Format sql to string or throw an error if sql cannot be parsed
   *
   * @example
   * ```typescript
   * const sqlFormatter = new SqlFormatter('postgresql');
   *
   * try {
   *  const formatted = sqlFormatter.formatOrThrow(
   *     'SELECT * FROM table WHERE id = 1'
   *  );
   * } catch (e) {
   *   // Might throw something similat to: Parse error: Unexpected "[col] from" at line 1 column 8
   *   console.log('Error:', e);
   * }
   * ```
   *
   * @throws Error is sql cannot be parsed
   */
  formatOrThrow = (
    sql: SqlTag<unknown> | string,
    params?: FormatParams
  ): string => {
    const options = params?.options ?? this.formatterOptions;
    const sqlString = typeof sql === 'string' ? sql : sql.sql;
    return sqlFormat(sqlString, {
      language: params?.dialect ?? this.dialect,
      ...options,
    });
  };
}
