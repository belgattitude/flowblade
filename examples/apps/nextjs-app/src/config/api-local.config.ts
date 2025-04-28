import { getNextjsHostInfo } from '@/lib/nextjs/get-nextjs-host-info';

const { baseUrl } = getNextjsHostInfo({ defaultPort: 3000 });

export const apiLocalConfig = {
  apiUrl: `${baseUrl}/api`,
  apiReference: {
    path: '/reference',
    theme: 'default',
    url: '/api/openapi',
  },
  openapiSchemaUrl: `${baseUrl}/api/openapi`,
} as const;
