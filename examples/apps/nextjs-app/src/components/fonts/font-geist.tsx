// The geist package calls next/font/local with its own bundled files, so it
// works with any pnpm linker (no copy needed, see scripts/install-local-fonts.ts)
export { GeistMono as fontGeistMono } from "geist/font/mono";
export { GeistSans as fontGeistSans } from "geist/font/sans";
