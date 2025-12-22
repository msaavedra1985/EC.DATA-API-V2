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
    // La query obtiene el UUID para Cassandra priorizando legacy_uuid si existe
    // Esto es necesario para dispositivos migrados que tienen datos históricos
    // en Cassandra con un UUID diferente al de PostgreSQL
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
            d.metadata->>'legacy_uuid' AS device_legacy_uuid,
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

    // Para queries de Cassandra, usar legacy_uuid si existe (dispositivos migrados)
    // Si no hay legacy_uuid, usar el device_id de PostgreSQL
    const cassandraUuid = channelMeta.device_legacy_uuid || channelMeta.device_id;

    return {
        channel: {
            id: channelMeta.channel_id,
            humanId: channelMeta.channel_human_id,
            publicCode: channelMeta.channel_public_code,
            name: channelMeta.channel_name,
            ch: channelMeta.channel_number
        },
        device: {
            id: cassandraUuid,  // UUID para Cassandra (legacy_uuid o device_id)
            postgresId: channelMeta.device_id,  // UUID original de PostgreSQL
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

/**
 * Valida si un string es un public_code de canal (formato CHN-XXXXX-X)
 * @param {string} str - String a validar
 * @returns {boolean}
 */
const isChannelPublicCode = (str) => {
    return /^CHN-[A-Z0-9]{5}-[0-9]$/i.test(str);
};

/**
 * Valida si un string es un public_code de dispositivo (formato DEV-XXXXX-X)
 * @param {string} str - String a validar
 * @returns {boolean}
 */
const isDevicePublicCode = (str) => {
    return /^DEV-[A-Z0-9]{5}-[0-9]$/i.test(str);
};

/**
 * TIPOS DE IDENTIFICADOR SOPORTADOS:
 * 
 * 1. publicCode (string): Código público del canal (CHN-XXXXX-X) - Para frontend
 * 2. channelUuid (string): UUID de PostgreSQL del canal - Para cron interno
 * 3. legacyUuid (string): UUID histórico en devices.metadata.legacy_uuid - Para migración/debug
 * 4. deviceChannel (object): { deviceCode: 'DEV-XXXXX-X', ch: 1 } - Para batch processing
 * 
 * PRIORIDAD si se envían múltiples: channelUuid > legacyUuid > deviceChannel > publicCode
 */

/**
 * Resuelve un identificador de canal a su UUID de PostgreSQL
 * Soporta múltiples tipos de identificadores para flexibilidad en queries frontend y cron
 * 
 * @param {Object} identifier - Objeto con el tipo de identificador
 * @param {string} [identifier.publicCode] - Código público del canal (CHN-XXXXX-X)
 * @param {string} [identifier.channelUuid] - UUID de PostgreSQL del canal
 * @param {string} [identifier.legacyUuid] - UUID legacy del dispositivo en Cassandra
 * @param {Object} [identifier.deviceChannel] - Combo dispositivo + canal
 * @param {string} [identifier.deviceChannel.deviceCode] - Código público del dispositivo
 * @param {number} [identifier.deviceChannel.ch] - Número de canal físico
 * @returns {Promise<{channelId: string, source: string}|null>} ID del canal y fuente de resolución
 * @throws {Error} Si se envían múltiples identificadores o formato inválido
 */
export const resolveChannelIdentifier = async (identifier) => {
    // Validar que el identificador sea un objeto
    if (!identifier || typeof identifier !== 'object') {
        throw new Error('Identificador inválido: debe ser un objeto con una propiedad de identificación');
    }

    const { publicCode, channelUuid, legacyUuid, deviceChannel } = identifier;
    
    // Contar cuántos identificadores se proporcionaron
    const providedIdentifiers = [
        publicCode !== undefined,
        channelUuid !== undefined,
        legacyUuid !== undefined,
        deviceChannel !== undefined
    ].filter(Boolean).length;

    if (providedIdentifiers === 0) {
        throw new Error('Identificador requerido: proporcione publicCode, channelUuid, legacyUuid o deviceChannel');
    }

    if (providedIdentifiers > 1) {
        throw new Error('Solo se permite un tipo de identificador por request. Identificadores recibidos: ' + 
            [publicCode && 'publicCode', channelUuid && 'channelUuid', legacyUuid && 'legacyUuid', deviceChannel && 'deviceChannel']
            .filter(Boolean).join(', '));
    }

    // Resolver según el tipo de identificador (prioridad ya garantizada por exclusividad)
    
    // 1. channelUuid - UUID directo de PostgreSQL
    if (channelUuid) {
        if (!isValidUUID(channelUuid)) {
            throw new Error(`channelUuid inválido: ${channelUuid} no es un UUID válido`);
        }
        
        const result = await sequelize.query(
            `SELECT id FROM channels WHERE id = :channelUuid AND deleted_at IS NULL`,
            { replacements: { channelUuid }, type: QueryTypes.SELECT }
        );
        
        if (result.length === 0) {
            return null;
        }
        
        return { channelId: result[0].id, source: 'channelUuid' };
    }

    // 2. legacyUuid - UUID histórico almacenado en devices.metadata.legacy_uuid
    if (legacyUuid) {
        if (!isValidUUID(legacyUuid)) {
            throw new Error(`legacyUuid inválido: ${legacyUuid} no es un UUID válido`);
        }
        
        // Buscar dispositivo por legacy_uuid y retornar todos sus canales
        // Nota: legacyUuid identifica un device, no un canal específico
        // Se necesita ch adicional o retornar error si hay múltiples canales
        const result = await sequelize.query(
            `SELECT c.id 
             FROM channels c
             INNER JOIN devices d ON c.device_id = d.id
             WHERE d.metadata->>'legacy_uuid' = :legacyUuid
               AND c.deleted_at IS NULL
               AND d.deleted_at IS NULL`,
            { replacements: { legacyUuid }, type: QueryTypes.SELECT }
        );
        
        if (result.length === 0) {
            return null;
        }
        
        if (result.length > 1) {
            throw new Error(`legacyUuid ${legacyUuid} tiene ${result.length} canales. Use deviceChannel con ch específico.`);
        }
        
        return { channelId: result[0].id, source: 'legacyUuid' };
    }

    // 3. deviceChannel - Combo dispositivo + número de canal
    if (deviceChannel) {
        const { deviceCode, ch } = deviceChannel;
        
        if (!deviceCode) {
            throw new Error('deviceChannel.deviceCode es requerido');
        }
        
        if (ch === undefined || ch === null) {
            throw new Error('deviceChannel.ch es requerido');
        }
        
        if (!isDevicePublicCode(deviceCode)) {
            throw new Error(`deviceCode inválido: ${deviceCode} no tiene formato DEV-XXXXX-X`);
        }
        
        if (typeof ch !== 'number' || ch < 0) {
            throw new Error(`ch inválido: ${ch} debe ser un número >= 0`);
        }
        
        const result = await sequelize.query(
            `SELECT c.id 
             FROM channels c
             INNER JOIN devices d ON c.device_id = d.id
             WHERE d.public_code = :deviceCode
               AND c.ch = :ch
               AND c.deleted_at IS NULL
               AND d.deleted_at IS NULL`,
            { replacements: { deviceCode: deviceCode.toUpperCase(), ch }, type: QueryTypes.SELECT }
        );
        
        if (result.length === 0) {
            return null;
        }
        
        if (result.length > 1) {
            // Esto puede pasar con canales de energía trifásica (mismo ch, distinto measurement_type)
            throw new Error(`Dispositivo ${deviceCode} tiene ${result.length} canales con ch=${ch}. Use publicCode para especificar.`);
        }
        
        return { channelId: result[0].id, source: 'deviceChannel' };
    }

    // 4. publicCode - Código público del canal
    if (publicCode) {
        if (!isChannelPublicCode(publicCode)) {
            throw new Error(`publicCode inválido: ${publicCode} no tiene formato CHN-XXXXX-X`);
        }
        
        const result = await sequelize.query(
            `SELECT id FROM channels WHERE public_code = :publicCode AND deleted_at IS NULL`,
            { replacements: { publicCode: publicCode.toUpperCase() }, type: QueryTypes.SELECT }
        );
        
        if (result.length === 0) {
            return null;
        }
        
        return { channelId: result[0].id, source: 'publicCode' };
    }

    // No debería llegar aquí
    return null;
};

/**
 * Resuelve un identificador de canal con soporte para legacyUuid + ch
 * Extensión de resolveChannelIdentifier para casos donde legacyUuid tiene múltiples canales
 * 
 * @param {Object} identifier - Objeto con el tipo de identificador
 * @param {string} [identifier.legacyUuid] - UUID legacy del dispositivo
 * @param {number} [identifier.ch] - Número de canal (requerido con legacyUuid si hay múltiples)
 * @returns {Promise<{channelId: string, source: string}|null>}
 */
export const resolveChannelIdentifierWithCh = async (identifier) => {
    const { legacyUuid, ch, ...rest } = identifier;
    
    // Si tiene legacyUuid Y ch, hacer query específica
    if (legacyUuid && ch !== undefined) {
        if (!isValidUUID(legacyUuid)) {
            throw new Error(`legacyUuid inválido: ${legacyUuid} no es un UUID válido`);
        }
        
        const result = await sequelize.query(
            `SELECT c.id 
             FROM channels c
             INNER JOIN devices d ON c.device_id = d.id
             WHERE d.metadata->>'legacy_uuid' = :legacyUuid
               AND c.ch = :ch
               AND c.deleted_at IS NULL
               AND d.deleted_at IS NULL`,
            { replacements: { legacyUuid, ch }, type: QueryTypes.SELECT }
        );
        
        if (result.length === 0) {
            return null;
        }
        
        if (result.length > 1) {
            throw new Error(`legacyUuid ${legacyUuid} + ch=${ch} tiene ${result.length} canales. Use publicCode para especificar.`);
        }
        
        return { channelId: result[0].id, source: 'legacyUuid+ch' };
    }
    
    // Si no, delegar al resolver estándar
    return resolveChannelIdentifier({ legacyUuid, ...rest });
};

export default {
    getChannelMetadata,
    getChannelVariables,
    getTelemetryMetadata,
    resolveChannelIdentifier,
    resolveChannelIdentifierWithCh,
    isValidUUID,
    isChannelPublicCode,
    isDevicePublicCode
};
