// @link https://nextjs.org/docs/app/building-your-application/routing/route-handlers#convention

import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const payload = {
    message: 'Hello, World!',
  } as const;

  return NextResponse.json(payload, {
    status: 200,
  });
}
