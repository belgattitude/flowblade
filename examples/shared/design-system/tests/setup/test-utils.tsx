import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach } from 'vitest';

import { AppTestProviders } from './app-test-providers';

/** Recommended in vitest only to cleanup context */
afterEach(() => {
  cleanup();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const customRender = (ui: ReactElement, options?: any) =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  render(ui, {
    wrapper: AppTestProviders,
    ...options,
  });

// re-export everything
// eslint-disable-next-line import-x/export
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// override render method
// eslint-disable-next-line import-x/export
export { customRender as render };
