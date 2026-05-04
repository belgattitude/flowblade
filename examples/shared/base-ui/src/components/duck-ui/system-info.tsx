'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@examples/base-ui/components/ui/card';
import { Progress } from '@examples/base-ui/components/ui/progress';
import { cn } from '@examples/base-ui/lib/utils';
import { CpuIcon, MemoryStickIcon } from 'lucide-react';
// ─── Types ────────────────────────────────────────────────────────────────────
export type SystemInfoProps = {
  /**
   * Free memory in bytes (e.g. from `os.freemem()`).
   */
  freeMemory: number;
  /**
   * Total memory in bytes (e.g. from `os.totalmem()`).
   */
  totalMemory: number;
  /**
   * Number of logical CPUs available (e.g. from `os.availableParallelism()`).
   */
  availableParallelism: number;
  /** Optional card title override. Defaults to "System Info". */
  title?: string;
  /** Optional subtitle */
  description?: string;
  className?: string;
};
// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Format bytes into a human-readable string (GiB / MiB / KiB / B). */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}
/** Returns a Tailwind colour class based on usage percentage. */
function usageColour(pct: number): string {
  if (pct >= 90) return 'text-destructive';
  if (pct >= 70) return 'text-amber-500';
  return 'text-emerald-500';
}
// ─── Component ───────────────────────────────────────────────────────────────
export function SystemInfo({
  freeMemory,
  totalMemory,
  availableParallelism,
  title = 'System Info',
  description,
  className,
}: SystemInfoProps) {
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePct =
    totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0;
  return (
    <Card className={cn('w-full max-w-md', className)}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <CpuIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold">{title}</span>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {/* ── Content ─────────────────────────────────────────────────────── */}
      <CardContent className="flex flex-col gap-5 pt-4">
        {/* Memory section */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <MemoryStickIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Memory</span>
          </div>
          {/* Progress bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatBytes(usedMemory)} used of {formatBytes(totalMemory)}
              </span>
              <span
                className={cn(
                  'ml-auto text-xs font-medium tabular-nums',
                  usageColour(memoryUsagePct)
                )}
              >
                {memoryUsagePct}%
              </span>
            </div>
            <Progress value={memoryUsagePct} />
          </div>
          {/* Memory stat grid */}
          <dl className="grid grid-cols-3 gap-2 pt-1">
            <MemoryStat
              label="Used"
              value={formatBytes(usedMemory)}
              highlight={memoryUsagePct >= 70}
            />
            <MemoryStat label="Free" value={formatBytes(freeMemory)} />
            <MemoryStat label="Total" value={formatBytes(totalMemory)} />
          </dl>
        </section>
        {/* Divider */}
        <div className="h-px bg-border" />
        {/* CPU / parallelism section */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <CpuIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">CPU</span>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            <StatCell
              label="Available threads"
              value={availableParallelism.toString()}
            />
            <StatCell
              label="Memory pressure"
              value={
                memoryUsagePct >= 90
                  ? 'Critical'
                  : memoryUsagePct >= 70
                    ? 'High'
                    : 'Normal'
              }
              valueClassName={usageColour(memoryUsagePct)}
            />
          </dl>
        </section>
      </CardContent>
    </Card>
  );
}
// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCell({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'font-mono text-sm font-medium tabular-nums',
          valueClassName
        )}
      >
        {value}
      </dd>
    </div>
  );
}
function MemoryStat({
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
          highlight && 'text-amber-500'
        )}
      >
        {value}
      </dd>
    </div>
  );
}
