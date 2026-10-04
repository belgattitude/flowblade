import { fileURLToPath } from "node:url";

/**
 * Fontsource font files copied into the app by
 * `scripts/install-local-fonts.ts`, so next/font/local
 * can load them with a stable relative path (see src/components/fonts).
 */
export const nextjsLocalFontsConfig = {
  destDir: fileURLToPath(
    import.meta.resolve("../../components/fonts/files", import.meta.url)
  ),
  /** Manifest of the installed fonts (versions, sizes, hashes) */
  manifestFile: fileURLToPath(
    import.meta.resolve(
      "../../../data/fonts/local-fonts-manifest.json",
      import.meta.url
    )
  ),
  fonts: [
    {
      pkg: "@fontsource-variable/inter",
      file: "inter-latin-wght-normal.woff2",
    },
    {
      pkg: "@fontsource-variable/jetbrains-mono",
      file: "jetbrains-mono-latin-wght-normal.woff2",
    },
    {
      pkg: "@fontsource-variable/plus-jakarta-sans",
      file: "plus-jakarta-sans-latin-wght-normal.woff2",
    },
  ],
} as const;
