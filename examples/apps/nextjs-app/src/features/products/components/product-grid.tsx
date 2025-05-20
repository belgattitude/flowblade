'use client';

import { MIntl } from '@httpx/memo-intl';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { type FC, useState } from 'react';

import { ReportAgGrid } from '@/components/grid/ag-grid/report-ag-grid';
import { cn } from '@/components/utils';
import { useSuspenseEthicalProducts } from '@/features/products/api/ethical-api';
import type { EthicalProduct } from '@/features/products/data/ethical-products.data';
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
  const { data } = useSuspenseEthicalProducts({
    brands: filter.brands.map((brand) => brand.name),
    slowdownApiMs: filter.slowdownApiMs.toString(10),
  });

  const [colDefs, _setColDefs] = useState<ColDef[]>(productColDefs);

  return (
    <div className={cn('flex w-full h-full', className)}>
      <ReportAgGrid
        className={'flex-1'}
        rowData={data}
        columnDefs={colDefs}
        autoSizeStrategy={autoSizeStrategy}
      />
    </div>
  );
};
