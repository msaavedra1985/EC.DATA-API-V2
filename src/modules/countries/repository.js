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
        where: { isoAlpha2: code.toUpperCase() }
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
            isActive: true
        },
        include: [{
            model: CountryTranslation,
            as: 'translations',
            where: {
                lang: lang
            },
            required: false,
            attributes: ['name', 'officialName']
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
            code: country.isoAlpha2,
            isoAlpha2: country.isoAlpha2,
            isoAlpha3: country.isoAlpha3,
            phoneCode: country.phoneCode,
            name: translation?.name || country.isoAlpha2 // Fallback a código ISO si no hay traducción
        };
    }).filter(c => c.name); // Filtrar países sin traducción disponible
};
