'use client';

import { type FC, type JSX, useLayoutEffect, useState } from 'react';
import type { BundledLanguage } from 'shiki/bundle/web';

import { CopyToClipboard } from '@/components/code/CopyToClipboard';
import { cn } from '@/components/utils';

import { highlight } from './utils/highlight';

type Props = {
  code: string;
  lang: BundledLanguage;
  filename?: string;
  className?: string;
};

export const CodeBlock: FC<Props> = (props) => {
  const { code, lang, filename, className } = props;
  const [nodes, setNodes] = useState<JSX.Element | undefined>();

  useLayoutEffect(() => {
    void highlight(code, lang).then(setNodes);
  }, []);

  return (
    <div className={cn('', className)}>
      <div className="overflow-hidden">
        <div className="flex items-center justify-between bg-linear-to-r from-neutral-900 to-neutral-800 py-2 pl-2 pr-4 text-sm">
          <span className="-mb-[calc(0.5rem+2px)] text-white border-2 border-white/5 border-b-neutral-700 bg-neutral-800 px-4 py-2 ">
            {filename}
          </span>
          <CopyToClipboard code={code} />
        </div>
        <div className="border-t-2 border-neutral-700 text-sm [&>pre]:overflow-x-auto [&>pre]:bg-neutral-900! [&>pre]:py-3 [&>pre]:pl-4 [&>pre]:pr-5 [&>pre]:leading-snug [&_code]:block [&_code]:w-fit [&_code]:min-w-full">
          {nodes}
        </div>
      </div>
    </div>
  );
};
