"use server";

import {
  transformerNotationDiff,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import type { BundledLanguage, BundledTheme } from "shiki";
import { codeToHtml } from "shiki";

import { cn } from "@/components/utils";

import { CopyToClipboard } from "./CopyToClipboard";

interface Props {
  code: string;
  className?: string;
  filename?: string;
  lang?: BundledLanguage;
  theme?: BundledTheme;
}
export async function SSRCodeHighlighter(props: Props) {
  const {
    code = "",
    className,
    filename = "",
    lang = "typescript",
    theme = "nord",
  } = props;

  const html = await codeToHtml(code, {
    lang,
    theme,
    transformers: [
      transformerNotationHighlight({
        matchAlgorithm: "v3",
      }),
      transformerNotationDiff({
        matchAlgorithm: "v3",
      }),
    ],
  });

  return (
    <div className={cn("", className)}>
      <div className="overflow-hidden">
        <div className="flex items-center justify-between bg-linear-to-r from-neutral-900 to-neutral-800 py-2 pr-4 pl-2 text-sm">
          <span className="-mb-[calc(0.5rem+2px)] border-2 border-white/5 border-b-neutral-700 bg-neutral-800 px-4 py-2 text-white">
            {filename}
          </span>
          <CopyToClipboard code={code} />
        </div>
        <div
          className="border-t-2 border-neutral-700 text-sm [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&>pre]:overflow-x-auto [&>pre]:bg-neutral-900! [&>pre]:py-3 [&>pre]:pr-5 [&>pre]:pl-4 [&>pre]:leading-snug"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
