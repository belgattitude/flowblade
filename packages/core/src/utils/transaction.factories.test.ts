import { setTimeout as sleep } from "node:timers/promises";

import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { QErrors } from "../index";
import type { QMetaSqlSpan } from "../meta/q-meta";
import { createSqlSpan, getDataOrThrow } from "./datasource.factories";
import { defaultRetryDelayMs, runTransaction } from "./transaction.factories";

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
    options?: Parameters<typeof runTransaction>[0]["options"],
    extra?: Pick<
      Parameters<typeof runTransaction>[0],
      "isConflictError" | "onRetry" | "log" | "defaultRetry"
    >
  ) =>
    runTransaction<FakeTx, TData>({
      ...extra,
      fn,
      options,
      begin: async ({ addSpan, onQueryFailed, assertActive, trackQuery }) => {
        await driver.begin();
        return {
          failedQuery: (sql, error) => {
            calls.push(sql);
            addSpan(createSqlSpan({ sql, params: [] }));
            onQueryFailed(error);
          },
          query: (sql) =>
            trackQuery(
              (async () => {
                assertActive();
                // a query takes some time
                await Promise.resolve();
                calls.push(sql);
                addSpan(createSqlSpan({ sql, params: [], timeMs: 1 }));
              })()
            ),
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
    expect(result.error).toMatchObject({
      message: "Query failed: constraint violation",
      code: "ROLLED_BACK",
      cause: thrown,
    });
    expect(result.error).toBeInstanceOf(QErrors.RolledBack);
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
    expect(result.error).toBeInstanceOf(QErrors.RolledBack);
  });

  it("should report a domain rollback separately from a callback failure", async () => {
    const { driver, run } = createDriver();
    const domainError = new QErrors.DomainRollback("OUT_OF_STOCK", {
      details: { productId: 3 },
    });
    const result = await run(async () => {
      throw domainError;
    });

    expect(driver.calls).toStrictEqual(["begin", "rollback"]);
    expect(result.error).toMatchObject({
      code: "DOMAIN_ROLLBACK",
      reason: "OUT_OF_STOCK",
      details: { productId: 3 },
      cause: domainError,
    });
    expect(result.error).toBeInstanceOf(QErrors.DomainRollback);
    expect(result.error).toBeInstanceOf(QErrors.TransactionDomainRollback);
    expect(result.toJsonifiable().error).toStrictEqual({
      message: "Domain rollback: OUT_OF_STOCK",
      code: "DOMAIN_ROLLBACK",
      reason: "OUT_OF_STOCK",
      details: { productId: 3 },
    });
    expect(result.toJsonifiable().error).not.toHaveProperty("cause");
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
    expect(result.error).toMatchObject({
      message:
        "A query failed in the transaction, it can't be committed: current transaction is aborted",
      code: "TRANSACTION_FAILED",
      cause: queryError,
    });
    expect(result.error).toBeInstanceOf(QErrors.TransactionFailed);
    expect(result.meta.getSpans()[0]).toMatchObject({ status: "rolled back" });
    expect(result.meta.getSpansByType("sql")).toHaveLength(3);
  });

  it("should commit after a handled failed query with onFailedQuery commit", async () => {
    const { driver, run } = createDriver();
    const result = await run(
      async (tx) => {
        await tx.query("INSERT 1");
        tx.failedQuery("INSERT 2", new Error("duplicate key"));
        return 1;
      },
      { onFailedQuery: "commit" }
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toBe(1);
    expect(driver.calls.at(-1)).toBe("commit");
  });

  it("should never commit a handled conflict with onFailedQuery commit", async () => {
    const { driver, run } = createDriver();
    const conflictError = Object.assign(new Error("deadlock"), {
      code: "40001",
    });
    const result = await run(
      async (tx) => {
        tx.failedQuery("UPDATE 1", conflictError);
      },
      { onFailedQuery: "commit" },
      {
        isConflictError: (error) =>
          (error as { code?: unknown }).code === "40001",
      }
    );
    expect(driver.commit).not.toHaveBeenCalled();
    expect(result.error).toMatchObject({
      code: "TRANSACTION_CONFLICT",
      cause: conflictError,
    });
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

  it("should reject the queries run after the callback returned", async () => {
    const { driver, run } = createDriver();
    let kept: FakeTx | undefined;
    const result = await run(async (tx) => {
      kept = tx;
      await tx.query("INSERT 1");
    });
    expect(result.error).toBeUndefined();
    await expect(kept?.query("INSERT 2")).rejects.toThrow(
      "The transaction has ended"
    );
    expect(driver.calls).toStrictEqual(["begin", "INSERT 1", "commit"]);
  });

  it("should reject the queries run after the callback threw", async () => {
    const { run } = createDriver();
    let kept: FakeTx | undefined;
    await run(async (tx) => {
      kept = tx;
      throw new Error("thrown");
    });
    await expect(kept?.query("INSERT 1")).rejects.toThrow(
      "The transaction has ended"
    );
  });

  it("should wait for the queries not awaited by the callback", async () => {
    const { driver, run } = createDriver();
    const result = await run(async (tx) => {
      // not awaited (a bug): still runs before the commit
      void tx.query("INSERT 1");
      void tx.query("INSERT 2");
    });
    expect(result.error).toBeUndefined();
    expect(driver.calls).toStrictEqual([
      "begin",
      "INSERT 1",
      "INSERT 2",
      "commit",
    ]);
    expect(result.meta.getSpansByType("sql")).toHaveLength(2);
  });

  it("should wait for the queries not awaited when the callback throws", async () => {
    const { driver, run } = createDriver();
    const result = await run(async (tx) => {
      void tx.query("INSERT 1");
      throw new Error("thrown");
    });
    expect(result.error?.code).toBe("ROLLED_BACK");
    expect(driver.calls).toStrictEqual(["begin", "INSERT 1", "rollback"]);
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
    expect(result.error).toMatchObject({
      message: "pool timeout",
      code: "TRANSACTION_FAILED",
      cause: beginError,
    });
    expect(result.error).toBeInstanceOf(QErrors.TransactionFailed);
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
    expect(result.error).toMatchObject({
      message: "could not serialize access",
      code: "TRANSACTION_FAILED",
      cause: commitError,
    });
    expect(result.error).toBeInstanceOf(QErrors.TransactionFailed);
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
    expect(result.error).toMatchObject({
      message: "client gone",
      code: "ABORTED",
      cause: controller.signal.reason,
    });
    expect(result.error).toBeInstanceOf(QErrors.Aborted);
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
    expect(result.error).toMatchObject({
      message: "timeout",
      code: "ABORTED",
      cause: controller.signal.reason,
    });
    expect(result.error).toBeInstanceOf(QErrors.Aborted);
  });

  it("should not wait for begin once aborted, and roll back a late begin", async () => {
    const controller = new AbortController();
    let resolveBegin: (() => void) | undefined;
    const { driver, run } = createDriver({
      // ie: waiting for a connection of an exhausted pool, not aborted
      begin: async () => {
        // oxlint-disable-next-line promise/avoid-new -- resolved by the test
        await new Promise<void>((resolve) => {
          resolveBegin = resolve;
        });
      },
    });
    const fn = vi.fn<() => Promise<number>>(async () => 1);
    const transaction = run(fn, { signal: controller.signal });
    await vi.waitFor(() => {
      expect(resolveBegin).toBeDefined();
    });
    controller.abort(new Error("client gone"));
    const result = await transaction;
    expect(result.error).toMatchObject({
      message: "client gone",
      code: "ABORTED",
      cause: controller.signal.reason,
    });
    expect(result.error).toBeInstanceOf(QErrors.Aborted);
    expect(result.meta.getSpans()[0]).toMatchObject({ status: "failed" });
    resolveBegin?.();
    await vi.waitFor(() => {
      expect(driver.rollback).toHaveBeenCalledOnce();
    });
    expect(fn).not.toHaveBeenCalled();
    expect(driver.commit).not.toHaveBeenCalled();
  });

  it("should not run the callback when aborted as begin resolves", async () => {
    const controller = new AbortController();
    const { driver, run } = createDriver({
      begin: async () => {
        // aborted as begin resolves
        queueMicrotask(() => controller.abort(new Error("client gone")));
      },
    });
    const fn = vi.fn<() => Promise<number>>(async () => 1);
    const result = await run(fn, { signal: controller.signal });
    expect(fn).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(driver.rollback).toHaveBeenCalledOnce();
    });
    expect(result.error?.code).toBe("ABORTED");
  });

  it("should roll back once when aborted by the synchronous part of begin", async () => {
    const controller = new AbortController();
    const fn = vi.fn<() => Promise<number>>(async () => 1);
    const rollback = vi.fn<() => Promise<void>>(async () => {});
    const result = await runTransaction<object, number>({
      fn,
      options: { signal: controller.signal },
      begin: async () => {
        // before the abort listener is added
        controller.abort(new Error("client gone"));
        await Promise.resolve();
        return {};
      },
      commit: async () => {},
      rollback,
    });
    expect(result.error?.code).toBe("ABORTED");
    await vi.waitFor(() => {
      expect(rollback).toHaveBeenCalledWith({});
    });
    // never twice: by the late begin and after begin
    await sleep(5);
    expect(rollback).toHaveBeenCalledOnce();
    expect(fn).not.toHaveBeenCalled();
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

  describe("conflicts", () => {
    const isConflictError = (error: unknown) =>
      (error as { code?: unknown }).code === "40001";
    const createConflict = () =>
      Object.assign(new Error("could not serialize access"), {
        code: "40001",
      });

    it("should return TRANSACTION_CONFLICT when the callback throws a conflict", async () => {
      const { run } = createDriver();
      const thrown = new QErrors.QueryFailed("could not serialize access", {
        cause: createConflict(),
      });
      const result = await run(
        () => Promise.reject(thrown),
        {},
        { isConflictError }
      );
      expect(result.error).toMatchObject({
        message: "could not serialize access",
        code: "TRANSACTION_CONFLICT",
        cause: thrown,
      });
      expect(result.error).toBeInstanceOf(QErrors.TransactionConflict);
      expect(result.meta.getSpans()[0]).toMatchObject({
        status: "rolled back",
      });
      let caught: unknown;
      try {
        getDataOrThrow(result);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(QErrors.TransactionConflict);
      expect(caught).toMatchObject({ statusCode: 409, cause: thrown });
    });

    it("should return TRANSACTION_CONFLICT for a handled failed query", async () => {
      const { run } = createDriver();
      const conflictError = createConflict();
      const result = await run(
        async (tx) => {
          tx.failedQuery("UPDATE 1", conflictError);
        },
        {},
        { isConflictError }
      );
      expect(result.error).toMatchObject({
        code: "TRANSACTION_CONFLICT",
        cause: conflictError,
      });
    });

    it("should return TRANSACTION_CONFLICT when the commit conflicts", async () => {
      const conflictError = createConflict();
      const { driver, run } = createDriver({
        commit: () => Promise.reject(conflictError),
      });
      const result = await run(async () => 1, {}, { isConflictError });
      expect(driver.calls).toStrictEqual(["begin", "commit", "rollback"]);
      expect(result.error).toMatchObject({
        code: "TRANSACTION_CONFLICT",
        cause: conflictError,
      });
      expect(result.meta.getSpans()[0]).toMatchObject({ status: "failed" });
    });

    it("should report the conflict when the rollback fails", async () => {
      // ie: sql server rolls back a deadlock victim, ROLLBACK then fails
      const { run } = createDriver({
        rollback: () =>
          Promise.reject(new Error("no corresponding BEGIN TRANSACTION")),
      });
      const conflictError = createConflict();
      const thrown = await run(
        () => Promise.reject(conflictError),
        {},
        { isConflictError }
      );
      expect(thrown.error).toMatchObject({
        code: "TRANSACTION_CONFLICT",
        cause: conflictError,
      });
      const handled = await run(
        async (tx) => {
          tx.failedQuery("UPDATE 1", conflictError);
        },
        {},
        { isConflictError }
      );
      expect(handled.error).toMatchObject({
        code: "TRANSACTION_CONFLICT",
        cause: conflictError,
      });
    });

    it("should not report conflicts without isConflictError", async () => {
      const { run } = createDriver();
      const result = await run(() => Promise.reject(createConflict()));
      expect(result.error?.code).toBe("ROLLED_BACK");
    });

    it("should retry the conflicts", async () => {
      const { driver, run } = createDriver();
      const onRetry = vi.fn<(info: unknown) => void>();
      let attempts = 0;
      const result = await run(
        async (tx) => {
          attempts++;
          await tx.query(`UPDATE ${attempts}`);
          if (attempts < 3) {
            throw createConflict();
          }
          return attempts;
        },
        { retry: { maxRetries: 3, delayMs: 0 } },
        { isConflictError, onRetry }
      );
      expect(result.error).toBeUndefined();
      expect(result.data).toBe(3);
      expect(driver.begin).toHaveBeenCalledTimes(3);
      expect(driver.commit).toHaveBeenCalledOnce();
      expect(onRetry.mock.calls.map(([info]) => info)).toStrictEqual([
        {
          retry: 1,
          delayMs: 0,
          error: expect.objectContaining({ code: "TRANSACTION_CONFLICT" }),
        },
        {
          retry: 2,
          delayMs: 0,
          error: expect.objectContaining({ code: "TRANSACTION_CONFLICT" }),
        },
      ]);
      // the spans of the last attempt
      expect(result.meta.getSpans()[0]).toMatchObject({
        status: "committed",
        retries: 2,
      });
      expect(result.meta.getSpansByType("sql")).toHaveLength(1);
    });

    it("should return the conflict when the retries are exhausted", async () => {
      const { driver, run } = createDriver();
      const result = await run(
        () => Promise.reject(createConflict()),
        { retry: { maxRetries: 2, delayMs: (retry) => retry } },
        { isConflictError }
      );
      expect(driver.begin).toHaveBeenCalledTimes(3);
      expect(result.error?.code).toBe("TRANSACTION_CONFLICT");
      expect(result.meta.getSpans()[0]).toMatchObject({ retries: 2 });
    });

    it("should use the default retry options, the per call fields win", async () => {
      const onRetry = vi.fn<(info: { delayMs: number }) => void>();
      const extra = {
        isConflictError,
        onRetry,
        defaultRetry: { maxRetries: 1, delayMs: 7 },
      };
      const conflict = () => Promise.reject(createConflict());

      const defaults = createDriver();
      await defaults.run(conflict, undefined, extra);
      expect(defaults.driver.begin).toHaveBeenCalledTimes(2);

      // the default delayMs is kept
      const perCall = createDriver();
      await perCall.run(conflict, { retry: { maxRetries: 2 } }, extra);
      expect(perCall.driver.begin).toHaveBeenCalledTimes(3);
      expect(onRetry.mock.calls.map(([info]) => info.delayMs)).toStrictEqual([
        7, 7, 7,
      ]);

      const disabled = createDriver();
      const result = await disabled.run(
        conflict,
        { retry: { maxRetries: 0 } },
        extra
      );
      expect(disabled.driver.begin).toHaveBeenCalledOnce();
      expect(result.error?.code).toBe("TRANSACTION_CONFLICT");
    });

    it("should not retry with a default delay only", async () => {
      const { driver, run } = createDriver();
      const result = await run(
        () => Promise.reject(createConflict()),
        undefined,
        {
          isConflictError,
          defaultRetry: { delayMs: 0 },
        }
      );
      expect(driver.begin).toHaveBeenCalledOnce();
      expect(result.error?.code).toBe("TRANSACTION_CONFLICT");
    });

    it("should use an exponential backoff with jitter by default", async () => {
      const { run } = createDriver();
      const onRetry = vi.fn<(info: { delayMs: number }) => void>();
      const random = vi.spyOn(Math, "random").mockReturnValue(0);
      try {
        await run(
          () => Promise.reject(createConflict()),
          { retry: { maxRetries: 2 } },
          { isConflictError, onRetry }
        );
      } finally {
        random.mockRestore();
      }
      expect(onRetry.mock.calls.map(([info]) => info.delayMs)).toStrictEqual([
        25, 50,
      ]);
    });

    it("should bound the default retry delay", () => {
      const random = vi.spyOn(Math, "random");
      try {
        random.mockReturnValue(0);
        expect([1, 2, 3, 5, 6, 10].map(defaultRetryDelayMs)).toStrictEqual([
          25, 50, 100, 400, 500, 500,
        ]);
        random.mockReturnValue(0.999_999);
        expect([1, 2, 3, 5, 6, 10].map(defaultRetryDelayMs)).toStrictEqual([
          50, 100, 200, 800, 1000, 1000,
        ]);
      } finally {
        random.mockRestore();
      }
      for (let i = 0; i < 1000; i++) {
        const delay = defaultRetryDelayMs(3);
        expect(Number.isInteger(delay)).toBe(true);
        expect(delay).toBeGreaterThanOrEqual(100);
        expect(delay).toBeLessThanOrEqual(200);
      }
    });

    it("should not retry the other errors", async () => {
      const { driver, run } = createDriver();
      const result = await run(
        () => Promise.reject(new Error("syntax error")),
        { retry: { maxRetries: 3, delayMs: 0 } },
        { isConflictError }
      );
      expect(driver.begin).toHaveBeenCalledOnce();
      expect(result.error?.code).toBe("ROLLED_BACK");
    });

    it("should stop retrying when aborted while waiting", async () => {
      const { driver, run } = createDriver();
      const controller = new AbortController();
      const result = await run(
        () => Promise.reject(createConflict()),
        {
          signal: controller.signal,
          retry: { maxRetries: 3, delayMs: 1000 },
        },
        {
          isConflictError,
          onRetry: () => {
            controller.abort(new Error("timeout"));
          },
        }
      );
      expect(driver.begin).toHaveBeenCalledOnce();
      expect(result.error).toMatchObject({ code: "ABORTED" });
    });

    it("should return TRANSACTION_FAILED for invalid retries", async () => {
      const { driver, run } = createDriver();
      const result = await run(async () => 1, {
        name: "invalid",
        retry: { maxRetries: -1 },
      });
      expect(driver.begin).not.toHaveBeenCalled();
      expect(result.error).toMatchObject({
        message: "retry.maxRetries must be a non-negative integer, got -1",
        code: "TRANSACTION_FAILED",
      });
      expect(result.error).toBeInstanceOf(QErrors.TransactionFailed);
      expect(result.meta.name).toBe("invalid");
    });
  });

  describe("log", () => {
    const createLogger = () => {
      return {
        debug: vi.fn<(message: string, props?: unknown) => void>(),
        info: vi.fn<(message: string, props?: unknown) => void>(),
        warn: vi.fn<(message: string, props?: unknown) => void>(),
        error: vi.fn<(message: string, props?: unknown) => void>(),
      };
    };

    it("should log the beginning and the commit", async () => {
      const logger = createLogger();
      const { run } = createDriver();
      await run(
        async (tx) => {
          await tx.query("INSERT 1");
        },
        { name: "insert", isolationLevel: "serializable" },
        { log: { logger, source: "test" } }
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Beginning transaction "{transactionName}"',
        {
          transactionName: "insert",
          source: "test",
          method: "transaction",
          isolationLevel: "serializable",
        }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Transaction "{transactionName}" committed in {timeMs}ms, {queryCount} query(ies)',
        expect.objectContaining({
          transactionName: "insert",
          status: "committed",
          queryCount: 1,
        })
      );
    });

    it.each([
      ["warn", "rolled back", () => Promise.reject(new Error("thrown"))],
      [
        "error",
        "failed",
        async (tx: FakeTx) => {
          tx.failedQuery("INSERT 1", new Error("query error"));
        },
      ],
    ] as const)("should log at %s level when %s", async (level, status, fn) => {
      const logger = createLogger();
      const { run } = createDriver();
      await run(fn, {}, { log: { logger, source: "test" } });
      expect(logger[level]).toHaveBeenCalledWith(
        expect.stringContaining(`{transactionName}" ${status}`),
        expect.objectContaining({ errorMessage: expect.any(String) })
      );
      expect(logger.info).not.toHaveBeenCalled();
    });

    it("should log the retries and the conflict", async () => {
      const logger = createLogger();
      const { run } = createDriver();
      await run(
        () =>
          Promise.reject(
            Object.assign(new Error("conflict"), { code: "40001" })
          ),
        { retry: { maxRetries: 1, delayMs: 0 } },
        {
          log: { logger, source: "test" },
          isConflictError: (error) =>
            (error as { code?: unknown }).code === "40001",
        }
      );
      expect(logger.warn.mock.calls.map(([message]) => message)).toStrictEqual([
        'Transaction "{transactionName}" conflicts with a concurrent one, retry {retry} in {delayMs}ms: {errorMessage}',
        'Transaction "{transactionName}" conflicts with a concurrent one: {errorMessage}',
      ]);
      expect(logger.warn.mock.calls[1]?.[1]).toMatchObject({ retries: 1 });
    });
  });
});
