import { QueryErrorResetBoundary } from '@tanstack/react-query';
import type { FC, PropsWithChildren } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

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
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};
