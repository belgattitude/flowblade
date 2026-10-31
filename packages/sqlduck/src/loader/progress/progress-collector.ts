export type LoadProgress = {
  /**
   * Total number of rows appended so far (all batches included)
   */
  totalRows: number;
  /**
   * Time taken to append the last batch in milliseconds
   */
  timeMs: number;
  /**
   * Estimated rows per seconds based on the current batch
   */
  rowsPerSecond: number;
};

type OnLoadProgressSyncCb = (progress: LoadProgress) => void;
type OnLoadProgressAsyncCb = (progress: LoadProgress) => Promise<void>;

export type OnLoadProgressCb = OnLoadProgressSyncCb | OnLoadProgressAsyncCb;

/**
 * Former name of {@link LoadProgress}, used by `SqlDuck.toTable`.
 */
export type OnChunkAppendedStats = LoadProgress;

/**
 * Former name of {@link OnLoadProgressCb}, used by `SqlDuck.toTable`.
 */
export type OnChunkAppendedCb = OnLoadProgressCb;

export const createProgressCollector = () => {
  let lastCallbackTimeStart: number = Date.now();
  let appendedTotalRows = 0;
  return (currentTotalRows: number): LoadProgress => {
    const cbTimeMs = Math.round(Date.now() - lastCallbackTimeStart);
    const cbTotalRows = currentTotalRows - appendedTotalRows;
    const progress: LoadProgress = {
      totalRows: currentTotalRows,
      timeMs: cbTimeMs,
      rowsPerSecond: Math.round((cbTotalRows / cbTimeMs) * 1000),
    };
    appendedTotalRows = currentTotalRows;
    lastCallbackTimeStart = Date.now();
    return progress;
  };
};
