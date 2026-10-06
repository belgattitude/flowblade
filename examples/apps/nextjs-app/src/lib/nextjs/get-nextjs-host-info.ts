const isBrowser = globalThis.window !== undefined;

const getVercelUrl = (): string | undefined => {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (vercelEnv === null || vercelEnv === "") {
    return undefined;
  }
  return process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
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
