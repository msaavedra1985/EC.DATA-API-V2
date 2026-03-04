// tests/helpers/cleanupDB.js
// Helpers para limpiar la base de datos después de tests

import sequelize from '../../src/db/sql/sequelize.js';

const { User, Organization, UserOrganization, RefreshToken, AuditLog, ErrorLog } = sequelize.models;

/**
 * Elimina usuarios de prueba por email
 * @param {string[]} emails - Lista de emails a eliminar
 */
export const cleanupUsers = async (emails) => {
    if (!emails || emails.length === 0) return;
    
    await User.destroy({
        where: {
            email: emails
        },
        force: true // Hard delete
    });
};

/**
 * Elimina organizaciones de prueba por slug
 * @param {string[]} slugs - Lista de slugs a eliminar
 */
export const cleanupOrganizations = async (slugs) => {
    if (!slugs || slugs.length === 0) return;
    
    await Organization.destroy({
        where: {
            slug: slugs
        },
        force: true
    });
};

/**
 * Elimina todos los refresh tokens de un usuario
 * @param {string} userId - ID del usuario
 */
export const cleanupUserTokens = async (userId) => {
    if (!userId) return;
    
    await RefreshToken.destroy({
        where: {
            user_id: userId
        },
        force: true
    });
};

/**
 * Elimina relaciones usuario-organización de un usuario
 * @param {string} userId - ID del usuario
 */
export const cleanupUserOrganizations = async (userId) => {
    if (!userId) return;
    
    await UserOrganization.destroy({
        where: {
            user_id: userId
        },
        force: true
    });
};

/**
 * Elimina audit logs de prueba (opcional)
 * CUIDADO: Solo usar en tests, no en producción
 * @param {string[]} entityIds - IDs de entidades
 */
export const cleanupAuditLogs = async (entityIds) => {
    if (!entityIds || entityIds.length === 0) return;
    
    await AuditLog.destroy({
        where: {
            entity_id: entityIds
        },
        force: true
    });
};

/**
 * Elimina error logs de prueba (opcional)
 * @param {string} userId - ID del usuario
 */
export const cleanupErrorLogs = async (userId) => {
    if (!userId) return;
    
    await ErrorLog.destroy({
        where: {
            user_id: userId
        },
        force: true
    });
};

/**
 * Cleanup completo de un usuario y todas sus relaciones
 * @param {string} userId - ID del usuario
 * @param {string} email - Email del usuario
 */
export const cleanupUserComplete = async (userId, email) => {
    if (!userId && !email) return;
    
    // Eliminar en orden para respetar foreign keys
    if (userId) {
        await cleanupUserTokens(userId);
        await cleanupUserOrganizations(userId);
        await cleanupAuditLogs([userId]);
        await cleanupErrorLogs(userId);
    }
    
    if (email) {
        await cleanupUsers([email]);
    }
};

export default {
    cleanupUsers,
    cleanupOrganizations,
    cleanupUserTokens,
    cleanupUserOrganizations,
    cleanupAuditLogs,
    cleanupErrorLogs,
    cleanupUserComplete
};
