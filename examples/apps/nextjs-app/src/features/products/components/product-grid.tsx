"use client";

import { MIntl } from "@httpx/memo-intl";
import type { ColDef, GetRowIdParams, GridOptions } from "ag-grid-community";
import { useCallback } from "react";
import type { FC } from "react";

import { ReportAgGrid } from "@/components/grid/ag-grid/report-ag-grid";
import { cn } from "@/components/utils";
import { useGetApiProductEthicalSearchSuspense } from "@/features/api/generated";
import type { EthicalProduct } from "@/features/products/server/ethical-product.repo.ts";
import { useSelector } from "@/redux/redux-hooks";

interface Props {
  className?: string;
}

const correction = new Map([["Hemp Backpack", { category: "Hello" }]]);

const productColDefs: ColDef<EthicalProduct>[] = [
  { field: "brand" },
  { field: "label" },
  {
    cellClass: "text-right",
    editable: true,
    field: "price",
    valueGetter: (params) =>
      MIntl.NumberFormat("fr-FR", {
        currency: "EUR",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        notation: "compact",
        style: "currency",
      }).format(params.data!.price),
  },
  { field: "stock" },
  { field: "weight" },
  {
    cellStyle: (params) => {
      const { label } = params.data!;
      return correction.has(label)
        ? { backgroundColor: "yellow" }
        : { backgroundColor: "white" };
    },
    editable: true,
    field: "category",
    valueFormatter: (params) => {
      const { label } = params.data!;
      return correction.has(label)
        ? `${correction.get(label)!.category} (*)`
        : `${params.data?.category} (untouched)`;
    },
    valueSetter: (params) => {
      correction.set(params.data.label, {
        category: params.newValue as string,
      });
      return false;
    },
  },
  { field: "color" },
  {
    colId: "88",
    valueGetter: (params) => {
      const { label } = params.data!;
      return correction.has(label)
        ? `Changed ${correction.get(label)!.category} (*)`
        : `No changes`;
    },
  },
];

const autoSizeStrategy: GridOptions["autoSizeStrategy"] = {
  defaultMinWidth: 50,
  type: "fitGridWidth",
};

export const ProductGrid: FC<Props> = (props) => {
  const { className } = props;
  const filter = useSelector((state) => state.productFilters.filters);
  const { data } = useGetApiProductEthicalSearchSuspense({
    brands: filter.brands.map((b) => b.name),
    slowdownApiMs: filter.slowdownApiMs,
  });

  const colDefs: ColDef[] = productColDefs;

  const getRowId = useCallback(
    (params: GetRowIdParams<EthicalProduct>): string =>
      [params.data.label, params.data.brand].join("|"),
    []
  );

  return (
    <div className={cn("flex size-full", className)}>
      <ReportAgGrid<EthicalProduct>
        className="flex-1"
        rowData={data}
        columnDefs={colDefs}
        getRowId={getRowId}
        autoSizeStrategy={autoSizeStrategy}
        debug
      />
    </div>
  );
};
