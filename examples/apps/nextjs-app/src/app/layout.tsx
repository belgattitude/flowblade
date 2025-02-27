import '../styles/globals.css';

import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';

import { fontInter } from '@/components/fonts/font-inter';
import { fontJetbrainsMono } from '@/components/fonts/font-jetbrains-mono';
import { MainLayout } from '@/components/layout/main-layout';
import { ReactQueryClientProvider } from '@/providers/ReactQueryClientProvider';
import { ReduxStoreProvider } from '@/providers/ReduxProvider';

export const metadata: Metadata = {
  title: 'Flowblade nextjs app',
  description: 'Example',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body className={`${fontInter.variable} ${fontJetbrainsMono.variable}`}>
        <ReduxStoreProvider>
          <ReactQueryClientProvider>
            <MainLayout
              className={'font-[family-name:var(--font-inter)] antialiased'}
            >
              {children}
            </MainLayout>
          </ReactQueryClientProvider>
        </ReduxStoreProvider>
      </body>
    </html>
  );
}
