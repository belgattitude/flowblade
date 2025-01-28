import type { FC, PropsWithChildren } from 'react';

import { Banner } from '@/components/banner/Banner';
import { fontInter } from '@/components/fonts/FontInter';

type Props = PropsWithChildren<{
  className?: string;
}>;
export const MainLayout: FC<Props> = ({ children }) => {
  return (
    <div
      className={`${fontInter.className} ${fontInter.variable} antialiased flex-col`}
    >
      <Banner className={'bg-indigo-600'} />
      <div className={'container-lg'}>
        <main className={''}>{children}</main>
      </div>
    </div>
  );
};
