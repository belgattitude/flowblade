import path from "node:path";

import { config } from "@dotenvx/dotenvx";
import { DuckDBInstance } from "@duckdb/node-api";

import { duckdbExtensionsConfig } from "@/server/config/duckdb-extensions.config.ts";

config({
  path: [".env.local", ".env.development", ".env"],
  ignore: ["MISSING_ENV_FILE"],
});

const getDuckDbExtensionDirFromEnv = async () => {
  const serverEnv = await import("../src/env/server.env.mjs").then((mod) => {
    return mod.serverEnv;
  });
  return serverEnv.DUCKDB_EXTENSION_DIRECTORY!;
};

const extDirFromEnv = await getDuckDbExtensionDirFromEnv();
// Convert to absolute path, relative to cwd if not already absolute
const extDir = path.resolve(process.cwd(), extDirFromEnv);

const instance = await DuckDBInstance.create(":memory:");
const conn = await instance.connect();

const extensions = duckdbExtensionsConfig.install;

try {
  await conn.run(`SET extension_directory='${extDir}'`);
} catch (error) {
  console.log(
    `❌ Cannot set duckdb extension directory to '${extDir}': ${error instanceof Error ? error.message : "unknown error"}`
  );
}
console.log(`ℹ️ Installing duckdb extensions in : ${extDir}`);

for (const extension of extensions) {
  try {
    await conn.runAndReadAll(`FORCE INSTALL ${extension}`);
    console.log(`✅ Successfully installed '${extension}'`);
  } catch (error) {
    console.log(
      `❌ Error while installing extension ${extension}: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

conn.closeSync();
