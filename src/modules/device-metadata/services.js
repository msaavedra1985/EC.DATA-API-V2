/**
 * Servicio de Device Metadata
 * Maneja lógica de caché y acceso a catálogos de dispositivos
 */

import * as repository from './repository.js';
import { getCache, setCache, deleteCache } from '../../db/redis/client.js';

const CACHE_TTL = 3600; // 1 hora
const CACHE_PREFIX = 'ec:device_metadata:';

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
        ...(json.logoUrl && { logoUrl: json.logoUrl }),
        ...(json.websiteUrl && { websiteUrl: json.websiteUrl }),
        ...(json.serverType && { serverType: json.serverType }),
        ...(json.host && { host: json.host }),
        ...(json.port && { port: json.port }),
        ...(json.useSsl !== undefined && { useSsl: json.useSsl }),
        ...(json.color && { color: json.color }),
        ...(json.months !== undefined && { months: json.months }),
        ...(json.specs && { specs: json.specs }),
        ...(json.brand && { brandId: json.brand.id, brandCode: json.brand.code }),
        isActive: json.isActive,
        displayOrder: json.displayOrder
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
        ...(json.logoUrl && { logoUrl: json.logoUrl }),
        ...(json.websiteUrl && { websiteUrl: json.websiteUrl }),
        ...(json.serverType && { serverType: json.serverType }),
        ...(json.host && { host: json.host }),
        ...(json.port && { port: json.port }),
        ...(json.useSsl !== undefined && { useSsl: json.useSsl }),
        ...(json.color && { color: json.color }),
        ...(json.months !== undefined && { months: json.months }),
        ...(json.specs && { specs: json.specs }),
        ...(json.brand && { brandId: json.brand.id, brandCode: json.brand.code }),
        ...(json.deviceBrandId && { deviceBrandId: json.deviceBrandId }),
        isActive: json.isActive,
        displayOrder: json.displayOrder,
        translations
    };
};

/**
 * Agrupar escalas por baseUnit: { Wh: [...], W: [...] }
 */
const groupUnitScales = (scales) => {
    const grouped = {};
    for (const scale of scales) {
        const json = scale.toJSON ? scale.toJSON() : scale;
        const key = json.baseUnit;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
            id: json.id,
            symbol: json.symbol,
            label: json.label,
            factor: Number(json.factor),
            minValue: Number(json.minValue),
            displayOrder: json.displayOrder,
            isActive: json.isActive
        });
    }
    return grouped;
};

/**
 * Transformar MeasurementType a DTO
 */
const toMeasurementTypeDTO = (model) => {
    const json = model.toJSON();
    const translation = json.translations?.[0] || {};

    return {
        id: json.id,
        code: json.code,
        tablePrefix: json.tablePrefix,
        name: translation.name || json.code || `Type ${json.id}`,
        isActive: json.isActive
    };
};

const toVariableDTO = (model) => {
    const json = model.toJSON();
    const translation = json.translations?.[0] || {};

    return {
        id: json.id,
        code: json.code || null,
        measurementTypeId: json.measurementTypeId,
        columnName: json.columnName,
        name: translation.name || json.columnName,
        description: translation.description || null,
        unit: json.unit || null,
        chartType: json.chartType || null,
        axisName: json.axisName || null,
        axisId: json.axisId || null,
        axisMin: json.axisMin != null ? Number(json.axisMin) : null,
        axisFunction: json.axisFunction || null,
        aggregationType: json.aggregationType || null,
        displayOrder: json.displayOrder,
        showInBilling: json.showInBilling,
        showInAnalysis: json.showInAnalysis,
        isRealtime: json.isRealtime,
        isDefault: json.isDefault,
        isActive: json.isActive
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

    const [types, brands, models, servers, networks, licenses, validityPeriods, measurementTypes, variables, unitScalesRaw] = await Promise.all([
        repository.getDeviceTypes(lang),
        repository.getDeviceBrands(lang),
        repository.getDeviceModels(lang),
        repository.getDeviceServers(lang),
        repository.getDeviceNetworks(lang),
        repository.getDeviceLicenses(lang),
        repository.getDeviceValidityPeriods(lang),
        repository.getMeasurementTypes(lang),
        repository.getVariables(lang),
        repository.getAllUnitScales()
    ]);

    const unitScales = groupUnitScales(unitScalesRaw);

    const metadata = {
        deviceTypes: types.map(toDTO),
        brands: brands.map(toDTO),
        models: models.map(toDTO),
        servers: servers.map(toDTO),
        networks: networks.map(toDTO),
        licenses: licenses.map(toDTO),
        validityPeriods: validityPeriods.map(toDTO),
        measurementTypes: measurementTypes.map(toMeasurementTypeDTO),
        variables: variables.map(toVariableDTO),
        unitScales
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
    if (hard) {
        const usage = await repository.getCatalogUsage('deviceTypes', id, 5);
        if (usage.totalCount > 0) {
            const error = new Error(`No se puede eliminar: ${usage.totalCount} dependencia(s) activa(s)`);
            error.code = 'DEPENDENCY_CONFLICT';
            error.usage = usage;
            throw error;
        }
    }
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
    if (hard) {
        const usage = await repository.getCatalogUsage('deviceBrands', id, 5);
        if (usage.totalCount > 0) {
            const error = new Error(`No se puede eliminar: ${usage.totalCount} dependencia(s) activa(s)`);
            error.code = 'DEPENDENCY_CONFLICT';
            error.usage = usage;
            throw error;
        }
    }
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
    if (hard) {
        const usage = await repository.getCatalogUsage('deviceModels', id, 5);
        if (usage.totalCount > 0) {
            const error = new Error(`No se puede eliminar: ${usage.totalCount} dependencia(s) activa(s)`);
            error.code = 'DEPENDENCY_CONFLICT';
            error.usage = usage;
            throw error;
        }
    }
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
    if (hard) {
        const usage = await repository.getCatalogUsage('deviceServers', id, 5);
        if (usage.totalCount > 0) {
            const error = new Error(`No se puede eliminar: ${usage.totalCount} dependencia(s) activa(s)`);
            error.code = 'DEPENDENCY_CONFLICT';
            error.usage = usage;
            throw error;
        }
    }
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
    if (hard) {
        const usage = await repository.getCatalogUsage('deviceNetworks', id, 5);
        if (usage.totalCount > 0) {
            const error = new Error(`No se puede eliminar: ${usage.totalCount} dependencia(s) activa(s)`);
            error.code = 'DEPENDENCY_CONFLICT';
            error.usage = usage;
            throw error;
        }
    }
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
    if (hard) {
        const usage = await repository.getCatalogUsage('deviceLicenses', id, 5);
        if (usage.totalCount > 0) {
            const error = new Error(`No se puede eliminar: ${usage.totalCount} dependencia(s) activa(s)`);
            error.code = 'DEPENDENCY_CONFLICT';
            error.usage = usage;
            throw error;
        }
    }
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
    if (hard) {
        const usage = await repository.getCatalogUsage('deviceValidityPeriods', id, 5);
        if (usage.totalCount > 0) {
            const error = new Error(`No se puede eliminar: ${usage.totalCount} dependencia(s) activa(s)`);
            error.code = 'DEPENDENCY_CONFLICT';
            error.usage = usage;
            throw error;
        }
    }
    const result = await repository.deleteDeviceValidityPeriod(id, hard);
    if (!result) return null;
    await invalidateCache();
    return true;
};

// ============================================
// CATALOG USAGE (auditoría de dependencias)
// ============================================

export const getCatalogUsage = async (catalogKey, catalogId, limit = 50) => {
    return repository.getCatalogUsage(catalogKey, catalogId, limit);
};

// ============================================
// UNIT SCALES CRUD
// ============================================

export const listUnitScales = async (includeInactive = false) => {
    const scales = await repository.getAllUnitScales(includeInactive);
    return scales.map(s => {
        const json = s.toJSON();
        return {
            id: json.id,
            baseUnit: json.baseUnit,
            symbol: json.symbol,
            label: json.label,
            factor: Number(json.factor),
            minValue: Number(json.minValue),
            displayOrder: json.displayOrder,
            isActive: json.isActive
        };
    });
};

export const listUnitScalesByBaseUnit = async (baseUnit) => {
    const scales = await repository.getUnitScalesByBaseUnit(baseUnit);
    return scales.map(s => {
        const json = s.toJSON();
        return {
            id: json.id,
            baseUnit: json.baseUnit,
            symbol: json.symbol,
            label: json.label,
            factor: Number(json.factor),
            minValue: Number(json.minValue),
            displayOrder: json.displayOrder,
            isActive: json.isActive
        };
    });
};

export const getUnitScaleGrouped = async () => {
    const scales = await repository.getAllUnitScales();
    return groupUnitScales(scales);
};

export const getUnitScaleById = async (id) => {
    const scale = await repository.findUnitScaleById(id);
    if (!scale) return null;
    const json = scale.toJSON();
    return {
        id: json.id,
        baseUnit: json.baseUnit,
        symbol: json.symbol,
        label: json.label,
        factor: Number(json.factor),
        minValue: Number(json.minValue),
        displayOrder: json.displayOrder,
        isActive: json.isActive
    };
};

export const createUnitScale = async (data) => {
    const scale = await repository.createUnitScale(data);
    await invalidateCache();
    return getUnitScaleById(scale.id);
};

export const updateUnitScale = async (id, data) => {
    const scale = await repository.updateUnitScale(id, data);
    if (!scale) return null;
    await invalidateCache();
    return getUnitScaleById(id);
};

export const deleteUnitScale = async (id, hard = false) => {
    const result = await repository.deleteUnitScale(id, hard);
    if (!result) return null;
    await invalidateCache();
    return true;
};
