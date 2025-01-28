import { DuckdbDemoPage } from '@/features/demo/duckdb/DuckdbDemo.page';

export const dynamic = 'force-dynamic';

export default async function DemoDuckdbRoute() {
  return <DuckdbDemoPage />;
}
