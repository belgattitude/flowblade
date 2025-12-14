/**
 * Create an async iterator that yields non-overlapping chunks (batches)
 * from a source async iterable.
 *
 * Example:
 *  source: [1,2,3,4,5], size=2 -> yields [[1,2],[3,4],[5]]
 */
export function chunkAsync<T>(
  source: AsyncIterable<T>,
  size: number
): AsyncIterableIterator<T[]> {
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`chunk size must be a positive integer, got ${size}`);
  }

  async function* run(): AsyncIterableIterator<T[]> {
    let buf: T[] = [];
    for await (const item of source) {
      buf.push(item);
      if (buf.length >= size) {
        yield buf;
        buf = [];
      }
    }
    if (buf.length > 0) {
      yield buf;
    }
  }

  return run();
}

// Helper to create an AsyncIterable from an array of values
export async function* fromArray<T>(
  values: Iterable<T>
): AsyncIterableIterator<T> {
  for (const v of values) {
    // Small tick to mimic async behavior, but not strictly necessary
    // await Promise.resolve();
    yield v;
  }
}
