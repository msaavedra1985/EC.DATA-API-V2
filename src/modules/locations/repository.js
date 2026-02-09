import State from './models/State.js';
import StateTranslation from './models/StateTranslation.js';

/**
 * Repository para Locations
 * Capa de acceso a datos para estados/provincias y sus traducciones
 */

/**
 * Obtener estados activos de un país con traducciones
 * @param {string} countryCode - Código ISO alpha-2 del país (ej: MX, AR)
 * @param {string} lang - Código de idioma (es, en)
 * @returns {Promise<Array>} - Lista de estados con nombre traducido
 */
export const getStatesByCountry = async (countryCode, lang = 'es') => {
    const states = await State.findAll({
        where: {
            country_code: countryCode.toUpperCase(),
            is_active: true
        },
        include: [{
            model: StateTranslation,
            as: 'translations',
            where: { lang },
            required: false,
            attributes: ['name']
        }],
        order: [
            [{ model: StateTranslation, as: 'translations' }, 'name', 'ASC']
        ],
        raw: false
    });

    return states.map(state => {
        const translation = state.translations?.[0];
        return {
            code: state.code,
            state_code: state.state_code,
            country_code: state.country_code,
            name: translation?.name || state.code,
            type: state.type,
            latitude: state.latitude,
            longitude: state.longitude
        };
    }).filter(s => s.name);
};

/**
 * Obtener un estado por su código con traducciones
 * @param {string} code - Código del estado (ej: MX-AGU)
 * @returns {Promise<Object|null>} - Estado encontrado o null
 */
export const getStateByCode = async (code) => {
    if (!code) return null;

    const state = await State.findByPk(code.toUpperCase(), {
        include: [{
            model: StateTranslation,
            as: 'translations',
            attributes: ['lang', 'name']
        }]
    });

    if (!state) return null;

    return {
        code: state.code,
        state_code: state.state_code,
        country_code: state.country_code,
        type: state.type,
        latitude: state.latitude,
        longitude: state.longitude,
        translations: state.translations
    };
};
