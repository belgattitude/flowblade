import localFont from "next/font/local";

export const fontJetbrainsMono = localFont({
  display: "swap",
  src: "../../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
});
