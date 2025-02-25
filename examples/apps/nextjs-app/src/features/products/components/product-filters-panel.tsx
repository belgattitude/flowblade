'use client';

import { Button } from 'primereact/button';
import { MultiSelect } from 'primereact/multiselect';
import type { FC } from 'react';

import { cn } from '@/components/utils';
import { useEthicalBrands } from '@/features/products/api/ethical-api';
import { productFiltersSlice } from '@/features/products/redux/product-filters-slice';
import { useDispatch, useSelector } from '@/redux/redux-hooks';

import type { EthicalBrand } from '../server/ethical-product.repo';

type Props = {
  className?: string;
};

export const ProductFiltersPanel: FC<Props> = (props) => {
  const { className } = props;
  const { data } = useEthicalBrands();
  const dispatch = useDispatch();
  const selectedBrands = useSelector(
    (state) => state.productFilters.selection.brands
  );

  return (
    <div className={cn('flex gap-3', className)}>
      <MultiSelect
        value={selectedBrands}
        onChange={(e) => {
          dispatch(
            productFiltersSlice.actions.brandSelected(e.value as EthicalBrand[])
          );
        }}
        options={data}
        optionLabel="name"
        display="chip"
        placeholder="Choose Brands"
        maxSelectedLabels={3}
        filter={true}
      />
      <Button
        label="Execute"
        onClick={() => {
          console.log('Executed');
        }}
      />
    </div>
  );
};
