import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";

import { describe, expect, it, vi } from "vitest";

import { createTemporaryFileStream } from "./temporary-file-stream.ts";

const createFile = async (content: string) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sqlduck-stream-"));
  const filePath = path.join(directory, "file.txt");
  await writeFile(filePath, content);
  return {
    filePath,
    sizeBytes: Buffer.byteLength(content),
    [Symbol.asyncDispose]: async () => {
      await rm(directory, { recursive: true, force: true });
    },
  };
};

describe("createTemporaryFileStream", () => {
  it("streams the file and reports its completion once", async () => {
    await using file = await createFile("hello");
    const onClose = vi.fn<(outcome: string) => Promise<void>>(async () => {});
    const stream = createTemporaryFileStream({
      filePath: file.filePath,
      sizeBytes: file.sizeBytes,
      idleTimeoutMs: 1000,
      onClose,
    });

    await expect(new Response(stream).text()).resolves.toBe("hello");
    // Reported once the file handle is closed, right after the last read
    await vi.waitFor(() => {
      expect(onClose.mock.calls).toStrictEqual([["completed"]]);
    });
  });

  it("fails immediately when the signal is already aborted", async () => {
    await using file = await createFile("hello");
    const onClose = vi.fn<(outcome: string) => Promise<void>>(async () => {});
    const stream = createTemporaryFileStream({
      filePath: file.filePath,
      sizeBytes: file.sizeBytes,
      idleTimeoutMs: 1000,
      signal: AbortSignal.abort(new Error("already aborted")),
      onClose,
    });

    await expect(new Response(stream).text()).rejects.toThrow(
      "already aborted"
    );
    // Reported once the file handle is closed, right after the last read
    await vi.waitFor(() => {
      expect(onClose.mock.calls).toStrictEqual([["aborted"]]);
    });
  });

  it("does not fire immediately with a timeout above the timer limit", async () => {
    await using file = await createFile("hello");
    const onClose = vi.fn<(outcome: string) => Promise<void>>(async () => {});
    const stream = createTemporaryFileStream({
      filePath: file.filePath,
      sizeBytes: file.sizeBytes,
      idleTimeoutMs: Number.MAX_SAFE_INTEGER,
      onClose,
    });
    await setTimeout(20);

    expect(onClose).not.toHaveBeenCalled();
    await stream.cancel();
    expect(onClose.mock.calls).toStrictEqual([["cancelled"]]);
  });

  it("reports a failure when the file can't be read", async () => {
    const onClose = vi.fn<(outcome: string) => Promise<void>>(async () => {});
    const stream = createTemporaryFileStream({
      filePath: path.join(os.tmpdir(), "sqlduck-stream-missing", "file.txt"),
      sizeBytes: 5,
      idleTimeoutMs: 1000,
      onClose,
    });

    await expect(new Response(stream).text()).rejects.toThrow("ENOENT");
    // Reported once the file handle is closed, right after the last read
    await vi.waitFor(() => {
      expect(onClose.mock.calls).toStrictEqual([["failed"]]);
    });
  });
});
