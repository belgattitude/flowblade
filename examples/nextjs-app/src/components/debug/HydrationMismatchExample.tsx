'use client';

import type { FC } from 'react';

const isBrowser = 'window' in globalThis;

export const HydrationMismatchExample: FC = () => {
  return (
    <div>
      {isBrowser ? (
        <span>BROWSER RENDERED SPAN</span>
      ) : (
        <div>SERVER RENDERED DIV</div>
      )}
    </div>
  );
};
