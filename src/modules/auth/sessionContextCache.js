// modules/auth/sessionContextCache.js
// Caché Redis para session context - Información de sesión que el frontend necesita sin decodificar JWT

import { getCache, setCache, deleteCache } from '../../db/redis/client.js';
import logger from '../../utils/logger.js';

const CACHE_PREFIX = 'session_context:';
const CACHE_TTL = 60 * 15; // 15 minutos (igual que el access token)

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
 * @returns {Promise<boolean>} - true si se guardó correctamente
 */
export const setSessionContext = async (userId, context) => {
    try {
        const key = `${CACHE_PREFIX}${userId}`;
        const value = JSON.stringify(context);
        
        await setCache(key, value, CACHE_TTL);
        
        logger.debug(`Session context cached for user ${userId}`, { component: 'session-context-cache' });
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
 * @param {string} newActiveOrgId - Nuevo ID de organización activa
 * @returns {Promise<Object|null>} - Contexto actualizado o null si falla
 */
export const updateActiveOrg = async (userId, newActiveOrgId) => {
    try {
        const context = await getSessionContext(userId);
        
        if (!context) {
            logger.warn(`Cannot update activeOrgId - session context not found for user ${userId}`, { component: 'session-context-cache' });
            return null;
        }
        
        context.activeOrgId = newActiveOrgId;
        await setSessionContext(userId, context);
        
        logger.debug(`Updated activeOrgId to ${newActiveOrgId} for user ${userId}`, { component: 'session-context-cache' });
        return context;
    } catch (error) {
        logger.error(`Failed to update activeOrgId for user ${userId}:`, error);
        return null;
    }
};
