-- Open Food Facts helper macros (DuckDB 2.x)
-- Loaded before food-ean13.sql by scripts/generate-openfoodfact-ean13.ts.
-- In the DuckDB UI or CLI, run this file once per session before the query.


-- 13 digits + valid GS1 check digit (weights 1,3,1,3,... on the first 12 digits)
CREATE OR REPLACE MACRO is_valid_ean13(c) AS
    regexp_full_match(c, '[0-9]{13}')
    AND (10 - (list_sum(list_transform(range(12), lambda i:
            (ascii(c[i + 1]) - 48) * CASE WHEN i % 2 = 0 THEN 1 ELSE 3 END)) % 10)) % 10
        = ascii(c[13]) - 48;

-- GS1 prefix family
CREATE OR REPLACE MACRO code_type(c) AS
    CASE
        WHEN c = '0000000000000'               THEN 'invalid'
        WHEN regexp_matches(c, '^(2|0[24])')   THEN 'restricted'   -- in-store / variable weight
        WHEN regexp_matches(c, '^(05|9[89])')  THEN 'coupon'
        WHEN regexp_matches(c, '^97[7-9]')     THEN 'publication'  -- ISSN / ISBN
        WHEN c[1] = '0'                        THEN 'UPC-A'        -- US/Canada, padded to 13
        ELSE 'EAN-13'
    END;

-- Unit spelling (lowercase, no spaces/dots) -> canonical unit, base unit and factor to the base unit
CREATE OR REPLACE MACRO unit_map() AS MAP {
    -- mass -> g
    'g':        {unit: 'g',     base: 'g',  factor: 1.0},
    'gr':       {unit: 'g',     base: 'g',  factor: 1.0},
    'grs':      {unit: 'g',     base: 'g',  factor: 1.0},
    'gm':       {unit: 'g',     base: 'g',  factor: 1.0},
    'gram':     {unit: 'g',     base: 'g',  factor: 1.0},
    'grams':    {unit: 'g',     base: 'g',  factor: 1.0},
    'gramm':    {unit: 'g',     base: 'g',  factor: 1.0},
    'gramme':   {unit: 'g',     base: 'g',  factor: 1.0},
    'grammes':  {unit: 'g',     base: 'g',  factor: 1.0},
    'grammi':   {unit: 'g',     base: 'g',  factor: 1.0},
    'gramos':   {unit: 'g',     base: 'g',  factor: 1.0},
    'г':        {unit: 'g',     base: 'g',  factor: 1.0},
    'гр':       {unit: 'g',     base: 'g',  factor: 1.0},
    'γρ':       {unit: 'g',     base: 'g',  factor: 1.0},
    'kg':       {unit: 'kg',    base: 'g',  factor: 1000.0},
    'kilo':     {unit: 'kg',    base: 'g',  factor: 1000.0},
    'kilos':    {unit: 'kg',    base: 'g',  factor: 1000.0},
    'kilogram': {unit: 'kg',    base: 'g',  factor: 1000.0},
    'kilograms':{unit: 'kg',    base: 'g',  factor: 1000.0},
    'кг':       {unit: 'kg',    base: 'g',  factor: 1000.0},
    'mg':       {unit: 'mg',    base: 'g',  factor: 0.001},
    'oz':       {unit: 'oz',    base: 'g',  factor: 28.349523125},
    'ounce':    {unit: 'oz',    base: 'g',  factor: 28.349523125},
    'ounces':   {unit: 'oz',    base: 'g',  factor: 28.349523125},
    'lb':       {unit: 'lb',    base: 'g',  factor: 453.59237},
    'lbs':      {unit: 'lb',    base: 'g',  factor: 453.59237},
    'pound':    {unit: 'lb',    base: 'g',  factor: 453.59237},
    'pounds':   {unit: 'lb',    base: 'g',  factor: 453.59237},
    -- volume -> ml
    'ml':       {unit: 'ml',    base: 'ml', factor: 1.0},
    'мл':       {unit: 'ml',    base: 'ml', factor: 1.0},
    'cl':       {unit: 'cl',    base: 'ml', factor: 10.0},
    'dl':       {unit: 'dl',    base: 'ml', factor: 100.0},
    'l':        {unit: 'l',     base: 'ml', factor: 1000.0},
    'lt':       {unit: 'l',     base: 'ml', factor: 1000.0},
    'ltr':      {unit: 'l',     base: 'ml', factor: 1000.0},
    'litre':    {unit: 'l',     base: 'ml', factor: 1000.0},
    'litres':   {unit: 'l',     base: 'ml', factor: 1000.0},
    'liter':    {unit: 'l',     base: 'ml', factor: 1000.0},
    'liters':   {unit: 'l',     base: 'ml', factor: 1000.0},
    'litro':    {unit: 'l',     base: 'ml', factor: 1000.0},
    'litros':   {unit: 'l',     base: 'ml', factor: 1000.0},
    'л':        {unit: 'l',     base: 'ml', factor: 1000.0},
    'floz':     {unit: 'fl oz', base: 'ml', factor: 29.5735295625}    -- US fluid ounce
};

-- "[<count> x] <number> <word>" candidates in the free-text quantity ("fl oz" kept as one word)
--   group 1 = pack count (optional), group 2 = amount, group 3 = unit word
CREATE OR REPLACE MACRO qty_re() AS
    '(?:([0-9]+)\s*[xX×*]\s*)?([0-9]+(?:[.,][0-9]+)?|[.,][0-9]+)\s*((?i:fl\.?\s?oz)|\pL+)';

-- First "[<count> x] <number> <known unit>" in the text -> {pack_count, value, u: {unit, base, factor}}
--   '6 x 33 cl' -> {6, 33, cl}, '460 g (2 x 230 g)' -> {1, 460, g}, '10 pcs' -> NULL
CREATE OR REPLACE MACRO parse_qty(q) AS
    list_filter(
        list_transform(regexp_extract_all(q, qty_re()), lambda m: {
            pack_count: coalesce(try_cast(nullif(regexp_extract(m, qty_re(), 1), '') AS INTEGER), 1),
            value:      try_cast(replace(regexp_extract(m, qty_re(), 2), ',', '.') AS DOUBLE),
            u:          unit_map()[lower(regexp_replace(regexp_extract(m, qty_re(), 3), '[\s.]', '', 'g'))]
        }),
        lambda x: x.u IS NOT NULL AND x.value > 0)[1];

-- Product name in one language (NULL if missing or blank)
CREATE OR REPLACE MACRO name_in(names, l) AS
    nullif(trim(list_filter(names, lambda x: x.lang = l)[1].text), '');

-- Placeholder values that mean "nothing" (brands and names)
CREATE OR REPLACE MACRO is_placeholder(s) AS
    regexp_full_match(lower(trim(s)),
        '(unknown|inconnue?|sans marque|no brand|none|n/?a|null|nan|undefined|test.*|generic|aucune?|-+|\.+|x+|\?+)');

-- Category tags that mark non-food products
CREATE OR REPLACE MACRO non_food_re() AS
    '^[a-z]{2}:(non-food-products|open-beauty-facts|open-pet-food-facts|open-products-facts|beauty|make-up|lipmake-up|hygiene|health-beauty|household-supplies|cosmetics|.*cleaning-products|.*paints-and-varnishes|tissue-paper.*|.*floor-coverings)$';

-- Country tag -> lookup key: 'en:Türkiye' -> 'turkiye', 'en:Royaume - Uni' -> 'royaume-uni'
CREATE OR REPLACE MACRO country_key(t) AS
    regexp_replace(lower(strip_accents(trim(t[4:]))), '[^a-z0-9א-ת]+', '-', 'g');

-- Open Food Facts country tag (normalized key) -> ISO 3166-1 alpha-2
CREATE OR REPLACE MACRO country_iso() AS MAP {
    'france': 'FR', 'belgium': 'BE', 'portugal': 'PT', 'germany': 'DE',
    'allemagne': 'DE', 'deutschland': 'DE', 'alemania': 'DE', 'germania': 'DE', 'duitsland': 'DE', 'east-germany': 'DE',
    'belgique': 'BE', 'belgien': 'BE', 'belgio': 'BE', 'belgica': 'BE',
    'frankreich': 'FR', 'francia': 'FR', 'frankrijk': 'FR',
    'united-states': 'US', 'spain': 'ES', 'italy': 'IT', 'united-kingdom': 'GB', 'scotland': 'GB', 'england': 'GB', 'wales': 'GB', 'great-britain': 'GB', 'royaume-uni': 'GB', 'etats-unis': 'US',
    'canada': 'CA', 'netherlands': 'NL', 'nederland': 'NL', 'switzerland': 'CH', 'suisse': 'CH', 'schweiz': 'CH', 'australia': 'AU', 'ireland': 'IE',
    'romania': 'RO', 'japan': 'JP', 'poland': 'PL', 'brazil': 'BR', 'russia': 'RU', 'norway': 'NO', 'sweden': 'SE', 'sverige': 'SE',
    'morocco': 'MA', 'maroc': 'MA', 'india': 'IN', 'austria': 'AT', 'denmark': 'DK', 'czech-republic': 'CZ', 'cesko': 'CZ', 'finland': 'FI',
    'bulgaria': 'BG', 'mexico': 'MX', 'saudi-arabia': 'SA', 'argentina': 'AR', 'new-zealand': 'NZ', 'greece': 'GR', 'singapore': 'SG',
    'turkey': 'TR', 'turkiye': 'TR', 'hungary': 'HU', 'lithuania': 'LT', 'luxembourg': 'LU', 'thailand': 'TH', 'south-africa': 'ZA',
    'colombia': 'CO', 'united-arab-emirates': 'AE', 'emirats-arabes-unis': 'AE', 'slovakia': 'SK', 'philippines': 'PH', 'indonesia': 'ID',
    'israel': 'IL', 'ישראל': 'IL', 'croatia': 'HR', 'algeria': 'DZ', 'ukraine': 'UA', 'malaysia': 'MY', 'chile': 'CL', 'estonia': 'EE',
    'iraq': 'IQ', 'qatar': 'QA', 'hong-kong': 'HK', 'serbia': 'RS', 'latvia': 'LV', 'egypt': 'EG', 'reunion': 'RE', 'slovenia': 'SI',
    'bolivia': 'BO', 'lebanon': 'LB', 'tunisia': 'TN', 'taiwan': 'TW', 'south-korea': 'KR', 'kuwait': 'KW', 'iceland': 'IS', 'panama': 'PA',
    'cyprus': 'CY', 'puerto-rico': 'PR', 'peru': 'PE', 'costa-rica': 'CR', 'new-caledonia': 'NC', 'georgia': 'GE', 'ecuador': 'EC',
    'malta': 'MT', 'uruguay': 'UY', 'pakistan': 'PK', 'moldova': 'MD', 'french-polynesia': 'PF', 'guadeloupe': 'GP', 'venezuela': 'VE',
    'dominican-republic': 'DO', 'china': 'CN', 'belarus': 'BY', 'uzbekistan': 'UZ', 'vietnam': 'VN', 'bosnia-and-herzegovina': 'BA',
    'republika-srpska': 'BA', 'bahrain': 'BH', 'north-macedonia': 'MK', 'republic-of-macedonia': 'MK', 'nicaragua': 'NI', 'mauritius': 'MU',
    'cuba': 'CU', 'paraguay': 'PY', 'senegal': 'SN', 'bangladesh': 'BD', 'honduras': 'HN', 'cambodia': 'KH', 'azerbaijan': 'AZ',
    'el-salvador': 'SV', 'jordan': 'JO', 'martinique': 'MQ', 'cote-d-ivoire': 'CI', 'guatemala': 'GT', 'albania': 'AL',
    'virgin-islands-of-the-united-states': 'VI', 'trinidad-and-tobago': 'TT', 'nigeria': 'NG', 'andorra': 'AD', 'kazakhstan': 'KZ',
    'oman': 'OM', 'sri-lanka': 'LK', 'libya': 'LY', 'kenya': 'KE', 'ethiopia': 'ET', 'palestinian-territories': 'PS', 'state-of-palestine': 'PS',
    'montenegro': 'ME', 'cameroon': 'CM', 'iran': 'IR', 'jamaica': 'JM', 'armenia': 'AM', 'ghana': 'GH', 'faroe-islands': 'FO',
    'montserrat': 'MS', 'madagascar': 'MG', 'somalia': 'SO', 'brunei': 'BN', 'french-guiana': 'GF', 'myanmar': 'MM',
    'democratic-republic-of-the-congo': 'CD', 'republic-of-the-congo': 'CG', 'suriname': 'SR', 'gabon': 'GA', 'kosovo': 'XK', 'mongolia': 'MN',
    'nepal': 'NP', 'zambia': 'ZM', 'monaco': 'MC', 'burkina-faso': 'BF', 'maldives': 'MV', 'afghanistan': 'AF', 'rwanda': 'RW',
    'barbados': 'BB', 'gibraltar': 'GI', 'jersey': 'JE', 'guam': 'GU', 'mali': 'ML', 'yemen': 'YE', 'belize': 'BZ', 'kyrgyzstan': 'KG',
    'haiti': 'HT', 'the-bahamas': 'BS', 'comoros': 'KM', 'syria': 'SY', 'macau': 'MO', 'papua-new-guinea': 'PG', 'benin': 'BJ',
    'mauritania': 'MR', 'seychelles': 'SC', 'aland-islands': 'AX', 'isle-of-man': 'IM', 'guinea': 'GN', 'guernsey': 'GG',
    'saint-pierre-and-miquelon': 'PM', 'liechtenstein': 'LI', 'togo': 'TG', 'tanzania': 'TZ', 'sierra-leone': 'SL', 'greenland': 'GL',
    'uganda': 'UG', 'aruba': 'AW', 'guyana': 'GY', 'curacao': 'CW', 'mozambique': 'MZ', 'niger': 'NE', 'namibia': 'NA', 'fiji': 'FJ',
    'san-marino': 'SM', 'bermuda': 'BM', 'angola': 'AO', 'zimbabwe': 'ZW', 'mayotte': 'YT', 'djibouti': 'DJ', 'botswana': 'BW',
    'dominica': 'DM', 'saint-lucia': 'LC', 'cayman-islands': 'KY', 'sudan': 'SD', 'laos': 'LA', 'saint-martin': 'MF',
    'antigua-and-barbuda': 'AG', 'cape-verde': 'CV', 'grenada': 'GD', 'tajikistan': 'TJ', 'malawi': 'MW', 'vanuatu': 'VU', 'chad': 'TD',
    'sint-maarten': 'SX', 'liberia': 'LR', 'american-samoa': 'AS', 'anguilla': 'AI', 'equatorial-guinea': 'GQ', 'burundi': 'BI',
    'saint-vincent-and-the-grenadines': 'VC', 'wallis-and-futuna': 'WF', 'gambia': 'GM', 'northern-mariana-islands': 'MP', 'bhutan': 'BT',
    'british-virgin-islands': 'VG'
};

-- Target markets that earn quality points
CREATE OR REPLACE MACRO target_countries() AS ['BE', 'DE', 'FR', 'PT'];

-- European countries kept in the export: EU 27 + EFTA + UK + rest of geographic Europe
-- (transcontinental RU, TR, GE, AM, AZ, KZ and EU overseas regions like RE, GP are left out)
CREATE OR REPLACE MACRO european_countries() AS [
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU',
    'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',     -- EU 27
    'CH', 'IS', 'LI', 'NO',                                                         -- EFTA
    'GB', 'GG', 'JE', 'IM', 'GI', 'FO', 'AX',                                       -- UK, dependencies
    'AD', 'MC', 'SM', 'AL', 'BA', 'ME', 'MK', 'RS', 'XK', 'MD', 'UA', 'BY'          -- other Europe
];
