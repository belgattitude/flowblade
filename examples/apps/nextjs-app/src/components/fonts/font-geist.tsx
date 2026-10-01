import localFont from "next/font/local";

export const fontGeistSans = localFont({
  display: "swap",
  src: "../../../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const fontGeistMono = localFont({
  display: "swap",
  src: "../../../node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});
