import { sql } from '@flowblade/sql-tag';

import {
  SqlFormatter,
  type SqlFormatterDialect,
  type SqlFormatterOptions,
} from './sql-formatter';

describe('Sql tag formatter', () => {
  const dialects = [
    'bigquery',
    'db2',
    'db2i',
    'hive',
    'mariadb',
    'mysql',
    'n1ql',
    'plsql',
    'postgresql',
    'redshift',
    'singlestoredb',
    'snowflake',
    'spark',
    'sql',
    'sqlite',
    'tidb',
    'transactsql',
    'trino',
    'tsql',
  ] as const satisfies SqlFormatterDialect[];

  const formatterOptions = {
    keywordCase: 'preserve',
    identifierCase: 'preserve',
    dataTypeCase: 'preserve',
    functionCase: 'preserve',
    logicalOperatorNewline: 'before',
    expressionWidth: 50,
    linesBetweenQueries: 1,
    denseOperators: false,
    newlineBeforeSemicolon: false,
    useTabs: false,
    tabWidth: 2,
  } as const satisfies SqlFormatterOptions;

  describe('formatOrNull', () => {
    it.each(dialects)('should format the query for %s', (dialect) => {
      const sqlFormatter = new SqlFormatter(dialect, formatterOptions);
      const formatted = sqlFormatter.formatOrThrow(
        sql`SELECT * FROM table WHERE id = 1`
      );
      expect(formatted).toMatchSnapshot();
    });
    describe('formatOrThrow', () => {
      it.each(dialects)('should format the query for %s', (dialect) => {
        const sqlFormatter = new SqlFormatter(dialect, formatterOptions);
        const formatted = sqlFormatter.formatOrThrow(
          sql`SELECT * FROM table WHERE id = 1`
        );
        expect(formatted).toMatchSnapshot();
      });
    });
  });
  describe('Invalid query', () => {
    const invalidSql = sql`SELECT [A] FROM TABLE WHERE 1 = TABLE`;
    describe('formatOrNull', () => {
      it('should return null when the query is invalid', () => {
        const sqlFormatter = new SqlFormatter('sql', formatterOptions);
        const formatted = sqlFormatter.formatOrNull(invalidSql);
        expect(formatted).toBeNull();
      });
    });
    describe('formatOrThrow', () => {
      it('should return null when the query is invalid', () => {
        const sqlFormatter = new SqlFormatter('sql', formatterOptions);

        expect(() => {
          sqlFormatter.formatOrThrow(invalidSql);
        }).toThrow();
      });
    });
  });
  describe('Complex transact sql query', () => {
    it('should format the query', () => {
      const sqlFormatter = new SqlFormatter('transactsql', formatterOptions);
      const sqlRaw = sql`
          -- TRANSACT-SQL
          DECLARE @InitialData NVARCHAR(MAX); 
          DECLARE @ProductToUpdate NVARCHAR(MAX);        
          SET @InitialData = ${JSON.stringify([])};
          SET @ProductToUpdate = ${JSON.stringify([])};
      
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
               FROM OPENJSON(@InitialData) WITH (
                   productId NVARCHAR(255), 
                   countryId NVARCHAR(255),
                   productName NVARCHAR(255)
               );
                
          -- FROM HERE I AM IN A SITUATION WHERE THE TABLE Is FILLED
          UPDATE T
          SET productName = tNewData.productName
          FROM (SELECT productId, countryId, productName 
                FROM OPENJSON(@ProductToUpdate) 
                WITH (
                    productId NVARCHAR(255), 
                    countryId NVARCHAR(255),
                    productName NVARCHAR(255))
                ) AS tNewData
          INNER JOIN #correctedProducts AS T
          ON tNewData.productId = T.productId and T.countryId = tNewData.countryId;    
          
          -- SELECT
          SELECT TOP ${sql.unsafeRaw(String(10))} productId, countryId, productName, createdAt, updatedAt 
          FROM #correctedProducts;
      `;

      const formatted = sqlFormatter.formatOrThrow(sqlRaw, {
        options: {
          /**
           * @see https://github.com/sql-formatter-org/sql-formatter/blob/master/docs/paramTypes.md#option-value
           */
          paramTypes: {
            positional: true,
          },
        },
      });

      expect(formatted).toMatchSnapshot();
    });
  });
});
