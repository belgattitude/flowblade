import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import type { FC, PropsWithChildren } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";

import { LoadingPlaceholder } from "./loading-placeholder";

const ErrorFallback: FC<FallbackProps> = ({ resetErrorBoundary }) => (
  <div>
    There was an error!
    <button
      type="button"
      onClick={() => {
        resetErrorBoundary();
      }}
    >
      Try again
    </button>
  </div>
);

export const ReportBoundary: FC<PropsWithChildren> = (props) => {
  const { children } = props;
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallback}>
          <Suspense fallback={<LoadingPlaceholder />}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};
