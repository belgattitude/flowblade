const isBrowser = typeof window !== 'undefined';

export const BASE_URL =
  process.env.NEXT_PUBLIC_VERCEL_ENV == null ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;

const getVercelUrl = () => {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (!vercelEnv) {
    return null;
  }
  return process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
};

/**
 * Utility to infer the nextjs local server info (ie: port, url)
 */
export const getNextjsHostInfo = (params?: { defaultPort?: number }) => {
  const { defaultPort = 3000 } = params ?? {};
  const port = process.env.PORT ?? defaultPort;
  if (isBrowser) {
    return {
      url: `${window.location.protocol}://${window.location.hostname}:${window.location.port}`,
      port: window.location.port,
    };
  }
  return {
    baseUrl:
      process.env.BASE_URL ?? getVercelUrl() ?? `http://localhost:${port}`,
  };
};
