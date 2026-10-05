// oxlint-disable unicorn/no-static-only-class -- namespaced on purpose, avoids autosuggestions
export class CliTable {
  /** Width of the widest value, to align a column with padEnd / padStart */
  static columnWidth(values: readonly string[]) {
    return Math.max(0, ...values.map((value) => value.length));
  }
}
