// modules/users/index.js
// Router de usuarios - CRUD completo con RBAC

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import * as userServices from './services.js';
import * as userRepository from './repository.js';
import { validateCreateUser } from './dtos/create.dto.js';
import { validateUpdateUser } from './dtos/update.dto.js';
import { validateUpdateMe } from './dtos/updateMe.dto.js';
import { validateChangePassword } from './dtos/changePassword.dto.js';
import { validateToggleStatus } from './dtos/toggleStatus.dto.js';
import { validateEmailValidation } from './dtos/validate.dto.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import pino from 'pino';

const router = express.Router();
const userLogger = pino({ name: 'users-routes' });

/**
 * GET /api/v1/users
 * Listar usuarios con paginación y filtros
 * 
 * Scope:
 * - system-admin: Todos los usuarios
 * - org-admin: Usuarios de su org + descendientes
 * - org-manager: Usuarios de su org + hijos directos
 * - otros: Denegado (403)
 */
router.get('/', authenticate, requireRole(['system-admin', 'org-admin', 'org-manager']), async (req, res, next) => {
    try {
        const { page, limit = 20, offset = 0, search, role, organization_id, is_active } = req.query;
        
        // Validar y sanitizar parámetros de paginación
        const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
        let parsedOffset = Math.max(parseInt(offset) || 0, 0);
        if (page && parseInt(page) >= 1) {
            parsedOffset = (parseInt(page) - 1) * parsedLimit;
        }
        
        const scope = await userServices.getUserScope(req.user.userId, req.user.role);
        
        const filters = {
            search,
            isActive: is_active !== undefined ? is_active === 'true' : undefined
        };
        
        if (!scope.canAccessAll) {
            filters.userIds = scope.userIds;
        }
        
        if (organization_id) {
            const Organization = (await import('../organizations/models/Organization.js')).default;
            const org = await Organization.findOne({ where: { publicCode: organization_id } });
            if (org) filters.organizationId = org.id;
        }
        
        if (role) {
            const Role = (await import('../auth/models/Role.js')).default;
            const roleObj = await Role.findOne({ where: { name: role } });
            if (roleObj) filters.roleId = roleObj.id;
        }
        
        const result = await userRepository.listUsers(parsedLimit, parsedOffset, filters);
        
        return res.json({
            ok: true,
            data: result.users,
            meta: {
                total: result.total,
                limit: parsedLimit,
                offset: parsedOffset,
                hasMore: result.total > parsedOffset + result.users.length
            }
        });
    } catch (error) {
        userLogger.error({ err: error }, 'Error listing users');
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Crear nuevo usuario
 *     description: Crea un nuevo usuario en el sistema. system-admin puede asignar a cualquier organización, org-admin solo a su organización. Soporta multi-organización mediante organization_memberships[].
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - first_name
 *               - last_name
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del usuario (debe ser único)
 *                 example: "usuario@ejemplo.com"
 *               first_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Nombre del usuario
 *                 example: "Juan"
 *               last_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Apellido del usuario
 *                 example: "Pérez"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Contraseña del usuario
 *                 example: "password123"
 *               role:
 *                 type: string
 *                 description: Slug del rol del usuario
 *                 example: "user"
 *                 enum: [system-admin, org-admin, org-manager, user, viewer, guest, demo]
 *               organization_id:
 *                 type: string
 *                 description: Public code de la organización primaria (solo system-admin)
 *                 example: "ORG-7K9D2-X"
 *               phone:
 *                 type: string
 *                 maxLength: 50
 *                 description: Número de teléfono del usuario
 *                 example: "+54 11 1234-5678"
 *               language:
 *                 type: string
 *                 enum: [es, en]
 *                 default: es
 *                 description: Idioma preferido del usuario
 *                 example: "es"
 *               timezone:
 *                 type: string
 *                 maxLength: 100
 *                 default: "America/Argentina/Buenos_Aires"
 *                 description: Zona horaria IANA del usuario
 *                 example: "America/Argentina/Buenos_Aires"
 *               avatar_url:
 *                 type: string
 *                 format: uri
 *                 description: URL del avatar del usuario
 *                 example: "https://ejemplo.com/avatar.jpg"
 *               organization_memberships:
 *                 type: array
 *                 description: Array de organizaciones a las que pertenecerá el usuario (multi-organización)
 *                 items:
 *                   type: object
 *                   required:
 *                     - organization_id
 *                   properties:
 *                     organization_id:
 *                       type: string
 *                       description: Public code de la organización
 *                       example: "ORG-ABC12-Y"
 *                     is_primary:
 *                       type: boolean
 *                       default: false
 *                       description: Marcar como organización primaria
 *                       example: false
 *               send_invite:
 *                 type: boolean
 *                 default: false
 *                 description: Enviar email de invitación al usuario
 *                 example: false
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Datos del usuario creado
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Sin permisos para crear usuario o asignar rol
 *       409:
 *         description: Email ya existe
 */
router.post('/', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res, next) => {
    try {
        const validatedData = validateCreateUser(req.body);
        
        if (req.user.role === 'org-admin') {
            validatedData.organizationId = req.organization?.publicCode || req.user.activeOrgCode;
        }
        
        const actor = { userId: req.user.userId, role: req.user.role };
        const metadata = { ipAddress: req.ip, userAgent: req.get('user-agent') };
        
        const newUser = await userServices.createUser(validatedData, actor, metadata);
        
        return res.status(201).json({ ok: true, data: newUser });
    } catch (error) {
        userLogger.error({ err: error }, 'Error creating user');
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/users/validate-email:
 *   post:
 *     summary: Validar disponibilidad de email de usuario
 *     description: Verifica si el email ya está en uso. Útil para validación en tiempo real en formularios. No requiere autenticación.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email a validar
 *                 example: "usuario@ejemplo.com"
 *               exclude_id:
 *                 type: string
 *                 description: Public code del usuario a excluir de la validación (útil al editar un usuario existente)
 *                 example: "USR-7K9D2-X"
 *     responses:
 *       200:
 *         description: Resultado de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       description: true si el email está disponible, false si ya está en uso
 *                       example: true
 *                     conflict:
 *                       type: boolean
 *                       description: true si el email ya existe, false si está disponible
 *                       example: false
 *       400:
 *         description: Datos de validación inválidos
 */
router.post('/validate-email', async (req, res, next) => {
    try {
        // Validar datos del request
        const validatedData = validateEmailValidation(req.body);
        
        // Llamar al servicio de validación
        const result = await userServices.validateEmail({
            email: validatedData.email,
            excludePublicCode: validatedData.excludeId || null
        });
        
        return res.json({
            ok: true,
            data: result
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid data',
                    details: error.errors
                }
            });
        }
        
        userLogger.error({ err: error }, 'Error validating email');
        next(error);
    }
});

/**
 * GET /api/v1/users/me
 * Obtener perfil del usuario autenticado
 * NOTA: Debe ir ANTES de GET /:id
 */
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const user = await userRepository.findUserById(req.user.userId, true, true);
        
        if (!user) {
            return errorResponse(res, 'User not found', 404, 'USER_NOT_FOUND');
        }
        
        return successResponse(res, user);
    } catch (error) {
        userLogger.error({ err: error, userId: req.user.userId }, 'Error getting current user profile');
        next(error);
    }
});

/**
 * PUT /api/v1/users/me
 * Actualizar perfil propio
 */
router.put('/me', authenticate, async (req, res, next) => {
    try {
        const validatedData = validateUpdateMe(req.body);
        const updatedUser = await userRepository.updateUser(req.user.userId, validatedData);
        
        const auditLog = (await import('../../helpers/auditLog.js')).default;
        await auditLog.log({
            entityType: 'user',
            entityId: req.user.userId,
            action: 'update_profile',
            performedBy: req.user.userId,
            changes: validatedData,
            metadata: { ipAddress: req.ip, userAgent: req.get('user-agent') }
        });
        
        return successResponse(res, updatedUser);
    } catch (error) {
        userLogger.error({ err: error, userId: req.user.userId }, 'Error updating own profile');
        next(error);
    }
});

/**
 * PATCH /api/v1/users/me/password
 * Cambiar contraseña propia
 */
router.patch('/me/password', authenticate, async (req, res, next) => {
    try {
        const validatedData = validateChangePassword(req.body);
        const metadata = { ipAddress: req.ip, userAgent: req.get('user-agent') };
        
        await userServices.changePassword(
            req.user.userId,
            validatedData.currentPassword,
            validatedData.newPassword,
            metadata
        );
        
        return res.json({ ok: true, message: 'Password changed successfully' });
    } catch (error) {
        userLogger.error({ err: error, userId: req.user.userId }, 'Error changing password');
        next(error);
    }
});

/**
 * GET /api/v1/users/:id
 * Ver detalle de un usuario específico
 */
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await userRepository.findUserById(id, true, true);
        
        if (!user) {
            return errorResponse(res, 'User not found', 404, 'USER_NOT_FOUND');
        }
        
        // Verificar scope (excepto system-admin)
        if (req.user.role !== 'system-admin') {
            const userModel = await userRepository.getUserModelById(id, false);
            
            // Permitir ver propio perfil
            if (userModel.id !== req.user.userId) {
                const scope = await userServices.getUserScope(req.user.userId, req.user.role);
                
                if (!scope.canAccessAll && !scope.userIds.includes(userModel.id)) {
                    return errorResponse(res, 'User not in your organization scope', 403, 'SCOPE_VIOLATION');
                }
            }
        }
        
        return successResponse(res, user);
    } catch (error) {
        userLogger.error({ err: error, userId: req.params.id }, 'Error getting user');
        next(error);
    }
});

/**
 * PUT /api/v1/users/:id
 * Actualizar usuario existente
 */
router.put('/:id', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res, next) => {
    try {
        const { id } = req.params;
        const validatedData = validateUpdateUser(req.body);
        
        const actor = { userId: req.user.userId, role: req.user.role };
        const metadata = { ipAddress: req.ip, userAgent: req.get('user-agent') };
        
        const updatedUser = await userServices.updateUser(id, validatedData, actor, metadata);
        
        return successResponse(res, updatedUser);
    } catch (error) {
        userLogger.error({ err: error, userId: req.params.id }, 'Error updating user');
        next(error);
    }
});

/**
 * DELETE /api/v1/users/:id
 * Eliminar usuario (soft delete)
 */
router.delete('/:id', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const actor = { userId: req.user.userId, role: req.user.role };
        const metadata = { ipAddress: req.ip, userAgent: req.get('user-agent') };
        
        await userServices.deleteUser(id, actor, metadata);
        
        return res.status(204).send();
    } catch (error) {
        userLogger.error({ err: error, userId: req.params.id }, 'Error deleting user');
        next(error);
    }
});

/**
 * GET /api/v1/users/:id/organizations
 * Obtener todas las organizaciones del usuario con is_primary
 */
router.get('/:id/organizations', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Obtener modelo para UUID (necesitamos UUID interno, no public_code)
        const userModel = await userRepository.getUserModelById(id, false);
        
        if (!userModel) {
            return errorResponse(res, 'User not found', 404, 'USER_NOT_FOUND');
        }
        
        // Verificar scope (excepto system-admin)
        if (req.user.role !== 'system-admin') {
            // Permitir ver propias organizaciones
            if (userModel.id !== req.user.userId) {
                const scope = await userServices.getUserScope(req.user.userId, req.user.role);
                
                if (!scope.canAccessAll && !scope.userIds.includes(userModel.id)) {
                    return errorResponse(res, 'User not in your organization scope', 403, 'SCOPE_VIOLATION');
                }
            }
        }
        
        // Usar servicio de organizaciones para obtener user organizations
        const organizationService = await import('../organizations/services.js');
        const userOrgs = await organizationService.getUserOrganizations(userModel.id);
        
        // Convertir organization_id (UUID) a public_code para frontend
        const Organization = (await import('../organizations/models/Organization.js')).default;
        const orgsWithPublicCode = await Promise.all(
            userOrgs.map(async (uo) => {
                const org = await Organization.findByPk(uo.organizationId);
                return {
                    organizationId: org.publicCode,
                    slug: uo.slug,
                    name: uo.name,
                    logoUrl: uo.logoUrl,
                    isPrimary: uo.isPrimary,
                    joinedAt: uo.joinedAt
                };
            })
        );
        
        return res.json({
            ok: true,
            data: orgsWithPublicCode,
            meta: {
                total: orgsWithPublicCode.length
            }
        });
    } catch (error) {
        userLogger.error({ err: error, userId: req.params.id }, 'Error getting user organizations');
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/users/{id}/organizations:
 *   post:
 *     summary: Agregar usuario a una organización adicional
 *     description: Agrega un usuario existente a una organización adicional. Permite multi-organización. Requiere rol system-admin u org-admin.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del usuario
 *         example: "USR-7K9D2-X"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_id
 *             properties:
 *               organization_id:
 *                 type: string
 *                 description: Public code de la organización
 *                 example: "ORG-ABC12-Y"
 *               is_primary:
 *                 type: boolean
 *                 description: Marcar como organización primaria del usuario
 *                 example: false
 *                 default: false
 *     responses:
 *       201:
 *         description: Usuario agregado a la organización exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User added to organization successfully"
 *       400:
 *         description: Datos inválidos o el usuario ya pertenece a la organización
 *       403:
 *         description: Sin permisos para acceder a este usuario u organización
 *       404:
 *         description: Usuario u organización no encontrados
 */
router.post('/:id/organizations', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId, isPrimary = false } = req.body;
        
        if (!organizationId) {
            return errorResponse(res, 'organizationId is required', 400, 'VALIDATION_ERROR');
        }
        
        // Obtener modelo para UUID del usuario
        const userModel = await userRepository.getUserModelById(id, false);
        if (!userModel) {
            return errorResponse(res, 'User not found', 404, 'USER_NOT_FOUND');
        }
        
        // Verificar scope (excepto system-admin)
        if (req.user.role !== 'system-admin') {
            const scope = await userServices.getUserScope(req.user.userId, req.user.role);
            if (!scope.canAccessAll && !scope.userIds.includes(userModel.id)) {
                return errorResponse(res, 'User not in your organization scope', 403, 'SCOPE_VIOLATION');
            }
        }
        
        // Convertir organizationId (publicCode) a UUID
        const Organization = (await import('../organizations/models/Organization.js')).default;
        const org = await Organization.findOne({ where: { publicCode: organizationId } });
        
        if (!org) {
            return errorResponse(res, 'Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
        }
        
        // Agregar usuario a la organización
        const organizationService = await import('../organizations/services.js');
        await organizationService.addUserToOrganization(userModel.id, org.id, isPrimary);
        
        // Auditar acción
        const auditLog = (await import('../../helpers/auditLog.js')).default;
        await auditLog.log({
            entityType: 'user_organization',
            entityId: userModel.id,
            action: 'add_organization',
            performedBy: req.user.userId,
            changes: {
                organizationId: { old: null, new: org.id },
                isPrimary: { old: null, new: isPrimary }
            },
            metadata: { 
                ipAddress: req.ip, 
                userAgent: req.get('user-agent'),
                organizationPublicCode: organizationId
            }
        });
        
        return res.status(201).json({
            ok: true,
            message: 'User added to organization successfully'
        });
    } catch (error) {
        userLogger.error({ err: error, userId: req.params.id }, 'Error adding user to organization');
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/users/{id}/organizations/{orgId}:
 *   delete:
 *     summary: Remover usuario de una organización
 *     description: Elimina la membresía de un usuario en una organización específica. No permite eliminar la única organización primaria del usuario. Requiere rol system-admin u org-admin.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code del usuario
 *         example: "USR-7K9D2-X"
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Public code de la organización
 *         example: "ORG-ABC12-Y"
 *     responses:
 *       200:
 *         description: Usuario removido de la organización exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User removed from organization successfully"
 *       400:
 *         description: No se puede remover la única organización primaria del usuario
 *       403:
 *         description: Sin permisos para acceder a este usuario u organización
 *       404:
 *         description: Usuario u organización no encontrados
 */
router.delete('/:id/organizations/:orgId', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res, next) => {
    try {
        const { id, orgId } = req.params;
        
        // Obtener modelo para UUID del usuario
        const userModel = await userRepository.getUserModelById(id, false);
        if (!userModel) {
            return errorResponse(res, 'User not found', 404, 'USER_NOT_FOUND');
        }
        
        // Verificar scope (excepto system-admin)
        if (req.user.role !== 'system-admin') {
            const scope = await userServices.getUserScope(req.user.userId, req.user.role);
            if (!scope.canAccessAll && !scope.userIds.includes(userModel.id)) {
                return errorResponse(res, 'User not in your organization scope', 403, 'SCOPE_VIOLATION');
            }
        }
        
        // Convertir orgId (publicCode) a UUID
        const Organization = (await import('../organizations/models/Organization.js')).default;
        const org = await Organization.findOne({ where: { publicCode: orgId } });
        
        if (!org) {
            return errorResponse(res, 'Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
        }
        
        // Remover usuario de la organización
        const organizationService = await import('../organizations/services.js');
        await organizationService.removeUserFromOrganization(userModel.id, org.id);
        
        // Auditar acción
        const auditLog = (await import('../../helpers/auditLog.js')).default;
        await auditLog.log({
            entityType: 'user_organization',
            entityId: userModel.id,
            action: 'remove_organization',
            performedBy: req.user.userId,
            changes: {
                organizationId: { old: org.id, new: null }
            },
            metadata: { 
                ipAddress: req.ip, 
                userAgent: req.get('user-agent'),
                organizationPublicCode: orgId
            }
        });
        
        return res.status(204).send();
    } catch (error) {
        userLogger.error({ err: error, userId: req.params.id }, 'Error removing user from organization');
        next(error);
    }
});

/**
 * GET /api/v1/users/:id/audit-logs
 * Obtener historial de auditoría del usuario (acciones realizadas por él)
 */
router.get('/:id/audit-logs', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page, limit = 20, offset = 0, entity_type, action } = req.query;
        
        // Validar y sanitizar parámetros de paginación
        const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
        let parsedOffset = Math.max(parseInt(offset) || 0, 0);
        if (page && parseInt(page) >= 1) {
            parsedOffset = (parseInt(page) - 1) * parsedLimit;
        }
        
        // Obtener modelo para UUID (necesitamos UUID interno)
        const userModel = await userRepository.getUserModelById(id, false);
        
        if (!userModel) {
            return errorResponse(res, 'User not found', 404, 'USER_NOT_FOUND');
        }
        
        // Verificar scope (excepto system-admin)
        if (req.user.role !== 'system-admin') {
            // Permitir ver propios audit logs
            if (userModel.id !== req.user.userId) {
                const scope = await userServices.getUserScope(req.user.userId, req.user.role);
                
                if (!scope.canAccessAll && !scope.userIds.includes(userModel.id)) {
                    return errorResponse(res, 'User not in your organization scope', 403, 'SCOPE_VIOLATION');
                }
            }
        }
        
        // Importar modelo AuditLog
        const AuditLog = (await import('../audit/models/AuditLog.js')).default;
        
        // Construir query filters
        const where = {
            performedBy: userModel.id // Filtrar por usuario que realizó la acción
        };
        
        if (entity_type) {
            where.entityType = entity_type;
        }
        
        if (action) {
            where.action = action;
        }
        
        // Consultar audit logs
        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            limit: parsedLimit,
            offset: parsedOffset,
            order: [['performedAt', 'DESC'], ['id', 'ASC']],
            attributes: [
                'id',
                'entityType',
                'entityId',
                'action',
                'performedBy',
                'changes',
                'metadata',
                'performedAt'
            ]
        });
        
        return res.json({
            ok: true,
            data: rows,
            meta: {
                total: count,
                limit: parsedLimit,
                offset: parsedOffset,
                hasMore: count > parsedOffset + rows.length
            }
        });
    } catch (error) {
        userLogger.error({ err: error, userId: req.params.id }, 'Error getting user audit logs');
        next(error);
    }
});

/**
 * PATCH /api/v1/users/:id/status
 * Activar/desactivar usuario
 * Requiere rol org-admin o superior
 */
router.patch('/:id/status', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res, next) => {
    try {
        const { id } = req.params;
        const validatedData = validateToggleStatus(req.body);
        
        const actor = { userId: req.user.userId, role: req.user.role };
        const metadata = { ipAddress: req.ip, userAgent: req.get('user-agent') };
        
        const updatedUser = await userServices.toggleUserStatus(id, validatedData.isActive, actor, metadata);
        
        return successResponse(res, updatedUser);
    } catch (error) {
        userLogger.error({ err: error, userId: req.params.id }, 'Error toggling user status');
        next(error);
    }
});

export default router;
