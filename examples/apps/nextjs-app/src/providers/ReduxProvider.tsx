'use client';

import type { FC, PropsWithChildren } from 'react';
import { useRef } from 'react';
import { Provider } from 'react-redux';

import { type AppStore, makeReduxStore } from '@/redux/redux-store';

export const ReduxStoreProvider: FC<PropsWithChildren> = (props) => {
  const { children } = props;
  const storeRef = useRef<AppStore>(undefined);

  // create the redux store instance in the client to avoid leaking in ssr context
  storeRef.current ??= makeReduxStore();

  return <Provider store={storeRef.current}>{children}</Provider>;
};
