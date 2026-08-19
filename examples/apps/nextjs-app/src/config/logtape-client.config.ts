import { getConsoleSink } from "@logtape/logtape";
import type { Config } from "@logtape/logtape";
import { prettyFormatter } from "@logtape/pretty";

export const logtapeClientConfig = {
  loggers: [
    // Log errors that can happen if the logger isn't working
    { category: ["logtape", "meta"], lowestLevel: "error", sinks: ["console"] },
    // General logger for the app
    { category: "app", lowestLevel: "info", sinks: ["console"] },
  ],
  sinks: {
    console: getConsoleSink({
      formatter: prettyFormatter,
      nonBlocking: {
        bufferSize: 1, // Flush after n record
        flushInterval: 30, // Flush every n ms
      },
    }),
  },
} as const satisfies Config<string, string>;
