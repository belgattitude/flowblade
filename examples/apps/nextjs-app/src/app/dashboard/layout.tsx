import 'primereact/resources/themes/soho-light/theme.css';

import type { PropsWithChildren } from 'react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { GlobalLoading } from '@/features/products/components/global-loading';
import { PrimeReactTailwindProvider } from '@/providers/PrimeReactTailwindProvider';

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <PrimeReactTailwindProvider>
      <GlobalLoading />
      <DashboardLayout>{children}</DashboardLayout>
    </PrimeReactTailwindProvider>
  );
}
