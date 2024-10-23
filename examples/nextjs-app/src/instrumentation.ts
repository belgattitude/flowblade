import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('../sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('../sentry.edge.config');
    }
  }
}

export const onRequestError =
  process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true'
    ? Sentry.captureRequestError
    : (_error: unknown, _request: unknown, _errorContext: unknown) => void 0;
