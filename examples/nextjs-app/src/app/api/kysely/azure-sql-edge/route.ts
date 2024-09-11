import { sql } from 'kysely';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { dbKysely } from '@/server/config/db.kysely.config';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const _row = await sql<{
    id: number;
    name: string;
  }>`SELECT 'world' as name, 1 as id`.execute(dbKysely);

  const params = Array.from({ length: 10_000 }, (_, i) => ({
    name: `name_${i}`,
    value: `value_${i}`,
  }));

  const exec = await sql<{ name: string }>`
     DECLARE @JsonParams NVARCHAR(MAX);
     SET @JsonParams = ${JSON.stringify(params)};        
     CREATE TABLE #TempTable (name NVARCHAR(255), value NVARCHAR(255));
     INSERT INTO #TempTable SELECT name, value FROM OPENJSON(@JsonParams) WITH (name NVARCHAR(255), value NVARCHAR(255));
     SELECT name, value FROM #TempTable;
  `.execute(dbKysely);

  return NextResponse.json({
    // check:
    //  JSON.stringify(JSON.parse(exec.rows[0].name)) === JSON.stringify(params),
    // db: row.rows,
    test: exec.rows,
    // exec: JSON.parse(exec.rows[0].name) as { name: string }[],
  });
}
