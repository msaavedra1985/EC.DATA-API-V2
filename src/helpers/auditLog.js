// helpers/auditLog.js
// Helper centralizado para registro de auditoría global

import AuditLog from '../modules/audit/models/AuditLog.js';
import logger from '../utils/logger.js';

const auditLogger = logger.child({ component: 'audit' });

/**
 * Registra una acción en el log de auditoría global
 * 
 * MANDATORY: Usar esta función para TODAS las operaciones CUD
 * 
 * @param {Object} params - Parámetros de la acción
 * @param {string} params.entityType - Tipo de entidad ('organization', 'user', 'product', etc.)
 * @param {string} params.entityId - ID de la entidad (preferentemente public_code)
 * @param {string} params.action - Acción realizada ('created', 'updated', 'deleted', etc.)
 * @param {string|null} params.performedBy - UUID del usuario (null = sistema)
 * @param {Object|null} params.changes - Cambios: { field: { old, new } }
 * @param {Object|null} params.metadata - Info contextual adicional
 * @param {string|null} params.ipAddress - IP del cliente
 * @param {string|null} params.userAgent - User agent del navegador
 * @param {string|null} params.correlationId - ID de correlación con error_logs (opcional)
 * @returns {Promise<AuditLog>} Log de auditoría creado
 * 
 * @example
 * // Registrar creación de organización
 * await logAuditAction({
 *   entityType: 'organization',
 *   entityId: org.public_code,
 *   action: 'created',
 *   performedBy: req.user.userId,
 *   metadata: { organization_name: org.name },
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent']
 * });
 * 
 * @example
 * // Registrar actualización con cambios específicos
 * await logAuditAction({
 *   entityType: 'organization',
 *   entityId: org.public_code,
 *   action: 'updated',
 *   performedBy: req.user.userId,
 *   changes: {
 *     logo_url: { old: oldLogo, new: newLogo },
 *     name: { old: 'Old Name', new: 'New Name' }
 *   },
 *   metadata: { organization_name: org.name },
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent']
 * });
 */
export const logAuditAction = async ({
    entityType,
    entityId,
    action,
    performedBy = null,
    changes = null,
    metadata = null,
    ipAddress = null,
    userAgent = null,
    correlationId = null
}) => {
    try {
        // Validación básica
        if (!entityType || !entityId || !action) {
            throw new Error('entityType, entityId y action son requeridos para auditoría');
        }

        // Crear registro de auditoría
        const auditLog = await AuditLog.create({
            entity_type: entityType,
            entity_id: entityId,
            action,
            performed_by: performedBy,
            changes,
            metadata,
            ip_address: ipAddress,
            user_agent: userAgent,
            correlation_id: correlationId,
            performed_at: new Date()
        });

        auditLogger.debug({
            msg: 'Audit log created',
            entityType,
            entityId,
            action,
            performedBy
        });

        return auditLog;
    } catch (error) {
        // Log el error pero NO fallar la operación principal
        auditLogger.error({
            err: error,
            msg: 'Error creating audit log - operation will continue',
            entityType,
            entityId,
            action
        });

        // No lanzar error para no interrumpir la operación principal
        // La auditoría es importante pero no debe romper el flujo
        return null;
    }
};

/**
 * Obtiene logs de auditoría de una entidad específica
 * 
 * @param {string} entityType - Tipo de entidad
 * @param {string} entityId - ID de la entidad
 * @param {Object} options - Opciones de paginación
 * @param {number} options.limit - Cantidad de registros (default: 50)
 * @param {number} options.offset - Offset para paginación (default: 0)
 * @returns {Promise<{rows: AuditLog[], count: number}>} Logs y total
 */
export const getEntityAuditLogs = async (entityType, entityId, { limit = 50, offset = 0 } = {}) => {
    try {
        const result = await AuditLog.findAndCountAll({
            where: {
                entity_type: entityType,
                entity_id: entityId
            },
            order: [['performed_at', 'DESC']],
            limit,
            offset,
            include: [
                {
                    association: 'performedByUser',
                    attributes: ['public_code', 'first_name', 'last_name', 'email'],
                    required: false
                }
            ]
        });

        return result;
    } catch (error) {
        auditLogger.error({
            err: error,
            msg: 'Error fetching entity audit logs',
            entityType,
            entityId
        });
        throw error;
    }
};

/**
 * Obtiene logs de auditoría de un usuario específico
 * 
 * @param {string} userId - UUID del usuario
 * @param {Object} options - Opciones de paginación
 * @param {number} options.limit - Cantidad de registros (default: 50)
 * @param {number} options.offset - Offset para paginación (default: 0)
 * @returns {Promise<{rows: AuditLog[], count: number}>} Logs y total
 */
export const getUserAuditLogs = async (userId, { limit = 50, offset = 0 } = {}) => {
    try {
        const result = await AuditLog.findAndCountAll({
            where: {
                performed_by: userId
            },
            order: [['performed_at', 'DESC']],
            limit,
            offset
        });

        return result;
    } catch (error) {
        auditLogger.error({
            err: error,
            msg: 'Error fetching user audit logs',
            userId
        });
        throw error;
    }
};

/**
 * Obtiene actividad reciente de toda la plataforma
 * 
 * @param {Object} options - Opciones de consulta
 * @param {number} options.limit - Cantidad de registros (default: 100)
 * @param {number} options.offset - Offset para paginación (default: 0)
 * @param {string} options.entityType - Filtrar por tipo de entidad (opcional)
 * @param {string} options.action - Filtrar por acción (opcional)
 * @returns {Promise<{rows: AuditLog[], count: number}>} Logs y total
 */
export const getRecentActivity = async ({
    limit = 100,
    offset = 0,
    entityType = null,
    action = null
} = {}) => {
    try {
        const where = {};
        
        if (entityType) {
            where.entity_type = entityType;
        }
        
        if (action) {
            where.action = action;
        }

        const result = await AuditLog.findAndCountAll({
            where,
            order: [['performed_at', 'DESC']],
            limit,
            offset,
            include: [
                {
                    association: 'performedByUser',
                    attributes: ['public_code', 'first_name', 'last_name', 'email'],
                    required: false
                }
            ]
        });

        return result;
    } catch (error) {
        auditLogger.error({
            err: error,
            msg: 'Error fetching recent activity'
        });
        throw error;
    }
};

/**
 * Helper para extraer información de request para auditoría
 * 
 * @param {Object} req - Express request object
 * @returns {Object} { ipAddress, userAgent }
 */
export const extractAuditInfo = (req) => {
    return {
        ipAddress: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null
    };
};

export default {
    logAuditAction,
    getEntityAuditLogs,
    getUserAuditLogs,
    getRecentActivity,
    extractAuditInfo
};
