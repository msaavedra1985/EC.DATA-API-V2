# Módulos Implementados

> **CONSULTAR**: Para entender qué funcionalidad existe y dónde encontrarla

## Módulos Core

| Módulo | Ubicación | Propósito | Endpoints |
|--------|-----------|-----------|-----------|
| auth | `src/modules/auth/` | Autenticación y sesiones | [endpoints/auth.md](endpoints/auth.md) |
| users | `src/modules/users/` | Gestión de usuarios | [endpoints/users.md](endpoints/users.md) |
| organizations | `src/modules/organizations/` | Multi-tenant | [endpoints/organizations.md](endpoints/organizations.md) |
| sites | `src/modules/sites/` | Ubicaciones físicas | [endpoints/sites.md](endpoints/sites.md) |
| devices | `src/modules/devices/` | Dispositivos IoT/Edge | [endpoints/devices.md](endpoints/devices.md) |
| channels | `src/modules/channels/` | Canales de comunicación | [endpoints/channels.md](endpoints/channels.md) |
| files | `src/modules/files/` | Upload Azure Blob | [endpoints/files.md](endpoints/files.md) |
| telemetry | `src/modules/telemetry/` | Series temporales (Cassandra) | [endpoints/telemetry.md](endpoints/telemetry.md) |
| resource-hierarchy | `src/modules/resource-hierarchy/` | Árbol ltree | [endpoints/resource-hierarchy.md](endpoints/resource-hierarchy.md) |
| error-logs | `src/modules/error-logs/` | Logging errores frontend | [endpoints/error-logs.md](endpoints/error-logs.md) |

## Archivos Clave por Módulo

### auth
- `services.js` - Lógica de login, tokens, refresh
- `sessionContextCache.js` - Cache Redis de session_context
- `refreshTokenRepository.js` - CRUD de refresh tokens
- `models/RefreshToken.js` - Modelo Sequelize

### organizations
- Jerarquía con parent_id (auto-referencial)
- Relación many-to-many con users via `user_organizations`

### files
- Generación de SAS URLs para Azure Blob
- Metadata tracking en PostgreSQL

### telemetry
- Multi-language support para nombres de variables
- Timezone-aware filtering
- Apache Cassandra backend

### resource-hierarchy
- Node types: folder, site, channel
- ltree para queries eficientes de ancestros/descendientes
- Access control con herencia
- Redis caching

---

## Módulos de Soporte

| Módulo | Ubicación | Propósito |
|--------|-----------|-----------|
| roles | `src/modules/roles/` | RBAC database-driven |
| countries | `src/modules/countries/` | Catálogo de países |
| audit | `src/modules/audit/` | Modelo para audit_logs |
| health | `src/modules/health/` | Health checks (`GET /health`, `GET /health/ready`) |
| seed | `src/modules/seed/` | Datos iniciales para desarrollo |
