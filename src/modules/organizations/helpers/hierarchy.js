// modules/organizations/helpers/hierarchy.js
// Funciones para manejar la jerarquía de organizaciones

import Organization from '../models/Organization.js';
import logger from '../../../utils/logger.js';

const orgLogger = logger.child({ component: 'organizations' });

/**
 * Obtiene los hijos directos de una organización
 * 
 * @param {string} organizationId - UUID de la organización padre
 * @param {boolean} activeOnly - Solo organizaciones activas (default: true)
 * @returns {Promise<Array>} Array de organizaciones hijas
 */
export const getChildren = async (organizationId, activeOnly = true) => {
    try {
        const where = { parent_id: organizationId };
        
        if (activeOnly) {
            where.is_active = true;
        }

        const children = await Organization.findAll({
            where,
            order: [['name', 'ASC']]
        });

        return children;
    } catch (error) {
        orgLogger.error({ err: error, organizationId }, 'Error getting organization children');
        throw error;
    }
};

/**
 * Obtiene TODOS los descendientes de una organización (recursivo)
 * 
 * @param {string} organizationId - UUID de la organización padre
 * @param {boolean} activeOnly - Solo organizaciones activas (default: true)
 * @returns {Promise<Array>} Array de TODOS los descendientes
 */
export const getDescendants = async (organizationId, activeOnly = true) => {
    try {
        const descendants = [];
        const queue = [organizationId];

        while (queue.length > 0) {
            const currentId = queue.shift();
            const children = await getChildren(currentId, activeOnly);

            for (const child of children) {
                descendants.push(child);
                queue.push(child.id); // Agregar para procesar sus hijos
            }
        }

        return descendants;
    } catch (error) {
        orgLogger.error({ err: error, organizationId }, 'Error getting organization descendants');
        throw error;
    }
};

/**
 * Obtiene todos los ancestros de una organización (hacia arriba en la jerarquía)
 * 
 * @param {string} organizationId - UUID de la organización
 * @param {boolean} activeOnly - Solo organizaciones activas (default: true)
 * @returns {Promise<Array>} Array de ancestros (padre, abuelo, etc.) ordenados del más cercano al root
 */
export const getAncestors = async (organizationId, activeOnly = true) => {
    try {
        const ancestors = [];
        let currentOrg = await Organization.findByPk(organizationId);

        while (currentOrg && currentOrg.parent_id) {
            const parent = await Organization.findByPk(currentOrg.parent_id);
            
            if (!parent) break;
            
            if (!activeOnly || parent.is_active) {
                ancestors.push(parent);
            }
            
            currentOrg = parent;
        }

        return ancestors;
    } catch (error) {
        orgLogger.error({ err: error, organizationId }, 'Error getting organization ancestors');
        throw error;
    }
};

/**
 * Obtiene el árbol jerárquico completo de una organización y sus descendientes
 * Formato: { id, name, children: [...] }
 * 
 * @param {string} organizationId - UUID de la organización raíz
 * @param {boolean} activeOnly - Solo organizaciones activas (default: true)
 * @returns {Promise<Object>} Objeto con estructura de árbol
 */
export const getHierarchyTree = async (organizationId, activeOnly = true) => {
    try {
        const organization = await Organization.findByPk(organizationId);
        
        if (!organization) {
            throw new Error(`Organization ${organizationId} not found`);
        }

        if (activeOnly && !organization.is_active) {
            return null;
        }

        const children = await getChildren(organizationId, activeOnly);
        const childrenTrees = await Promise.all(
            children.map(child => getHierarchyTree(child.id, activeOnly))
        );

        return {
            id: organization.id,
            public_code: organization.public_code,
            slug: organization.slug,
            name: organization.name,
            logo_url: organization.logo_url,
            is_active: organization.is_active,
            children: childrenTrees.filter(Boolean) // Filtrar nulls si hay inactivas
        };
    } catch (error) {
        orgLogger.error({ err: error, organizationId }, 'Error getting hierarchy tree');
        throw error;
    }
};

/**
 * Detecta si crear una relación padre-hijo crearía un ciclo
 * 
 * @param {string} organizationId - UUID de la organización que se quiere mover
 * @param {string} newParentId - UUID del nuevo padre propuesto
 * @returns {Promise<boolean>} true si crearía un ciclo (NO permitir)
 */
export const wouldCreateCycle = async (organizationId, newParentId) => {
    try {
        // Si no hay nuevo padre, no hay ciclo
        if (!newParentId) {
            return false;
        }

        // Si el nuevo padre es la misma org, es un ciclo
        if (organizationId === newParentId) {
            return true;
        }

        // Verificar si newParentId es descendiente de organizationId
        const descendants = await getDescendants(organizationId, false); // Incluir inactivas
        const descendantIds = descendants.map(d => d.id);

        if (descendantIds.includes(newParentId)) {
            orgLogger.warn({
                organizationId,
                newParentId
            }, 'Cycle detected: newParent is a descendant of organization');
            return true;
        }

        return false;
    } catch (error) {
        orgLogger.error({ err: error, organizationId, newParentId }, 'Error detecting cycle');
        throw error;
    }
};

/**
 * Calcula la profundidad de una organización en la jerarquía
 * Root = 0, hijos directos de root = 1, etc.
 * 
 * @param {string} organizationId - UUID de la organización
 * @returns {Promise<number>} Profundidad (nivel) en la jerarquía
 */
export const getDepth = async (organizationId) => {
    try {
        const ancestors = await getAncestors(organizationId, false);
        return ancestors.length; // Root tiene 0 ancestros = profundidad 0
    } catch (error) {
        orgLogger.error({ err: error, organizationId }, 'Error calculating organization depth');
        throw error;
    }
};

/**
 * Valida si una organización puede tener un nuevo hijo
 * Verifica el límite de profundidad máxima (5 niveles)
 * 
 * @param {string} parentId - UUID del padre propuesto
 * @param {number} maxDepth - Profundidad máxima permitida (default: 5)
 * @returns {Promise<{valid: boolean, currentDepth: number, reason?: string}>}
 */
export const canHaveChild = async (parentId, maxDepth = 5) => {
    try {
        const currentDepth = await getDepth(parentId);
        const childDepth = currentDepth + 1;

        if (childDepth > maxDepth) {
            return {
                valid: false,
                currentDepth,
                reason: `Maximum hierarchy depth (${maxDepth}) would be exceeded. Current depth: ${currentDepth}`
            };
        }

        return {
            valid: true,
            currentDepth
        };
    } catch (error) {
        orgLogger.error({ err: error, parentId }, 'Error validating if can have child');
        throw error;
    }
};

/**
 * Obtiene la organización raíz del sistema (EC.DATA)
 * La raíz es la que tiene parent_id = null
 * 
 * @returns {Promise<Organization|null>} Organización raíz
 */
export const getRootOrganization = async () => {
    try {
        const root = await Organization.findOne({
            where: { parent_id: null }
        });

        return root;
    } catch (error) {
        orgLogger.error({ err: error }, 'Error getting root organization');
        throw error;
    }
};

/**
 * Cuenta el total de organizaciones en el árbol de una org (incluyendo ella misma)
 * 
 * @param {string} organizationId - UUID de la organización
 * @returns {Promise<number>} Total de organizaciones (incluyendo la org y todos sus descendientes)
 */
export const countOrganizationsInTree = async (organizationId) => {
    try {
        const descendants = await getDescendants(organizationId, false);
        return descendants.length + 1; // +1 para incluir la organización misma
    } catch (error) {
        orgLogger.error({ err: error, organizationId }, 'Error counting organizations in tree');
        throw error;
    }
};

/**
 * Obtiene el path completo de una organización (breadcrumb)
 * Ejemplo: "EC.DATA / Ventas / LATAM / Chile"
 * 
 * @param {string} organizationId - UUID de la organización
 * @param {string} separator - Separador entre niveles (default: ' / ')
 * @returns {Promise<string>} Path completo desde la raíz hasta la org
 */
export const getOrganizationPath = async (organizationId, separator = ' / ') => {
    try {
        const organization = await Organization.findByPk(organizationId);
        if (!organization) {
            throw new Error(`Organization ${organizationId} not found`);
        }

        const ancestors = await getAncestors(organizationId, false);
        
        // Invertir para tener desde raíz hasta la org actual
        const path = [...ancestors.reverse(), organization]
            .map(org => org.name)
            .join(separator);

        return path;
    } catch (error) {
        orgLogger.error({ err: error, organizationId }, 'Error getting organization path');
        throw error;
    }
};

/**
 * Construye un árbol jerárquico desde una lista plana de organizaciones
 * 
 * @param {Array} organizations - Lista plana de organizaciones
 * @returns {Array} Array de organizaciones raíz con sus children anidados
 */
export const buildTree = (organizations) => {
    const orgMap = {};
    const roots = [];

    // Crear mapa de organizaciones por ID
    organizations.forEach(org => {
        orgMap[org.id] = { ...org.toJSON(), children: [] };
    });

    // Construir árbol
    organizations.forEach(org => {
        const orgNode = orgMap[org.id];
        
        if (!org.parent_id) {
            // Es una raíz
            roots.push(orgNode);
        } else if (orgMap[org.parent_id]) {
            // Agregar como hijo de su padre
            orgMap[org.parent_id].children.push(orgNode);
        }
    });

    return roots;
};

/**
 * Obtiene los hijos directos con información de si tienen más descendientes
 * Útil para lazy loading de árbol (cargar 2 niveles a la vez)
 * 
 * @param {string} organizationId - UUID de la organización padre
 * @param {boolean} activeOnly - Solo organizaciones activas (default: true)
 * @returns {Promise<Array>} Array de hijos con campo hasChildren
 */
export const getChildrenWithHasChildren = async (organizationId, activeOnly = true) => {
    try {
        const children = await getChildren(organizationId, activeOnly);
        
        // Para cada hijo, verificar si tiene hijos propios
        const childrenWithFlag = await Promise.all(
            children.map(async (child) => {
                const grandchildren = await getChildren(child.id, activeOnly);
                
                return {
                    id: child.id,
                    public_code: child.public_code,
                    slug: child.slug,
                    name: child.name,
                    parent_id: child.parent_id,
                    logo_url: child.logo_url,
                    is_active: child.is_active,
                    hasChildren: grandchildren.length > 0
                };
            })
        );

        return childrenWithFlag;
    } catch (error) {
        orgLogger.error({ err: error, organizationId }, 'Error getting children with hasChildren flag');
        throw error;
    }
};

/**
 * Obtiene N niveles del árbol desde una organización (lazy loading)
 * 
 * @param {string} organizationId - UUID de la organización raíz
 * @param {number} levels - Número de niveles a cargar (default: 2)
 * @param {boolean} activeOnly - Solo organizaciones activas (default: true)
 * @returns {Promise<Object>} Árbol con N niveles cargados + hasChildren flag
 */
export const getTreeLevels = async (organizationId, levels = 2, activeOnly = true) => {
    try {
        const organization = await Organization.findByPk(organizationId);
        
        if (!organization) {
            throw new Error(`Organization ${organizationId} not found`);
        }

        if (activeOnly && !organization.is_active) {
            return null;
        }

        // Si solo queremos 0 niveles, devolver solo la org sin children
        if (levels === 0) {
            const childrenCount = await getChildren(organizationId, activeOnly);
            return {
                id: organization.id,
                public_code: organization.public_code,
                slug: organization.slug,
                name: organization.name,
                parent_id: organization.parent_id,
                logo_url: organization.logo_url,
                is_active: organization.is_active,
                hasChildren: childrenCount.length > 0,
                children: []
            };
        }

        // Cargar children recursivamente hasta el nivel especificado
        const children = await getChildren(organizationId, activeOnly);
        const childrenTrees = await Promise.all(
            children.map(child => getTreeLevels(child.id, levels - 1, activeOnly))
        );

        return {
            id: organization.id,
            public_code: organization.public_code,
            slug: organization.slug,
            name: organization.name,
            parent_id: organization.parent_id,
            logo_url: organization.logo_url,
            is_active: organization.is_active,
            hasChildren: children.length > 0,
            children: childrenTrees.filter(Boolean)
        };
    } catch (error) {
        orgLogger.error({ err: error, organizationId, levels }, 'Error getting tree levels');
        throw error;
    }
};

export default {
    getChildren,
    getDescendants,
    getAncestors,
    getHierarchyTree,
    wouldCreateCycle,
    getDepth,
    canHaveChild,
    getRootOrganization,
    countOrganizationsInTree,
    getOrganizationPath,
    buildTree,
    getChildrenWithHasChildren,
    getTreeLevels
};
