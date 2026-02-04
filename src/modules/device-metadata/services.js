/**
 * Servicio de Device Metadata
 * Maneja lógica de caché y acceso a catálogos de dispositivos
 */

import * as repository from './repository.js';
import { getCache, setCache, deleteCache } from '../../db/redis/client.js';

const CACHE_TTL = 3600; // 1 hora
const CACHE_PREFIX = 'device_metadata:';

/**
 * Transformar modelo a DTO plano
 */
const toDTO = (model) => {
    const json = model.toJSON();
    const translation = json.translations?.[0] || {};
    
    return {
        id: json.id,
        code: json.code,
        name: translation.name || json.code,
        description: translation.description || null,
        ...(json.icon && { icon: json.icon }),
        ...(json.logo_url && { logo_url: json.logo_url }),
        ...(json.website_url && { website_url: json.website_url }),
        ...(json.server_type && { server_type: json.server_type }),
        ...(json.host && { host: json.host }),
        ...(json.port && { port: json.port }),
        ...(json.use_ssl !== undefined && { use_ssl: json.use_ssl }),
        ...(json.color && { color: json.color }),
        ...(json.months !== undefined && { months: json.months }),
        ...(json.specs && { specs: json.specs }),
        ...(json.brand && { brand_id: json.brand.id, brand_code: json.brand.code })
    };
};

/**
 * Obtener todo el metadata de dispositivos (con caché)
 * 
 * @param {string} lang - Código de idioma (es, en)
 * @returns {Promise<Object>} - Catálogos completos
 */
export const getAllMetadata = async (lang = 'es') => {
    const cacheKey = `${CACHE_PREFIX}all:${lang}`;

    // Intentar obtener del caché
    const cached = await getCache(cacheKey);
    if (cached) {
        return cached;
    }

    // Obtener todos los catálogos en paralelo
    const [types, brands, models, servers, networks, licenses, validityPeriods] = await Promise.all([
        repository.getDeviceTypes(lang),
        repository.getDeviceBrands(lang),
        repository.getDeviceModels(lang),
        repository.getDeviceServers(lang),
        repository.getDeviceNetworks(lang),
        repository.getDeviceLicenses(lang),
        repository.getDeviceValidityPeriods(lang)
    ]);

    const metadata = {
        device_types: types.map(toDTO),
        brands: brands.map(toDTO),
        models: models.map(toDTO),
        servers: servers.map(toDTO),
        networks: networks.map(toDTO),
        licenses: licenses.map(toDTO),
        validity_periods: validityPeriods.map(toDTO)
    };

    // Guardar en caché
    await setCache(cacheKey, metadata, CACHE_TTL);

    return metadata;
};

/**
 * Invalidar caché de metadata
 */
export const invalidateCache = async (lang = null) => {
    if (lang) {
        await deleteCache(`${CACHE_PREFIX}all:${lang}`);
    } else {
        await Promise.all([
            deleteCache(`${CACHE_PREFIX}all:es`),
            deleteCache(`${CACHE_PREFIX}all:en`)
        ]);
    }
};
