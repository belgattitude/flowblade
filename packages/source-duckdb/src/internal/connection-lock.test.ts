import { setTimeout as sleep } from "node:timers/promises";

import { describe, expect, it } from "vitest";

import { getConnectionLock, SharedExclusiveLock } from "./connection-lock.ts";

const flush = () => sleep(0);

/**
 * Track the order the lock requests are granted in.
 */
const track = (events: string[], label: string, acquire: Promise<() => void>) =>
  acquire.then((release) => {
    events.push(label);
    return release;
  });

describe(SharedExclusiveLock, () => {
  it("should grant shared locks concurrently", async () => {
    const lock = new SharedExclusiveLock();
    const r1 = await lock.acquireShared();
    const r2 = await lock.acquireShared();
    expect(r1).toBeTypeOf("function");
    expect(r2).toBeTypeOf("function");
    r1();
    r2();
  });

  it("should wait for the shared locks before granting an exclusive one", async () => {
    const lock = new SharedExclusiveLock();
    const events: string[] = [];
    const shared = await lock.acquireShared();
    const exclusive = track(events, "exclusive", lock.acquireExclusive());
    await flush();
    expect(events).toStrictEqual([]);
    shared();
    (await exclusive)();
    expect(events).toStrictEqual(["exclusive"]);
  });

  it("should make shared locks wait for an exclusive one", async () => {
    const lock = new SharedExclusiveLock();
    const events: string[] = [];
    const exclusive = await lock.acquireExclusive();
    const s1 = track(events, "s1", lock.acquireShared());
    const s2 = track(events, "s2", lock.acquireShared());
    await flush();
    expect(events).toStrictEqual([]);
    exclusive();
    await Promise.all([s1, s2]);
    expect(events).toStrictEqual(["s1", "s2"]);
  });

  it("should make an exclusive lock wait for another exclusive one", async () => {
    const lock = new SharedExclusiveLock();
    const events: string[] = [];
    const e1 = await lock.acquireExclusive();
    const e2 = track(events, "e2", lock.acquireExclusive());
    await flush();
    expect(events).toStrictEqual([]);
    e1();
    (await e2)();
    expect(events).toStrictEqual(["e2"]);
  });

  it("should grant in request order, shared after a waiting exclusive wait", async () => {
    const lock = new SharedExclusiveLock();
    const events: string[] = [];
    const s1 = await lock.acquireShared();
    const e1 = track(events, "e1", lock.acquireExclusive());
    const s2 = track(events, "s2", lock.acquireShared());
    const e2 = track(events, "e2", lock.acquireExclusive());
    s1();
    await flush();
    expect(events).toStrictEqual(["e1"]);
    (await e1)();
    await flush();
    expect(events).toStrictEqual(["e1", "s2"]);
    (await s2)();
    (await e2)();
    expect(events).toStrictEqual(["e1", "s2", "e2"]);
  });

  it("should ignore releasing twice", async () => {
    const lock = new SharedExclusiveLock();
    const s1 = await lock.acquireShared();
    const s2 = await lock.acquireShared();
    s1();
    s1();
    const events: string[] = [];
    const exclusive = track(events, "exclusive", lock.acquireExclusive());
    await flush();
    // s2 still held
    expect(events).toStrictEqual([]);
    s2();
    (await exclusive)();
  });

  it("should reject with the abort reason and unblock the next waiters", async () => {
    const lock = new SharedExclusiveLock();
    const events: string[] = [];
    const shared = await lock.acquireShared();
    const controller = new AbortController();
    const exclusive = lock.acquireExclusive(controller.signal);
    const s2 = track(events, "s2", lock.acquireShared());
    await flush();
    expect(events).toStrictEqual([]);
    controller.abort(new Error("timeout"));
    await expect(exclusive).rejects.toThrow("timeout");
    (await s2)();
    expect(events).toStrictEqual(["s2"]);
    shared();
  });

  it("should reject an already aborted signal", async () => {
    const lock = new SharedExclusiveLock();
    await expect(
      lock.acquireShared(AbortSignal.abort(new Error("aborted")))
    ).rejects.toThrow("aborted");
  });

  it("should share the lock of a connection", () => {
    const conn = {} as never;
    expect(getConnectionLock(conn)).toBe(getConnectionLock(conn));
    expect(getConnectionLock({} as never)).not.toBe(getConnectionLock(conn));
  });
});
