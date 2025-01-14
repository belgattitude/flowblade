// eslint-disable-next-line import-x/no-extraneous-dependencies
import {
  bulk,
  default as sqlt,
  empty,
  join,
  raw,
  type RawValue,
} from 'sql-template-tag';

import type { SqlTag } from './types';

/**
 * Tagged Sql template literal function.
 *
 * @example
 * ```typescript
 * import { sql } from '@flowblade/sql-tag';
 *
 * const params = {
 *   ids: [1, 2, 3]
 * }
 *
 * const query = sql<{ id: number }>`
 *       SELECT id
 *       FROM products
 *       WHERE id IN ${sql.join(params.ids)}
 *     `;
 *
 * query.sql;       // 'SELECT id FROM products WHERE id IN (?, ?, ?)'
 * query.text;      // 'SELECT id FROM products WHERE id IN ($1, $2, $3)'
 * query.statement; // 'SELECT id FROM products WHERE id IN (:1, :2, :3)'
 * query.values;    // [1, 2, 3]
 * ```
 */

export const sql = Object.assign(
  <T = unknown>(
    sqlFragments: TemplateStringsArray,
    ...parameters: RawValue[]
  ): SqlTag<T[]> => {
    return sqlt(sqlFragments, ...parameters) as SqlTag<T[]>;
  },
  {
    /**
     * Placeholder value for an empty SQL string. Useful for conditionals and
     * equivalent to sql.raw("").
     *
     * @example
     * ```typescript
     * import { sql } from '@flowblade/sql-tag';
     *
     * const excludeDeleted = true;
     *
     * const query = sql<{ id: number }>`
     *       SELECT id
     *       FROM products
     *       WHERE id < 1000
     *       ${excludeDeleted ? sql`AND deleted_at is not null` : sql.empty}
     *     `;
     * ```
     */
    get empty(): SqlTag<null> {
      return empty as SqlTag<null>;
    },

    /**
     * Accepts an array of arrays, and returns the SQL with the values joined together in
     * a format useful for bulk inserts.
     *
     * @example
     * ```typescript
     * import { sql } from '@flowblade/sql-tag';
     *
     * const userNames = [
     *   ['Blake'],
     *   ['Bob'],
     *   ['Joe'],
     * ];
     *
     * const query = sql`
     *   INSERT INTO users (name) VALUES ${sql.bulk(userNames)}
     *   RETURNING *
     * `;
     *
     * query.sql; //=> "INSERT INTO users (name) VALUES (?),(?),(?)"
     * query.values; //=> ["Blake", "Bob", "Joe"]
     * ```
     */
    bulk<T = unknown>(
      data: readonly (readonly RawValue[])[],
      separator?: string,
      prefix?: string,
      suffix?: string
    ): SqlTag<T> {
      return bulk(data, separator, prefix, suffix) as SqlTag<T>;
    },
    /**
     * Accepts a string and returns a TaggedSql instance, useful if you want some part of the SQL
     * to be dynamic.
     *
     * ⚠️ Do not forget to sanitize user input to unsafeRaw to prevent SQL injection vulnerability.
     *
     * @example
     * ```typescript
     * import { sql } from '@flowblade/sql-tag';
     *
     * const query = sql.unsafeRaw(
     *   "SELECT * FROM products WHERE id = 1",
     * );
     * ```
     */
    unsafeRaw<T = unknown>(sql: string): SqlTag<T> {
      return raw(sql) as SqlTag<T>;
    },
    /**
     * Joins the array of values with an optional separator (default to ', ').
     *
     * @example
     * ```typescript
     * import { sql } from '@flowblade/sql-tag';
     *
     * const ids = [1, 2, 3];
     * const tenant = 'acme';
     * const organization = 'acme';
     *
     * const query = sql<{ id: number }>`
     *       SELECT id
     *       FROM products
     *       WHERE id in ${sql.join(ids)}
     *       AND ${sql.join([
     *         sql`tenant = ${tenant}`,
     *         sql`organization = ${organization}`
     *       ], 'AND')}
     *     `;
     * ```
     */
    join(
      array: readonly RawValue[],
      separator = ', ',
      prefix?: string,
      suffix?: string
    ): SqlTag<unknown> {
      return join(array, separator, prefix, suffix) as SqlTag<unknown>;
    },

    /**
     * Conditionally add a part of the SQL string.
     *
     * You can prefer using 'if' over the ternary operator for
     * better readability (when using prettier or biome)/
     *
     * ```typescript
     * const userIds: string[] = []; // Parameters
     *
     * const query = sql<>`
     *    SELECT id, username FROM users
     *    WHERE 1=1
     *    ${sql.if(
     *      params.ids.length > 0,
     *      () => sql`AND id IN (${sql.join(userIds.ids)})`  // 👈 "then" as second parameter
     *      () => sql.empty   // 👈 Optional 'else' as third parameter (default to sql.empty)
     *    )}
     *  `;
     * ```
     */
    if(
      condition: boolean,
      then: () => SqlTag<unknown>,
      otherwise: () => SqlTag<unknown> = () => sql.empty
    ): SqlTag<unknown> {
      return condition ? then() : otherwise();
    },
  }
);
