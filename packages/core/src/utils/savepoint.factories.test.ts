import { describe, expect, vi, it } from "vitest";

import { QErrors } from "../index";
import type { QResult } from "../query-result/q-result";
import type { QError } from "../query-result/types";
import { createSqlSpan, getDataOrThrow } from "./datasource.factories";
import {
  runSavepoint,
  runTransaction,
  type TransactionBeginContext,
} from "./transaction.factories";

type FakeTx = {
  query: (sql: string) => Promise<void>;
  /**
   * A failed query, not thrown (ie: `tx.query()`)
   */
  failedQuery: (sql: string, error: Error) => void;
  savepoint: <T>(
    fn: (sp: FakeTx) => Promise<T>,
    options?: { name?: string }
  ) => Promise<QResult<T, QError>>;
};

const isConflictError = (error: unknown) =>
  (error as { code?: unknown }).code === "40001";

/**
 * A fake transaction recording the statements, savepoints included.
 */
const createDriver = (
  failOn: Partial<Record<"savepoint" | "rollbackTo" | "release", Error>> = {}
) => {
  const calls: string[] = [];
  let counter = 0;
  const step = async (call: string, failure?: Error) => {
    calls.push(call);
    if (failure !== undefined) {
      throw failure;
    }
  };
  const createTx = (context: TransactionBeginContext): FakeTx => {
    return {
      query: (sql) =>
        context.trackQuery(
          (async () => {
            context.assertActive();
            await Promise.resolve();
            calls.push(sql);
            context.addSpan(createSqlSpan({ sql, params: [], timeMs: 1 }));
          })()
        ),
      failedQuery: (sql, error) => {
        calls.push(sql);
        context.addSpan(createSqlSpan({ sql, params: [] }));
        context.onQueryFailed(error);
      },
      savepoint: (fn, options) => {
        counter++;
        const spName = `sp_${counter}`;
        return runSavepoint({
          context,
          name: spName,
          options,
          begin: async (spContext) => {
            await step(`SAVEPOINT ${spName}`, failOn.savepoint);
            return createTx(spContext);
          },
          rollback: () => step(`ROLLBACK TO ${spName}`, failOn.rollbackTo),
          release: () => step(`RELEASE ${spName}`, failOn.release),
          fn,
        });
      },
    };
  };
  const run = <TData>(
    fn: (tx: FakeTx) => Promise<TData>,
    options?: Parameters<typeof runTransaction>[0]["options"]
  ) =>
    runTransaction<FakeTx, TData>({
      fn,
      options,
      isConflictError,
      begin: async (context) => {
        calls.push("BEGIN");
        return createTx(context);
      },
      commit: async () => {
        calls.push("COMMIT");
      },
      rollback: async () => {
        calls.push("ROLLBACK");
      },
    });
  return { calls, run };
};

describe(runSavepoint, () => {
  it("should release the savepoint and commit", async () => {
    const { calls, run } = createDriver();
    let savepointResult: QResult<number, QError> | undefined;
    const result = await run(async (tx) => {
      await tx.query("INSERT 1");
      savepointResult = await tx.savepoint(
        async (sp) => {
          await sp.query("INSERT 2");
          return 2;
        },
        { name: "tags" }
      );
      await tx.query("INSERT 3");
    });
    expect(result.error).toBeUndefined();
    expect(calls).toStrictEqual([
      "BEGIN",
      "INSERT 1",
      "SAVEPOINT sp_1",
      "INSERT 2",
      "RELEASE sp_1",
      "INSERT 3",
      "COMMIT",
    ]);
    expect(savepointResult?.data).toBe(2);
    expect(savepointResult?.meta.name).toBe("tags");
    expect(savepointResult?.meta.getSpans().map((s) => s.type)).toStrictEqual([
      "savepoint",
      "sql",
    ]);
    expect(savepointResult?.meta.getSpans()[0]).toMatchObject({
      type: "savepoint",
      name: "tags",
      status: "released",
    });
    // the transaction meta gets the savepoint queries and span
    expect(result.meta.getSpans().map((s) => s.type)).toStrictEqual([
      "transaction",
      "sql",
      "sql",
      "savepoint",
      "sql",
    ]);
  });

  it("should roll back the savepoint only when the callback throws", async () => {
    const { calls, run } = createDriver();
    const thrown = new Error("duplicate");
    let savepointResult: QResult<unknown, QError> | undefined;
    const result = await run(async (tx) => {
      await tx.query("INSERT 1");
      savepointResult = await tx.savepoint(async (sp) => {
        await sp.query("INSERT 2");
        throw thrown;
      });
      await tx.query("INSERT 3");
    });
    expect(result.error).toBeUndefined();
    expect(calls).toStrictEqual([
      "BEGIN",
      "INSERT 1",
      "SAVEPOINT sp_1",
      "INSERT 2",
      "ROLLBACK TO sp_1",
      "INSERT 3",
      "COMMIT",
    ]);
    expect(savepointResult?.error).toMatchObject({
      message: "duplicate",
      code: "ROLLED_BACK",
      cause: thrown,
    });
    expect(savepointResult?.error).toBeInstanceOf(QErrors.RolledBack);
    expect(savepointResult?.meta.getSpans()[0]).toMatchObject({
      status: "rolled back",
    });
  });

  it("should roll back the savepoint only after a handled failed query", async () => {
    const { calls, run } = createDriver();
    const queryError = new Error("duplicate key");
    let savepointResult: QResult<unknown, QError> | undefined;
    const result = await run(async (tx) => {
      savepointResult = await tx.savepoint(async (sp) => {
        sp.failedQuery("INSERT 1", queryError);
      });
      await tx.query("INSERT 2");
    });
    // the failed query doesn't prevent the transaction commit
    expect(result.error).toBeUndefined();
    expect(calls).toStrictEqual([
      "BEGIN",
      "SAVEPOINT sp_1",
      "INSERT 1",
      "ROLLBACK TO sp_1",
      "INSERT 2",
      "COMMIT",
    ]);
    expect(savepointResult?.error).toMatchObject({
      message:
        "A query failed in the savepoint, it was rolled back: duplicate key",
      code: "TRANSACTION_FAILED",
      cause: queryError,
    });
    expect(savepointResult?.error).toBeInstanceOf(QErrors.TransactionFailed);
  });

  it("should release after a handled failed query with onFailedQuery commit", async () => {
    const { calls, run } = createDriver();
    const result = await run(
      async (tx) => {
        const sp = await tx.savepoint(async (inner) => {
          inner.failedQuery("INSERT 1", new Error("duplicate key"));
          return 1;
        });
        return sp.data;
      },
      { onFailedQuery: "commit" }
    );
    expect(result.data).toBe(1);
    expect(calls).toStrictEqual([
      "BEGIN",
      "SAVEPOINT sp_1",
      "INSERT 1",
      "RELEASE sp_1",
      "COMMIT",
    ]);
  });

  it("should fail the transaction on conflict", async () => {
    const { calls, run } = createDriver();
    const conflictError = Object.assign(new Error("could not serialize"), {
      code: "40001",
    });
    let savepointResult: QResult<unknown, QError> | undefined;
    const result = await run(async (tx) => {
      savepointResult = await tx.savepoint(async (sp) => {
        sp.failedQuery("UPDATE 1", conflictError);
      });
    });
    expect(savepointResult?.error).toMatchObject({
      code: "TRANSACTION_CONFLICT",
      cause: conflictError,
    });
    expect(savepointResult?.error).toBeInstanceOf(QErrors.TransactionConflict);
    // to be retried as a whole
    expect(result.error).toMatchObject({
      code: "TRANSACTION_CONFLICT",
      cause: conflictError,
    });
    expect(result.error).toBeInstanceOf(QErrors.TransactionConflict);
    expect(calls).not.toContain("COMMIT");
  });

  it.each([
    ["savepoint", "SAVEPOINT sp_1"],
    ["release", "RELEASE sp_1"],
  ] as const)(
    "should fail the transaction when the %s statement fails",
    async (statement, call) => {
      const failure = new Error(`${statement} failed`);
      const { calls, run } = createDriver({ [statement]: failure });
      let savepointResult: QResult<unknown, QError> | undefined;
      const result = await run(async (tx) => {
        savepointResult = await tx.savepoint(async () => 1);
      });
      expect(calls).toContain(call);
      expect(savepointResult?.error).toMatchObject({
        code: "TRANSACTION_FAILED",
        cause: failure,
      });
      expect(savepointResult?.error).toBeInstanceOf(QErrors.TransactionFailed);
      expect(savepointResult?.meta.getSpans()[0]).toMatchObject({
        status: "failed",
      });
      expect(result.error?.code).toBe("TRANSACTION_FAILED");
      expect(calls.at(-1)).toBe("ROLLBACK");
    }
  );

  it("should fail the transaction when rolling back to the savepoint fails", async () => {
    const failure = new Error("rollback to failed");
    const { run } = createDriver({ rollbackTo: failure });
    let savepointResult: QResult<unknown, QError> | undefined;
    const result = await run(async (tx) => {
      savepointResult = await tx.savepoint(() =>
        Promise.reject(new Error("thrown"))
      );
    });
    expect(savepointResult?.error?.code).toBe("TRANSACTION_FAILED");
    expect(savepointResult?.error?.message).toBe(
      "Rollback to savepoint failed: rollback to failed"
    );
    expect(result.error?.code).toBe("TRANSACTION_FAILED");
  });

  it("should support nested savepoints", async () => {
    const { calls, run } = createDriver();
    const result = await run(async (tx) => {
      await tx.savepoint(async (outer) => {
        await outer.query("INSERT 1");
        await outer.savepoint(async (inner) => {
          await inner.query("INSERT 2");
          throw new Error("inner fails");
        });
        await outer.query("INSERT 3");
      });
    });
    expect(result.error).toBeUndefined();
    expect(calls).toStrictEqual([
      "BEGIN",
      "SAVEPOINT sp_1",
      "INSERT 1",
      "SAVEPOINT sp_2",
      "INSERT 2",
      "ROLLBACK TO sp_2",
      "INSERT 3",
      "RELEASE sp_1",
      "COMMIT",
    ]);
  });

  it("should reject a savepoint datasource used after its callback", async () => {
    const { run } = createDriver();
    let kept: FakeTx | undefined;
    const result = await run(async (tx) => {
      await tx.savepoint(async (sp) => {
        kept = sp;
      });
      await expect(kept?.query("INSERT 1")).rejects.toThrow(
        "The transaction has ended"
      );
    });
    expect(result.error).toBeUndefined();
  });

  it("should fail when the transaction has ended", async () => {
    const { calls, run } = createDriver();
    let kept: FakeTx | undefined;
    await run(async (tx) => {
      kept = tx;
    });
    const savepointResult = await kept?.savepoint(async () => 1);
    expect(savepointResult?.error?.code).toBe("TRANSACTION_FAILED");
    expect(savepointResult?.error?.message).toContain(
      "The transaction has ended"
    );
    expect(calls).not.toContain("SAVEPOINT sp_1");
  });

  it("should wait for the queries not awaited in the savepoint", async () => {
    const { calls, run } = createDriver();
    await run(async (tx) => {
      await tx.savepoint(async (sp) => {
        void sp.query("INSERT 1");
      });
    });
    expect(calls).toStrictEqual([
      "BEGIN",
      "SAVEPOINT sp_1",
      "INSERT 1",
      "RELEASE sp_1",
      "COMMIT",
    ]);
  });

  it("should throw the callback error with getDataOrThrow", async () => {
    const { run } = createDriver();
    const thrown = new Error("thrown");
    await run(async (tx) => {
      const savepointResult = await tx.savepoint(() => Promise.reject(thrown));
      expect(() => getDataOrThrow(savepointResult)).toThrow(thrown);
      const onError = vi.fn<() => Error>(() => new Error("custom"));
      expect(() => getDataOrThrow(savepointResult, { onError })).toThrow(
        "custom"
      );
    });
  });
});
