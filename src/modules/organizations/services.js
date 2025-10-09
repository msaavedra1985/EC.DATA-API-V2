import UserOrganization from '../auth/models/UserOrganization.js';
import User from '../auth/models/User.js';
import Role from '../auth/models/Role.js';
import Organization from './models/Organization.js';
import * as orgRepository from './repository.js';
import { getCache, setCache, deleteCache } from '../../db/redis/client.js';

/**
 * Servicio de organizaciones
 * Maneja lógica de scope, jerarquía y permisos organizacionales
 */

const ORG_SCOPE_CACHE_TTL = 900; // 15 minutos
const ORG_TREE_CACHE_TTL = 1800; // 30 minutos

// Cache key prefixes
const ORG_SCOPE_CACHE_PREFIX = 'ec:org_scope:';
const ORG_TREE_CACHE_PREFIX = 'ec:org_tree:';

/**
 * Obtener organizaciones del usuario
 * Retorna todas las organizaciones donde el usuario es miembro
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} - Lista de organizaciones con is_primary
 */
export const getUserOrganizations = async (userId) => {
    const userOrgs = await UserOrganization.findAll({
        where: { user_id: userId },
        include: [{
            model: Organization,
            as: 'organization',
            attributes: ['id', 'slug', 'name', 'logo_url', 'is_active', 'parent_id']
        }],
        order: [['is_primary', 'DESC'], ['joined_at', 'ASC']]
    });

    return userOrgs.map(uo => ({
        organization_id: uo.organization.id,
        slug: uo.organization.slug,
        name: uo.organization.name,
        logo_url: uo.organization.logo_url,
        is_primary: uo.is_primary,
        is_active: uo.organization.is_active,
        parent_id: uo.organization.parent_id,
        joined_at: uo.joined_at
    }));
};

/**
 * Obtener organización primaria del usuario
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object|null>} - Organización primaria o null
 */
export const getPrimaryOrganization = async (userId) => {
    const userOrg = await UserOrganization.findOne({
        where: { 
            user_id: userId,
            is_primary: true
        },
        include: [{
            model: Organization,
            as: 'organization',
            attributes: ['id', 'slug', 'name', 'logo_url', 'parent_id', 'is_active']
        }]
    });

    if (!userOrg) {
        return null;
    }

    return {
        organization_id: userOrg.organization.id,
        slug: userOrg.organization.slug,
        name: userOrg.organization.name,
        logo_url: userOrg.organization.logo_url,
        parent_id: userOrg.organization.parent_id,
        is_active: userOrg.organization.is_active
    };
};

/**
 * Obtener todos los descendientes de una organización (con cache)
 * 
 * @param {string} organizationId - ID de la organización
 * @returns {Promise<Array>} - Lista de IDs de descendientes
 */
export const getOrganizationDescendantsWithCache = async (organizationId) => {
    const cacheKey = `${ORG_TREE_CACHE_PREFIX}${organizationId}`;

    // Intentar obtener del cache
    const cached = await getCache(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Obtener de la base de datos
    const descendants = await orgRepository.getOrganizationDescendants(organizationId);

    // Guardar en cache
    await setCache(cacheKey, JSON.stringify(descendants), ORG_TREE_CACHE_TTL);

    return descendants;
};

/**
 * Calcular scope organizacional del usuario
 * Retorna todas las organizaciones a las que el usuario puede acceder
 * basado en su rol y membresías
 * 
 * @param {string} userId - ID del usuario
 * @param {string} roleSlug - Slug del rol del usuario
 * @returns {Promise<Object>} - Scope organizacional con IDs accesibles
 */
export const calculateOrganizationScope = async (userId, roleSlug) => {
    // system-admin puede acceder a todas las organizaciones
    if (roleSlug === 'system-admin') {
        const allOrgs = await Organization.findAll({
            attributes: ['id'],
            where: { is_active: true }
        });

        return {
            canAccessAll: true,
            organizationIds: allOrgs.map(org => org.id),
            userOrganizations: await getUserOrganizations(userId)
        };
    }

    // Obtener organizaciones del usuario
    const userOrgs = await getUserOrganizations(userId);
    const directOrgIds = userOrgs.map(uo => uo.organization_id);

    if (directOrgIds.length === 0) {
        return {
            canAccessAll: false,
            organizationIds: [],
            userOrganizations: []
        };
    }

    // org-admin puede acceder a su organización y todos sus descendientes
    if (roleSlug === 'org-admin') {
        const allAccessible = new Set(directOrgIds);

        // Por cada org del usuario, agregar descendientes
        for (const orgId of directOrgIds) {
            const descendants = await getOrganizationDescendantsWithCache(orgId);
            descendants.forEach(id => allAccessible.add(id));
        }

        return {
            canAccessAll: false,
            organizationIds: Array.from(allAccessible),
            userOrganizations: userOrgs
        };
    }

    // org-manager puede acceder solo a descendientes directos (hijos)
    if (roleSlug === 'org-manager') {
        const allAccessible = new Set(directOrgIds);

        for (const orgId of directOrgIds) {
            const children = await orgRepository.getChildOrganizations(orgId);
            children.forEach(child => allAccessible.add(child.id));
        }

        return {
            canAccessAll: false,
            organizationIds: Array.from(allAccessible),
            userOrganizations: userOrgs
        };
    }

    // Roles restantes (user, viewer, guest, demo) solo acceden a sus organizaciones directas
    return {
        canAccessAll: false,
        organizationIds: directOrgIds,
        userOrganizations: userOrgs
    };
};

/**
 * Obtener scope organizacional con cache
 * 
 * @param {string} userId - ID del usuario
 * @param {string} roleSlug - Slug del rol
 * @returns {Promise<Object>} - Scope organizacional
 */
export const getOrganizationScope = async (userId, roleSlug) => {
    const cacheKey = `${ORG_SCOPE_CACHE_PREFIX}${userId}`;

    // Intentar obtener del cache
    const cached = await getCache(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Calcular scope
    const scope = await calculateOrganizationScope(userId, roleSlug);

    // Guardar en cache
    await setCache(cacheKey, JSON.stringify(scope), ORG_SCOPE_CACHE_TTL);

    return scope;
};

/**
 * Verificar si un usuario puede acceder a una organización
 * 
 * @param {string} userId - ID del usuario
 * @param {string} organizationId - ID de la organización
 * @param {string} roleSlug - Slug del rol del usuario
 * @returns {Promise<boolean>} - true si puede acceder
 */
export const canAccessOrganization = async (userId, organizationId, roleSlug) => {
    const scope = await getOrganizationScope(userId, roleSlug);

    if (scope.canAccessAll) {
        return true;
    }

    return scope.organizationIds.includes(organizationId);
};

/**
 * Cambiar organización primaria del usuario
 * 
 * @param {string} userId - ID del usuario
 * @param {string} newPrimaryOrgId - ID de la nueva organización primaria
 * @returns {Promise<Object>} - Resultado del cambio
 */
export const switchPrimaryOrganization = async (userId, newPrimaryOrgId) => {
    // Verificar que el usuario pertenece a la organización
    const userOrg = await UserOrganization.findOne({
        where: {
            user_id: userId,
            organization_id: newPrimaryOrgId
        }
    });

    if (!userOrg) {
        throw new Error('USER_NOT_MEMBER_OF_ORGANIZATION');
    }

    // Usar transacción para garantizar consistencia
    const { sequelize } = UserOrganization;
    const transaction = await sequelize.transaction();

    try {
        // Remover is_primary de todas las organizaciones del usuario
        await UserOrganization.update(
            { is_primary: false },
            { 
                where: { user_id: userId },
                transaction
            }
        );

        // Marcar la nueva como primaria
        await UserOrganization.update(
            { is_primary: true },
            {
                where: {
                    user_id: userId,
                    organization_id: newPrimaryOrgId
                },
                transaction
            }
        );

        await transaction.commit();

        // Invalidar cache de scope organizacional
        const cacheKey = `${ORG_SCOPE_CACHE_PREFIX}${userId}`;
        await deleteCache(cacheKey);

        return {
            success: true,
            new_primary_org_id: newPrimaryOrgId
        };

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Invalidar cache de scope organizacional para un usuario
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<void>}
 */
export const invalidateUserOrgScope = async (userId) => {
    const cacheKey = `${ORG_SCOPE_CACHE_PREFIX}${userId}`;
    await deleteCache(cacheKey);
};

/**
 * Invalidar cache de descendientes de una organización
 * 
 * @param {string} organizationId - ID de la organización
 * @returns {Promise<void>}
 */
export const invalidateOrgDescendants = async (organizationId) => {
    const cacheKey = `${ORG_TREE_CACHE_PREFIX}${organizationId}`;
    await deleteCache(cacheKey);
};