'use client';

import { HydrationOverlay } from '@builder.io/react-hydration-overlay';
import type { FC, PropsWithChildren } from 'react';

type HydrationOverlayProps = Parameters<typeof HydrationOverlay>[0];

type Props = PropsWithChildren & {
  integrations?: HydrationOverlayProps['integrations'];
};

const defaultIntegrations: HydrationOverlayProps['integrations'] = {
  spotlight: false,
};

export const DevHydrationOverlayProvider: FC<Props> = (props) => {
  const { children, integrations = defaultIntegrations } = props;
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ENABLE_HYDRATION_OVERLAY !== 'true'
  ) {
    // eslint-disable-next-line sonarjs/jsx-no-useless-fragment
    return <>{children}</>;
  }
  return (
    <HydrationOverlay integrations={integrations}>{children}</HydrationOverlay>
  );
};
