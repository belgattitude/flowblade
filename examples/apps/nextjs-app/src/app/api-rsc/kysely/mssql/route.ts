import { faker } from '@faker-js/faker';
import { KyselyDatasource } from '@flowblade/source-kysely';
import { sql } from 'kysely';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { dbKyselyMssql } from '@/server/config/db.kysely-mssql.config';

export const dynamic = 'force-dynamic';

type Row = {
  countryId: string;
  productId: string;
  productName: string;
};

const initialTableData: Row[] = Array.from({ length: 1000 }, (_) => ({
  countryId: faker.location.countryCode('alpha-2'),
  productId: faker.commerce.isbn(13),
  productName: faker.commerce.productName(),
}));

const productToUpdate = initialTableData.slice(0, 10).map((row) => ({
  ...row,
  productName: `Updated ! ${row.productName}`,
}));

export async function GET(_req: NextRequest) {
  const qRaw = sql<Row[]>`
    -- TRANSACT-SQL
    DECLARE @InitialData NVARCHAR(MAX); -- WARNING LIMIT TO 2GB
    DECLARE @ProductToUpdate NVARCHAR(MAX);        
    SET @InitialData = ${JSON.stringify(initialTableData)};
    SET @ProductToUpdate = ${JSON.stringify(productToUpdate)};

    -- DDL
    CREATE TABLE #correctedProducts (
      productId NVARCHAR(255),
      countryId NVARCHAR(10),
      productName NVARCHAR(255),
      createdAt DATETIME DEFAULT GETDATE(),
      updatedAt DATETIME DEFAULT GETDATE(),
    );
    -- INSERT
    
    INSERT INTO #correctedProducts (productId, countryId, productName)
       SELECT productId, countryId, productName
         FROM OPENJSON(@InitialData) WITH (productId NVARCHAR(255), countryId NVARCHAR(255),productName NVARCHAR(255));
          
    -- FROM HERE I AM IN A SITUATION WHERE THE TABLE Is FILLED
    
    UPDATE T
    SET productName = tNewData.productName
    FROM (SELECT productId, countryId, productName FROM OPENJSON(@ProductToUpdate) WITH (productId NVARCHAR(255), countryId NVARCHAR(255),productName NVARCHAR(255))) AS tNewData
    INNER JOIN #correctedProducts AS T
    ON tNewData.productId = T.productId and T.countryId = tNewData.countryId;    
    
    -- SELECT
    SELECT productId, countryId, productName, createdAt, updatedAt 
    FROM #correctedProducts;
  `;

  /*
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
*/
  const db = new KyselyDatasource({
    connection: dbKyselyMssql,
  });

  const result = await db.query(qRaw);

  return NextResponse.json(result.toJsonifiable());
}
