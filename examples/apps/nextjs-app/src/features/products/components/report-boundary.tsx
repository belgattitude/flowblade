import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { type FC, type PropsWithChildren, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { LoadingPlaceholder } from './loading-placeholder';

export const ReportBoundary: FC<PropsWithChildren> = (props) => {
  const { children } = props;
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div>
              There was an error!
              <button onClick={() => resetErrorBoundary()}>Try again</button>
            </div>
          )}
        >
          <Suspense fallback={<LoadingPlaceholder />}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};
