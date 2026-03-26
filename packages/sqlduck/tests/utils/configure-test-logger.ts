import { configure, type LogRecord } from '@logtape/logtape';

import { flowbladeLogtapeSqlduckConfig } from '../../src/index.ts';

export const configureTestLogger = async (logBuffer: LogRecord[]) => {
  return await configure({
    sinks: {
      buffer: logBuffer.push.bind(logBuffer),
    },
    loggers: [
      {
        category: ['logtape', 'meta'],
        lowestLevel: 'error',
        sinks: ['buffer'],
      },
      {
        category: flowbladeLogtapeSqlduckConfig.categories,
        lowestLevel: 'debug',
        sinks: ['buffer'],
      },
    ],
  });
};
