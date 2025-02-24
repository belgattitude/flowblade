'use client';

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import type { AgGridReactProps } from 'ag-grid-react';
import dynamic from 'next/dynamic';

// https://www.ag-grid.com/react-data-grid/getting-started/
ModuleRegistry.registerModules([AllCommunityModule]);

const _DynamicAgGrid = dynamic(
  () => import('ag-grid-react').then((mod) => mod.AgGridReact),
  {
    ssr: false,
  }
);

export const DynamicAgGrid = <TData,>(props: AgGridReactProps<TData>) => {
  return <_DynamicAgGrid {...(props as AgGridReactProps<unknown>)} />;
};
