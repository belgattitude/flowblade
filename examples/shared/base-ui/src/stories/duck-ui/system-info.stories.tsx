import type { Meta, StoryObj } from "@storybook/react-vite";

import type { DiskInfo } from "../../components/duck-ui/system-info";
import { SystemInfo } from "../../components/duck-ui/system-info";
// ─── Helpers ─────────────────────────────────────────────────────────────────
const GiB = 1024 ** 3;
const MiB = 1024 ** 2;

// ─── Reusable disk fixtures ───────────────────────────────────────────────────
const normalDisks: DiskInfo[] = [
  { freeBytes: 320 * GiB, path: "/", totalBytes: 500 * GiB },
  { freeBytes: 1100 * GiB, path: "/data", totalBytes: 2048 * GiB },
];

const highDiskUsageDisks: DiskInfo[] = [
  { freeBytes: 80 * GiB, path: "/", totalBytes: 500 * GiB },
  { freeBytes: 200 * GiB, path: "/data", totalBytes: 2048 * GiB },
];

const criticalDiskDisks: DiskInfo[] = [
  { freeBytes: 18 * GiB, path: "/", totalBytes: 500 * GiB },
];

const windowsDisks: DiskInfo[] = [
  { freeBytes: 60 * GiB, path: "C:\\", totalBytes: 256 * GiB },
  { freeBytes: 700 * GiB, path: "D:\\", totalBytes: 1024 * GiB },
  { freeBytes: 3800 * GiB, path: "E:\\", totalBytes: 4096 * GiB },
];

// ─── Meta ─────────────────────────────────────────────────────────────────────
const meta = {
  args: {
    availableParallelism: 8,
    freeMemory: 8 * GiB,
    title: "System Info",
    totalMemory: 16 * GiB,
  },
  component: SystemInfo,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "duck-ui/SystemInfo",
} satisfies Meta<typeof SystemInfo>;

export default meta;
type Story = StoryObj<typeof meta>;
// ─── Stories ─────────────────────────────────────────────────────────────────
/**
 * Healthy state – memory usage around 50%, normal disk usage.
 */
export const Normal: Story = {
  args: {
    availableParallelism: 8,
    description: "DuckDB worker — stable memory usage",
    disks: normalDisks,
    freeMemory: 8 * GiB,
    totalMemory: 16 * GiB,
  },
};

/**
 * Memory usage above 70% — stats turn amber to signal pressure.
 */
export const HighMemory: Story = {
  args: {
    availableParallelism: 8,
    description: "DuckDB worker — elevated memory usage",
    disks: normalDisks,
    freeMemory: 3 * GiB,
    totalMemory: 16 * GiB,
  },
};

/**
 * Memory usage above 90% — stats turn red (critical pressure).
 */
export const CriticalMemory: Story = {
  args: {
    availableParallelism: 8,
    description: "DuckDB worker — critical memory pressure",
    disks: normalDisks,
    freeMemory: 0.8 * GiB,
    totalMemory: 16 * GiB,
  },
};

/**
 * Disk usage above 70% — disk bars turn amber.
 */
export const HighDiskUsage: Story = {
  args: {
    availableParallelism: 8,
    description: "Elevated disk usage on root and data volumes",
    disks: highDiskUsageDisks,
    freeMemory: 8 * GiB,
    totalMemory: 16 * GiB,
  },
};

/**
 * Disk usage above 90% on root — bar turns red.
 */
export const CriticalDisk: Story = {
  args: {
    availableParallelism: 8,
    description: "Root disk nearly full",
    disks: criticalDiskDisks,
    freeMemory: 8 * GiB,
    totalMemory: 16 * GiB,
  },
};

/**
 * Windows-style drive letters.
 */
export const WindowsDisks: Story = {
  args: {
    availableParallelism: 12,
    description: "Multi-drive Windows machine",
    disks: windowsDisks,
    freeMemory: 16 * GiB,
    title: "Windows Worker",
    totalMemory: 32 * GiB,
  },
};

/**
 * No disks provided — disk section is hidden.
 */
export const NoDiskInfo: Story = {
  args: {
    availableParallelism: 8,
    description: "Disk info not available",
    freeMemory: 8 * GiB,
    totalMemory: 16 * GiB,
  },
};

/**
 * A small machine (e.g. constrained Docker container / CI runner).
 */
export const SmallMachine: Story = {
  args: {
    availableParallelism: 2,
    description: "Limited memory environment",
    disks: [{ freeBytes: 5 * GiB, path: "/", totalBytes: 20 * GiB }],
    freeMemory: 512 * MiB,
    title: "CI Runner",
    totalMemory: 2 * GiB,
  },
};

/**
 * A large server with many cores and lots of RAM — nearly empty.
 */
export const LargeServer: Story = {
  args: {
    availableParallelism: 64,
    description: "High-memory production node",
    disks: [
      { freeBytes: 460 * GiB, path: "/", totalBytes: 500 * GiB },
      {
        freeBytes: 14 * 1024 * GiB,
        path: "/data",
        totalBytes: 16 * 1024 * GiB,
      },
      { freeBytes: 3900 * GiB, path: "/scratch", totalBytes: 4096 * GiB },
    ],
    freeMemory: 120 * GiB,
    title: "Analytics Server",
    totalMemory: 128 * GiB,
  },
};

/**
 * Custom title and description props.
 */
export const CustomTitle: Story = {
  args: {
    availableParallelism: 16,
    description: "Ingestion pipeline — main instance",
    disks: normalDisks,
    freeMemory: 18 * GiB,
    title: "sqlduck worker node",
    totalMemory: 32 * GiB,
  },
};
