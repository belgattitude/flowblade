/**
 * Utility to infer the nextjs local server info (ie: port, url)
 */
export const getNextjsHostInfo = (params?: { defaultPort?: number }) => {
  const { defaultPort = 3000 } = params ?? {};
  const port =
    typeof window === 'undefined'
      ? (process.env.PORT ?? defaultPort)
      : defaultPort;
  const url = `http://localhost:${port}`;
  return {
    port,
    url,
  };
};
