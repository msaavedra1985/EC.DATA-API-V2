/**
 * Script de Seed para Locations (países y estados)
 * Usa country-state-city library + traducciones al español
 * 
 * Ejecutar: node data/seed/seed-locations.js
 */

import { Country as CSCCountry, State as CSCState } from 'country-state-city';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Mapeo de nombres de países ISO alpha-2 → español
const countryNamesES = {
    'AF': 'Afganistán', 'AL': 'Albania', 'DE': 'Alemania', 'AD': 'Andorra',
    'AO': 'Angola', 'AI': 'Anguila', 'AQ': 'Antártida', 'AG': 'Antigua y Barbuda',
    'SA': 'Arabia Saudita', 'DZ': 'Argelia', 'AR': 'Argentina', 'AM': 'Armenia',
    'AW': 'Aruba', 'AU': 'Australia', 'AT': 'Austria', 'AZ': 'Azerbaiyán',
    'BS': 'Bahamas', 'BD': 'Bangladés', 'BB': 'Barbados', 'BH': 'Baréin',
    'BE': 'Bélgica', 'BZ': 'Belice', 'BJ': 'Benín', 'BM': 'Bermudas',
    'BY': 'Bielorrusia', 'BO': 'Bolivia', 'BA': 'Bosnia y Herzegovina',
    'BW': 'Botsuana', 'BR': 'Brasil', 'BN': 'Brunéi', 'BG': 'Bulgaria',
    'BF': 'Burkina Faso', 'BI': 'Burundi', 'BT': 'Bután', 'CV': 'Cabo Verde',
    'KH': 'Camboya', 'CM': 'Camerún', 'CA': 'Canadá', 'QA': 'Catar',
    'TD': 'Chad', 'CL': 'Chile', 'CN': 'China', 'CY': 'Chipre',
    'VA': 'Ciudad del Vaticano', 'CO': 'Colombia', 'KM': 'Comoras',
    'KP': 'Corea del Norte', 'KR': 'Corea del Sur', 'CI': 'Costa de Marfil',
    'CR': 'Costa Rica', 'HR': 'Croacia', 'CU': 'Cuba', 'CW': 'Curazao',
    'DK': 'Dinamarca', 'DM': 'Dominica', 'EC': 'Ecuador', 'EG': 'Egipto',
    'SV': 'El Salvador', 'AE': 'Emiratos Árabes Unidos', 'ER': 'Eritrea',
    'SK': 'Eslovaquia', 'SI': 'Eslovenia', 'ES': 'España', 'US': 'Estados Unidos',
    'EE': 'Estonia', 'SZ': 'Esuatini', 'ET': 'Etiopía', 'PH': 'Filipinas',
    'FI': 'Finlandia', 'FJ': 'Fiyi', 'FR': 'Francia', 'GA': 'Gabón',
    'GM': 'Gambia', 'GE': 'Georgia', 'GH': 'Ghana', 'GI': 'Gibraltar',
    'GD': 'Granada', 'GR': 'Grecia', 'GL': 'Groenlandia', 'GP': 'Guadalupe',
    'GU': 'Guam', 'GT': 'Guatemala', 'GF': 'Guayana Francesa', 'GG': 'Guernsey',
    'GN': 'Guinea', 'GQ': 'Guinea Ecuatorial', 'GW': 'Guinea-Bisáu', 'GY': 'Guyana',
    'HT': 'Haití', 'HN': 'Honduras', 'HK': 'Hong Kong', 'HU': 'Hungría',
    'IN': 'India', 'ID': 'Indonesia', 'IQ': 'Irak', 'IR': 'Irán', 'IE': 'Irlanda',
    'BV': 'Isla Bouvet', 'IM': 'Isla de Man', 'CX': 'Isla de Navidad',
    'NF': 'Isla Norfolk', 'IS': 'Islandia', 'KY': 'Islas Caimán',
    'CC': 'Islas Cocos', 'CK': 'Islas Cook', 'FO': 'Islas Feroe',
    'GS': 'Islas Georgias del Sur', 'HM': 'Islas Heard y McDonald',
    'FK': 'Islas Malvinas', 'MP': 'Islas Marianas del Norte', 'MH': 'Islas Marshall',
    'PN': 'Islas Pitcairn', 'SB': 'Islas Salomón', 'TC': 'Islas Turcas y Caicos',
    'UM': 'Islas Ultramarinas Menores', 'VG': 'Islas Vírgenes Británicas',
    'VI': 'Islas Vírgenes EE.UU.', 'IL': 'Israel', 'IT': 'Italia',
    'JM': 'Jamaica', 'JP': 'Japón', 'JE': 'Jersey', 'JO': 'Jordania',
    'KZ': 'Kazajistán', 'KE': 'Kenia', 'KG': 'Kirguistán', 'KI': 'Kiribati',
    'KW': 'Kuwait', 'LA': 'Laos', 'LS': 'Lesoto', 'LV': 'Letonia',
    'LB': 'Líbano', 'LR': 'Liberia', 'LY': 'Libia', 'LI': 'Liechtenstein',
    'LT': 'Lituania', 'LU': 'Luxemburgo', 'MO': 'Macao', 'MK': 'Macedonia del Norte',
    'MG': 'Madagascar', 'MY': 'Malasia', 'MW': 'Malaui', 'MV': 'Maldivas',
    'ML': 'Malí', 'MT': 'Malta', 'MA': 'Marruecos', 'MQ': 'Martinica',
    'MU': 'Mauricio', 'MR': 'Mauritania', 'YT': 'Mayotte', 'MX': 'México',
    'FM': 'Micronesia', 'MD': 'Moldavia', 'MC': 'Mónaco', 'MN': 'Mongolia',
    'ME': 'Montenegro', 'MS': 'Montserrat', 'MZ': 'Mozambique', 'MM': 'Myanmar',
    'NA': 'Namibia', 'NR': 'Nauru', 'NP': 'Nepal', 'NI': 'Nicaragua',
    'NE': 'Níger', 'NG': 'Nigeria', 'NU': 'Niue', 'NO': 'Noruega',
    'NC': 'Nueva Caledonia', 'NZ': 'Nueva Zelanda', 'OM': 'Omán',
    'NL': 'Países Bajos', 'PK': 'Pakistán', 'PW': 'Palaos', 'PS': 'Palestina',
    'PA': 'Panamá', 'PG': 'Papúa Nueva Guinea', 'PY': 'Paraguay', 'PE': 'Perú',
    'PF': 'Polinesia Francesa', 'PL': 'Polonia', 'PT': 'Portugal', 'PR': 'Puerto Rico',
    'GB': 'Reino Unido', 'CF': 'República Centroafricana', 'CZ': 'República Checa',
    'CG': 'República del Congo', 'CD': 'República Democrática del Congo',
    'DO': 'República Dominicana', 'RE': 'Reunión', 'RW': 'Ruanda', 'RO': 'Rumania',
    'RU': 'Rusia', 'EH': 'Sahara Occidental', 'WS': 'Samoa', 'AS': 'Samoa Americana',
    'BL': 'San Bartolomé', 'KN': 'San Cristóbal y Nieves', 'SM': 'San Marino',
    'MF': 'San Martín', 'PM': 'San Pedro y Miquelón', 'VC': 'San Vicente y las Granadinas',
    'SH': 'Santa Elena', 'LC': 'Santa Lucía', 'ST': 'Santo Tomé y Príncipe',
    'SN': 'Senegal', 'RS': 'Serbia', 'SC': 'Seychelles', 'SL': 'Sierra Leona',
    'SG': 'Singapur', 'SX': 'Sint Maarten', 'SY': 'Siria', 'SO': 'Somalia',
    'LK': 'Sri Lanka', 'ZA': 'Sudáfrica', 'SD': 'Sudán', 'SS': 'Sudán del Sur',
    'SE': 'Suecia', 'CH': 'Suiza', 'SR': 'Surinam', 'SJ': 'Svalbard y Jan Mayen',
    'TH': 'Tailandia', 'TW': 'Taiwán', 'TZ': 'Tanzania', 'TJ': 'Tayikistán',
    'IO': 'Territorio Británico del Océano Índico', 'TF': 'Territorios Australes Franceses',
    'TL': 'Timor Oriental', 'TG': 'Togo', 'TK': 'Tokelau', 'TO': 'Tonga',
    'TT': 'Trinidad y Tobago', 'TN': 'Túnez', 'TM': 'Turkmenistán', 'TR': 'Turquía',
    'TV': 'Tuvalu', 'UA': 'Ucrania', 'UG': 'Uganda', 'UY': 'Uruguay',
    'UZ': 'Uzbekistán', 'VU': 'Vanuatu', 'VE': 'Venezuela', 'VN': 'Vietnam',
    'WF': 'Wallis y Futuna', 'YE': 'Yemen', 'DJ': 'Yibuti', 'ZM': 'Zambia',
    'ZW': 'Zimbabue', 'AX': 'Islas Åland'
};

// ISO alpha-3 codes mapping
const isoAlpha3Map = {
    'AF': 'AFG', 'AL': 'ALB', 'DZ': 'DZA', 'AS': 'ASM', 'AD': 'AND',
    'AO': 'AGO', 'AI': 'AIA', 'AQ': 'ATA', 'AG': 'ATG', 'AR': 'ARG',
    'AM': 'ARM', 'AW': 'ABW', 'AU': 'AUS', 'AT': 'AUT', 'AZ': 'AZE',
    'BS': 'BHS', 'BH': 'BHR', 'BD': 'BGD', 'BB': 'BRB', 'BY': 'BLR',
    'BE': 'BEL', 'BZ': 'BLZ', 'BJ': 'BEN', 'BM': 'BMU', 'BT': 'BTN',
    'BO': 'BOL', 'BA': 'BIH', 'BW': 'BWA', 'BV': 'BVT', 'BR': 'BRA',
    'IO': 'IOT', 'BN': 'BRN', 'BG': 'BGR', 'BF': 'BFA', 'BI': 'BDI',
    'KH': 'KHM', 'CM': 'CMR', 'CA': 'CAN', 'CV': 'CPV', 'KY': 'CYM',
    'CF': 'CAF', 'TD': 'TCD', 'CL': 'CHL', 'CN': 'CHN', 'CX': 'CXR',
    'CC': 'CCK', 'CO': 'COL', 'KM': 'COM', 'CG': 'COG', 'CD': 'COD',
    'CK': 'COK', 'CR': 'CRI', 'CI': 'CIV', 'HR': 'HRV', 'CU': 'CUB',
    'CY': 'CYP', 'CZ': 'CZE', 'DK': 'DNK', 'DJ': 'DJI', 'DM': 'DMA',
    'DO': 'DOM', 'EC': 'ECU', 'EG': 'EGY', 'SV': 'SLV', 'GQ': 'GNQ',
    'ER': 'ERI', 'EE': 'EST', 'ET': 'ETH', 'FK': 'FLK', 'FO': 'FRO',
    'FJ': 'FJI', 'FI': 'FIN', 'FR': 'FRA', 'GF': 'GUF', 'PF': 'PYF',
    'TF': 'ATF', 'GA': 'GAB', 'GM': 'GMB', 'GE': 'GEO', 'DE': 'DEU',
    'GH': 'GHA', 'GI': 'GIB', 'GR': 'GRC', 'GL': 'GRL', 'GD': 'GRD',
    'GP': 'GLP', 'GU': 'GUM', 'GT': 'GTM', 'GG': 'GGY', 'GN': 'GIN',
    'GW': 'GNB', 'GY': 'GUY', 'HT': 'HTI', 'HM': 'HMD', 'VA': 'VAT',
    'HN': 'HND', 'HK': 'HKG', 'HU': 'HUN', 'IS': 'ISL', 'IN': 'IND',
    'ID': 'IDN', 'IR': 'IRN', 'IQ': 'IRQ', 'IE': 'IRL', 'IM': 'IMN',
    'IL': 'ISR', 'IT': 'ITA', 'JM': 'JAM', 'JP': 'JPN', 'JE': 'JEY',
    'JO': 'JOR', 'KZ': 'KAZ', 'KE': 'KEN', 'KI': 'KIR', 'KP': 'PRK',
    'KR': 'KOR', 'KW': 'KWT', 'KG': 'KGZ', 'LA': 'LAO', 'LV': 'LVA',
    'LB': 'LBN', 'LS': 'LSO', 'LR': 'LBR', 'LY': 'LBY', 'LI': 'LIE',
    'LT': 'LTU', 'LU': 'LUX', 'MO': 'MAC', 'MK': 'MKD', 'MG': 'MDG',
    'MW': 'MWI', 'MY': 'MYS', 'MV': 'MDV', 'ML': 'MLI', 'MT': 'MLT',
    'MH': 'MHL', 'MQ': 'MTQ', 'MR': 'MRT', 'MU': 'MUS', 'YT': 'MYT',
    'MX': 'MEX', 'FM': 'FSM', 'MD': 'MDA', 'MC': 'MCO', 'MN': 'MNG',
    'ME': 'MNE', 'MS': 'MSR', 'MA': 'MAR', 'MZ': 'MOZ', 'MM': 'MMR',
    'NA': 'NAM', 'NR': 'NRU', 'NP': 'NPL', 'NL': 'NLD', 'NC': 'NCL',
    'NZ': 'NZL', 'NI': 'NIC', 'NE': 'NER', 'NG': 'NGA', 'NU': 'NIU',
    'NF': 'NFK', 'MP': 'MNP', 'NO': 'NOR', 'OM': 'OMN', 'PK': 'PAK',
    'PW': 'PLW', 'PS': 'PSE', 'PA': 'PAN', 'PG': 'PNG', 'PY': 'PRY',
    'PE': 'PER', 'PH': 'PHL', 'PN': 'PCN', 'PL': 'POL', 'PT': 'PRT',
    'PR': 'PRI', 'QA': 'QAT', 'RE': 'REU', 'RO': 'ROU', 'RU': 'RUS',
    'RW': 'RWA', 'BL': 'BLM', 'SH': 'SHN', 'KN': 'KNA', 'LC': 'LCA',
    'MF': 'MAF', 'PM': 'SPM', 'VC': 'VCT', 'WS': 'WSM', 'SM': 'SMR',
    'ST': 'STP', 'SA': 'SAU', 'SN': 'SEN', 'RS': 'SRB', 'SC': 'SYC',
    'SL': 'SLE', 'SG': 'SGP', 'SX': 'SXM', 'SK': 'SVK', 'SI': 'SVN',
    'SB': 'SLB', 'SO': 'SOM', 'ZA': 'ZAF', 'GS': 'SGS', 'SS': 'SSD',
    'ES': 'ESP', 'LK': 'LKA', 'SD': 'SDN', 'SR': 'SUR', 'SJ': 'SJM',
    'SZ': 'SWZ', 'SE': 'SWE', 'CH': 'CHE', 'SY': 'SYR', 'TW': 'TWN',
    'TJ': 'TJK', 'TZ': 'TZA', 'TH': 'THA', 'TL': 'TLS', 'TG': 'TGO',
    'TK': 'TKL', 'TO': 'TON', 'TT': 'TTO', 'TN': 'TUN', 'TR': 'TUR',
    'TM': 'TKM', 'TC': 'TCA', 'TV': 'TUV', 'UG': 'UGA', 'UA': 'UKR',
    'AE': 'ARE', 'GB': 'GBR', 'US': 'USA', 'UM': 'UMI', 'UY': 'URY',
    'UZ': 'UZB', 'VU': 'VUT', 'VE': 'VEN', 'VN': 'VNM', 'VG': 'VGB',
    'VI': 'VIR', 'WF': 'WLF', 'EH': 'ESH', 'YE': 'YEM', 'ZM': 'ZMB',
    'ZW': 'ZWE', 'AX': 'ALA', 'CW': 'CUW'
};

// ISO numeric codes
const isoNumericMap = {
    'AF': '004', 'AL': '008', 'DZ': '012', 'AS': '016', 'AD': '020',
    'AO': '024', 'AI': '660', 'AQ': '010', 'AG': '028', 'AR': '032',
    'AM': '051', 'AW': '533', 'AU': '036', 'AT': '040', 'AZ': '031',
    'BS': '044', 'BH': '048', 'BD': '050', 'BB': '052', 'BY': '112',
    'BE': '056', 'BZ': '084', 'BJ': '204', 'BM': '060', 'BT': '064',
    'BO': '068', 'BA': '070', 'BW': '072', 'BV': '074', 'BR': '076',
    'IO': '086', 'BN': '096', 'BG': '100', 'BF': '854', 'BI': '108',
    'KH': '116', 'CM': '120', 'CA': '124', 'CV': '132', 'KY': '136',
    'CF': '140', 'TD': '148', 'CL': '152', 'CN': '156', 'CX': '162',
    'CC': '166', 'CO': '170', 'KM': '174', 'CG': '178', 'CD': '180',
    'CK': '184', 'CR': '188', 'CI': '384', 'HR': '191', 'CU': '192',
    'CY': '196', 'CZ': '203', 'DK': '208', 'DJ': '262', 'DM': '212',
    'DO': '214', 'EC': '218', 'EG': '818', 'SV': '222', 'GQ': '226',
    'ER': '232', 'EE': '233', 'ET': '231', 'FK': '238', 'FO': '234',
    'FJ': '242', 'FI': '246', 'FR': '250', 'GF': '254', 'PF': '258',
    'TF': '260', 'GA': '266', 'GM': '270', 'GE': '268', 'DE': '276',
    'GH': '288', 'GI': '292', 'GR': '300', 'GL': '304', 'GD': '308',
    'GP': '312', 'GU': '316', 'GT': '320', 'GG': '831', 'GN': '324',
    'GW': '624', 'GY': '328', 'HT': '332', 'HM': '334', 'VA': '336',
    'HN': '340', 'HK': '344', 'HU': '348', 'IS': '352', 'IN': '356',
    'ID': '360', 'IR': '364', 'IQ': '368', 'IE': '372', 'IM': '833',
    'IL': '376', 'IT': '380', 'JM': '388', 'JP': '392', 'JE': '832',
    'JO': '400', 'KZ': '398', 'KE': '404', 'KI': '296', 'KP': '408',
    'KR': '410', 'KW': '414', 'KG': '417', 'LA': '418', 'LV': '428',
    'LB': '422', 'LS': '426', 'LR': '430', 'LY': '434', 'LI': '438',
    'LT': '440', 'LU': '442', 'MO': '446', 'MK': '807', 'MG': '450',
    'MW': '454', 'MY': '458', 'MV': '462', 'ML': '466', 'MT': '470',
    'MH': '584', 'MQ': '474', 'MR': '478', 'MU': '480', 'YT': '175',
    'MX': '484', 'FM': '583', 'MD': '498', 'MC': '492', 'MN': '496',
    'ME': '499', 'MS': '500', 'MA': '504', 'MZ': '508', 'MM': '104',
    'NA': '516', 'NR': '520', 'NP': '524', 'NL': '528', 'NC': '540',
    'NZ': '554', 'NI': '558', 'NE': '562', 'NG': '566', 'NU': '570',
    'NF': '574', 'MP': '580', 'NO': '578', 'OM': '512', 'PK': '586',
    'PW': '585', 'PS': '275', 'PA': '591', 'PG': '598', 'PY': '600',
    'PE': '604', 'PH': '608', 'PN': '612', 'PL': '616', 'PT': '620',
    'PR': '630', 'QA': '634', 'RE': '638', 'RO': '642', 'RU': '643',
    'RW': '646', 'BL': '652', 'SH': '654', 'KN': '659', 'LC': '662',
    'MF': '663', 'PM': '666', 'VC': '670', 'WS': '882', 'SM': '674',
    'ST': '678', 'SA': '682', 'SN': '686', 'RS': '688', 'SC': '690',
    'SL': '694', 'SG': '702', 'SX': '534', 'SK': '703', 'SI': '705',
    'SB': '090', 'SO': '706', 'ZA': '710', 'GS': '239', 'SS': '728',
    'ES': '724', 'LK': '144', 'SD': '729', 'SR': '740', 'SJ': '744',
    'SZ': '748', 'SE': '752', 'CH': '756', 'SY': '760', 'TW': '158',
    'TJ': '762', 'TZ': '834', 'TH': '764', 'TL': '626', 'TG': '768',
    'TK': '772', 'TO': '776', 'TT': '780', 'TN': '788', 'TR': '792',
    'TM': '795', 'TC': '796', 'TV': '798', 'UG': '800', 'UA': '804',
    'AE': '784', 'GB': '826', 'US': '840', 'UM': '581', 'UY': '858',
    'UZ': '860', 'VU': '548', 'VE': '862', 'VN': '704', 'VG': '092',
    'VI': '850', 'WF': '876', 'EH': '732', 'YE': '887', 'ZM': '894',
    'ZW': '716', 'AX': '248', 'CW': '531'
};

async function seedCountries() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🌍 Iniciando seed de países...');
        
        const countries = CSCCountry.getAllCountries();
        let countryCount = 0;
        let translationCount = 0;
        
        // Batch de países
        for (const country of countries) {
            const isoAlpha2 = country.isoCode;
            const isoAlpha3 = isoAlpha3Map[isoAlpha2] || `${isoAlpha2}X`;
            let isoNumeric = isoNumericMap[isoAlpha2];
            if (!isoNumeric) {
                const hash = isoAlpha2.charCodeAt(0) * 26 + isoAlpha2.charCodeAt(1);
                isoNumeric = String(900 + (hash % 100)).padStart(3, '0');
            }
            let phoneCode = country.phonecode ? `+${country.phonecode}` : null;
            if (phoneCode && phoneCode.length > 10) {
                phoneCode = phoneCode.substring(0, 10);
            }
            const nameES = countryNamesES[isoAlpha2] || country.name;
            const nameEN = country.name;
            
            // Upsert país
            const result = await client.query(`
                INSERT INTO countries (iso_alpha2, iso_alpha3, iso_numeric, phone_code, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, true, NOW(), NOW())
                ON CONFLICT (iso_alpha2) DO UPDATE SET 
                    phone_code = EXCLUDED.phone_code,
                    updated_at = NOW()
                RETURNING (xmax = 0) AS inserted
            `, [isoAlpha2, isoAlpha3, isoNumeric, phoneCode]);
            
            if (result.rows[0]?.inserted) countryCount++;
            
            // Upsert traducciones
            await client.query(`
                INSERT INTO country_translations (country_code, lang, name, created_at, updated_at)
                VALUES ($1, 'es', $2, NOW(), NOW())
                ON CONFLICT (country_code, lang) DO UPDATE SET name = $2, updated_at = NOW()
            `, [isoAlpha2, nameES]);
            
            await client.query(`
                INSERT INTO country_translations (country_code, lang, name, created_at, updated_at)
                VALUES ($1, 'en', $2, NOW(), NOW())
                ON CONFLICT (country_code, lang) DO UPDATE SET name = $2, updated_at = NOW()
            `, [isoAlpha2, nameEN]);
            
            translationCount += 2;
        }
        
        await client.query('COMMIT');
        console.log(`✅ Países insertados: ${countryCount}`);
        console.log(`✅ Traducciones de países: ${translationCount}`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function seedStates() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🗺️ Iniciando seed de estados/provincias...');
        
        const countries = CSCCountry.getAllCountries();
        let stateCount = 0;
        let translationCount = 0;
        let batchSize = 0;
        
        for (const country of countries) {
            const states = CSCState.getStatesOfCountry(country.isoCode);
            
            for (const state of states) {
                const fullCode = `${country.isoCode}-${state.isoCode}`;
                const stateCode = state.isoCode;
                const stateName = state.name;
                const latitude = state.latitude ? parseFloat(state.latitude) : null;
                const longitude = state.longitude ? parseFloat(state.longitude) : null;
                
                // Upsert estado
                const result = await client.query(`
                    INSERT INTO states (code, country_code, state_code, latitude, longitude, is_active, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
                    ON CONFLICT (code) DO UPDATE SET 
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        updated_at = NOW()
                    RETURNING (xmax = 0) AS inserted
                `, [fullCode, country.isoCode, stateCode, latitude, longitude]);
                
                if (result.rows[0]?.inserted) stateCount++;
                
                // Upsert traducciones
                await client.query(`
                    INSERT INTO state_translations (state_code, lang, name, created_at, updated_at)
                    VALUES ($1, 'es', $2, NOW(), NOW())
                    ON CONFLICT (state_code, lang) DO UPDATE SET name = $2, updated_at = NOW()
                `, [fullCode, stateName]);
                
                await client.query(`
                    INSERT INTO state_translations (state_code, lang, name, created_at, updated_at)
                    VALUES ($1, 'en', $2, NOW(), NOW())
                    ON CONFLICT (state_code, lang) DO UPDATE SET name = $2, updated_at = NOW()
                `, [fullCode, stateName]);
                
                translationCount += 2;
                batchSize++;
                
                // Commit cada 500 estados para evitar timeout
                if (batchSize >= 500) {
                    await client.query('COMMIT');
                    await client.query('BEGIN');
                    console.log(`  ...procesados ${stateCount} estados`);
                    batchSize = 0;
                }
            }
        }
        
        await client.query('COMMIT');
        console.log(`✅ Estados insertados: ${stateCount}`);
        console.log(`✅ Traducciones de estados: ${translationCount}`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    console.log('🚀 Seed de Locations iniciado');
    console.log('================================');
    
    try {
        await seedCountries();
        await seedStates();
        
        console.log('================================');
        console.log('✅ Seed completado exitosamente');
        
        // Mostrar estadísticas
        const client = await pool.connect();
        const countriesCount = await client.query('SELECT COUNT(*) FROM countries');
        const statesCount = await client.query('SELECT COUNT(*) FROM states');
        client.release();
        
        console.log(`📊 Total países: ${countriesCount.rows[0].count}`);
        console.log(`📊 Total estados: ${statesCount.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error en seed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
