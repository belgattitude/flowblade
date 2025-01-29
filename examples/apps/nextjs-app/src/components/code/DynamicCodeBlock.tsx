'use client';

import dynamic from 'next/dynamic';

export const DynamicCodeBlock = dynamic(
  () => import('./CodeBlock').then((mod) => mod.CodeBlock),
  {
    ssr: false,
  }
);
