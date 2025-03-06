'use client';

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// https://www.ag-grid.com/react-data-grid/getting-started/
ModuleRegistry.registerModules([AllCommunityModule]);

export { AgGridReact as AgGrid } from 'ag-grid-react';
