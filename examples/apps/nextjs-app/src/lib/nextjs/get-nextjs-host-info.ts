const isBrowser = typeof window !== 'undefined';

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
    url: process.env.BASE_URL ?? `http://localhost:${port}`,
  };
};
