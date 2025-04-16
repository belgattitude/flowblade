'use client';
import '@glideapps/glide-data-grid/dist/index.css';

import {
  type GridCell,
  GridCellKind,
  type GridColumn,
  type Item,
} from '@glideapps/glide-data-grid';

import { DynamicGlideGrid } from '@/components/grid/glide/dynamic-glide-grid';

export const dynamic = 'force-dynamic';

const data = [
  {
    firstName: 'John',
    lastName: 'Doe',
  },
  {
    firstName: 'Maria',
    lastName: 'Garcia',
  },
  {
    firstName: 'Nancy',
    lastName: 'Jones',
  },
  {
    firstName: 'James',
    lastName: 'Smith',
  },
];

const columns: GridColumn[] = [
  { title: 'First Name', width: 100 },
  { title: 'Last Name', width: 100 },
];

// If fetching data is slow you can use the DataEditor ref to send updates for cells
// once data is loaded.
function getData([col, row]: Item): GridCell {
  const person = data[row];
  if (person === undefined) {
    throw new Error('No data found');
  }

  if (col === 0) {
    return {
      kind: GridCellKind.Text,
      data: person.firstName,
      allowOverlay: false,
      displayData: person.firstName,
    };
  } else if (col === 1) {
    return {
      kind: GridCellKind.Text,
      data: person.lastName,
      allowOverlay: false,
      displayData: person.lastName,
    };
  } else {
    throw new Error('Invalid colum model');
  }
}

export default function TreeuDemoRoute() {
  // const gridRef = useRef<DataEditorRef | null>(null);

  return (
    <div className={'flex flex-col w-full p-10 gap-5'}>
      <DynamicGlideGrid
        className={'flex w-[400px] h-[400px] border'}
        width={'100%'}
        height={'400px'}
        getCellContent={getData}
        columns={columns}
        rows={data.length}
      />
    </div>
  );
}
