/**
 * MetadataRepository - Repositorio para obtener metadata de canales
 * 
 * Proporciona acceso a la información necesaria para construir queries de Cassandra:
 * - UUID del device (partition key)
 * - Número de canal físico (ch) para partition key
 * - Tipo de medición (para determinar prefijo de tabla)
 * - Variables activas del canal (para seleccionar columnas)
 * - Timezone del device (para post-procesamiento)
 */
import sequelize from '../../../db/sql/sequelize.js';
import { QueryTypes } from 'sequelize';

/**
 * Obtiene la metadata completa de un canal para queries de telemetría
 * 
 * @param {string} channelId - ID del canal (UUID)
 * @param {string} lang - Código de idioma para traducciones (default: 'es')
 * @returns {Promise<Object|null>} Metadata del canal o null si no existe
 */
export const getChannelMetadata = async (channelId, lang = 'es') => {
    const query = `
        SELECT 
            c.id AS channel_id,
            c.human_id AS channel_human_id,
            c.public_code AS channel_public_code,
            c.name AS channel_name,
            c.ch AS channel_number,
            c.measurement_type_id,
            d.id AS device_id,
            d.name AS device_name,
            d.timezone AS device_timezone,
            mt.table_prefix,
            COALESCE(mtt.name, mtt_default.name, 'Unknown') AS measurement_type_name
        FROM channels c
        INNER JOIN devices d ON c.device_id = d.id
        LEFT JOIN measurement_types mt ON c.measurement_type_id = mt.id
        LEFT JOIN measurement_type_translations mtt 
            ON mt.id = mtt.measurement_type_id AND mtt.lang = :lang
        LEFT JOIN measurement_type_translations mtt_default 
            ON mt.id = mtt_default.measurement_type_id AND mtt_default.lang = 'es'
        WHERE c.id = :channelId
            AND c.deleted_at IS NULL
            AND d.deleted_at IS NULL
    `;

    const results = await sequelize.query(query, {
        replacements: { channelId, lang },
        type: QueryTypes.SELECT
    });

    if (results.length === 0) {
        return null;
    }

    return results[0];
};

/**
 * Obtiene las variables activas de un canal con traducciones
 * 
 * @param {string} channelId - ID del canal (UUID)
 * @param {string} lang - Código de idioma para traducciones (default: 'es')
 * @param {number[]} variableIds - IDs específicos de variables (opcional, filtra resultados)
 * @returns {Promise<Array>} Lista de variables con metadata
 */
export const getChannelVariables = async (channelId, lang = 'es', variableIds = null) => {
    let query = `
        SELECT 
            v.id AS variable_id,
            v.column_name,
            v.unit,
            v.chart_type,
            v.axis_name,
            v.axis_id,
            v.axis_min,
            v.axis_function,
            v.aggregation_type,
            v.is_realtime,
            v.is_default,
            COALESCE(cv.display_order, v.display_order) AS display_order,
            COALESCE(vt.name, vt_default.name, 'Unknown') AS variable_name,
            COALESCE(vt.description, vt_default.description) AS variable_description
        FROM channel_variables cv
        INNER JOIN variables v ON cv.variable_id = v.id
        LEFT JOIN variable_translations vt 
            ON v.id = vt.variable_id AND vt.lang = :lang
        LEFT JOIN variable_translations vt_default 
            ON v.id = vt_default.variable_id AND vt_default.lang = 'es'
        WHERE cv.channel_id = :channelId
            AND cv.is_active = true
            AND v.is_active = true
    `;

    const replacements = { channelId, lang };

    // Filtrar por IDs específicos si se proporcionan
    if (variableIds && variableIds.length > 0) {
        query += ` AND v.id IN (:variableIds)`;
        replacements.variableIds = variableIds;
    }

    query += ` ORDER BY display_order ASC NULLS LAST, v.id ASC`;

    const results = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    return results;
};

/**
 * Obtiene la metadata completa para telemetría incluyendo variables
 * 
 * @param {string} channelId - ID del canal (UUID o public_code)
 * @param {string} lang - Código de idioma (default: 'es')
 * @param {number[]} variableIds - IDs específicos de variables (opcional)
 * @returns {Promise<Object|null>} Metadata completa o null
 */
export const getTelemetryMetadata = async (channelId, lang = 'es', variableIds = null) => {
    // Primero intentar buscar por UUID, si falla buscar por public_code
    let resolvedChannelId = channelId;
    
    // Si no es UUID, buscar por public_code
    if (!isValidUUID(channelId)) {
        const channel = await sequelize.query(
            `SELECT id FROM channels WHERE public_code = :publicCode AND deleted_at IS NULL`,
            { replacements: { publicCode: channelId }, type: QueryTypes.SELECT }
        );
        if (channel.length === 0) {
            return null;
        }
        resolvedChannelId = channel[0].id;
    }

    // Obtener metadata del canal
    const channelMeta = await getChannelMetadata(resolvedChannelId, lang);
    if (!channelMeta) {
        return null;
    }

    // Obtener variables del canal
    const variables = await getChannelVariables(resolvedChannelId, lang, variableIds);

    // Construir mapa de variables por ID
    const variablesMap = {};
    const columns = [];
    
    for (const v of variables) {
        variablesMap[v.variable_id] = {
            name: v.variable_name,
            unit: v.unit,
            column: v.column_name,
            chartType: v.chart_type,
            axisName: v.axis_name,
            axisId: v.axis_id,
            aggregationType: v.aggregation_type,
            isRealtime: v.is_realtime
        };
        
        // Agregar columna si no está duplicada
        if (!columns.includes(v.column_name)) {
            columns.push(v.column_name);
        }
    }

    return {
        channel: {
            id: channelMeta.channel_id,
            humanId: channelMeta.channel_human_id,
            publicCode: channelMeta.channel_public_code,
            name: channelMeta.channel_name,
            ch: channelMeta.channel_number
        },
        device: {
            id: channelMeta.device_id,
            name: channelMeta.device_name,
            timezone: channelMeta.device_timezone || 'UTC'
        },
        measurementType: {
            id: channelMeta.measurement_type_id,
            name: channelMeta.measurement_type_name,
            tablePrefix: channelMeta.table_prefix || ''
        },
        variables: variablesMap,
        columns
    };
};

/**
 * Valida si un string es UUID válido
 * @param {string} str - String a validar
 * @returns {boolean}
 */
const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

export default {
    getChannelMetadata,
    getChannelVariables,
    getTelemetryMetadata
};
