'use client';

import NextError from 'next/error';
import { useEffect } from 'react';

import { clientEnv } from '../env/client.env';

type Props = {
  error: Error & { digest?: string };
};

const sendToSentry = async (error: Props['error']) => {
  await import('@sentry/nextjs').then((sentry) => {
    sentry.captureException(error);
  });
};

export default function GlobalError(props: Readonly<Props>) {
  const { error } = props;
  useEffect(() => {
    if (clientEnv.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
      sendToSentry(error).catch((e) => {
        console.error('Failed to send error to Sentry:', (e as Error)?.message);
      });
    }
  }, [error]);

  return (
    <html lang={'en'}>
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
