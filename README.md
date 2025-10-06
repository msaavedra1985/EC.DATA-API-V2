# EC.DATA API - Enterprise REST API

API REST empresarial construida con Node.js, Express, PostgreSQL y Redis. Sistema completo de autenticación JWT con control de acceso basado en roles (RBAC).

## 🚀 Características Principales

- ✅ **Autenticación JWT** con claims estándar RFC 7519
- ✅ **Sistema RBAC** con 7 roles en base de datos
- ✅ **Caché Redis** para optimización de rendimiento
- ✅ **Validación robusta** con Zod
- ✅ **Documentación Swagger** en `/docs`
- ✅ **Métricas Prometheus** en `/metrics`
- ✅ **Logging estructurado** con Pino (worker threads)
- ✅ **Multi-idioma** (Español e Inglés)

## 📋 Requisitos

- Node.js 20+
- PostgreSQL 14+
- Redis (opcional, usa fallback en memoria)

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev

# Sincronizar esquema de base de datos
npm run db:push
```

## 🔐 Sistema de Autenticación JWT

### Estructura de Tokens

El sistema implementa autenticación JWT dual con:

- **Access Token**: Válido por 15 minutos
- **Refresh Token**: Válido por 14 días, almacenado en BD

#### Claims Estándar (RFC 7519)

```javascript
{
  "iss": "https://api.ec.com",           // Emisor
  "aud": "ec-frontend",                  // Audiencia
  "sub": "user-uuid",                    // Usuario (subject)
  "iat": 1234567890,                     // Fecha de emisión
  "exp": 1234568790,                     // Fecha de expiración
  "jti": "token-uuid",                   // ID único del token
  "orgId": "org-uuid",                   // Organización
  "sessionVersion": 1,                   // Versión de sesión
  "tokenType": "access",                 // Tipo de token
  "role": {                              // Rol del usuario
    "id": "role-uuid",
    "name": "user",
    "description": "...",
    "is_active": true
  }
}
```

### Endpoints de Autenticación

Todos los ejemplos asumen que el servidor está corriendo en `http://localhost:5000`.

#### Registrar Usuario

```bash
# Ejemplo ejecutable con curl
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "SecurePass123!",
    "first_name": "Juan",
    "last_name": "Pérez"
  }'
```

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "0199baa7-ff28-743c-9673-6bed636d0f33",
      "email": "usuario@example.com",
      "first_name": "Juan",
      "last_name": "Pérez",
      "role": {
        "id": "0199ba9c-0c65-742d-80cc-5584d87678a6",
        "name": "user",
        "description": "Usuario estándar"
      }
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "15m",
    "token_type": "Bearer"
  }
}
```

#### Iniciar Sesión

```bash
# Login y guardar tokens en variables de entorno
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "SecurePass123!"
  }' | jq -r '.data | "export ACCESS_TOKEN=\(.access_token)\nexport REFRESH_TOKEN=\(.refresh_token)"'

# Ejemplo simple
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "SecurePass123!"
  }'
```

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "0199baa7-ff28-743c-9673-6bed636d0f33",
      "email": "usuario@example.com",
      "first_name": "Juan",
      "last_name": "Pérez",
      "role": {
        "name": "user",
        "description": "Usuario estándar"
      }
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS5lYy5jb20iLCJhdWQiOiJlYy1mcm9udGVuZCIsInN1YiI6IjAxOTliYWE3LWZmMjgtNzQzYy05NjczLTZiZWQ2MzZkMGYzMyIsIm9yZ0lkIjpudWxsLCJzZXNzaW9uVmVyc2lvbiI6MSwicm9sZSI6eyJpZCI6IjAxOTliYTljLTBjNjUtNzQyZC04MGNjLTU1ODRkODc2NzhhNiIsIm5hbWUiOiJ1c2VyIn0sInRva2VuVHlwZSI6ImFjY2VzcyIsImp0aSI6IjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTBhYiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAwOTAwfQ...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS5lYy5jb20iLCJhdWQiOiJlYy1mcm9udGVuZCIsInN1YiI6IjAxOTliYWE3LWZmMjgtNzQzYy05NjczLTZiZWQ2MzZkMGYzMyIsInRva2VuVHlwZSI6InJlZnJlc2giLCJqdGkiOiI5ODc2NTQzMi0xMjM0LTEyMzQtMTIzNC0wOTg3NjU0MzIxYWIiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMTIwOTYwMH0...",
    "expires_in": "15m",
    "token_type": "Bearer"
  },
  "meta": {
    "timestamp": "2025-10-06T17:00:00.000Z"
  }
}
```

#### Refrescar Token

```bash
# Usar refresh token para obtener nuevo access token
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "'"$REFRESH_TOKEN"'"
  }'

# Con token literal
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS5lYy5jb20iLCJhdWQiOiJlYy1mcm9udGVuZCIsInN1YiI6IjAxOTliYWE3LWZmMjgtNzQzYy05NjczLTZiZWQ2MzZkMGYzMyIsIm9yZ0lkIjpudWxsLCJzZXNzaW9uVmVyc2lvbiI6MSwicm9sZSI6eyJpZCI6IjAxOTliYTljLTBjNjUtNzQyZC04MGNjLTU1ODRkODc2NzhhNiIsIm5hbWUiOiJ1c2VyIn0sInRva2VuVHlwZSI6ImFjY2VzcyIsImp0aSI6ImFiY2RlZjEyLTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTBhYiIsImlhdCI6MTcwMDAwMTAwMCwiZXhwIjoxNzAwMDAxOTAwfQ...",
    "expires_in": "15m",
    "token_type": "Bearer"
  },
  "meta": {
    "timestamp": "2025-10-06T17:01:00.000Z"
  }
}
```

#### Obtener Usuario Actual

```bash
# Usando variable de entorno
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Con token literal
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "id": "0199baa7-ff28-743c-9673-6bed636d0f33",
    "human_id": 1,
    "public_code": "EC-001-U-8",
    "email": "usuario@example.com",
    "first_name": "Juan",
    "last_name": "Pérez",
    "is_active": true,
    "last_login_at": "2025-10-06T17:00:00.000Z",
    "role": {
      "id": "0199ba9c-0c65-742d-80cc-5584d87678a6",
      "name": "user",
      "description": "Usuario estándar"
    },
    "organization_id": null
  },
  "meta": {
    "timestamp": "2025-10-06T17:02:00.000Z"
  }
}
```

#### Cerrar Sesión

```bash
# Cerrar sesión actual (invalida el refresh token específico)
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "'"$REFRESH_TOKEN"'"
  }'

# Con tokens literales
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "message": "Sesión cerrada exitosamente"
  },
  "meta": {
    "timestamp": "2025-10-06T17:03:00.000Z"
  }
}
```

#### Cerrar Todas las Sesiones

```bash
# Invalida todos los refresh tokens del usuario (con variable)
curl -X POST http://localhost:5000/api/v1/auth/logout-all \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Con token literal
curl -X POST http://localhost:5000/api/v1/auth/logout-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "message": "Todas las sesiones han sido cerradas",
    "sessions_revoked": 3
  },
  "meta": {
    "timestamp": "2025-10-06T17:04:00.000Z"
  }
}
```

#### Cambiar Contraseña

```bash
# Cambiar contraseña (invalida todas las sesiones excepto la actual)
curl -X POST http://localhost:5000/api/v1/auth/change-password \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "SecurePass123!",
    "new_password": "NewSecurePass456!"
  }'

# Con token literal
curl -X POST http://localhost:5000/api/v1/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "SecurePass123!",
    "new_password": "NewSecurePass456!"
  }'
```

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "message": "Contraseña actualizada exitosamente",
    "sessions_revoked": 2
  },
  "meta": {
    "timestamp": "2025-10-06T17:05:00.000Z"
  }
}
```

## 👥 Sistema RBAC (Role-Based Access Control)

### Roles Disponibles

El sistema cuenta con 7 roles predefinidos con jerarquía de permisos:

| Rol | Nombre | Descripción |
|-----|--------|-------------|
| 1️⃣ | `system-admin` | Administrador del sistema. Acceso total a todas las funciones, incluyendo gestión de organizaciones, usuarios globales y configuraciones del sistema. |
| 2️⃣ | `org-admin` | Administrador de organización. Acceso completo dentro de su organización: gestión de usuarios, configuraciones, facturación y contenido. |
| 3️⃣ | `org-manager` | Gerente de organización. Supervisión y reportes dentro de la organización, puede aprobar acciones y gestionar equipos, sin configuración de sistema. |
| 4️⃣ | `user` | Usuario estándar. Acceso a secciones habilitadas; puede crear/ver contenido propio o de equipo (ej: subir facturas, ver dashboards), sin gestión de usuarios. |
| 5️⃣ | `viewer` | Visualizador. Solo lectura de contenido permitido, sin capacidades de edición, creación o configuración. |
| 6️⃣ | `guest` | Invitado. Acceso temporal limitado con permisos mínimos para áreas públicas o de prueba. |
| 7️⃣ | `demo` | Cuenta demo. Para demostraciones; acceso limitado con datos de ejemplo, sin capacidad de modificar configuraciones reales. |

### Middleware de Autorización

#### `authenticate`
Valida el token JWT y carga el usuario en `req.user`:

```javascript
import { authenticate } from './middleware/auth.js';

router.get('/protected', authenticate, (req, res) => {
  // req.user está disponible
  res.json({ user: req.user });
});
```

#### `requireRole(...roles)`
Restringe acceso a roles específicos:

```javascript
import { authenticate, requireRole } from './middleware/auth.js';

// Solo system-admin y org-admin pueden acceder
router.post('/admin/users', 
  authenticate, 
  requireRole(['system-admin', 'org-admin']), 
  createUser
);

// Solo usuarios autenticados (cualquier rol)
router.get('/dashboard', authenticate, getDashboard);
```

### Métodos de Usuario

```javascript
// Verificar si tiene un rol específico
if (user.hasRole('system-admin')) {
  // Acciones de admin
}

// Verificar si es admin del sistema
if (user.isSystemAdmin()) {
  // Acciones exclusivas
}

// Verificar si es admin de organización
if (user.isOrgAdmin()) {
  // Acciones de org-admin
}
```

## 🗄️ Caché y Sesiones

### Caché Redis de Usuarios

Los datos de usuario se cachean en Redis por 15 minutos para optimizar rendimiento:

```javascript
// Flujo de validación de token
1. Verificar token JWT
2. Buscar usuario en caché Redis (TTL: 15min)
3. Si no existe en caché, consultar PostgreSQL
4. Guardar en caché para futuras peticiones
```

### Invalidación de Sesiones

El sistema soporta invalidación instantánea de sesiones mediante `sessionVersion`:

```javascript
// Incrementar sessionVersion invalida todos los tokens del usuario
await invalidateUserSession(userId);

// Causas de invalidación automática:
- Cambio de contraseña
- Logout de todas las sesiones
- Desactivación de cuenta
- Detección de robo de token
```

## 🧪 Usuarios de Prueba

Para testing del sistema RBAC:

| Email | Contraseña | Rol | Uso |
|-------|-----------|-----|-----|
| `orgadmin2@test.com` | `AdminPass123!` | `org-admin` | Testing de endpoints protegidos para admins |
| `testrbac2@example.com` | `SecurePass123!` | `user` | Testing de usuario estándar |

### Endpoint de Prueba RBAC

```bash
# Testing con org-admin (debe permitir acceso)
GET /api/v1/auth/admin-test
Authorization: Bearer {admin_access_token}

# Testing con usuario regular (debe denegar con 403)
GET /api/v1/auth/admin-test
Authorization: Bearer {user_access_token}
```

## 📚 Documentación API

La documentación completa de la API está disponible en:

```
http://localhost:5000/docs
```

Incluye todos los endpoints, schemas, ejemplos de request/response y autenticación.

## 🎯 Endpoints Principales

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Registrar nuevo usuario | ❌ |
| POST | `/api/v1/auth/login` | Iniciar sesión | ❌ |
| POST | `/api/v1/auth/refresh` | Refrescar access token | ❌ |
| GET | `/api/v1/auth/me` | Obtener usuario actual | ✅ |
| POST | `/api/v1/auth/logout` | Cerrar sesión actual | ✅ |
| POST | `/api/v1/auth/logout-all` | Cerrar todas las sesiones | ✅ |
| GET | `/api/v1/auth/sessions` | Listar sesiones activas | ✅ |
| POST | `/api/v1/auth/change-password` | Cambiar contraseña | ✅ |
| GET | `/api/v1/health` | Health check | ❌ |
| GET | `/metrics` | Métricas Prometheus | ❌ |

## 🔒 Seguridad

- ✅ Passwords hasheados con bcrypt (10 rounds)
- ✅ Refresh tokens hasheados con SHA-256 en BD
- ✅ Validación de claims JWT (iss, aud, exp)
- ✅ CORS configurado con orígenes dinámicos
- ✅ Helmet para headers de seguridad
- ✅ Rate limiting (modo observación)
- ✅ Auditoría de sesiones (user-agent, IP)
- ✅ Detección de robo de tokens
- ✅ Expiración y limpieza automática de tokens

## 📊 Observabilidad

### Logging (Pino)
```javascript
// Logs estructurados en JSON
logger.info({ userId, action }, 'User logged in');
logger.error({ error, context }, 'Operation failed');
```

### Métricas (Prometheus)
- Duración de requests HTTP
- Contadores de requests por endpoint
- Conexiones activas
- Métricas personalizadas de negocio

## 🌍 Internacionalización

El sistema soporta múltiples idiomas:

- **Español** (es) - idioma por defecto
- **Inglés** (en)

Los mensajes se traducen automáticamente según:
1. Header `Accept-Language`
2. Query param `?lang=es`
3. Idioma por defecto del sistema

## 🛠️ Scripts NPM

```bash
npm run dev          # Desarrollo con hot-reload
npm run start        # Producción
npm run db:push      # Sincronizar schema a BD
npm run db:dbml      # Generar diagrama DBML
npm test             # Ejecutar tests
```

## 📁 Estructura del Proyecto

```
src/
├── modules/
│   └── auth/              # Módulo de autenticación
│       ├── index.js       # Rutas
│       ├── services.js    # Lógica de negocio
│       ├── repository.js  # Acceso a datos
│       ├── cache.js       # Caché Redis
│       ├── dtos/          # Validación Zod
│       └── models/        # Modelos Sequelize
├── middleware/
│   ├── auth.js           # Autenticación y autorización
│   ├── validate.js       # Validación de requests
│   └── errorHandler.js   # Manejo de errores
├── config/
│   └── env.js            # Variables de entorno
└── utils/
    ├── logger.js         # Logger Pino
    └── response.js       # Helpers de respuesta
```

## 🚦 Variables de Entorno

```env
# Servidor
NODE_ENV=development
PORT=5000

# Base de datos
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=14d
```

## 🤝 Contribución

El proyecto sigue estándares estrictos de código:

- **Idioma:** Código en inglés, comentarios en español
- **Sintaxis:** Arrow functions, ESM modules
- **Estilo:** Single quotes, comentarios extensivos
- **Arquitectura:** Feature-based, separación en capas

## 📝 Licencia

Propiedad de EC.DATA - Enterprise Data Solutions

---

**Versión:** 1.0.0  
**Última actualización:** Octubre 2025  
**Contacto:** api-support@ecdata.com
