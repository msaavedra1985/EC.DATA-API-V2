import { Router } from 'express';
import { validateCreateErrorLog } from './dtos/index.js';
import { v7 as uuidv7 } from 'uuid';
import logger from '../../utils/logger.js';
import winstonLogger from '../../utils/winston/logger.js';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';

const router = Router();
const errorLogger = logger.child({ module: 'error-logs' });


// 📄 Swagger: src/docs/swagger/error-logs.yaml -> POST /
router.post('/', async (req, res) => {
    try {
        // Validar datos del request
        const validatedData = validateCreateErrorLog(req.body);

        // Intentar extraer userId y organizationId del JWT (si existe)
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
                organizationId = decoded.activeOrgCode;
            } catch (error) {
                // JWT inválido o expirado - continuar sin userId
                errorLogger.debug('Invalid or expired JWT in error-logs endpoint');
            }
        }

        // Capturar IP y user-agent automáticamente
        const ipAddress = req.ip || req.connection?.remoteAddress;
        const userAgent = req.get('user-agent');
        
        // Generar requestId único
        const requestId = uuidv7();

        // Loguear usando Winston - automáticamente escribe a SQL + archivos
        winstonLogger.logError({
            source: validatedData.source,
            level: validatedData.level,
            errorCode: validatedData.errorCode,
            errorMessage: validatedData.errorMessage,
            stackTrace: validatedData.stackTrace,
            endpoint: validatedData.endpoint,
            method: validatedData.method,
            statusCode: validatedData.statusCode,
            userId,
            organizationId,
            sessionId: validatedData.sessionId,
            ipAddress,
            userAgent,
            requestId,
            correlationId: validatedData.correlationId,
            context: validatedData.context,
            metadata: validatedData.metadata
        });

        errorLogger.info({
            source: validatedData.source,
            errorCode: validatedData.errorCode,
            userId,
            correlationId: validatedData.correlationId
        }, 'Error logged successfully via Winston');

        res.status(201).json({
            ok: true,
            data: {
                requestId: requestId,
                source: validatedData.source,
                level: validatedData.level,
                errorCode: validatedData.errorCode,
                correlationId: validatedData.correlationId || null
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
