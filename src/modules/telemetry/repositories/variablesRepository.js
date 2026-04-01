/**
 * Repositorio de Variables - CRUD y búsqueda
 * 
 * Proporciona operaciones de base de datos para gestión de variables
 * de telemetría con soporte para filtros, paginación y traducciones.
 */
import { QueryTypes, Op } from 'sequelize';
import sequelize from '../../../db/sql/sequelize.js';
import Variable from '../models/Variable.js';
import VariableTranslation from '../models/VariableTranslation.js';
import MeasurementType from '../models/MeasurementType.js';
import MeasurementTypeTranslation from '../models/MeasurementTypeTranslation.js';
import logger from '../../../utils/logger.js';
import { scanAndDelete } from '../../../db/redis/client.js';
import { 
    getCachedGlobalVariables, 
    cacheGlobalVariables,
    invalidateGlobalVariablesCache 
} from '../cache.js';

// Patrón de cache de device_metadata — se invalida cuando cambian variables
const DEVICE_METADATA_CACHE_PATTERN = 'ec:device_metadata:all:*';

/**
 * Invalida tanto el cache de variables globales como el de device_metadata.
 * Las variables están incluidas en GET /devices/metadata, así que ambos caches
 * deben limpiarse ante cualquier cambio en la tabla variables.
 */
const invalidateAllRelatedCaches = async () => {
    await Promise.all([
        invalidateGlobalVariablesCache(),
        scanAndDelete(DEVICE_METADATA_CACHE_PATTERN)
    ]);
};

/**
 * Obtiene lista de variables con filtros y paginación
 * 
 * @param {Object} options - Opciones de filtrado
 * @param {string} options.lang - Código de idioma (default: 'es')
 * @param {string} options.search - Búsqueda por nombre o descripción
 * @param {number} options.measurementTypeId - Filtrar por tipo de medición
 * @param {boolean} options.isRealtime - Filtrar por soporte realtime
 * @param {boolean} options.isDefault - Filtrar por variable por defecto
 * @param {boolean} options.isActive - Filtrar por estado activo (null = sin filtro = todas)
 * @param {boolean} options.showInBilling - Filtrar por visibilidad en facturación
 * @param {boolean} options.showInAnalysis - Filtrar por visibilidad en análisis
 * @param {string} options.chartType - Filtrar por tipo de gráfico
 * @param {string} options.aggregationType - Filtrar por tipo de agregación
 * @param {number} options.limit - Límite de resultados (default: 50)
 * @param {number} options.offset - Desplazamiento (default: 0)
 * @param {string} options.sortBy - Campo de ordenamiento (default: 'display_order')
 * @param {string} options.sortOrder - Dirección de orden (default: 'ASC')
 * @returns {Promise<Object>} { items, total, page, limit }
 */
export const findAll = async (options = {}) => {
    const {
        lang = 'es',
        search,
        measurementTypeId,
        isRealtime,
        isDefault,
        isActive,
        showInBilling,
        showInAnalysis,
        chartType,
        aggregationType,
        withTranslations = false,
        limit = 50,
        offset = 0,
        sortBy = 'displayOrder',
        sortOrder = 'ASC'
    } = options;

    // Construir condiciones WHERE
    const conditions = [];
    const replacements = { lang };

    // Filtro por estado activo — solo se aplica si se pasa explícitamente
    if (isActive !== undefined && isActive !== null) {
        conditions.push('v.is_active = :isActive');
        replacements.isActive = isActive;
    }

    // Filtro por tipo de medición
    if (measurementTypeId) {
        conditions.push('v.measurement_type_id = :measurementTypeId');
        replacements.measurementTypeId = measurementTypeId;
    }

    // Filtro por realtime
    if (isRealtime !== undefined && isRealtime !== null) {
        conditions.push('v.is_realtime = :isRealtime');
        replacements.isRealtime = isRealtime;
    }

    // Filtro por default
    if (isDefault !== undefined && isDefault !== null) {
        conditions.push('v.is_default = :isDefault');
        replacements.isDefault = isDefault;
    }

    // Filtro por showInBilling
    if (showInBilling !== undefined && showInBilling !== null) {
        conditions.push('v.show_in_billing = :showInBilling');
        replacements.showInBilling = showInBilling;
    }

    // Filtro por showInAnalysis
    if (showInAnalysis !== undefined && showInAnalysis !== null) {
        conditions.push('v.show_in_analysis = :showInAnalysis');
        replacements.showInAnalysis = showInAnalysis;
    }

    // Filtro por tipo de gráfico
    if (chartType) {
        conditions.push('v.chart_type = :chartType');
        replacements.chartType = chartType;
    }

    // Filtro por tipo de agregación
    if (aggregationType) {
        conditions.push('v.aggregation_type = :aggregationType');
        replacements.aggregationType = aggregationType;
    }

    // Búsqueda por texto (nombre o descripción)
    if (search) {
        conditions.push(`(
            LOWER(COALESCE(vt.name, vt_default.name, '')) LIKE LOWER(:search)
            OR LOWER(COALESCE(vt.description, vt_default.description, '')) LIKE LOWER(:search)
            OR LOWER(v.column_name) LIKE LOWER(:search)
            OR LOWER(v.code) LIKE LOWER(:search)
        )`);
        replacements.search = `%${search}%`;
    }

    const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    // Mapeo de campos de ordenamiento válidos
    const validSortFields = {
        'id': 'v.id',
        'displayOrder': 'v.display_order',
        'columnName': 'v.column_name',
        'name': 'COALESCE(vt.name, vt_default.name)',
        'measurementTypeId': 'v.measurement_type_id',
        'createdAt': 'v.created_at',
        'updatedAt': 'v.updated_at'
    };

    const orderField = validSortFields[sortBy] || 'v.display_order';
    const orderDir = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Subquery de traducciones completas (solo cuando se solicita con_translations=true)
    const translationsSubquery = withTranslations
        ? `(
            SELECT json_object_agg(vt2.lang, json_build_object('name', vt2.name, 'description', vt2.description))
            FROM variable_translations vt2
            WHERE vt2.variable_id = v.id
        ) AS translations,`
        : '';

    // Query principal con traducciones y nuevos campos de visualización
    const query = `
        SELECT 
            v.id,
            v.code,
            v.measurement_type_id AS "measurementTypeId",
            v.column_name AS "columnName",
            v.unit,
            v.chart_type AS "chartType",
            v.axis_name AS "axisName",
            v.axis_id AS "axisId",
            v.axis_min AS "axisMin",
            v.axis_function AS "axisFunction",
            v.aggregation_type AS "aggregationType",
            v.display_order AS "displayOrder",
            v.show_in_billing AS "showInBilling",
            v.show_in_analysis AS "showInAnalysis",
            v.is_realtime AS "isRealtime",
            v.is_default AS "isDefault",
            v.decimal_places AS "decimalPlaces",
            v.unit_scaling AS "unitScaling",
            v.icon,
            v.color,
            v.is_active AS "isActive",
            v.created_at AS "createdAt",
            v.updated_at AS "updatedAt",
            ${translationsSubquery}
            COALESCE(vt.name, vt_default.name, 'Unknown') AS name,
            COALESCE(vt.description, vt_default.description) AS description,
            COALESCE(mtt.name, mtt_default.name, 'Unknown') AS "measurementTypeName"
        FROM variables v
        LEFT JOIN variable_translations vt 
            ON v.id = vt.variable_id AND vt.lang = :lang
        LEFT JOIN variable_translations vt_default 
            ON v.id = vt_default.variable_id AND vt_default.lang = 'es'
        LEFT JOIN measurement_types mt
            ON v.measurement_type_id = mt.id
        LEFT JOIN measurement_type_translations mtt
            ON mt.id = mtt.measurement_type_id AND mtt.lang = :lang
        LEFT JOIN measurement_type_translations mtt_default
            ON mt.id = mtt_default.measurement_type_id AND mtt_default.lang = 'es'
        ${whereClause}
        ORDER BY ${orderField} ${orderDir} NULLS LAST, v.id ASC
        LIMIT :limit OFFSET :offset
    `;

    // Query de conteo total
    const countQuery = `
        SELECT COUNT(*) as total
        FROM variables v
        LEFT JOIN variable_translations vt 
            ON v.id = vt.variable_id AND vt.lang = :lang
        LEFT JOIN variable_translations vt_default 
            ON v.id = vt_default.variable_id AND vt_default.lang = 'es'
        ${whereClause}
    `;

    replacements.limit = limit;
    replacements.offset = offset;

    // Ejecutar queries en paralelo
    const [items, countResult] = await Promise.all([
        sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        }),
        sequelize.query(countQuery, {
            replacements,
            type: QueryTypes.SELECT
        })
    ]);

    const total = parseInt(countResult[0]?.total || 0, 10);

    return {
        items,
        total,
        page: Math.floor(offset / limit) + 1,
        limit
    };
};

/**
 * Obtiene una variable por ID con traducciones del idioma solicitado
 * 
 * @param {number} id - ID de la variable
 * @param {string} lang - Código de idioma
 * @returns {Promise<Object|null>} Variable o null
 */
export const findById = async (id, lang = 'es') => {
    const query = `
        SELECT 
            v.id,
            v.code,
            v.measurement_type_id AS "measurementTypeId",
            v.column_name AS "columnName",
            v.unit,
            v.chart_type AS "chartType",
            v.axis_name AS "axisName",
            v.axis_id AS "axisId",
            v.axis_min AS "axisMin",
            v.axis_function AS "axisFunction",
            v.aggregation_type AS "aggregationType",
            v.display_order AS "displayOrder",
            v.show_in_billing AS "showInBilling",
            v.show_in_analysis AS "showInAnalysis",
            v.is_realtime AS "isRealtime",
            v.is_default AS "isDefault",
            v.decimal_places AS "decimalPlaces",
            v.unit_scaling AS "unitScaling",
            v.icon,
            v.color,
            v.is_active AS "isActive",
            v.created_at AS "createdAt",
            v.updated_at AS "updatedAt",
            COALESCE(vt.name, vt_default.name, 'Unknown') AS name,
            COALESCE(vt.description, vt_default.description) AS description,
            COALESCE(mtt.name, mtt_default.name, 'Unknown') AS "measurementTypeName"
        FROM variables v
        LEFT JOIN variable_translations vt 
            ON v.id = vt.variable_id AND vt.lang = :lang
        LEFT JOIN variable_translations vt_default 
            ON v.id = vt_default.variable_id AND vt_default.lang = 'es'
        LEFT JOIN measurement_types mt
            ON v.measurement_type_id = mt.id
        LEFT JOIN measurement_type_translations mtt
            ON mt.id = mtt.measurement_type_id AND mtt.lang = :lang
        LEFT JOIN measurement_type_translations mtt_default
            ON mt.id = mtt_default.measurement_type_id AND mtt_default.lang = 'es'
        WHERE v.id = :id
    `;

    const results = await sequelize.query(query, {
        replacements: { id, lang },
        type: QueryTypes.SELECT
    });

    return results[0] || null;
};

/**
 * Crea una nueva variable con traducciones
 * 
 * @param {Object} data - Datos de la variable
 * @param {Object} translations - Traducciones { es: { name, description }, en: {...} }
 * @param {Object} transaction - Transacción de Sequelize (opcional)
 * @returns {Promise<Object>} Variable creada
 */
export const create = async (data, translations = {}, transaction = null) => {
    const t = transaction || await sequelize.transaction();
    
    try {
        // Crear variable con todos los campos incluyendo los nuevos
        const variable = await Variable.create({
            code: data.code,
            measurementTypeId: data.measurementTypeId,
            columnName: data.columnName,
            unit: data.unit,
            chartType: data.chartType,
            axisName: data.axisName,
            axisId: data.axisId,
            axisMin: data.axisMin,
            axisFunction: data.axisFunction,
            aggregationType: data.aggregationType,
            displayOrder: data.displayOrder,
            showInBilling: data.showInBilling ?? false,
            showInAnalysis: data.showInAnalysis ?? true,
            isRealtime: data.isRealtime ?? false,
            isDefault: data.isDefault ?? false,
            decimalPlaces: data.decimalPlaces ?? 2,
            unitScaling: data.unitScaling ?? null,
            icon: data.icon ?? null,
            color: data.color ?? null,
            isActive: data.isActive ?? true
        }, { transaction: t });

        // Crear traducciones
        const translationPromises = Object.entries(translations).map(([lang, trans]) => 
            VariableTranslation.create({
                variableId: variable.id,
                lang,
                name: trans.name,
                description: trans.description
            }, { transaction: t })
        );

        await Promise.all(translationPromises);

        // Invalidar cache de variables y device_metadata
        await invalidateAllRelatedCaches();

        if (!transaction) {
            await t.commit();
        }

        logger.info({ variableId: variable.id, code: data.code, columnName: data.columnName }, 'Variable created');
        
        return variable;

    } catch (error) {
        if (!transaction) {
            await t.rollback();
        }
        throw error;
    }
};

/**
 * Actualiza una variable y sus traducciones
 * 
 * @param {number} id - ID de la variable
 * @param {Object} data - Datos a actualizar
 * @param {Object} translations - Traducciones a actualizar/crear
 * @param {Object} transaction - Transacción de Sequelize (opcional)
 * @returns {Promise<Object>} Variable actualizada
 */
export const update = async (id, data, translations = {}, transaction = null) => {
    const t = transaction || await sequelize.transaction();
    
    try {
        const variable = await Variable.findByPk(id, { transaction: t });
        
        if (!variable) {
            throw new Error(`Variable con ID ${id} no encontrada`);
        }

        // Construir objeto de actualización solo con campos presentes
        const updateFields = {};
        if (data.measurementTypeId !== undefined) updateFields.measurementTypeId = data.measurementTypeId;
        if (data.columnName !== undefined) updateFields.columnName = data.columnName;
        if (data.unit !== undefined) updateFields.unit = data.unit;
        if (data.chartType !== undefined) updateFields.chartType = data.chartType;
        if (data.axisName !== undefined) updateFields.axisName = data.axisName;
        if (data.axisId !== undefined) updateFields.axisId = data.axisId;
        if (data.axisMin !== undefined) updateFields.axisMin = data.axisMin;
        if (data.axisFunction !== undefined) updateFields.axisFunction = data.axisFunction;
        if (data.aggregationType !== undefined) updateFields.aggregationType = data.aggregationType;
        if (data.displayOrder !== undefined) updateFields.displayOrder = data.displayOrder;
        if (data.showInBilling !== undefined) updateFields.showInBilling = data.showInBilling;
        if (data.showInAnalysis !== undefined) updateFields.showInAnalysis = data.showInAnalysis;
        if (data.isRealtime !== undefined) updateFields.isRealtime = data.isRealtime;
        if (data.isDefault !== undefined) updateFields.isDefault = data.isDefault;
        if (data.isActive !== undefined) updateFields.isActive = data.isActive;
        if (data.decimalPlaces !== undefined) updateFields.decimalPlaces = data.decimalPlaces;
        if (data.unitScaling !== undefined) updateFields.unitScaling = data.unitScaling;
        if (data.icon !== undefined) updateFields.icon = data.icon;
        if (data.color !== undefined) updateFields.color = data.color;

        if (Object.keys(updateFields).length > 0) {
            await variable.update(updateFields, { transaction: t });
        }

        // Actualizar o crear traducciones
        for (const [lang, trans] of Object.entries(translations)) {
            const [translation, created] = await VariableTranslation.findOrCreate({
                where: { variableId: id, lang },
                defaults: {
                    name: trans.name,
                    description: trans.description
                },
                transaction: t
            });

            if (!created) {
                await translation.update({
                    name: trans.name,
                    description: trans.description
                }, { transaction: t });
            }
        }

        // Invalidar cache de variables y device_metadata
        await invalidateAllRelatedCaches();

        if (!transaction) {
            await t.commit();
        }

        logger.info({ variableId: id }, 'Variable updated');
        
        // Recargar con traducciones
        return await findById(id);

    } catch (error) {
        if (!transaction) {
            await t.rollback();
        }
        throw error;
    }
};

/**
 * Elimina una variable (soft delete via is_active = false)
 * 
 * @param {number} id - ID de la variable
 * @returns {Promise<boolean>} True si se eliminó
 */
export const remove = async (id) => {
    const variable = await Variable.findByPk(id);
    
    if (!variable) {
        throw new Error(`Variable con ID ${id} no encontrada`);
    }

    await variable.update({ isActive: false });

    // Invalidar cache de variables y device_metadata
    await invalidateAllRelatedCaches();

    logger.info({ variableId: id }, 'Variable soft-deleted');
    
    return true;
};

/**
 * Obtiene todas las traducciones de una variable
 * 
 * @param {number} variableId - ID de la variable
 * @returns {Promise<Array>} Lista de traducciones por idioma
 */
export const getTranslations = async (variableId) => {
    return await VariableTranslation.findAll({
        where: { variableId },
        order: [['lang', 'ASC']]
    });
};

/**
 * Verifica si existe una variable con el mismo code (único global)
 * 
 * @param {string} code - Código slug de la variable
 * @param {number} excludeId - ID a excluir (para updates)
 * @returns {Promise<boolean>} True si existe duplicado
 */
export const existsCode = async (code, excludeId = null) => {
    const where = { code };
    if (excludeId) {
        where.id = { [Op.ne]: excludeId };
    }
    const count = await Variable.count({ where });
    return count > 0;
};

/**
 * Verifica si existe una variable con el mismo column_name en un measurement_type
 * 
 * @param {number} measurementTypeId - ID del tipo de medición
 * @param {string} columnName - Nombre de columna
 * @param {number} excludeId - ID a excluir (para updates)
 * @returns {Promise<boolean>} True si existe duplicado
 */
export const existsDuplicate = async (measurementTypeId, columnName, excludeId = null) => {
    const where = {
        measurementTypeId,
        columnName
    };

    if (excludeId) {
        where.id = { [Op.ne]: excludeId };
    }

    const count = await Variable.count({ where });
    return count > 0;
};

export default {
    findAll,
    findById,
    create,
    update,
    remove,
    getTranslations,
    existsCode,
    existsDuplicate
};
