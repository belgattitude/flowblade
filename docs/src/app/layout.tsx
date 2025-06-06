import 'nextra-theme-docs/style.css';
import '../styles/globals.css';

import { Banner, Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import type { ReactNode } from 'react';

import { fontGeist } from '../components/fonts/FontGeist';
import { fontInter } from '../components/fonts/FontInter';

export const metadata = {
  // Define your metadata here
  // For more information on metadata API, see: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
};

const _banner = (
  <Banner storageKey="some-key">Nextra 4.0 is released 🎉</Banner>
);
const navbar = (
  <Navbar
    logo={
      <div className={'flex flex-row gap-2'}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M20 20C20.5523 20 21 19.5523 21 19C21 18.4477 20.5523 18 20 18C19.4477 18 19 18.4477 19 19C19 19.5523 19.4477 20 20 20ZM17 19C17 17.6938 17.8348 16.5825 19 16.1707V16C19 14.3431 17.6569 13 16 13C14.8744 13 13.8357 12.6281 13 12.0004L13 16.1707C14.1652 16.5825 15 17.6938 15 19C15 20.6569 13.6569 22 12 22C10.3431 22 9 20.6569 9 19C9 17.6938 9.83481 16.5825 11 16.1707L11 12.0004C10.1643 12.6281 9.12561 13 8 13C6.34315 13 5 14.3431 5 16V16.1707C6.16519 16.5825 7 17.6938 7 19C7 20.6569 5.65685 22 4 22C2.34315 22 1 20.6569 1 19C1 17.6938 1.83481 16.5825 3 16.1707V16C3 13.2386 5.23858 11 8 11C9.65685 11 11 9.65685 11 8V7.82929C9.83481 7.41746 9 6.30622 9 5C9 3.34315 10.3431 2 12 2C13.6569 2 15 3.34315 15 5C15 6.30622 14.1652 7.41746 13 7.82929V8C13 9.65685 14.3431 11 16 11C18.7614 11 21 13.2386 21 16V16.1707C22.1652 16.5825 23 17.6938 23 19C23 20.6569 21.6569 22 20 22C18.3431 22 17 20.6569 17 19ZM12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6ZM4 18C3.44772 18 3 18.4477 3 19C3 19.5523 3.44772 20 4 20C4.55228 20 5 19.5523 5 19C5 18.4477 4.55228 18 4 18ZM13 19C13 19.5523 12.5523 20 12 20C11.4477 20 11 19.5523 11 19C11 18.4477 11.4477 18 12 18C12.5523 18 13 18.4477 13 19Z"
            fill="#000000"
          />
        </svg>
        <div className={'text-lg font-semibold'}>Flowblade</div>
      </div>
    }
    projectLink={'https://github.com/belgattitude/flowblade'}
    // ... Your additional navbar options
  />
);
const footer = <Footer>MIT {new Date().getFullYear()} © Nextra.</Footer>;

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      // Not required, but good for SEO
      lang="en"
      // Required to be set
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning={true}
    >
      <Head
      // ... Your additional head options
      >
        {/* Your additional tags should be passed as `children` of `<Head>` element */}
      </Head>
      <body
        className={`${fontGeist.variable} ${fontInter.variable} antialiased`}
      >
        <Layout
          // banner={_banner}
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/belgattitude/flowblade/tree/main/docs"
          footer={footer}
          // ... Your additional layout options
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
