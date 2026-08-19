import type { AutoSizeStrategy } from "ag-grid-community";
import type { AgGridReact, AgGridReactProps } from "ag-grid-react";
import { useRef } from "react";

import { cn } from "@/components/utils";

import { AgGrid } from "./core/ag-grid";
import { reportAgGridTheme } from "./report-ag-grid-theme";

type Props<T = unknown> = AgGridReactProps<T> & {
  className?: string;
  gridClassName?: string;
};

const defaultAutosizeStrategy = {
  scaleUpToFitGridWidth: true,
  skipHeader: true,
  type: "fitCellContents",
} as const satisfies AutoSizeStrategy;

const defaultTheme = reportAgGridTheme;

export const ReportAgGrid = <TData = unknown,>(props: Props<TData>) => {
  const {
    className,
    gridClassName,
    theme = defaultTheme,
    ...restProps
  } = props;

  const gridRef = useRef<AgGridReact>(null);

  return (
    <div className={cn("flex", className)}>
      <AgGrid<TData>
        ref={gridRef}
        theme={theme}
        className={cn("flex-1", gridClassName)}
        autoSizeStrategy={defaultAutosizeStrategy}
        {...restProps}
      />
    </div>
  );
};
