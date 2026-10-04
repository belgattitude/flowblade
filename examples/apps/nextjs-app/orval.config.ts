import fs from "node:fs/promises";
import path from "node:path";

import { defineConfig } from "orval";
import { format } from "oxfmt";
import c from "tinyrainbow";

import oxfmtConfig from "./oxfmt.config";
import { honoApiSchemaConfig } from "./src/server/config/hono-api-schema.config";

const featureFolder = "./src/features/api";
const outputPath = `${featureFolder}/generated`;

const openapiJsonFile = honoApiSchemaConfig.file;

export default defineConfig({
  api: {
    input: {
      target: openapiJsonFile,
    },
    output: {
      mode: "tags-split",
      client: "react-query",
      httpClient: "fetch",
      target: `${outputPath}/index.ts`,
      schemas: `${outputPath}/models`,
      indexFiles: true,
      clean: true,
      override: {
        useNamedParameters: true,
        mutator: {
          path: "./src/config/api-fetcher-orval.config.ts",
          name: "orvalApiFetcher",
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
        formData: false,
        query: {
          useQuery: true,
          useSuspenseQuery: true,
          signal: true,
        },
      },
    },
    hooks: {
      afterAllFilesWrite: async (...args: unknown[]) => {
        // orval passes the list of all written file paths as a single argument
        const writtenPaths = args[0] as string[] | undefined;
        if (!writtenPaths || writtenPaths.length === 0) return;

        // the list contains both files and directories (e.g. the models folder)
        const expanded = await Promise.all(
          writtenPaths.map(async (p) => {
            const stats = await fs.stat(p);
            if (!stats.isDirectory()) {
              return [p];
            }
            const entries = await fs.readdir(p, {
              recursive: true,
              withFileTypes: true,
            });
            return entries
              .filter((entry) => entry.isFile())
              .map((entry) => path.join(entry.parentPath, entry.name));
          })
        );
        const filePaths = [...new Set(expanded.flat())];

        const start = performance.now();
        const ms = () => `${Math.round(performance.now() - start)}ms`;

        console.log(
          `${c.cyan("⚡")} ${c.bold("Formatting generated files")} ${c.dim(`(${filePaths.length} files)`)}`
        );

        const failures: string[] = [];
        let changed = 0;

        await Promise.all(
          filePaths.map(async (filePath) => {
            const source = await fs.readFile(filePath, "utf-8");
            const { code, errors } = await format(
              filePath,
              source,
              oxfmtConfig
            );
            if (errors.length > 0) {
              failures.push(
                `${path.relative(process.cwd(), filePath)}: ${errors.map((e) => e.message).join("; ")}`
              );
              return;
            }
            if (code !== source) {
              await fs.writeFile(filePath, code, "utf-8");
              changed++;
            }
          })
        );

        if (failures.length > 0) {
          console.error(
            `${c.red("✖")} ${c.bold(`Formatting failed for ${failures.length} file(s)`)} ${c.dim(ms())}`
          );
          for (const failure of failures) {
            console.error(`  ${c.red(failure)}`);
          }
          return;
        }

        console.log(
          `${c.green("✔")} ${c.bold("Formatting complete")} ${c.dim(`${changed} formatted, ${filePaths.length - changed} unchanged`)} ${c.yellow(ms())}`
        );
      },
    },
  },
});
