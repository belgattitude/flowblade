const isBrowser = globalThis.window !== undefined;

const getVercelUrl = (): string | undefined => {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (vercelEnv === undefined || vercelEnv === "") {
    return undefined;
  }
  const host =
    vercelEnv === "preview"
      ? process.env.NEXT_PUBLIC_VERCEL_URL
      : process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  return host === undefined || host === "" ? undefined : `https://${host}`;
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
  if (isBrowser) {
    return {
      baseUrl: window.location.origin,
    };
  }
  const port = process.env.PORT ?? defaultPort;
  return {
    baseUrl:
      process.env.BASE_URL ?? getVercelUrl() ?? `http://localhost:${port}`,
  };
};
