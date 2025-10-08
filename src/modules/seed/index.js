// Router para endpoints de seeding de datos de prueba
import { Router } from 'express';
import { seedTestData } from './services.js';
import { successResponse, errorResponse } from '../../utils/response.js';

const router = Router();

/**
 * @swagger
 * /api/v1/seed/test-data:
 *   post:
 *     summary: Seed test data into database
 *     description: |
 *       Popula la base de datos con datos de prueba completos:
 *       - 55 países con traducciones ES/EN
 *       - 3 organizaciones (ACME Corp, Tech Solutions AR, Global Enterprises ES)
 *       - 7 usuarios (uno por cada rol) con password "Test123!"
 *       
 *       Este endpoint es **idempotente** - puede ejecutarse múltiples veces sin duplicar datos.
 *       Verifica si cada registro ya existe antes de insertarlo.
 *       
 *       **Nota de Seguridad:** Este endpoint está disponible sin autenticación mientras la API
 *       no esté en producción pública. Debe ser deshabilitado o protegido antes del lanzamiento.
 *     tags:
 *       - Seeding
 *     parameters:
 *       - in: query
 *         name: fresh
 *         schema:
 *           type: boolean
 *           default: false
 *         description: |
 *           Si es `true`, elimina TODOS los datos existentes antes de insertar.
 *           **CUIDADO:** Esto es destructivo y elimina usuarios, organizaciones, países y traducciones.
 *         example: false
 *     responses:
 *       200:
 *         description: Seeding completado exitosamente
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
 *                     cleaned:
 *                       type: object
 *                       description: Solo aparece si fresh=true
 *                       properties:
 *                         users:
 *                           type: integer
 *                           example: 7
 *                         organizations:
 *                           type: integer
 *                           example: 3
 *                         translations:
 *                           type: integer
 *                           example: 110
 *                         countries:
 *                           type: integer
 *                           example: 55
 *                     roles:
 *                       type: integer
 *                       description: Cantidad de roles disponibles (prerequisito)
 *                       example: 7
 *                     countries:
 *                       type: object
 *                       properties:
 *                         inserted:
 *                           type: integer
 *                           example: 55
 *                         existing:
 *                           type: integer
 *                           example: 0
 *                         total:
 *                           type: integer
 *                           example: 55
 *                     translations:
 *                       type: object
 *                       properties:
 *                         inserted:
 *                           type: integer
 *                           example: 110
 *                         existing:
 *                           type: integer
 *                           example: 0
 *                         total:
 *                           type: integer
 *                           example: 110
 *                     organizations:
 *                       type: object
 *                       properties:
 *                         inserted:
 *                           type: integer
 *                           example: 3
 *                         existing:
 *                           type: integer
 *                           example: 0
 *                         total:
 *                           type: integer
 *                           example: 3
 *                     users:
 *                       type: object
 *                       properties:
 *                         inserted:
 *                           type: integer
 *                           example: 7
 *                         existing:
 *                           type: integer
 *                           example: 0
 *                         total:
 *                           type: integer
 *                           example: 7
 *                     totals:
 *                       type: object
 *                       properties:
 *                         countries:
 *                           type: integer
 *                           example: 55
 *                         translations:
 *                           type: integer
 *                           example: 110
 *                         organizations:
 *                           type: integer
 *                           example: 3
 *                         users:
 *                           type: integer
 *                           example: 7
 *             examples:
 *               normal:
 *                 summary: Normal seeding (sin limpiar datos)
 *                 value:
 *                   ok: true
 *                   data:
 *                     roles: 7
 *                     countries:
 *                       inserted: 55
 *                       existing: 0
 *                       total: 55
 *                     translations:
 *                       inserted: 110
 *                       existing: 0
 *                       total: 110
 *                     organizations:
 *                       inserted: 3
 *                       existing: 0
 *                       total: 3
 *                     users:
 *                       inserted: 7
 *                       existing: 0
 *                       total: 7
 *                     totals:
 *                       countries: 55
 *                       translations: 110
 *                       organizations: 3
 *                       users: 7
 *               fresh:
 *                 summary: Fresh seeding (con limpieza previa)
 *                 value:
 *                   ok: true
 *                   data:
 *                     cleaned:
 *                       users: 7
 *                       organizations: 3
 *                       translations: 110
 *                       countries: 55
 *                     roles: 7
 *                     countries:
 *                       inserted: 55
 *                       existing: 0
 *                       total: 55
 *                     translations:
 *                       inserted: 110
 *                       existing: 0
 *                       total: 110
 *                     organizations:
 *                       inserted: 3
 *                       existing: 0
 *                       total: 3
 *                     users:
 *                       inserted: 7
 *                       existing: 0
 *                       total: 7
 *                     totals:
 *                       countries: 55
 *                       translations: 110
 *                       organizations: 3
 *                       users: 7
 *       400:
 *         description: Error en el seeding (ej. roles no existen)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: SEEDING_ERROR
 *                     message:
 *                       type: string
 *                       example: Roles table is empty. Please run role seeders first.
 *       500:
 *         description: Error interno del servidor
 */
router.post('/test-data', async (req, res) => {
    try {
        // Obtener query param fresh (default: false)
        const fresh = req.query.fresh === 'true';
        
        // Ejecutar seeding
        const summary = await seedTestData(fresh);
        
        return successResponse({
            res,
            data: summary,
        });
    } catch (error) {
        return errorResponse({
            res,
            statusCode: 400,
            code: 'SEEDING_ERROR',
            message: error.message,
        });
    }
});

export default router;
