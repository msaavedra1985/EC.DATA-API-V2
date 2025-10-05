import Country from '../../modules/countries/models/Country.js';
import CountryTranslation from '../../modules/countries/models/CountryTranslation.js';
import { dbLogger } from '../../utils/logger.js';

/**
 * Datos de países con códigos ISO 3166-1 y traducciones
 * Incluye ~55 países importantes de todos los continentes
 */
const countriesData = [
    // América Latina
    {
        iso_alpha2: 'AR',
        iso_alpha3: 'ARG',
        iso_numeric: '032',
        phone_code: '+54',
        translations: {
            es: { name: 'Argentina', official_name: 'República Argentina' },
            en: { name: 'Argentina', official_name: 'Argentine Republic' }
        }
    },
    {
        iso_alpha2: 'BR',
        iso_alpha3: 'BRA',
        iso_numeric: '076',
        phone_code: '+55',
        translations: {
            es: { name: 'Brasil', official_name: 'República Federativa del Brasil' },
            en: { name: 'Brazil', official_name: 'Federative Republic of Brazil' }
        }
    },
    {
        iso_alpha2: 'CL',
        iso_alpha3: 'CHL',
        iso_numeric: '152',
        phone_code: '+56',
        translations: {
            es: { name: 'Chile', official_name: 'República de Chile' },
            en: { name: 'Chile', official_name: 'Republic of Chile' }
        }
    },
    {
        iso_alpha2: 'CO',
        iso_alpha3: 'COL',
        iso_numeric: '170',
        phone_code: '+57',
        translations: {
            es: { name: 'Colombia', official_name: 'República de Colombia' },
            en: { name: 'Colombia', official_name: 'Republic of Colombia' }
        }
    },
    {
        iso_alpha2: 'MX',
        iso_alpha3: 'MEX',
        iso_numeric: '484',
        phone_code: '+52',
        translations: {
            es: { name: 'México', official_name: 'Estados Unidos Mexicanos' },
            en: { name: 'Mexico', official_name: 'United Mexican States' }
        }
    },
    {
        iso_alpha2: 'PE',
        iso_alpha3: 'PER',
        iso_numeric: '604',
        phone_code: '+51',
        translations: {
            es: { name: 'Perú', official_name: 'República del Perú' },
            en: { name: 'Peru', official_name: 'Republic of Peru' }
        }
    },
    {
        iso_alpha2: 'UY',
        iso_alpha3: 'URY',
        iso_numeric: '858',
        phone_code: '+598',
        translations: {
            es: { name: 'Uruguay', official_name: 'República Oriental del Uruguay' },
            en: { name: 'Uruguay', official_name: 'Oriental Republic of Uruguay' }
        }
    },
    {
        iso_alpha2: 'VE',
        iso_alpha3: 'VEN',
        iso_numeric: '862',
        phone_code: '+58',
        translations: {
            es: { name: 'Venezuela', official_name: 'República Bolivariana de Venezuela' },
            en: { name: 'Venezuela', official_name: 'Bolivarian Republic of Venezuela' }
        }
    },
    {
        iso_alpha2: 'EC',
        iso_alpha3: 'ECU',
        iso_numeric: '218',
        phone_code: '+593',
        translations: {
            es: { name: 'Ecuador', official_name: 'República del Ecuador' },
            en: { name: 'Ecuador', official_name: 'Republic of Ecuador' }
        }
    },
    {
        iso_alpha2: 'BO',
        iso_alpha3: 'BOL',
        iso_numeric: '068',
        phone_code: '+591',
        translations: {
            es: { name: 'Bolivia', official_name: 'Estado Plurinacional de Bolivia' },
            en: { name: 'Bolivia', official_name: 'Plurinational State of Bolivia' }
        }
    },
    {
        iso_alpha2: 'PY',
        iso_alpha3: 'PRY',
        iso_numeric: '600',
        phone_code: '+595',
        translations: {
            es: { name: 'Paraguay', official_name: 'República del Paraguay' },
            en: { name: 'Paraguay', official_name: 'Republic of Paraguay' }
        }
    },
    {
        iso_alpha2: 'CR',
        iso_alpha3: 'CRI',
        iso_numeric: '188',
        phone_code: '+506',
        translations: {
            es: { name: 'Costa Rica', official_name: 'República de Costa Rica' },
            en: { name: 'Costa Rica', official_name: 'Republic of Costa Rica' }
        }
    },
    {
        iso_alpha2: 'PA',
        iso_alpha3: 'PAN',
        iso_numeric: '591',
        phone_code: '+507',
        translations: {
            es: { name: 'Panamá', official_name: 'República de Panamá' },
            en: { name: 'Panama', official_name: 'Republic of Panama' }
        }
    },

    // América del Norte
    {
        iso_alpha2: 'US',
        iso_alpha3: 'USA',
        iso_numeric: '840',
        phone_code: '+1',
        translations: {
            es: { name: 'Estados Unidos', official_name: 'Estados Unidos de América' },
            en: { name: 'United States', official_name: 'United States of America' }
        }
    },
    {
        iso_alpha2: 'CA',
        iso_alpha3: 'CAN',
        iso_numeric: '124',
        phone_code: '+1',
        translations: {
            es: { name: 'Canadá', official_name: 'Canadá' },
            en: { name: 'Canada', official_name: 'Canada' }
        }
    },

    // Europa Occidental
    {
        iso_alpha2: 'ES',
        iso_alpha3: 'ESP',
        iso_numeric: '724',
        phone_code: '+34',
        translations: {
            es: { name: 'España', official_name: 'Reino de España' },
            en: { name: 'Spain', official_name: 'Kingdom of Spain' }
        }
    },
    {
        iso_alpha2: 'FR',
        iso_alpha3: 'FRA',
        iso_numeric: '250',
        phone_code: '+33',
        translations: {
            es: { name: 'Francia', official_name: 'República Francesa' },
            en: { name: 'France', official_name: 'French Republic' }
        }
    },
    {
        iso_alpha2: 'DE',
        iso_alpha3: 'DEU',
        iso_numeric: '276',
        phone_code: '+49',
        translations: {
            es: { name: 'Alemania', official_name: 'República Federal de Alemania' },
            en: { name: 'Germany', official_name: 'Federal Republic of Germany' }
        }
    },
    {
        iso_alpha2: 'IT',
        iso_alpha3: 'ITA',
        iso_numeric: '380',
        phone_code: '+39',
        translations: {
            es: { name: 'Italia', official_name: 'República Italiana' },
            en: { name: 'Italy', official_name: 'Italian Republic' }
        }
    },
    {
        iso_alpha2: 'GB',
        iso_alpha3: 'GBR',
        iso_numeric: '826',
        phone_code: '+44',
        translations: {
            es: { name: 'Reino Unido', official_name: 'Reino Unido de Gran Bretaña e Irlanda del Norte' },
            en: { name: 'United Kingdom', official_name: 'United Kingdom of Great Britain and Northern Ireland' }
        }
    },
    {
        iso_alpha2: 'PT',
        iso_alpha3: 'PRT',
        iso_numeric: '620',
        phone_code: '+351',
        translations: {
            es: { name: 'Portugal', official_name: 'República Portuguesa' },
            en: { name: 'Portugal', official_name: 'Portuguese Republic' }
        }
    },
    {
        iso_alpha2: 'NL',
        iso_alpha3: 'NLD',
        iso_numeric: '528',
        phone_code: '+31',
        translations: {
            es: { name: 'Países Bajos', official_name: 'Reino de los Países Bajos' },
            en: { name: 'Netherlands', official_name: 'Kingdom of the Netherlands' }
        }
    },
    {
        iso_alpha2: 'BE',
        iso_alpha3: 'BEL',
        iso_numeric: '056',
        phone_code: '+32',
        translations: {
            es: { name: 'Bélgica', official_name: 'Reino de Bélgica' },
            en: { name: 'Belgium', official_name: 'Kingdom of Belgium' }
        }
    },
    {
        iso_alpha2: 'CH',
        iso_alpha3: 'CHE',
        iso_numeric: '756',
        phone_code: '+41',
        translations: {
            es: { name: 'Suiza', official_name: 'Confederación Suiza' },
            en: { name: 'Switzerland', official_name: 'Swiss Confederation' }
        }
    },
    {
        iso_alpha2: 'AT',
        iso_alpha3: 'AUT',
        iso_numeric: '040',
        phone_code: '+43',
        translations: {
            es: { name: 'Austria', official_name: 'República de Austria' },
            en: { name: 'Austria', official_name: 'Republic of Austria' }
        }
    },
    {
        iso_alpha2: 'IE',
        iso_alpha3: 'IRL',
        iso_numeric: '372',
        phone_code: '+353',
        translations: {
            es: { name: 'Irlanda', official_name: 'Irlanda' },
            en: { name: 'Ireland', official_name: 'Ireland' }
        }
    },

    // Europa del Este
    {
        iso_alpha2: 'PL',
        iso_alpha3: 'POL',
        iso_numeric: '616',
        phone_code: '+48',
        translations: {
            es: { name: 'Polonia', official_name: 'República de Polonia' },
            en: { name: 'Poland', official_name: 'Republic of Poland' }
        }
    },
    {
        iso_alpha2: 'RU',
        iso_alpha3: 'RUS',
        iso_numeric: '643',
        phone_code: '+7',
        translations: {
            es: { name: 'Rusia', official_name: 'Federación de Rusia' },
            en: { name: 'Russia', official_name: 'Russian Federation' }
        }
    },
    {
        iso_alpha2: 'UA',
        iso_alpha3: 'UKR',
        iso_numeric: '804',
        phone_code: '+380',
        translations: {
            es: { name: 'Ucrania', official_name: 'Ucrania' },
            en: { name: 'Ukraine', official_name: 'Ukraine' }
        }
    },
    {
        iso_alpha2: 'CZ',
        iso_alpha3: 'CZE',
        iso_numeric: '203',
        phone_code: '+420',
        translations: {
            es: { name: 'República Checa', official_name: 'República Checa' },
            en: { name: 'Czech Republic', official_name: 'Czech Republic' }
        }
    },

    // Europa del Norte
    {
        iso_alpha2: 'SE',
        iso_alpha3: 'SWE',
        iso_numeric: '752',
        phone_code: '+46',
        translations: {
            es: { name: 'Suecia', official_name: 'Reino de Suecia' },
            en: { name: 'Sweden', official_name: 'Kingdom of Sweden' }
        }
    },
    {
        iso_alpha2: 'NO',
        iso_alpha3: 'NOR',
        iso_numeric: '578',
        phone_code: '+47',
        translations: {
            es: { name: 'Noruega', official_name: 'Reino de Noruega' },
            en: { name: 'Norway', official_name: 'Kingdom of Norway' }
        }
    },
    {
        iso_alpha2: 'DK',
        iso_alpha3: 'DNK',
        iso_numeric: '208',
        phone_code: '+45',
        translations: {
            es: { name: 'Dinamarca', official_name: 'Reino de Dinamarca' },
            en: { name: 'Denmark', official_name: 'Kingdom of Denmark' }
        }
    },
    {
        iso_alpha2: 'FI',
        iso_alpha3: 'FIN',
        iso_numeric: '246',
        phone_code: '+358',
        translations: {
            es: { name: 'Finlandia', official_name: 'República de Finlandia' },
            en: { name: 'Finland', official_name: 'Republic of Finland' }
        }
    },

    // Asia
    {
        iso_alpha2: 'CN',
        iso_alpha3: 'CHN',
        iso_numeric: '156',
        phone_code: '+86',
        translations: {
            es: { name: 'China', official_name: 'República Popular China' },
            en: { name: 'China', official_name: 'People\'s Republic of China' }
        }
    },
    {
        iso_alpha2: 'JP',
        iso_alpha3: 'JPN',
        iso_numeric: '392',
        phone_code: '+81',
        translations: {
            es: { name: 'Japón', official_name: 'Japón' },
            en: { name: 'Japan', official_name: 'Japan' }
        }
    },
    {
        iso_alpha2: 'IN',
        iso_alpha3: 'IND',
        iso_numeric: '356',
        phone_code: '+91',
        translations: {
            es: { name: 'India', official_name: 'República de la India' },
            en: { name: 'India', official_name: 'Republic of India' }
        }
    },
    {
        iso_alpha2: 'KR',
        iso_alpha3: 'KOR',
        iso_numeric: '410',
        phone_code: '+82',
        translations: {
            es: { name: 'Corea del Sur', official_name: 'República de Corea' },
            en: { name: 'South Korea', official_name: 'Republic of Korea' }
        }
    },
    {
        iso_alpha2: 'ID',
        iso_alpha3: 'IDN',
        iso_numeric: '360',
        phone_code: '+62',
        translations: {
            es: { name: 'Indonesia', official_name: 'República de Indonesia' },
            en: { name: 'Indonesia', official_name: 'Republic of Indonesia' }
        }
    },
    {
        iso_alpha2: 'TH',
        iso_alpha3: 'THA',
        iso_numeric: '764',
        phone_code: '+66',
        translations: {
            es: { name: 'Tailandia', official_name: 'Reino de Tailandia' },
            en: { name: 'Thailand', official_name: 'Kingdom of Thailand' }
        }
    },
    {
        iso_alpha2: 'MY',
        iso_alpha3: 'MYS',
        iso_numeric: '458',
        phone_code: '+60',
        translations: {
            es: { name: 'Malasia', official_name: 'Malasia' },
            en: { name: 'Malaysia', official_name: 'Malaysia' }
        }
    },
    {
        iso_alpha2: 'SG',
        iso_alpha3: 'SGP',
        iso_numeric: '702',
        phone_code: '+65',
        translations: {
            es: { name: 'Singapur', official_name: 'República de Singapur' },
            en: { name: 'Singapore', official_name: 'Republic of Singapore' }
        }
    },
    {
        iso_alpha2: 'PH',
        iso_alpha3: 'PHL',
        iso_numeric: '608',
        phone_code: '+63',
        translations: {
            es: { name: 'Filipinas', official_name: 'República de Filipinas' },
            en: { name: 'Philippines', official_name: 'Republic of the Philippines' }
        }
    },
    {
        iso_alpha2: 'VN',
        iso_alpha3: 'VNM',
        iso_numeric: '704',
        phone_code: '+84',
        translations: {
            es: { name: 'Vietnam', official_name: 'República Socialista de Vietnam' },
            en: { name: 'Vietnam', official_name: 'Socialist Republic of Vietnam' }
        }
    },
    {
        iso_alpha2: 'IL',
        iso_alpha3: 'ISR',
        iso_numeric: '376',
        phone_code: '+972',
        translations: {
            es: { name: 'Israel', official_name: 'Estado de Israel' },
            en: { name: 'Israel', official_name: 'State of Israel' }
        }
    },
    {
        iso_alpha2: 'TR',
        iso_alpha3: 'TUR',
        iso_numeric: '792',
        phone_code: '+90',
        translations: {
            es: { name: 'Turquía', official_name: 'República de Turquía' },
            en: { name: 'Turkey', official_name: 'Republic of Turkey' }
        }
    },
    {
        iso_alpha2: 'SA',
        iso_alpha3: 'SAU',
        iso_numeric: '682',
        phone_code: '+966',
        translations: {
            es: { name: 'Arabia Saudita', official_name: 'Reino de Arabia Saudita' },
            en: { name: 'Saudi Arabia', official_name: 'Kingdom of Saudi Arabia' }
        }
    },
    {
        iso_alpha2: 'AE',
        iso_alpha3: 'ARE',
        iso_numeric: '784',
        phone_code: '+971',
        translations: {
            es: { name: 'Emiratos Árabes Unidos', official_name: 'Emiratos Árabes Unidos' },
            en: { name: 'United Arab Emirates', official_name: 'United Arab Emirates' }
        }
    },

    // África
    {
        iso_alpha2: 'ZA',
        iso_alpha3: 'ZAF',
        iso_numeric: '710',
        phone_code: '+27',
        translations: {
            es: { name: 'Sudáfrica', official_name: 'República de Sudáfrica' },
            en: { name: 'South Africa', official_name: 'Republic of South Africa' }
        }
    },
    {
        iso_alpha2: 'EG',
        iso_alpha3: 'EGY',
        iso_numeric: '818',
        phone_code: '+20',
        translations: {
            es: { name: 'Egipto', official_name: 'República Árabe de Egipto' },
            en: { name: 'Egypt', official_name: 'Arab Republic of Egypt' }
        }
    },
    {
        iso_alpha2: 'NG',
        iso_alpha3: 'NGA',
        iso_numeric: '566',
        phone_code: '+234',
        translations: {
            es: { name: 'Nigeria', official_name: 'República Federal de Nigeria' },
            en: { name: 'Nigeria', official_name: 'Federal Republic of Nigeria' }
        }
    },
    {
        iso_alpha2: 'KE',
        iso_alpha3: 'KEN',
        iso_numeric: '404',
        phone_code: '+254',
        translations: {
            es: { name: 'Kenia', official_name: 'República de Kenia' },
            en: { name: 'Kenya', official_name: 'Republic of Kenya' }
        }
    },
    {
        iso_alpha2: 'MA',
        iso_alpha3: 'MAR',
        iso_numeric: '504',
        phone_code: '+212',
        translations: {
            es: { name: 'Marruecos', official_name: 'Reino de Marruecos' },
            en: { name: 'Morocco', official_name: 'Kingdom of Morocco' }
        }
    },

    // Oceanía
    {
        iso_alpha2: 'AU',
        iso_alpha3: 'AUS',
        iso_numeric: '036',
        phone_code: '+61',
        translations: {
            es: { name: 'Australia', official_name: 'Mancomunidad de Australia' },
            en: { name: 'Australia', official_name: 'Commonwealth of Australia' }
        }
    },
    {
        iso_alpha2: 'NZ',
        iso_alpha3: 'NZL',
        iso_numeric: '554',
        phone_code: '+64',
        translations: {
            es: { name: 'Nueva Zelanda', official_name: 'Nueva Zelanda' },
            en: { name: 'New Zealand', official_name: 'New Zealand' }
        }
    }
];

/**
 * Función para poblar la base de datos con países y sus traducciones
 * Elimina datos existentes y crea nuevos registros
 */
export const seedCountries = async () => {
    try {
        dbLogger.info('🌍 Iniciando seeder de países...');

        // Verificar si ya existen países
        const existingCount = await Country.count();
        if (existingCount > 0) {
            dbLogger.info(`ℹ️  Ya existen ${existingCount} países. Saltando seeder.`);
            return {
                success: true,
                countriesCreated: 0,
                translationsCreated: 0,
                skipped: true
            };
        }

        // Contador de países creados
        let countriesCreated = 0;
        let translationsCreated = 0;

        // Crear cada país con sus traducciones
        for (const countryData of countriesData) {
            // Crear el país
            const country = await Country.create({
                iso_alpha2: countryData.iso_alpha2,
                iso_alpha3: countryData.iso_alpha3,
                iso_numeric: countryData.iso_numeric,
                phone_code: countryData.phone_code,
                is_active: true
            });
            countriesCreated++;

            // Crear traducciones para cada idioma
            for (const [lang, translation] of Object.entries(countryData.translations)) {
                await CountryTranslation.create({
                    country_id: country.id,
                    lang: lang,
                    name: translation.name,
                    official_name: translation.official_name
                });
                translationsCreated++;
            }
        }

        dbLogger.info(`✅ Seeder completado exitosamente:`);
        dbLogger.info(`   - ${countriesCreated} países creados`);
        dbLogger.info(`   - ${translationsCreated} traducciones creadas`);
        dbLogger.info(`   - Idiomas soportados: español (es), inglés (en)`);

        return {
            success: true,
            countriesCreated,
            translationsCreated
        };
    } catch (error) {
        dbLogger.error(error, '❌ Error en seeder de países');
        throw error;
    }
};
