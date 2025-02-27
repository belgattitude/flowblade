import { getNextjsHostInfo } from '@/lib/nextjs/get-nextjs-host-info';

const { url } = getNextjsHostInfo({ defaultPort: 3000 });

export const apiLocalConfig = {
  apiUrl: `${url}/api`,
  schemaUrl: `${url}/api/doc`,
} as const;
