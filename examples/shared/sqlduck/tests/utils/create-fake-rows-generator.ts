import { type Faker, faker } from '@faker-js/faker';
import type { ZodObject } from 'zod';
import type * as z from 'zod';

type FakerFactory<T> = {
  [K in keyof T]: T[K];
};

type Params<T extends ZodObject> = {
  schema: T;
  factory: (params: {
    faker: Faker;
    rowIdx: number;
    remaining: number;
    total: number;
  }) => FakerFactory<z.infer<T>>;
  count: number;
};

function* getFakeRowsGenerator<T extends ZodObject>(
  params: Params<T>
): Generator<FakerFactory<z.infer<T>>> {
  const { schema, factory, count } = params;
  let i = 0;
  while (count === undefined || i < count) {
    const row = {} as FakerFactory<z.infer<T>>;
    const generatedFakeRow = factory({
      rowIdx: i,
      faker: faker,
      remaining: count - i,
      total: count,
    });
    for (const key of Object.keys(schema.shape)) {
      (row as unknown as Record<string, unknown>)[key] = generatedFakeRow[key];
    }
    yield row;
    i++;
  }
}

/**
 * Create row generator based on zod schema with optional faker
 * integration
 *
 * @example
 * ```typescript
 * import * as z from 'zod';
 *
 * const userSchema = z.object({
 *   id: z.number()
 * });
 *
 * const rowsGen = createFakeRowsGenerator({
 *   count: 10,
 *   schema: userSchema,
 *   factory: (faker, rowIdx, size) => ({
 *     id: faker.number.int({ min: 1, max: 1_000_000 }),
 *   })
 * });
 *
 * // iterable
 * for (const row of rowsGen()) { };
 *
 * // get the first value
 * console.log(rowsGen().next().value);
 *
 * // toArray
 * await Array.fromAsync(rowsGen());
 * ```
 */
export function createFakeRowsGenerator<T extends ZodObject>(
  params: Params<T>
): () => Generator<FakerFactory<z.infer<T>>> {
  return () => getFakeRowsGenerator(params);
}

/**
 * Same as `createFakeRowsGenerator` but returns an async iterable iterator.
 * Useful when a consumer API expects an `AsyncIterableIterator`.
 *
 * @example
 * ```ts
 * const rowsGenAsync = createFakeRowsAsyncGenerator({
 *   count: 5,
 *   schema: userSchema,
 *   factory: ({ faker }) => ({ id: faker.number.int() })
 * });
 *
 * for await (const row of rowsGenAsync()) {
 *   // use row
 * }
 *
 * // Collect all
 * const rows = await Array.fromAsync(rowsGenAsync());
 * ```
 */
export function createFakeRowsAsyncGenerator<T extends ZodObject>(
  params: Params<T>
): () => AsyncIterableIterator<FakerFactory<z.infer<T>>> {
  async function* getAsync(): AsyncIterableIterator<FakerFactory<z.infer<T>>> {
    // Reuse the synchronous generator to produce values
    for (const row of getFakeRowsGenerator(params)) {
      // Yield on next microtask to behave asynchronously without delays
      await Promise.resolve();
      yield row;
    }
  }
  return () => getAsync();
}
