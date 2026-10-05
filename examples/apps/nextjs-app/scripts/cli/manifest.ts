// oxlint-disable unicorn/no-static-only-class -- namespaced on purpose, avoids autosuggestions
import fs from "node:fs";
import path from "node:path";

import c from "tinyrainbow";

import { CliFormat } from "./format.ts";
import { CliReport } from "./report.ts";

export class CliManifest {
  /**
   * Write a JSON manifest (creating the directory if needed).
   * Returns the error message on failure instead of throwing.
   */
  static write(file: string, data: unknown): string | undefined {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
      return undefined;
    } catch (error) {
      return CliFormat.errorMessage(error);
    }
  }

  /** Report line for a manifest, `error` is the result of `CliManifest.write` */
  static line(file: string, error?: string) {
    return CliReport.labelLine(
      "manifest",
      error === undefined
        ? c.cyan(CliReport.displayPath(file))
        : c.red(`failed to write (${error})`)
    );
  }
}
