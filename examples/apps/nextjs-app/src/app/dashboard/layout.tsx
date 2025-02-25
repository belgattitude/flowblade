import 'primereact/resources/themes/soho-light/theme.css';

import type { ReactNode } from 'react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';

import { PrimeReactTailwindProvider } from '../../providers/PrimeReactTailwindProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <PrimeReactTailwindProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </PrimeReactTailwindProvider>
  );
}
