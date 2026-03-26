# Reglas de Código Obligatorias

> **CONSULTAR**: Antes de escribir cualquier código nuevo

## Code Standards

- All code must be written in English with **Spanish comments**
- Use **arrow functions exclusively** (no traditional function declarations)
- **ESM modules only** (`"type": "module"`)
- **Single quotes** for strings (enforced by ESLint)
- Comment extensively - every function, middleware, helper, model, and endpoint should have explanatory comments in Spanish

## Identifier Security Policy (MANDATORY)

> **CRÍTICO**: Violación de esta política = vulnerabilidad de seguridad

- **NEVER expose internal UUIDs** in API responses - Use `publicCode` exclusively (mapped to `id` in serializers)
  - Ejemplos válidos: `CHN-F74-CEL`, `SIT-XXX-XXX`, `RES-XXX-XXX`, `ORG-HZ6-QUL`
- **Public codes use nanoid** with custom alphabet (`2345679ACDEFGHJKLMNPQRSTUVWXYZ`) - Format: `PREFIX-XXX-XXX`, all uppercase, no confusable chars
- **UUIDv7 stays internal only** - Contains timestamp info that could leak creation patterns
- **When creating new tables, ask if data is sensitive** to decide between classic IDs vs public_codes
- **`reference_id` fields store public_codes** (VARCHAR), not UUIDs - Enables safe cross-module references

### Ejemplo de respuesta correcta vs incorrecta

```javascript
// INCORRECTO - Expone UUID interno
{ id: "01919eb8-5e8a-7890-b456-123456789abc", name: "Hotel Lima" }

// CORRECTO - Usa publicCode como "id" en la respuesta
{ id: "ORG-5LYJX-4", name: "Hotel Lima" }
```

## Audit Standards (MANDATORY)

- **Every CREATE, UPDATE, DELETE operation MUST log to `audit_logs` table** - No exceptions
- Use the centralized `auditLog` helper service (never direct database inserts)
- Log structure (camelCase):
  ```javascript
  {
    entityType,       // 'organization', 'user', 'site', etc.
    entityId,         // UUID interno (ok para audit)
    action,           // 'create', 'update', 'delete'
    performedBy,      // userId
    changes: { field: { old, new } },
    metadata,         // IP, user-agent, etc.
    ipAddress,        // req.ip
    userAgent         // req.headers['user-agent']
  }
  ```
- Include IP address and user agent for security tracking
- Never skip audit logging, even in batch operations or background jobs

## Error Logging Standards (MANDATORY)

- **Winston-powered error logging system** with dual transports:
  - PostgreSQL (`error_logs` table)
  - Rotating daily files (`logs/errors-YYYY-MM-DD.log`)
- **ALL API errors (4xx, 5xx) are automatically logged via global middleware** - Zero configuration required
- **Correlation tracking:** Both `error_logs` and `audit_logs` support `correlation_id` field to link related errors and audit actions

## Development Approach

- **CRITICAL DIRECTIVE**: "What works, don't touch"
  - Do NOT modify working files unless absolutely necessary
  - If changes to working code are required, perform deep impact analysis first
- Build incrementally in stages, prioritizing quality over speed
- Focus on one feature at a time
- Ensure proper testing coverage for new features
- Follow the established directory structure and layer separation

## Performance Standards

- **Worker Threads:** Always use worker threads for I/O-intensive operations (logging, file processing, etc.) to avoid blocking the event loop
- **Non-blocking Operations:** Prefer asynchronous patterns over synchronous operations
- **Logging:** Pino must run in a separate worker thread using `pino.transport()` with `worker: { autoEnd: true }`

## Documentation Standards (MANDATORY)

- **Swagger/OpenAPI**: Every new endpoint MUST include formal `@swagger` JSDoc annotations before being considered complete
- **Database Schema**: After ANY database schema change, MUST run `npm run db:dbml` to update `agent-docs/database.dbml.txt`
- **JSDoc Format**: Use OpenAPI 3.0 specification format in comments (schemas, responses, security, examples)
- **Schema Sync**: The `agent-docs/database.dbml.txt` file must always reflect the current production schema state

## Endpoint Documentation (MANDATORY)

> **CRÍTICO**: Documentación desactualizada es peor que no tener documentación

- **Al modificar cualquier endpoint** (request, response, validación, lógica), **DEBE actualizarse** el archivo correspondiente en `agent-docs/endpoints/`
- Cada archivo de endpoints incluye:
  - Tabla resumen de endpoints del módulo
  - Detalle de cada endpoint: método, path, body, respuestas, errores
  - Notas de implementación (audit log, rate limit, etc.)
- **Fecha de actualización**: Actualizar el campo "Última actualización" al modificar
- Esta documentación sirve tanto para LLMs como para desarrolladores humanos

## camelCase Convention (MANDATORY)

> **CRÍTICO**: Todo el código JavaScript usa camelCase end-to-end. NO existe middleware de transformación.

### Regla general
- **Todo código JS** (modelos, DTOs, serializers, services, repositories, routes) usa **camelCase**
- **Sequelize** con `underscored: true` mapea automáticamente camelCase → snake_case en la DB
- El **frontend** envía y recibe JSON con keys en camelCase directamente

### Qué DEBE ser camelCase
| Elemento | Ejemplo |
|----------|---------|
| Propiedades de modelos Sequelize | `organizationId`, `publicCode`, `isActive` |
| Keys de DTOs Zod | `firstName`, `lastName`, `rememberMe` |
| Keys de output en serializers | `{ isActive: org.isActive, logoUrl: org.logoUrl }` |
| Acceso a instancias Sequelize | `user.firstName`, `device.organizationId` |
| Where clauses | `where: { organizationId, isActive: true }` |
| Attributes arrays | `attributes: ['publicCode', 'firstName']` |
| Order arrays | `order: [['createdAt', 'DESC']]` |
| Model.create() keys | `Model.create({ entityType, performedBy })` |
| req.body destructuring | `const { firstName, organizationId } = req.body` |
| Response JSON keys | `{ accessToken, refreshToken, expiresIn }` |

### Excepciones (mantienen snake_case)
| Elemento | Razón | Ejemplo |
|----------|-------|---------|
| Nombres de tabla | Son identificadores de DB | `tableName: 'refresh_tokens'` |
| Valores ENUM | Son valores de DB, no keys | `'system-admin'`, `'org-admin'` |
| i18n keys | Son identificadores de traducción | `'auth.register.email_exists'` |
| Raw SQL queries | Acceden a columnas DB directas | `SELECT organization_id FROM...` |
| Resultados de `raw: true` | Sequelize devuelve columnas DB | `row.organization_id` (NO `row.organizationId`) |
| Migration files (.cjs) | Son CommonJS y usan queryInterface | `addColumn('users', 'first_name')` |
| Error codes | Son constantes de string | `'EMAIL_ALREADY_EXISTS'` |

### Ejemplo completo de un flujo correcto

```javascript
// DTO (Zod) - Keys camelCase
export const createSchema = z.object({
    body: z.object({
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        organizationId: z.string().uuid().optional()
    })
});

// Service - Variables y Sequelize en camelCase
export const create = async ({ firstName, lastName, organizationId }) => {
    const user = await User.create({ firstName, lastName, organizationId });
    // Sequelize genera: INSERT INTO users (first_name, last_name, organization_id) VALUES (...)
    return user;
};

// Serializer - Output keys camelCase, acceso a instancia camelCase
export const toPublicDto = (user) => ({
    id: user.publicCode,      // "id" en response = publicCode (NUNCA UUID)
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    createdAt: user.createdAt
});

// Route - Destructuring camelCase del body
router.post('/', async (req, res) => {
    const { firstName, lastName, organizationId } = req.body;
    const user = await create({ firstName, lastName, organizationId });
    res.json({ ok: true, data: toPublicDto(user) });
});
```

## File Size Limit

- **Maximum 1000 lines per file** - Split into multiple files if exceeded
- Large files are harder to maintain and for LLMs to process efficiently

## Swagger / OpenAPI Documentation

- **Toda la documentación Swagger está en archivos YAML separados**, uno por módulo: `src/docs/swagger/{module}.yaml`
- **NUNCA usar bloques `@swagger` en archivos JS** — viola el límite de líneas y mezcla documentación con código
- Al **crear un nuevo endpoint**, agregarlo al YAML correspondiente del módulo bajo `paths:`
- Al **modificar un endpoint** (request body, parámetros, responses), actualizar el YAML correspondiente
- Cada route handler tiene un comentario `// 📄 Swagger: src/docs/swagger/{module}.yaml -> METHOD /path` para referencia rápida
- La configuración de `swagger-jsdoc` en `src/docs/openapi.js` usa el glob `./src/docs/swagger/*.yaml`

### Estructura de un archivo YAML:

```yaml
paths:
  /api/v1/module/endpoint:
    get:
      summary: Descripción corta
      tags: [ModuleName]
      security:
        - BearerAuth: []
      responses:
        200:
          description: Éxito
```

### Archivos YAML disponibles:

| Módulo | Archivo |
|--------|---------|
| auth | `src/docs/swagger/auth.yaml` |
| organizations | `src/docs/swagger/organizations.yaml` |
| users | `src/docs/swagger/users.yaml` |
| sites | `src/docs/swagger/sites.yaml` |
| devices | `src/docs/swagger/devices.yaml` |
| channels | `src/docs/swagger/channels.yaml` |
| files | `src/docs/swagger/files.yaml` |
| telemetry | `src/docs/swagger/telemetry.yaml` |
| resource-hierarchy | `src/docs/swagger/resource-hierarchy.yaml` |
| error-logs | `src/docs/swagger/error-logs.yaml` |
| dashboards | `src/docs/swagger/dashboards.yaml` |
| countries | `src/docs/swagger/countries.yaml` |
| locations | `src/docs/swagger/locations.yaml` |
| realtime | `src/docs/swagger/realtime.yaml` |
| asset-categories | `src/docs/swagger/asset-categories.yaml` |
| seed | `src/docs/swagger/seed.yaml` |
| schedules | `src/docs/swagger/schedules.yaml` |
