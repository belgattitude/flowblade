import type { KyselyDatasource } from "@flowblade/source-kysely";
import isInCi from "is-in-ci";
import { sql } from "kysely";
import { describe } from "vitest";

export type mssqlE2eDb = {
  TestTable: {
    id: number;
    name: string;
    // tedious doesn't support returning numbers as bigint,
    // they're sent as string
    positive_bigint: string | null;
    negative_bigint: string | null;
    null_column: number | null;
    iso_date: Date | null;
    decimal_18_3: number;
  };
};

export const testDataCount = isInCi ? 2500 : 5000;

export const anIsoDate = new Date("2026-12-28T23:59:59.653Z");

export const positiveBigint = 9_223_372_036_854_775_807n;
export const negativeBigint = -9_223_372_036_854_775_808n;

export const mssqlE2eData = Array.from({ length: testDataCount }).map(
  (_v, idx) => {
    return {
      id: idx,
      name: `name-${idx}`,
      decimal_18_3: Number(
        `${idx + 1}.${((idx + 1) % 1000).toString(10).padStart(3, "0")}`
      ),
      iso_date: anIsoDate,
    };
  }
);

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
               decimal_18_3 DECIMAL(18,3),
               iso_date DATE,
            );`
      );

      const insert = sql`

        DECLARE @Data NVARCHAR(MAX); -- WARNING LIMIT TO 2GB
        SET @Data = ${JSON.stringify(mssqlE2eData)};

        INSERT INTO TestTable (id, name, decimal_18_3, iso_date)
        SELECT id, name, decimal_18_3, iso_date
        FROM OPENJSON(@Data) WITH (
          id INT,
          name NVARCHAR(255),
          decimal_18_3 DECIMAL(18,3),
          iso_date DATE
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
    },
  };
};
