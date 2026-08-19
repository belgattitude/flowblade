"use client";

import type { FC, PropsWithChildren } from "react";
import { useRef } from "react";
import { Provider } from "react-redux";

import { makeReduxStore } from "@/redux/redux-store";
import type { AppStore } from "@/redux/redux-store";

export const ReduxStoreProvider: FC<PropsWithChildren> = (props) => {
  const { children } = props;
  const storeRef = useRef<AppStore>(null);

  // create the redux store instance in the client to avoid leaking in ssr context
  storeRef.current ??= makeReduxStore();

  // There's no other possibility afaik
  // eslint-disable-next-line react-hooks/refs
  return <Provider store={storeRef.current}>{children}</Provider>;
};
