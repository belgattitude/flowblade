---
"@flowblade/source-duckdb": minor
"@flowblade/source-kysely": minor
---

Add support for @logtape/logtape

Both source-duckdb and source-kysely now support [@logtape/logtape](https://github.com/dahlia/logtape) for logging. 
This allows users to easily integrate logging into their applications when using these sources.

Read the documentation on their [official website](https://logtape.org/).

## Example

### Nextjs

Add the file `src/server/config/logtape-server.config.ts` with the following content:

```typescript
import { flowbladeLogtapeDuckdbConfig } from '@flowblade/source-duckdb';
import { type Config, getConsoleSink } from '@logtape/logtape';
import { getOpenTelemetrySink } from '@logtape/otel';
import { getPrettyFormatter } from '@logtape/pretty';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_TELEMETRY_SDK_LANGUAGE } from '@opentelemetry/semantic-conventions';

import { serverEnv } from '../../env/server.env.mjs';

const otelEndpoint = serverEnv.OTEL_EXPORTER_OTLP_ENDPOINT;
const isOtelEnabled = otelEndpoint !== undefined && otelEndpoint.length > 0;

const otelSink = isOtelEnabled
  ? getOpenTelemetrySink({
      serviceName: 'service_name',
      otlpExporterConfig: {
        url: serverEnv.OTEL_EXPORTER_OTLP_ENDPOINT,
        keepAlive: true,
        // headers: { 'x-api-key': 'my-api-key' },
      },
      diagnostics: true,
      objectRenderer: 'json',
      additionalResource: resourceFromAttributes({
        [ATTR_TELEMETRY_SDK_LANGUAGE]: 'javascript',
      }),
    })
  : undefined;

const withLoggerOtelSink = (sinks: string[]) => {
  if (isOtelEnabled) {
    return [...sinks, 'otel'];
  }
  return sinks;
};

export const logtapeServerConfig = {
  sinks: {
    console: getConsoleSink({
      nonBlocking: {
        bufferSize: 1, // Flush after n records
        flushInterval: 30, // Flush every n ms
      },
      formatter: getPrettyFormatter({
        properties: true,
      }),
    }),
    ...(isOtelEnabled ? { otel: otelSink } : {}),
  },
  loggers: [
    // Log errors that can happen if the logger isn't working
    { category: ['logtape', 'meta'], lowestLevel: 'error', sinks: ['console'] },
    {
      category: ['logtape', 'meta', 'otel'],
      lowestLevel: 'error',
      sinks: ['console'],
    },
    // General logger for the app
    {
      category: 'app',
      lowestLevel: 'info',
      sinks: withLoggerOtelSink(['console']),
    },
    // Logger for duckdb
    {
      category: flowbladeLogtapeDuckdbConfig.categories,
      lowestLevel: 'info',
      sinks: withLoggerOtelSink(['console']),
    },
  ],
} as const satisfies Config<string, string>;
```

Initialize your `src/intrumentation.ts` file with:

```typescript
import { configure } from '@logtape/logtape';

import { logtapeServerConfig } from '@/server/config/logtape-server.config.ts';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await configure(logtapeServerConfig);
  }
}
```