"use client";

import dynamic from "next/dynamic";
import type { FC } from "react";

const DuckdbWasmTestPanel = dynamic(
  () =>
    import("@/features/demo/duckdb-wasm/components/duck-wasm-test-panel").then(
      (mod) => mod.DuckdbWasmTestPanel
    ),
  { ssr: false }
);

export const DuckdbWasmDemoPage: FC = () => (
  <div>
    <DuckdbWasmTestPanel />
  </div>
);
