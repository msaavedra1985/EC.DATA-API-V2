import Country from './models/Country.js';
import CountryTranslation from './models/CountryTranslation.js';

/**
 * Repository para Countries
 * Capa de acceso a datos para países y sus traducciones
 */

/**
 * Buscar país por código ISO alpha-2
 * @param {string} code - Código ISO 3166-1 alpha-2 (ej: AR, US)
 * @returns {Promise<Country|null>} - País encontrado o null
 */
export const findCountryByCode = async (code) => {
    if (!code) return null;
    return await Country.findOne({
        where: { iso_alpha2: code.toUpperCase() }
    });
};

/**
 * Buscar país por ID numérico (legacy)
 * @deprecated Usar findCountryByCode en su lugar
 * @param {number|string} id - ID numérico o código ISO alpha-2
 * @returns {Promise<Country|null>} - País encontrado o null
 */
export const findCountryById = async (id) => {
    // Si es string de 2 caracteres, buscar por código ISO
    if (typeof id === 'string' && id.length === 2) {
        return await findCountryByCode(id);
    }
    // Si es número, buscar por PK
    return await Country.findByPk(id);
};

/**
 * Obtener todos los países activos con traducciones en un idioma específico
 * 
 * @param {string} lang - Código de idioma (es, en, etc.)
 * @returns {Promise<Array>} - Lista de países con nombre traducido
 */
export const getAllCountries = async (lang = 'es') => {
    const countries = await Country.findAll({
        where: {
            is_active: true
        },
        include: [{
            model: CountryTranslation,
            as: 'translations',
            where: {
                lang: lang
            },
            required: false,
            attributes: ['name', 'official_name']
        }],
        order: [
            [{ model: CountryTranslation, as: 'translations' }, 'name', 'ASC']
        ],
        raw: false
    });

    // Mapear a formato simple con nombre traducido
    return countries.map(country => {
        const translation = country.translations?.[0];
        
        return {
            code: country.iso_alpha2,
            iso_alpha2: country.iso_alpha2,
            iso_alpha3: country.iso_alpha3,
            phone_code: country.phone_code,
            name: translation?.name || country.iso_alpha2 // Fallback a código ISO si no hay traducción
        };
    }).filter(c => c.name); // Filtrar países sin traducción disponible
};
