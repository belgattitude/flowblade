import isInCi from "is-in-ci";
import { sql } from "kysely";

import type { KyselyDatasource } from "../../../src";

export type mssqlE2eDb = {
  TestTable: {
    id: number;
    name: string;
    // tedious doesn't support returning numbers as bigint,
    // they're sent as string
    positive_bigint: string | null;
    negative_bigint: string | null;
    null_column: number | null;
    created_at: Date;
  };
  TestTableLinked: {
    id: number;
    name: string;
    test_table_id: number | null;
  };
};

export const positiveBigint = 9_223_372_036_854_775_807n;
export const negativeBigint = -9_223_372_036_854_775_808n;

export const testDataCount = isInCi ? 10 : 100;

const data = Array.from({ length: testDataCount }).map((_v, idx) => {
  return {
    id: idx,
    name: `name-${idx}`,
  };
});

export const getMssqlE2eMigrations = (
  sqlServerDs: KyselyDatasource<mssqlE2eDb>
): {
  up: () => Promise<void>;
  down: () => Promise<void>;
} => {
  return {
    up: async () => {
      await sqlServerDs.queryOrThrow(
        sql`CREATE TABLE TestTable (
               id INT PRIMARY KEY, 
               name NVARCHAR(255) NOT NULL,
               positive_bigint BIGINT,
               negative_bigint BIGINT,
               null_column INT,
               created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
        );`
      );

      await sqlServerDs.queryOrThrow(
        sql`CREATE TABLE TestTableLinked (
               id INT PRIMARY KEY, 
               name NVARCHAR(255) NOT NULL,
               test_table_id INT
        );`
      );

      const insert = sql`

        DECLARE @Data NVARCHAR(MAX); -- WARNING LIMIT TO 2GB
        SET @Data = ${JSON.stringify(data)};

        INSERT INTO TestTable (id, name)
        SELECT id, name
        FROM OPENJSON(@Data) WITH (
          id INT,
          name NVARCHAR(255)
          );
      `;

      await sqlServerDs.queryOrThrow(insert);

      await sqlServerDs.queryOrThrow(sql`
           update TestTable set 
             positive_bigint = ${positiveBigint},
             negative_bigint = ${negativeBigint}          
      `);
    },
    down: async () => {
      await sqlServerDs.query(sql`DROP TABLE TestTable;`);
      await sqlServerDs.query(sql`DROP TABLE TestTableLinked;`);
    },
  };
};
