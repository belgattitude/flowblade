import type { Meta, StoryObj } from '@storybook/react-vite';

import type { DiskInfo } from '../../components/duck-ui/system-info';
import { SystemInfo } from '../../components/duck-ui/system-info';
// ─── Helpers ─────────────────────────────────────────────────────────────────
const GiB = 1024 ** 3;
const MiB = 1024 ** 2;

// ─── Reusable disk fixtures ───────────────────────────────────────────────────
const normalDisks: DiskInfo[] = [
  { path: '/', totalBytes: 500 * GiB, freeBytes: 320 * GiB },
  { path: '/data', totalBytes: 2048 * GiB, freeBytes: 1100 * GiB },
];

const highDiskUsageDisks: DiskInfo[] = [
  { path: '/', totalBytes: 500 * GiB, freeBytes: 80 * GiB },
  { path: '/data', totalBytes: 2048 * GiB, freeBytes: 200 * GiB },
];

const criticalDiskDisks: DiskInfo[] = [
  { path: '/', totalBytes: 500 * GiB, freeBytes: 18 * GiB },
];

const windowsDisks: DiskInfo[] = [
  { path: 'C:\\', totalBytes: 256 * GiB, freeBytes: 60 * GiB },
  { path: 'D:\\', totalBytes: 1024 * GiB, freeBytes: 700 * GiB },
  { path: 'E:\\', totalBytes: 4096 * GiB, freeBytes: 3800 * GiB },
];

// ─── Meta ─────────────────────────────────────────────────────────────────────
const meta = {
  title: 'duck-ui/SystemInfo',
  component: SystemInfo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    totalMemory: 16 * GiB,
    freeMemory: 8 * GiB,
    availableParallelism: 8,
    title: 'System Info',
  },
} satisfies Meta<typeof SystemInfo>;

export default meta;
type Story = StoryObj<typeof meta>;
// ─── Stories ─────────────────────────────────────────────────────────────────
/**
 * Healthy state – memory usage around 50%, normal disk usage.
 */
export const Normal: Story = {
  args: {
    totalMemory: 16 * GiB,
    freeMemory: 8 * GiB,
    availableParallelism: 8,
    description: 'DuckDB worker — stable memory usage',
    disks: normalDisks,
  },
};

/**
 * Memory usage above 70% — stats turn amber to signal pressure.
 */
export const HighMemory: Story = {
  args: {
    totalMemory: 16 * GiB,
    freeMemory: 3 * GiB,
    availableParallelism: 8,
    description: 'DuckDB worker — elevated memory usage',
    disks: normalDisks,
  },
};

/**
 * Memory usage above 90% — stats turn red (critical pressure).
 */
export const CriticalMemory: Story = {
  args: {
    totalMemory: 16 * GiB,
    freeMemory: 0.8 * GiB,
    availableParallelism: 8,
    description: 'DuckDB worker — critical memory pressure',
    disks: normalDisks,
  },
};

/**
 * Disk usage above 70% — disk bars turn amber.
 */
export const HighDiskUsage: Story = {
  args: {
    totalMemory: 16 * GiB,
    freeMemory: 8 * GiB,
    availableParallelism: 8,
    description: 'Elevated disk usage on root and data volumes',
    disks: highDiskUsageDisks,
  },
};

/**
 * Disk usage above 90% on root — bar turns red.
 */
export const CriticalDisk: Story = {
  args: {
    totalMemory: 16 * GiB,
    freeMemory: 8 * GiB,
    availableParallelism: 8,
    description: 'Root disk nearly full',
    disks: criticalDiskDisks,
  },
};

/**
 * Windows-style drive letters.
 */
export const WindowsDisks: Story = {
  args: {
    totalMemory: 32 * GiB,
    freeMemory: 16 * GiB,
    availableParallelism: 12,
    title: 'Windows Worker',
    description: 'Multi-drive Windows machine',
    disks: windowsDisks,
  },
};

/**
 * No disks provided — disk section is hidden.
 */
export const NoDiskInfo: Story = {
  args: {
    totalMemory: 16 * GiB,
    freeMemory: 8 * GiB,
    availableParallelism: 8,
    description: 'Disk info not available',
  },
};

/**
 * A small machine (e.g. constrained Docker container / CI runner).
 */
export const SmallMachine: Story = {
  args: {
    totalMemory: 2 * GiB,
    freeMemory: 512 * MiB,
    availableParallelism: 2,
    title: 'CI Runner',
    description: 'Limited memory environment',
    disks: [{ path: '/', totalBytes: 20 * GiB, freeBytes: 5 * GiB }],
  },
};

/**
 * A large server with many cores and lots of RAM — nearly empty.
 */
export const LargeServer: Story = {
  args: {
    totalMemory: 128 * GiB,
    freeMemory: 120 * GiB,
    availableParallelism: 64,
    title: 'Analytics Server',
    description: 'High-memory production node',
    disks: [
      { path: '/', totalBytes: 500 * GiB, freeBytes: 460 * GiB },
      {
        path: '/data',
        totalBytes: 16 * 1024 * GiB,
        freeBytes: 14 * 1024 * GiB,
      },
      { path: '/scratch', totalBytes: 4096 * GiB, freeBytes: 3900 * GiB },
    ],
  },
};

/**
 * Custom title and description props.
 */
export const CustomTitle: Story = {
  args: {
    totalMemory: 32 * GiB,
    freeMemory: 18 * GiB,
    availableParallelism: 16,
    title: 'sqlduck worker node',
    description: 'Ingestion pipeline — main instance',
    disks: normalDisks,
  },
};
