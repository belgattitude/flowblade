"use client";

import { PrimeReactProvider } from "primereact/api";
import type { FC, PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

const providerValue = {
  // Will add  as a pass through preset based on PrimeOne Design
  // @link https://primereact.org/tailwind/#unstyledmode
  unstyled: false,
  pt: {},
  ptOptions: {
    classNameMergeFunction: twMerge,
    mergeProps: true,
    mergeSections: true,
  },
};

export const PrimeReactTailwindProvider: FC<PropsWithChildren> = (props) => (
  <PrimeReactProvider value={providerValue}>
    {props.children}
  </PrimeReactProvider>
);
