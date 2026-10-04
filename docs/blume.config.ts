import { defineConfig } from "blume";

export default defineConfig({
  title: "Flowblade",
  description: "Type-safe SQL, datasources and DuckDB tooling for TypeScript.",
  content: {
    root: "src/content",
  },
  deployment: {
    site: "https://flowblade.pages.dev",
  },
  github: {
    owner: "belgattitude",
    repo: "flowblade",
    dir: "docs",
  },
});
