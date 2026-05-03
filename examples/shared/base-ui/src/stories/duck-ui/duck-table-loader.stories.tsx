import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import type { DuckTableLoaderChunk } from '../../components/duck-ui/duck-table-loader';
import { DuckTableLoader } from '../../components/duck-ui/duck-table-loader';

// ─── Mock stream helper ───────────────────────────────────────────────────────

type MockStreamOptions = {
  chunks: DuckTableLoaderChunk[];
  /** Delay between chunks in ms */
  intervalMs?: number;
  /** Delay before the stream starts emitting */
  startDelayMs?: number;
};

/**
 * Build a `ReadableStream<Uint8Array>` that emits NDJSON lines at a given interval.
 * Mirrors what a real `fetch().body` stream would deliver.
 */
function createMockStream({
  chunks,
  intervalMs = 600,
  startDelayMs = 300,
}: MockStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let timerId: ReturnType<typeof setTimeout>;
  let index = 0;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      function sendNext() {
        if (index >= chunks.length) {
          controller.close();
          return;
        }
        const line = JSON.stringify(chunks[index++]) + '\n';
        controller.enqueue(encoder.encode(line));
        timerId = setTimeout(sendNext, intervalMs);
      }
      timerId = setTimeout(sendNext, startDelayMs);
    },
    cancel() {
      clearTimeout(timerId);
    },
  });
}

/**
 * A wrapper that lets each story re-start the stream on click.
 * Since a ReadableStream can only be consumed once, we create a new one on each run.
 */
function StreamDemo({
  makeStream,
  tableName,
  description,
}: {
  makeStream: () => ReadableStream<Uint8Array>;
  tableName: string;
  description?: string;
}) {
  // Lazy initializer – creates the stream once on mount without needing an effect.
  const [stream, setStream] = useState<ReadableStream<Uint8Array> | null>(() =>
    makeStream()
  );

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <DuckTableLoader
        tableName={tableName}
        description={description}
        stream={stream}
        onComplete={({ totalRows, timeMs }) =>
          console.log(`[onComplete] totalRows=${totalRows} timeMs=${timeMs}`)
        }
        onError={(err) => console.error('[onError]', err)}
      />
      <button
        type="button"
        onClick={() => setStream(makeStream())}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted"
      >
        ↺ Restart
      </button>
    </div>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'duck-ui/DuckTableLoader',
  component: DuckTableLoader,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  // Provide defaults so render-based stories satisfy the required `tableName` prop.
  args: {
    tableName: '',
  },
} satisfies Meta<typeof DuckTableLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** No stream provided – the card sits in idle state. */
export const Idle: Story = {
  args: {
    tableName: 'main.orders',
    description: 'Waiting for a fetch stream to be provided',
    stream: null,
  },
};

/**
 * A slow stream with indeterminate progress.
 * Updates arrive every 600 ms without a `progress` field.
 */
export const LoadingIndeterminate: Story = {
  render: () => (
    <StreamDemo
      tableName="analytics.events"
      description="Ingesting from API – indeterminate progress"
      makeStream={() =>
        createMockStream({
          intervalMs: 700,
          chunks: [
            { totalRows: 2048, timeMs: 210 },
            { totalRows: 4096, timeMs: 490 },
            { totalRows: 8192, timeMs: 910 },
            { totalRows: 12_288, timeMs: 1380 },
            { totalRows: 16_384, timeMs: 1800 },
          ],
        })
      }
    />
  ),
};

/**
 * A stream that reports `progress` 0-100 as it progresses.
 */
export const LoadingWithProgress: Story = {
  render: () => (
    <StreamDemo
      tableName="warehouse.sales"
      description="Ingesting with known row count"
      makeStream={() =>
        createMockStream({
          intervalMs: 600,
          chunks: [
            { totalRows: 10_000, timeMs: 300, progress: 10 },
            { totalRows: 30_000, timeMs: 900, progress: 30 },
            { totalRows: 50_000, timeMs: 1500, progress: 50 },
            { totalRows: 75_000, timeMs: 2200, progress: 75 },
            { totalRows: 100_000, timeMs: 3100, progress: 100 },
          ],
        })
      }
    />
  ),
};

/**
 * The stream completes immediately – shows the success state.
 */
export const Success: Story = {
  args: {
    tableName: 'main.products',
    description: 'Import complete',
    stream: createMockStream({
      startDelayMs: 0,
      intervalMs: 0,
      chunks: [{ totalRows: 125_952, timeMs: 3210 }],
    }),
  },
};

/**
 * The stream emits an error line partway through.
 */
export const Error: Story = {
  render: () => (
    <StreamDemo
      tableName="staging.raw_logs"
      description="Upload interrupted mid-stream"
      makeStream={() =>
        createMockStream({
          intervalMs: 600,
          chunks: [
            { totalRows: 4096, timeMs: 320 },
            { totalRows: 8192, timeMs: 710 },
            {
              totalRows: 8192,
              timeMs: 711,
              error: 'Connection reset by peer: upstream closed unexpectedly',
            },
          ],
        })
      }
    />
  ),
};

/**
 * A very large table – stress-tests the numeric formatting and layout.
 */
export const LargeTable: Story = {
  render: () => (
    <StreamDemo
      tableName="data_lake.clickstream_events_2024"
      description="Hydrating 1 billion+ rows from object storage"
      makeStream={() =>
        createMockStream({
          intervalMs: 500,
          chunks: [
            { totalRows: 10_000_000, timeMs: 800, progress: 1 },
            { totalRows: 100_000_000, timeMs: 8000, progress: 10 },
            { totalRows: 500_000_000, timeMs: 40_000, progress: 50 },
            { totalRows: 999_999_999, timeMs: 79_000, progress: 99 },
            { totalRows: 1_000_000_000, timeMs: 80_120, progress: 100 },
          ],
        })
      }
    />
  ),
};
