import { DynamicSwaggerUi } from '@/components/swagger/DynamicSwaggerUi';

export default function DevApiDocsRoute() {
  return <DynamicSwaggerUi url={'/api/doc'} />;
}
