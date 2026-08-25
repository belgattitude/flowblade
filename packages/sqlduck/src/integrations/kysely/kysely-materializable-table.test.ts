import { expectTypeOf } from "vitest";
import * as z from "zod";

import { createDummyKyselyDb } from "#/tests/utils/create-dummy-kysely-db.ts";

import { KyselyMaterializableTable } from "./kysely-materializable-table.ts";

type DB = {
  user: {
    id: number;
    name: string;
  };
};

describe("KyselyMaterializableTable", () => {
  it("should work", () => {
    const db = createDummyKyselyDb<DB>("postgresql");

    const query = db.selectFrom("user").select(["id", "name"]);

    const table = new KyselyMaterializableTable({
      sourceQuery: query,
      schema: z.strictObject({
        name: z.string(),
        id: z.number(),
      }),
    });

    expectTypeOf(table.getSourceQuery()).toEqualTypeOf<typeof query>();
  });
});
