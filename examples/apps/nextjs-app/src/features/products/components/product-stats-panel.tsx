"use client";

import type { FC } from "react";

import { ProductGrid } from "@/features/products/components/product-grid";
import { ReportBoundary } from "@/features/products/components/report-boundary";

export const ProductStatsPanel: FC = () => (
  <div className="flex flex-1 flex-col gap-5">
    <ReportBoundary>
      <ProductGrid className="h-[400px]" />
    </ReportBoundary>
    <ReportBoundary>
      <ProductGrid className="h-[400px]" />
    </ReportBoundary>
  </div>
);
