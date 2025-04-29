import type * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    try {
      if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('../sentry.server.config');
      }

      if (process.env.NEXT_RUNTIME === 'edge') {
        await import('../sentry.edge.config');
      }
    } catch (error) {
      console.error('[Instrumentation] Failed to register Sentry.', error);
    }
  }
}

let captureRequestError: typeof Sentry.captureRequestError | undefined;

if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
  try {
    captureRequestError = await import('@sentry/nextjs').then(
      (mod) => mod.captureRequestError
    );
  } catch (error) {
    console.error(
      '[Instrumentation] Failed to load Sentry captureRequestError function.',
      error
    );
  }
}

export const onRequestError = captureRequestError;
