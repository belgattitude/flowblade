import { expectTypeOf, describe, it } from "vitest";
import * as z from "zod";

import { createDummyKyselyDb } from "#tests/utils/create-dummy-kysely-db.ts";

import { KyselyQueryWithZodSchema } from "./kysely-query-with-zod-schema.ts";

type DB = {
  user: {
    id: number;
    name: string;
  };
};

describe("KyselyQueryWithZodSchema", () => {
  it("should work", () => {
    const db = createDummyKyselyDb<DB>("postgresql");

    const query = db.selectFrom("user").select(["id", "name"]);

    const table = new KyselyQueryWithZodSchema({
      query,
      schema: z.strictObject({
        name: z.string(),
        id: z.number(),
      }),
    });

    expectTypeOf(table.getQuery()).toEqualTypeOf<typeof query>();
  });
});
