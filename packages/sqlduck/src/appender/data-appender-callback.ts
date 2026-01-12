export type OnDataAppendedStats = {
  /**
   * Total number of rows appended (in this chunk)
   */
  rowsCount: number;
  /**
   * Time taken to append the last batch in milliseconds
   */
  timeMs: number;
  /**
   * Estimated rows per seconds
   */
  rowsPerSecond: number;
};

type OnDataAppendedSyncCb = (stats: OnDataAppendedStats) => void;
type OnDataAppendedAsyncCb = (stats: OnDataAppendedStats) => Promise<void>;

export type OnDataAppendedCb = OnDataAppendedSyncCb | OnDataAppendedAsyncCb;

export const isOnDataAppendedAsyncCb = (
  v: OnDataAppendedCb
): v is OnDataAppendedAsyncCb => {
  return v.constructor.name === 'AsyncFunction';
};

export const createOnDataAppendedCollector = () => {
  let lastCallbackTimeStart: number = Date.now();
  let appendedTotalRows = 0;
  return (currentTotalRows: number) => {
    const cbTimeMs = Math.round(Date.now() - lastCallbackTimeStart);
    const cbTotalRows = currentTotalRows - appendedTotalRows;
    const stats: OnDataAppendedStats = {
      rowsCount: cbTotalRows,
      timeMs: cbTimeMs,
      rowsPerSecond: Math.round((cbTotalRows / cbTimeMs) * 1000),
    };
    appendedTotalRows = currentTotalRows;
    lastCallbackTimeStart = Date.now();
    return stats;
  };
};
