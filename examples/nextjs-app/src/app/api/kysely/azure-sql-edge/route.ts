import { faker } from '@faker-js/faker';
import { AbstractQuery, KyselyExecutor } from '@flowblade/source-kysely';
import type { PlainObject } from '@httpx/plain-object';
import { sql } from 'kysely';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { dbKysely } from '@/server/config/db.kysely.config';

export const dynamic = 'force-dynamic';

type Params = PlainObject<{
  jsonArray: {
    name: string;
    value: string;
  }[];
}>;

class Query1 extends AbstractQuery<unknown> {
  guards = {
    permissions: ['test'],
  };
  getQuery = (params: Params) => {
    const { jsonArray } = params;
    return sql<{ name: string; value: string }>`
     DECLARE @JsonParams NVARCHAR(MAX);
     SET @JsonParams = ${JSON.stringify(jsonArray)};        
     CREATE TABLE #TempTable (name NVARCHAR(255), value NVARCHAR(255));
     INSERT INTO #TempTable SELECT name, value FROM OPENJSON(@JsonParams) WITH (name NVARCHAR(255), value NVARCHAR(255));
     SELECT t1.name, t1.value 
     FROM #TempTable AS t1
     INNER JOIN (
       SELECT name, value FROM OPENJSON(@JsonParams) WITH (name NVARCHAR(255), value NVARCHAR(255))
     ) AS t2 ON t1.name = t2.name AND t1.value = t2.value;
  `;
  };
}

const params = Array.from({ length: 10 }, (_, i) => ({
  name: faker.person.firstName(),
  value: `value_${i}`,
}));

export async function GET(_req: NextRequest) {
  const qRaw = sql<{ name: string; value: string }>`
     DECLARE @JsonParams NVARCHAR(MAX);
     SET @JsonParams = ${JSON.stringify(params)};        
     -- CREATE TABLE #TempTable (name NVARCHAR(255), value NVARCHAR(255));
     -- INSERT INTO #TempTable SELECT name, value FROM OPENJSON(@JsonParams) WITH (name NVARCHAR(255), value NVARCHAR(255));
     SELECT name, value FROM OPENJSON(@JsonParams) WITH (name NVARCHAR(255), value NVARCHAR(255))
     -- SELECT t1.name, t1.value 
     -- FROM #TempTable AS t1
     -- INNER JOIN (
     -- SELECT name, value FROM OPENJSON(@JsonParams) WITH (name NVARCHAR(255), value NVARCHAR(255))
     -- ) AS t2 ON t1.name = t2.name AND t1.value = t2.value;
  `;

  const db = new KyselyExecutor({
    connection: dbKysely,
  });

  const result = await db.query(qRaw);

  return NextResponse.json(result);
}
