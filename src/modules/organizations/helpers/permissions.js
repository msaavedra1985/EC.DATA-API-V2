// modules/organizations/helpers/permissions.js
// Helper para calcular permisos de organizaciones según rol global + role_in_org + jerarquía

import UserOrganization from '../../auth/models/UserOrganization.js';
import Organization from '../models/Organization.js';
import { getDescendants } from './hierarchy.js';
import logger from '../../../utils/logger.js';

const orgLogger = logger.child({ component: 'organizations-permissions' });

/**
 * Obtiene todas las organizaciones a las que un usuario tiene acceso
 * 
 * Sistema Híbrido de Permisos:
 * - system-admin: acceso TOTAL a todas las organizaciones
 * - org-admin global: acceso a orgs donde sea miembro + sus sub-organizaciones
 * - user + role_in_org='admin': acceso a esa org + sus sub-organizaciones
 * - user + role_in_org='member': acceso solo a esa organización específica
 * - user + role_in_org='viewer': solo lectura de esa organización
 * 
 * @param {Object} user - Usuario con campo role incluido (eager loading)
 * @param {boolean} activeOnly - Solo organizaciones activas (default: true)
 * @returns {Promise<Array>} Array de IDs de organizaciones accesibles
 */
export const getUserAccessibleOrganizations = async (user, activeOnly = true) => {
    try {
        // 1. system-admin: acceso a TODO
        if (user.role?.name === 'system-admin') {
            const where = activeOnly ? { isActive: true } : {};
            const allOrgs = await Organization.findAll({ where });
            return allOrgs.map(org => org.id);
        }

        // 2. Obtener membresías del usuario
        const memberships = await UserOrganization.findAll({
            where: { userId: user.id },
            include: [{
                model: Organization,
                as: 'organization',
                where: activeOnly ? { isActive: true } : undefined
            }]
        });

        if (memberships.length === 0) {
            orgLogger.warn({ userId: user.id }, 'User has no organization memberships');
            return [];
        }

        const accessibleOrgIds = new Set();

        // 3. Procesar cada membresía
        for (const membership of memberships) {
            const orgId = membership.organizationId;
            const roleInOrg = membership.roleInOrg;

            // Siempre agregar la org donde es miembro
            accessibleOrgIds.add(orgId);

            // Si es admin de la org (role_in_org='admin'), agregar todas las sub-orgs
            if (roleInOrg === 'admin') {
                const descendants = await getDescendants(orgId, activeOnly);
                descendants.forEach(desc => accessibleOrgIds.add(desc.id));
            }

            // Si es member o viewer, solo tiene acceso a esa org específica (ya agregada)
        }

        return Array.from(accessibleOrgIds);
    } catch (error) {
        orgLogger.error({ err: error, userId: user?.id }, 'Error getting user accessible organizations');
        throw error;
    }
};

/**
 * Verifica si un usuario tiene acceso a una organización específica
 * 
 * @param {Object} user - Usuario con campo role incluido
 * @param {string} organizationId - UUID de la organización
 * @returns {Promise<boolean>} true si tiene acceso
 */
export const hasAccessToOrganization = async (user, organizationId) => {
    try {
        const accessibleOrgIds = await getUserAccessibleOrganizations(user, false);
        return accessibleOrgIds.includes(organizationId);
    } catch (error) {
        orgLogger.error({ err: error, userId: user?.id, organizationId }, 'Error checking organization access');
        throw error;
    }
};

/**
 * Verifica si un usuario es admin de una organización
 * (system-admin global o role_in_org='admin')
 * 
 * @param {Object} user - Usuario con campo role incluido
 * @param {string} organizationId - UUID de la organización
 * @returns {Promise<boolean>} true si es admin
 */
export const isOrganizationAdmin = async (user, organizationId) => {
    try {
        // system-admin: admin de todas las orgs
        if (user.role?.name === 'system-admin') {
            return true;
        }

        // Verificar si tiene role_in_org='admin' para esa organización
        const membership = await UserOrganization.findOne({
            where: {
                userId: user.id,
                organizationId: organizationId
            }
        });

        return membership?.roleInOrg === 'admin';
    } catch (error) {
        orgLogger.error({ err: error, userId: user?.id, organizationId }, 'Error checking if user is org admin');
        throw error;
    }
};

/**
 * Filtra una lista de organizaciones dejando solo las accesibles por el usuario
 * 
 * @param {Array} organizations - Array de organizaciones
 * @param {Object} user - Usuario con campo role incluido
 * @returns {Promise<Array>} Array de organizaciones filtradas
 */
export const filterAccessibleOrganizations = async (organizations, user) => {
    try {
        const accessibleOrgIds = await getUserAccessibleOrganizations(user, false);
        return organizations.filter(org => accessibleOrgIds.includes(org.id));
    } catch (error) {
        orgLogger.error({ err: error, userId: user?.id }, 'Error filtering accessible organizations');
        throw error;
    }
};

/**
 * Obtiene el nivel de permisos del usuario en una organización
 * 
 * @param {Object} user - Usuario con campo role incluido
 * @param {string} organizationId - UUID de la organización
 * @returns {Promise<{hasAccess: boolean, level: string}>} 
 *   level: 'system-admin' | 'admin' | 'member' | 'viewer' | 'none'
 */
export const getPermissionLevel = async (user, organizationId) => {
    try {
        // system-admin: máximo nivel
        if (user.role?.name === 'system-admin') {
            return { hasAccess: true, level: 'system-admin' };
        }

        // Buscar membresía
        const membership = await UserOrganization.findOne({
            where: {
                userId: user.id,
                organizationId: organizationId
            }
        });

        if (!membership) {
            // Verificar si tiene acceso indirecto (padre con roleInOrg='admin')
            const accessibleOrgIds = await getUserAccessibleOrganizations(user, false);
            if (accessibleOrgIds.includes(organizationId)) {
                return { hasAccess: true, level: 'inherited-admin' };
            }

            return { hasAccess: false, level: 'none' };
        }

        return {
            hasAccess: true,
            level: membership.roleInOrg // 'admin' | 'member' | 'viewer'
        };
    } catch (error) {
        orgLogger.error({ err: error, userId: user?.id, organizationId }, 'Error getting permission level');
        throw error;
    }
};

/**
 * Obtiene las organizaciones raíz (root) accesibles por el usuario
 * Útil para construir el árbol desde el top
 * 
 * @param {Object} user - Usuario con campo role incluido
 * @param {boolean} activeOnly - Solo organizaciones activas (default: true)
 * @returns {Promise<Array>} Array de organizaciones raíz accesibles
 */
export const getUserAccessibleRoots = async (user, activeOnly = true) => {
    try {
        const accessibleOrgIds = await getUserAccessibleOrganizations(user, activeOnly);
        
        if (accessibleOrgIds.length === 0) {
            return [];
        }

        // Obtener todas las orgs accesibles
        const organizations = await Organization.findAll({
            where: {
                id: accessibleOrgIds
            }
        });

        // Filtrar solo las raíz (parent_id = null) o cuyo padre NO esté en accessibleOrgIds
        const roots = organizations.filter(org => {
            return !org.parentId || !accessibleOrgIds.includes(org.parentId);
        });

        return roots;
    } catch (error) {
        orgLogger.error({ err: error, userId: user?.id }, 'Error getting user accessible roots');
        throw error;
    }
};

export default {
    getUserAccessibleOrganizations,
    hasAccessToOrganization,
    isOrganizationAdmin,
    filterAccessibleOrganizations,
    getPermissionLevel,
    getUserAccessibleRoots
};
