// modules/organizations/helpers/cascadeDelete.js
// Lógica para eliminación en cascada de organizaciones y preview de impacto

import Organization from '../models/Organization.js';
import User from '../../auth/models/User.js';
import { getDescendants } from './hierarchy.js';
import { apiLogger } from '../../../utils/logger.js';
import { invalidateOrganizationHierarchyBulk } from '../cache.js';
import sequelize from '../../../db/sql/sequelize.js';

/**
 * Calcula el preview de eliminación (impacto) sin ejecutar
 * Muestra qué se va a eliminar si se confirma la operación
 * 
 * @param {Array<string>} organizationIds - Array de UUIDs de organizaciones a eliminar
 * @returns {Promise<Object>} Objeto con estadísticas de impacto
 */
export const getDeletePreview = async (organizationIds) => {
    try {
        const preview = {
            organizations: [],
            affected_organizations_count: 0,
            affected_users_count: 0,
            orphan_users_count: 0,
            affected_descendants_count: 0,
            warnings: []
        };

        // Obtener todas las organizaciones a eliminar (incluyendo descendientes)
        const allOrgsToDelete = new Set();
        
        for (const orgId of organizationIds) {
            const org = await Organization.findByPk(orgId);
            if (!org) {
                preview.warnings.push(`Organization ${orgId} not found`);
                continue;
            }

            allOrgsToDelete.add(org.id);
            
            // Obtener descendientes
            const descendants = await getDescendants(org.id, false);
            descendants.forEach(desc => allOrgsToDelete.add(desc.id));
            
            preview.organizations.push({
                id: org.id,
                public_code: org.public_code,
                name: org.name,
                descendants_count: descendants.length
            });
        }

        preview.affected_organizations_count = allOrgsToDelete.size;
        preview.affected_descendants_count = allOrgsToDelete.size - organizationIds.length;

        // Contar usuarios afectados
        const orgIdsArray = Array.from(allOrgsToDelete);
        const usersInOrgs = await User.findAll({
            where: { organization_id: orgIdsArray },
            attributes: ['id', 'email', 'first_name', 'last_name', 'organization_id']
        });

        preview.affected_users_count = usersInOrgs.length;

        // Identificar usuarios huérfanos (que solo pertenecen a estas orgs)
        // TODO: Cuando implementemos user_organizations many-to-many, verificar si tienen otras orgs
        preview.orphan_users_count = usersInOrgs.length;

        // Warnings adicionales
        if (allOrgsToDelete.size > 10) {
            preview.warnings.push(`High impact: ${allOrgsToDelete.size} organizations will be deleted`);
        }

        if (usersInOrgs.length > 50) {
            preview.warnings.push(`High impact: ${usersInOrgs.length} users will be affected`);
        }

        return preview;
    } catch (error) {
        apiLogger.error({ err: error, organizationIds }, 'Error generating delete preview');
        throw error;
    }
};

/**
 * Elimina organizaciones en cascada con toda su data asociada
 * Debe ejecutarse dentro de una transacción
 * 
 * @param {Array<string>} organizationIds - Array de UUIDs de organizaciones a eliminar
 * @param {Object} options - Opciones de eliminación
 * @param {boolean} options.hardDelete - true = eliminación física, false = soft delete (default)
 * @param {boolean} options.deleteUsers - true = eliminar usuarios, false = reasignar (default: false)
 * @param {string|null} options.reassignOrgId - UUID de org para reasignar usuarios huérfanos
 * @returns {Promise<Object>} Resultado de la eliminación
 */
export const cascadeDelete = async (organizationIds, options = {}) => {
    const {
        hardDelete = false,
        deleteUsers = false,
        reassignOrgId = null
    } = options;

    const transaction = await sequelize.transaction();

    try {
        const result = {
            deleted_organizations: 0,
            deleted_descendants: 0,
            deleted_users: 0,
            reassigned_users: 0,
            invalidated_cache_keys: 0
        };

        // 1. Obtener todas las organizaciones a eliminar (incluyendo descendientes)
        const allOrgsToDelete = new Set();
        const publicCodes = [];
        
        for (const orgId of organizationIds) {
            const org = await Organization.findByPk(orgId, { transaction });
            if (!org) continue;

            allOrgsToDelete.add(org.id);
            publicCodes.push(org.public_code);
            
            // Agregar descendientes
            const descendants = await getDescendants(org.id, false);
            descendants.forEach(desc => {
                allOrgsToDelete.add(desc.id);
                publicCodes.push(desc.public_code);
            });
        }

        const orgIdsArray = Array.from(allOrgsToDelete);

        // 2. Manejar usuarios
        const usersInOrgs = await User.findAll({
            where: { organization_id: orgIdsArray },
            transaction
        });

        if (deleteUsers) {
            // Eliminar usuarios
            for (const user of usersInOrgs) {
                await user.destroy({ force: hardDelete, transaction });
                result.deleted_users++;
            }
        } else if (reassignOrgId) {
            // Reasignar usuarios a otra organización
            for (const user of usersInOrgs) {
                user.organization_id = reassignOrgId;
                await user.save({ transaction });
                result.reassigned_users++;
            }
        } else {
            // No se permite dejar usuarios huérfanos
            throw new Error('Must specify deleteUsers=true or provide reassignOrgId for orphan users');
        }

        // 3. Eliminar organizaciones (de hijos a padres para respetar FK)
        // Ordenar por profundidad descendente
        const orgsToDeleteSorted = [];
        for (const orgId of orgIdsArray) {
            const org = await Organization.findByPk(orgId, { transaction });
            if (org) {
                orgsToDeleteSorted.push(org);
            }
        }

        // Eliminar de hijos a padres (reverse order)
        orgsToDeleteSorted.reverse();
        
        for (const org of orgsToDeleteSorted) {
            await org.destroy({ force: hardDelete, transaction });
            
            if (organizationIds.includes(org.id)) {
                result.deleted_organizations++;
            } else {
                result.deleted_descendants++;
            }
        }

        // 4. Invalidar caché
        await invalidateOrganizationHierarchyBulk(publicCodes);
        result.invalidated_cache_keys = publicCodes.length * 2; // org + hierarchy

        // Commit transaction
        await transaction.commit();

        apiLogger.info({
            ...result,
            organizationIds,
            hardDelete,
            deleteUsers
        }, 'Organizations cascade deleted successfully');

        return result;
    } catch (error) {
        await transaction.rollback();
        apiLogger.error({
            err: error,
            organizationIds,
            options
        }, 'Error in cascade delete');
        throw error;
    }
};

/**
 * Valida si las organizaciones pueden ser eliminadas
 * Verifica restricciones como la org raíz (EC.DATA)
 * 
 * @param {Array<string>} organizationIds - Array de UUIDs de organizaciones
 * @returns {Promise<{valid: boolean, errors: Array<string>}>}
 */
export const validateCanDelete = async (organizationIds) => {
    const errors = [];

    try {
        for (const orgId of organizationIds) {
            const org = await Organization.findByPk(orgId);
            
            if (!org) {
                errors.push(`Organization ${orgId} not found`);
                continue;
            }

            // No permitir eliminar la org raíz (EC.DATA)
            if (org.parent_id === null) {
                errors.push(`Cannot delete root organization: ${org.name} (${org.public_code})`);
            }

            // Otras validaciones de negocio pueden ir aquí
            // Ej: No permitir eliminar si tiene transacciones activas, etc.
        }

        return {
            valid: errors.length === 0,
            errors
        };
    } catch (error) {
        apiLogger.error({ err: error, organizationIds }, 'Error validating delete');
        throw error;
    }
};

export default {
    getDeletePreview,
    cascadeDelete,
    validateCanDelete
};
