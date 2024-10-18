BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[locale] (
    [id] SMALLINT NOT NULL IDENTITY(1,1),
    [locale] VARCHAR(5) NOT NULL,
    [name_native] VARCHAR(40) NOT NULL,
    [flag_active] BIT NOT NULL CONSTRAINT [locale_flag_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL,
    [updated_at] DATETIME2,
    CONSTRAINT [locale_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [locale_locale_key] UNIQUE NONCLUSTERED ([locale])
);

-- CreateTable
CREATE TABLE [dbo].[currency] (
    [id] SMALLINT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(3) NOT NULL,
    [numeric_code] SMALLINT NOT NULL,
    [name] VARCHAR(40) NOT NULL,
    [name_plural] VARCHAR(40),
    [symbol] NVARCHAR(5),
    [symbol_native] NVARCHAR(5),
    [rounding] CHAR(5) CONSTRAINT [currency_rounding_df] DEFAULT '0',
    [display_decimals] SMALLINT CONSTRAINT [currency_display_decimals_df] DEFAULT 2,
    [withdrawal_at] DATETIME2,
    [flag_active] BIT NOT NULL CONSTRAINT [currency_flag_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL,
    [updated_at] DATETIME2,
    CONSTRAINT [currency_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [currency_code_key] UNIQUE NONCLUSTERED ([code]),
    CONSTRAINT [currency_numeric_code_key] UNIQUE NONCLUSTERED ([numeric_code])
);

-- CreateTable
CREATE TABLE [dbo].[brand] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(40) NOT NULL,
    [flag_active] BIT NOT NULL CONSTRAINT [brand_flag_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL,
    [updated_at] DATETIME2,
    CONSTRAINT [brand_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [brand_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[product] (
    [id] INT NOT NULL IDENTITY(1,1),
    [brand_id] INT,
    [reference] VARCHAR(40) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [barcode_ean13] CHAR(13) NOT NULL,
    [flag_active] BIT NOT NULL CONSTRAINT [product_flag_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL,
    [updated_at] DATETIME2,
    CONSTRAINT [product_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [product_reference_key] UNIQUE NONCLUSTERED ([reference])
);

-- CreateTable
CREATE TABLE [dbo].[product_i18n] (
    [id] INT NOT NULL IDENTITY(1,1),
    [product_id] INT NOT NULL,
    [locale] VARCHAR(5) NOT NULL,
    [name] VARCHAR(40) NOT NULL,
    [created_at] DATETIME2 NOT NULL,
    [updated_at] DATETIME2,
    CONSTRAINT [product_i18n_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [product_i18n_product_id_locale_key] UNIQUE NONCLUSTERED ([product_id],[locale])
);

-- CreateTable
CREATE TABLE [dbo].[currency_i18n] (
    [id] INT NOT NULL IDENTITY(1,1),
    [currency_id] SMALLINT NOT NULL,
    [locale] VARCHAR(5) NOT NULL,
    [name] VARCHAR(40) NOT NULL,
    [name_plural] VARCHAR(40),
    [created_at] DATETIME2 NOT NULL,
    [updated_at] DATETIME2,
    CONSTRAINT [currency_i18n_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [currency_i18n_currency_id_locale_key] UNIQUE NONCLUSTERED ([currency_id],[locale]),
    CONSTRAINT [currency_i18n_locale_name_key] UNIQUE NONCLUSTERED ([locale],[name])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [brand_name_idx] ON [dbo].[brand]([name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_name_idx] ON [dbo].[product]([name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_barcode_ean13_idx] ON [dbo].[product]([barcode_ean13]);

-- AddForeignKey
ALTER TABLE [dbo].[product] ADD CONSTRAINT [product_brand_id_fkey] FOREIGN KEY ([brand_id]) REFERENCES [dbo].[brand]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[product_i18n] ADD CONSTRAINT [product_i18n_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[product]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[product_i18n] ADD CONSTRAINT [product_i18n_locale_fkey] FOREIGN KEY ([locale]) REFERENCES [dbo].[locale]([locale]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[currency_i18n] ADD CONSTRAINT [currency_i18n_currency_id_fkey] FOREIGN KEY ([currency_id]) REFERENCES [dbo].[currency]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[currency_i18n] ADD CONSTRAINT [currency_i18n_locale_fkey] FOREIGN KEY ([locale]) REFERENCES [dbo].[locale]([locale]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
