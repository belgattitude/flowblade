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
    throw new Error();
  }
}

export default function TreeuDemoRoute() {
  return (
    <div className={'flex flex-col w-full p-10 gap-5'}>
      <DynamicGlideGrid
        className={'w-full border'}
        getCellContent={getData}
        columns={columns}
        rows={data.length}
      />
    </div>
  );
}
