import { getNextjsHostInfo } from "@/lib/nextjs/get-nextjs-host-info";

const { baseUrl } = getNextjsHostInfo({ defaultPort: 3000 });

export const apiLocalConfig = {
  apiReference: {
    path: "/reference",
    theme: "default",
    url: "/api/openapi.json",
  },
  apiUrl: `${baseUrl}/api`,
  baseUrl,
  openapiSchemaUrl: `${baseUrl}/api/openapi`,
} as const;
