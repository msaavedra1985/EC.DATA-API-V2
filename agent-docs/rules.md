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

- **NEVER expose internal UUIDs** in API responses - Use `public_code` exclusively
  - Ejemplos válidos: `CHN-5LYJX-4`, `SIT-xxx`, `RES-xxx`, `ORG-xxx`
- **Public codes use Hashids + Luhn checksum** - Opaque, non-enumerable, and tamper-detectable
- **UUIDv7 stays internal only** - Contains timestamp info that could leak creation patterns
- **When creating new tables, ask if data is sensitive** to decide between classic IDs vs public_codes
- **`reference_id` fields store public_codes** (VARCHAR), not UUIDs - Enables safe cross-module references

### Ejemplo de respuesta correcta vs incorrecta

```javascript
// INCORRECTO - Expone UUID interno
{ id: "01919eb8-5e8a-7890-b456-123456789abc", name: "Hotel Lima" }

// CORRECTO - Usa public_code
{ public_code: "ORG-5LYJX-4", name: "Hotel Lima" }
```

## Audit Standards (MANDATORY)

- **Every CREATE, UPDATE, DELETE operation MUST log to `audit_logs` table** - No exceptions
- Use the centralized `auditLog` helper service (never direct database inserts)
- Log structure:
  ```javascript
  {
    entity_type,      // 'organization', 'user', 'site', etc.
    entity_id,        // UUID interno (ok para audit)
    action,           // 'create', 'update', 'delete'
    performed_by,     // user_id
    changes: { field: { old, new } },
    metadata          // IP, user-agent, etc.
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
- **Database Schema**: After ANY database schema change, MUST run `npm run db:dbml` to update `database.dbml.txt`
- **JSDoc Format**: Use OpenAPI 3.0 specification format in comments (schemas, responses, security, examples)
- **Schema Sync**: The `database.dbml.txt` file must always reflect the current production schema state

## File Size Limit

- **Maximum 1000 lines per file** - Split into multiple files if exceeded
- Large files are harder to maintain and for LLMs to process efficiently
