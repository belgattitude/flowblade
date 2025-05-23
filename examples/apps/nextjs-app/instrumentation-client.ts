// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import { clientEnv } from './src/env/client.env.mjs';

if (clientEnv.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
  Sentry.init({
    // dsn: 'https://e98cc2e45a164688bc9e14113b801684@o937515.ingest.us.sentry.io/6328544',

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });
}

export const onRouterTransitionStart =
  clientEnv.NEXT_PUBLIC_SENTRY_ENABLED === 'true'
    ? Sentry.captureRouterTransitionStart
    : undefined;
