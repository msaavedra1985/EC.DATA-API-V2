// Configuración de Swagger/OpenAPI para documentación de la API
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from '../config/env.js';

/**
 * Configuración de Swagger OpenAPI
 * Solo disponible en desarrollo
 */

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API EC ESM - Enterprise API',
            version: '1.0.0',
            description: 'Enterprise REST API with ESM, Express, Sequelize, Redis, and comprehensive observability',
            contact: {
                name: 'API Support',
                email: 'support@api-ec.com',
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
            customSiteTitle: 'API EC ESM Docs',
        }));

        console.log(`📚 Swagger docs available at: ${config.apiUrl}/docs`);
    }
};

export default swaggerSpec;
