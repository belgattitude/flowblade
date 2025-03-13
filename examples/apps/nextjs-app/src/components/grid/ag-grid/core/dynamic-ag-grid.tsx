'use client';

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import type { AgGridReact, AgGridReactProps } from 'ag-grid-react';
import dynamic from 'next/dynamic';

// https://www.ag-grid.com/react-data-grid/getting-started/
ModuleRegistry.registerModules([AllCommunityModule]);

const DynamicallyLoadedAgGrid = dynamic(
  () =>
    import('ag-grid-react').then((mod): typeof AgGridReact => mod.AgGridReact),
  {
    ssr: false,
  }
);

export const DynamicAgGrid = <TData,>(props: AgGridReactProps<TData>) => {
  return <DynamicallyLoadedAgGrid {...(props as AgGridReactProps<unknown>)} />;
};
