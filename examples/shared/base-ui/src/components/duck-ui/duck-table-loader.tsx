'use client';

import { Badge } from '@examples/base-ui/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@examples/base-ui/components/ui/card';
import { Progress } from '@examples/base-ui/components/ui/progress';
import { Skeleton } from '@examples/base-ui/components/ui/skeleton';
import { Spinner } from '@examples/base-ui/components/ui/spinner';
import { cn } from '@examples/base-ui/lib/utils';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  TableIcon,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of each newline-delimited JSON chunk emitted by the server */
export type DuckTableLoaderChunk = {
  totalRows: number;
  timeMs: number;
  /** Optional 0-100 progress percentage */
  progress?: number;
  /** If present the stream is considered failed */
  error?: string;
};

type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

export type DuckTableLoaderProps = {
  /** Display name of the table being populated */
  tableName: string;
  /** Optional subtitle */
  description?: string;
  /**
   * A `ReadableStream<Uint8Array>` – typically `response.body` from a `fetch()`.
   * Each newline-terminated chunk must be a JSON object matching `DuckTableLoaderChunk`.
   * Pass `null` / `undefined` to keep the card in idle state.
   */
  stream?: ReadableStream<Uint8Array> | null;
  /** Called once when the stream fully completes */
  onComplete?: (result: { totalRows: number; timeMs: number }) => void;
  /** Called when the stream errors */
  onError?: (error: Error) => void;
  className?: string;
};

// ─── Internal state ───────────────────────────────────────────────────────────

type InternalState = {
  status: LoadingStatus;
  totalRows: number | undefined;
  timeMs: number | undefined;
  progress: number | undefined;
  errorMessage: string | undefined;
  /** true once we received at least one valid chunk */
  hasFirstChunk: boolean;
};

const INITIAL_STATE: InternalState = {
  status: 'idle',
  totalRows: undefined,
  timeMs: undefined,
  progress: undefined,
  errorMessage: undefined,
  hasFirstChunk: false,
};

// ─── Badge config ─────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const STATUS_BADGE: Record<
  LoadingStatus,
  { label: string; variant: BadgeVariant; icon: React.ReactNode }
> = {
  idle: {
    label: 'Idle',
    variant: 'outline',
    icon: <CircleDotIcon className="size-3" />,
  },
  loading: {
    label: 'Loading',
    variant: 'secondary',
    icon: <Spinner className="size-3" />,
  },
  success: {
    label: 'Done',
    variant: 'default',
    icon: <CheckCircle2Icon className="size-3" />,
  },
  error: {
    label: 'Error',
    variant: 'destructive',
    icon: <AlertCircleIcon className="size-3" />,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DuckTableLoader({
  tableName,
  description,
  stream,
  onComplete,
  onError,
  className,
}: DuckTableLoaderProps) {
  const [state, setState] = useState<InternalState>(INITIAL_STATE);

  // Keep stable refs so the effect closure always sees the latest callbacks
  // without needing them as dependencies (avoids re-subscribing to the stream).
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  // Update refs after every render (never during render – satisfies react-compiler rules).
  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!stream) {
      // Defer setState so it runs in a callback, not synchronously in the effect body.
      let active = true;
      queueMicrotask(() => {
        if (active) setState(INITIAL_STATE);
      });
      return () => {
        active = false;
      };
    }

    // Defer so setState is not called synchronously inside the effect body.
    queueMicrotask(() => setState({ ...INITIAL_STATE, status: 'loading' }));

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let cancelled = false;
    // Tracks the latest emitted stats so onComplete can receive them
    // without reading from a setState updater (which must stay pure).
    const latestStats = { totalRows: 0, timeMs: 0 };

    function processLine(line: string) {
      try {
        const chunk = JSON.parse(line) as DuckTableLoaderChunk;
        if (chunk.error) {
          const err = new Error(chunk.error);
          setState((prev) => ({
            ...prev,
            status: 'error',
            errorMessage: chunk.error,
          }));
          onErrorRef.current?.(err);
          return;
        }
        latestStats.totalRows = chunk.totalRows;
        latestStats.timeMs = chunk.timeMs;
        setState((prev) => ({
          ...prev,
          status: 'loading',
          totalRows: chunk.totalRows,
          timeMs: chunk.timeMs,
          progress: chunk.progress,
          hasFirstChunk: true,
        }));
      } catch {
        // Silently skip non-JSON lines (keep-alive pings, etc.)
      }
    }

    /** Drain all complete newline-delimited lines from the current buffer. */
    function flushBuffer() {
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (line) processLine(line);
      }
    }

    /** Called once the stream signals `done`. */
    function handleStreamEnd() {
      // Flush any remaining buffered text (stream without trailing newline).
      const tail = buffer.trim();
      if (tail) processLine(tail);
      setState((prev) => ({ ...prev, status: 'success' }));
      // Call the callback outside the updater so the updater stays pure.
      onCompleteRef.current?.(latestStats);
    }

    async function consume() {
      try {
        let isDone = false;
        while (!isDone) {
          const result = await reader.read();
          if (cancelled) return;
          isDone = result.done;
          if (isDone) {
            handleStreamEnd();
            return;
          }
          buffer += decoder.decode(result.value, { stream: true });
          flushBuffer();
        }
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: error.message,
        }));
        onErrorRef.current?.(error);
      }
    }

    void consume();

    return () => {
      cancelled = true;
      reader.cancel().catch(() => {
        // ignore cancel errors on cleanup
      });
    };
  }, [stream]);

  const { status, totalRows, timeMs, progress, errorMessage, hasFirstChunk } =
    state;
  const badge = STATUS_BADGE[status];
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const showSkeletons = isLoading && !hasFirstChunk;
  const showStats =
    (status === 'success' || (isLoading && hasFirstChunk)) &&
    (totalRows !== undefined || timeMs !== undefined);

  return (
    <Card className={cn('w-full max-w-md', className)}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <CardHeader className="border-b">
        <div
          data-slot="card-action"
          className="col-start-2 row-span-2 row-start-1 self-start justify-self-end"
        >
          <Badge variant={badge.variant} className="flex items-center gap-1">
            {badge.icon}
            {badge.label}
          </Badge>
        </div>

        <CardTitle className="flex items-center gap-2 truncate">
          <TableIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-sm">{tableName}</span>
        </CardTitle>

        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <CardContent className="flex flex-col gap-4 pt-4">
        {/* Determinate / indeterminate progress bar while loading */}
        {isLoading && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {progress === undefined ? 'Processing…' : 'Progress'}
              </span>
              {progress !== undefined && (
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {Math.round(progress)}%
                </span>
              )}
            </div>
            <Progress value={progress ?? null} />
          </div>
        )}

        {/* Skeleton placeholders while waiting for the first chunk */}
        {showSkeletons && (
          <div className="grid grid-cols-2 gap-3">
            <SkeletonStat />
            <SkeletonStat />
          </div>
        )}

        {/* Live / final stats */}
        {showStats && (
          <dl className="grid grid-cols-2 gap-3">
            {totalRows !== undefined && (
              <StatCell
                label="Rows inserted"
                value={totalRows.toLocaleString()}
                highlight={isLoading}
              />
            )}
            {timeMs !== undefined && (
              <StatCell
                label="Duration"
                value={`${(timeMs / 1000).toFixed(2)} s`}
              />
            )}
          </dl>
        )}

        {/* Error message */}
        {isError && errorMessage && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
            {errorMessage}
          </p>
        )}

        {/* Idle prompt */}
        {status === 'idle' && (
          <p className="text-center text-xs text-muted-foreground">
            Waiting for stream…
          </p>
        )}
      </CardContent>

      {/* ── Footer – animated stripe during loading ─────────────────────── */}
      {isLoading && (
        <CardFooter className="border-t pt-3 pb-3">
          <IndeterminateBar />
        </CardFooter>
      )}
    </Card>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'font-mono text-sm font-medium tabular-nums transition-colors',
          highlight && 'text-primary'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 px-3 py-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

function IndeterminateBar() {
  return (
    <div
      aria-hidden="true"
      className="h-1 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full w-1/3 rounded-full bg-primary"
        style={{ animation: 'duck-slide 1.4s ease-in-out infinite' }}
      />
      <style>{`
        @keyframes duck-slide {
          0%   { transform: translateX(-150%); }
          100% { transform: translateX(450%); }
        }
      `}</style>
    </div>
  );
}
