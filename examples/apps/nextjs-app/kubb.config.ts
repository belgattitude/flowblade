import fs from "node:fs";

import type { UserConfig } from "@kubb/core";
import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { QueryKey } from "@kubb/plugin-react-query/components";
import { pluginTs } from "@kubb/plugin-ts";

import { honoApiSchemaConfig } from "./src/server/config/hono-api-schema.config";

const featureFolder = "./src/features/api";
const outputPath = `${featureFolder}/generated`;

const openapiJsonFile = honoApiSchemaConfig.file;

if (!fs.existsSync(openapiJsonFile)) {
  throw new Error(`Can't locate openapi file at: ${openapiJsonFile}`);
}

const openapiSchema = fs.readFileSync(openapiJsonFile).toString();
if (openapiSchema.trim().length === 0) {
  throw new Error("Openapi file is empty, please generate it first.");
}

export const config: UserConfig = {
  hooks: {
    done: [
      // 'yarn run typecheck',
      // 'biome format --write ./',
      `yarn eslint ${outputPath} --ext .ts,.tsx --fix`,
    ],
  },
  input: {
    // path: 'http://localhost:3000/api/openapi',
    data: openapiSchema,
  },
  output: {
    clean: true,
    defaultBanner: "simple",
    extension: {
      ".ts": "",
    },
    path: outputPath,
  },
  plugins: [
    pluginOas({ generators: [] }),
    pluginTs({
      output: {
        banner(oas) {
          return `// version: ${oas.api.info.version}`;
        },
        path: "models",
      },
    }),
    pluginClient({
      importPath: `@/config/api-fetcher-kubb.config.ts`,
      output: {
        path: ".",
      },
    }),
    pluginReactQuery({
      client: {
        importPath: `@/config/api-fetcher-kubb.config.ts`,
      },
      group: {
        type: "path",
      },
      output: {
        path: "./hooks",
      },
      override: [],
      paramsType: "inline",
      pathParamsType: "object",
      queryKey(props) {
        const keys = QueryKey.getTransformer(props);
        return ['"v5"', ...keys];
      },
      suspense: {},
      transformers: {
        name: (name, type) => {
          if (type === "file" || type === "function") {
            return `${name}Hook`;
          }
          return name;
        },
      },
    }),
  ],
  root: ".",
};

export default defineConfig(config);
