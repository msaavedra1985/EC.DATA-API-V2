# EC.DATA API - Enterprise REST API

API REST empresarial construida con Node.js, Express, PostgreSQL y Redis. Sistema multi-tenant con autenticación JWT, control de acceso basado en roles (RBAC), y arquitectura jerárquica de organizaciones.

## 🚀 Características Principales

- ✅ **Autenticación JWT** con claims estándar RFC 7519
- ✅ **Sistema RBAC** con 7 roles en base de datos
- ✅ **Multi-Tenant** con jerarquía de organizaciones ilimitada
- ✅ **Triple Identificadores** (UUID v7 + human_id + public_code)
- ✅ **Caché Redis** para optimización de rendimiento
- ✅ **Validación robusta** con Zod
- ✅ **Documentación Swagger** en `/docs`
- ✅ **Métricas Prometheus** en `/metrics`
- ✅ **Logging estructurado** con Pino (worker threads)
- ✅ **Error Logging** con Winston (PostgreSQL + archivos rotativos)
- ✅ **Auditoría Global** de operaciones CUD
- ✅ **Multi-idioma** (Español e Inglés)
- ✅ **Filtrado Automático** por organización activa

---

## 📋 Módulos Implementados

### ✅ Auth (Autenticación)
Sistema completo de autenticación JWT con:
- Access Token (15 min) + Refresh Token (14 días)
- Rotación de tokens con detección de robo
- Cambio de organización activa (`/auth/switch-org`)
- Sesiones múltiples con logout selectivo

### ✅ Organizations (Organizaciones)
Gestión jerárquica de organizaciones:
- Árbol de profundidad ilimitada
- Navegación padre/hijos con lazy loading
- Cálculo de scope para permisos (`getOrganizationScope`)
- Detección de ciclos

### ✅ Sites (Locaciones Físicas)
Gestión de ubicaciones físicas:
- Geolocalización (lat/lng)
- Dirección completa con país
- Tipos de edificio (oficina, bodega, fábrica, etc.)
- Información de contacto

### ✅ Devices (Dispositivos IoT)
Gestión de dispositivos IoT/Edge:
- Tipos: sensor, gateway, controller, edge, virtual
- Estados: active, inactive, maintenance, decommissioned
- Info de red (IP, MAC)
- Firmware versioning
- Asociación con Sites

### ✅ Channels (Canales de Comunicación)
Gestión de canales para dispositivos:
- Tipos: MQTT, HTTP, WebSocket, gRPC, AMQP
- Protocolos y dirección (inbound/outbound/bidirectional)
- Configuración JSON flexible
- Cascade soft-delete con devices

### ✅ Files (Archivos)
Gestión de archivos via Azure Blob Storage:
- Dual containers (public/private)
- SAS URLs para upload/download seguro
- Categorías: logo, image, document, firmware, backup, etc.
- Validación de MIME types y tamaños

---

## 🔐 Sistema de Filtrado por Organización Activa

**NUEVO (Noviembre 2025)**: Todos los endpoints de listado ahora filtran automáticamente por la organización activa del usuario.

### Comportamiento

| Parámetro | Rol | Resultado |
|-----------|-----|-----------|
| (ninguno) | Cualquiera | Solo registros de `activeOrgId` del JWT |
| `organization_id=ORG-XXX` | Cualquiera | Solo si tiene acceso a esa organización |
| `all=true` | `system-admin` | Todos los registros del sistema |
| `all=true` | `org-admin` | Su organización + todas las sub-organizaciones |
| `all=true` | Otros | Error 403 Forbidden |

### Endpoints Afectados
- `GET /api/v1/sites`
- `GET /api/v1/devices`
- `GET /api/v1/channels`
- `GET /api/v1/files`

### Seguridad
- El parámetro interno `organization_ids` es inyectado solo por el middleware
- Intentos de inyección desde el cliente son detectados, eliminados y logueados

---

## 📋 Requisitos

- Node.js 20+
- PostgreSQL 14+
- Redis 6+ (opcional, usa fallback en memoria)
- Azure Blob Storage (para módulo Files)

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar migraciones de base de datos
npm run db:migrate

# Iniciar servidor de desarrollo
npm run dev

# Sincronizar esquema (solo desarrollo)
npm run db:push
```

---

## 👥 Sistema RBAC (Role-Based Access Control)

### Roles del Sistema

| Rol | Descripción | Permisos Clave |
|-----|-------------|----------------|
| `system-admin` | Administrador del sistema | Acceso total, todas las organizaciones |
| `org-admin` | Administrador de organización | CRUD completo en su org + descendientes |
| `org-manager` | Gerente de organización | Supervisión y reportes, sin config |
| `user` | Usuario estándar | Operaciones básicas en su org |
| `viewer` | Visualizador | Solo lectura |
| `guest` | Invitado | Acceso temporal mínimo |
| `demo` | Demo | Datos de ejemplo, sin modificaciones |

### Sistema Híbrido de Roles
- **Rol Global** (`users.role_id`): Define capacidades del sistema
- **Rol en Organización** (`user_organizations.role_in_org`): Define permisos específicos por organización

---

## 🎯 Endpoints Principales

### Autenticación
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Registrar usuario | ❌ |
| POST | `/api/v1/auth/login` | Iniciar sesión | ❌ |
| POST | `/api/v1/auth/refresh` | Refrescar token | ❌ |
| GET | `/api/v1/auth/me` | Usuario actual | ✅ |
| POST | `/api/v1/auth/logout` | Cerrar sesión | ✅ |
| POST | `/api/v1/auth/logout-all` | Cerrar todas las sesiones | ✅ |
| POST | `/api/v1/auth/change-password` | Cambiar contraseña | ✅ |
| POST | `/api/v1/auth/switch-org` | Cambiar organización activa | ✅ |

### Organizations
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/organizations` | Listar organizaciones | ✅ |
| POST | `/api/v1/organizations` | Crear organización | ✅ Admin |
| GET | `/api/v1/organizations/:id` | Detalle de organización | ✅ |
| PUT | `/api/v1/organizations/:id` | Actualizar organización | ✅ Admin |
| GET | `/api/v1/organizations/:id/children` | Hijos de organización | ✅ |
| GET | `/api/v1/organizations/:id/tree` | Árbol completo | ✅ |

### Sites
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/sites` | Listar sites (filtrado automático) | ✅ |
| POST | `/api/v1/sites` | Crear site | ✅ Admin |
| GET | `/api/v1/sites/:id` | Detalle de site | ✅ |
| PUT | `/api/v1/sites/:id` | Actualizar site | ✅ Admin |
| DELETE | `/api/v1/sites/:id` | Eliminar site (soft) | ✅ System-Admin |

### Devices
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/devices` | Listar devices (filtrado automático) | ✅ |
| POST | `/api/v1/devices` | Crear device | ✅ Admin |
| GET | `/api/v1/devices/:id` | Detalle de device | ✅ |
| PUT | `/api/v1/devices/:id` | Actualizar device | ✅ Admin |
| DELETE | `/api/v1/devices/:id` | Eliminar device (soft) | ✅ System-Admin |

### Channels
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/channels` | Listar channels (filtrado automático) | ✅ |
| POST | `/api/v1/channels` | Crear channel | ✅ Admin |
| GET | `/api/v1/channels/:id` | Detalle de channel | ✅ |
| PUT | `/api/v1/channels/:id` | Actualizar channel | ✅ Admin |
| DELETE | `/api/v1/channels/:id` | Eliminar channel (soft) | ✅ System-Admin |

### Files
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/files` | Listar archivos (filtrado automático) | ✅ |
| POST | `/api/v1/files/request-upload-url` | Solicitar SAS URL para upload | ✅ |
| POST | `/api/v1/files/:id/confirm-upload` | Confirmar upload completado | ✅ |
| GET | `/api/v1/files/:id` | Detalle de archivo | ✅ |
| DELETE | `/api/v1/files/:id` | Eliminar archivo (soft) | ✅ Admin |
| GET | `/api/v1/files/stats/:orgId` | Estadísticas de almacenamiento | ✅ Admin |

---

## 📚 Documentación

### Swagger/OpenAPI
```
http://localhost:5000/docs
```

### Guías para Frontend (Español)
| Archivo | Contenido |
|---------|-----------|
| `docs/AUTH_API_GUIDE.md` | Autenticación, JWT, RBAC |
| `docs/ORGANIZATIONS_API_GUIDE.md` | Jerarquía de organizaciones |
| `docs/SITES_API_GUIDE.md` | Gestión de locaciones |
| `docs/DEVICES_API_GUIDE.md` | Dispositivos IoT |
| `docs/CHANNELS_API_GUIDE.md` | Canales de comunicación |
| `docs/FILES_API_GUIDE.md` | Gestión de archivos con Azure |

---

## 🧪 Usuarios de Prueba

| Email | Contraseña | Rol | Organización |
|-------|------------|-----|--------------|
| `orgadmin@acme.com` | `TestPassword123!` | `org-admin` | `ORG-yOM9ewfqOeWa-4` |
| `orgadmin2@test.com` | `AdminPass123!` | `org-admin` | - |
| `testrbac2@example.com` | `SecurePass123!` | `user` | - |

---

## 🔒 Seguridad

- ✅ Passwords hasheados con bcrypt (10 rounds)
- ✅ Refresh tokens hasheados con SHA-256 en BD
- ✅ Validación de claims JWT (iss, aud, exp)
- ✅ CORS configurado con orígenes dinámicos
- ✅ Helmet para headers de seguridad
- ✅ Rate limiting con Redis
- ✅ Auditoría de sesiones (user-agent, IP)
- ✅ Detección de robo de tokens
- ✅ Sanitización de `organization_ids` para prevenir bypass multi-tenant
- ✅ Expiración y limpieza automática de tokens

---

## 📊 Observabilidad

### Logging
- **Pino**: Logs estructurados en JSON (worker threads)
- **Winston**: Errores persistidos en PostgreSQL + archivos rotativos
- **Audit Logs**: Todas las operaciones CUD en tabla `audit_logs`
- **Correlation ID**: Trazabilidad entre errores y auditoría

### Métricas (Prometheus)
```
http://localhost:5000/metrics
```
- Duración de requests HTTP
- Contadores por endpoint
- Conexiones activas
- Métricas de negocio personalizadas

### Health Check
```
GET /api/v1/health
```

---

## 📁 Estructura del Proyecto

```
src/
├── modules/
│   ├── auth/           # Autenticación y sesiones
│   ├── organizations/  # Gestión de organizaciones
│   ├── sites/          # Locaciones físicas
│   ├── devices/        # Dispositivos IoT
│   ├── channels/       # Canales de comunicación
│   └── files/          # Gestión de archivos
├── middleware/
│   ├── auth.js                      # Autenticación JWT
│   ├── enforceActiveOrganization.js # Filtrado por org activa
│   ├── validate.js                  # Validación Zod
│   ├── rateLimit.js                 # Rate limiting
│   └── errorHandler.js              # Manejo de errores
├── services/
│   ├── auditLog.js     # Auditoría centralizada
│   └── errorLogger.js  # Logging de errores
├── db/
│   ├── migrations/     # Migraciones Sequelize
│   └── models/         # Modelos compartidos
├── config/
│   ├── env.js          # Variables de entorno
│   └── database.cjs    # Config Sequelize CLI
├── locales/
│   ├── es.json         # Traducciones español
│   └── en.json         # Traducciones inglés
└── utils/
    ├── logger.js       # Logger Pino
    ├── identifiers.js  # Generación de IDs
    └── response.js     # Helpers de respuesta
```

---

## 🛠️ Scripts NPM

```bash
npm run dev              # Desarrollo con hot-reload
npm run start            # Producción
npm run db:migrate       # Ejecutar migraciones
npm run db:migrate:undo  # Revertir última migración
npm run db:push          # Sincronizar schema (dev)
npm run db:dbml          # Generar diagrama DBML
npm test                 # Ejecutar tests con Vitest
```

---

## 🔄 Cambios Recientes (Noviembre 2025)

### Sistema de Filtrado por Organización Activa
- Middleware `enforceActiveOrganization` aplicado a Sites, Devices, Channels, Files
- Parámetro `all=true` para admins (con scope limitado para org-admin)
- Sanitización de `organization_ids` para prevenir inyección
- Documentación actualizada en todas las guías

### Correcciones de Seguridad
- Autenticación obligatoria en GET endpoints de Channels
- Detección y logging de intentos de bypass multi-tenant

---

## 📝 Pendientes / Roadmap

### Alta Prioridad
- [ ] **Tests de regresión** para el sistema de filtrado por organización
- [ ] **Filtrado por organización** en endpoints GET individuales (`:id`)
- [ ] **Validación de acceso cross-org** en operaciones UPDATE/DELETE

### Media Prioridad
- [ ] **Módulo de Notificaciones** (email, push, webhooks)
- [ ] **Módulo de Reportes** (dashboards, exportación)
- [ ] **Módulo de Configuración** (settings por organización)
- [ ] **Webhooks** para eventos de dispositivos/canales

### Baja Prioridad
- [ ] **Rate limiting granular** por endpoint y rol
- [ ] **Caché de resultados** de listados frecuentes
- [ ] **Bulk operations** (crear/actualizar múltiples registros)
- [ ] **API versioning** (v2 con breaking changes)

### Deuda Técnica
- [ ] Aumentar cobertura de tests (>80%)
- [ ] Documentar todos los endpoints nuevos en Swagger
- [ ] Optimizar queries N+1 en listados con includes
- [ ] Implementar circuit breaker para servicios externos

---

## 🤝 Contribución

El proyecto sigue estándares estrictos de código:

- **Idioma:** Código en inglés, comentarios en español
- **Sintaxis:** Arrow functions, ESM modules
- **Estilo:** Single quotes, comentarios extensivos
- **Arquitectura:** Feature-based, separación en capas
- **Auditoría:** Todo CUD debe loguearse
- **Migraciones:** Usar Sequelize CLI, nunca modificar schema manualmente

### Antes de hacer PR
1. Ejecutar `npm test`
2. Verificar que `npm run db:migrate` funciona
3. Actualizar documentación si hay cambios en endpoints
4. Actualizar `agent-docs/database.dbml.txt` si hay cambios en schema

---

## 📝 Licencia

Propiedad de EC.DATA - Enterprise Data Solutions

---

**Versión:** 1.2.0  
**Última actualización:** Noviembre 2025  
**Contacto:** api-support@ecdata.com
