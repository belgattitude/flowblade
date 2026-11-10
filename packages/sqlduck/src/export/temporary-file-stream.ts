import { type FileHandle, open } from "node:fs/promises";

const CHUNK_SIZE = 64 * 1024;
// Longer delays overflow setTimeout, which then fires immediately
const MAX_TIMER_MS = 2_147_483_647;

export type TemporaryFileStreamOutcome =
  /** Fully read by the consumer */
  | "completed"
  /** Cancelled by the consumer (ie: the client disconnected) */
  | "cancelled"
  /** Aborted through the signal */
  | "aborted"
  /** Left unread for longer than the idle timeout */
  | "timeout"
  /** The file could not be read */
  | "failed";

type TemporaryFileStreamParams = {
  filePath: string;
  sizeBytes: number;
  /**
   * Maximum time in milliseconds the stream can wait for its consumer to
   * read, before its first read as well as between two reads. `Infinity`
   * disables the timeout.
   */
  idleTimeoutMs: number;
  signal?: AbortSignal | undefined;
  /** Called once, when the stream is done with the file for any reason. */
  onClose: (outcome: TemporaryFileStreamOutcome) => Promise<void>;
};

/**
 * Create a web `ReadableStream` over a file that reports when the file is no
 * longer needed: fully read, cancelled, aborted, left unread or failed.
 *
 * The file is read on demand only (no read-ahead), so the idle timeout
 * measures the time the consumer leaves the stream unread.
 *
 * @example
 * ```typescript
 * const stream = createTemporaryFileStream({
 *   filePath: "/tmp/export-1/users.csv",
 *   sizeBytes: 1024,
 *   idleTimeoutMs: 60_000,
 *   signal: request.signal,
 *   onClose: async (outcome) => {
 *     // "completed" | "cancelled" | "aborted" | "timeout" | "failed"
 *     await rm("/tmp/export-1", { recursive: true, force: true });
 *   },
 * });
 * return new Response(stream);
 * ```
 */
export const createTemporaryFileStream = (
  params: TemporaryFileStreamParams
): ReadableStream<Uint8Array> => {
  const { filePath, sizeBytes, idleTimeoutMs, signal, onClose } = params;
  let handle: FileHandle | undefined;
  let closed = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let sentBytes = 0;

  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
  // Removes the abort listener once the stream is closed
  const listeners = new AbortController();

  const close = async (outcome: TemporaryFileStreamOutcome): Promise<void> => {
    if (closed) {
      return;
    }
    closed = true;
    clearTimeout(idleTimer);
    listeners.abort();
    try {
      // Waits for a pending read to complete
      await handle?.close();
    } catch {
      // The file is removed by onClose anyway
    }
    await onClose(outcome);
  };

  const failStream = (
    outcome: TemporaryFileStreamOutcome,
    error: unknown
  ): void => {
    if (closed) {
      return;
    }
    streamController?.error(error);
    void close(outcome);
  };

  const armIdleTimer = (): void => {
    clearTimeout(idleTimer);
    if (!Number.isFinite(idleTimeoutMs)) {
      return;
    }
    idleTimer = setTimeout(
      () => {
        failStream(
          "timeout",
          new Error(`Export response left unread for ${idleTimeoutMs}ms`)
        );
      },
      Math.min(idleTimeoutMs, MAX_TIMER_MS)
    );
    // Never keeps the process alive (timers are numbers in some runtimes)
    (idleTimer as { unref?: () => void }).unref?.();
  };

  return new ReadableStream<Uint8Array>(
    {
      start: (controller) => {
        streamController = controller;
        if (signal?.aborted === true) {
          // Aborted before the stream was created: no event will follow
          failStream("aborted", signal.reason);
          return;
        }
        signal?.addEventListener(
          "abort",
          () => {
            failStream("aborted", signal.reason);
          },
          { once: true, signal: listeners.signal }
        );
        armIdleTimer();
      },
      pull: async (controller) => {
        // The consumer is reading: time spent on the disk is not idle time
        clearTimeout(idleTimer);
        try {
          // Opened on the first read: an unread response holds no descriptor
          handle ??= await open(filePath, "r");
          if (closed) {
            await handle.close();
            return;
          }
          const { bytesRead, buffer } = await handle.read(
            new Uint8Array(CHUNK_SIZE),
            0,
            CHUNK_SIZE,
            null
          );
          if (closed) {
            return;
          }
          if (bytesRead > 0) {
            sentBytes += bytesRead;
            controller.enqueue(buffer.subarray(0, bytesRead));
          }
          if (bytesRead === 0 || sentBytes >= sizeBytes) {
            controller.close();
            await close("completed");
            return;
          }
          armIdleTimer();
        } catch (error) {
          failStream("failed", error);
        }
      },
      cancel: async () => {
        await close("cancelled");
      },
    },
    // Pull only when the consumer reads
    { highWaterMark: 0 }
  );
};
