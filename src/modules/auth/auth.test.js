// modules/auth/auth.test.js
// Tests de integración para el módulo de autenticación

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import createApp from '../../app.js';
import sequelize from '../../db/sql/sequelize.js';
import '../../db/models.js'; // Importar modelos
import * as authRepository from './repository.js';

// Crear instancia de app para tests
const app = createApp();

/**
 * Setup y teardown de tests
 */
let testUser = null;
let accessToken = null;
let refreshToken = null;

beforeAll(async () => {
    // Esperar a que la DB esté lista
    await sequelize.authenticate();
});

afterAll(async () => {
    // Cleanup: eliminar usuario de prueba si existe
    if (testUser) {
        await sequelize.models.User.destroy({ 
            where: { email: 'test@auth.com' },
            force: true // hard delete
        });
    }
    
    // Cerrar conexiones
    await sequelize.close();
});

beforeEach(async () => {
    // Limpiar tokens de prueba anteriores
    if (testUser) {
        await sequelize.models.RefreshToken.destroy({
            where: { user_id: testUser.id },
            force: true
        });
    }
});

/**
 * Tests de registro y login
 */
describe('POST /api/v1/auth/register', () => {
    it('debe registrar un nuevo usuario y devolver tokens', async () => {
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: 'test@auth.com',
                password: 'TestPass123!',
                first_name: 'Test',
                last_name: 'User'
            })
            .expect(201);

        expect(response.body.ok).toBe(true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('access_token');
        expect(response.body.data).toHaveProperty('refresh_token');
        expect(response.body.data.user).toHaveProperty('public_code');
        expect(response.body.data.user).not.toHaveProperty('password_hash');
        
        // Guardar para otros tests
        testUser = response.body.data.user;
        accessToken = response.body.data.access_token;
        refreshToken = response.body.data.refresh_token;
    });

    it('debe rechazar registro con email duplicado', async () => {
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: 'test@auth.com',
                password: 'TestPass123!',
                first_name: 'Test',
                last_name: 'User'
            })
            .expect(409);

        expect(response.body.ok).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'EMAIL_ALREADY_EXISTS');
    });

    it('debe rechazar registro con password débil', async () => {
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: 'weak@auth.com',
                password: 'weak',
                first_name: 'Test',
                last_name: 'User'
            })
            .expect(400);

        expect(response.body.ok).toBe(false);
    });
});

describe('POST /api/v1/auth/login', () => {
    it('debe hacer login con credenciales correctas', async () => {
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'test@auth.com',
                password: 'TestPass123!'
            })
            .expect(200);

        expect(response.body.ok).toBe(true);
        expect(response.body.data).toHaveProperty('access_token');
        expect(response.body.data).toHaveProperty('refresh_token');
        expect(response.body.data.user.email).toBe('test@auth.com');
        
        // Actualizar tokens
        accessToken = response.body.data.access_token;
        refreshToken = response.body.data.refresh_token;
    });

    it('debe rechazar login con password incorrecta', async () => {
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'test@auth.com',
                password: 'WrongPassword123!'
            })
            .expect(401);

        expect(response.body.ok).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('debe rechazar login con email inexistente', async () => {
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'noexiste@auth.com',
                password: 'TestPass123!'
            })
            .expect(401);

        expect(response.body.ok).toBe(false);
    });
});

/**
 * Tests de refresh token con rotación
 */
describe('POST /api/v1/auth/refresh', () => {
    it('debe renovar tokens usando refresh token válido', async () => {
        const oldRefreshToken = refreshToken;
        
        const response = await request(app)
            .post('/api/v1/auth/refresh')
            .send({
                refresh_token: oldRefreshToken
            })
            .expect(200);

        expect(response.body.ok).toBe(true);
        expect(response.body.data).toHaveProperty('access_token');
        expect(response.body.data).toHaveProperty('refresh_token');
        
        // Verificar que se generó un nuevo refresh token (rotación)
        expect(response.body.data.refresh_token).not.toBe(oldRefreshToken);
        
        // Actualizar tokens
        accessToken = response.body.data.access_token;
        refreshToken = response.body.data.refresh_token;
    });

    it('debe rechazar refresh token inválido', async () => {
        const response = await request(app)
            .post('/api/v1/auth/refresh')
            .send({
                refresh_token: 'token_invalido'
            })
            .expect(401);

        expect(response.body.ok).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'INVALID_REFRESH_TOKEN');
    });
});

/**
 * Tests de endpoints protegidos
 */
describe('GET /api/v1/auth/me', () => {
    it('debe devolver datos del usuario autenticado', async () => {
        const response = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body.ok).toBe(true);
        expect(response.body.data.user.email).toBe('test@auth.com');
    });

    it('debe rechazar petición sin token', async () => {
        const response = await request(app)
            .get('/api/v1/auth/me')
            .expect(401);

        expect(response.body.ok).toBe(false);
    });

    it('debe rechazar petición con token inválido', async () => {
        const response = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', 'Bearer token_invalido')
            .expect(401);

        expect(response.body.ok).toBe(false);
    });
});

describe('POST /api/v1/auth/change-password', () => {
    it('debe cambiar password y revocar todos los refresh tokens', async () => {
        // Cambiar password
        const response = await request(app)
            .post('/api/v1/auth/change-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                current_password: 'TestPass123!',
                new_password: 'NewTestPass123!'
            })
            .expect(200);

        expect(response.body.ok).toBe(true);
        expect(response.body.data.message).toContain('exitosamente');
        
        // Verificar que el refresh token viejo fue revocado
        const refreshResponse = await request(app)
            .post('/api/v1/auth/refresh')
            .send({
                refresh_token: refreshToken
            })
            .expect(401);
        
        expect(refreshResponse.body.error.code).toBe('TOKEN_REUSE_DETECTED');
        
        // Hacer login con nueva password
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'test@auth.com',
                password: 'NewTestPass123!'
            })
            .expect(200);
        
        // Actualizar tokens
        accessToken = loginResponse.body.data.access_token;
        refreshToken = loginResponse.body.data.refresh_token;
    });

    it('debe rechazar cambio con password actual incorrecta', async () => {
        const response = await request(app)
            .post('/api/v1/auth/change-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                current_password: 'WrongPassword123!',
                new_password: 'NewTestPass123!'
            })
            .expect(401);

        expect(response.body.ok).toBe(false);
    });
});

/**
 * Tests de sesiones
 */
describe('GET /api/v1/auth/sessions', () => {
    it('debe listar sesiones activas del usuario', async () => {
        const response = await request(app)
            .get('/api/v1/auth/sessions')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body.ok).toBe(true);
        expect(response.body.data.sessions).toBeInstanceOf(Array);
        expect(response.body.data.sessions.length).toBeGreaterThan(0);
        expect(response.body.data.sessions[0]).toHaveProperty('id');
        expect(response.body.data.sessions[0]).toHaveProperty('created_at');
    });
});

describe('POST /api/v1/auth/logout', () => {
    it('debe cerrar sesión actual (enviar token en body)', async () => {
        const response = await request(app)
            .post('/api/v1/auth/logout')
            .send({
                refresh_token: refreshToken
            })
            .expect(200);

        expect(response.body.ok).toBe(true);
        expect(response.body.data.message).toContain('exitosamente');
        
        // Verificar que el refresh token ya no funciona
        const refreshResponse = await request(app)
            .post('/api/v1/auth/refresh')
            .send({
                refresh_token: refreshToken
            })
            .expect(401);
        
        expect(refreshResponse.body.error.code).toBe('TOKEN_REUSE_DETECTED');
        
        // Hacer login nuevamente para siguientes tests
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'test@auth.com',
                password: 'NewTestPass123!'
            })
            .expect(200);
        
        accessToken = loginResponse.body.data.access_token;
        refreshToken = loginResponse.body.data.refresh_token;
    });

    it('debe cerrar sesión actual (enviar token en header)', async () => {
        const response = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${refreshToken}`)
            .expect(200);

        expect(response.body.ok).toBe(true);
        
        // Login nuevamente
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'test@auth.com',
                password: 'NewTestPass123!'
            })
            .expect(200);
        
        accessToken = loginResponse.body.data.access_token;
        refreshToken = loginResponse.body.data.refresh_token;
    });
});

describe('POST /api/v1/auth/logout-all', () => {
    it('debe cerrar todas las sesiones del usuario', async () => {
        // Crear múltiples sesiones (hacer login varias veces)
        await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'test@auth.com',
                password: 'NewTestPass123!'
            });
        
        await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'test@auth.com',
                password: 'NewTestPass123!'
            });
        
        // Cerrar todas las sesiones
        const response = await request(app)
            .post('/api/v1/auth/logout-all')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body.ok).toBe(true);
        expect(response.body.data.sessions_closed).toBeGreaterThanOrEqual(1);
        
        // Verificar que el refresh token ya no funciona
        const refreshResponse = await request(app)
            .post('/api/v1/auth/refresh')
            .send({
                refresh_token: refreshToken
            })
            .expect(401);
        
        expect(refreshResponse.body.error.code).toBe('TOKEN_REUSE_DETECTED');
    });
});

/**
 * Test de detección de robo de tokens (Token Theft Detection)
 * Este es el test más crítico de seguridad del sistema
 */
describe('Detección de robo de tokens (Token Theft Detection)', () => {
    it('debe detectar reuso de token rotado y revocar TODAS las sesiones', async () => {
        // 1. Hacer login para obtener tokens frescos
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'test@auth.com',
                password: 'NewTestPass123!'
            })
            .expect(200);
        
        const oldRefreshToken = loginResponse.body.data.refresh_token;
        const oldAccessToken = loginResponse.body.data.access_token;
        
        // 2. Hacer refresh (esto rota el token - el viejo queda revocado)
        const refreshResponse = await request(app)
            .post('/api/v1/auth/refresh')
            .send({
                refresh_token: oldRefreshToken
            })
            .expect(200);
        
        const newRefreshToken = refreshResponse.body.data.refresh_token;
        const newAccessToken = refreshResponse.body.data.access_token;
        
        // Verificar que se generó un token diferente (rotación)
        expect(newRefreshToken).not.toBe(oldRefreshToken);
        
        // 3. Crear una segunda sesión (simular otro dispositivo)
        const secondLoginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'test@auth.com',
                password: 'NewTestPass123!'
            })
            .expect(200);
        
        const secondDeviceRefreshToken = secondLoginResponse.body.data.refresh_token;
        
        // 4. ATAQUE: Intentar reusar el token viejo rotado
        // Esto simula que un atacante obtuvo el token viejo
        const theftAttemptResponse = await request(app)
            .post('/api/v1/auth/refresh')
            .send({
                refresh_token: oldRefreshToken
            })
            .expect(401);
        
        // Verificar que se detectó el robo
        expect(theftAttemptResponse.body.ok).toBe(false);
        expect(theftAttemptResponse.body.error.code).toBe('TOKEN_REUSE_DETECTED');
        expect(theftAttemptResponse.body.error.message).toContain('todas las sesiones');
        
        // 5. VERIFICACIÓN CRÍTICA: El token nuevo también debe estar revocado
        // (TODAS las sesiones del usuario fueron cerradas por seguridad)
        const newTokenResponse = await request(app)
            .post('/api/v1/auth/refresh')
            .send({
                refresh_token: newRefreshToken
            })
            .expect(401);
        
        expect(newTokenResponse.body.error.code).toBe('TOKEN_REUSE_DETECTED');
        
        // 6. Verificar que la segunda sesión también fue revocada
        const secondDeviceResponse = await request(app)
            .post('/api/v1/auth/refresh')
            .send({
                refresh_token: secondDeviceRefreshToken
            })
            .expect(401);
        
        expect(secondDeviceResponse.body.error.code).toBe('TOKEN_REUSE_DETECTED');
        
        // 7. Verificar que tampoco podemos usar los access tokens
        const meResponseOld = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${oldAccessToken}`)
            .expect(401);
        
        const meResponseNew = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${newAccessToken}`)
            .expect(401);
        
        // Los access tokens fallan porque el usuario fue desactivado temporalmente
        // o porque la validación verifica que todas las sesiones fueron revocadas
    });

    it('debe permitir login normal después de detección de robo', async () => {
        // Después de una detección de robo, el usuario debe poder hacer login normalmente
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'test@auth.com',
                password: 'NewTestPass123!'
            })
            .expect(200);
        
        expect(loginResponse.body.ok).toBe(true);
        expect(loginResponse.body.data).toHaveProperty('access_token');
        expect(loginResponse.body.data).toHaveProperty('refresh_token');
        
        // Guardar para cleanup
        accessToken = loginResponse.body.data.access_token;
        refreshToken = loginResponse.body.data.refresh_token;
    });
});

export default { testUser, accessToken, refreshToken };
