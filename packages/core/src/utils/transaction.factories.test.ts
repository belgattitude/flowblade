import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { QErrors } from "../index";
import type { QMetaSqlSpan } from "../meta/q-meta";
import { createSqlSpan, getDataOrThrow } from "./datasource.factories";
import { runTransaction } from "./transaction.factories";

type FakeTx = {
  query: (sql: string) => Promise<void>;
  /**
   * A failed query, not thrown (ie: `tx.query()`)
   */
  failedQuery: (sql: string, error: Error) => void;
  rollback: (reason?: string) => never;
};

const createDriver = (
  overrides: {
    begin?: () => Promise<void>;
    commit?: () => Promise<void>;
    rollback?: () => Promise<void>;
  } = {}
) => {
  const calls: string[] = [];
  const driver = {
    calls,
    begin: vi.fn<() => Promise<void>>(async () => {
      calls.push("begin");
      await overrides.begin?.();
    }),
    commit: vi.fn<() => Promise<void>>(async () => {
      calls.push("commit");
      await overrides.commit?.();
    }),
    rollback: vi.fn<() => Promise<void>>(async () => {
      calls.push("rollback");
      await overrides.rollback?.();
    }),
  };
  const run = <TData>(
    fn: (tx: FakeTx) => Promise<TData>,
    options?: Parameters<typeof runTransaction>[0]["options"]
  ) =>
    runTransaction<FakeTx, TData>({
      fn,
      options,
      begin: async ({ addSpan, onQueryFailed }) => {
        await driver.begin();
        return {
          failedQuery: (sql, error) => {
            calls.push(sql);
            addSpan(createSqlSpan({ sql, params: [] }));
            onQueryFailed(error);
          },
          query: async (sql) => {
            calls.push(sql);
            addSpan(createSqlSpan({ sql, params: [], timeMs: 1 }));
          },
          rollback: (reason) => {
            throw new QErrors.RolledBack(reason);
          },
        };
      },
      commit: () => driver.commit(),
      rollback: () => driver.rollback(),
    });
  return { driver, run };
};

describe(runTransaction, () => {
  it("should commit and return the callback value", async () => {
    const { driver, run } = createDriver();
    const result = await run(
      async (tx) => {
        await tx.query("INSERT 1");
        await tx.query("INSERT 2");
        return { id: 1 };
      },
      { name: "createOrder", isolationLevel: "serializable" }
    );
    expect(driver.calls).toStrictEqual([
      "begin",
      "INSERT 1",
      "INSERT 2",
      "commit",
    ]);
    expect(result.error).toBeUndefined();
    expect(result.data).toStrictEqual({ id: 1 });
    expectTypeOf(result.data).toEqualTypeOf<{ id: number } | undefined>();
    expect(result.meta.name).toBe("createOrder");
    const [txSpan, ...querySpans] = result.meta.getSpans();
    expect(txSpan).toMatchObject({
      type: "transaction",
      status: "committed",
      isolationLevel: "serializable",
    });
    expect(txSpan).not.toHaveProperty("accessMode");
    expect(querySpans.map((span) => (span as QMetaSqlSpan).sql)).toStrictEqual([
      "INSERT 1",
      "INSERT 2",
    ]);
  });

  it("should default the name to anonymous and support void callbacks", async () => {
    const { run } = createDriver();
    const result = await run(async () => {});
    expect(result.error).toBeUndefined();
    expect(result.isOk()).toBe(true);
    expect(result.meta.name).toBe("anonymous");
  });

  it("should keep the many shape for array data", async () => {
    const { run } = createDriver();
    const result = await run(async () => [{ id: 1 }, { id: 2 }]);
    const { data } = result.map((row) => {
      return { key: `k${row.id}` };
    });
    expect(data).toStrictEqual([{ key: "k1" }, { key: "k2" }]);
  });

  it("should roll back with a ROLLED_BACK error when the callback throws", async () => {
    const { driver, run } = createDriver();
    const thrown = new QErrors.QueryFailed("constraint violation");
    const result = await run(async (tx) => {
      await tx.query("INSERT 1");
      throw thrown;
    });
    expect(driver.calls).toStrictEqual(["begin", "INSERT 1", "rollback"]);
    expect(result.data).toBeUndefined();
    expect(result.error).toStrictEqual({
      message: "Query failed: constraint violation",
      code: "ROLLED_BACK",
      cause: thrown,
    });
    expect(result.meta.getSpans()[0]).toMatchObject({
      type: "transaction",
      status: "rolled back",
    });
    expect(result.meta.getSpansByType("sql")).toHaveLength(1);
  });

  it("should roll back with tx.rollback()", async () => {
    const { driver, run } = createDriver();
    const result = await run(async (tx) => {
      tx.rollback("insufficient funds");
    });
    expect(driver.calls).toStrictEqual(["begin", "rollback"]);
    expect(result.error?.code).toBe("ROLLED_BACK");
    expect(result.error?.message).toBe(
      "Transaction rolled back: insufficient funds"
    );
    expect(result.error?.cause).toBeInstanceOf(QErrors.RolledBack);
  });

  it("should roll back rather than commit after a failed query", async () => {
    const { driver, run } = createDriver();
    const queryError = new Error("current transaction is aborted");
    const result = await run(async (tx) => {
      await tx.query("INSERT 1");
      tx.failedQuery("INSERT 2", queryError);
      tx.failedQuery("INSERT 3", new Error("second error"));
      return 1;
    });
    expect(driver.calls).toStrictEqual([
      "begin",
      "INSERT 1",
      "INSERT 2",
      "INSERT 3",
      "rollback",
    ]);
    expect(driver.commit).not.toHaveBeenCalled();
    // the first query error
    expect(result.error).toStrictEqual({
      message:
        "A query failed in the transaction, it can't be committed: current transaction is aborted",
      code: "TRANSACTION_FAILED",
      cause: queryError,
    });
    expect(result.meta.getSpans()[0]).toMatchObject({ status: "rolled back" });
    expect(result.meta.getSpansByType("sql")).toHaveLength(3);
  });

  it("should report a failed rollback after a failed query", async () => {
    const rollbackError = new Error("connection lost");
    const { run } = createDriver({
      rollback: () => Promise.reject(rollbackError),
    });
    const queryError = new Error("query error");
    const result = await run(async (tx) => {
      tx.failedQuery("INSERT 1", queryError);
    });
    expect(result.error?.code).toBe("TRANSACTION_FAILED");
    expect(result.error?.message).toBe("Rollback failed: connection lost");
    expect(result.error?.cause).toHaveProperty("errors", [
      rollbackError,
      queryError,
    ]);
  });

  it("should report the thrown error over a failed query", async () => {
    const { run } = createDriver();
    const thrown = new Error("thrown");
    const result = await run(async (tx) => {
      tx.failedQuery("INSERT 1", new Error("query error"));
      throw thrown;
    });
    expect(result.error).toMatchObject({ code: "ROLLED_BACK", cause: thrown });
  });

  it("should return TRANSACTION_FAILED when begin fails", async () => {
    const beginError = new Error("pool timeout");
    const { driver, run } = createDriver({
      begin: () => Promise.reject(beginError),
    });
    const fn = vi.fn<() => Promise<void>>();
    const result = await run(fn);
    expect(fn).not.toHaveBeenCalled();
    expect(driver.commit).not.toHaveBeenCalled();
    expect(driver.rollback).not.toHaveBeenCalled();
    expect(result.error).toStrictEqual({
      message: "pool timeout",
      code: "TRANSACTION_FAILED",
      cause: beginError,
    });
    expect(result.meta.getSpans()[0]).toMatchObject({ status: "failed" });
  });

  it("should roll back and return TRANSACTION_FAILED when commit fails", async () => {
    const commitError = new Error("could not serialize access");
    const { driver, run } = createDriver({
      commit: () => Promise.reject(commitError),
      rollback: () => Promise.reject(new Error("no transaction in progress")),
    });
    const result = await run(async () => 1);
    expect(driver.calls).toStrictEqual(["begin", "commit", "rollback"]);
    expect(result.error).toStrictEqual({
      message: "could not serialize access",
      code: "TRANSACTION_FAILED",
      cause: commitError,
    });
  });

  it("should return TRANSACTION_FAILED with both errors when rollback fails", async () => {
    const rollbackError = new Error("connection lost");
    const { run } = createDriver({
      rollback: () => Promise.reject(rollbackError),
    });
    const thrown = new Error("callback error");
    const result = await run(() => Promise.reject(thrown));
    expect(result.error?.code).toBe("TRANSACTION_FAILED");
    expect(result.error?.message).toBe("Rollback failed: connection lost");
    expect(result.error?.cause).toBeInstanceOf(AggregateError);
    expect(result.error?.cause).toHaveProperty("errors", [
      rollbackError,
      thrown,
    ]);
  });

  it("should not begin when the signal is already aborted", async () => {
    const { driver, run } = createDriver();
    const controller = new AbortController();
    controller.abort(new Error("client gone"));
    const result = await run(async () => 1, { signal: controller.signal });
    expect(driver.begin).not.toHaveBeenCalled();
    expect(result.error).toStrictEqual({
      message: "client gone",
      code: "ABORTED",
      cause: controller.signal.reason,
    });
  });

  it("should return ABORTED when aborted while beginning", async () => {
    const controller = new AbortController();
    const { driver, run } = createDriver({
      begin: async () => {
        controller.abort(new Error("timeout"));
        throw controller.signal.reason;
      },
    });
    const result = await run(async () => 1, { signal: controller.signal });
    expect(driver.rollback).not.toHaveBeenCalled();
    expect(result.error).toStrictEqual({
      message: "timeout",
      code: "ABORTED",
      cause: controller.signal.reason,
    });
  });

  it("should roll back rather than commit when aborted during the callback", async () => {
    const { driver, run } = createDriver();
    const controller = new AbortController();
    const result = await run(
      async (tx) => {
        await tx.query("INSERT 1");
        controller.abort();
        return 1;
      },
      { signal: controller.signal }
    );
    expect(driver.calls).toStrictEqual(["begin", "INSERT 1", "rollback"]);
    expect(result.error?.code).toBe("ABORTED");
    expect(result.error?.cause).toBe(controller.signal.reason);
    expect(result.meta.getSpans()[0]).toMatchObject({ status: "rolled back" });
  });

  it("should use getErrorMessage for the driver errors", async () => {
    const result = await runTransaction({
      fn: async () => 1,
      // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- driver throwing a non Error
      begin: () => Promise.reject({ originalError: "driver" }),
      commit: async () => {},
      rollback: async () => {},
      getErrorMessage: () => "custom message",
    });
    expect(result.error?.message).toBe("custom message");
  });

  describe("with getDataOrThrow (transactionOrThrow)", () => {
    it("should rethrow the error thrown by the callback as is", async () => {
      const { run } = createDriver();
      const thrown = new QErrors.TooManyResults(2);
      const result = await run(() => Promise.reject(thrown));
      expect(() => getDataOrThrow(result)).toThrow(thrown);
      // a TooManyResults from the callback goes to onError, not onTooManyResults
      const onError = vi.fn<() => Error>(() => new Error("custom"));
      expect(() => getDataOrThrow(result, { onError })).toThrow("custom");
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ error: thrown })
      );
    });

    it("should wrap a non Error thrown value in a RolledBack", async () => {
      const { run } = createDriver();
      // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- non Error thrown value
      const result = await run(() => Promise.reject("oops"));
      expect(() => getDataOrThrow(result)).toThrow(
        new QErrors.RolledBack("oops")
      );
    });

    it("should throw a TransactionFailed with the driver error as cause", async () => {
      const commitError = new Error("deadlock");
      const { run } = createDriver({
        commit: () => Promise.reject(commitError),
      });
      const result = await run(async () => 1);
      let caught: unknown;
      try {
        getDataOrThrow(result);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(QErrors.TransactionFailed);
      expect(caught).toMatchObject({
        message: "Transaction failed: deadlock",
        code: "TRANSACTION_FAILED",
        statusCode: 500,
        cause: commitError,
      });
    });
  });
});
