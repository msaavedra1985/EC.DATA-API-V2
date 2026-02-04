/**
 * Repository de Device Metadata
 * Acceso a datos de catálogos de dispositivos
 */

import {
    DeviceType,
    DeviceTypeTranslation,
    DeviceBrand,
    DeviceBrandTranslation,
    DeviceModel,
    DeviceModelTranslation,
    DeviceServer,
    DeviceServerTranslation,
    DeviceNetwork,
    DeviceNetworkTranslation,
    DeviceLicense,
    DeviceLicenseTranslation,
    DeviceValidityPeriod,
    DeviceValidityPeriodTranslation
} from './models/index.js';

/**
 * Obtener todos los tipos de dispositivo activos con traducciones
 */
export const getDeviceTypes = async (lang = 'es') => {
    return DeviceType.findAll({
        where: { is_active: true },
        include: [{
            model: DeviceTypeTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};

/**
 * Obtener todas las marcas activas con traducciones
 */
export const getDeviceBrands = async (lang = 'es') => {
    return DeviceBrand.findAll({
        where: { is_active: true },
        include: [{
            model: DeviceBrandTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};

/**
 * Obtener todos los modelos activos con traducciones
 */
export const getDeviceModels = async (lang = 'es') => {
    return DeviceModel.findAll({
        where: { is_active: true },
        include: [
            {
                model: DeviceModelTranslation,
                as: 'translations',
                where: { lang },
                required: false
            },
            {
                model: DeviceBrand,
                as: 'brand',
                attributes: ['id', 'code']
            }
        ],
        order: [['display_order', 'ASC']]
    });
};

/**
 * Obtener todos los servidores activos con traducciones
 */
export const getDeviceServers = async (lang = 'es') => {
    return DeviceServer.findAll({
        where: { is_active: true },
        include: [{
            model: DeviceServerTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};

/**
 * Obtener todos los tipos de red activos con traducciones
 */
export const getDeviceNetworks = async (lang = 'es') => {
    return DeviceNetwork.findAll({
        where: { is_active: true },
        include: [{
            model: DeviceNetworkTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};

/**
 * Obtener todas las licencias activas con traducciones
 */
export const getDeviceLicenses = async (lang = 'es') => {
    return DeviceLicense.findAll({
        where: { is_active: true },
        include: [{
            model: DeviceLicenseTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};

/**
 * Obtener todos los períodos de vigencia activos con traducciones
 */
export const getDeviceValidityPeriods = async (lang = 'es') => {
    return DeviceValidityPeriod.findAll({
        where: { is_active: true },
        include: [{
            model: DeviceValidityPeriodTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};
