import type { FC, PropsWithChildren } from 'react';

import { fontInter } from '@/components/fonts/FontInter';

type Props = PropsWithChildren<{
  className?: string;
}>;
export const MainLayout: FC<Props> = ({ children }) => {
  return (
    <div
      className={`${fontInter.className} ${fontInter.variable} antialiased flex-col`}
    >
      <div className={'container-lg'}>
        <main className={''}>{children}</main>
      </div>
    </div>
  );
};
