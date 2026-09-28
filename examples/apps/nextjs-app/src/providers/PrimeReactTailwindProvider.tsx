"use client";

import { cn } from "cn";
import { PrimeReactProvider } from "primereact/api";
import type { FC, PropsWithChildren } from "react";

const providerValue = {
  // Will add  as a pass through preset based on PrimeOne Design
  // @link https://primereact.org/tailwind/#unstyledmode
  unstyled: false,
  pt: {},
  ptOptions: {
    classNameMergeFunction: cn,
    mergeProps: true,
    mergeSections: true,
  },
};

export const PrimeReactTailwindProvider: FC<PropsWithChildren> = (props) => (
  <PrimeReactProvider value={providerValue}>
    {props.children}
  </PrimeReactProvider>
);
