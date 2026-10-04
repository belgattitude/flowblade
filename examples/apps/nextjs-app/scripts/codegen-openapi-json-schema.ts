import fs from "node:fs";
import path from "node:path";

import { generateSpecs } from "hono-openapi";
import { format } from "oxfmt";
import c from "tinyrainbow";

import { honoApiSchemaConfig } from "@/server/config/hono-api-schema.config";
import { honoApiConfig } from "@/server/config/hono-api.config";

import oxfmtConfig from "../oxfmt.config";

const totalStart = performance.now();
const ms = (start: number) => `${Math.round(performance.now() - start)}ms`;

const generateStart = performance.now();
const content = await generateSpecs(honoApiConfig.app);
const generateTime = ms(generateStart);

const openApiJsonFile = honoApiSchemaConfig.file;
const openApiJsonFileDir = path.dirname(openApiJsonFile);

if (!fs.existsSync(openApiJsonFileDir)) {
  fs.mkdirSync(openApiJsonFileDir, { recursive: true });
}

const formatStart = performance.now();
const formatted = await format(
  openApiJsonFile,
  JSON.stringify(content, null, 2),
  oxfmtConfig
);

if (formatted.errors.length > 0) {
  throw new Error(
    `Failed to format ${openApiJsonFile}: ${formatted.errors.map((e) => e.message).join("; ")}`
  );
}

const formatTime = ms(formatStart);

fs.writeFileSync(openApiJsonFile, formatted.code, "utf-8");

const sizeKb = (Buffer.byteLength(formatted.code, "utf-8") / 1024).toFixed(1);

const timeWidth = Math.max(
  generateTime.length,
  formatTime.length,
  ms(totalStart).length
);
const pad = (time: string) => time.padStart(timeWidth);

console.log(
  [
    `${c.green("✔")} ${c.bold("OpenAPI JSON schema generated")}`,
    `  ${c.dim("file:    ")} ${c.cyan(path.relative(process.cwd(), openApiJsonFile))} ${c.dim(`(${sizeKb} KB)`)}`,
    `  ${c.dim("generate:")} ${c.yellow(pad(generateTime))}`,
    `  ${c.dim("format:  ")} ${c.yellow(pad(formatTime))}`,
    `  ${c.dim("total:   ")} ${c.bold(c.yellow(pad(ms(totalStart))))}`,
  ].join("\n")
);
