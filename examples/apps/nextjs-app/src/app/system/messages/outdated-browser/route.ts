import type { NextRequest } from 'next/server';

import { OutdatedBrowserHtml } from './OutdatedBrowserHtml';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const jsx = await OutdatedBrowserHtml({
    lang: 'en',
  });
  return new Response(renderToStaticMarkup(jsx), {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
