CREATE TABLE [common].[locale] (
    [id] SMALLINT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(5) NOT NULL,
    [name_native] VARCHAR(40) NOT NULL,
    [flag_active] BIT NOT NULL CONSTRAINT [locale_flag_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL,
    [updated_at] DATETIME2,
    CONSTRAINT [locale_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [locale_code_key] UNIQUE NONCLUSTERED ([code])
)
GO
CREATE TABLE [common].[currency] (
    [id] SMALLINT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(3) NOT NULL,
    [numeric_code] SMALLINT NOT NULL,
    [name_native] VARCHAR(40) NOT NULL,
    [name_native_plural] VARCHAR(40),
    [symbol] VARCHAR(5),
    [symbol_native] VARCHAR(5),
    [rounding] CHAR(5) CONSTRAINT [currency_rounding_df] DEFAULT '0',
    [display_decimals] SMALLINT CONSTRAINT [currency_display_decimals_df] DEFAULT 2,
    [withdrawal_at] DATETIME2,
    [flag_active] BIT NOT NULL CONSTRAINT [currency_flag_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL,
    [updated_at] DATETIME2,
    CONSTRAINT [currency_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [currency_code_key] UNIQUE NONCLUSTERED ([code]),
    CONSTRAINT [currency_numeric_code_key] UNIQUE NONCLUSTERED ([numeric_code])
)
GO
CREATE TABLE [common].[currency_i18n] (
    [id] INT NOT NULL IDENTITY(1,1),
    [currency_id] SMALLINT NOT NULL,
    [locale_id] SMALLINT NOT NULL,
    [name] VARCHAR(40) NOT NULL,
    [name_plural] VARCHAR(40),
    [created_at] DATETIME2 NOT NULL,
    [updated_at] DATETIME2,
    CONSTRAINT [currency_i18n_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [currency_i18n_currency_id_locale_id_key] UNIQUE NONCLUSTERED ([currency_id],[locale_id]),
    CONSTRAINT [currency_i18n_locale_id_name_key] UNIQUE NONCLUSTERED ([locale_id],[name])
)
GO
ALTER TABLE [common].[currency_i18n] ADD CONSTRAINT [currency_i18n_currency_id_fkey] FOREIGN KEY ([currency_id]) REFERENCES [common].[currency]([id]) ON DELETE NO ACTION ON UPDATE CASCADE
GO
ALTER TABLE [common].[currency_i18n] ADD CONSTRAINT [currency_i18n_locale_id_fkey] FOREIGN KEY ([locale_id]) REFERENCES [common].[locale]([id]) ON DELETE NO ACTION ON UPDATE CASCADE