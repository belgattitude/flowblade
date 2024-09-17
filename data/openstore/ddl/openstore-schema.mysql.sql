# Taken from https://github.com/belgattitude/openstore-schema-core/blob/master/resources/sql/create_schema_utf8mb4.sql
CREATE TABLE sale_order_line
(
    line_id            BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    order_id           BIGINT UNSIGNED   DEFAULT NULL,
    status_id          SMALLINT UNSIGNED              NOT NULL,
    delivery_id        BIGINT UNSIGNED   DEFAULT NULL,
    invoice_id         BIGINT UNSIGNED   DEFAULT NULL,
    product_id         BIGINT UNSIGNED                NOT NULL,
    line_number        SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Order line number for display, sort....',
    reference          VARCHAR(60)       DEFAULT NULL COMMENT 'Reference',
    quantity           NUMERIC(12, 6)                 NOT NULL COMMENT 'Ordered quantity',
    price              NUMERIC(12, 6)                 NOT NULL COMMENT 'Total price of line',
    discount_1         NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 1',
    discount_2         NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 2',
    discount_3         NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 3',
    discount_4         NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 4',
    comment            VARCHAR(512)      DEFAULT NULL COMMENT 'Internal comment',
    customer_reference VARCHAR(60)       DEFAULT NULL COMMENT 'Customer reference',
    customer_comment   VARCHAR(255)      DEFAULT NULL COMMENT 'Customer comment',
    delivered_at       DATETIME          DEFAULT NULL COMMENT 'Delivery date',
    invoiced_at        DATETIME          DEFAULT NULL COMMENT 'Invoice date',
    created_at         DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at         DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    deleted_at         DATETIME          DEFAULT NULL COMMENT 'Record deletion date',
    created_by         VARCHAR(40)       DEFAULT NULL COMMENT 'Creator name',
    updated_by         VARCHAR(40)       DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping     VARCHAR(40)       DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at  DATETIME          DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_61B16AA58D9F6D38 (order_id),
    INDEX IDX_61B16AA56BF700BD (status_id),
    INDEX IDX_61B16AA512136921 (delivery_id),
    INDEX IDX_61B16AA52989F1FD (invoice_id),
    INDEX IDX_61B16AA54584665A (product_id),
    INDEX delivered_at_idx (delivered_at),
    INDEX invoiced_at_idx (invoiced_at),
    INDEX line_number_idx (line_number),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (line_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Order line table';
--
-- schema object
--
CREATE TABLE user_scope
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    user_id           INT UNSIGNED                   NOT NULL,
    customer_id       INT UNSIGNED                   NOT NULL,
    flag_active       TINYINT(1)  DEFAULT '1'        NOT NULL COMMENT 'Whether the user can activate the pricelist',
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_E26DAE8BA76ED395 (user_id),
    INDEX IDX_E26DAE8B9395C3F3 (customer_id),
    UNIQUE INDEX unique_user_customer_idx (user_id, customer_id),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'User scope (customer, rep...)';
--
-- schema object
--
CREATE TABLE product_translation
(
    id                     BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    product_id             BIGINT UNSIGNED                NOT NULL,
    lang                   VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    slug                   VARCHAR(150)  DEFAULT NULL COMMENT 'Unique slug for this record',
    title                  VARCHAR(150)  DEFAULT NULL,
    invoice_title          VARCHAR(100)  DEFAULT NULL,
    description            VARCHAR(5000) DEFAULT NULL COMMENT 'Product description',
    characteristic         VARCHAR(150)  DEFAULT NULL,
    specs                  VARCHAR(5000) DEFAULT NULL COMMENT 'Product specifications',
    usp                    VARCHAR(200)  DEFAULT NULL COMMENT 'Unique Selling Proposition',
    additional_description VARCHAR(2000) DEFAULT NULL COMMENT 'Additional description',
    keywords               VARCHAR(200)  DEFAULT NULL,
    revision               INT UNSIGNED  DEFAULT 1 COMMENT 'Translation revision number',
    created_at             DATETIME      DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at             DATETIME      DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by             VARCHAR(40)   DEFAULT NULL COMMENT 'Creator name',
    updated_by             VARCHAR(40)   DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping         VARCHAR(40)   DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at      DATETIME      DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_1846DB704584665A (product_id),
    INDEX IDX_1846DB7031098462 (lang),
    INDEX title_idx (title),
    INDEX keywords_idx (keywords),
    INDEX slug_idx (slug),
    INDEX revision_idx (revision),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (product_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product translation table'
  ROW_FORMAT = DYNAMIC;
--
-- schema object
--
CREATE TABLE product_stat_trend
(
    product_stat_trend_id                  BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    pricelist_id                           SMALLINT UNSIGNED              NOT NULL,
    product_id                             BIGINT UNSIGNED                NOT NULL,
    first_sale_recorded_at                 DATE           DEFAULT NULL COMMENT 'First recorded sale at',
    latest_sale_recorded_at                DATE           DEFAULT NULL COMMENT 'Latest recorded sale at',
    nb_customers                           INT            DEFAULT NULL COMMENT 'Number of distinct customers',
    nb_sale_reps                           INT            DEFAULT NULL COMMENT 'Number of distinct sales reps',
    nb_orders                              INT            DEFAULT NULL COMMENT 'Number of distinct orders',
    total_recorded_quantity                NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded order line quantity',
    total_recorded_turnover                NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded turn over',
    nb_customers_last_month                INT            DEFAULT NULL COMMENT 'Number of distinct customers last month',
    nb_sale_reps_last_month                INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last month',
    nb_orders_last_month                   INT            DEFAULT NULL COMMENT 'Number of distinct orders last month',
    total_recorded_quantity_last_month     NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded order line quantity last month',
    total_recorded_turnover_last_month     NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded turn over last month',
    nb_customers_last_2_months             INT            DEFAULT NULL COMMENT 'Number of distinct customers last month',
    nb_sale_reps_last_2_months             INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last month',
    nb_orders_last_2_months                INT            DEFAULT NULL COMMENT 'Number of distinct orders last month',
    total_recorded_quantity_last_2_months  NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded order line quantity last month',
    total_recorded_turnover_last_2_months  NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded turn over last month',
    nb_customers_last_3_months             INT            DEFAULT NULL COMMENT 'Number of distinct customers last month',
    nb_sale_reps_last_3_months             INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last month',
    nb_orders_last_3_months                INT            DEFAULT NULL COMMENT 'Number of distinct orders last month',
    total_recorded_quantity_last_3_months  NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded order line quantity last month',
    total_recorded_turnover_last_3_months  NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded turn over last month',
    nb_customers_last_4_months             INT            DEFAULT NULL COMMENT 'Number of distinct customers last month',
    nb_sale_reps_last_4_months             INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last month',
    nb_orders_last_4_months                INT            DEFAULT NULL COMMENT 'Number of distinct orders last month',
    total_recorded_quantity_last_4_months  NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded order line quantity last month',
    total_recorded_turnover_last_4_months  NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded turn over last month',
    nb_customers_last_5_months             INT            DEFAULT NULL COMMENT 'Number of distinct customers last month',
    nb_sale_reps_last_5_months             INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last month',
    nb_orders_last_5_months                INT            DEFAULT NULL COMMENT 'Number of distinct orders last month',
    total_recorded_quantity_last_5_months  NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded order line quantity last month',
    total_recorded_turnover_last_5_months  NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded turn over last month',
    nb_customers_last_6_months             INT            DEFAULT NULL COMMENT 'Number of distinct customers last month',
    nb_sale_reps_last_6_months             INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last month',
    nb_orders_last_6_months                INT            DEFAULT NULL COMMENT 'Number of distinct orders last month',
    total_recorded_quantity_last_6_months  NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded order line quantity last month',
    total_recorded_turnover_last_6_months  NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded turn over last month',
    nb_customers_last_7_months             INT            DEFAULT NULL COMMENT 'Number of distinct customers last 7 months',
    nb_sale_reps_last_7_months             INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last 7 months',
    nb_orders_last_7_months                INT            DEFAULT NULL COMMENT 'Number of distinct orders last 7 months',
    total_recorded_quantity_last_7_months  NUMERIC(15, 7) DEFAULT NULL COMMENT 'Total recorded order line quantity last 7 months',
    total_recorded_turnover_last_7_months  NUMERIC(15, 7) DEFAULT NULL COMMENT 'Total recorded turn over last 7 months',
    nb_customers_last_8_months             INT            DEFAULT NULL COMMENT 'Number of distinct customers last 8 months',
    nb_sale_reps_last_8_months             INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last 8 months',
    nb_orders_last_8_months                INT            DEFAULT NULL COMMENT 'Number of distinct orders last 8 months',
    total_recorded_quantity_last_8_months  NUMERIC(15, 7) DEFAULT NULL COMMENT 'Total recorded order line quantity last 8 months',
    total_recorded_turnover_last_8_months  NUMERIC(15, 7) DEFAULT NULL COMMENT 'Total recorded turn over last 8 months',
    nb_customers_last_9_months             INT            DEFAULT NULL COMMENT 'Number of distinct customers last 9 months',
    nb_sale_reps_last_9_months             INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last 9 months',
    nb_orders_last_9_months                INT            DEFAULT NULL COMMENT 'Number of distinct orders last 9 months',
    total_recorded_quantity_last_9_months  NUMERIC(15, 7) DEFAULT NULL COMMENT 'Total recorded order line quantity last 9 months',
    total_recorded_turnover_last_9_months  NUMERIC(15, 7) DEFAULT NULL COMMENT 'Total recorded turn over last 9 months',
    nb_customers_last_10_months            INT            DEFAULT NULL COMMENT 'Number of distinct customers last 10 months',
    nb_sale_reps_last_10_months            INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last 10 months',
    nb_orders_last_10_months               INT            DEFAULT NULL COMMENT 'Number of distinct orders last 10 months',
    total_recorded_quantity_last_10_months NUMERIC(15, 7) DEFAULT NULL COMMENT 'Total recorded order line quantity last 10 months',
    total_recorded_turnover_last_10_months NUMERIC(15, 7) DEFAULT NULL COMMENT 'Total recorded turn over last 10 months',
    nb_customers_last_11_months            INT            DEFAULT NULL COMMENT 'Number of distinct customers last 11 months',
    nb_sale_reps_last_11_months            INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last 11 months',
    nb_orders_last_11_months               INT            DEFAULT NULL COMMENT 'Number of distinct orders last 11 months',
    total_recorded_quantity_last_11_months NUMERIC(15, 7) DEFAULT NULL COMMENT 'Total recorded order line quantity last 11 months',
    total_recorded_turnover_last_11_months NUMERIC(15, 7) DEFAULT NULL COMMENT 'Total recorded turn over last 11 months',
    nb_customers_last_12_months            INT            DEFAULT NULL COMMENT 'Number of distinct customers last month',
    nb_sale_reps_last_12_months            INT            DEFAULT NULL COMMENT 'Number of distinct sales reps last month',
    nb_orders_last_12_months               INT            DEFAULT NULL COMMENT 'Number of distinct orders last month',
    total_recorded_quantity_last_12_months NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded order line quantity last month',
    total_recorded_turnover_last_12_months NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded turn over last month',
    legacy_synchro_at                      DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_BBBB19B89045958 (pricelist_id),
    INDEX IDX_BBBB19B4584665A (product_id),
    INDEX first_sale_recorded_at_idx (first_sale_recorded_at),
    INDEX latest_sale_recorded_at_idx (latest_sale_recorded_at),
    INDEX total_recorded_quantity_last_12_months_idx (
                                                      total_recorded_quantity_last_12_months
        ),
    INDEX total_recorded_turnover_last_12_months_idx (
                                                      total_recorded_turnover_last_12_months
        ),
    UNIQUE INDEX unique_product_price_idx (pricelist_id, product_id),
    PRIMARY KEY (product_stat_trend_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product sale trend stats';
--
-- schema object
--
CREATE TABLE pricelist_group
(
    group_id          SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                      NOT NULL COMMENT 'Pricelist group reference',
    title             VARCHAR(80)  DEFAULT NULL,
    sort_index        INT UNSIGNED DEFAULT NULL COMMENT 'Relative sort index',
    created_at        DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)  DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME     DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX sort_index_idx (sort_index),
    PRIMARY KEY (group_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Pricelist groups table';
--
-- schema object
--
CREATE TABLE product_brand
(
    brand_id          INT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                 NOT NULL COMMENT 'Reference',
    slug              VARCHAR(64)    DEFAULT NULL COMMENT 'Unique slug for this record',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    url               VARCHAR(80)    DEFAULT NULL COMMENT 'Brand homepage',
    logo_url          VARCHAR(255)   DEFAULT NULL COMMENT 'Url to logo',
    flag_active       TINYINT(1)     DEFAULT '1'  NOT NULL COMMENT 'Whether the brand is currently active',
    flag_public       TINYINT(1)     DEFAULT '1'  NOT NULL COMMENT 'Whether the brand is active in public website',
    icon_class        VARCHAR(40)    DEFAULT NULL,
    sort_index        INT UNSIGNED   DEFAULT NULL COMMENT 'Relative sort index',
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX sort_index_idx (sort_index),
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_title_idx (title),
    UNIQUE INDEX unique_slug_idx (slug),
    PRIMARY KEY (brand_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product brand table';
--
-- schema object
--
CREATE TABLE sale_order_line_status
(
    status_id         SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                      NOT NULL COMMENT 'Reference',
    title             VARCHAR(80) DEFAULT NULL,
    flag_default      TINYINT(1)  DEFAULT NULL COMMENT 'Is the default state',
    flag_readonly     TINYINT(1)  DEFAULT '0'          NOT NULL COMMENT 'Is readonly',
    flag_active       TINYINT(1)  DEFAULT '1'          NOT NULL COMMENT 'Whether the model is active in public website',
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_flag_default_idx (flag_default),
    PRIMARY KEY (status_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Order line status table';
--
-- schema object
--
CREATE TABLE language
(
    id                SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    lang              VARCHAR(2)                       NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    title             VARCHAR(40) DEFAULT NULL,
    flag_active       TINYINT(1)  DEFAULT '1'          NOT NULL COMMENT 'Whether the language is active',
    flag_default      TINYINT(1)  DEFAULT NULL COMMENT 'Is the language default',
    icon_class        VARCHAR(40) DEFAULT NULL,
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX title_idx (title),
    UNIQUE INDEX unique_lang_idx (lang),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_flag_default_idx (flag_default),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Language table';
--
-- schema object
--
CREATE TABLE user
(
    user_id     INT UNSIGNED AUTO_INCREMENT NOT NULL,
    lang        VARCHAR(2)  DEFAULT NULL COMMENT 'iso_631_1 language code 2 digits',
    username    VARCHAR(80) DEFAULT NULL,
    email       VARCHAR(130)                NOT NULL,
    displayName VARCHAR(50) DEFAULT NULL,
    password    VARCHAR(128)                NOT NULL,
    INDEX IDX_8D93D64931098462 (lang),
    UNIQUE INDEX unique_username_idx (username),
    UNIQUE INDEX unique_email_idx (email),
    PRIMARY KEY (user_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'User table';
--
-- schema object
--
CREATE TABLE user_role
(
    user_id INT UNSIGNED NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    INDEX IDX_2DE8C6A3A76ED395 (user_id),
    INDEX IDX_2DE8C6A3D60322AC (role_id),
    PRIMARY KEY (user_id, role_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB;
--
-- schema object
--
CREATE TABLE product_stub
(
    product_stub_id   INT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                 NOT NULL COMMENT 'Unique reference',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (product_stub_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product stub';
--
-- schema object
--
CREATE TABLE country
(
    country_id        SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(2)                       NOT NULL COMMENT 'ISO country code',
    name              VARCHAR(40)                      NOT NULL,
    flag_active       TINYINT(1)  DEFAULT '1'          NOT NULL COMMENT 'Whether the brand is country in public website',
    icon_class        VARCHAR(40) DEFAULT NULL,
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (country_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Country table';
--
-- schema object
--
CREATE TABLE api_key
(
    api_id            INT UNSIGNED AUTO_INCREMENT NOT NULL,
    api_key           VARCHAR(64)                 NOT NULL COMMENT 'Api key (token)',
    flag_active       TINYINT(1)  DEFAULT '1'     NOT NULL COMMENT 'Whether the api_key is active',
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_api_key_idx (api_key),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (api_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Api credentials';
--
-- schema object
--
CREATE TABLE media_video_file
(
    video_source_id  BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    media_id         BIGINT UNSIGNED                NOT NULL,
    format_reference VARCHAR(80)  DEFAULT NULL COMMENT 'Format reference for media file',
    link_url         VARCHAR(385) DEFAULT NULL COMMENT 'Only for remote content (with a null container)',
    mimetype         VARCHAR(50)  DEFAULT NULL,
    video_width      SMALLINT     DEFAULT NULL,
    video_height     SMALLINT     DEFAULT NULL,
    comment          VARCHAR(255) DEFAULT NULL,
    created_at       DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at       DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by       VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by       VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    INDEX IDX_812DA558EA9FDD75 (media_id),
    UNIQUE INDEX unique_format_per_media (media_id, format_reference),
    PRIMARY KEY (video_source_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Media video source files';
--
-- schema object
--
CREATE TABLE pricelist
(
    pricelist_id                    SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    stock_id                        SMALLINT UNSIGNED                NOT NULL,
    group_id                        SMALLINT UNSIGNED DEFAULT NULL,
    currency_id                     INT UNSIGNED                     NOT NULL,
    rank_pricelist_id               SMALLINT UNSIGNED DEFAULT NULL,
    discount_condition_pricelist_id SMALLINT UNSIGNED DEFAULT NULL,
    reference                       VARCHAR(10)                      NOT NULL COMMENT 'Unique pricelist reference',
    title                           VARCHAR(80)       DEFAULT NULL,
    description                     VARCHAR(15000)    DEFAULT NULL,
    flag_enable_discount_condition  TINYINT(1)        DEFAULT '1'    NOT NULL COMMENT 'Whether this pricelist must honour special discount conditions',
    flag_default                    TINYINT(1)        DEFAULT NULL COMMENT 'Whether this pricelist is default',
    flag_public                     TINYINT(1)        DEFAULT '1'    NOT NULL COMMENT 'Whether the pricelist is public',
    flag_active                     TINYINT(1)        DEFAULT '1'    NOT NULL COMMENT 'Whether the brand is active in public website',
    cond_product_new_max_days       SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Flag products as new if more recent than the number of days',
    sort_index                      INT UNSIGNED      DEFAULT NULL COMMENT 'Relative sort index',
    icon_class                      VARCHAR(40)       DEFAULT NULL,
    created_at                      DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at                      DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by                      VARCHAR(40)       DEFAULT NULL COMMENT 'Creator name',
    updated_by                      VARCHAR(40)       DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping                  VARCHAR(40)       DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at               DATETIME          DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_5CCFEA6DDCD6110 (stock_id),
    INDEX IDX_5CCFEA6DFE54D947 (group_id),
    INDEX IDX_5CCFEA6D38248176 (currency_id),
    INDEX IDX_5CCFEA6D5ECD273E (rank_pricelist_id),
    INDEX IDX_5CCFEA6D2E5F6947 (
                                discount_condition_pricelist_id
        ),
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_flag_default_idx (flag_default),
    UNIQUE INDEX sort_index_idx (sort_index),
    PRIMARY KEY (pricelist_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Pricelist table';
--
-- schema object
--
CREATE TABLE product_serie_media
(
    id                    BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    serie_id              INT UNSIGNED                   NOT NULL,
    media_id              BIGINT UNSIGNED                NOT NULL,
    product_media_type_id INT UNSIGNED                   NOT NULL,
    flag_primary          TINYINT(1)   DEFAULT NULL,
    sort_index            INT UNSIGNED DEFAULT NULL,
    created_at            DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at            DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by            VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by            VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping        VARCHAR(40)  DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at     DATETIME     DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_E0F0B87D94388BD (serie_id),
    INDEX IDX_E0F0B87EA9FDD75 (media_id),
    INDEX IDX_E0F0B877E761628 (product_media_type_id),
    INDEX sort_index_idx (sort_index),
    UNIQUE INDEX unique_product_media_type_idx (
                                                serie_id, media_id, product_media_type_id
        ),
    UNIQUE INDEX unique_product_type_flag_primary_idx (
                                                       product_media_type_id, serie_id,
                                                       flag_primary
        ),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product serie media table';
--
-- schema object
--
CREATE TABLE sale_order_status_translation
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    status_id         SMALLINT UNSIGNED              NOT NULL,
    lang              VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    title             VARCHAR(80) DEFAULT NULL,
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_7017D856BF700BD (status_id),
    INDEX IDX_7017D8531098462 (lang),
    INDEX title_idx (title),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (status_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Order type translation table';
--
-- schema object
--
CREATE TABLE product_group_translation
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    group_id          INT UNSIGNED                   NOT NULL,
    lang              VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    slug              VARCHAR(64)    DEFAULT NULL COMMENT 'Unique slug for this record',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_255468FDFE54D947 (group_id),
    INDEX IDX_255468FD31098462 (lang),
    INDEX title_idx (title),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (group_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product group translation table';
--
-- schema object
--
CREATE TABLE media
(
    media_id           BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    type_id            INT UNSIGNED    DEFAULT NULL,
    container_id       BIGINT UNSIGNED DEFAULT NULL,
    remote_media_url   VARCHAR(385)    DEFAULT NULL COMMENT 'Only for remote content (with a null container)',
    remote_media_id    VARCHAR(64)     DEFAULT NULL COMMENT 'External media id, only for remote content (with a null container)',
    remote_preview_url VARCHAR(255)    DEFAULT NULL COMMENT 'Remote media image preview url',
    mimetype           VARCHAR(60)     DEFAULT NULL,
    filename           VARCHAR(120)    DEFAULT NULL,
    location           VARCHAR(255)    DEFAULT NULL,
    filesize           BIGINT UNSIGNED DEFAULT NULL COMMENT 'Filesize in bytes',
    duration           INT UNSIGNED    DEFAULT NULL COMMENT 'Video duration in seconds',
    filemtime          INT UNSIGNED    DEFAULT NULL,
    title              VARCHAR(100)    DEFAULT NULL,
    description        VARCHAR(255)    DEFAULT NULL,
    created_at         DATETIME        DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at         DATETIME        DEFAULT NULL COMMENT 'Record last update timestamp',
    deleted_at         DATETIME        DEFAULT NULL COMMENT 'Record deletion date',
    created_by         VARCHAR(40)     DEFAULT NULL COMMENT 'Creator name',
    updated_by         VARCHAR(40)     DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping     VARCHAR(40)     DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at  DATETIME        DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_6A2CA10CC54C8C93 (type_id),
    INDEX IDX_6A2CA10CBC21F742 (container_id),
    INDEX title_idx (title),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_container_location_idx (container_id, location),
    UNIQUE INDEX unique_remote_media_id_idx (type_id, remote_media_id),
    PRIMARY KEY (media_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Media table'
  ROW_FORMAT = DYNAMIC;
--
-- schema object
--
CREATE TABLE customer_pricelist
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    pricelist_id      SMALLINT UNSIGNED              NOT NULL,
    customer_id       INT UNSIGNED                   NOT NULL,
    flag_active       TINYINT(1)  DEFAULT '1'        NOT NULL COMMENT 'Whether the customer can activate the pricelist',
    activated_at      DATE        DEFAULT NULL COMMENT 'Date on which this pricelist was activated',
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_F732127789045958 (pricelist_id),
    INDEX IDX_F73212779395C3F3 (customer_id),
    UNIQUE INDEX unique_user_pricelist_idx (customer_id, pricelist_id),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Customer pricelists';
--
-- schema object
--
CREATE TABLE media_type
(
    type_id           INT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                 NOT NULL COMMENT 'Reference',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    icon_class        VARCHAR(40)    DEFAULT NULL,
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (type_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Media type table';
--
-- schema object
--
CREATE TABLE sale_order_type
(
    type_id           SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                      NOT NULL COMMENT 'Reference',
    title             VARCHAR(80) DEFAULT NULL,
    flag_active       TINYINT(1)  DEFAULT '1'          NOT NULL COMMENT 'Whether the model is active in public website',
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (type_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Order type table';
--
-- schema object
--
CREATE TABLE api_key_log
(
    id             BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    api_id         INT UNSIGNED                   NOT NULL,
    service_id     INT UNSIGNED DEFAULT NULL,
    remote_ip      VARCHAR(32)  DEFAULT NULL COMMENT 'Remote api',
    created_at     DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    message        VARCHAR(784) DEFAULT NULL COMMENT 'Custom message',
    execution_time INT UNSIGNED DEFAULT NULL COMMENT 'Time of execution in seconds',
    network_usage  INT UNSIGNED DEFAULT NULL COMMENT 'Size in bytes',
    usage_count    INT UNSIGNED DEFAULT 1         NOT NULL COMMENT 'Count usage',
    INDEX IDX_B608017254963938 (api_id),
    INDEX IDX_B6080172ED5CA9E6 (service_id),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Api usage logs';
--
-- schema object
--
CREATE TABLE product_department
(
    department_id     SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                      NOT NULL COMMENT 'Reference',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    icon_class        VARCHAR(40)    DEFAULT NULL,
    sort_index        INT UNSIGNED   DEFAULT NULL COMMENT 'Relative sort index',
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX sort_index_idx (sort_index),
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_title_idx (title),
    PRIMARY KEY (department_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product departments';
--
-- schema object
--
CREATE TABLE product_unit
(
    unit_id           INT UNSIGNED AUTO_INCREMENT   NOT NULL,
    reference         VARCHAR(10)                   NOT NULL COMMENT 'Universal reference, kg, m3...',
    title             VARCHAR(80)       DEFAULT NULL,
    symbol            VARCHAR(4)        DEFAULT NULL COMMENT 'Symbol',
    display_decimals  SMALLINT UNSIGNED DEFAULT 2 COMMENT 'Number of decimals to display',
    description       VARCHAR(255)      DEFAULT NULL,
    flag_active       TINYINT(1)        DEFAULT '1' NOT NULL COMMENT 'Whether the unit is active',
    icon_class        VARCHAR(40)       DEFAULT NULL,
    created_at        DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)       DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME          DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX title_idx (title),
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (unit_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product unit table';
--
-- schema object
--
CREATE TABLE media_container
(
    container_id      BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(50)                    NOT NULL,
    folder            VARCHAR(255)                   NOT NULL,
    title             VARCHAR(100) DEFAULT NULL,
    description       VARCHAR(255) DEFAULT NULL,
    created_at        DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    deleted_at        DATETIME     DEFAULT NULL COMMENT 'Record deletion date',
    created_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)  DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME     DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX title_idx (title),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_folder_idx (folder),
    UNIQUE INDEX unique_reference_idx (reference),
    PRIMARY KEY (container_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Media container table'
  ROW_FORMAT = DYNAMIC;
--
-- schema object
--
CREATE TABLE sale_rep
(
    rep_id            INT UNSIGNED AUTO_INCREMENT   NOT NULL,
    country_id        SMALLINT UNSIGNED DEFAULT NULL,
    reference         VARCHAR(60)       DEFAULT NULL COMMENT 'Reference',
    name              VARCHAR(80)                   NOT NULL,
    first_name        VARCHAR(40)       DEFAULT NULL,
    street            VARCHAR(80)       DEFAULT NULL,
    street_2          VARCHAR(80)       DEFAULT NULL,
    street_number     VARCHAR(10)       DEFAULT NULL,
    po_box            VARCHAR(10)       DEFAULT NULL,
    zipcode           VARCHAR(20)       DEFAULT NULL,
    city              VARCHAR(60)       DEFAULT NULL,
    phone             VARCHAR(20)       DEFAULT NULL,
    phone_2           VARCHAR(20)       DEFAULT NULL,
    mobile            VARCHAR(20)       DEFAULT NULL,
    mobile_2          VARCHAR(20)       DEFAULT NULL,
    fax               VARCHAR(20)       DEFAULT NULL,
    fax_2             VARCHAR(20)       DEFAULT NULL,
    email             VARCHAR(50)       DEFAULT NULL,
    email_2           VARCHAR(50)       DEFAULT NULL,
    flag_active       TINYINT(1)        DEFAULT '1' NOT NULL COMMENT 'Whether the rep is active',
    created_at        DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)       DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME          DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_C84C7443F92F3E70 (country_id),
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (rep_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Sales representative table';
--
-- schema object
--
CREATE TABLE product_category_translation
(
    id                  BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    category_id         INT UNSIGNED                   NOT NULL,
    lang                VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    slug                VARCHAR(64)  DEFAULT NULL COMMENT 'Unique slug for this record',
    title               VARCHAR(64)  DEFAULT NULL,
    description         VARCHAR(255) DEFAULT NULL,
    breadcrumb          VARCHAR(255) DEFAULT NULL,
    keywords            VARCHAR(255) DEFAULT NULL,
    rankable_breadcrumb VARCHAR(255) DEFAULT NULL COMMENT 'Rankable breadcrumb if product_category.flag_rankable is true',
    created_at          DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at          DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by          VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by          VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping      VARCHAR(40)  DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at   DATETIME     DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_1DAAB48712469DE2 (category_id),
    INDEX IDX_1DAAB48731098462 (lang),
    INDEX title_idx (title),
    FULLTEXT INDEX keywords_ft_idx (keywords),
    INDEX slug_idx (slug),
    INDEX breadcrumb_idx (breadcrumb),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (category_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product translation table'
  ROW_FORMAT = DYNAMIC;
--
-- schema object
--
CREATE TABLE packaging_type
(
    type_id           SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                      NOT NULL COMMENT 'Reference',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    flag_active       TINYINT(1)     DEFAULT '1' COMMENT 'Whether the packaging type is active',
    icon_class        VARCHAR(40)    DEFAULT NULL,
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (type_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product packaging type table';
--
-- schema object
--
CREATE TABLE product_group
(
    group_id          INT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                 NOT NULL COMMENT 'Reference',
    slug              VARCHAR(64)    DEFAULT NULL COMMENT 'Unique slug for this record',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    flag_active       TINYINT(1)     DEFAULT '1'  NOT NULL COMMENT 'Whether the group is active in public website',
    icon_class        VARCHAR(40)    DEFAULT NULL,
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX title_idx (title),
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_slug_idx (slug),
    PRIMARY KEY (group_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product group table';
--
-- schema object
--
CREATE TABLE product_media_type
(
    type_id           INT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                 NOT NULL COMMENT 'Reference',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    icon_class        VARCHAR(40)    DEFAULT NULL,
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (type_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product media type table';
--
-- schema object
--
CREATE TABLE color
(
    color_id          INT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(16)                 NOT NULL COMMENT 'Color code',
    name              VARCHAR(80)                 NOT NULL,
    hex_code          VARCHAR(8)  DEFAULT NULL COMMENT 'Hex color code, i.e. #FFFFFF',
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (color_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Color table';
--
-- schema object
--
CREATE TABLE product_packaging
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    type_id           SMALLINT UNSIGNED              NOT NULL,
    product_id        BIGINT UNSIGNED                NOT NULL,
    quantity          NUMERIC(12, 6)                 NOT NULL COMMENT 'Product unit quantity in the packaging',
    volume            NUMERIC(12, 6) DEFAULT NULL COMMENT 'Volume per sales unit in m3',
    weight            NUMERIC(12, 6) DEFAULT NULL COMMENT 'Weight per sales unit in Kg',
    length            NUMERIC(12, 6) DEFAULT NULL COMMENT 'Length per sales unit in meter',
    height            NUMERIC(12, 6) DEFAULT NULL COMMENT 'Heigth per sales unit in meter',
    width             NUMERIC(12, 6) DEFAULT NULL COMMENT 'Width per sales unit in meter',
    barcode_ean       VARCHAR(20)    DEFAULT NULL COMMENT 'EAN barcode',
    barcode_upc       VARCHAR(20)    DEFAULT NULL COMMENT 'UPCA barcode',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_D12BBB08C54C8C93 (type_id),
    INDEX IDX_D12BBB084584665A (product_id),
    UNIQUE INDEX unique_product_packaging_idx (type_id, product_id),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product packaging information';
--
-- schema object
--
CREATE TABLE stock
(
    stock_id          SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                      NOT NULL COMMENT 'Reference',
    title             VARCHAR(80)                      NOT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    flag_active       TINYINT(1)     DEFAULT '1'       NOT NULL COMMENT 'Whether the stock warehouse is active in public website',
    icon_class        VARCHAR(40)    DEFAULT NULL,
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (stock_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Stock warehouse';
--
-- schema object
--
CREATE TABLE sale_order
(
    order_id           BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    type_id            SMALLINT UNSIGNED              NOT NULL,
    status_id          SMALLINT UNSIGNED DEFAULT NULL,
    customer_id        INT UNSIGNED                   NOT NULL,
    rep_id             INT UNSIGNED      DEFAULT NULL,
    user_id            INT UNSIGNED      DEFAULT NULL,
    parent_id          BIGINT UNSIGNED   DEFAULT NULL,
    pricelist_id       SMALLINT UNSIGNED              NOT NULL,
    reference          VARCHAR(60)       DEFAULT NULL COMMENT 'Reference',
    comment            VARCHAR(512)      DEFAULT NULL COMMENT 'Internal comment',
    customer_reference VARCHAR(60)       DEFAULT NULL COMMENT 'Customer reference',
    customer_comment   VARCHAR(255)      DEFAULT NULL COMMENT 'Customer comment',
    document_date      DATETIME          DEFAULT NULL COMMENT 'Order/Quote document date',
    expires_at         DATETIME          DEFAULT NULL COMMENT 'When in quote, make an expiry date',
    created_at         DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at         DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    deleted_at         DATETIME          DEFAULT NULL COMMENT 'Record deletion date',
    created_by         VARCHAR(40)       DEFAULT NULL COMMENT 'Creator name',
    updated_by         VARCHAR(40)       DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping     VARCHAR(40)       DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at  DATETIME          DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_25F5CB1BC54C8C93 (type_id),
    INDEX IDX_25F5CB1B6BF700BD (status_id),
    INDEX IDX_25F5CB1B9395C3F3 (customer_id),
    INDEX IDX_25F5CB1B54C549EA (rep_id),
    INDEX IDX_25F5CB1BA76ED395 (user_id),
    INDEX IDX_25F5CB1B727ACA70 (parent_id),
    INDEX IDX_25F5CB1B89045958 (pricelist_id),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (order_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Sales order table';
--
-- schema object
--
CREATE TABLE product_rank
(
    product_rank_id         BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    product_id              BIGINT UNSIGNED                NOT NULL,
    rankable_category_id    INT UNSIGNED      DEFAULT NULL,
    pricelist_id            SMALLINT UNSIGNED DEFAULT NULL,
    brand_id                INT UNSIGNED      DEFAULT NULL,
    deal_rank               SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Notable deal product relative position in rankable category',
    fresh_rank              SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Fresh and shining product relative position in rankable category',
    bestseller_rank         SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Bestseller product relative position in rankable category',
    popular_rank            SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Popular product relative position in rankable category',
    trending_rank           SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Trending product relative position in rankable category',
    mostrated_rank          SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Best rated product relative position in rankable category',
    total_recorded_quantity NUMERIC(15, 6)    DEFAULT NULL COMMENT 'Total recorded order line quantity (free period)',
    total_recorded_turnover NUMERIC(15, 6)    DEFAULT NULL COMMENT 'Total recorded turn over (free period)',
    nb_customers            INT UNSIGNED      DEFAULT NULL COMMENT 'Number of distinct customers (free period)',
    created_at              DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at              DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    INDEX IDX_591CA444584665A (product_id),
    INDEX IDX_591CA44717543CE (rankable_category_id),
    INDEX IDX_591CA4489045958 (pricelist_id),
    INDEX IDX_591CA4444F5D008 (brand_id),
    INDEX deal_rank_idx (deal_rank),
    INDEX fresh_rank_idx (fresh_rank),
    INDEX bestseller_rank_idx (bestseller_rank),
    INDEX popular_rank_idx (popular_rank),
    INDEX trending_rank_idx (trending_rank),
    INDEX mostrated_rank_idx (mostrated_rank),
    UNIQUE INDEX unique_product_rank_idx (
                                          product_id, rankable_category_id,
                                          pricelist_id, brand_id
        ),
    PRIMARY KEY (product_rank_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product rankings';
--
-- schema object
--
CREATE TABLE product_set_translation
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    set_id            INT UNSIGNED                   NOT NULL,
    lang              VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    slug              VARCHAR(64)    DEFAULT NULL COMMENT 'Unique slug for this record',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_114B700710FB0D18 (set_id),
    INDEX IDX_114B700731098462 (lang),
    INDEX title_idx (title),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (set_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product set translation table';
--
-- schema object
--
CREATE TABLE api_service
(
    service_id        INT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                 NOT NULL COMMENT 'Reference',
    description       VARCHAR(255) DEFAULT NULL,
    flag_active       TINYINT(1)   DEFAULT '1'    NOT NULL COMMENT 'Whether the service is active',
    created_at        DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)  DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME     DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (service_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Api services';
--
-- schema object
--
CREATE TABLE product
(
    product_id             BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    parent_id              BIGINT UNSIGNED   DEFAULT NULL,
    brand_id               INT UNSIGNED      DEFAULT NULL,
    group_id               INT UNSIGNED      DEFAULT NULL,
    model_id               INT UNSIGNED      DEFAULT NULL,
    serie_id               INT UNSIGNED      DEFAULT NULL,
    category_id            INT UNSIGNED      DEFAULT NULL,
    type_id                SMALLINT UNSIGNED DEFAULT NULL,
    status_id              SMALLINT UNSIGNED DEFAULT NULL,
    unit_id                INT UNSIGNED      DEFAULT NULL,
    product_stub_id        INT UNSIGNED      DEFAULT NULL,
    department_id          SMALLINT UNSIGNED DEFAULT NULL,
    target_id              SMALLINT UNSIGNED DEFAULT NULL,
    primary_color_id       INT UNSIGNED      DEFAULT NULL,
    reference              VARCHAR(60)                    NOT NULL COMMENT 'Unique reference, may include supplier information to maintain uniqueness',
    display_reference      VARCHAR(60)       DEFAULT NULL COMMENT 'Displayable reference, without extra info to maintain uniqueness',
    search_reference       VARCHAR(60)       DEFAULT NULL COMMENT 'Reference used for searches, may differ from display reference, some chars may be replaced',
    slug                   VARCHAR(255)      DEFAULT NULL COMMENT 'Unique slug for this record',
    title                  VARCHAR(150)      DEFAULT NULL,
    invoice_title          VARCHAR(100)      DEFAULT NULL,
    description            VARCHAR(15000)    DEFAULT NULL,
    characteristic         VARCHAR(150)      DEFAULT NULL,
    keywords               VARCHAR(255)      DEFAULT NULL,
    volume                 NUMERIC(12, 6)    DEFAULT NULL COMMENT 'Volume per sales unit in m3',
    weight                 NUMERIC(12, 6)    DEFAULT NULL COMMENT 'Net weight per sales unit in Kg',
    weight_gross           NUMERIC(12, 6)    DEFAULT NULL COMMENT 'Gross weight per sales unit in Kg',
    length                 NUMERIC(12, 6)    DEFAULT NULL COMMENT 'Length per sales unit in meter',
    height                 NUMERIC(12, 6)    DEFAULT NULL COMMENT 'Heigth per sales unit in meter',
    width                  NUMERIC(12, 6)    DEFAULT NULL COMMENT 'Width per sales unit in meter',
    diameter               NUMERIC(10, 8)    DEFAULT NULL COMMENT 'Diameter in meter',
    format                 VARCHAR(10)       DEFAULT NULL COMMENT 'Format, i.e. 10x10..',
    pack_qty_box           NUMERIC(15, 6)    DEFAULT NULL COMMENT 'Packaging items per box',
    pack_qty_carton        NUMERIC(15, 6)    DEFAULT NULL COMMENT 'Packaging items per carton',
    pack_qty_master_carton NUMERIC(15, 6)    DEFAULT NULL COMMENT 'Packaging items per master carton',
    pack_qty_palet         NUMERIC(15, 6)    DEFAULT NULL COMMENT 'Packaging items per palet',
    barcode_ean13          VARCHAR(13)       DEFAULT NULL COMMENT 'EAN13 barcode',
    barcode_upca           VARCHAR(20)       DEFAULT NULL COMMENT 'UPCA barcode',
    flag_active            TINYINT(1)        DEFAULT '1'  NOT NULL COMMENT 'Whether the product is active in public website',
    sort_index             INT               DEFAULT NULL,
    available_at           DATE              DEFAULT NULL COMMENT 'Date on which product was made available',
    unavailable_at         DATE              DEFAULT NULL COMMENT 'Date on which product was/will be made unavailable',
    icon_class             VARCHAR(40)       DEFAULT NULL,
    trade_code_intrastat   VARCHAR(20)       DEFAULT NULL COMMENT 'European intrastat customs code',
    trade_code_hts         VARCHAR(20)       DEFAULT NULL COMMENT 'International Harmonized Trade System common nomenclature code',
    created_at             DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at             DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    deleted_at             DATETIME          DEFAULT NULL COMMENT 'Record deletion date',
    created_by             VARCHAR(40)       DEFAULT NULL COMMENT 'Creator name',
    updated_by             VARCHAR(40)       DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping         VARCHAR(40)       DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at      DATETIME          DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_D34A04AD727ACA70 (parent_id),
    INDEX IDX_D34A04AD44F5D008 (brand_id),
    INDEX IDX_D34A04ADFE54D947 (group_id),
    INDEX IDX_D34A04AD7975B7E7 (model_id),
    INDEX IDX_D34A04ADD94388BD (serie_id),
    INDEX IDX_D34A04AD12469DE2 (category_id),
    INDEX IDX_D34A04ADC54C8C93 (type_id),
    INDEX IDX_D34A04AD6BF700BD (status_id),
    INDEX IDX_D34A04ADF8BD700D (unit_id),
    INDEX IDX_D34A04AD389B0DBA (product_stub_id),
    INDEX IDX_D34A04ADAE80F5DF (department_id),
    INDEX IDX_D34A04AD158E0B66 (target_id),
    INDEX IDX_D34A04AD5BA57244 (primary_color_id),
    INDEX title_idx (title),
    INDEX flag_active_idx (flag_active),
    INDEX reference_idx (reference),
    INDEX search_reference_idx (search_reference),
    INDEX barcode_ean13_idx (barcode_ean13),
    INDEX barcode_upca_idx (barcode_upca),
    INDEX keywords_idx (keywords),
    UNIQUE INDEX unique_reference_idx (reference, brand_id, flag_active),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_slug_idx (slug),
    PRIMARY KEY (product_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product table'
  ROW_FORMAT = DYNAMIC;
--
-- schema object
--
CREATE TABLE product_category
(
    category_id           INT UNSIGNED AUTO_INCREMENT NOT NULL,
    parent_id             INT UNSIGNED    DEFAULT NULL,
    reference             VARCHAR(50)     DEFAULT NULL,
    slug                  VARCHAR(64)                 NOT NULL,
    title                 VARCHAR(64)                 NOT NULL,
    description           VARCHAR(255)    DEFAULT NULL,
    breadcrumb            VARCHAR(255)    DEFAULT NULL,
    flag_rankable         TINYINT(1)      DEFAULT NULL COMMENT 'Can be used to rank products beloging to',
    rankable_breadcrumb   VARCHAR(255)    DEFAULT NULL COMMENT 'Rankable breadcrumb if flag_rankable is true',
    sort_index            INT UNSIGNED    DEFAULT NULL COMMENT 'Relative sort index',
    global_sort_index     BIGINT UNSIGNED DEFAULT NULL COMMENT 'Global sort index',
    icon_class            VARCHAR(40)     DEFAULT NULL,
    lft                   INT UNSIGNED                NOT NULL,
    rgt                   INT UNSIGNED                NOT NULL,
    root                  BIGINT UNSIGNED DEFAULT NULL,
    lvl                   INT UNSIGNED                NOT NULL,
    alt_mapping_reference VARCHAR(10)     DEFAULT NULL COMMENT 'Alternative free reference code',
    created_at            DATETIME                    NOT NULL,
    updated_at            DATETIME                    NOT NULL,
    created_by            VARCHAR(40)     DEFAULT NULL,
    updated_by            VARCHAR(40)     DEFAULT NULL,
    legacy_mapping        VARCHAR(40)     DEFAULT NULL,
    legacy_synchro_at     DATETIME        DEFAULT NULL,
    INDEX IDX_CDFC7356727ACA70 (parent_id),
    INDEX title_idx (title),
    INDEX slug_idx (slug),
    INDEX lft_idx (lft),
    INDEX rgt_idx (rgt),
    INDEX lvl_idx (lvl),
    INDEX breadcrumb_idx (breadcrumb),
    INDEX flag_rankable_idx (flag_rankable),
    INDEX alt_mapping_reference_idx (alt_mapping_reference),
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_slug_idx (slug),
    PRIMARY KEY (category_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product category table'
  ROW_FORMAT = DYNAMIC;
--
-- schema object
--
CREATE TABLE discount_condition
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    pricelist_id      SMALLINT UNSIGNED DEFAULT NULL,
    customer_group_id SMALLINT UNSIGNED DEFAULT NULL,
    customer_id       INT UNSIGNED      DEFAULT NULL,
    brand_id          INT UNSIGNED      DEFAULT NULL,
    product_group_id  INT UNSIGNED      DEFAULT NULL,
    model_id          INT UNSIGNED      DEFAULT NULL,
    category_id       INT UNSIGNED      DEFAULT NULL,
    product_id        BIGINT UNSIGNED   DEFAULT NULL,
    discount_1        NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 1',
    discount_2        NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 2',
    discount_3        NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 3',
    discount_4        NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 4',
    fixed_price       NUMERIC(12, 6)    DEFAULT NULL COMMENT 'Fixed price, only for products',
    valid_from        DATE              DEFAULT NULL COMMENT 'Discount valid from',
    valid_till        DATE              DEFAULT NULL COMMENT 'Discount valid till',
    created_at        DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(80)       DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME          DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_DD0C00BE89045958 (pricelist_id),
    INDEX IDX_DD0C00BED2919A68 (customer_group_id),
    INDEX IDX_DD0C00BE9395C3F3 (customer_id),
    INDEX IDX_DD0C00BE44F5D008 (brand_id),
    INDEX IDX_DD0C00BE35E4B3D0 (product_group_id),
    INDEX IDX_DD0C00BE7975B7E7 (model_id),
    INDEX IDX_DD0C00BE12469DE2 (category_id),
    INDEX IDX_DD0C00BE4584665A (product_id),
    INDEX valid_from_idx (valid_from),
    INDEX valid_till_idx (valid_till),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Discount conditions table';
--
-- schema object
--
CREATE TABLE api_key_customer
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    api_id            INT UNSIGNED                   NOT NULL,
    customer_id       INT UNSIGNED                   NOT NULL,
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_4A509C2B54963938 (api_id),
    INDEX IDX_4A509C2B9395C3F3 (customer_id),
    UNIQUE INDEX unique_api_cutomer_idx (api_id, customer_id),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Api key customers';
--
-- schema object
--
CREATE TABLE permission
(
    permission_id INT UNSIGNED AUTO_INCREMENT NOT NULL,
    name          VARCHAR(128)                NOT NULL,
    UNIQUE INDEX unique_name_idx (name),
    PRIMARY KEY (permission_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Custom permissions';
--
-- schema object
--
CREATE TABLE api_key_service
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    api_id            INT UNSIGNED                   NOT NULL,
    service_id        INT UNSIGNED                   NOT NULL,
    flag_active       TINYINT(1)  DEFAULT '1'        NOT NULL COMMENT 'Whether the service is active for the api key',
    activated_at      DATE        DEFAULT NULL COMMENT 'Date on which the service was activated',
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_E93C346254963938 (api_id),
    INDEX IDX_E93C3462ED5CA9E6 (service_id),
    UNIQUE INDEX unique_api_service_idx (api_id, service_id),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Api key services';
--
-- schema object
--
CREATE TABLE product_model_translation
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    model_id          INT UNSIGNED                   NOT NULL,
    lang              VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    slug              VARCHAR(64) DEFAULT NULL COMMENT 'Unique slug for this record',
    title             VARCHAR(80) DEFAULT NULL,
    description       LONGTEXT    DEFAULT NULL,
    specs             LONGTEXT    DEFAULT NULL COMMENT 'Specifications',
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_6EEE4ED07975B7E7 (model_id),
    INDEX IDX_6EEE4ED031098462 (lang),
    INDEX title_idx (title),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (model_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product model translation table';
--
-- schema object
--
CREATE TABLE product_attribute
(
    product_attribute_id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    product_id           BIGINT UNSIGNED                NOT NULL,
    attributes           LONGTEXT DEFAULT NULL COMMENT 'Json attributes(DC2Type:json)',
    created_at           DATETIME DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at           DATETIME DEFAULT NULL COMMENT 'Record last update timestamp',
    UNIQUE INDEX unique_product_idx (product_id),
    PRIMARY KEY (product_attribute_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product attributes table';
--
-- schema object
--
CREATE TABLE sale_order_status
(
    status_id         SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                      NOT NULL COMMENT 'Reference',
    title             VARCHAR(80) DEFAULT NULL,
    flag_default      TINYINT(1)  DEFAULT NULL COMMENT 'Is the default state',
    flag_readonly     TINYINT(1)  DEFAULT '0'          NOT NULL COMMENT 'Is readonly',
    flag_active       TINYINT(1)  DEFAULT '1'          NOT NULL COMMENT 'Whether the model is active in public website',
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_flag_default_idx (flag_default),
    PRIMARY KEY (status_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Order status table';
--
-- schema object
--
CREATE TABLE product_serie
(
    serie_id              INT UNSIGNED AUTO_INCREMENT NOT NULL,
    brand_id              INT UNSIGNED DEFAULT NULL,
    reference             VARCHAR(60)                 NOT NULL COMMENT 'Reference',
    display_reference     VARCHAR(60)  DEFAULT NULL COMMENT 'Displayable reference, without extra info to maintain uniqueness',
    group_code            VARCHAR(1)   DEFAULT NULL COMMENT 'Serie group code',
    slug                  VARCHAR(64)  DEFAULT NULL COMMENT 'Unique slug for this record',
    title                 VARCHAR(80)  DEFAULT NULL,
    description           LONGTEXT     DEFAULT NULL,
    flag_marketing_action TINYINT(1)   DEFAULT NULL COMMENT 'Whether this serie is part of a marketing action',
    specs                 LONGTEXT     DEFAULT NULL COMMENT 'Specifications',
    revision              INT UNSIGNED DEFAULT 1 COMMENT 'Translation revision number',
    flag_active           TINYINT(1)   DEFAULT '1'    NOT NULL COMMENT 'Whether the serie is active in public website',
    created_at            DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at            DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by            VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by            VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping        VARCHAR(40)  DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at     DATETIME     DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_B66E86844F5D008 (brand_id),
    INDEX title_idx (title),
    INDEX revision_idx (revision),
    UNIQUE INDEX unique_brand_reference_idx (brand_id, reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_slug_idx (slug),
    PRIMARY KEY (serie_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product serie table'
  ROW_FORMAT = DYNAMIC;
--
-- schema object
--
CREATE TABLE sale_order_type_translation
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    type_id           SMALLINT UNSIGNED              NOT NULL,
    lang              VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    title             VARCHAR(80) DEFAULT NULL,
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_EEA9D8B7C54C8C93 (type_id),
    INDEX IDX_EEA9D8B731098462 (lang),
    INDEX title_idx (title),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (type_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Order type translation table';
--
-- schema object
--
CREATE TABLE role
(
    role_id   INT UNSIGNED AUTO_INCREMENT NOT NULL,
    parent_id INT UNSIGNED    DEFAULT NULL,
    name      VARCHAR(48)                 NOT NULL,
    lft       INT UNSIGNED                NOT NULL,
    rgt       INT UNSIGNED                NOT NULL,
    root      BIGINT UNSIGNED DEFAULT NULL,
    lvl       INT UNSIGNED                NOT NULL,
    INDEX IDX_57698A6A727ACA70 (parent_id),
    INDEX lft_idx (lft),
    INDEX rgt_idx (rgt),
    UNIQUE INDEX unique_name_idx (name),
    PRIMARY KEY (role_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Access roles';
--
-- schema object
--
CREATE TABLE role_permission
(
    role_id       INT UNSIGNED NOT NULL,
    permission_id INT UNSIGNED NOT NULL,
    INDEX IDX_6F7DF886D60322AC (role_id),
    INDEX IDX_6F7DF886FED90CCA (permission_id),
    PRIMARY KEY (role_id, permission_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB;
--
-- schema object
--
CREATE TABLE sale_order_line_status_translation
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    status_id         SMALLINT UNSIGNED              NOT NULL,
    lang              VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    title             VARCHAR(80) DEFAULT NULL,
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_F4D5EE4B6BF700BD (status_id),
    INDEX IDX_F4D5EE4B31098462 (lang),
    INDEX title_idx (title),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (status_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Order line status translation table';
--
-- schema object
--
CREATE TABLE sale_delivery
(
    delivery_id        BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference          VARCHAR(60)  DEFAULT NULL COMMENT 'Reference',
    customer_reference VARCHAR(60)  DEFAULT NULL COMMENT 'Customer reference',
    comment            VARCHAR(255) DEFAULT NULL COMMENT 'Comment',
    delivered_at       DATETIME     DEFAULT NULL COMMENT 'Delivery date',
    created_at         DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at         DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    deleted_at         DATETIME     DEFAULT NULL COMMENT 'Record deletion date',
    created_by         VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by         VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping     VARCHAR(40)  DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at  DATETIME     DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX delivered_at_idx (delivered_at),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (delivery_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Sales deliveries table';
--
-- schema object
--
CREATE TABLE product_search
(
    id         BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    product_id BIGINT UNSIGNED                NOT NULL,
    lang       VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    keywords   VARCHAR(1500) DEFAULT NULL,
    tags       VARCHAR(700)  DEFAULT NULL,
    updated_at DATETIME      DEFAULT NULL COMMENT 'Record last update timestamp',
    INDEX IDX_D68C9A034584665A (product_id),
    INDEX IDX_D68C9A0331098462 (lang),
    FULLTEXT INDEX keywords_ft_idx (keywords),
    UNIQUE INDEX unique_translation_idx (product_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product search indexes'
  ROW_FORMAT = DYNAMIC;
--
-- schema object
--
CREATE TABLE revision
(
    revision_id           BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    related_table         VARCHAR(40)                    NOT NULL COMMENT 'Related table',
    related_id            BIGINT                         NOT NULL COMMENT 'Related table primary key',
    created_at            DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    created_by            VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    flag_revision_updated TINYINT(1)   DEFAULT '0'       NOT NULL COMMENT 'Whether the saving includes a new revision',
    revision              INT          DEFAULT NULL COMMENT 'Optional revision number, revision differ from version as it acts like a milestone',
    message               VARCHAR(150) DEFAULT NULL COMMENT 'Log message, reason of change',
    previous_data         LONGTEXT                       NOT NULL COMMENT 'Previous data, stored as json',
    current_data          LONGTEXT                       NOT NULL COMMENT 'Data at time of saving, stored as json',
    INDEX related_table_idx (related_table),
    INDEX related_id_idx (related_id),
    INDEX revision_idx (revision),
    INDEX created_at_idx (created_at),
    UNIQUE INDEX unique_revison_log (
                                     related_table, related_id, created_at
        ),
    PRIMARY KEY (revision_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Custom table revisions history';
--
-- schema object
--
CREATE TABLE sale_invoice
(
    invoice_id         BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference          VARCHAR(60)  DEFAULT NULL COMMENT 'Reference',
    customer_reference VARCHAR(60)  DEFAULT NULL COMMENT 'Customer reference',
    comment            VARCHAR(255) DEFAULT NULL COMMENT 'Comment',
    invoiced_at        DATETIME     DEFAULT NULL COMMENT 'Invoice date',
    created_at         DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at         DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    deleted_at         DATETIME     DEFAULT NULL COMMENT 'Record deletion date',
    created_by         VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by         VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping     VARCHAR(40)  DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at  DATETIME     DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX invoiced_at_idx (invoiced_at),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (invoice_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Sales invoices table';
--
-- schema object
--
CREATE TABLE product_set_type
(
    type_id           SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                      NOT NULL COMMENT 'Reference',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    flag_default      TINYINT(1)     DEFAULT NULL COMMENT 'Is the default state',
    flag_active       TINYINT(1)     DEFAULT '1'       NOT NULL COMMENT 'Whether the type is active',
    icon_class        VARCHAR(40)    DEFAULT NULL,
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_flag_default_idx (flag_default),
    PRIMARY KEY (type_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product set type table';
--
-- schema object
--
CREATE TABLE product_type
(
    type_id                        SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference                      VARCHAR(60)                      NOT NULL COMMENT 'Reference',
    title                          VARCHAR(80)    DEFAULT NULL,
    description                    VARCHAR(15000) DEFAULT NULL,
    flag_enable_discount_condition TINYINT(1)     DEFAULT '1'       NOT NULL COMMENT 'Whether the product type must honour special discount conditions',
    flag_excluded_catalog          TINYINT(1)     DEFAULT '0'       NOT NULL COMMENT 'Tells whether the type should be excluded from product catalog',
    flag_excluded_export           TINYINT(1)     DEFAULT '0'       NOT NULL COMMENT 'Tells whether the type should be excluded from exported catalog',
    flag_default                   TINYINT(1)     DEFAULT NULL COMMENT 'Is the default state',
    flag_active                    TINYINT(1)     DEFAULT '1'       NOT NULL COMMENT 'Whether the type is active',
    icon_class                     VARCHAR(40)    DEFAULT NULL,
    created_at                     DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at                     DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by                     VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by                     VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping                 VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at              DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_flag_default_idx (flag_default),
    PRIMARY KEY (type_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product type table';
--
-- schema object
--
CREATE TABLE product_brand_translation
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    brand_id          INT UNSIGNED                   NOT NULL,
    lang              VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    slug              VARCHAR(64)    DEFAULT NULL COMMENT 'Unique slug for this record',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_61BD57C944F5D008 (brand_id),
    INDEX IDX_61BD57C931098462 (lang),
    INDEX title_idx (title),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (brand_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product brand translation table';
--
-- schema object
--
CREATE TABLE user_pricelist
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    pricelist_id      SMALLINT UNSIGNED              NOT NULL,
    user_id           INT UNSIGNED                   NOT NULL,
    flag_active       TINYINT(1)  DEFAULT '1'        NOT NULL COMMENT 'Whether the user can activate the pricelist',
    activated_at      DATE        DEFAULT NULL COMMENT 'Date on which this pricelist was activated',
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_5C2F678989045958 (pricelist_id),
    INDEX IDX_5C2F6789A76ED395 (user_id),
    UNIQUE INDEX unique_user_pricelist_idx (pricelist_id, user_id),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'User pricelists';
--
-- schema object
--
CREATE TABLE product_stub_translation
(
    id                 BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    product_stub_id    INT UNSIGNED                   NOT NULL,
    lang               VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    description_header VARCHAR(5000) DEFAULT NULL COMMENT 'Description header that will be prepended to product desc',
    description_footer VARCHAR(5000) DEFAULT NULL COMMENT 'Description footer that will be appended to product desc',
    specs              VARCHAR(5000) DEFAULT NULL COMMENT 'Common product stub specifications',
    keywords           VARCHAR(200)  DEFAULT NULL,
    revision           INT UNSIGNED  DEFAULT 1 COMMENT 'Translation revision number',
    created_at         DATETIME      DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at         DATETIME      DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by         VARCHAR(40)   DEFAULT NULL COMMENT 'Creator name',
    updated_by         VARCHAR(40)   DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping     VARCHAR(40)   DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at  DATETIME      DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_89DB144E389B0DBA (product_stub_id),
    INDEX IDX_89DB144E31098462 (lang),
    INDEX keywords_idx (keywords),
    INDEX revision_idx (revision),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (product_stub_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product stub translation table'
  ROW_FORMAT = DYNAMIC;
--
-- schema object
--
CREATE TABLE product_pricelist
(
    product_pricelist_id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    pricelist_id         SMALLINT UNSIGNED              NOT NULL,
    product_id           BIGINT UNSIGNED                NOT NULL,
    status_id            SMALLINT UNSIGNED DEFAULT NULL,
    flag_active          TINYINT(1)        DEFAULT '1'  NOT NULL COMMENT 'Whether the product is active in public website',
    price                NUMERIC(12, 6)                 NOT NULL COMMENT 'Unit sales price discounts included',
    list_price           NUMERIC(12, 6)                 NOT NULL COMMENT 'Unit sales list price wihtout discounts',
    public_price         NUMERIC(12, 6)    DEFAULT NULL COMMENT 'Unit public/msrp price',
    map_price            NUMERIC(12, 6)    DEFAULT NULL COMMENT 'Minimum advertised price, only where regulation applies',
    cost_price           NUMERIC(12, 6)    DEFAULT NULL COMMENT 'Product cost price',
    minimum_price        NUMERIC(12, 6)    DEFAULT NULL COMMENT 'Minimum sale under which product cannot be sold (discounts must be checked)',
    minimum_margin       NUMERIC(9, 6)     DEFAULT NULL COMMENT 'Minimum margin under which product cannot be sold',
    sale_minimum_qty     NUMERIC(16, 6)    DEFAULT NULL COMMENT 'Sales minimum quantity',
    sale_multiple_qty    NUMERIC(16, 6)    DEFAULT NULL COMMENT 'Sales multiple quantity',
    discount_1           NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 1',
    discount_2           NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 2',
    discount_3           NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 3',
    discount_4           NUMERIC(9, 6)     DEFAULT '0'  NOT NULL COMMENT 'Regular discount 4',
    maximum_discount_1   NUMERIC(9, 6)     DEFAULT NULL COMMENT 'Maximum regular discount 1 (when a discount can be applied freely)',
    is_liquidation       TINYINT(1)        DEFAULT NULL COMMENT 'Whether the product is considered as liquidation (stock clearance), , eventual discounts will appear in discount_1,_2...',
    is_new               TINYINT(1)        DEFAULT NULL COMMENT 'Whether the product is considered as a new product in this pricelist',
    is_promotional       TINYINT(1)        DEFAULT NULL COMMENT 'Whether the product is considered as promotional, eventual discounts will appear in discount_1,_2...',
    promo_start_at       DATE              DEFAULT NULL COMMENT 'Discount started at',
    promo_end_at         DATE              DEFAULT NULL COMMENT 'Discount end at',
    bestseller_rank      SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Bestseller rank (relative rankable to category)',
    trending_rank        SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Trending rank (relative to rankable category)',
    fresh_rank           SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Fresh and shining rank (relative to rankable category)',
    deal_rank            SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Notable deal rank (relative to rankable category)',
    popular_rank         SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Popular ranking (relative to rankable category)',
    available_at         DATE              DEFAULT NULL COMMENT 'Date on which product was made available, useful to display as new product',
    unavailable_at       DATE              DEFAULT NULL COMMENT 'Date on which product was/will be made unavailable',
    created_at           DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at           DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    deleted_at           DATETIME          DEFAULT NULL COMMENT 'Record deletion date',
    created_by           VARCHAR(40)       DEFAULT NULL COMMENT 'Creator name',
    updated_by           VARCHAR(40)       DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping       VARCHAR(40)       DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at    DATETIME          DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_326F5CE089045958 (pricelist_id),
    INDEX IDX_326F5CE04584665A (product_id),
    INDEX IDX_326F5CE06BF700BD (status_id),
    INDEX price_idx (price),
    INDEX flag_active_idx (flag_active),
    INDEX is_liquidation_idx (is_liquidation),
    INDEX is_new_idx (is_new),
    INDEX is_promotional_idx (is_promotional),
    INDEX popular_rank_idx (popular_rank),
    INDEX trending_rank_idx (trending_rank),
    INDEX fresh_rank_idx (fresh_rank),
    INDEX deal_rank_idx (deal_rank),
    INDEX bestseller_rank_idx (bestseller_rank),
    UNIQUE INDEX unique_product_price_idx (pricelist_id, product_id),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (product_pricelist_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product pricelist';
--
-- schema object
--
CREATE TABLE product_pricelist_stat
(
    product_pricelist_stat_id BIGINT UNSIGNED NOT NULL,
    forecasted_monthly_sales  NUMERIC(16, 6) DEFAULT NULL COMMENT 'Forecasted monthly sales quantity',
    first_sale_recorded_at    DATE           DEFAULT NULL COMMENT 'First recorded sale at',
    latest_sale_recorded_at   DATE           DEFAULT NULL COMMENT 'Latest recorded sale at',
    nb_customers              INT            DEFAULT NULL COMMENT 'Number of distinct customers',
    nb_sale_reps              INT            DEFAULT NULL COMMENT 'Number of distinct sales reps',
    nb_orders                 INT            DEFAULT NULL COMMENT 'Number of distinct orders',
    total_recorded_quantity   NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded order line quantity',
    total_recorded_turnover   NUMERIC(15, 6) DEFAULT NULL COMMENT 'Total recorded turn over',
    created_at                DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at                DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    PRIMARY KEY (product_pricelist_stat_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product pricelist quick statistics';
--
-- schema object
--
CREATE TABLE product_stock
(
    id                      BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    stock_id                SMALLINT UNSIGNED              NOT NULL,
    product_id              BIGINT UNSIGNED                NOT NULL,
    available_stock         NUMERIC(12, 6)                 NOT NULL COMMENT 'Available stock',
    theoretical_stock       NUMERIC(12, 6) DEFAULT NULL COMMENT 'Theoretical stock',
    next_available_stock_at DATETIME       DEFAULT NULL COMMENT 'Next stock arrival date',
    next_available_stock    NUMERIC(12, 6) DEFAULT NULL COMMENT 'Next available stock',
    avg_monthly_sale_qty    NUMERIC(12, 6) DEFAULT NULL COMMENT 'Average monthly sales for this product / pricelist',
    updated_at              DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    legacy_mapping          VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at       DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_EA6A2D3CDCD6110 (stock_id),
    INDEX IDX_EA6A2D3C4584665A (product_id),
    INDEX available_stock_idx (available_stock),
    INDEX theoretical_stock_idx (theoretical_stock),
    UNIQUE INDEX unique_product_price_idx (stock_id, product_id),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product stock';
--
-- schema object
--
CREATE TABLE product_status
(
    status_id              SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference              VARCHAR(60)                      NOT NULL COMMENT 'Reference',
    title                  VARCHAR(80)    DEFAULT NULL,
    description            VARCHAR(15000) DEFAULT NULL,
    flag_product_archived  TINYINT(1)     DEFAULT '0' COMMENT 'Tells if products in this status are kept for history purpose',
    flag_default           TINYINT(1)     DEFAULT NULL COMMENT 'Is the default state',
    flag_till_end_of_stock TINYINT(1)     DEFAULT '0' COMMENT 'Whether the product is a available till end of stock',
    flag_end_of_lifecycle  TINYINT(1)     DEFAULT '0' COMMENT 'Whether the product is in end of lifecycle',
    flag_active            TINYINT(1)     DEFAULT '1'       NOT NULL COMMENT 'Whether the status is active',
    icon_class             VARCHAR(40)    DEFAULT NULL,
    created_at             DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at             DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by             VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by             VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping         VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at      DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_flag_default_idx (flag_default),
    PRIMARY KEY (status_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product status table';
--
-- schema object
--
CREATE TABLE customer_group
(
    group_id          SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                      NOT NULL COMMENT 'Reference',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(15000) DEFAULT NULL,
    flag_active       TINYINT(1)     DEFAULT '1'       NOT NULL COMMENT 'Whether the group is active in public website',
    icon_class        VARCHAR(40)    DEFAULT NULL,
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX title_idx (title),
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (group_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Customer group table';
--
-- schema object
--
CREATE TABLE product_target
(
    target_id            SMALLINT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference            VARCHAR(60)                      NOT NULL COMMENT 'Reference',
    title                VARCHAR(80)    DEFAULT NULL,
    description          VARCHAR(15000) DEFAULT NULL,
    flag_exclude_enduser TINYINT(1)     DEFAULT '0'       NOT NULL COMMENT 'Visibility should be excluded for enduser target audience',
    icon_class           VARCHAR(40)    DEFAULT NULL,
    sort_index           INT UNSIGNED   DEFAULT NULL COMMENT 'Relative sort index',
    created_at           DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at           DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by           VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by           VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping       VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at    DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX sort_index_idx (sort_index),
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_title_idx (title),
    PRIMARY KEY (target_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product target audience table';
--
-- schema object
--
CREATE TABLE customer
(
    customer_id       INT UNSIGNED AUTO_INCREMENT   NOT NULL,
    group_id          SMALLINT UNSIGNED DEFAULT NULL,
    country_id        SMALLINT UNSIGNED DEFAULT NULL,
    reference         VARCHAR(60)                   NOT NULL COMMENT 'Reference',
    name              VARCHAR(80)                   NOT NULL,
    first_name        VARCHAR(40)       DEFAULT NULL,
    street            VARCHAR(80)       DEFAULT NULL,
    street_2          VARCHAR(80)       DEFAULT NULL,
    street_number     VARCHAR(10)       DEFAULT NULL,
    po_box            VARCHAR(10)       DEFAULT NULL,
    zipcode           VARCHAR(20)       DEFAULT NULL,
    city              VARCHAR(60)       DEFAULT NULL,
    phone             VARCHAR(20)       DEFAULT NULL,
    phone_2           VARCHAR(20)       DEFAULT NULL,
    mobile            VARCHAR(20)       DEFAULT NULL,
    mobile_2          VARCHAR(20)       DEFAULT NULL,
    fax               VARCHAR(20)       DEFAULT NULL,
    fax_2             VARCHAR(20)       DEFAULT NULL,
    email             VARCHAR(50)       DEFAULT NULL,
    email_2           VARCHAR(50)       DEFAULT NULL,
    flag_active       TINYINT(1)        DEFAULT '1' NOT NULL COMMENT 'Whether the customer is active in public website',
    created_at        DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)       DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME          DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_81398E09FE54D947 (group_id),
    INDEX IDX_81398E09F92F3E70 (country_id),
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    PRIMARY KEY (customer_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Customer table';
--
-- schema object
--
CREATE TABLE product_model
(
    model_id          INT UNSIGNED AUTO_INCREMENT NOT NULL,
    brand_id          INT UNSIGNED DEFAULT NULL,
    reference         VARCHAR(60)                 NOT NULL COMMENT 'Reference',
    slug              VARCHAR(64)  DEFAULT NULL COMMENT 'Unique slug for this record',
    title             VARCHAR(80)  DEFAULT NULL,
    description       LONGTEXT     DEFAULT NULL,
    specs             LONGTEXT     DEFAULT NULL COMMENT 'Specifications',
    revision          INT UNSIGNED DEFAULT 1 COMMENT 'Translation revision number',
    flag_active       TINYINT(1)   DEFAULT '1'    NOT NULL COMMENT 'Whether the model is active in public website',
    created_at        DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)  DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME     DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_76C9098544F5D008 (brand_id),
    INDEX title_idx (title),
    INDEX revision_idx (revision),
    UNIQUE INDEX unique_brand_reference_idx (brand_id, reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_slug_idx (slug),
    PRIMARY KEY (model_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product model table'
  ROW_FORMAT = DYNAMIC;
--
-- schema object
--
CREATE TABLE color_translation
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    color_id          INT UNSIGNED                   NOT NULL,
    lang              VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    name              VARCHAR(80) DEFAULT NULL,
    created_at        DATETIME    DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME    DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40) DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40) DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40) DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME    DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_C81038637ADA1FB5 (color_id),
    INDEX IDX_C810386331098462 (lang),
    INDEX name_idx (name),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (color_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Color translation table';
--
-- schema object
--
CREATE TABLE product_media
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
    product_id        BIGINT UNSIGNED                NOT NULL,
    media_id          BIGINT UNSIGNED                NOT NULL,
    type_id           INT UNSIGNED                   NOT NULL,
    flag_primary      TINYINT(1)   DEFAULT NULL,
    sort_index        INT UNSIGNED DEFAULT NULL,
    created_at        DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)  DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME     DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_CB70DA504584665A (product_id),
    INDEX IDX_CB70DA50EA9FDD75 (media_id),
    INDEX IDX_CB70DA50C54C8C93 (type_id),
    INDEX sort_index_idx (sort_index),
    UNIQUE INDEX unique_product_media_type_idx (product_id, media_id, type_id),
    UNIQUE INDEX unique_product_type_flag_primary_idx (
                                                       type_id, product_id, flag_primary
        ),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product media table';
--
-- schema object
--
CREATE TABLE product_serie_translation
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    serie_id          INT UNSIGNED                   NOT NULL,
    lang              VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    slug              VARCHAR(64)    DEFAULT NULL COMMENT 'Unique slug for this record',
    title             VARCHAR(80)    DEFAULT NULL,
    description       VARCHAR(16000) DEFAULT NULL,
    created_at        DATETIME       DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME       DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)    DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)    DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME       DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_7D0456FD94388BD (serie_id),
    INDEX IDX_7D0456F31098462 (lang),
    INDEX title_idx (title),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (serie_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product serie translation table';
--
-- schema object
--
CREATE TABLE product_unit_translation
(
    id                BIGINT UNSIGNED AUTO_INCREMENT NOT NULL COMMENT 'Primary key',
    unit_id           INT UNSIGNED                   NOT NULL,
    lang              VARCHAR(2)                     NOT NULL COMMENT 'iso_631_1 language code 2 digits',
    reference         VARCHAR(10)  DEFAULT NULL,
    title             VARCHAR(80)  DEFAULT NULL,
    description       VARCHAR(255) DEFAULT NULL,
    created_at        DATETIME     DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME     DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)  DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)  DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME     DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_A1824BB5F8BD700D (unit_id),
    INDEX IDX_A1824BB531098462 (lang),
    INDEX title_idx (title),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_translation_idx (unit_id, lang),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product unit translation';
--
-- schema object
--
CREATE TABLE product_set
(
    set_id            INT UNSIGNED AUTO_INCREMENT   NOT NULL,
    type_id           SMALLINT UNSIGNED DEFAULT NULL,
    reference         VARCHAR(60)                   NOT NULL COMMENT 'Reference',
    slug              VARCHAR(64)       DEFAULT NULL COMMENT 'Unique slug for this record',
    title             VARCHAR(80)       DEFAULT NULL,
    description       VARCHAR(15000)    DEFAULT NULL,
    url               VARCHAR(80)       DEFAULT NULL,
    flag_active       TINYINT(1)        DEFAULT '1' NOT NULL COMMENT 'Whether the brand is active in public website',
    icon_class        VARCHAR(40)       DEFAULT NULL,
    created_at        DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)       DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME          DEFAULT NULL COMMENT 'Last synchro timestamp',
    INDEX IDX_63B71C3C54C8C93 (type_id),
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_legacy_mapping_idx (legacy_mapping),
    UNIQUE INDEX unique_title_idx (title),
    UNIQUE INDEX unique_slug_idx (slug),
    PRIMARY KEY (set_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Product set table';
--
-- schema object
--
CREATE TABLE currency
(
    currency_id       INT UNSIGNED AUTO_INCREMENT NOT NULL,
    reference         VARCHAR(60)                 NOT NULL COMMENT 'Reference',
    title             VARCHAR(80)       DEFAULT NULL,
    symbol            VARCHAR(4)        DEFAULT NULL COMMENT 'Symbol',
    display_decimals  SMALLINT UNSIGNED DEFAULT 2 COMMENT 'Number of decimals to display',
    icon_class        VARCHAR(40)       DEFAULT NULL,
    created_at        DATETIME          DEFAULT NULL COMMENT 'Record creation timestamp',
    updated_at        DATETIME          DEFAULT NULL COMMENT 'Record last update timestamp',
    created_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Creator name',
    updated_by        VARCHAR(40)       DEFAULT NULL COMMENT 'Last updater name',
    legacy_mapping    VARCHAR(40)       DEFAULT NULL COMMENT 'Unique reference of this record taken from legacy system',
    legacy_synchro_at DATETIME          DEFAULT NULL COMMENT 'Last synchro timestamp',
    UNIQUE INDEX unique_reference_idx (reference),
    UNIQUE INDEX unique_title_idx (title),
    PRIMARY KEY (currency_id)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE `utf8mb4_unicode_ci`
  ENGINE = InnoDB COMMENT = 'Currency table';
--
-- schema object
--
ALTER TABLE
    sale_order_line
    ADD
        CONSTRAINT FK_61B16AA58D9F6D38 FOREIGN KEY (order_id) REFERENCES sale_order (order_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order_line
    ADD
        CONSTRAINT FK_61B16AA56BF700BD FOREIGN KEY (status_id) REFERENCES sale_order_line_status (status_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order_line
    ADD
        CONSTRAINT FK_61B16AA512136921 FOREIGN KEY (delivery_id) REFERENCES sale_delivery (delivery_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order_line
    ADD
        CONSTRAINT FK_61B16AA52989F1FD FOREIGN KEY (invoice_id) REFERENCES sale_invoice (invoice_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order_line
    ADD
        CONSTRAINT FK_61B16AA54584665A FOREIGN KEY (product_id) REFERENCES product (product_id);
--
-- schema object
--
ALTER TABLE
    user_scope
    ADD
        CONSTRAINT FK_E26DAE8BA76ED395 FOREIGN KEY (user_id) REFERENCES user (user_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    user_scope
    ADD
        CONSTRAINT FK_E26DAE8B9395C3F3 FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_translation
    ADD
        CONSTRAINT FK_1846DB704584665A FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_translation
    ADD
        CONSTRAINT FK_1846DB7031098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    product_stat_trend
    ADD
        CONSTRAINT FK_BBBB19B89045958 FOREIGN KEY (pricelist_id) REFERENCES pricelist (pricelist_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_stat_trend
    ADD
        CONSTRAINT FK_BBBB19B4584665A FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    user
    ADD
        CONSTRAINT FK_8D93D64931098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE
            SET
            NULL;
--
-- schema object
--
ALTER TABLE
    user_role
    ADD
        CONSTRAINT FK_2DE8C6A3A76ED395 FOREIGN KEY (user_id) REFERENCES user (user_id);
--
-- schema object
--
ALTER TABLE
    user_role
    ADD
        CONSTRAINT FK_2DE8C6A3D60322AC FOREIGN KEY (role_id) REFERENCES role (role_id);
--
-- schema object
--
ALTER TABLE
    media_video_file
    ADD
        CONSTRAINT FK_812DA558EA9FDD75 FOREIGN KEY (media_id) REFERENCES media (media_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    pricelist
    ADD
        CONSTRAINT FK_5CCFEA6DDCD6110 FOREIGN KEY (stock_id) REFERENCES stock (stock_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    pricelist
    ADD
        CONSTRAINT FK_5CCFEA6DFE54D947 FOREIGN KEY (group_id) REFERENCES pricelist_group (group_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    pricelist
    ADD
        CONSTRAINT FK_5CCFEA6D38248176 FOREIGN KEY (currency_id) REFERENCES currency (currency_id);
--
-- schema object
--
ALTER TABLE
    pricelist
    ADD
        CONSTRAINT FK_5CCFEA6D5ECD273E FOREIGN KEY (rank_pricelist_id) REFERENCES pricelist (pricelist_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    pricelist
    ADD
        CONSTRAINT FK_5CCFEA6D2E5F6947 FOREIGN KEY (
                                                    discount_condition_pricelist_id
            ) REFERENCES pricelist (pricelist_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_serie_media
    ADD
        CONSTRAINT FK_E0F0B87D94388BD FOREIGN KEY (serie_id) REFERENCES product_serie (serie_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_serie_media
    ADD
        CONSTRAINT FK_E0F0B87EA9FDD75 FOREIGN KEY (media_id) REFERENCES media (media_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_serie_media
    ADD
        CONSTRAINT FK_E0F0B877E761628 FOREIGN KEY (product_media_type_id) REFERENCES product_media_type (type_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order_status_translation
    ADD
        CONSTRAINT FK_7017D856BF700BD FOREIGN KEY (status_id) REFERENCES sale_order_status (status_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order_status_translation
    ADD
        CONSTRAINT FK_7017D8531098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    product_group_translation
    ADD
        CONSTRAINT FK_255468FDFE54D947 FOREIGN KEY (group_id) REFERENCES product_group (group_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_group_translation
    ADD
        CONSTRAINT FK_255468FD31098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    media
    ADD
        CONSTRAINT FK_6A2CA10CC54C8C93 FOREIGN KEY (type_id) REFERENCES media_type (type_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    media
    ADD
        CONSTRAINT FK_6A2CA10CBC21F742 FOREIGN KEY (container_id) REFERENCES media_container (container_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    customer_pricelist
    ADD
        CONSTRAINT FK_F732127789045958 FOREIGN KEY (pricelist_id) REFERENCES pricelist (pricelist_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    customer_pricelist
    ADD
        CONSTRAINT FK_F73212779395C3F3 FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    api_key_log
    ADD
        CONSTRAINT FK_B608017254963938 FOREIGN KEY (api_id) REFERENCES api_key (api_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    api_key_log
    ADD
        CONSTRAINT FK_B6080172ED5CA9E6 FOREIGN KEY (service_id) REFERENCES api_service (service_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_rep
    ADD
        CONSTRAINT FK_C84C7443F92F3E70 FOREIGN KEY (country_id) REFERENCES country (country_id);
--
-- schema object
--
ALTER TABLE
    product_category_translation
    ADD
        CONSTRAINT FK_1DAAB48712469DE2 FOREIGN KEY (category_id) REFERENCES product_category (category_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_category_translation
    ADD
        CONSTRAINT FK_1DAAB48731098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    product_packaging
    ADD
        CONSTRAINT FK_D12BBB08C54C8C93 FOREIGN KEY (type_id) REFERENCES packaging_type (type_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_packaging
    ADD
        CONSTRAINT FK_D12BBB084584665A FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order
    ADD
        CONSTRAINT FK_25F5CB1BC54C8C93 FOREIGN KEY (type_id) REFERENCES sale_order_type (type_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order
    ADD
        CONSTRAINT FK_25F5CB1B6BF700BD FOREIGN KEY (status_id) REFERENCES sale_order_status (status_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order
    ADD
        CONSTRAINT FK_25F5CB1B9395C3F3 FOREIGN KEY (customer_id) REFERENCES customer (customer_id);
--
-- schema object
--
ALTER TABLE
    sale_order
    ADD
        CONSTRAINT FK_25F5CB1B54C549EA FOREIGN KEY (rep_id) REFERENCES sale_rep (rep_id);
--
-- schema object
--
ALTER TABLE
    sale_order
    ADD
        CONSTRAINT FK_25F5CB1BA76ED395 FOREIGN KEY (user_id) REFERENCES user (user_id);
--
-- schema object
--
ALTER TABLE
    sale_order
    ADD
        CONSTRAINT FK_25F5CB1B727ACA70 FOREIGN KEY (parent_id) REFERENCES sale_order (order_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order
    ADD
        CONSTRAINT FK_25F5CB1B89045958 FOREIGN KEY (pricelist_id) REFERENCES pricelist (pricelist_id);
--
-- schema object
--
ALTER TABLE
    product_rank
    ADD
        CONSTRAINT FK_591CA444584665A FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_rank
    ADD
        CONSTRAINT FK_591CA44717543CE FOREIGN KEY (rankable_category_id) REFERENCES product_category (category_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_rank
    ADD
        CONSTRAINT FK_591CA4489045958 FOREIGN KEY (pricelist_id) REFERENCES pricelist (pricelist_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_rank
    ADD
        CONSTRAINT FK_591CA4444F5D008 FOREIGN KEY (brand_id) REFERENCES product_brand (brand_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_set_translation
    ADD
        CONSTRAINT FK_114B700710FB0D18 FOREIGN KEY (set_id) REFERENCES product_set (set_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_set_translation
    ADD
        CONSTRAINT FK_114B700731098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04AD727ACA70 FOREIGN KEY (parent_id) REFERENCES product (product_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04AD44F5D008 FOREIGN KEY (brand_id) REFERENCES product_brand (brand_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04ADFE54D947 FOREIGN KEY (group_id) REFERENCES product_group (group_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04AD7975B7E7 FOREIGN KEY (model_id) REFERENCES product_model (model_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04ADD94388BD FOREIGN KEY (serie_id) REFERENCES product_serie (serie_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04AD12469DE2 FOREIGN KEY (category_id) REFERENCES product_category (category_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04ADC54C8C93 FOREIGN KEY (type_id) REFERENCES product_type (type_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04AD6BF700BD FOREIGN KEY (status_id) REFERENCES product_status (status_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04ADF8BD700D FOREIGN KEY (unit_id) REFERENCES product_unit (unit_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04AD389B0DBA FOREIGN KEY (product_stub_id) REFERENCES product_stub (product_stub_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04ADAE80F5DF FOREIGN KEY (department_id) REFERENCES product_department (department_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04AD158E0B66 FOREIGN KEY (target_id) REFERENCES product_target (target_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product
    ADD
        CONSTRAINT FK_D34A04AD5BA57244 FOREIGN KEY (primary_color_id) REFERENCES color (color_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_category
    ADD
        CONSTRAINT FK_CDFC7356727ACA70 FOREIGN KEY (parent_id) REFERENCES product_category (category_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    discount_condition
    ADD
        CONSTRAINT FK_DD0C00BE89045958 FOREIGN KEY (pricelist_id) REFERENCES pricelist (pricelist_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    discount_condition
    ADD
        CONSTRAINT FK_DD0C00BED2919A68 FOREIGN KEY (customer_group_id) REFERENCES customer_group (group_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    discount_condition
    ADD
        CONSTRAINT FK_DD0C00BE9395C3F3 FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    discount_condition
    ADD
        CONSTRAINT FK_DD0C00BE44F5D008 FOREIGN KEY (brand_id) REFERENCES product_brand (brand_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    discount_condition
    ADD
        CONSTRAINT FK_DD0C00BE35E4B3D0 FOREIGN KEY (product_group_id) REFERENCES product_group (group_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    discount_condition
    ADD
        CONSTRAINT FK_DD0C00BE7975B7E7 FOREIGN KEY (model_id) REFERENCES product_model (model_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    discount_condition
    ADD
        CONSTRAINT FK_DD0C00BE12469DE2 FOREIGN KEY (category_id) REFERENCES product_category (category_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    discount_condition
    ADD
        CONSTRAINT FK_DD0C00BE4584665A FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    api_key_customer
    ADD
        CONSTRAINT FK_4A509C2B54963938 FOREIGN KEY (api_id) REFERENCES api_key (api_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    api_key_customer
    ADD
        CONSTRAINT FK_4A509C2B9395C3F3 FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    api_key_service
    ADD
        CONSTRAINT FK_E93C346254963938 FOREIGN KEY (api_id) REFERENCES api_key (api_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    api_key_service
    ADD
        CONSTRAINT FK_E93C3462ED5CA9E6 FOREIGN KEY (service_id) REFERENCES api_service (service_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_model_translation
    ADD
        CONSTRAINT FK_6EEE4ED07975B7E7 FOREIGN KEY (model_id) REFERENCES product_model (model_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_model_translation
    ADD
        CONSTRAINT FK_6EEE4ED031098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    product_attribute
    ADD
        CONSTRAINT FK_94DA59764584665A FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_serie
    ADD
        CONSTRAINT FK_B66E86844F5D008 FOREIGN KEY (brand_id) REFERENCES product_brand (brand_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order_type_translation
    ADD
        CONSTRAINT FK_EEA9D8B7C54C8C93 FOREIGN KEY (type_id) REFERENCES sale_order_type (type_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order_type_translation
    ADD
        CONSTRAINT FK_EEA9D8B731098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    role
    ADD
        CONSTRAINT FK_57698A6A727ACA70 FOREIGN KEY (parent_id) REFERENCES role (role_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    role_permission
    ADD
        CONSTRAINT FK_6F7DF886D60322AC FOREIGN KEY (role_id) REFERENCES role (role_id);
--
-- schema object
--
ALTER TABLE
    role_permission
    ADD
        CONSTRAINT FK_6F7DF886FED90CCA FOREIGN KEY (permission_id) REFERENCES permission (permission_id);
--
-- schema object
--
ALTER TABLE
    sale_order_line_status_translation
    ADD
        CONSTRAINT FK_F4D5EE4B6BF700BD FOREIGN KEY (status_id) REFERENCES sale_order_line_status (status_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    sale_order_line_status_translation
    ADD
        CONSTRAINT FK_F4D5EE4B31098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    product_search
    ADD
        CONSTRAINT FK_D68C9A034584665A FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_search
    ADD
        CONSTRAINT FK_D68C9A0331098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    product_brand_translation
    ADD
        CONSTRAINT FK_61BD57C944F5D008 FOREIGN KEY (brand_id) REFERENCES product_brand (brand_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_brand_translation
    ADD
        CONSTRAINT FK_61BD57C931098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    user_pricelist
    ADD
        CONSTRAINT FK_5C2F678989045958 FOREIGN KEY (pricelist_id) REFERENCES pricelist (pricelist_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    user_pricelist
    ADD
        CONSTRAINT FK_5C2F6789A76ED395 FOREIGN KEY (user_id) REFERENCES user (user_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_stub_translation
    ADD
        CONSTRAINT FK_89DB144E389B0DBA FOREIGN KEY (product_stub_id) REFERENCES product_stub (product_stub_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_stub_translation
    ADD
        CONSTRAINT FK_89DB144E31098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    product_pricelist
    ADD
        CONSTRAINT FK_326F5CE089045958 FOREIGN KEY (pricelist_id) REFERENCES pricelist (pricelist_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_pricelist
    ADD
        CONSTRAINT FK_326F5CE04584665A FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_pricelist
    ADD
        CONSTRAINT FK_326F5CE06BF700BD FOREIGN KEY (status_id) REFERENCES product_status (status_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_pricelist_stat
    ADD
        CONSTRAINT FK_7A69209338FE3EBD FOREIGN KEY (product_pricelist_stat_id) REFERENCES product_pricelist (product_pricelist_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_stock
    ADD
        CONSTRAINT FK_EA6A2D3CDCD6110 FOREIGN KEY (stock_id) REFERENCES stock (stock_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_stock
    ADD
        CONSTRAINT FK_EA6A2D3C4584665A FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    customer
    ADD
        CONSTRAINT FK_81398E09FE54D947 FOREIGN KEY (group_id) REFERENCES customer_group (group_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    customer
    ADD
        CONSTRAINT FK_81398E09F92F3E70 FOREIGN KEY (country_id) REFERENCES country (country_id);
--
-- schema object
--
ALTER TABLE
    product_model
    ADD
        CONSTRAINT FK_76C9098544F5D008 FOREIGN KEY (brand_id) REFERENCES product_brand (brand_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    color_translation
    ADD
        CONSTRAINT FK_C81038637ADA1FB5 FOREIGN KEY (color_id) REFERENCES color (color_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    color_translation
    ADD
        CONSTRAINT FK_C810386331098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    product_media
    ADD
        CONSTRAINT FK_CB70DA504584665A FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_media
    ADD
        CONSTRAINT FK_CB70DA50EA9FDD75 FOREIGN KEY (media_id) REFERENCES media (media_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_media
    ADD
        CONSTRAINT FK_CB70DA50C54C8C93 FOREIGN KEY (type_id) REFERENCES product_media_type (type_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_serie_translation
    ADD
        CONSTRAINT FK_7D0456FD94388BD FOREIGN KEY (serie_id) REFERENCES product_serie (serie_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_serie_translation
    ADD
        CONSTRAINT FK_7D0456F31098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    product_unit_translation
    ADD
        CONSTRAINT FK_A1824BB5F8BD700D FOREIGN KEY (unit_id) REFERENCES product_unit (unit_id) ON DELETE CASCADE;
--
-- schema object
--
ALTER TABLE
    product_unit_translation
    ADD
        CONSTRAINT FK_A1824BB531098462 FOREIGN KEY (lang) REFERENCES language (lang) ON DELETE RESTRICT;
--
-- schema object
--
ALTER TABLE
    product_set
    ADD
        CONSTRAINT FK_63B71C3C54C8C93 FOREIGN KEY (type_id) REFERENCES product_set_type (type_id) ON DELETE CASCADE;