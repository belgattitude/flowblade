// oxlint-disable unicorn/no-static-only-class -- namespaced on purpose, avoids autosuggestions
import crypto from "node:crypto";

export class CliHash {
  static sha256(content: string | NodeJS.ArrayBufferView) {
    return crypto.createHash("sha256").update(content).digest("hex");
  }
}
