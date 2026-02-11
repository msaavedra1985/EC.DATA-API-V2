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
        ...(json.brand && { brand_id: json.brand.id, brand_code: json.brand.code }),
        is_active: json.is_active,
        display_order: json.display_order
    };
};

/**
 * Transformar modelo con todas las traducciones a DTO
 */
const toDTOWithTranslations = (model) => {
    const json = model.toJSON();
    
    const translations = {};
    if (json.translations) {
        for (const tr of json.translations) {
            translations[tr.lang] = {
                name: tr.name,
                description: tr.description || null
            };
        }
    }
    
    return {
        id: json.id,
        code: json.code,
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
        ...(json.brand && { brand_id: json.brand.id, brand_code: json.brand.code }),
        ...(json.device_brand_id && { device_brand_id: json.device_brand_id }),
        is_active: json.is_active,
        display_order: json.display_order,
        translations
    };
};

/**
 * Transformar MeasurementType a DTO
 */
const toMeasurementTypeDTO = (model) => {
    const json = model.toJSON();
    const translation = json.translations?.[0] || {};

    return {
        id: json.id,
        table_prefix: json.table_prefix,
        name: translation.name || `Type ${json.id}`,
        is_active: json.is_active
    };
};

/**
 * Obtener todo el metadata de dispositivos (con caché)
 */
export const getAllMetadata = async (lang = 'es') => {
    const cacheKey = `${CACHE_PREFIX}all:${lang}`;

    const cached = await getCache(cacheKey);
    if (cached) {
        return cached;
    }

    const [types, brands, models, servers, networks, licenses, validityPeriods, measurementTypes] = await Promise.all([
        repository.getDeviceTypes(lang),
        repository.getDeviceBrands(lang),
        repository.getDeviceModels(lang),
        repository.getDeviceServers(lang),
        repository.getDeviceNetworks(lang),
        repository.getDeviceLicenses(lang),
        repository.getDeviceValidityPeriods(lang),
        repository.getMeasurementTypes(lang)
    ]);

    const metadata = {
        device_types: types.map(toDTO),
        brands: brands.map(toDTO),
        models: models.map(toDTO),
        servers: servers.map(toDTO),
        networks: networks.map(toDTO),
        licenses: licenses.map(toDTO),
        validity_periods: validityPeriods.map(toDTO),
        measurement_types: measurementTypes.map(toMeasurementTypeDTO)
    };

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

// ============================================
// DEVICE TYPES CRUD
// ============================================

export const listDeviceTypes = async (lang = 'es', includeInactive = false) => {
    const types = await repository.getDeviceTypes(lang, includeInactive);
    return types.map(toDTO);
};

export const getDeviceTypeById = async (id) => {
    const type = await repository.findDeviceTypeById(id);
    if (!type) return null;
    return toDTOWithTranslations(type);
};

export const createDeviceType = async (data, translations) => {
    const type = await repository.createDeviceType(data, translations);
    await invalidateCache();
    return toDTOWithTranslations(type);
};

export const updateDeviceType = async (id, data, translations) => {
    const type = await repository.updateDeviceType(id, data, translations);
    if (!type) return null;
    await invalidateCache();
    return toDTOWithTranslations(type);
};

export const deleteDeviceType = async (id, hard = false) => {
    const result = await repository.deleteDeviceType(id, hard);
    if (!result) return null;
    await invalidateCache();
    return true;
};

// ============================================
// DEVICE BRANDS CRUD
// ============================================

export const listDeviceBrands = async (lang = 'es', includeInactive = false) => {
    const brands = await repository.getDeviceBrands(lang, includeInactive);
    return brands.map(toDTO);
};

export const getDeviceBrandById = async (id) => {
    const brand = await repository.findDeviceBrandById(id);
    if (!brand) return null;
    return toDTOWithTranslations(brand);
};

export const createDeviceBrand = async (data, translations) => {
    const brand = await repository.createDeviceBrand(data, translations);
    await invalidateCache();
    return toDTOWithTranslations(brand);
};

export const updateDeviceBrand = async (id, data, translations) => {
    const brand = await repository.updateDeviceBrand(id, data, translations);
    if (!brand) return null;
    await invalidateCache();
    return toDTOWithTranslations(brand);
};

export const deleteDeviceBrand = async (id, hard = false) => {
    const result = await repository.deleteDeviceBrand(id, hard);
    if (!result) return null;
    await invalidateCache();
    return true;
};

// ============================================
// DEVICE MODELS CRUD
// ============================================

export const listDeviceModels = async (lang = 'es', includeInactive = false, brandId = null) => {
    const models = await repository.getDeviceModels(lang, includeInactive, brandId);
    return models.map(toDTO);
};

export const getDeviceModelById = async (id) => {
    const model = await repository.findDeviceModelById(id);
    if (!model) return null;
    return toDTOWithTranslations(model);
};

export const createDeviceModel = async (data, translations) => {
    const model = await repository.createDeviceModel(data, translations);
    await invalidateCache();
    return toDTOWithTranslations(model);
};

export const updateDeviceModel = async (id, data, translations) => {
    const model = await repository.updateDeviceModel(id, data, translations);
    if (!model) return null;
    await invalidateCache();
    return toDTOWithTranslations(model);
};

export const deleteDeviceModel = async (id, hard = false) => {
    const result = await repository.deleteDeviceModel(id, hard);
    if (!result) return null;
    await invalidateCache();
    return true;
};

// ============================================
// DEVICE SERVERS CRUD
// ============================================

export const listDeviceServers = async (lang = 'es', includeInactive = false) => {
    const servers = await repository.getDeviceServers(lang, includeInactive);
    return servers.map(toDTO);
};

export const getDeviceServerById = async (id) => {
    const server = await repository.findDeviceServerById(id);
    if (!server) return null;
    return toDTOWithTranslations(server);
};

export const createDeviceServer = async (data, translations) => {
    const server = await repository.createDeviceServer(data, translations);
    await invalidateCache();
    return toDTOWithTranslations(server);
};

export const updateDeviceServer = async (id, data, translations) => {
    const server = await repository.updateDeviceServer(id, data, translations);
    if (!server) return null;
    await invalidateCache();
    return toDTOWithTranslations(server);
};

export const deleteDeviceServer = async (id, hard = false) => {
    const result = await repository.deleteDeviceServer(id, hard);
    if (!result) return null;
    await invalidateCache();
    return true;
};

// ============================================
// DEVICE NETWORKS CRUD
// ============================================

export const listDeviceNetworks = async (lang = 'es', includeInactive = false) => {
    const networks = await repository.getDeviceNetworks(lang, includeInactive);
    return networks.map(toDTO);
};

export const getDeviceNetworkById = async (id) => {
    const network = await repository.findDeviceNetworkById(id);
    if (!network) return null;
    return toDTOWithTranslations(network);
};

export const createDeviceNetwork = async (data, translations) => {
    const network = await repository.createDeviceNetwork(data, translations);
    await invalidateCache();
    return toDTOWithTranslations(network);
};

export const updateDeviceNetwork = async (id, data, translations) => {
    const network = await repository.updateDeviceNetwork(id, data, translations);
    if (!network) return null;
    await invalidateCache();
    return toDTOWithTranslations(network);
};

export const deleteDeviceNetwork = async (id, hard = false) => {
    const result = await repository.deleteDeviceNetwork(id, hard);
    if (!result) return null;
    await invalidateCache();
    return true;
};

// ============================================
// DEVICE LICENSES CRUD
// ============================================

export const listDeviceLicenses = async (lang = 'es', includeInactive = false) => {
    const licenses = await repository.getDeviceLicenses(lang, includeInactive);
    return licenses.map(toDTO);
};

export const getDeviceLicenseById = async (id) => {
    const license = await repository.findDeviceLicenseById(id);
    if (!license) return null;
    return toDTOWithTranslations(license);
};

export const createDeviceLicense = async (data, translations) => {
    const license = await repository.createDeviceLicense(data, translations);
    await invalidateCache();
    return toDTOWithTranslations(license);
};

export const updateDeviceLicense = async (id, data, translations) => {
    const license = await repository.updateDeviceLicense(id, data, translations);
    if (!license) return null;
    await invalidateCache();
    return toDTOWithTranslations(license);
};

export const deleteDeviceLicense = async (id, hard = false) => {
    const result = await repository.deleteDeviceLicense(id, hard);
    if (!result) return null;
    await invalidateCache();
    return true;
};

// ============================================
// DEVICE VALIDITY PERIODS CRUD
// ============================================

export const listDeviceValidityPeriods = async (lang = 'es', includeInactive = false) => {
    const periods = await repository.getDeviceValidityPeriods(lang, includeInactive);
    return periods.map(toDTO);
};

export const getDeviceValidityPeriodById = async (id) => {
    const period = await repository.findDeviceValidityPeriodById(id);
    if (!period) return null;
    return toDTOWithTranslations(period);
};

export const createDeviceValidityPeriod = async (data, translations) => {
    const period = await repository.createDeviceValidityPeriod(data, translations);
    await invalidateCache();
    return toDTOWithTranslations(period);
};

export const updateDeviceValidityPeriod = async (id, data, translations) => {
    const period = await repository.updateDeviceValidityPeriod(id, data, translations);
    if (!period) return null;
    await invalidateCache();
    return toDTOWithTranslations(period);
};

export const deleteDeviceValidityPeriod = async (id, hard = false) => {
    const result = await repository.deleteDeviceValidityPeriod(id, hard);
    if (!result) return null;
    await invalidateCache();
    return true;
};
