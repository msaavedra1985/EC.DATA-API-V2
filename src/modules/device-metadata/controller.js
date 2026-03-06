/**
 * Controller de Device Metadata
 * Maneja endpoints de catálogos de dispositivos
 */

import * as services from './services.js';
import logger from '../../utils/logger.js';

const metadataLogger = logger.child({ component: 'device-metadata' });

/**
 * Helper para extraer idioma del request
 */
const getLang = (req) => {
    return req.query.lang || req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'es';
};

/**
 * Helper para extraer traducciones del body
 */
const extractTranslations = (body) => {
    if (!body.translations) return [];
    return Object.entries(body.translations).map(([lang, data]) => ({
        lang,
        name: data.name,
        description: data.description || null
    }));
};

/**
 * Helper para parsear y validar ID
 */
const parseId = (idString) => {
    const id = parseInt(idString, 10);
    return isNaN(id) ? null : id;
};

// ============================================
// CATALOG USAGE (auditoría de dependencias)
// ============================================

// Handler genérico — retorna un middleware para el catálogo indicado
const makeCatalogUsageHandler = (catalogKey) => async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
        const { code, totalCount, dependencies } = await services.getCatalogUsage(catalogKey, id, limit);
        if (code === null) {
            return res.status(404).json({ success: false, error: 'Registro no encontrado' });
        }
        return res.json({ success: true, data: { id, code, totalCount, dependencies } });
    } catch (error) {
        metadataLogger.error(`Error obteniendo usage de ${catalogKey}`, { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const getDeviceTypeUsage = makeCatalogUsageHandler('deviceTypes');
export const getDeviceBrandUsage = makeCatalogUsageHandler('deviceBrands');
export const getDeviceModelUsage = makeCatalogUsageHandler('deviceModels');
export const getDeviceServerUsage = makeCatalogUsageHandler('deviceServers');
export const getDeviceNetworkUsage = makeCatalogUsageHandler('deviceNetworks');
export const getDeviceLicenseUsage = makeCatalogUsageHandler('deviceLicenses');
export const getDeviceValidityPeriodUsage = makeCatalogUsageHandler('deviceValidityPeriods');

// Helper para manejar errores de dependencias en deletes
const handleDeleteError = (res, error, entityLabel) => {
    if (error.code === 'DEPENDENCY_CONFLICT') {
        return res.status(409).json({
            success: false,
            error: error.message,
            dependencies: error.usage.dependencies,
            totalCount: error.usage.totalCount
        });
    }
    metadataLogger.error(`Error eliminando ${entityLabel}`, { error: error.message });
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
};

// ============================================
// GET ALL METADATA
// ============================================

export const getAllMetadata = async (req, res) => {
    try {
        const lang = getLang(req);
        const metadata = await services.getAllMetadata(lang);
        return res.json({ success: true, data: metadata });
    } catch (error) {
        metadataLogger.error('Error obteniendo device metadata', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const invalidateCache = async (req, res) => {
    try {
        const { lang } = req.body;
        await services.invalidateCache(lang || null);
        return res.json({ success: true, message: 'Caché invalidado correctamente' });
    } catch (error) {
        metadataLogger.error('Error invalidando cache', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

// ============================================
// DEVICE TYPES CRUD
// ============================================

export const listDeviceTypes = async (req, res) => {
    try {
        const lang = getLang(req);
        const includeInactive = req.query.include_inactive === 'true';
        const data = await services.listDeviceTypes(lang, includeInactive);
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error listando device types', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const getDeviceType = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const data = await services.getDeviceTypeById(id);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Tipo de dispositivo no encontrado' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error obteniendo device type', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const createDeviceType = async (req, res) => {
    try {
        const { code, icon, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const data = await services.createDeviceType(
            { code, icon, display_order: display_order || 0, is_active: is_active !== false },
            translations
        );
        return res.status(201).json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error creando device type', { error: error.message });
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Ya existe un tipo con ese código' });
        }
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const updateDeviceType = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const { code, icon, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const updateData = {};
        if (code !== undefined) updateData.code = code;
        if (icon !== undefined) updateData.icon = icon;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (is_active !== undefined) updateData.is_active = is_active;
        
        const data = await services.updateDeviceType(id, updateData, translations);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Tipo de dispositivo no encontrado' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error actualizando device type', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const deleteDeviceType = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const hard = req.query.hard === 'true';
        const result = await services.deleteDeviceType(id, hard);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Tipo de dispositivo no encontrado' });
        }
        return res.json({ success: true, message: 'Tipo de dispositivo eliminado' });
    } catch (error) {
        return handleDeleteError(res, error, 'device type');
    }
};

// ============================================
// DEVICE BRANDS CRUD
// ============================================

export const listDeviceBrands = async (req, res) => {
    try {
        const lang = getLang(req);
        const includeInactive = req.query.include_inactive === 'true';
        const data = await services.listDeviceBrands(lang, includeInactive);
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error listando device brands', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const getDeviceBrand = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const data = await services.getDeviceBrandById(id);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Marca no encontrada' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error obteniendo device brand', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const createDeviceBrand = async (req, res) => {
    try {
        const { code, logo_url, website_url, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const data = await services.createDeviceBrand(
            { code, logo_url, website_url, display_order: display_order || 0, is_active: is_active !== false },
            translations
        );
        return res.status(201).json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error creando device brand', { error: error.message });
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Ya existe una marca con ese código' });
        }
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const updateDeviceBrand = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const { code, logo_url, website_url, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const updateData = {};
        if (code !== undefined) updateData.code = code;
        if (logo_url !== undefined) updateData.logo_url = logo_url;
        if (website_url !== undefined) updateData.website_url = website_url;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (is_active !== undefined) updateData.is_active = is_active;
        
        const data = await services.updateDeviceBrand(id, updateData, translations);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Marca no encontrada' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error actualizando device brand', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const deleteDeviceBrand = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const hard = req.query.hard === 'true';
        const result = await services.deleteDeviceBrand(id, hard);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Marca no encontrada' });
        }
        return res.json({ success: true, message: 'Marca eliminada' });
    } catch (error) {
        return handleDeleteError(res, error, 'device brand');
    }
};

// ============================================
// DEVICE MODELS CRUD
// ============================================

export const listDeviceModels = async (req, res) => {
    try {
        const lang = getLang(req);
        const includeInactive = req.query.include_inactive === 'true';
        const brandId = req.query.brand_id ? parseInt(req.query.brand_id) : null;
        const data = await services.listDeviceModels(lang, includeInactive, brandId);
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error listando device models', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const getDeviceModel = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const data = await services.getDeviceModelById(id);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Modelo no encontrado' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error obteniendo device model', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const createDeviceModel = async (req, res) => {
    try {
        const { code, device_brand_id, specs, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        if (!device_brand_id) {
            return res.status(400).json({ success: false, error: 'device_brand_id es requerido' });
        }
        
        const data = await services.createDeviceModel(
            { code, device_brand_id, specs, display_order: display_order || 0, is_active: is_active !== false },
            translations
        );
        return res.status(201).json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error creando device model', { error: error.message });
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Ya existe un modelo con ese código para esta marca' });
        }
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const updateDeviceModel = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const { code, device_brand_id, specs, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const updateData = {};
        if (code !== undefined) updateData.code = code;
        if (device_brand_id !== undefined) updateData.device_brand_id = device_brand_id;
        if (specs !== undefined) updateData.specs = specs;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (is_active !== undefined) updateData.is_active = is_active;
        
        const data = await services.updateDeviceModel(id, updateData, translations);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Modelo no encontrado' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error actualizando device model', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const deleteDeviceModel = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const hard = req.query.hard === 'true';
        const result = await services.deleteDeviceModel(id, hard);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Modelo no encontrado' });
        }
        return res.json({ success: true, message: 'Modelo eliminado' });
    } catch (error) {
        return handleDeleteError(res, error, 'device model');
    }
};

// ============================================
// DEVICE SERVERS CRUD
// ============================================

export const listDeviceServers = async (req, res) => {
    try {
        const lang = getLang(req);
        const includeInactive = req.query.include_inactive === 'true';
        const data = await services.listDeviceServers(lang, includeInactive);
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error listando device servers', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const getDeviceServer = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const data = await services.getDeviceServerById(id);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Servidor no encontrado' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error obteniendo device server', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const createDeviceServer = async (req, res) => {
    try {
        const { code, server_type, host, port, use_ssl, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const data = await services.createDeviceServer(
            { code, server_type: server_type || 'mqtt', host, port, use_ssl: use_ssl || false, display_order: display_order || 0, is_active: is_active !== false },
            translations
        );
        return res.status(201).json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error creando device server', { error: error.message });
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Ya existe un servidor con ese código' });
        }
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const updateDeviceServer = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const { code, server_type, host, port, use_ssl, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const updateData = {};
        if (code !== undefined) updateData.code = code;
        if (server_type !== undefined) updateData.server_type = server_type;
        if (host !== undefined) updateData.host = host;
        if (port !== undefined) updateData.port = port;
        if (use_ssl !== undefined) updateData.use_ssl = use_ssl;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (is_active !== undefined) updateData.is_active = is_active;
        
        const data = await services.updateDeviceServer(id, updateData, translations);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Servidor no encontrado' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error actualizando device server', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const deleteDeviceServer = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const hard = req.query.hard === 'true';
        const result = await services.deleteDeviceServer(id, hard);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Servidor no encontrado' });
        }
        return res.json({ success: true, message: 'Servidor eliminado' });
    } catch (error) {
        return handleDeleteError(res, error, 'device server');
    }
};

// ============================================
// DEVICE NETWORKS CRUD
// ============================================

export const listDeviceNetworks = async (req, res) => {
    try {
        const lang = getLang(req);
        const includeInactive = req.query.include_inactive === 'true';
        const data = await services.listDeviceNetworks(lang, includeInactive);
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error listando device networks', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const getDeviceNetwork = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const data = await services.getDeviceNetworkById(id);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Red no encontrada' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error obteniendo device network', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const createDeviceNetwork = async (req, res) => {
    try {
        const { code, icon, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const data = await services.createDeviceNetwork(
            { code, icon, display_order: display_order || 0, is_active: is_active !== false },
            translations
        );
        return res.status(201).json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error creando device network', { error: error.message });
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Ya existe una red con ese código' });
        }
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const updateDeviceNetwork = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const { code, icon, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const updateData = {};
        if (code !== undefined) updateData.code = code;
        if (icon !== undefined) updateData.icon = icon;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (is_active !== undefined) updateData.is_active = is_active;
        
        const data = await services.updateDeviceNetwork(id, updateData, translations);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Red no encontrada' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error actualizando device network', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const deleteDeviceNetwork = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const hard = req.query.hard === 'true';
        const result = await services.deleteDeviceNetwork(id, hard);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Red no encontrada' });
        }
        return res.json({ success: true, message: 'Red eliminada' });
    } catch (error) {
        return handleDeleteError(res, error, 'device network');
    }
};

// ============================================
// DEVICE LICENSES CRUD
// ============================================

export const listDeviceLicenses = async (req, res) => {
    try {
        const lang = getLang(req);
        const includeInactive = req.query.include_inactive === 'true';
        const data = await services.listDeviceLicenses(lang, includeInactive);
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error listando device licenses', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const getDeviceLicense = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const data = await services.getDeviceLicenseById(id);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Licencia no encontrada' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error obteniendo device license', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const createDeviceLicense = async (req, res) => {
    try {
        const { code, icon, color, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const data = await services.createDeviceLicense(
            { code, icon, color, display_order: display_order || 0, is_active: is_active !== false },
            translations
        );
        return res.status(201).json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error creando device license', { error: error.message });
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Ya existe una licencia con ese código' });
        }
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const updateDeviceLicense = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const { code, icon, color, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const updateData = {};
        if (code !== undefined) updateData.code = code;
        if (icon !== undefined) updateData.icon = icon;
        if (color !== undefined) updateData.color = color;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (is_active !== undefined) updateData.is_active = is_active;
        
        const data = await services.updateDeviceLicense(id, updateData, translations);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Licencia no encontrada' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error actualizando device license', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const deleteDeviceLicense = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const hard = req.query.hard === 'true';
        const result = await services.deleteDeviceLicense(id, hard);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Licencia no encontrada' });
        }
        return res.json({ success: true, message: 'Licencia eliminada' });
    } catch (error) {
        return handleDeleteError(res, error, 'device license');
    }
};

// ============================================
// DEVICE VALIDITY PERIODS CRUD
// ============================================

export const listDeviceValidityPeriods = async (req, res) => {
    try {
        const lang = getLang(req);
        const includeInactive = req.query.include_inactive === 'true';
        const data = await services.listDeviceValidityPeriods(lang, includeInactive);
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error listando validity periods', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const getDeviceValidityPeriod = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const data = await services.getDeviceValidityPeriodById(id);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Período no encontrado' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error obteniendo validity period', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const createDeviceValidityPeriod = async (req, res) => {
    try {
        const { code, months, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const data = await services.createDeviceValidityPeriod(
            { code, months, display_order: display_order || 0, is_active: is_active !== false },
            translations
        );
        return res.status(201).json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error creando validity period', { error: error.message });
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Ya existe un período con ese código' });
        }
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const updateDeviceValidityPeriod = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const { code, months, display_order, is_active } = req.body;
        const translations = extractTranslations(req.body);
        
        const updateData = {};
        if (code !== undefined) updateData.code = code;
        if (months !== undefined) updateData.months = months;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (is_active !== undefined) updateData.is_active = is_active;
        
        const data = await services.updateDeviceValidityPeriod(id, updateData, translations);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Período no encontrado' });
        }
        return res.json({ success: true, data });
    } catch (error) {
        metadataLogger.error('Error actualizando validity period', { error: error.message });
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const deleteDeviceValidityPeriod = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const hard = req.query.hard === 'true';
        const result = await services.deleteDeviceValidityPeriod(id, hard);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Período no encontrado' });
        }
        return res.json({ success: true, message: 'Período eliminado' });
    } catch (error) {
        return handleDeleteError(res, error, 'validity period');
    }
};
