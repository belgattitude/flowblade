import fs from "node:fs";
import path from "node:path";

import { generateSpecs } from "hono-openapi";
import { format } from "oxfmt";
import c from "tinyrainbow";

import { CliFormat } from "#cli/format.ts";
import { CliReport } from "#cli/report.ts";
import { CliTable } from "#cli/table.ts";
import { honoApiSchemaConfig } from "#server/config/hono-api-schema.config.ts";
import { honoApiConfig } from "#server/config/hono-api.config.ts";

import oxfmtConfig from "../oxfmt.config.ts";

const totalStart = performance.now();

const generateStart = performance.now();
const content = await generateSpecs(honoApiConfig.app);
const generateTime = CliFormat.ms(generateStart);

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

const formatTime = CliFormat.ms(formatStart);

fs.writeFileSync(openApiJsonFile, formatted.code, "utf-8");

const size = CliFormat.formatKb(Buffer.byteLength(formatted.code, "utf-8"));
const totalTime = CliFormat.ms(totalStart);

const timeWidth = CliTable.columnWidth([generateTime, formatTime, totalTime]);
const pad = (time: string) => time.padStart(timeWidth);

console.log(
  [
    CliReport.titleLine(true, "OpenAPI JSON schema generated"),
    CliReport.labelLine(
      "file",
      `${c.cyan(CliReport.displayPath(openApiJsonFile))} ${c.dim(`(${size})`)}`
    ),
    CliReport.labelLine("generate", c.yellow(pad(generateTime))),
    CliReport.labelLine("format", c.yellow(pad(formatTime))),
    CliReport.labelLine("total", c.bold(c.yellow(pad(totalTime)))),
  ].join("\n")
);
