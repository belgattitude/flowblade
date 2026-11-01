export type LoadProgress = {
  /**
   * Total number of rows loaded so far.
   */
  totalRows: number;
  /**
   * Time since the previous progress call (or the start of the load) in
   * milliseconds.
   */
  intervalMs: number;
  /**
   * Rows per second since the previous progress call, `0` when no time
   * elapsed.
   */
  rowsPerSecond: number;
};

/**
 * Progress callback of `DuckTableLoader.load`, awaited when it returns a
 * promise.
 *
 * @example
 * ```typescript
 * const onProgress: OnLoadProgressCb = ({ totalRows, intervalMs, rowsPerSecond }) => {
 *   console.log(`${totalRows} rows loaded, ${rowsPerSecond} rows/s over ${intervalMs}ms`);
 * };
 * ```
 */
export type OnLoadProgressCb = (progress: LoadProgress) => void | Promise<void>;

/**
 * Return a function computing the progress since its previous call.
 */
export const createProgressCollector = () => {
  let previousTime = performance.now();
  let previousTotalRows = 0;
  return (totalRows: number): LoadProgress => {
    const now = performance.now();
    const elapsedMs = now - previousTime;
    const progress: LoadProgress = {
      totalRows,
      intervalMs: Math.round(elapsedMs),
      rowsPerSecond:
        elapsedMs > 0
          ? Math.round(((totalRows - previousTotalRows) / elapsedMs) * 1000)
          : 0,
    };
    previousTotalRows = totalRows;
    previousTime = now;
    return progress;
  };
};
