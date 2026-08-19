import pc from "tinyrainbow";

import type { ILogger, LogType } from "./logger.interface";

const termMap: Record<LogType, string> = {
  info: `${pc.blue("info   ")} ℹ️`,
  success: `${pc.green("success")} ✅`,
  error: `${pc.red("error  ")} ⚠️`,
};

export class CliLogger implements ILogger {
  public readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
  log = (type: LogType, msg: string) => {
    console.log(`- ${termMap[type]} [${this.name}] ${msg}`);
  };
  withName = (name: string) => {
    return new CliLogger(name);
  };
}
