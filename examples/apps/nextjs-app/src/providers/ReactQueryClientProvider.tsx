'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { FC, PropsWithChildren } from 'react';
import { useState } from 'react';

import { queryClientConfig } from '@/config/react-query.config';

import { clientEnv } from '../env/client.env.mjs';

type Props = PropsWithChildren & {
  /**
   * React query devtools are automatically when process.env.NODE_ENV !== 'development'.
   * For environement like storybook (watch) for example, it can be possible to disable them
   * @link https://tanstack.com/query/latest/docs/framework/react/devtools
   */
  forceDisableDevTools?: boolean | undefined;
};

export const ReactQueryClientProvider: FC<Props> = (props) => {
  const {
    children,
    forceDisableDevTools = clientEnv.NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED ===
      'false',
  } = props;
  const [client] = useState(new QueryClient(queryClientConfig));
  return (
    <QueryClientProvider client={client}>
      {children}
      {forceDisableDevTools !== true && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition={'bottom-left'}
        />
      )}
    </QueryClientProvider>
  );
};
