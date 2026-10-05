// oxlint-disable unicorn/no-static-only-class -- namespaced on purpose, avoids autosuggestions
export class CliFormat {
  static errorMessage(error: unknown) {
    return error instanceof Error ? error.message : "unknown error";
  }

  /** Elapsed time since `start` (a `performance.now()` value), e.g. `12ms` */
  static ms(start: number) {
    return `${Math.round(performance.now() - start)}ms`;
  }

  /** Duration in milliseconds formatted as seconds, e.g. `1.2s` */
  static formatSeconds(durationMs: number) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }

  /** Elapsed time since `start` (a `performance.now()` value), e.g. `1.2s` */
  static seconds(start: number) {
    return CliFormat.formatSeconds(performance.now() - start);
  }

  /** Binary units (1024), e.g. `12.3 KB` */
  static formatKb(bytes: number) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  /** Binary units (1024), KB or MB */
  static formatBinarySize(bytes: number) {
    return bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : CliFormat.formatKb(bytes);
  }

  /** Decimal units (1000, same as docker), MB or GB */
  static formatDecimalSize(bytes: number) {
    return bytes >= 1e9
      ? `${(bytes / 1e9).toFixed(2)} GB`
      : `${(bytes / 1e6).toFixed(1)} MB`;
  }
}
