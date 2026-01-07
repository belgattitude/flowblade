export type OnDataAppendedParams = {
  /**
   * Total number of rows appended so far
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

type OnDataAppendedSyncCb = (params: OnDataAppendedParams) => void;
type OnDataAppendedAsyncCb = (params: OnDataAppendedParams) => Promise<void>;

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
    const payload: OnDataAppendedParams = {
      rowsCount: cbTotalRows,
      timeMs: cbTimeMs,
      rowsPerSecond: Math.round((cbTotalRows / cbTimeMs) * 1000),
    };
    appendedTotalRows = currentTotalRows;
    lastCallbackTimeStart = Date.now();
    return payload;
  };
};
