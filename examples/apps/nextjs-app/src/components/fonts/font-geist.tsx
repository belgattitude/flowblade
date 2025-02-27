import { Geist, Geist_Mono } from 'next/font/google';

export const fontGeistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  weight: 'variable',
  variable: '--font-geist-sans',
});

export const fontGeistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: 'variable',
  variable: '--font-geist-mono',
});
