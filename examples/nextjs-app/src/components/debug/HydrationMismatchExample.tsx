'use client';

import type { FC } from 'react';

export const HydrationMismatchExample: FC = () => {
  return (
    <div>
      {typeof window === 'undefined' ? (
        <div>SERVER RENDERED DIV</div>
      ) : (
        <span>BROWSER RENDERED SPAN</span>
      )}
    </div>
  );
};
