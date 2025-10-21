import Country from './models/Country.js';
import CountryTranslation from './models/CountryTranslation.js';

/**
 * Repository para Countries
 * Capa de acceso a datos para países y sus traducciones
 */

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
            id: country.id,
            iso_alpha2: country.iso_alpha2,
            iso_alpha3: country.iso_alpha3,
            phone_code: country.phone_code,
            name: translation?.name || country.iso_alpha2 // Fallback a código ISO si no hay traducción
        };
    }).filter(c => c.name); // Filtrar países sin traducción disponible
};
