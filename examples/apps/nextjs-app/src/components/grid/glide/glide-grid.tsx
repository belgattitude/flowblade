'use client';

import type { DataEditorProps } from '@glideapps/glide-data-grid';
import DataEditor from '@glideapps/glide-data-grid';
import type { FC } from 'react';

type Props = DataEditorProps;

export const GlideGrid: FC<Props> = (props) => {
  return <DataEditor {...props} />;
};
