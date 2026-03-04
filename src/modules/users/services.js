// modules/users/services.js
// Lógica de negocio para gestión de usuarios

import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import * as userRepository from './repository.js';
import * as orgServices from '../organizations/services.js';
import { generateUuidV7, generateHumanId, generatePublicCode } from '../../utils/identifiers.js';
import Role from '../auth/models/Role.js';
import Organization from '../organizations/models/Organization.js';
import auditLog from '../../helpers/auditLog.js';
import sequelize from '../../db/sql/sequelize.js';
import pino from 'pino';

const userLogger = pino({ name: 'users-service' });

/**
 * Jerarquía de roles (menor a mayor privilegio)
 * Nadie puede asignar roles superiores al propio
 */
const ROLE_HIERARCHY = {
    'demo': 0,
    'guest': 1,
    'viewer': 2,
    'user': 3,
    'org-manager': 4,
    'org-admin': 5,
    'system-admin': 6
};


/**
 * Normaliza email (trim + toLowerCase)
 * 
 * @param {string} email - Email sin normalizar
 * @returns {string} - Email normalizado
 */
export const normalizeEmail = (email) => {
    return email.trim().toLowerCase();
};

/**
 * Valida jerarquía de roles
 * Impide que un usuario asigne roles superiores al propio
 * 
 * @param {string} currentUserRole - Rol del usuario que realiza la acción
 * @param {string} targetRole - Rol que se intenta asignar
 * @returns {boolean} - true si es válido
 * @throws {Error} - Si la jerarquía no es válida
 */
export const validateRoleHierarchy = (currentUserRole, targetRole) => {
    const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
    
    if (targetLevel > currentLevel) {
        const error = new Error('Cannot assign role higher than your own');
        error.status = 403;
        error.code = 'ROLE_HIERARCHY_VIOLATION';
        error.details = {
            current_role: currentUserRole,
            target_role: targetRole
        };
        throw error;
    }
    
    return true;
};

/**
 * Calcula el scope de usuarios accesibles según rol y organizaciones
 * Retorna lista de user IDs (UUIDs) que el usuario puede gestionar
 * 
 * @param {string} userId - UUID del usuario que solicita
 * @param {string} roleSlug - Rol del usuario
 * @returns {Promise<Object>} - { canAccessAll, userIds }
 */
export const getUserScope = async (userId, roleSlug) => {
    // system-admin puede acceder a todos los usuarios
    if (roleSlug === 'system-admin') {
        return {
            canAccessAll: true,
            userIds: [] // No filtrar por IDs
        };
    }
    
    // Obtener scope organizacional del usuario
    const orgScope = await orgServices.getOrganizationScope(userId, roleSlug);
    
    // Obtener usuarios que pertenecen a las organizaciones accesibles
    const users = await userRepository.getUserModelsByOrganizations(orgScope.organizationIds);
    
    return {
        canAccessAll: false,
        userIds: users.map(u => u.id),
        organizationIds: orgScope.organizationIds
    };
};

/**
 * Crear nuevo usuario
 * Valida email único, genera identificadores, hashea password
 * 
 * @param {Object} userData - Datos del usuario
 * @param {Object} actor - Usuario que realiza la acción
 * @param {Object} metadata - IP, user-agent, etc
 * @returns {Promise<Object>} - Usuario creado
 */
export const createUser = async (userData, actor, metadata = {}) => {
    // Normalizar email
    const email = normalizeEmail(userData.email);
    
    // Verificar que el email no existe
    const existing = await userRepository.findUserByEmail(email, false);
    if (existing) {
        const error = new Error('Email already exists');
        error.status = 409;
        error.code = 'EMAIL_ALREADY_EXISTS';
        throw error;
    }
    
    // Validar jerarquía de roles
    validateRoleHierarchy(actor.role, userData.role);
    
    // Buscar el rol por name
    const role = await Role.findOne({ where: { name: userData.role } });
    if (!role) {
        const error = new Error('Role not found');
        error.status = 404;
        error.code = 'ROLE_NOT_FOUND';
        throw error;
    }
    
    // Resolver organizationId si se proporciona publicCode
    let organizationId = null;
    if (userData.organizationId) {
        const org = await Organization.findOne({
            where: { publicCode: userData.organizationId }
        });
        
        if (!org) {
            const error = new Error('Organization not found');
            error.status = 404;
            error.code = 'ORGANIZATION_NOT_FOUND';
            throw error;
        }
        
        organizationId = org.id;
    }
    
    // Generar identificadores usando utilidades del proyecto
    const userId = generateUuidV7();
    const publicCode = generatePublicCode('USR');
    
    // Hashear password (fuera de la transacción, es CPU-bound)
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const newUser = await sequelize.transaction(async (t) => {
        // Generar humanId dentro de la transacción para ver inserts previos
        const User = (await import('../auth/models/User.js')).default;
        const humanId = await generateHumanId(User, 'organizationId', organizationId, { transaction: t });
        
        // Crear usuario
        const createdUser = await userRepository.createUser({
            id: userId,
            humanId,
            publicCode,
            email,
            passwordHash,
            firstName: userData.firstName,
            lastName: userData.lastName,
            roleId: role.id,
            organizationId,
            isActive: true,
            phone: userData.phone || null,
            language: userData.language || 'es',
            timezone: userData.timezone || 'America/Argentina/Buenos_Aires',
            avatarUrl: userData.avatarUrl || null
        }, { transaction: t });
        
        // Agregar usuario a organizaciones adicionales si se proporcionan
        if (userData.organizationMemberships && userData.organizationMemberships.length > 0) {
            const UserOrganization = (await import('../auth/models/UserOrganization.js')).default;
            
            for (const membership of userData.organizationMemberships) {
                const org = await Organization.findOne({
                    where: { publicCode: membership.organizationId },
                    transaction: t
                });
                
                if (!org) {
                    const error = new Error(`Organización no encontrada para membership: ${membership.organizationId}`);
                    error.status = 404;
                    error.code = 'ORGANIZATION_NOT_FOUND';
                    throw error;
                }
                
                const existingRelation = await UserOrganization.findOne({
                    where: {
                        userId,
                        organizationId: org.id
                    },
                    transaction: t
                });
                
                if (existingRelation) {
                    if (membership.isPrimary && !existingRelation.isPrimary) {
                        await UserOrganization.update(
                            { isPrimary: false },
                            { where: { userId }, transaction: t }
                        );
                        
                        existingRelation.isPrimary = true;
                        await existingRelation.save({ transaction: t });
                    }
                    continue;
                }
                
                if (membership.isPrimary) {
                    await UserOrganization.update(
                        { isPrimary: false },
                        { where: { userId }, transaction: t }
                    );
                }
                
                await UserOrganization.create({
                    userId,
                    organizationId: org.id,
                    isPrimary: membership.isPrimary || false,
                    joinedAt: new Date()
                }, { transaction: t });
            }
        }
        
        return createdUser;
    });
    
    // Cachear usuario después del commit exitoso
    const { cacheUser } = await import('./cache.js');
    await cacheUser(newUser.publicCode, newUser).catch(() => {});
    
    // Auditar creación (fuera de la transacción, best-effort)
    await auditLog.log({
        entityType: 'user',
        entityId: userId,
        action: 'create',
        performedBy: actor.userId,
        changes: {
            email: { old: null, new: email },
            role: { old: null, new: userData.role },
            organizationId: { old: null, new: organizationId }
        },
        metadata: {
            ...metadata,
            sendInvite: userData.sendInvite || false,
            organizationMembershipsCount: userData.organizationMemberships?.length || 0
        }
    });
    
    userLogger.info({ userId, email, role: userData.role }, 'User created successfully');
    
    return newUser;
};

/**
 * Actualizar usuario existente
 * Valida scope, jerarquía de roles, y audita cambios
 * 
 * @param {string} targetUserId - Public code del usuario a actualizar
 * @param {Object} updateData - Datos a actualizar
 * @param {Object} actor - Usuario que realiza la acción
 * @param {Object} metadata - IP, user-agent, etc
 * @returns {Promise<Object>} - Usuario actualizado
 */
export const updateUser = async (targetUserId, updateData, actor, metadata = {}) => {
    // Obtener usuario target
    const targetUser = await userRepository.getUserModelById(targetUserId, true);
    if (!targetUser) {
        const error = new Error('User not found');
        error.status = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
    }
    
    // Verificar scope (excepto system-admin)
    if (actor.role !== 'system-admin') {
        const scope = await getUserScope(actor.userId, actor.role);
        if (!scope.canAccessAll && !scope.userIds.includes(targetUser.id)) {
            const error = new Error('User not in your organization scope');
            error.status = 403;
            error.code = 'SCOPE_VIOLATION';
            throw error;
        }
    }
    
    // Preparar objeto de cambios para auditoría
    const changes = {};
    const dataToUpdate = {};
    
    // Actualizar firstName
    if (updateData.firstName !== undefined && updateData.firstName !== targetUser.firstName) {
        changes.firstName = { old: targetUser.firstName, new: updateData.firstName };
        dataToUpdate.firstName = updateData.firstName;
    }
    
    // Actualizar lastName
    if (updateData.lastName !== undefined && updateData.lastName !== targetUser.lastName) {
        changes.lastName = { old: targetUser.lastName, new: updateData.lastName };
        dataToUpdate.lastName = updateData.lastName;
    }
    
    // Actualizar role
    if (updateData.role !== undefined && updateData.role !== targetUser.role.name) {
        // Validar jerarquía
        validateRoleHierarchy(actor.role, updateData.role);
        
        const newRole = await Role.findOne({ where: { name: updateData.role } });
        if (!newRole) {
            const error = new Error('Role not found');
            error.status = 404;
            error.code = 'ROLE_NOT_FOUND';
            throw error;
        }
        
        changes.role = { old: targetUser.role.name, new: updateData.role };
        dataToUpdate.roleId = newRole.id;
    }
    
    // Actualizar organizationId (solo system-admin)
    if (updateData.organizationId !== undefined) {
        if (actor.role !== 'system-admin') {
            const error = new Error('Only system-admin can change user organization');
            error.status = 403;
            error.code = 'INSUFFICIENT_PERMISSIONS';
            throw error;
        }
        
        let newOrgId = null;
        if (updateData.organizationId) {
            const org = await Organization.findOne({
                where: { publicCode: updateData.organizationId }
            });
            
            if (!org) {
                const error = new Error('Organization not found');
                error.status = 404;
                error.code = 'ORGANIZATION_NOT_FOUND';
                throw error;
            }
            
            newOrgId = org.id;
        }
        
        if (newOrgId !== targetUser.organizationId) {
            changes.organizationId = { old: targetUser.organizationId, new: newOrgId };
            dataToUpdate.organizationId = newOrgId;
        }
    }
    
    // Actualizar isActive
    if (updateData.isActive !== undefined && updateData.isActive !== targetUser.isActive) {
        changes.isActive = { old: targetUser.isActive, new: updateData.isActive };
        dataToUpdate.isActive = updateData.isActive;
    }
    
    // Actualizar phone
    if (updateData.phone !== undefined && updateData.phone !== targetUser.phone) {
        changes.phone = { old: targetUser.phone, new: updateData.phone };
        dataToUpdate.phone = updateData.phone;
    }
    
    // Actualizar language
    if (updateData.language !== undefined && updateData.language !== targetUser.language) {
        changes.language = { old: targetUser.language, new: updateData.language };
        dataToUpdate.language = updateData.language;
    }
    
    // Actualizar timezone
    if (updateData.timezone !== undefined && updateData.timezone !== targetUser.timezone) {
        changes.timezone = { old: targetUser.timezone, new: updateData.timezone };
        dataToUpdate.timezone = updateData.timezone;
    }
    
    // Actualizar avatarUrl
    if (updateData.avatarUrl !== undefined && updateData.avatarUrl !== targetUser.avatarUrl) {
        changes.avatarUrl = { old: targetUser.avatarUrl, new: updateData.avatarUrl };
        dataToUpdate.avatarUrl = updateData.avatarUrl;
    }
    
    // Si no hay cambios, retornar usuario actual
    if (Object.keys(dataToUpdate).length === 0) {
        return userRepository.toPublicUserDto(targetUser);
    }
    
    // Actualizar usuario
    const updatedUser = await userRepository.updateUser(targetUser.id, dataToUpdate);
    
    // Auditar cambios
    await auditLog.log({
        entityType: 'user',
        entityId: targetUser.id,
        action: 'update',
        performedBy: actor.userId,
        changes,
        metadata
    });
    
    userLogger.info({ userId: targetUser.id, changes }, 'User updated successfully');
    
    return updatedUser;
};

/**
 * Eliminar usuario (soft delete)
 * Invalida sesiones activas del usuario
 * 
 * @param {string} targetUserId - Public code del usuario a eliminar
 * @param {Object} actor - Usuario que realiza la acción
 * @param {Object} metadata - IP, user-agent, etc
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
export const deleteUser = async (targetUserId, actor, metadata = {}) => {
    // Obtener usuario target
    const targetUser = await userRepository.getUserModelById(targetUserId, true);
    if (!targetUser) {
        const error = new Error('User not found');
        error.status = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
    }
    
    // Verificar scope (excepto system-admin)
    if (actor.role !== 'system-admin') {
        const scope = await getUserScope(actor.userId, actor.role);
        if (!scope.canAccessAll && !scope.userIds.includes(targetUser.id)) {
            const error = new Error('User not in your organization scope');
            error.status = 403;
            error.code = 'SCOPE_VIOLATION';
            throw error;
        }
    }
    
    // Impedir auto-borrado
    if (targetUser.id === actor.userId) {
        const error = new Error('Cannot delete your own account');
        error.status = 403;
        error.code = 'SELF_DELETE_FORBIDDEN';
        throw error;
    }
    
    // Soft delete
    await userRepository.deleteUser(targetUser.id);
    
    // TODO: Invalidar sesiones activas del usuario (incrementar sessionVersion)
    
    // Auditar eliminación
    await auditLog.log({
        entityType: 'user',
        entityId: targetUser.id,
        action: 'delete',
        performedBy: actor.userId,
        changes: {
            isActive: { old: true, new: false }
        },
        metadata
    });
    
    userLogger.info({ userId: targetUser.id }, 'User deleted (soft) successfully');
    
    return true;
};

/**
 * Cambiar password de usuario propio
 * Valida password actual y actualiza hash
 * 
 * @param {string} userId - UUID del usuario
 * @param {string} currentPassword - Password actual
 * @param {string} newPassword - Password nuevo
 * @param {Object} metadata - IP, user-agent, etc
 * @returns {Promise<boolean>} - true si se cambió correctamente
 */
export const changePassword = async (userId, currentPassword, newPassword, metadata = {}) => {
    const user = await userRepository.getUserModelById(userId, false);
    if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
    }
    
    // Verificar password actual
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
        const error = new Error('Current password is incorrect');
        error.status = 401;
        error.code = 'INVALID_PASSWORD';
        throw error;
    }
    
    // Hashear nuevo password
    const newHash = await bcrypt.hash(newPassword, 10);
    
    // Actualizar password
    await userRepository.updateUser(user.id, { passwordHash: newHash });
    
    // Auditar cambio de password
    await auditLog.log({
        entityType: 'user',
        entityId: user.id,
        action: 'password_change',
        performedBy: user.id,
        changes: {
            passwordHash: { old: '[REDACTED]', new: '[REDACTED]' }
        },
        metadata
    });
    
    userLogger.info({ userId: user.id }, 'Password changed successfully');
    
    return true;
};

/**
 * Toggle de estado activo/inactivo de usuario
 * Permite activar o desactivar usuarios
 * 
 * @param {string} targetUserId - Public code del usuario
 * @param {boolean} isActive - Nuevo estado (true = activo, false = inactivo)
 * @param {Object} actor - Usuario que realiza la acción
 * @param {Object} metadata - IP, user-agent, etc
 * @returns {Promise<Object>} - Usuario actualizado (DTO)
 */
export const toggleUserStatus = async (targetUserId, isActive, actor, metadata = {}) => {
    // Obtener usuario target con rol para validaciones
    const targetUser = await userRepository.getUserModelById(targetUserId, true);
    if (!targetUser) {
        const error = new Error('User not found');
        error.status = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
    }
    
    // Impedir auto-desactivación
    if (targetUser.id === actor.userId && isActive === false) {
        const error = new Error('You cannot deactivate yourself');
        error.status = 403;
        error.code = 'SELF_DEACTIVATE_FORBIDDEN';
        throw error;
    }
    
    // Verificar scope (excepto system-admin)
    if (actor.role !== 'system-admin') {
        const scope = await getUserScope(actor.userId, actor.role);
        if (!scope.canAccessAll && !scope.userIds.includes(targetUser.id)) {
            const error = new Error('User not in your organization scope');
            error.status = 403;
            error.code = 'SCOPE_VIOLATION';
            throw error;
        }
    }
    
    // Verificar que no se puede desactivar a un usuario con rol superior
    if (isActive === false && targetUser.role) {
        const actorRoleLevel = getRoleLevel(actor.role);
        const targetRoleLevel = getRoleLevel(targetUser.role.name);
        
        if (targetRoleLevel < actorRoleLevel) {
            const error = new Error('Cannot deactivate user with higher role');
            error.status = 403;
            error.code = 'ROLE_HIERARCHY_VIOLATION';
            throw error;
        }
    }
    
    // Si el estado no cambia, retornar usuario actual
    if (targetUser.isActive === isActive) {
        return userRepository.toPublicUserDto(targetUser);
    }
    
    // Actualizar estado
    const updatedUser = await userRepository.updateUser(targetUser.id, { isActive });
    
    // Auditar cambio de estado
    await auditLog.log({
        entityType: 'user',
        entityId: targetUser.publicCode,
        action: isActive ? 'activated' : 'deactivated',
        performedBy: actor.userId,
        changes: {
            isActive: { old: targetUser.isActive, new: isActive }
        },
        metadata
    });
    
    userLogger.info({ userId: targetUser.id, isActive }, 'User status toggled successfully');
    
    return updatedUser;
};

/**
 * Validar disponibilidad de email de usuario
 * Endpoint público para validación en tiempo real en formularios
 * 
 * @param {Object} options - Opciones de validación
 * @param {string} options.email - Email a validar
 * @param {string} [options.excludePublicCode] - Public code del usuario a excluir (para edición)
 * @returns {Promise<Object>} - { valid: boolean, conflict: boolean }
 */
export const validateEmail = async ({ email, excludePublicCode }) => {
    return await userRepository.validateEmailUniqueness({ 
        email, 
        excludePublicCode 
    });
};
