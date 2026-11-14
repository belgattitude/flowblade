"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { FC, PropsWithChildren } from "react";

import { getQueryClient } from "@/lib/react-query/get-query-client";

import { clientEnv } from "../env/client.env.mjs";

type Props = PropsWithChildren & {
  /**
   * React query devtools are automatically enabled when process.env.NODE_ENV === 'development'.
   * For environement like storybook (watch) for example, it can be possible to disable them
   * @see https://tanstack.com/query/latest/docs/framework/react/devtools
   */
  forceDisableDevTools?: boolean | undefined;
};

export const ReactQueryClientProvider: FC<Props> = (props) => {
  const { children } = props;
  const forceDisableDevTools =
    props.forceDisableDevTools ??
    clientEnv.NEXT_PUBLIC_REACT_QUERY_DEVTOOLS_ENABLED === "false";
  // NOTE: do not use useState here, React discards it if this suspends on initial mount
  const client = getQueryClient();
  return (
    <QueryClientProvider client={client}>
      {children}
      {!forceDisableDevTools && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
};
