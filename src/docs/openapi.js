// Configuración de Swagger/OpenAPI para documentación de la API
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Configuración de Swagger OpenAPI
 * Solo disponible en desarrollo
 */

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'EC.DATA API - Enterprise REST API',
            version: '1.0.0',
            description: 'Enterprise REST API with ESM, Express, Sequelize, Redis, and comprehensive observability',
            contact: {
                name: 'EC.DATA API Support',
                email: 'api-support@ecdata.com',
            },
        },
        servers: [
            {
                url: `${config.apiUrl}/api/v1`,
                description: config.env === 'development' ? 'Development server' : 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token obtenido en /auth/login',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'UUID v7 del usuario',
                        },
                        human_id: {
                            type: 'integer',
                            description: 'ID incremental legible (scoped por organización)',
                        },
                        public_code: {
                            type: 'string',
                            description: 'Código público opaco (ej: EC-xxxxx-x)',
                            example: 'EC-jmQng-9',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                        },
                        first_name: {
                            type: 'string',
                        },
                        last_name: {
                            type: 'string',
                        },
                        role: {
                            type: 'string',
                            enum: ['admin', 'manager', 'user'],
                        },
                        organization_id: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                        },
                        is_active: {
                            type: 'boolean',
                        },
                        last_login_at: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                        email_verified_at: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                TokenResponse: {
                    type: 'object',
                    properties: {
                        access_token: {
                            type: 'string',
                            description: 'JWT access token (15 minutos de validez)',
                        },
                        refresh_token: {
                            type: 'string',
                            description: 'JWT refresh token (14 días de validez)',
                        },
                        expires_in: {
                            type: 'string',
                            description: 'Tiempo de expiración en formato legible',
                            example: '15m',
                        },
                        token_type: {
                            type: 'string',
                            example: 'Bearer',
                        },
                    },
                },
                Session: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID de la sesión (refresh token ID)',
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                        },
                        last_used_at: {
                            type: 'string',
                            format: 'date-time',
                        },
                        user_agent: {
                            type: 'string',
                            nullable: true,
                        },
                        ip_address: {
                            type: 'string',
                            nullable: true,
                        },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        ok: {
                            type: 'boolean',
                            example: false,
                        },
                        error: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                },
                                code: {
                                    type: 'string',
                                },
                                status: {
                                    type: 'integer',
                                },
                            },
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                timestamp: {
                                    type: 'string',
                                    format: 'date-time',
                                },
                            },
                        },
                    },
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        ok: {
                            type: 'boolean',
                            example: true,
                        },
                        data: {
                            type: 'object',
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                timestamp: {
                                    type: 'string',
                                    format: 'date-time',
                                },
                            },
                        },
                    },
                },
            },
        },
        security: [
            {
                BearerAuth: [],
            },
        ],
        tags: [
            {
                name: 'Health',
                description: 'Health check endpoints',
            },
            {
                name: 'Auth',
                description: 'Authentication and authorization',
            },
            {
                name: 'Tenants',
                description: 'Tenant management (multi-tenancy)',
            },
            {
                name: 'Sites',
                description: 'Site management',
            },
            {
                name: 'Bills',
                description: 'Billing and invoices',
            },
        ],
    },
    // Buscar anotaciones JSDoc en todos los módulos
    apis: ['./src/modules/*/index.js', './src/modules/*/dtos/*.js'],
};

// Generar especificación OpenAPI desde anotaciones JSDoc
const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Middleware para servir documentación Swagger
 * Solo en desarrollo
 */
export const setupSwagger = app => {
    if (config.env === 'development') {
        // Servir especificación JSON
        app.get('/api/v1/docs.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(swaggerSpec);
        });

        // Servir interfaz Swagger UI
        app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'EC.DATA API - Enterprise REST API',
        }));

        logger.info(`📚 Swagger docs available at: ${config.apiUrl}/docs`);
    }
};

export default swaggerSpec;
