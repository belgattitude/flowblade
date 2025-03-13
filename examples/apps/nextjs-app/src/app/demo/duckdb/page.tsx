import { DuckdbDemoPage } from '@/features/demo/duckdb/pages/duckdb-demo-page';

export const dynamic = 'force-dynamic';

export default async function DemoDuckdbRoute() {
  return <DuckdbDemoPage />;
}
