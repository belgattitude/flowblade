import '../styles/globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { fontInter } from '@/components/fonts/FontInter';
import { DevHydrationOverlayProvider } from '@/providers/DevHydrationOverlayProvider';
import { ReactQueryClientProvider } from '@/providers/ReactQueryClientProvider';

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
        <ReactQueryClientProvider>
          <DevHydrationOverlayProvider>{children}</DevHydrationOverlayProvider>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
