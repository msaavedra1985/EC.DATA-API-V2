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
import { MeasurementType, MeasurementTypeTranslation, Variable, VariableTranslation } from '../telemetry/models/index.js';

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
        order: [[{ model: DeviceTypeTranslation, as: 'translations' }, 'name', 'ASC']]
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
        const result = await DeviceType.findByPk(type.id, {
            include: [{ model: DeviceTypeTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceType = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const existing = await DeviceType.findByPk(id, { transaction: t });
        if (!existing) {
            await t.rollback();
            return null;
        }
        await DeviceType.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceTypeTranslation.upsert({
                    ...tr,
                    device_type_id: id
                }, { transaction: t });
            }
        }
        const result = await DeviceType.findByPk(id, {
            include: [{ model: DeviceTypeTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceType = async (id, hard = false) => {
    const existing = await DeviceType.findByPk(id);
    if (!existing) return null;
    if (hard) {
        await DeviceType.destroy({ where: { id } });
    } else {
        await DeviceType.update({ is_active: false }, { where: { id } });
    }
    return true;
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
        order: [[{ model: DeviceBrandTranslation, as: 'translations' }, 'name', 'ASC']]
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
        const result = await DeviceBrand.findByPk(brand.id, {
            include: [{ model: DeviceBrandTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceBrand = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const existing = await DeviceBrand.findByPk(id, { transaction: t });
        if (!existing) {
            await t.rollback();
            return null;
        }
        await DeviceBrand.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceBrandTranslation.upsert({
                    ...tr,
                    device_brand_id: id
                }, { transaction: t });
            }
        }
        const result = await DeviceBrand.findByPk(id, {
            include: [{ model: DeviceBrandTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceBrand = async (id, hard = false) => {
    const existing = await DeviceBrand.findByPk(id);
    if (!existing) return null;
    if (hard) {
        await DeviceBrand.destroy({ where: { id } });
    } else {
        await DeviceBrand.update({ is_active: false }, { where: { id } });
    }
    return true;
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
        order: [[{ model: DeviceModelTranslation, as: 'translations' }, 'name', 'ASC']]
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
        const result = await DeviceModel.findByPk(model.id, {
            include: [
                { model: DeviceModelTranslation, as: 'translations' },
                { model: DeviceBrand, as: 'brand', attributes: ['id', 'code'] }
            ],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceModel = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const existing = await DeviceModel.findByPk(id, { transaction: t });
        if (!existing) {
            await t.rollback();
            return null;
        }
        await DeviceModel.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceModelTranslation.upsert({
                    ...tr,
                    device_model_id: id
                }, { transaction: t });
            }
        }
        const result = await DeviceModel.findByPk(id, {
            include: [
                { model: DeviceModelTranslation, as: 'translations' },
                { model: DeviceBrand, as: 'brand', attributes: ['id', 'code'] }
            ],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceModel = async (id, hard = false) => {
    const existing = await DeviceModel.findByPk(id);
    if (!existing) return null;
    if (hard) {
        await DeviceModel.destroy({ where: { id } });
    } else {
        await DeviceModel.update({ is_active: false }, { where: { id } });
    }
    return true;
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
        order: [[{ model: DeviceServerTranslation, as: 'translations' }, 'name', 'ASC']]
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
        const result = await DeviceServer.findByPk(server.id, {
            include: [{ model: DeviceServerTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceServer = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const existing = await DeviceServer.findByPk(id, { transaction: t });
        if (!existing) {
            await t.rollback();
            return null;
        }
        await DeviceServer.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceServerTranslation.upsert({
                    ...tr,
                    device_server_id: id
                }, { transaction: t });
            }
        }
        const result = await DeviceServer.findByPk(id, {
            include: [{ model: DeviceServerTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceServer = async (id, hard = false) => {
    const existing = await DeviceServer.findByPk(id);
    if (!existing) return null;
    if (hard) {
        await DeviceServer.destroy({ where: { id } });
    } else {
        await DeviceServer.update({ is_active: false }, { where: { id } });
    }
    return true;
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
        order: [[{ model: DeviceNetworkTranslation, as: 'translations' }, 'name', 'ASC']]
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
        const result = await DeviceNetwork.findByPk(network.id, {
            include: [{ model: DeviceNetworkTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceNetwork = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const existing = await DeviceNetwork.findByPk(id, { transaction: t });
        if (!existing) {
            await t.rollback();
            return null;
        }
        await DeviceNetwork.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceNetworkTranslation.upsert({
                    ...tr,
                    device_network_id: id
                }, { transaction: t });
            }
        }
        const result = await DeviceNetwork.findByPk(id, {
            include: [{ model: DeviceNetworkTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceNetwork = async (id, hard = false) => {
    const existing = await DeviceNetwork.findByPk(id);
    if (!existing) return null;
    if (hard) {
        await DeviceNetwork.destroy({ where: { id } });
    } else {
        await DeviceNetwork.update({ is_active: false }, { where: { id } });
    }
    return true;
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
        order: [[{ model: DeviceLicenseTranslation, as: 'translations' }, 'name', 'ASC']]
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
        const result = await DeviceLicense.findByPk(license.id, {
            include: [{ model: DeviceLicenseTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceLicense = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const existing = await DeviceLicense.findByPk(id, { transaction: t });
        if (!existing) {
            await t.rollback();
            return null;
        }
        await DeviceLicense.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceLicenseTranslation.upsert({
                    ...tr,
                    device_license_id: id
                }, { transaction: t });
            }
        }
        const result = await DeviceLicense.findByPk(id, {
            include: [{ model: DeviceLicenseTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceLicense = async (id, hard = false) => {
    const existing = await DeviceLicense.findByPk(id);
    if (!existing) return null;
    if (hard) {
        await DeviceLicense.destroy({ where: { id } });
    } else {
        await DeviceLicense.update({ is_active: false }, { where: { id } });
    }
    return true;
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
        order: [[{ model: DeviceValidityPeriodTranslation, as: 'translations' }, 'name', 'ASC']]
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
        const result = await DeviceValidityPeriod.findByPk(period.id, {
            include: [{ model: DeviceValidityPeriodTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const updateDeviceValidityPeriod = async (id, data, translations = []) => {
    const t = await sequelize.transaction();
    try {
        const existing = await DeviceValidityPeriod.findByPk(id, { transaction: t });
        if (!existing) {
            await t.rollback();
            return null;
        }
        await DeviceValidityPeriod.update(data, { where: { id }, transaction: t });
        if (translations.length > 0) {
            for (const tr of translations) {
                await DeviceValidityPeriodTranslation.upsert({
                    ...tr,
                    device_validity_period_id: id
                }, { transaction: t });
            }
        }
        const result = await DeviceValidityPeriod.findByPk(id, {
            include: [{ model: DeviceValidityPeriodTranslation, as: 'translations' }],
            transaction: t
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

export const deleteDeviceValidityPeriod = async (id, hard = false) => {
    const existing = await DeviceValidityPeriod.findByPk(id);
    if (!existing) return null;
    if (hard) {
        await DeviceValidityPeriod.destroy({ where: { id } });
    } else {
        await DeviceValidityPeriod.update({ is_active: false }, { where: { id } });
    }
    return true;
};

// ============================================
// CATALOG USAGE (auditoría de dependencias)
// ============================================

// Mapa de dependencias: define qué entidades referencian cada catálogo
// Para agregar una nueva entidad que referencia un catálogo, solo agregar una entrada aquí
const CATALOG_DEPENDENCIES = {
    deviceTypes: {
        catalogTable: 'device_types',
        deps: [{ entity: 'devices', table: 'devices', fkColumn: 'device_type_id', label: 'devices' }]
    },
    deviceBrands: {
        catalogTable: 'device_brands',
        deps: [{ entity: 'devices', table: 'devices', fkColumn: 'brand_id', label: 'devices' }]
    },
    deviceModels: {
        catalogTable: 'device_models',
        deps: [{ entity: 'devices', table: 'devices', fkColumn: 'model_id', label: 'devices' }]
    },
    deviceServers: {
        catalogTable: 'device_servers',
        deps: [{ entity: 'devices', table: 'devices', fkColumn: 'server_id', label: 'devices' }]
    },
    deviceNetworks: {
        catalogTable: 'device_networks',
        deps: [{ entity: 'devices', table: 'devices', fkColumn: 'network_id', label: 'devices' }]
    },
    deviceLicenses: {
        catalogTable: 'device_licenses',
        deps: [{ entity: 'devices', table: 'devices', fkColumn: 'license_id', label: 'devices' }]
    },
    deviceValidityPeriods: {
        catalogTable: 'device_validity_periods',
        deps: [{ entity: 'devices', table: 'devices', fkColumn: 'validity_period_id', label: 'devices' }]
    }
};

// Consulta genérica de dependencias para una entidad específica
const queryEntityDependency = async (dep, catalogId, limit = 50) => {
    // Conteo total
    const [countResult] = await sequelize.query(
        `SELECT COUNT(*) as count FROM "${dep.table}" WHERE "${dep.fkColumn}" = :catalogId`,
        { replacements: { catalogId }, type: sequelize.QueryTypes.SELECT }
    );
    const count = parseInt(countResult.count);

    // Items con info de organización (solo si hay resultados)
    let items = [];
    if (count > 0) {
        items = await sequelize.query(
            `SELECT d.public_code AS "publicCode", d.name, o.name AS "organizationName"
             FROM "${dep.table}" d
             LEFT JOIN organizations o ON d.organization_id = o.id
             WHERE d."${dep.fkColumn}" = :catalogId
             ORDER BY o.name ASC, d.name ASC
             LIMIT :limit`,
            { replacements: { catalogId, limit }, type: sequelize.QueryTypes.SELECT }
        );
    }

    return { count, items };
};

// Obtiene todas las dependencias de un catálogo agrupadas por tipo de entidad
export const getCatalogUsage = async (catalogKey, catalogId, limit = 50) => {
    const config = CATALOG_DEPENDENCIES[catalogKey];
    if (!config) {
        throw new Error(`Catálogo "${catalogKey}" no tiene dependencias configuradas`);
    }

    const [catalogItem] = await sequelize.query(
        `SELECT code FROM "${config.catalogTable}" WHERE id = :catalogId`,
        { replacements: { catalogId }, type: sequelize.QueryTypes.SELECT }
    );
    const code = catalogItem?.code || null;

    let totalCount = 0;
    const dependencies = {};

    for (const dep of config.deps) {
        const result = await queryEntityDependency(dep, catalogId, limit);
        totalCount += result.count;
        dependencies[dep.label] = {
            count: result.count,
            items: result.items
        };
    }

    return { code, totalCount, dependencies };
};

// ============================================
// MEASUREMENT TYPES (catálogo compartido desde telemetry)
// ============================================

export const getMeasurementTypes = async (lang = 'es') => {
    return MeasurementType.findAll({
        where: { is_active: true },
        include: [{
            model: MeasurementTypeTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['id', 'ASC']]
    });
};

// ============================================
// VARIABLES (catálogo compartido desde telemetry)
// ============================================

export const getVariables = async (lang = 'es') => {
    return Variable.findAll({
        where: { is_active: true },
        include: [{
            model: VariableTranslation,
            as: 'translations',
            where: { lang },
            required: false
        }],
        order: [['measurement_type_id', 'ASC'], ['display_order', 'ASC NULLS LAST']]
    });
};
