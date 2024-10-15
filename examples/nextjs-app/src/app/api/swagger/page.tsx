import { DynamicSwaggerUi } from '@/components/swagger/DynamicSwaggerUi';

export default function SwaggerRoute() {
  return (
    <div suppressHydrationWarning={true}>
      <DynamicSwaggerUi url={'/api/doc'} />
    </div>
  );
}
