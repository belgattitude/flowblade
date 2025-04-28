import { DuckdbWasmDemoPage } from '@/features/demo/duckdb-wasm/pages/duckdb-wasm-demo-page';

export const dynamic = 'force-dynamic';

export default async function DemoDuckdbWasmRoute() {
  return <DuckdbWasmDemoPage />;
}
