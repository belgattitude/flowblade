import { CliFormat } from "./format.ts";

export class CliTimer {
  private readonly start = performance.now();

  ms() {
    return CliFormat.ms(this.start);
  }

  seconds() {
    return CliFormat.seconds(this.start);
  }
}
