export type OnChunkAppendedStats = {
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

type OnChunkAppendedSyncCb = (stats: OnChunkAppendedStats) => void;
type OnChunkAppendedAsyncCb = (stats: OnChunkAppendedStats) => Promise<void>;

export type OnChunkAppendedCb = OnChunkAppendedSyncCb | OnChunkAppendedAsyncCb;

export const isOnChunkAppendedAsyncCb = (
  v: OnChunkAppendedCb
): v is OnChunkAppendedAsyncCb => {
  return (
    v.constructor.name === 'AsyncFunction' ||
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    v.constructor ===
      (async () => {
        await Promise.resolve();
      }).constructor
  );
};

export const createOnChunkAppendedCollector = () => {
  let lastCallbackTimeStart: number = Date.now();
  let appendedTotalRows = 0;
  return (currentTotalRows: number) => {
    const cbTimeMs = Math.round(Date.now() - lastCallbackTimeStart);
    const cbTotalRows = currentTotalRows - appendedTotalRows;
    const stats: OnChunkAppendedStats = {
      totalRows: currentTotalRows,
      timeMs: cbTimeMs,
      rowsPerSecond: Math.round((cbTotalRows / cbTimeMs) * 1000),
    };
    appendedTotalRows = currentTotalRows;
    lastCallbackTimeStart = Date.now();
    return stats;
  };
};
