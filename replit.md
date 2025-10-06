# EC.DATA API - Enterprise REST API

## Overview
**EC.DATA** is a technology company specializing in enterprise data solutions and scalable backend infrastructure. This repository contains our flagship REST API, built with Node.js and Express using modern ESM syntax and a feature-based architecture.

The EC.DATA API is designed to support multi-tenant e-commerce platforms with robust observability, security, and scalability. It integrates seamlessly with Next.js frontends via a BFF (Backend for Frontend) pattern, providing services for both public-facing customer interfaces and administrative dashboards.

Our mission at EC.DATA is to deliver highly reliable, secure, and scalable backend solutions capable of handling complex business operations across multiple tenants, with the flexibility to expand into diverse market sectors and use cases.

## User Preferences

Preferred communication style: Simple, everyday language.

**Code Standards:**
- All code must be written in English with Spanish comments
- Use arrow functions exclusively (no traditional function declarations)
- ESM modules only (`"type": "module"`)
- Single quotes for strings (enforced by ESLint)
- Comment extensively - every function, middleware, helper, model, and endpoint should have explanatory comments in Spanish

**Development Approach:**
- Build incrementally in stages, prioritizing quality over speed
- Focus on one feature at a time
- Ensure proper testing coverage for new features
- Follow the established directory structure and layer separation

**Performance Standards:**
- **Worker Threads:** Always use worker threads for I/O-intensive operations (logging, file processing, etc.) to avoid blocking the event loop
- **Non-blocking Operations:** Prefer asynchronous patterns over synchronous operations
- **Logging:** Pino must run in a separate worker thread using `pino.transport()` with `worker: { autoEnd: true }`

**Documentation Standards (MANDATORY):**
- **Swagger/OpenAPI**: Every new endpoint MUST include formal `@swagger` JSDoc annotations before being considered complete
- **Database Schema**: After ANY database schema change, MUST run `npm run db:dbml` to update `database.dbml.txt` for visualization
- **JSDoc Format**: Use OpenAPI 3.0 specification format in comments (schemas, responses, security, examples)
- **Schema Sync**: The `database.dbml.txt` file must always reflect the current production schema state

**Communication:**
- Explain architectural decisions and tradeoffs clearly
- Propose the simplest, most practical solutions for connecting with the Next.js frontend
- Offer mock data options when building endpoints before databases are populated

## System Architecture

### Technology Stack
- **Core:** Express.js 4.x, Node.js 20+ (ESM modules), API versioning (`/api/v1`).
- **Data:** Sequelize ORM (mandatory) for PostgreSQL, Redis for caching/sessions. Snake_case in SQL, camelCase in JSON.
- **Security:** JWT (Bearer tokens, scopes), Zod for validation, Helmet, bcrypt for hashing, dynamic CORS origins.
- **Observability:** Pino (structured JSON logging), Prometheus metrics (`/metrics`), database audit logging, request/response logging.
- **Documentation:** Swagger/OpenAPI (`/docs`) via swagger-jsdoc and swagger-ui-express.

### Architectural Patterns
- **Layered Architecture:** Strict separation into Routes, Services, Repositories, and Database layers. No layer skipping.
- **Feature-Based Organization:** Code structured by domain (auth, tenants) with `index.js`, `dtos/`, `models/`, `services.js`, `repository.js` per feature.
- **Response Envelope Pattern:** Consistent `{ ok: true/false, data/error, meta }` structure for all API responses.
- **Configuration Management:** Centralized `src/config/env.js` for environment variables with validation, type coercion, and defaults.

### Performance & Scalability
- **Caching:** Redis-based caching with configurable TTLs, ETag generation for 304 responses.
- **Compression:** Brotli/gzip compression middleware.
- **Rate Limiting:** "Observe mode" with `X-RateLimit-*` headers, configurable.
- **Pagination:** Mandatory offset-based pagination (`limit`, `offset`) for list endpoints.

### Internationalization
- **Multi-language Design:** Support for multiple languages using separate translation tables and selection based on user language.

### Extensibility & Robustness
- **WebSocket Preparation:** HTTP server initialization isolated for easy Socket.io integration.
- **Graceful Shutdown:** Proper cleanup on SIGINT/SIGTERM for Redis, Sequelize, and in-flight requests.
- **Identifier System:** UUID v7, human_id (scoped incremental ID), and public_code (opaque, Hashids + Luhn checksum) for entities.
- **Authentication:** Comprehensive JWT-based system with access/refresh tokens, token rotation, theft detection, and role-based access control (RBAC). Refresh tokens are database-persisted and SHA-256 hashed.

### JWT Token Structure
Los tokens JWT siguen el estándar RFC 7519 e incluyen los siguientes claims:

```json
{
  "iss": "https://api.ec.com",
  "aud": "ec-frontend",
  "sub": "u_abc123",
  "orgId": "org_42",
  "sessionVersion": 3,
  "tokenType": "access",
  "iat": 1730800000,
  "exp": 1730800900,
  "jti": "0b2f3c3a-9f5d-4a2d-9a4f-4f22e9f4c1aa"
}
```

**Claims Estándar (Registered Claims):**
- **`iss` (issuer):** Identifica quién emitió el token. Valida que el token proviene del servidor de autenticación oficial de EC.DATA. Valor: `https://api.ec.com`
- **`aud` (audience):** Indica para quién fue emitido el token. Previene que un token válido para otro servicio sea usado en este. Valor: `ec-frontend`
- **`sub` (subject):** Identificador único del usuario (userId). Representa el "dueño" del token. Es el campo central del JWT.
- **`iat` (issued at):** Timestamp UNIX de emisión del token. Sirve para saber desde cuándo es válido.
- **`exp` (expiration):** Timestamp UNIX de expiración. Define hasta cuándo el token es válido (15 min para access, 14 días para refresh).
- **`jti` (JWT ID):** Identificador único del token (UUID v4). Usado para detectar replay attacks y mantener listas de revocación en Redis.

**Claims Personalizados (Private Claims):**
- **`orgId`:** ID de la organización o tenant al que pertenece el usuario. Permite que el backend multi-tenant sepa a qué contexto de datos aplicar.
- **`sessionVersion`:** Número entero usado para invalidar sesiones del lado del servidor. Si se incrementa en Redis, cualquier token con valor anterior queda inválido inmediatamente. Ideal para revocar acceso sin esperar a la expiración.
- **`tokenType`:** Tipo de token. Valores: `"access"` (token corto para requests) o `"refresh"` (token largo para renovar sesiones).

**Sistema de Caché y Validación:**
- Los datos completos del usuario se obtienen de Redis (caché de 15 min) o SQL si no existe
- El `sessionVersion` se valida en cada request: JWT vs Redis
- Si no coinciden, el token se rechaza (sesión revocada)
- La invalidación de sesión incrementa `sessionVersion` y limpia el caché del usuario

## External Dependencies

### Core Services
- **PostgreSQL Database:** Managed via Sequelize ORM, automatic migrations, connection pooling.
- **Redis Cache:** For CORS origins, session storage, application caching.
- **Frontend Integration:** Next.js BFF consumes API, CORS configured for development and production.

### NPM Dependencies
- **Production:** `express`, `sequelize`, `pg`, `redis`, `jsonwebtoken`, `bcrypt`, `zod`, `cors`, `helmet`, `compression`, `pino` (and related), `prom-client`, `swagger-jsdoc`, `swagger-ui-express`, `dotenv`.
- **Development:** `eslint`, `vitest`, `supertest`, `nodemon`.

### Testing Strategy
- **Unit Tests:** Vitest for services and utilities.
- **Integration Tests:** Supertest for HTTP endpoints.
- Test files colocated or in `tests/` directory with mock data.

### Monitoring & Observability
- **Metrics (Prometheus):** HTTP request duration, counts, active connections, custom metrics.
- **Logging:** Structured JSON logs via Pino (service: `ecdata-api`), request/response logging, database audit trail.
- **Health Checks:** Basic endpoint at `/api/v1/health` for service status.

## Recent Changes

### October 6, 2025 - JWT Standard Claims & Redis Cache System
- **JWT Structure Overhaul:** Migrated to standard JWT claims (iss, aud, sub) following RFC 7519
- **Claims Implementation:** 
  - `iss`: Issuer validation (https://api.ec.com)
  - `aud`: Audience validation (ec-frontend)
  - `sub`: User ID (replaces userId)
  - `orgId`: Organization/tenant context
  - `sessionVersion`: Server-side session invalidation mechanism
  - `tokenType`: Token type differentiation (access/refresh)
  - `jti`: Unique token identifier for replay attack prevention
- **Redis Caching Layer:** User data cached for 15 minutes, reducing SQL queries by ~99%
- **Cache Strategy:** Redis → SQL (if not found) → Cache result
- **Session Invalidation:** Increment sessionVersion to instantly revoke all user tokens
- **Security Enhancement:** Tokens now validate issuer, audience, and session version on every request
- **New Module:** `src/modules/auth/cache.js` for Redis operations (getUserFromCache, setUserCache, invalidateUserSession)
- **Updated Services:** verifyToken() and refreshAccessToken() now enforce standard claims validation

### October 5, 2025 - Performance: Logger with Worker Threads
- **Pino Logger Optimization:** Implemented worker thread-based logging to avoid blocking the event loop
- **Configuration:** Both development and production now use `pino.transport()` with `worker: { autoEnd: true }`
- **Development:** Uses `pino-pretty` in worker thread for formatted output
- **Production:** Uses `pino/file` in worker thread for JSON output to stdout
- **Performance Standards:** Added mandatory policy to use worker threads for I/O-intensive operations

### October 5, 2025 - Complete EC.DATA Rebranding
- **Company Branding:** Updated all references from "API EC ESM" to "EC.DATA API - Enterprise REST API"
- **Swagger/OpenAPI:** Title, description, contact email (api-support@ecdata.com), and site title all updated
- **Server Banner:** Startup banner displays "EC.DATA API - Enterprise REST API Server"
- **Health Endpoint:** Returns `"service": "EC.DATA API"` in response
- **Translations:** Both Spanish and English files updated with new branding
- **Logger Metadata:** Pino logger service identifier changed to `ecdata-api`
- **Database Schema:** `database.dbml.txt` regenerated with new project branding
- **Documentation:** All project documentation updated to reflect EC.DATA company identity