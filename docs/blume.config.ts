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
  navigation: {
    selectors: [
      {
        kind: "product",
        label: "Package",
        items: [
          { label: "@flowblade/core", path: "/docs/core" },
          { label: "@flowblade/source-kysely", path: "/docs/source-kysely" },
          { label: "@flowblade/source-duckdb", path: "/docs/source-duckdb" },
          { label: "@flowblade/sqlduck", path: "/docs/sqlduck" },
          { label: "@flowblade/sql-tag", path: "/docs/sql-tag" },
        ],
      },
    ],
  },
});
