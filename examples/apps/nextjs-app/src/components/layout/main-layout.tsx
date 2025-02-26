import type { FC, PropsWithChildren } from 'react';

import { cn } from '../utils';

type Props = PropsWithChildren<{
  className?: string;
}>;
export const MainLayout: FC<Props> = ({ className, children }) => {
  return (
    <div className={cn('container-lg', className)}>
      <main>{children}</main>
    </div>
  );
};
