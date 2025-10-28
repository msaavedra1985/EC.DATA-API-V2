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
        const { limit = 20, offset = 0, search, role, organization_id, is_active } = req.query;
        
        // Validar y sanitizar parámetros de paginación
        const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
        const parsedOffset = Math.max(parseInt(offset) || 0, 0);
        
        const scope = await userServices.getUserScope(req.user.userId, req.user.role);
        
        const filters = {
            search,
            is_active: is_active !== undefined ? is_active === 'true' : undefined
        };
        
        if (!scope.canAccessAll) {
            filters.user_ids = scope.userIds;
        }
        
        if (organization_id) {
            const Organization = (await import('../organizations/models/Organization.js')).default;
            const org = await Organization.findOne({ where: { public_code: organization_id } });
            if (org) filters.organization_id = org.id;
        }
        
        if (role) {
            const Role = (await import('../auth/models/Role.js')).default;
            const roleObj = await Role.findOne({ where: { name: role } });
            if (roleObj) filters.role_id = roleObj.id;
        }
        
        const result = await userRepository.listUsers(parsedLimit, parsedOffset, filters);
        
        return res.json({
            ok: true,
            data: result.users,
            meta: {
                total: result.total,
                limit: parsedLimit,
                offset: parsedOffset,
                has_more: result.total > parsedOffset + result.users.length
            }
        });
    } catch (error) {
        userLogger.error({ err: error }, 'Error listing users');
        next(error);
    }
});

/**
 * POST /api/v1/users
 * Crear nuevo usuario
 */
router.post('/', authenticate, requireRole(['system-admin', 'org-admin']), async (req, res, next) => {
    try {
        const validatedData = validateCreateUser(req.body);
        
        if (req.user.role === 'org-admin') {
            validatedData.organization_id = req.organization?.public_code || req.user.activeOrgId;
        }
        
        const actor = { userId: req.user.userId, role: req.user.role };
        const metadata = { ip_address: req.ip, user_agent: req.get('user-agent') };
        
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
            excludePublicCode: validatedData.exclude_id || null
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
            entity_type: 'user',
            entity_id: req.user.userId,
            action: 'update_profile',
            performed_by: req.user.userId,
            changes: validatedData,
            metadata: { ip_address: req.ip, user_agent: req.get('user-agent') }
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
        const metadata = { ip_address: req.ip, user_agent: req.get('user-agent') };
        
        await userServices.changePassword(
            req.user.userId,
            validatedData.current_password,
            validatedData.new_password,
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
        const metadata = { ip_address: req.ip, user_agent: req.get('user-agent') };
        
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
        const metadata = { ip_address: req.ip, user_agent: req.get('user-agent') };
        
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
                const org = await Organization.findByPk(uo.organization_id);
                return {
                    organization_id: org.public_code,
                    slug: uo.slug,
                    name: uo.name,
                    logo_url: uo.logo_url,
                    is_primary: uo.is_primary,
                    joined_at: uo.joined_at
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
 * GET /api/v1/users/:id/audit-logs
 * Obtener historial de auditoría del usuario (acciones realizadas por él)
 */
router.get('/:id/audit-logs', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit = 20, offset = 0, entity_type, action } = req.query;
        
        // Validar parámetros de paginación
        const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
        const parsedOffset = Math.max(parseInt(offset) || 0, 0);
        
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
            performed_by: userModel.id // Filtrar por usuario que realizó la acción
        };
        
        if (entity_type) {
            where.entity_type = entity_type;
        }
        
        if (action) {
            where.action = action;
        }
        
        // Consultar audit logs
        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            limit: parsedLimit,
            offset: parsedOffset,
            order: [['performed_at', 'DESC']],
            attributes: [
                'id',
                'entity_type',
                'entity_id',
                'action',
                'performed_by',
                'changes',
                'metadata',
                'performed_at'
            ]
        });
        
        return res.json({
            ok: true,
            data: rows,
            meta: {
                total: count,
                limit: parsedLimit,
                offset: parsedOffset,
                has_more: count > parsedOffset + rows.length
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
        const metadata = { ip_address: req.ip, user_agent: req.get('user-agent') };
        
        const updatedUser = await userServices.toggleUserStatus(id, validatedData.is_active, actor, metadata);
        
        return successResponse(res, updatedUser);
    } catch (error) {
        userLogger.error({ err: error, userId: req.params.id }, 'Error toggling user status');
        next(error);
    }
});

export default router;
