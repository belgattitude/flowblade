'use client';

import { MIntl } from '@httpx/memo-intl';
import type { ColDef, GetRowIdParams, GridOptions } from 'ag-grid-community';
import { type FC, useCallback, useState } from 'react';

import { ReportAgGrid } from '@/components/grid/ag-grid/report-ag-grid';
import { cn } from '@/components/utils';
import { useGetApiProductEthicalSearchSuspenseHook } from '@/features/api/generated';
import type { EthicalProduct } from '@/features/products/server/ethical-product.repo.ts';
import { useSelector } from '@/redux/redux-hooks';

type Props = {
  className?: string;
};

const correction = new Map([['Hemp Backpack', { category: 'Hello' }]]);

const productColDefs: ColDef<EthicalProduct>[] = [
  { field: 'brand' },
  { field: 'label' },
  {
    field: 'price',
    editable: true,
    cellClass: 'text-right',
    valueGetter: (params) =>
      MIntl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        notation: 'compact',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(params.data!.price),
  },
  { field: 'stock' },
  { field: 'weight' },
  {
    field: 'category',
    editable: true,
    valueFormatter: (params) => {
      const { label } = params.data!;
      return correction.has(label)
        ? `${correction.get(label)!.category} (*)`
        : `${params.data?.category} (untouched)`;
    },
    valueSetter: (params) => {
      correction.set(params.data.label, {
        category: params.newValue as unknown as string,
      });
      return false;
    },
    cellStyle: (params) => {
      const { label } = params.data!;
      return correction.has(label)
        ? { backgroundColor: 'yellow' }
        : { backgroundColor: 'white' };
    },
  },
  { field: 'color' },
  {
    colId: '88',
    valueGetter: (params) => {
      const { label } = params.data!;
      return correction.has(label)
        ? `Changed ${correction.get(label)!.category} (*)`
        : `No changes`;
    },
  },
];

const autoSizeStrategy: GridOptions['autoSizeStrategy'] = {
  type: 'fitGridWidth',
  defaultMinWidth: 50,
};

export const ProductGrid: FC<Props> = (props) => {
  const { className } = props;
  const filter = useSelector((state) => state.productFilters.filters);
  const { data } = useGetApiProductEthicalSearchSuspenseHook({
    brands: filter.brands.map((b) => b.name),
    slowdownApiMs: filter.slowdownApiMs,
  });

  const [colDefs, _setColDefs] = useState<ColDef[]>(productColDefs);

  const getRowId = useCallback(
    (params: GetRowIdParams<EthicalProduct>): string => {
      return [params.data.label, params.data.brand].join('|');
    },
    []
  );

  return (
    <div className={cn('flex w-full h-full', className)}>
      <ReportAgGrid<EthicalProduct>
        className={'flex-1'}
        rowData={data}
        columnDefs={colDefs}
        getRowId={getRowId}
        autoSizeStrategy={autoSizeStrategy}
        debug
      />
    </div>
  );
};
