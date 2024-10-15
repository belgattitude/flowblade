import { fixSqlServerNullUniqueIndexes } from './fix-sql-server-null-unique-indexes';

describe('hack', () => {
  it('should fix unique indexes', () => {
    const ddl = `
      CREATE TABLE [common].[currency_i18n2] (
          [id] INT NOT NULL IDENTITY(1,1),
          [currency_id] SMALLINT NOT NULL,
          [locale] VARCHAR(5) NOT NULL,
          [name] VARCHAR(40) NOT NULL,
          [description] VARCHAR(40) NULL,
          [barcode_ean13] CHAR(13),
          [test] VARCHAR(40) NOT NULL,          
          CONSTRAINT [currency_i18n2_pkey] PRIMARY KEY CLUSTERED ([id]),          
          CONSTRAINT [currency_i18n2_name_key] UNIQUE NONCLUSTERED ([name]),
          CONSTRAINT [currency_i18n2_description_key] UNIQUE NONCLUSTERED ([description]),
          CONSTRAINT [currency_i18n2_barcode_ean13] UNIQUE NONCLUSTERED ([barcode_ean13]),
          CONSTRAINT [currency_i18n2_description_test_key] UNIQUE NONCLUSTERED ([description],[test]),
          CONSTRAINT [currency_i18n2_currency_id_locale_key] UNIQUE NONCLUSTERED ([currency_id],[locale]),
        ); 

      `;
    const fixed = fixSqlServerNullUniqueIndexes([ddl]);
    expect(fixed).toMatchSnapshot();
  });
});
