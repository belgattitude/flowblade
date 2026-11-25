import { QErrors } from "@flowblade/core";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type {
  KnexDatasource,
  KnexTransactionDatasource,
} from "../../../src/index.ts";

export type Stock = { id: number; name: string; quantity: number };

export type SharedE2eParams = {
  /** Datasource with a regular pool */
  ds: KnexDatasource;
  /** Datasource with a single connection (detects leaked connections) */
  singleConnectionDs: KnexDatasource;
  /** Sql that sleeps for the given seconds */
  sleepSql: (seconds: number) => string;
  /** Affected rows reported by a raw write (mssql: knex doesn't return it) */
  rawWriteAffectedRows: number;
};

const consume = async (rows: AsyncIterable<unknown>): Promise<void> => {
  for await (const _row of rows) {
    // nothing
  }
};

export const stockRows: Stock[] = [
  { id: 1, name: "a", quantity: 10 },
  { id: 2, name: "b", quantity: 10 },
  { id: 3, name: "c", quantity: 10 },
];

/**
 * Tests common to all the dialects, using dialect independent queries.
 * Expects a `stock (id, name, quantity)` table.
 */
export const defineSharedE2e = ({
  ds,
  singleConnectionDs,
  sleepSql,
  rawWriteAffectedRows,
}: SharedE2eParams): void => {
  const stock = (db: KnexDatasource | KnexTransactionDatasource = ds) =>
    db.queryBuilder<Stock>("stock");

  const getIds = async (): Promise<number[]> => {
    const { data } = await ds.queryOrThrow(stock().select("id").orderBy("id"));
    return data.map((row) => row.id);
  };

  beforeEach(async () => {
    await ds.queryOrThrow(stock().del());
    await ds.queryOrThrow(stock().insert(stockRows));
  });

  afterAll(async () => {
    await ds.getConnection().destroy();
    await singleConnectionDs.getConnection().destroy();
  });

  describe("query", () => {
    it("should select the rows", async () => {
      const { data, error, meta } = await ds.query(
        stock().select("id", "name", "quantity").orderBy("id"),
        { name: "getStock" }
      );
      expect(error).toBeUndefined();
      expect(data).toStrictEqual(stockRows);
      expect(meta.name).toBe("getStock");
      expect(meta.getSpansByType("sql")).toHaveLength(1);
    });

    it("should wrap the row of first()", async () => {
      const { data } = await ds.query(stock().first().where("id", 2));
      expect(data).toStrictEqual([{ id: 2, name: "b", quantity: 10 }]);
      const none = await ds.query(stock().first().where("id", 99));
      expect(none.data).toStrictEqual([]);
    });

    it("should return the rows of a returning clause", async () => {
      const { data } = await ds.query(
        stock().insert({ id: 4, name: "d", quantity: 1 }).returning("id")
      );
      expect(data).toStrictEqual([{ id: 4 }]);
    });

    it("should report the affected rows of an update and a delete", async () => {
      const update = await ds.query(
        stock().update({ quantity: 5 }).where("id", "<", 3)
      );
      expect(update.data).toStrictEqual([]);
      expect(update.meta.getSpansByType("sql")[0]?.affectedRows).toBe(2);

      const del = await ds.query(stock().del().where("id", ">", 1));
      expect(del.meta.getSpansByType("sql")[0]?.affectedRows).toBe(2);
      await expect(getIds()).resolves.toStrictEqual([1]);
    });

    it("should run raw queries (rows and affected rows)", async () => {
      const select = await ds.query<
        ReturnType<typeof ds.queryBuilder.raw>,
        Stock[]
      >(ds.queryBuilder.raw("select id, name from stock where id = ?", [2]));
      expect(select.error).toBeUndefined();
      expect(select.data).toStrictEqual([{ id: 2, name: "b" }]);
      expect(select.meta.getSpansByType("sql")[0]?.params).toStrictEqual([2]);

      const write = await ds.query(
        ds.queryBuilder.raw(
          "update stock set quantity = quantity + 1 where id > ?",
          [1]
        )
      );
      expect(write.error).toBeUndefined();
      expect(write.data).toStrictEqual([]);
      expect(write.meta.getSpansByType("sql")[0]?.affectedRows).toBe(
        rawWriteAffectedRows
      );
    });

    it("should report a failing query with the driver error as cause", async () => {
      // primary key violation
      const { data, error } = await ds.query(
        stock().insert({ id: 1, name: "dup", quantity: 1 })
      );
      expect(data).toBeUndefined();
      expect(error?.code).toBe("QUERY_FAILED");
      expect(error?.cause).toBeInstanceOf(Error);
      await expect(
        ds.queryOrThrow(stock().insert({ id: 1, name: "dup", quantity: 1 }))
      ).rejects.toThrow(QErrors.QueryFailed);
    });

    it("should return one row or null with queryOne", async () => {
      const found = await ds.queryOne(stock().select("*").where("id", 1));
      expect(found.data).toStrictEqual({ id: 1, name: "a", quantity: 10 });
      const none = await ds.queryOne(stock().select("*").where("id", 99));
      expect(none.data).toBeNull();
      const many = await ds.queryOne(stock().select("*"));
      expect(many.error?.code).toBe("TOO_MANY_RESULTS");
    });

    it("should abort a running query without leaking the connection", async () => {
      const start = Date.now();
      const { error } = await singleConnectionDs.query(
        singleConnectionDs.queryBuilder.raw(sleepSql(1)),
        { signal: AbortSignal.timeout(100) }
      );
      expect(error?.code).toBe("ABORTED");
      expect(Date.now() - start).toBeLessThan(900);
      // waits for the ignored query to end, then the connection is usable
      const { data } = await singleConnectionDs.queryOrThrow(
        singleConnectionDs.queryBuilder<Stock>("stock").select("id")
      );
      expect(data).toHaveLength(3);
    });
  });

  describe("stream", () => {
    it("should stream the rows", async () => {
      const ids: number[] = [];
      for await (const row of ds.stream(stock().select("id").orderBy("id"))) {
        ids.push(row.id);
      }
      expect(ids).toStrictEqual([1, 2, 3]);
    });

    it("should stream many rows with a chunkSize", async () => {
      const many = Array.from({ length: 2000 }, (_v, i) => {
        return { id: 1000 + i, name: `n${i}`, quantity: 1 };
      });
      for (let i = 0; i < many.length; i += 500) {
        await ds.queryOrThrow(stock().insert(many.slice(i, i + 500)));
      }
      let count = 0;
      for await (const _row of ds.stream(stock().select("id"), {
        chunkSize: 100,
      })) {
        count++;
      }
      expect(count).toBe(2003);
    });

    it("should release the connection when leaving the loop early", async () => {
      for await (const row of singleConnectionDs.stream(
        singleConnectionDs
          .queryBuilder<Stock>("stock")
          .select("id")
          .orderBy("id")
      )) {
        expect(row.id).toBe(1);
        break;
      }
      // would hang (single connection) if the stream kept the connection
      const { data } = await singleConnectionDs.queryOrThrow(
        singleConnectionDs.queryBuilder<Stock>("stock").select("id")
      );
      expect(data).toHaveLength(3);
    });

    it("should throw a failing stream", async () => {
      await expect(
        consume(ds.stream(ds.queryBuilder("nope").select("*")))
      ).rejects.toThrow(/nope/);
      // the connection was released
      await expect(getIds()).resolves.toStrictEqual([1, 2, 3]);
    });

    it("should stream in a transaction, seeing its uncommitted writes", async () => {
      const { data: ids } = await ds.transactionOrThrow(async (tx) => {
        await tx.queryOrThrow(
          stock(tx).insert({ id: 4, name: "d", quantity: 1 })
        );
        const rows: number[] = [];
        // built with the parent datasource, still streamed in the transaction
        for await (const row of tx.stream(stock().select("id").orderBy("id"))) {
          rows.push(row.id);
        }
        return rows;
      });
      expect(ids).toStrictEqual([1, 2, 3, 4]);
    });
  });

  describe("transaction", () => {
    it("should commit the queries", async () => {
      const { data, error, meta } = await ds.transaction(
        async (tx) => {
          await tx.queryOrThrow(
            stock(tx).insert({ id: 4, name: "d", quantity: 1 })
          );
          await tx.queryOrThrow(
            stock(tx).insert({ id: 5, name: "e", quantity: 1 })
          );
          return "done";
        },
        { name: "addStock" }
      );
      expect(error).toBeUndefined();
      expect(data).toBe("done");
      expect(meta.getSpans()[0]).toMatchObject({
        type: "transaction",
        status: "committed",
      });
      await expect(getIds()).resolves.toStrictEqual([1, 2, 3, 4, 5]);
    });

    it("should run the queries built with the parent builder in the transaction", async () => {
      const result = await ds.transaction(async (tx) => {
        await tx.queryOrThrow(
          stock().insert({ id: 4, name: "d", quantity: 1 })
        );
        tx.rollback("nope");
      });
      expect(result.error?.code).toBe("ROLLED_BACK");
      await expect(getIds()).resolves.toStrictEqual([1, 2, 3]);
    });

    it("should roll back when the callback throws", async () => {
      const result = await ds.transaction(async (tx) => {
        await tx.queryOrThrow(
          stock(tx).insert({ id: 4, name: "d", quantity: 1 })
        );
        throw new Error("boom");
      });
      expect(result.error?.code).toBe("ROLLED_BACK");
      await expect(getIds()).resolves.toStrictEqual([1, 2, 3]);
    });

    it("should not commit after a failed query handled by the callback", async () => {
      const result = await ds.transaction(async (tx) => {
        await tx.queryOrThrow(
          stock(tx).insert({ id: 4, name: "d", quantity: 1 })
        );
        const failed = await tx.query(
          stock(tx).insert({ id: 1, name: "dup", quantity: 1 })
        );
        expect(failed.error?.code).toBe("QUERY_FAILED");
      });
      expect(result.error).toBeDefined();
      await expect(getIds()).resolves.toStrictEqual([1, 2, 3]);
    });

    it("should roll back the savepoint only, the transaction goes on", async () => {
      const { error } = await ds.transaction(async (tx) => {
        await tx.queryOrThrow(
          stock(tx).insert({ id: 4, name: "d", quantity: 1 })
        );
        const sp = await tx.savepoint(async (inner) => {
          await inner.queryOrThrow(
            stock(inner).insert({ id: 5, name: "e", quantity: 1 })
          );
          inner.rollback("not needed");
        });
        expect(sp.error?.code).toBe("ROLLED_BACK");
        await tx.queryOrThrow(
          stock(tx).insert({ id: 6, name: "f", quantity: 1 })
        );
      });
      expect(error).toBeUndefined();
      await expect(getIds()).resolves.toStrictEqual([1, 2, 3, 4, 6]);
    });

    it("should release the savepoints, nested included", async () => {
      await ds.transactionOrThrow(async (tx) => {
        await tx.savepointOrThrow(async (sp1) => {
          await sp1.queryOrThrow(
            stock(sp1).insert({ id: 4, name: "d", quantity: 1 })
          );
          await sp1.savepointOrThrow(async (sp2) => {
            await sp2.queryOrThrow(
              stock(sp2).insert({ id: 5, name: "e", quantity: 1 })
            );
          });
        });
      });
      await expect(getIds()).resolves.toStrictEqual([1, 2, 3, 4, 5]);
    });

    it("should roll back the released savepoints with the transaction", async () => {
      const result = await ds.transaction(async (tx) => {
        await tx.savepointOrThrow(async (sp) => {
          await sp.queryOrThrow(
            stock(sp).insert({ id: 4, name: "d", quantity: 1 })
          );
        });
        tx.rollback();
      });
      expect(result.error?.code).toBe("ROLLED_BACK");
      await expect(getIds()).resolves.toStrictEqual([1, 2, 3]);
    });

    it("should abort a running transaction and roll it back", async () => {
      const result = await ds.transaction(
        async (tx) => {
          await tx.queryOrThrow(
            stock(tx).insert({ id: 4, name: "d", quantity: 1 })
          );
          await tx.queryOrThrow(tx.queryBuilder.raw(sleepSql(1)));
        },
        { signal: AbortSignal.timeout(200) }
      );
      expect(result.error?.code).toBe("ABORTED");
      expect(result.meta.getSpans()[0]).toMatchObject({
        status: "rolled back",
      });
      await expect(getIds()).resolves.toStrictEqual([1, 2, 3]);
    });

    it("should not leak connections after failed transactions", async () => {
      for (let i = 0; i < 3; i++) {
        await singleConnectionDs.transaction(async () => {
          throw new Error("boom");
        });
      }
      const { data } = await singleConnectionDs.queryOrThrow(
        singleConnectionDs.queryBuilder<Stock>("stock").select("id")
      );
      expect(data).toHaveLength(3);
    });
  });
};
