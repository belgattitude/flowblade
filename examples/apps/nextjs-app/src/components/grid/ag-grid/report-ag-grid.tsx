import type { AgGridReactProps } from 'ag-grid-react';
import type { FC } from 'react';

import { cn } from '@/components/utils';

import { AgGrid } from './core/ag-grid';

type Props = AgGridReactProps & {
  className?: string;
};

export const ReportAgGrid: FC<Props> = (props) => {
  const { className } = props;
  return (
    <div className={cn('flex w-full h-full', className)}>
      <AgGrid {...props} />
    </div>
  );
};
