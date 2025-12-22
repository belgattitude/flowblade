'use client';

import dynamic from 'next/dynamic';
import type { FC } from 'react';

const DuckdbWasmTestPanel = dynamic(
  () => {
    return import('@/features/demo/duckdb-wasm/components/duck-wasm-test-panel').then(
      (mod) => {
        return mod.DuckdbWasmTestPanel;
      }
    );
  },
  { ssr: false }
);

export const DuckdbWasmDemoPage: FC = () => {
  return (
    <div>
      <DuckdbWasmTestPanel />
    </div>
  );
};
