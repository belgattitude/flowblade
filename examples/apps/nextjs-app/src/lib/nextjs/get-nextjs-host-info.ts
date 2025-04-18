const isBrowser = typeof window !== 'undefined';

const getVercelUrl = (): string | undefined => {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (!vercelEnv) {
    return undefined;
  }
  return process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
};

/**
 * Utility to infer the nextjs local server info (ie: port, url)
 */
export const getNextjsHostInfo = (params?: {
  defaultPort?: number;
}): {
  baseUrl: string;
} => {
  const { defaultPort = 3000 } = params ?? {};
  const port = process.env.PORT ?? defaultPort;
  if (isBrowser) {
    return {
      baseUrl: `${window.location.protocol}://${window.location.hostname}:${window.location.port}`,
    };
  }
  return {
    baseUrl:
      process.env.BASE_URL ?? getVercelUrl() ?? `http://localhost:${port}`,
  };
};
