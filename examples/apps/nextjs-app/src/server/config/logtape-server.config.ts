import { flowbladeLogtapeDuckdbConfig } from '@flowblade/source-duckdb';
import { type Config, getConsoleSink } from '@logtape/logtape';
import { getOpenTelemetrySink } from '@logtape/otel';
import { getPrettyFormatter } from '@logtape/pretty';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_TELEMETRY_SDK_LANGUAGE } from '@opentelemetry/semantic-conventions';

import { serverEnv } from '../../env/server.env.mjs';

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
    otel: getOpenTelemetrySink({
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
    }),
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
    { category: 'app', lowestLevel: 'info', sinks: ['console', 'otel'] },
    // Logger for duckdb
    {
      category: flowbladeLogtapeDuckdbConfig.categories,
      lowestLevel: 'info',
      sinks: ['console', 'otel'],
    },
  ],
} as const satisfies Config<string, string>;
