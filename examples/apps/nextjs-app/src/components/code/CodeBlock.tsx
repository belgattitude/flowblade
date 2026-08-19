"use client";

import { useLayoutEffect, useState } from "react";
import type { FC, JSX } from "react";
import type { BundledLanguage } from "shiki/bundle/web";

import { CopyToClipboard } from "@/components/code/CopyToClipboard";
import { cn } from "@/components/utils";

import { highlight } from "./utils/highlight";

interface Props {
  code: string;
  lang: BundledLanguage;
  filename?: string;
  className?: string;
}

export const CodeBlock: FC<Props> = (props) => {
  const { code, lang, filename, className } = props;
  const [nodes, setNodes] = useState<JSX.Element | undefined>();

  useLayoutEffect(() => {
    void highlight(code, lang).then(setNodes);
  }, [code, lang]);

  return (
    <div className={cn("", className)}>
      <div className="overflow-hidden">
        <div className="flex items-center justify-between bg-linear-to-r from-neutral-900 to-neutral-800 py-2 pr-4 pl-2 text-sm">
          <span className="-mb-[calc(0.5rem+2px)] border-2 border-white/5 border-b-neutral-700 bg-neutral-800 px-4 py-2 text-white">
            {filename}
          </span>
          <CopyToClipboard code={code} />
        </div>
        <div className="border-t-2 border-neutral-700 text-sm [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&>pre]:overflow-x-auto [&>pre]:bg-neutral-900! [&>pre]:py-3 [&>pre]:pr-5 [&>pre]:pl-4 [&>pre]:leading-snug">
          {nodes}
        </div>
      </div>
    </div>
  );
};
