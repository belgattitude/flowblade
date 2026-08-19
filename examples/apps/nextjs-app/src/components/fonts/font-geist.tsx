import { Geist, Geist_Mono } from "next/font/google";

export const fontGeistSans = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: "variable",
});

export const fontGeistMono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: "variable",
});
