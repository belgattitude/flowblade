/**
 * Whether going from `previousRows` to `totalRows` loaded rows crosses a
 * multiple of `everyRows`, ie: with `everyRows` 1000, chunks ending at rows
 * 2048, 4096 cross 1000 and 2000, then 3000 and 4000 (once per chunk).
 */
export const crossedEveryRows = (
  everyRows: number,
  previousRows: number,
  totalRows: number
): boolean =>
  Math.floor(totalRows / everyRows) > Math.floor(previousRows / everyRows);
