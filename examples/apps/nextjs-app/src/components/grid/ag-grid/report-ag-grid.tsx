import type {
  SizeColumnsToContentStrategy,
  SizeColumnsToFitGridStrategy,
  SizeColumnsToFitProvidedWidthStrategy,
} from 'ag-grid-community';
import type { AgGridReact, AgGridReactProps } from 'ag-grid-react';
import { type FC, useRef } from 'react';

import { cn } from '@/components/utils';

import { AgGrid } from './core/ag-grid';

type Props<T = unknown> = AgGridReactProps<T> & {
  className?: string;
  gridClassName?: string;
};

const defaultAutosizeStrategy = { type: 'fitCellContents' } as const satisfies
  | SizeColumnsToFitGridStrategy
  | SizeColumnsToFitProvidedWidthStrategy
  | SizeColumnsToContentStrategy;

export const ReportAgGrid: FC<Props> = (props) => {
  const { className, gridClassName, ...restProps } = props;

  const gridRef = useRef<AgGridReact>(null);

  return (
    <div className={cn('flex', className)}>
      <AgGrid
        ref={gridRef}
        className={cn('flex-1', gridClassName)}
        autoSizeStrategy={defaultAutosizeStrategy}
        {...restProps}
      />
    </div>
  );
};
