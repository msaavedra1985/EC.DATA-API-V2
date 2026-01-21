# Módulos Implementados

> **CONSULTAR**: Para entender qué funcionalidad existe y dónde encontrarla

## Módulos Core

### auth
**Ubicación**: `src/modules/auth/`
**Propósito**: Autenticación y gestión de sesiones

**Endpoints principales**:
- `POST /api/v1/auth/login` - Login con email/username/public_code
- `POST /api/v1/auth/refresh` - Renovar access token
- `POST /api/v1/auth/logout` - Cerrar sesión
- `GET /api/v1/auth/me` - Perfil completo (reconstruye cache)
- `GET /api/v1/auth/session-context` - Contexto desde Redis (~5-15ms)
- `GET /api/v1/auth/organizations` - Organizaciones del usuario
- `POST /api/v1/auth/switch-org` - Cambiar organización activa
- `POST /api/v1/auth/impersonate-org` - Impersonar organización (system-admin)

**Archivos clave**:
- `services.js` - Lógica de login, tokens, refresh
- `sessionContextCache.js` - Cache Redis de session_context
- `refreshTokenRepository.js` - CRUD de refresh tokens
- `models/RefreshToken.js` - Modelo Sequelize

---

### users
**Ubicación**: `src/modules/users/`
**Propósito**: Gestión de usuarios

**Endpoints principales**:
- `GET /api/v1/users` - Listar usuarios (paginado)
- `GET /api/v1/users/:publicCode` - Obtener usuario
- `POST /api/v1/users` - Crear usuario
- `PATCH /api/v1/users/:publicCode` - Actualizar usuario
- `DELETE /api/v1/users/:publicCode` - Eliminar usuario (soft delete)

---

### organizations
**Ubicación**: `src/modules/organizations/`
**Propósito**: Gestión de organizaciones multi-tenant

**Endpoints principales**:
- `GET /api/v1/organizations` - Listar organizaciones
- `GET /api/v1/organizations/:publicCode` - Obtener organización
- `POST /api/v1/organizations` - Crear organización
- `PATCH /api/v1/organizations/:publicCode` - Actualizar
- `DELETE /api/v1/organizations/:publicCode` - Eliminar

**Features**:
- Jerarquía con parent_id (auto-referencial)
- Relación many-to-many con users
- Middleware de ownership validation

---

### sites
**Ubicación**: `src/modules/sites/`
**Propósito**: Gestión de ubicaciones físicas

**Endpoints principales**:
- `GET /api/v1/sites` - Listar sitios de la organización
- `GET /api/v1/sites/:publicCode` - Obtener sitio
- `POST /api/v1/sites` - Crear sitio
- `PATCH /api/v1/sites/:publicCode` - Actualizar
- `DELETE /api/v1/sites/:publicCode` - Eliminar

---

### devices
**Ubicación**: `src/modules/devices/`
**Propósito**: Gestión de dispositivos IoT/Edge

**Endpoints principales**:
- `GET /api/v1/devices` - Listar dispositivos
- `GET /api/v1/devices/:publicCode` - Obtener dispositivo
- `POST /api/v1/devices` - Registrar dispositivo
- `PATCH /api/v1/devices/:publicCode` - Actualizar
- `DELETE /api/v1/devices/:publicCode` - Eliminar

---

### channels
**Ubicación**: `src/modules/channels/`
**Propósito**: Gestión de canales de comunicación (MQTT, HTTP, WebSocket)

**Endpoints principales**:
- `GET /api/v1/channels` - Listar canales
- `GET /api/v1/channels/:publicCode` - Obtener canal
- `POST /api/v1/channels` - Crear canal
- `PATCH /api/v1/channels/:publicCode` - Actualizar
- `DELETE /api/v1/channels/:publicCode` - Eliminar

---

### files
**Ubicación**: `src/modules/files/`
**Propósito**: Upload de archivos via Azure Blob Storage

**Endpoints principales**:
- `POST /api/v1/files/upload` - Subir archivo
- `GET /api/v1/files/:publicCode` - Obtener URL firmada (SAS)
- `DELETE /api/v1/files/:publicCode` - Eliminar archivo

**Features**:
- Generación de SAS URLs
- Metadata tracking en PostgreSQL

---

### telemetry
**Ubicación**: `src/modules/telemetry/`
**Propósito**: Datos de series temporales desde Cassandra

**Endpoints principales**:
- `GET /api/v1/telemetry/variables` - Variables de medición
- `GET /api/v1/telemetry/data` - Datos con filtros de tiempo
- `POST /api/v1/telemetry/data` - Insertar mediciones

**Features**:
- Multi-language support para nombres de variables
- Timezone-aware filtering
- Apache Cassandra backend

---

### resource-hierarchy
**Ubicación**: `src/modules/resource-hierarchy/`
**Propósito**: Árbol flexible de recursos usando PostgreSQL ltree

**Endpoints principales**:
- `GET /api/v1/resources` - Árbol completo o nodo específico
- `GET /api/v1/resources/:publicCode/children` - Hijos de un nodo
- `GET /api/v1/resources/:publicCode/ancestors` - Ancestros
- `POST /api/v1/resources` - Crear nodo
- `PATCH /api/v1/resources/:publicCode` - Actualizar
- `DELETE /api/v1/resources/:publicCode` - Eliminar (cascade)
- `POST /api/v1/resources/:publicCode/move` - Mover nodo

**Features**:
- Node types: folder, site, channel
- ltree para queries eficientes
- Access control con herencia
- Redis caching

---

## Módulos de Soporte

### roles
**Ubicación**: `src/modules/roles/`
**Propósito**: RBAC database-driven

---

### countries
**Ubicación**: `src/modules/countries/`
**Propósito**: Catálogo de países

---

### audit
**Ubicación**: `src/modules/audit/`
**Propósito**: Modelo para audit_logs (usado por helper service)

---

### error-logs
**Ubicación**: `src/modules/error-logs/`
**Propósito**: Endpoint público para reportar errores desde frontend

**Endpoints**:
- `POST /api/v1/error-logs` - Registrar error (JWT opcional)

---

### health
**Ubicación**: `src/modules/health/`
**Propósito**: Health checks

**Endpoints**:
- `GET /health` - Status básico
- `GET /health/ready` - Readiness (DB + Redis)

---

### seed
**Ubicación**: `src/modules/seed/`
**Propósito**: Datos iniciales para desarrollo
