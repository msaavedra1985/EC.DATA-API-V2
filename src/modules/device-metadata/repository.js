/**
 * Repository de Device Metadata
 * Acceso a datos de catálogos de dispositivos
 */

import sequelize from '../../db/sql/sequelize.js';
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

// ============================================
// DEVICE TYPES
// ============================================

export const getDeviceTypes = async (lang = 'es', includeInactive = false) => {
    const where = includeInactive ? {} : { is_active: true };
    return DeviceType.findAll({
        where,
        include: [{
            model: DeviceTypeTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};

export const findDeviceTypeById = async (id) => {
    return DeviceType.findByPk(id, {
        include: [{ model: DeviceTypeTranslation, as: 'translations' }]
    });
};

export const findDeviceTypeByCode = async (code) => {
    return DeviceType.findOne({
        where: { code },
        include: [{ model: DeviceTypeTranslation, as: 'translations' }]
    });
};

export const createDeviceType = async (data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const type = await DeviceType.create(data, { transaction: t });
        if (translations.length > 0) {
            const translationsData = translations.map(tr => ({
                ...tr,
                device_type_id: type.id
            }));
            await DeviceTypeTranslation.bulkCreate(translationsData, { transaction: t });
        }
        await t.commit();
        return findDeviceTypeById(type.id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceType = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        await DeviceType.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceTypeTranslation.upsert({
                    ...tr,
                    device_type_id: id
                }, { transaction: t });
            }
        }
        await t.commit();
        return findDeviceTypeById(id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceType = async (id, hard = false) => {
    if (hard) {
        return DeviceType.destroy({ where: { id } });
    }
    return DeviceType.update({ is_active: false }, { where: { id } });
};

// ============================================
// DEVICE BRANDS
// ============================================

export const getDeviceBrands = async (lang = 'es', includeInactive = false) => {
    const where = includeInactive ? {} : { is_active: true };
    return DeviceBrand.findAll({
        where,
        include: [{
            model: DeviceBrandTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};

export const findDeviceBrandById = async (id) => {
    return DeviceBrand.findByPk(id, {
        include: [{ model: DeviceBrandTranslation, as: 'translations' }]
    });
};

export const findDeviceBrandByCode = async (code) => {
    return DeviceBrand.findOne({
        where: { code },
        include: [{ model: DeviceBrandTranslation, as: 'translations' }]
    });
};

export const createDeviceBrand = async (data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const brand = await DeviceBrand.create(data, { transaction: t });
        if (translations.length > 0) {
            const translationsData = translations.map(tr => ({
                ...tr,
                device_brand_id: brand.id
            }));
            await DeviceBrandTranslation.bulkCreate(translationsData, { transaction: t });
        }
        await t.commit();
        return findDeviceBrandById(brand.id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceBrand = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        await DeviceBrand.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceBrandTranslation.upsert({
                    ...tr,
                    device_brand_id: id
                }, { transaction: t });
            }
        }
        await t.commit();
        return findDeviceBrandById(id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceBrand = async (id, hard = false) => {
    if (hard) {
        return DeviceBrand.destroy({ where: { id } });
    }
    return DeviceBrand.update({ is_active: false }, { where: { id } });
};

// ============================================
// DEVICE MODELS
// ============================================

export const getDeviceModels = async (lang = 'es', includeInactive = false, brandId = null) => {
    const where = includeInactive ? {} : { is_active: true };
    if (brandId) where.device_brand_id = brandId;
    
    return DeviceModel.findAll({
        where,
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

export const findDeviceModelById = async (id) => {
    return DeviceModel.findByPk(id, {
        include: [
            { model: DeviceModelTranslation, as: 'translations' },
            { model: DeviceBrand, as: 'brand', attributes: ['id', 'code'] }
        ]
    });
};

export const createDeviceModel = async (data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const model = await DeviceModel.create(data, { transaction: t });
        if (translations.length > 0) {
            const translationsData = translations.map(tr => ({
                ...tr,
                device_model_id: model.id
            }));
            await DeviceModelTranslation.bulkCreate(translationsData, { transaction: t });
        }
        await t.commit();
        return findDeviceModelById(model.id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceModel = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        await DeviceModel.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceModelTranslation.upsert({
                    ...tr,
                    device_model_id: id
                }, { transaction: t });
            }
        }
        await t.commit();
        return findDeviceModelById(id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceModel = async (id, hard = false) => {
    if (hard) {
        return DeviceModel.destroy({ where: { id } });
    }
    return DeviceModel.update({ is_active: false }, { where: { id } });
};

// ============================================
// DEVICE SERVERS
// ============================================

export const getDeviceServers = async (lang = 'es', includeInactive = false) => {
    const where = includeInactive ? {} : { is_active: true };
    return DeviceServer.findAll({
        where,
        include: [{
            model: DeviceServerTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};

export const findDeviceServerById = async (id) => {
    return DeviceServer.findByPk(id, {
        include: [{ model: DeviceServerTranslation, as: 'translations' }]
    });
};

export const createDeviceServer = async (data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const server = await DeviceServer.create(data, { transaction: t });
        if (translations.length > 0) {
            const translationsData = translations.map(tr => ({
                ...tr,
                device_server_id: server.id
            }));
            await DeviceServerTranslation.bulkCreate(translationsData, { transaction: t });
        }
        await t.commit();
        return findDeviceServerById(server.id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceServer = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        await DeviceServer.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceServerTranslation.upsert({
                    ...tr,
                    device_server_id: id
                }, { transaction: t });
            }
        }
        await t.commit();
        return findDeviceServerById(id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceServer = async (id, hard = false) => {
    if (hard) {
        return DeviceServer.destroy({ where: { id } });
    }
    return DeviceServer.update({ is_active: false }, { where: { id } });
};

// ============================================
// DEVICE NETWORKS
// ============================================

export const getDeviceNetworks = async (lang = 'es', includeInactive = false) => {
    const where = includeInactive ? {} : { is_active: true };
    return DeviceNetwork.findAll({
        where,
        include: [{
            model: DeviceNetworkTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};

export const findDeviceNetworkById = async (id) => {
    return DeviceNetwork.findByPk(id, {
        include: [{ model: DeviceNetworkTranslation, as: 'translations' }]
    });
};

export const createDeviceNetwork = async (data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const network = await DeviceNetwork.create(data, { transaction: t });
        if (translations.length > 0) {
            const translationsData = translations.map(tr => ({
                ...tr,
                device_network_id: network.id
            }));
            await DeviceNetworkTranslation.bulkCreate(translationsData, { transaction: t });
        }
        await t.commit();
        return findDeviceNetworkById(network.id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceNetwork = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        await DeviceNetwork.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceNetworkTranslation.upsert({
                    ...tr,
                    device_network_id: id
                }, { transaction: t });
            }
        }
        await t.commit();
        return findDeviceNetworkById(id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceNetwork = async (id, hard = false) => {
    if (hard) {
        return DeviceNetwork.destroy({ where: { id } });
    }
    return DeviceNetwork.update({ is_active: false }, { where: { id } });
};

// ============================================
// DEVICE LICENSES
// ============================================

export const getDeviceLicenses = async (lang = 'es', includeInactive = false) => {
    const where = includeInactive ? {} : { is_active: true };
    return DeviceLicense.findAll({
        where,
        include: [{
            model: DeviceLicenseTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};

export const findDeviceLicenseById = async (id) => {
    return DeviceLicense.findByPk(id, {
        include: [{ model: DeviceLicenseTranslation, as: 'translations' }]
    });
};

export const createDeviceLicense = async (data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const license = await DeviceLicense.create(data, { transaction: t });
        if (translations.length > 0) {
            const translationsData = translations.map(tr => ({
                ...tr,
                device_license_id: license.id
            }));
            await DeviceLicenseTranslation.bulkCreate(translationsData, { transaction: t });
        }
        await t.commit();
        return findDeviceLicenseById(license.id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceLicense = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        await DeviceLicense.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceLicenseTranslation.upsert({
                    ...tr,
                    device_license_id: id
                }, { transaction: t });
            }
        }
        await t.commit();
        return findDeviceLicenseById(id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceLicense = async (id, hard = false) => {
    if (hard) {
        return DeviceLicense.destroy({ where: { id } });
    }
    return DeviceLicense.update({ is_active: false }, { where: { id } });
};

// ============================================
// DEVICE VALIDITY PERIODS
// ============================================

export const getDeviceValidityPeriods = async (lang = 'es', includeInactive = false) => {
    const where = includeInactive ? {} : { is_active: true };
    return DeviceValidityPeriod.findAll({
        where,
        include: [{
            model: DeviceValidityPeriodTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['display_order', 'ASC']]
    });
};

export const findDeviceValidityPeriodById = async (id) => {
    return DeviceValidityPeriod.findByPk(id, {
        include: [{ model: DeviceValidityPeriodTranslation, as: 'translations' }]
    });
};

export const createDeviceValidityPeriod = async (data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const period = await DeviceValidityPeriod.create(data, { transaction: t });
        if (translations.length > 0) {
            const translationsData = translations.map(tr => ({
                ...tr,
                device_validity_period_id: period.id
            }));
            await DeviceValidityPeriodTranslation.bulkCreate(translationsData, { transaction: t });
        }
        await t.commit();
        return findDeviceValidityPeriodById(period.id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceValidityPeriod = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        await DeviceValidityPeriod.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceValidityPeriodTranslation.upsert({
                    ...tr,
                    device_validity_period_id: id
                }, { transaction: t });
            }
        }
        await t.commit();
        return findDeviceValidityPeriodById(id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceValidityPeriod = async (id, hard = false) => {
    if (hard) {
        return DeviceValidityPeriod.destroy({ where: { id } });
    }
    return DeviceValidityPeriod.update({ is_active: false }, { where: { id } });
};
