import path from "node:path";

import c from "tinyrainbow";

export class CliReport {
  private static readonly LABEL_WIDTH = 10;

  /** Path relative to the cwd */
  static displayPath(file: string) {
    return path.relative(process.cwd(), file);
  }

  /** `✔ title (summary)` or `✖ title (summary)` */
  static titleLine(ok: boolean, title: string, summary?: string) {
    return `${ok ? c.green("✔") : c.red("✖")} ${c.bold(title)}${summary === undefined ? "" : ` ${c.dim(`(${summary})`)}`}`;
  }

  /** Indented `label:   value` line, labels are aligned on the same column */
  static labelLine(label: string, value: string) {
    return `  ${c.dim(`${label}:`.padEnd(CliReport.LABEL_WIDTH))}${value}`;
  }
}
