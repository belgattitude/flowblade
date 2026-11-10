const encodeRfc5987 = (value: string): string =>
  encodeURIComponent(value).replaceAll(
    /['()*]/g,
    (char) => `%${char.codePointAt(0)?.toString(16).toUpperCase() ?? ""}`
  );

/**
 * Create an `attachment` Content-Disposition header value (RFC 6266), with
 * an ASCII fallback and the UTF-8 encoded filename.
 *
 * @example
 * ```typescript
 * createAttachmentDisposition("été.csv");
 * // attachment; filename="_t_.csv"; filename*=UTF-8''%C3%A9t%C3%A9.csv
 * ```
 */
export const createAttachmentDisposition = (filename: string): string => {
  const asciiFallback = filename.replaceAll(/[^\u0020-\u007E]|["\\/]/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeRfc5987(filename)}`;
};
