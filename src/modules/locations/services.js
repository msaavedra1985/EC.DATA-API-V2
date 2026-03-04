import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as locationRepository from './repository.js';
import { getCache, setCache, deleteCache } from '../../db/redis/client.js';
import logger from '../../utils/logger.js';

const locationsLogger = logger.child({ component: 'locations' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_TTL = 3600;
const STATES_CACHE_PREFIX = 'states:';
const CITIES_CACHE_PREFIX = 'cities:';

/**
 * Obtener estados de un país con caché
 * @param {string} countryCode - Código ISO alpha-2 del país
 * @param {string} lang - Código de idioma
 * @returns {Promise<Array>}
 */
export const getStatesWithCache = async (countryCode, lang = 'es') => {
    const cacheKey = `${STATES_CACHE_PREFIX}${countryCode}:${lang}`;

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const states = await locationRepository.getStatesByCountry(countryCode, lang);

    await setCache(cacheKey, states, CACHE_TTL);

    return states;
};

/**
 * Obtener ciudades de un estado desde archivos JSON locales
 * @param {string} stateCode - Código completo del estado (ej: MX-AGU)
 * @param {string} lang - Código de idioma
 * @returns {Promise<Array>}
 */
export const getCitiesByState = async (stateCode, lang = 'es') => {
    const cacheKey = `${CITIES_CACHE_PREFIX}${stateCode}:${lang}`;

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const parts = stateCode.split('-');
    if (parts.length < 2) return [];

    const countryCode = parts[0].toUpperCase();
    const localStateCode = parts.slice(1).join('-');

    const filePath = path.resolve(__dirname, '../../../data/geo/cities', `${countryCode}.json`);

    let cities = [];
    try {
        const fileContent = await readFile(filePath, 'utf-8');
        const allCities = JSON.parse(fileContent);

        cities = allCities
            .filter(city => city.state_code === localStateCode)
            .map(city => ({
                name: city.translations?.[lang] || city.translations?.es || city.name,
                stateCode: stateCode,
                latitude: city.latitude,
                longitude: city.longitude,
                population: city.population,
                timezone: city.timezone
            }));
    } catch (error) {
        locationsLogger.warn({ stateCode, filePath, error: error.message }, 'No se pudo leer archivo de ciudades');
        return [];
    }

    await setCache(cacheKey, cities, CACHE_TTL);

    return cities;
};

/**
 * Invalidar caché de estados para un país
 * @param {string} countryCode - Código del país (null = todos)
 */
export const invalidateStatesCache = async (countryCode = null) => {
    if (countryCode) {
        await Promise.all([
            deleteCache(`${STATES_CACHE_PREFIX}${countryCode}:es`),
            deleteCache(`${STATES_CACHE_PREFIX}${countryCode}:en`)
        ]);
    } else {
        await Promise.all([
            deleteCache(`${STATES_CACHE_PREFIX}es`),
            deleteCache(`${STATES_CACHE_PREFIX}en`)
        ]);
    }
};

/**
 * Invalidar caché de ciudades para un estado
 * @param {string} stateCode - Código del estado (null = todos)
 */
export const invalidateCitiesCache = async (stateCode = null) => {
    if (stateCode) {
        await Promise.all([
            deleteCache(`${CITIES_CACHE_PREFIX}${stateCode}:es`),
            deleteCache(`${CITIES_CACHE_PREFIX}${stateCode}:en`)
        ]);
    } else {
        await Promise.all([
            deleteCache(`${CITIES_CACHE_PREFIX}es`),
            deleteCache(`${CITIES_CACHE_PREFIX}en`)
        ]);
    }
};
