import knex, { type Knex } from "knex";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { KnexDatasource } from "./knex-datasource.ts";

let db: Knex;
let ds: KnexDatasource;

const countBrands = async (): Promise<number> => {
  const { data } = await ds.queryOrThrow(ds.queryBuilder("brand").select("id"));
  return data.length;
};

describe("KnexDatasource transactions", () => {
  beforeEach(async () => {
    db = knex({
      client: "better-sqlite3",
      connection: { filename: ":memory:" },
      useNullAsDefault: true,
      // a single connection: a query escaping its transaction would hang
      pool: { min: 1, max: 1 },
    });
    await db.raw(
      "create table brand (id integer primary key, name text not null unique)"
    );
    ds = new KnexDatasource({ connection: db });
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe("transaction", () => {
    it("should commit when the callback resolves", async () => {
      const { data, error, meta } = await ds.transaction(
        async (tx) => {
          await tx.queryOrThrow(tx.queryBuilder("brand").insert({ name: "a" }));
          await tx.queryOrThrow(tx.queryBuilder("brand").insert({ name: "b" }));
          return "done";
        },
        { name: "createBrands" }
      );
      expect(error).toBeUndefined();
      expect(data).toBe("done");
      expect(meta.name).toBe("createBrands");
      await expect(countBrands()).resolves.toBe(2);
    });

    it("should run the queries built with the parent builder in the transaction", async () => {
      const { error } = await ds.transaction(async (tx) => {
        // built with the datasource, not the transaction: must not deadlock
        // on the single connection and must be rolled back
        await tx.queryOrThrow(ds.queryBuilder("brand").insert({ name: "a" }));
        tx.rollback("nope");
      });
      expect(error?.code).toBe("ROLLED_BACK");
      await expect(countBrands()).resolves.toBe(0);
    });

    it("should read its own writes", async () => {
      const { data } = await ds.transactionOrThrow(async (tx) => {
        await tx.queryOrThrow(tx.queryBuilder("brand").insert({ name: "a" }));
        const { data: rows } = await tx.queryOrThrow(
          tx.queryBuilder("brand").select("name")
        );
        return rows as { name: string }[];
      });
      expect(data).toStrictEqual([{ name: "a" }]);
    });

    it("should roll back with tx.rollback()", async () => {
      const result = await ds.transaction(async (tx) => {
        await tx.queryOrThrow(tx.queryBuilder("brand").insert({ name: "a" }));
        return tx.rollback("changed my mind");
      });
      expect(result.error?.code).toBe("ROLLED_BACK");
      await expect(countBrands()).resolves.toBe(0);
    });

    it("should roll back when the callback throws", async () => {
      const result = await ds.transaction(async (tx) => {
        await tx.queryOrThrow(tx.queryBuilder("brand").insert({ name: "a" }));
        throw new Error("boom");
      });
      expect(result.error?.code).toBe("ROLLED_BACK");
      expect(result.error?.message).toContain("boom");
      expect(result.error?.cause).toStrictEqual(new Error("boom"));
      await expect(countBrands()).resolves.toBe(0);
    });

    it("should roll back when a query fails, even when the error is swallowed", async () => {
      const result = await ds.transaction(async (tx) => {
        await tx.queryOrThrow(tx.queryBuilder("brand").insert({ name: "a" }));
        // unique violation
        const failed = await tx.query(
          tx.queryBuilder("brand").insert({ name: "a" })
        );
        expect(failed.error?.code).toBe("QUERY_FAILED");
        return "ignored";
      });
      expect(result.error).toBeDefined();
      await expect(countBrands()).resolves.toBe(0);
    });

    it("should report the spans of the transaction queries in the meta", async () => {
      const { meta } = await ds.transactionOrThrow(async (tx) => {
        await tx.queryOrThrow(tx.queryBuilder("brand").insert({ name: "a" }), {
          name: "insert",
        });
      });
      expect(meta.getSpansByType("sql")).toHaveLength(1);
    });

    it("should throw from transactionOrThrow", async () => {
      await expect(
        ds.transactionOrThrow(async () => {
          throw new Error("boom");
        })
      ).rejects.toThrow(/.+/);
    });

    it("should not support nested transactions", async () => {
      const result = await ds.transaction(async (tx) => {
        const nested = tx as unknown as KnexDatasource;
        return await nested.transaction(async () => "nested");
      });
      expect(result.error).toBeUndefined();
      const inner = result.data as { error?: { message: string } };
      expect(inner.error?.message).toContain("Nested transactions");
    });

    it("should abort with the transaction signal", async () => {
      const controller = new AbortController();
      const result = await ds.transaction(
        async (tx) => {
          controller.abort(new Error("stop"));
          const { error } = await tx.query(
            tx.queryBuilder("brand").select("*")
          );
          return error?.code;
        },
        { signal: controller.signal }
      );
      expect(result.error?.code).toBe("ABORTED");
      await expect(countBrands()).resolves.toBe(0);
    });

    it("should not leak the connection after a failed transaction", async () => {
      for (let i = 0; i < 3; i++) {
        await ds.transaction(async () => {
          throw new Error("boom");
        });
      }
      await expect(countBrands()).resolves.toBe(0);
    });
  });

  describe("savepoint", () => {
    it("should keep the savepoint writes when it resolves", async () => {
      await ds.transactionOrThrow(async (tx) => {
        await tx.queryOrThrow(tx.queryBuilder("brand").insert({ name: "a" }));
        await tx.savepointOrThrow(async (sp) => {
          await sp.queryOrThrow(sp.queryBuilder("brand").insert({ name: "b" }));
        });
      });
      await expect(countBrands()).resolves.toBe(2);
    });

    it("should roll back to the savepoint and continue the transaction", async () => {
      const { error } = await ds.transaction(async (tx) => {
        await tx.queryOrThrow(tx.queryBuilder("brand").insert({ name: "a" }));
        const sp = await tx.savepoint(async (inner) => {
          await inner.queryOrThrow(
            inner.queryBuilder("brand").insert({ name: "b" })
          );
          throw new Error("savepoint boom");
        });
        expect(sp.error?.message).toContain("savepoint boom");
        await tx.queryOrThrow(tx.queryBuilder("brand").insert({ name: "c" }));
      });
      expect(error).toBeUndefined();
      const { data } = await ds.queryOrThrow(
        ds.queryBuilder("brand").select("name").orderBy("name")
      );
      expect(data).toStrictEqual([{ name: "a" }, { name: "c" }]);
    });

    it("should support nested savepoints", async () => {
      await ds.transactionOrThrow(async (tx) => {
        await tx.savepointOrThrow(async (sp1) => {
          await sp1.queryOrThrow(
            sp1.queryBuilder("brand").insert({ name: "a" })
          );
          await sp1.savepoint(async (sp2) => {
            await sp2.queryOrThrow(
              sp2.queryBuilder("brand").insert({ name: "b" })
            );
            sp2.rollback();
          });
        });
      });
      const { data } = await ds.queryOrThrow(
        ds.queryBuilder("brand").select("name")
      );
      expect(data).toStrictEqual([{ name: "a" }]);
    });

    it("should run the savepoint queries built with the transaction builder in the savepoint", async () => {
      await ds.transaction(async (tx) => {
        await tx.savepoint(async (sp) => {
          // built with the transaction, run in the savepoint: no deadlock
          await sp.queryOrThrow(tx.queryBuilder("brand").insert({ name: "a" }));
          sp.rollback();
        });
      });
      await expect(countBrands()).resolves.toBe(0);
    });
  });
});
