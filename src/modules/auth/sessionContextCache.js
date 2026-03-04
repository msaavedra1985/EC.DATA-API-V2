// modules/auth/sessionContextCache.js
// Caché Redis para session context - Información de sesión que el frontend necesita sin decodificar JWT

import { getCache, setCache, deleteCache } from '../../db/redis/client.js';
import logger from '../../utils/logger.js';

const CACHE_PREFIX = 'ec:session_context:';

// TTLs alineados con la duración del refresh_token
// Sesión normal: 14 días | Sesión extendida (remember_me): 90 días
export const SESSION_TTL_NORMAL = 60 * 60 * 24 * 14;     // 14 días en segundos
export const SESSION_TTL_EXTENDED = 60 * 60 * 24 * 90;   // 90 días en segundos
const DEFAULT_TTL = SESSION_TTL_NORMAL;

/**
 * Guardar contexto de sesión en Redis
 * Contiene toda la información que el frontend necesita sin decodificar el JWT
 * 
 * @param {string} userId - ID del usuario
 * @param {Object} context - Contexto de sesión
 * @param {string} context.activeOrgId - ID de la organización activa
 * @param {string} context.primaryOrgId - ID de la organización primaria
 * @param {boolean} context.canAccessAllOrgs - Si puede acceder a todas las orgs (system-admin)
 * @param {string} context.role - Nombre del rol
 * @param {string} context.email - Email del usuario
 * @param {string} context.firstName - Nombre del usuario
 * @param {string} context.lastName - Apellido del usuario
 * @param {number} [ttl] - TTL personalizado en segundos (opcional, default: 14 días)
 * @returns {Promise<boolean>} - true si se guardó correctamente
 */
export const setSessionContext = async (userId, context, ttl = DEFAULT_TTL) => {
    try {
        const key = `${CACHE_PREFIX}${userId}`;
        
        // Pasar el objeto directo a setCache (no JSON.stringify manual)
        // setCache serializa automáticamente objetos
        await setCache(key, context, ttl);
        
        logger.debug(`Session context cached for user ${userId} with TTL ${ttl}s`, { component: 'session-context-cache' });
        return true;
    } catch (error) {
        logger.error(`Failed to cache session context for user ${userId}:`, error);
        return false;
    }
};

/**
 * Obtener contexto de sesión desde Redis
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object|null>} - Contexto de sesión o null si no existe
 */
export const getSessionContext = async (userId) => {
    try {
        const key = `${CACHE_PREFIX}${userId}`;
        const value = await getCache(key);
        
        if (!value) {
            logger.debug(`Session context not found in cache for user ${userId}`, { component: 'session-context-cache' });
            return null;
        }
        
        // getCache auto-parsea JSON → value puede ser objeto o string
        if (typeof value === 'object') return value;
        return JSON.parse(value);
    } catch (error) {
        logger.error(`Failed to get session context for user ${userId}:`, error);
        return null;
    }
};

/**
 * Eliminar contexto de sesión de Redis
 * Útil cuando el usuario hace logout o se invalida la sesión
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
export const deleteSessionContext = async (userId) => {
    try {
        const key = `${CACHE_PREFIX}${userId}`;
        await deleteCache(key);
        
        logger.debug(`Session context deleted for user ${userId}`, { component: 'session-context-cache' });
        return true;
    } catch (error) {
        logger.error(`Failed to delete session context for user ${userId}:`, error);
        return false;
    }
};

/**
 * Actualizar solo el activeOrgId en el contexto de sesión
 * Usado cuando se hace switch de organización
 * 
 * @param {string} userId - ID del usuario
 * @param {string} newActiveOrgId - Nuevo ID de organización activa (UUID o null)
 * @param {Object} orgInfo - Información adicional de la organización
 * @param {string} orgInfo.publicCode - Public code de la org (ej: ORG-xxx)
 * @param {string} orgInfo.name - Nombre de la organización
 * @param {string} orgInfo.logoUrl - URL del logo
 * @param {number} [ttl] - TTL personalizado en segundos (opcional)
 * @returns {Promise<Object|null>} - Contexto actualizado o null si falla
 */
export const updateActiveOrg = async (userId, newActiveOrgId, orgInfo = null, ttl = DEFAULT_TTL) => {
    try {
        const context = await getSessionContext(userId);
        
        if (!context) {
            logger.warn(`Cannot update activeOrgId - session context not found for user ${userId}`, { component: 'session-context-cache' });
            return null;
        }
        
        // Actualizar activeOrgId
        context.activeOrgId = newActiveOrgId;
        
        // Actualizar información de la organización activa
        if (newActiveOrgId === null) {
            // Modo God View - sin org activa
            context.activeOrgPublicCode = null;
            context.activeOrgName = null;
            context.activeOrgLogoUrl = null;
        } else if (orgInfo) {
            // Con información de org proporcionada
            context.activeOrgPublicCode = orgInfo.publicCode || null;
            context.activeOrgName = orgInfo.name || null;
            context.activeOrgLogoUrl = orgInfo.logoUrl || null;
        }
        
        await setSessionContext(userId, context, ttl);
        
        logger.debug(`Updated activeOrgId to ${newActiveOrgId} for user ${userId}`, { component: 'session-context-cache' });
        return context;
    } catch (error) {
        logger.error(`Failed to update activeOrgId for user ${userId}:`, error);
        return null;
    }
};

/**
 * Sanitizar session_context para respuestas API
 * Remueve UUIDs internos y solo expone public_codes y campos seguros
 * 
 * @param {Object} context - Session context completo (con UUIDs)
 * @returns {Object} - Session context sanitizado (solo public_codes)
 */
export const sanitizeSessionContext = (context) => {
    if (!context) return null;
    
    return {
        activeOrgPublicCode: context.activeOrgPublicCode || null,
        activeOrgName: context.activeOrgName || null,
        activeOrgLogoUrl: context.activeOrgLogoUrl || null,
        primaryOrgPublicCode: context.primaryOrgPublicCode || null,
        primaryOrgName: context.primaryOrgName || null,
        primaryOrgLogoUrl: context.primaryOrgLogoUrl || null,
        canAccessAllOrgs: context.canAccessAllOrgs || false,
        role: context.role || null,
        email: context.email || null,
        firstName: context.firstName || null,
        lastName: context.lastName || null,
        userPublicCode: context.userPublicCode || null
    };
};
