# Rate Limiting y Testing - EC.DATA API

## 📋 Resumen de Mejoras del Sistema

Este documento detalla las mejoras implementadas en el sistema EC.DATA API para protección, estabilidad y calidad del código.

---

## 🚦 Rate Limiting con Redis

### Descripción
Sistema de rate limiting inteligente con soporte de Redis y fallback en memoria. Protege la API contra abuso, ataques DDoS y uso excesivo de recursos.

### Características Principales

#### 1. **Límites Diferenciados por Rol**
El sistema aplica diferentes límites según el tipo de usuario:

| Tipo de Usuario | Límite (req/min) | Uso |
|----------------|------------------|-----|
| **System Admin** | 500 | Administradores del sistema |
| **Org Admin/Manager** | 200 | Administradores de organizaciones |
| **Usuarios Autenticados** | 100 | Usuarios regulares con login |
| **Endpoints de Auth** | 10 | Login, register (prevención brute force) |
| **Endpoints Públicos** | 30 | Sin autenticación |

#### 2. **Modo Dual: Observación vs Activo**
- **Modo Observación** (default): Solo logea excesos sin bloquear
- **Modo Activo**: Bloquea requests que excedan el límite (HTTP 429)

Control via variable de entorno:
```bash
# Modo observación (default)
RATE_LIMIT_OBSERVE_MODE=true

# Modo activo (bloquea requests)
RATE_LIMIT_OBSERVE_MODE=false
```

#### 3. **Headers Informativos**
Todos los requests incluyen headers de rate limiting:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-10-28T15:30:00.000Z
```

#### 4. **Identificación Inteligente**
- **Usuarios autenticados**: Tracking por `user_id`
- **Usuarios anónimos**: Tracking por IP address
- **Normalización de paths**: `/users/123` y `/users/456` cuentan como el mismo endpoint

#### 5. **Fallback Robusto**
Si Redis falla, el sistema automáticamente usa cache en memoria para no interrumpir el servicio.

### Implementación

**Archivo**: `src/middleware/rateLimit.js`

**Configuración**: `src/config/env.js`
```javascript
rateLimit: {
    windowMs: 60000, // 1 minuto
    maxRequests: 100,
    observeOnly: true // Modo observación por defecto
}
```

**Integración**: `src/app.js`
```javascript
app.use(rateLimitMiddleware({ 
    observeOnly: config.rateLimit.observeOnly 
}));
```

### Monitoreo y Logs

El middleware logea automáticamente cuando un usuario excede el límite:

```json
{
  "msg": "Rate limit exceeded",
  "identifier": "user:01934abc-...",
  "path": "/api/v1/users",
  "count": 105,
  "limit": 100,
  "mode": "observe",
  "user": { "id": "...", "email": "user@example.com" }
}
```

### Recomendaciones para Producción

1. **Activar Modo Activo**: Cambiar `RATE_LIMIT_OBSERVE_MODE=false`
2. **Ajustar Límites**: Según tráfico real y necesidades del negocio
3. **Monitorear Logs**: Buscar patrones de abuso antes de activar bloqueo
4. **Redis Requerido**: Asegurar que Redis esté disponible en producción

---

## 🧪 Sistema de Testing con Vitest

### Descripción
Suite completa de testing para garantizar calidad y estabilidad del código antes de despliegues.

### Estructura de Testing

```
tests/
├── setup.js                 # Setup global (DB, Redis)
└── helpers/
    ├── testServer.js        # Instancia Express para tests
    ├── fixtures.js          # Datos de prueba
    └── cleanupDB.js         # Limpieza de datos
src/modules/
└── auth/
    └── auth.test.js         # Tests de autenticación (ya existente)
```

### Configuración

**Archivo**: `vitest.config.js`

Características:
- Timeout de 30 segundos para tests con DB
- Coverage con V8
- Setup automático de conexiones
- Paralelización para velocidad

### Helpers Disponibles

#### 1. **Test Server** (`testServer.js`)
```javascript
import { getTestApp, authHeaders, langHeaders } from '../helpers/testServer.js';
import request from 'supertest';

const app = getTestApp();

// Usar en tests
await request(app)
    .get('/api/v1/users')
    .set(authHeaders(token))
    .expect(200);
```

#### 2. **Fixtures** (`fixtures.js`)
Datos de prueba pre-configurados:

```javascript
import { setupFixtures } from '../helpers/fixtures.js';

// En beforeAll de tu test
const { roles, users, organizations } = await setupFixtures();

// Ahora tienes:
// - users.admin (system-admin)
// - users.user1 (usuario regular)
// - organizations.ecdata (org raíz)
// - roles.systemAdmin, roles.user, etc.
```

#### 3. **Cleanup** (`cleanupDB.js`)
Limpieza automática de datos de prueba:

```javascript
import { cleanupUserComplete } from '../helpers/cleanupDB.js';

// En afterAll
await cleanupUserComplete(userId, 'test@example.com');
```

### Tests Existentes

**Auth Tests** (`src/modules/auth/auth.test.js`):
- ✅ Registro de usuarios
- ✅ Login con credenciales
- ✅ Refresh token con rotación
- ✅ Cambio de password
- ✅ Logout y logout-all
- ✅ Detección de robo de tokens (Token Theft Detection)
- ✅ Gestión de sesiones

### Ejecutar Tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar en modo watch
npm run test:watch

# Con coverage
npm test -- --coverage
```

### Próximos Tests a Implementar

**Usuarios** (`src/modules/users/users.test.js`):
- CRUD de usuarios
- Validación de email
- Multi-organización (agregar/remover)

**Organizaciones** (`src/modules/organizations/organizations.test.js`):
- CRUD de organizaciones
- Jerarquía y scope
- Validación de slug

---

## 🔐 Mejores Prácticas

### Rate Limiting

1. **Monitorear Primero**: Ejecutar en modo observación 1-2 semanas
2. **Analizar Patrones**: Identificar tráfico legítimo vs abuso
3. **Activar Gradualmente**: Empezar con límites altos, reducir según necesidad
4. **Whitelist Admin**: System admins tienen límite más alto (500/min)

### Testing

1. **Test Coverage Mínimo**: 70% para código crítico (auth, users, orgs)
2. **Fixtures Consistentes**: Usar helper de fixtures, no crear datos manualmente
3. **Cleanup Obligatorio**: Siempre limpiar datos en `afterAll`
4. **Tests Independientes**: Cada test debe poder correr solo
5. **Nombres Descriptivos**: `debe rechazar login con password incorrecta`

---

## 📊 Métricas y Monitoreo

### Rate Limiting
- Log de excesos en `logger.warn()`
- Headers visibles en todas las respuestas
- Redis keys: `ratelimit:{identifier}:{path}`

### Testing
- Coverage reports en `coverage/` (si se activa con `--coverage`)
- Reporter verbose muestra progreso en tiempo real
- Tests en paralelo para velocidad

---

## 🚀 Estado Actual

### Implementado ✅
- [x] Middleware de rate limiting con Redis
- [x] Modo observación y modo activo
- [x] Límites diferenciados por rol
- [x] Configuración de Vitest
- [x] Helpers de testing (server, fixtures, cleanup)
- [x] Tests de autenticación completos
- [x] Fallback en memoria cuando Redis falla

### Pendiente ⏳
- [ ] Tests de módulo de usuarios
- [ ] Tests de módulo de organizaciones
- [ ] Ajuste de límites basado en tráfico real
- [ ] Activación de modo activo en producción
- [ ] Documentación Swagger de headers de rate limiting

---

## 📝 Referencias

- **Rate Limiting Middleware**: `src/middleware/rateLimit.js`
- **Configuración**: `src/config/env.js`
- **Vitest Config**: `vitest.config.js`
- **Test Helpers**: `tests/helpers/`
- **Tests Existentes**: `src/modules/auth/auth.test.js`
