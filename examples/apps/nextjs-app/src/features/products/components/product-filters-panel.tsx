'use client';

import { MultiSelect } from 'primereact/multiselect';
import type { FC } from 'react';

import { cn } from '@/components/utils';
import {
  type EthicalBrand,
  useEthicalBrands,
} from '@/features/products/api/ethical-api';
import { productFiltersSlice } from '@/features/products/redux/product-filters-slice';
import { useDispatch, useSelector } from '@/redux/redux-hooks';

type Props = {
  className?: string;
};

export const ProductFiltersPanel: FC<Props> = (props) => {
  const { className } = props;
  const { data } = useEthicalBrands();
  // const brands = useSelector((state) => state.productFilters.brands);
  const dispatch = useDispatch();
  const selectedBrands = useSelector(
    (state) => state.productFilters.selectedBrands
  );

  return (
    <div className={cn('', className)}>
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
    </div>
  );
};
