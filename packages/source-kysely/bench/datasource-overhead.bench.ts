import {
  DummyDriver,
  Kysely,
  MssqlAdapter,
  MssqlIntrospector,
  MssqlQueryCompiler,
} from "kysely";
import { expect, test } from "vitest";

import { KyselyDatasource } from "../src";

type DB = {
  brand: {
    id: number;
    name: string;
  };
};

/**
 * Kysely with a driver that never hits a database, so the benchmark
 * only measures what KyselyDatasource adds (compile, spans, logging, QResult).
 */
const db = new Kysely<DB>({
  dialect: {
    createAdapter: () => new MssqlAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (kysely) => new MssqlIntrospector(kysely),
    createQueryCompiler: () => new MssqlQueryCompiler(),
  },
});

const ds = new KyselyDatasource({ connection: db });

test("KyselyDatasource.query overhead", async ({ bench }) => {
  const query = db
    .selectFrom("brand")
    .select(["id", "name"])
    .where("id", ">", 10)
    .orderBy("name");

  // Consume the results, the engine might eliminate unused code
  let rowCount = 0;

  await bench.compare(
    bench("kysely executeQuery (baseline)", async () => {
      const { rows } = await db.executeQuery(query.compile());
      rowCount += rows.length;
    }),
    bench("KyselyDatasource.query", async () => {
      const { data } = await ds.query(query);
      rowCount += data?.length ?? 0;
    }),
    { time: 500 }
  );

  // The dummy driver doesn't return rows, ensure the query didn't fail
  expect(rowCount).toBe(0);
  await expect(ds.query(query)).resolves.toMatchObject({ data: [] });
});
