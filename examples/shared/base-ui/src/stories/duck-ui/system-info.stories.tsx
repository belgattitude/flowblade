import type { Meta, StoryObj } from '@storybook/react-vite';

import { SystemInfo } from '../../components/duck-ui/system-info';
// ─── Helpers ─────────────────────────────────────────────────────────────────
const GiB = 1024 ** 3;
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
 * Healthy state – memory usage around 50%, plenty of free memory.
 */
export const Normal: Story = {
  args: {
    totalMemory: 16 * GiB,
    freeMemory: 8 * GiB,
    availableParallelism: 8,
    description: 'DuckDB worker — stable memory usage',
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
  },
};
/**
 * A small machine (e.g. constrained Docker container / CI runner).
 */
export const SmallMachine: Story = {
  args: {
    totalMemory: 2 * GiB,
    freeMemory: 512 * 1024 * 1024,
    availableParallelism: 2,
    title: 'CI Runner',
    description: 'Limited memory environment',
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
  },
};
