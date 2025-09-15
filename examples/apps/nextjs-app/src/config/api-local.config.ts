import { getNextjsHostInfo } from '@/lib/nextjs/get-nextjs-host-info';

const { baseUrl } = getNextjsHostInfo({ defaultPort: 3000 });

export const apiLocalConfig = {
  baseUrl: baseUrl,
  apiUrl: `${baseUrl}/api`,
  apiReference: {
    path: '/reference',
    theme: 'default',
    url: '/api/openapi.json',
  },
  openapiSchemaUrl: `${baseUrl}/api/openapi`,
} as const;
