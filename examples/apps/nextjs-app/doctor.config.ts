import { defineConfig } from "react-doctor/api";

export default defineConfig({
  categories: {
    Maintainability: "warn",
  },
  ignore: {
    files: ["src/generated/**"],
    overrides: [
      {
        files: ["components/search/HighlightedSnippet.tsx"],
        rules: ["react-doctor/no-danger"],
      },
    ],
    rules: ["react-doctor/no-danger"],
  },
  rules: {
    "react-doctor/no-array-index-as-key": "error",
  },
});
