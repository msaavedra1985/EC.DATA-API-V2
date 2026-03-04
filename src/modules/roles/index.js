// modules/roles/index.js
// Router de roles - Endpoint público para obtener lista de roles

import express from 'express';
import Role from '../auth/models/Role.js';
import pino from 'pino';

const router = express.Router();
const rolesLogger = pino({ name: 'roles-routes' });

/**
 * GET /api/v1/roles
 * Obtener lista de roles disponibles
 * 
 * Este endpoint NO requiere autenticación para facilitar UX en formularios
 * Retorna todos los roles activos para dropdowns y selects
 */
router.get('/', async (req, res, next) => {
    try {
        const roles = await Role.findAll({
            where: { isActive: true },
            attributes: ['name', 'description'],
            order: [
                // Orden específico para mejorexperiencia UX
                ['name', 'ASC']
            ]
        });
        
        return res.json({
            ok: true,
            data: roles,
            meta: {
                total: roles.length
            }
        });
    } catch (error) {
        rolesLogger.error({ err: error }, 'Error fetching roles');
        next(error);
    }
});

export default router;
