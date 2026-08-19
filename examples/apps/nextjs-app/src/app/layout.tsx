import "../styles/globals.css";
import { TooltipProvider } from "@examples/base-ui/components/ui/tooltip";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import { fontInter } from "@/components/fonts/font-inter";
import { MainLayout } from "@/components/layout/main-layout";
import { ReactQueryClientProvider } from "@/providers/ReactQueryClientProvider";
import { ReduxStoreProvider } from "@/providers/ReduxProvider";
import { fontPlusJakartaSans } from "@/components/fonts/font-plus-jakarta-sans.tsx";

export const metadata: Metadata = {
  description: "Example",
  title: "Flowblade nextjs app",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body
        className={`${fontInter.variable} ${fontPlusJakartaSans.variable}`}
      >
        <ReduxStoreProvider>
          <ReactQueryClientProvider>
            <TooltipProvider>
              <MainLayout className="font-[family-name:var(--font-plus-jakarta-sans)] antialiased">
                {children}
              </MainLayout>
            </TooltipProvider>
          </ReactQueryClientProvider>
        </ReduxStoreProvider>
      </body>
    </html>
  );
}
