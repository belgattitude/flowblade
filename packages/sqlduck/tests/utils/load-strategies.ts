import { ChunkAppenderStrategy } from "../../src/loader/strategies/chunk-appender/chunk-appender-strategy.ts";
import { NativeChunkAppenderStrategy } from "../../src/loader/strategies/native-chunk-appender/native-chunk-appender-strategy.ts";
import { PreparedInsertStrategy } from "../../src/loader/strategies/prepared-insert/prepared-insert-strategy.ts";
import { RowAppenderStrategy } from "../../src/loader/strategies/row-appender/row-appender-strategy.ts";
import type { LoadStrategy } from "../../src/loader/types.ts";

/**
 * Create a strategy, with its own default `chunkSize` when none is given.
 */
export type LoadStrategyFactory = (chunkSize?: number) => LoadStrategy;

/**
 * The load strategies a test can be run on, as `[name, factory]` tuples
 * suitable for `describe.each` / `it.each`.
 *
 * @example
 * ```typescript
 * describe.each(loadStrategies)("%s", (name, createStrategy) => {
 *   it("should load", async ({ conn }) => {
 *     await new DuckTableLoader({ conn, strategy: createStrategy(1000) }).load({
 *       table: new Table(`my_table_${name}`),
 *       schema,
 *       rows,
 *       mode: "createOrReplace",
 *     });
 *   });
 * });
 * ```
 */
export const loadStrategies: [name: string, create: LoadStrategyFactory][] = [
  [
    "ChunkAppenderStrategy",
    (chunkSize) => new ChunkAppenderStrategy({ chunkSize }),
  ],
  [
    "NativeChunkAppenderStrategy",
    (chunkSize) => new NativeChunkAppenderStrategy({ chunkSize }),
  ],
  [
    "RowAppenderStrategy",
    (chunkSize) => new RowAppenderStrategy({ chunkSize }),
  ],
  [
    "PreparedInsertStrategy",
    (chunkSize) => new PreparedInsertStrategy({ chunkSize }),
  ],
];

/**
 * Table name unique per strategy, so tests of the same file can share a
 * connection.
 */
export const strategyTableName = (base: string, strategyName: string) =>
  `${base}_${strategyName.replace(/Strategy$/, "").toLowerCase()}`;
