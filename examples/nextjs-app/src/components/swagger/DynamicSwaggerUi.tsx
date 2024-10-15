'use client';
import 'swagger-ui-react/swagger-ui.css';

import dynamic from 'next/dynamic';
import type { FC } from 'react';

export const SwaggerUi = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
});

export const DynamicSwaggerUi: FC<{ url: string }> = ({ url }) => {
  return <SwaggerUi url={url} />;
};
