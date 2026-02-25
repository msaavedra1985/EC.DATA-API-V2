# Glosario de Términos

> **CONSULTAR**: Al encontrar términos desconocidos del dominio

## Identificadores

### public_code
Identificador público expuesto en APIs. Formato: `PREFIX-XXX-XXX` (estilo boleto de avión)
- **Generación**: nanoid con alfabeto seguro `2345679ACDEFGHJKLMNPQRSTUVWXYZ` (sin 0/O/1/I/8/B)
- **Ejemplos**: `ORG-HZ6-QUL`, `DEV-4X9-R2T`, `CHN-F74-CEL`
- **Uso**: ÚNICO identificador permitido en respuestas API
- **Prefijos comunes**:
  - `ORG-` → Organización
  - `USR-` → Usuario
  - `SIT-` → Site
  - `DEV-` → Device
  - `CHN-` → Channel
  - `RES-` → Resource (hierarchy)

### UUIDv7
Identificador interno. **NUNCA exponer en APIs**.
- Contiene timestamp (privacy concern)
- Usado solo en queries internas y foreign keys
- Ejemplo: `01919eb8-5e8a-7890-b456-123456789abc`

### human_id
Identificador legible para humanos, opcional en algunas entidades.
- Formato libre definido por usuario
- Ejemplo: `hotel-lima-lobby-001`

---

## Autenticación

### access_token
JWT de corta duración (15 min) para autenticar requests.
- Contiene: `sub` (user_id), `role`, `activeOrgId`, `sessionVersion`
- Se envía en header `Authorization: Bearer <token>`

### refresh_token
Token de larga duración para renovar access_token.
- Duración: 14 días (normal) o 90 días (remember_me)
- Almacenado hasheado en PostgreSQL
- Rotación: cada refresh genera nuevo token

### session_context
Cache en Redis con contexto de sesión del usuario.
- TTL alineado con refresh_token (14 o 90 días)
- Contiene: activeOrgId, primaryOrgId, canAccessAllOrgs, role, email, etc.
- Endpoint rápido: `GET /auth/session-context` (~5-15ms)

### remember_me
Flag de login que extiende duración de sesión de 14 a 90 días.

### sessionVersion
Número que invalida tokens cuando cambia (logout_all, password change).

---

## Organizaciones

### God View
Modo de system-admin sin organización activa. Puede ver toda la plataforma.
- `activeOrgId: null`
- `canAccessAllOrgs: true`

### Impersonation
System-admin operando "como" otra organización.
- `isImpersonating: true` en JWT
- `originalUserId` preservado para audit

### primaryOrgId
Organización principal del usuario (primera asignada o marcada como primaria).

### activeOrgId
Organización actualmente seleccionada para operar.

---

## Resource Hierarchy

### ltree
Extensión PostgreSQL para manejar estructuras de árbol.
- Path format: `folder.hotels.lima.lobby`
- Queries eficientes de ancestros/descendientes

### Node types
Tipos de nodo en la jerarquía:
- `folder` - Contenedor organizacional
- `site` - Ubicación física
- `channel` - Canal de comunicación

---

## Observability

### audit_log
Registro obligatorio de toda operación CUD (Create, Update, Delete).
- Tabla: `audit_logs`
- Incluye: entity_type, action, changes, performed_by, IP, user_agent

### correlation_id
Identificador que vincula errores y audits relacionados en un mismo flujo.

### error_log
Registro de errores con dual transport (PostgreSQL + archivos diarios).

---

## Patrones

### BFF (Backend for Frontend)
Patrón donde el backend sirve específicamente a las necesidades del frontend Next.js.

### Response Envelope
Formato estándar de respuestas: `{ ok: true/false, data/error, meta }`

### Soft Delete
Eliminación lógica usando `deleted_at` en lugar de DELETE físico.
- Sequelize: `paranoid: true`
