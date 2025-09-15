'use client';

import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import type { FC } from 'react';

import { cn } from '@/components/utils';
import { useGetApiProductEthicalBrandsHook } from '@/features/api/generated';
import { productFiltersSlice } from '@/features/products/redux/product-filters-slice';
import { useDispatch, useSelector } from '@/redux/redux-hooks';

import type { EthicalBrand } from '../server/ethical-product.repo';

type Props = {
  className?: string;
};

export const ProductFiltersPanel: FC<Props> = (props) => {
  const { className } = props;
  const { data } = useGetApiProductEthicalBrandsHook();
  const dispatch = useDispatch();
  const draftFilters = useSelector(
    (state) => state.productFilters.draftFilters
  );

  return (
    <div className={'@container'}>
      <div
        className={cn('flex gap-3 flex-row @sm:@max-md:flex-col', className)}
      >
        <MultiSelect
          value={draftFilters.brands}
          onChange={(e) => {
            dispatch(
              productFiltersSlice.actions.brandsFilterChanged(
                e.value as EthicalBrand[]
              )
            );
          }}
          options={data}
          optionLabel="name"
          display="chip"
          inline={false}
          placeholder="Choose Brands"
          maxSelectedLabels={3}
          filter={true}
          filterDelay={100}
          filterMatchMode={'contains'}
          virtualScrollerOptions={{
            itemSize: 40,
          }}
        />
        <Dropdown
          value={draftFilters.slowdownApiMs}
          onChange={(e) => {
            dispatch(
              productFiltersSlice.actions.slowdownApiMsFilterChanged(
                e.value as number
              )
            );
          }}
          options={[
            { label: '0ms', value: 0 },
            { label: '100ms', value: 100 },
            { label: '1s', value: 1000 },
            { label: '5s', value: 5000 },
          ]}
          optionLabel="label"
          optionValue="value"
          placeholder="Api slowdown"
        />
        <Button
          label="Execute"
          severity={'info'}
          onClick={() => {
            dispatch(productFiltersSlice.actions.execute());
          }}
        />
      </div>
    </div>
  );
};
