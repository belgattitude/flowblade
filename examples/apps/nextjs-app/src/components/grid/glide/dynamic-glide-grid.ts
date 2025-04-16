'use client';

import dynamic from 'next/dynamic';

export const DynamicGlideGrid = dynamic(
  () => {
    return import('./glide-grid').then((mod) => {
      return mod.GlideGrid;
    });
  },
  { ssr: false }
);
