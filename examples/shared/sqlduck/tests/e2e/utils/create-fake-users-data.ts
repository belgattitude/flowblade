import { faker } from '@faker-js/faker';
import type { ZodObject } from 'zod';
import * as z from 'zod';

type Schema<T> = {
  [K in keyof T]: () => T[K];
};

export function* generateRows<T extends Record<string, unknown>>(
  schema: Schema<T>,
  count?: number
): Generator<T, void, unknown> {
  let i = 0;
  while (count === undefined || i < count) {
    const row = {} as T;
    for (const key of Object.keys(schema) as (keyof T)[]) {
      row[key] = schema[key]();
    }
    yield row;
    i++;
  }
}

const duckRegistry = z.registry<{
  duckdb: { type: 'VARCHAR' | 'INTEGER' | 'TIMESTAMP' };
}>();

const userSchema2 = z.object({
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

type User2 = z.infer<typeof userSchema2>;

export const getSchemaMetadata = <T extends ZodObject>(schema: T) => {
  return schema.meta();
};

const meta = getSchemaMetadata(userSchema2);

const userSchema: Schema<User2> = {
  id: () => faker.number.int({ min: 1, max: 1_000_000 }),
  name: () => faker.person.fullName(),
  email: () => faker.internet.email(),
  created_at: () => faker.date.recent(),
};

// Produce 5 users:
for (const user of generateRows(userSchema, 5)) {
  console.log(user);
}

// Or consume lazily (infinite generator - make sure to break):
const it = generateRows(userSchema);
console.log(it.next().value); // first user
console.log(it.next().value); // second user
