import { configure } from "@logtape/logtape";
import type { LogRecord } from "@logtape/logtape";

import { flowbladeLogtapeSqlduckConfig } from "../../src/index.ts";

export const configureTestLogger = async (logBuffer: LogRecord[]) =>
  await configure({
    sinks: {
      buffer: (record) => {
        logBuffer.push(record);
      },
    },
    loggers: [
      {
        category: ["logtape", "meta"],
        lowestLevel: "error",
        sinks: ["buffer"],
      },
      {
        category: flowbladeLogtapeSqlduckConfig.categories,
        lowestLevel: "debug",
        sinks: ["buffer"],
      },
    ],
  });
