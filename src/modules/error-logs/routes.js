import { Router } from 'express';
import { validateCreateErrorLog } from './dtos/index.js';
import { v7 as uuidv7 } from 'uuid';
import logger from '../../utils/logger.js';
import winstonLogger from '../../utils/winston/logger.js';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';

const router = Router();
const errorLogger = logger.child({ module: 'error-logs' });

/**
 * @swagger
 * /api/v1/error-logs:
 *   post:
 *     summary: Registrar error de frontend o backend
 *     description: Endpoint público (sin autenticación requerida) para que el frontend pueda reportar errores. Captura automáticamente IP, user-agent y user_id si hay JWT presente.
 *     tags: [Error Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - source
 *               - error_code
 *               - error_message
 *             properties:
 *               source:
 *                 type: string
 *                 enum: [frontend, backend]
 *                 description: Origen del error
 *                 example: frontend
 *               level:
 *                 type: string
 *                 enum: [error, warning, critical]
 *                 description: Nivel de severidad
 *                 default: error
 *                 example: error
 *               error_code:
 *                 type: string
 *                 description: Código del error
 *                 example: COMPONENT_RENDER_ERROR
 *               error_message:
 *                 type: string
 *                 description: Mensaje descriptivo del error
 *                 example: Failed to render ProductList component
 *               stack_trace:
 *                 type: string
 *                 description: Stack trace del error
 *                 example: "Error: Cannot read property 'map' of undefined\n    at ProductList.render..."
 *               endpoint:
 *                 type: string
 *                 description: Endpoint o ruta donde ocurrió el error
 *                 example: /dashboard/products
 *               method:
 *                 type: string
 *                 description: Método HTTP (para errores de API)
 *                 example: GET
 *               status_code:
 *                 type: integer
 *                 description: Código de estado HTTP
 *                 example: 500
 *               session_id:
 *                 type: string
 *                 description: ID de sesión para rastrear múltiples errores
 *                 example: sess_abc123xyz
 *               context:
 *                 type: object
 *                 description: Contexto adicional del error
 *                 example:
 *                   url: "/dashboard/products"
 *                   component: "ProductList"
 *                   action: "initial_render"
 *                   user_action: "page_load"
 *               metadata:
 *                 type: object
 *                 description: Metadata adicional
 *                 example:
 *                   browser: "Chrome 118"
 *                   os: "Windows 11"
 *                   screen_size: "1920x1080"
 *                   viewport: "1600x900"
 *           examples:
 *             frontend_error:
 *               summary: Error de frontend
 *               value:
 *                 source: frontend
 *                 level: error
 *                 error_code: COMPONENT_RENDER_ERROR
 *                 error_message: Failed to render ProductList component
 *                 stack_trace: "Error: Cannot read property 'map' of undefined..."
 *                 context:
 *                   url: "/dashboard/products"
 *                   component: "ProductList"
 *                   action: "initial_render"
 *                 metadata:
 *                   browser: "Chrome 118"
 *                   os: "Windows 11"
 *             api_error:
 *               summary: Error de API desde frontend
 *               value:
 *                 source: frontend
 *                 level: warning
 *                 error_code: API_REQUEST_FAILED
 *                 error_message: Failed to fetch organizations
 *                 endpoint: /api/v1/organizations
 *                 method: GET
 *                 status_code: 500
 *                 context:
 *                   retry_count: 3
 *                   timeout: 5000
 *     responses:
 *       201:
 *         description: Error registrado exitosamente
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
 *                     id:
 *                       type: string
 *                       example: "01919eb8-5e8a-7890-b456-123456789abc"
 *                     source:
 *                       type: string
 *                       example: frontend
 *                     level:
 *                       type: string
 *                       example: error
 *                     error_code:
 *                       type: string
 *                       example: COMPONENT_RENDER_ERROR
 *                     created_at:
 *                       type: string
 *                       example: "2025-10-13T18:00:00Z"
 *       400:
 *         description: Error de validación
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
 *                       example: VALIDATION_ERROR
 *                     message:
 *                       type: string
 *                       example: Invalid data
 *                     details:
 *                       type: array
 *                       example:
 *                         - path: ["source"]
 *                           message: "Source must be either 'frontend' or 'backend'"
 *       500:
 *         description: Error interno del servidor
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
 *                       example: INTERNAL_ERROR
 *                     message:
 *                       type: string
 *                       example: Error logging error
 */
router.post('/', async (req, res) => {
    try {
        // Validar datos del request
        const validatedData = validateCreateErrorLog(req.body);

        // Intentar extraer user_id y organization_id del JWT (si existe)
        let userId = null;
        let organizationId = null;
        
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const decoded = jwt.verify(token, config.jwtAccessSecret, {
                    issuer: config.jwtIssuer,
                    audience: config.jwtAudience
                });
                userId = decoded.sub;
                organizationId = decoded.activeOrgId;
            } catch (error) {
                // JWT inválido o expirado - continuar sin user_id
                errorLogger.debug('Invalid or expired JWT in error-logs endpoint');
            }
        }

        // Capturar IP y user-agent automáticamente
        const ipAddress = req.ip || req.connection?.remoteAddress;
        const userAgent = req.get('user-agent');
        
        // Generar request_id único
        const requestId = uuidv7();

        // Loguear usando Winston - automáticamente escribe a SQL + archivos
        winstonLogger.logError({
            source: validatedData.source,
            level: validatedData.level,
            errorCode: validatedData.error_code,
            errorMessage: validatedData.error_message,
            stackTrace: validatedData.stack_trace,
            endpoint: validatedData.endpoint,
            method: validatedData.method,
            statusCode: validatedData.status_code,
            userId,
            organizationId,
            sessionId: validatedData.session_id,
            ipAddress,
            userAgent,
            requestId,
            correlationId: validatedData.correlation_id,
            context: validatedData.context,
            metadata: validatedData.metadata
        });

        errorLogger.info({
            source: validatedData.source,
            errorCode: validatedData.error_code,
            userId,
            correlationId: validatedData.correlation_id
        }, 'Error logged successfully via Winston');

        res.status(201).json({
            ok: true,
            data: {
                request_id: requestId,
                source: validatedData.source,
                level: validatedData.level,
                error_code: validatedData.error_code,
                correlation_id: validatedData.correlation_id || null
            }
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

        errorLogger.error({ err: error }, 'Error logging error');
        res.status(500).json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error logging error'
            }
        });
    }
});

export default router;
