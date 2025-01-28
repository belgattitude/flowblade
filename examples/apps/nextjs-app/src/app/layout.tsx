import '../styles/globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { fontInter } from '@/components/fonts/FontInter';
import { MainLayout } from '@/components/layout/MainLayout';
import { ReactQueryClientProvider } from '@/providers/ReactQueryClientProvider';
import { ReduxStoreProvider } from '@/providers/ReduxProvider';

export const metadata: Metadata = {
  title: 'Flowblade nextjs app',
  description: 'Example',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fontInter.variable} antialiased`}>
        <ReduxStoreProvider>
          <ReactQueryClientProvider>
            <MainLayout>{children}</MainLayout>
          </ReactQueryClientProvider>
        </ReduxStoreProvider>
      </body>
    </html>
  );
}
