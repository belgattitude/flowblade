import knex, { type Knex } from "knex";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { KnexDatasource } from "./knex-datasource.ts";

type Brand = { id: number; name: string };

let db: Knex;
let ds: KnexDatasource;

const createDb = async (): Promise<Knex> => {
  const instance = knex({
    client: "better-sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
    // a single connection: a query escaping its transaction would hang
    pool: { min: 1, max: 1 },
  });
  await instance.raw(
    "create table brand (id integer primary key, name text not null)"
  );
  await instance("brand").insert([{ name: "a" }, { name: "b" }, { name: "c" }]);
  return instance;
};

describe("KnexDatasource", () => {
  beforeEach(async () => {
    db = await createDb();
    ds = new KnexDatasource({ connection: db, logParams: true });
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe("query", () => {
    it("should return the rows and the meta of a select", async () => {
      const { data, error, meta } = await ds.query(
        ds.queryBuilder<Brand>("brand").select("id", "name").orderBy("id"),
        { name: "getBrands" }
      );
      expect(error).toBeUndefined();
      expect(data).toStrictEqual([
        { id: 1, name: "a" },
        { id: 2, name: "b" },
        { id: 3, name: "c" },
      ]);
      expect(meta.name).toBe("getBrands");
      const [span] = meta.getSpansByType("sql");
      expect(span?.sql).toBe(
        "select `id`, `name` from `brand` order by `id` asc"
      );
    });

    it("should wrap the row of first() in an array", async () => {
      const { data } = await ds.query(
        ds.queryBuilder<Brand>("brand").first().where("id", 2)
      );
      expect(data).toStrictEqual([{ id: 2, name: "b" }]);
    });

    it("should return no rows when first() doesn't match", async () => {
      const { data } = await ds.query(
        ds.queryBuilder<Brand>("brand").first().where("id", 99)
      );
      expect(data).toStrictEqual([]);
    });

    it("should report the affected rows of an update", async () => {
      const { data, meta } = await ds.query(
        ds.queryBuilder("brand").update({ name: "z" }).where("id", "<", 3)
      );
      expect(data).toStrictEqual([]);
      expect(meta.getSpansByType("sql")[0]?.affectedRows).toBe(2);
    });

    it("should return the rows of a returning clause", async () => {
      const { data } = await ds.query(
        ds.queryBuilder("brand").insert({ name: "d" }).returning("id")
      );
      expect(data).toStrictEqual([{ id: 4 }]);
    });

    it("should run raw queries (select and write)", async () => {
      const select = await ds.query<ReturnType<typeof db.raw>, Brand[]>(
        db.raw("select * from brand where id = ?", [1])
      );
      expect(select.data).toStrictEqual([{ id: 1, name: "a" }]);
      expect(select.meta.getSpansByType("sql")[0]?.params).toStrictEqual([1]);

      const write = await ds.query(
        db.raw("update brand set name = ? where id > ?", ["x", 1])
      );
      expect(write.data).toStrictEqual([]);
      expect(write.meta.getSpansByType("sql")[0]?.affectedRows).toBe(2);
    });

    it("should report a failing query without throwing", async () => {
      const { data, error, meta } = await ds.query(
        ds.queryBuilder("nope").select("*"),
        { name: "failing" }
      );
      expect(data).toBeUndefined();
      expect(error?.code).toBe("QUERY_FAILED");
      expect(error?.message).toContain("no such table: nope");
      expect(error?.cause).toBeInstanceOf(Error);
      expect(meta.name).toBe("failing");
      expect(meta.getSpansByType("sql")).toHaveLength(1);
    });

    it("should report an aborted query with the reason as cause", async () => {
      const reason = new Error("stop");
      const controller = new AbortController();
      const promise = ds.query(ds.queryBuilder("brand").select("*"), {
        signal: controller.signal,
      });
      controller.abort(reason);
      const { error } = await promise;
      expect(error?.code).toBe("ABORTED");
      expect(error?.cause).toBe(reason);
      // the connection is still usable once the ignored query settled
      const { data } = await ds.query(ds.queryBuilder("brand").select("id"));
      expect(data).toHaveLength(3);
    });

    it("should run the query once when a signal is given", async () => {
      // Knex builders run their query on each `then()`
      const { error } = await ds.query(
        ds.queryBuilder("brand").insert({ name: "once" }),
        { signal: new AbortController().signal }
      );
      expect(error).toBeUndefined();
      const { data } = await ds.queryOrThrow(
        ds.queryBuilder("brand").select("id").where("name", "once")
      );
      expect(data).toHaveLength(1);
    });

    it("should report an already aborted signal", async () => {
      const { error } = await ds.query(ds.queryBuilder("brand").select("*"), {
        signal: AbortSignal.abort(),
      });
      expect(error?.code).toBe("ABORTED");
    });
  });

  describe("queryOrThrow", () => {
    it("should return the rows", async () => {
      const { data } = await ds.queryOrThrow(
        ds.queryBuilder<Brand>("brand").select("name").orderBy("id")
      );
      expect(data).toStrictEqual([{ name: "a" }, { name: "b" }, { name: "c" }]);
    });

    it("should throw a failing query with its cause", async () => {
      await expect(
        ds.queryOrThrow(ds.queryBuilder("nope").select("*"))
      ).rejects.toThrow("no such table: nope");
    });

    it("should use the onError factory of the default options", async () => {
      const custom = new KnexDatasource({
        connection: db,
        defaultOptions: {
          queryOrThrow: { onError: () => new RangeError("custom") },
        },
      });
      await expect(
        custom.queryOrThrow(custom.queryBuilder("nope").select("*"))
      ).rejects.toThrow(RangeError);
    });
  });

  describe("queryOne / queryOneOrThrow", () => {
    it("should return the row", async () => {
      const { data, error } = await ds.queryOne(
        ds.queryBuilder<Brand>("brand").select("*").where("id", 1)
      );
      expect(error).toBeUndefined();
      expect(data).toStrictEqual({ id: 1, name: "a" });
    });

    it("should return null without row", async () => {
      const { data, error } = await ds.queryOne(
        ds.queryBuilder<Brand>("brand").select("*").where("id", 99)
      );
      expect(error).toBeUndefined();
      expect(data).toBeNull();
    });

    it("should report too many results", async () => {
      const { error } = await ds.queryOne(
        ds.queryBuilder<Brand>("brand").select("*")
      );
      expect(error?.code).toBe("TOO_MANY_RESULTS");
    });

    it("should throw without row or with too many rows", async () => {
      await expect(
        ds.queryOneOrThrow(
          ds.queryBuilder<Brand>("brand").select("*").where("id", 99)
        )
      ).rejects.toThrow(/.+/);
      await expect(
        ds.queryOneOrThrow(ds.queryBuilder<Brand>("brand").select("*"))
      ).rejects.toThrow(/.+/);
    });

    it("should return the row of queryOneOrThrow", async () => {
      const { data } = await ds.queryOneOrThrow(
        ds.queryBuilder<Brand>("brand").first().where("id", 3)
      );
      expect(data).toStrictEqual({ id: 3, name: "c" });
    });
  });

  describe("stream", () => {
    it("should stream the rows", async () => {
      const ids: number[] = [];
      for await (const row of ds.stream(
        ds.queryBuilder<Brand>("brand").select("id").orderBy("id")
      )) {
        ids.push(row.id);
      }
      expect(ids).toStrictEqual([1, 2, 3]);
    });

    it("should accept a chunkSize", async () => {
      const ids: number[] = [];
      for await (const row of ds.stream(
        ds.queryBuilder<Brand>("brand").select("id").orderBy("id"),
        { chunkSize: 1 }
      )) {
        ids.push(row.id);
      }
      expect(ids).toStrictEqual([1, 2, 3]);
    });

    it("should release the connection when leaving the loop early", async () => {
      for await (const row of ds.stream(
        ds.queryBuilder<Brand>("brand").select("id").orderBy("id")
      )) {
        expect(row.id).toBe(1);
        break;
      }
      // would hang (single connection pool) if the stream kept it
      const { data } = await ds.query(ds.queryBuilder("brand").select("id"));
      expect(data).toHaveLength(3);
    });

    it("should throw a failing query with its cause", async () => {
      const consume = async () => {
        for await (const _row of ds.stream(
          ds.queryBuilder("nope").select("*")
        )) {
          // nothing
        }
      };
      await expect(consume()).rejects.toThrow(/no such table: nope/);
    });

    it("should throw when the signal is already aborted", async () => {
      const consume = async () => {
        for await (const _row of ds.stream(
          ds.queryBuilder("brand").select("*"),
          {
            signal: AbortSignal.abort(new Error("stop")),
          }
        )) {
          // nothing
        }
      };
      await expect(consume()).rejects.toThrow(/stop/);
    });
  });

  describe("logParams", () => {
    it("should keep the params in the meta", async () => {
      const { meta } = await ds.query(
        ds.queryBuilder("brand").select("*").where("id", 2)
      );
      expect(meta.getSpansByType("sql")[0]?.params).toStrictEqual([2]);
    });
  });
});
