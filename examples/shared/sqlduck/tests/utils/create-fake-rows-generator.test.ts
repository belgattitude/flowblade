import * as z from 'zod';

import {
  createFakeRowsAsyncGenerator,
  createFakeRowsGenerator,
} from './create-fake-rows-generator';

describe('Generate fake data', () => {
  it('should generate fake data', async () => {
    const duckRegistry = z.registry<{
      duckdb: { type: 'VARCHAR' | 'INTEGER' | 'TIMESTAMP' };
    }>();

    const userSchema = z.object({
      id: z.number().register(duckRegistry, {
        duckdb: { type: 'INTEGER' },
      }),
      name: z.string().meta({
        duckdb: { type: 'VARCHAR' },
      }),
      email: z.email().meta({
        duckdb: { type: 'VARCHAR' },
      }),
      created_at: z.date().meta({
        duckdb: { type: 'TIMESTAMP' },
      }),
    });

    const firstRow = {
      id: 1,
      name: 'cool',
      email: 'test@example.com',
      created_at: new Date(),
    } satisfies z.infer<typeof userSchema>;

    const rowGenerator = createFakeRowsGenerator({
      schema: userSchema,
      factory: ({ faker, rowIdx }) => {
        if (rowIdx === 0) {
          return firstRow;
        }
        return {
          id: faker.number.int({ min: 1, max: 1_000_000 }),
          name: faker.person.fullName(),
          email: faker.internet.email(),
          created_at: faker.date.recent(),
        };
      },
      count: 5,
    });
    const rowGen = rowGenerator();
    expect(rowGen.next()).toStrictEqual({
      done: false,
      value: firstRow,
    });

    const rows = await Array.fromAsync(rowGenerator());
    expect(rows).toBeInstanceOf(Array);
    expect(rows.length).toBe(5);
  });

  it('should generate fake data with async generator', async () => {
    const duckRegistry = z.registry<{
      duckdb: { type: 'VARCHAR' | 'INTEGER' | 'TIMESTAMP' };
    }>();

    const userSchema = z.object({
      id: z.number().register(duckRegistry, {
        duckdb: { type: 'INTEGER' },
      }),
      name: z.string().meta({
        duckdb: { type: 'VARCHAR' },
      }),
      email: z.email().meta({
        duckdb: { type: 'VARCHAR' },
      }),
      created_at: z.date().meta({
        duckdb: { type: 'TIMESTAMP' },
      }),
    });

    const firstRow = {
      id: 1,
      name: 'cool',
      email: 'test@example.com',
      created_at: new Date(),
    } satisfies z.infer<typeof userSchema>;

    const rowsGenAsync = createFakeRowsAsyncGenerator({
      schema: userSchema,
      factory: ({ faker, rowIdx }) => {
        if (rowIdx === 0) {
          return firstRow;
        }
        return {
          id: faker.number.int({ min: 1, max: 1_000_000 }),
          name: faker.person.fullName(),
          email: faker.internet.email(),
          created_at: faker.date.recent(),
        };
      },
      count: 5,
    });

    // should be AsyncIterableIterator
    const asyncIter = rowsGenAsync();
    expect(typeof (asyncIter as any)[Symbol.asyncIterator]).toBe('function');

    // for-await iteration should yield firstRow first
    const received: z.infer<typeof userSchema>[] = [];
    for await (const row of rowsGenAsync()) {
      received.push(row);
      expect(() => userSchema.parse(row)).not.toThrow();
    }
    expect(received.length).toBe(5);
    expect(received[0]).toStrictEqual(firstRow);

    // Array.fromAsync should also work
    const rows = await Array.fromAsync(rowsGenAsync());
    expect(rows).toBeInstanceOf(Array);
    expect(rows.length).toBe(5);

    expect(rows[0]).toStrictEqual(firstRow);
  });
});
