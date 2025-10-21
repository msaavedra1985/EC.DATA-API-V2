import * as countryRepository from './repository.js';
import { getCache, setCache, deleteCache } from '../../db/redis/client.js';

/**
 * Servicio de Countries
 * Maneja lógica de caché y acceso a países con traducciones
 */

const COUNTRIES_CACHE_TTL = 3600; // 1 hora (países no cambian frecuentemente)
const COUNTRIES_CACHE_PREFIX = 'ec:countries:';

/**
 * Obtener todos los países activos en un idioma específico (con caché)
 * 
 * @param {string} lang - Código de idioma (es, en, etc.)
 * @returns {Promise<Array>} - Lista de países con nombre traducido
 */
export const getCountriesWithCache = async (lang = 'es') => {
    const cacheKey = `${COUNTRIES_CACHE_PREFIX}${lang}`;

    // Intentar obtener del caché
    const cached = await getCache(cacheKey);
    if (cached) {
        return cached; // getCache ya retorna objeto parseado
    }

    // Si no está en caché, obtener de la base de datos
    const countries = await countryRepository.getAllCountries(lang);

    // Guardar en caché
    await setCache(cacheKey, countries, COUNTRIES_CACHE_TTL);

    return countries;
};

/**
 * Invalidar caché de países para un idioma específico o todos
 * 
 * @param {string|null} lang - Código de idioma a invalidar (null = todos)
 */
export const invalidateCountriesCache = async (lang = null) => {
    if (lang) {
        const cacheKey = `${COUNTRIES_CACHE_PREFIX}${lang}`;
        await deleteCache(cacheKey);
    } else {
        // Invalidar todos los idiomas (es, en)
        await Promise.all([
            deleteCache(`${COUNTRIES_CACHE_PREFIX}es`),
            deleteCache(`${COUNTRIES_CACHE_PREFIX}en`)
        ]);
    }
};
