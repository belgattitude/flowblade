'use client';
/**
 * Inspired by https://x.com/shadcn/status/1842329194535272494
 */

import { type FC, type PropsWithChildren, useState } from 'react';

import { cn } from '@/components/utils';

type Props = PropsWithChildren & {
  initialCollapsed?: boolean;
};

export const SideBar: FC<Props> = (props) => {
  const { children, initialCollapsed = false } = props;
  const [isCollapsed, setIsCollapsed] = useState<boolean>(initialCollapsed);

  return (
    <div
      data-collapsed={isCollapsed}
      className={cn(
        'flex flex-col gap-5 bg-amber-100',
        'transition-all ease-in-out delay-150',
        'w-72 data-[collapsed=true]:w-16',
        'group'
      )}
    >
      {/* side bar collapse button/icon */}
      <div>
        <button
          className={'group-data-[collapsed=true]:rotate-180'}
          onClick={() => setIsCollapsed((prevState) => !prevState)}
        >
          Collapse
        </button>
      </div>
      {/* sidebar content */}
      <div>{children}</div>
    </div>
  );
};
