import { getNextjsHostInfo } from '@/lib/nextjs/get-nextjs-host-info';

const { baseUrl } = getNextjsHostInfo({ defaultPort: 3000 });

export const apiLocalConfig = {
  apiUrl: `${baseUrl}/api`,
  schemaUrl: `${baseUrl}/api/openapi`,
} as const;
