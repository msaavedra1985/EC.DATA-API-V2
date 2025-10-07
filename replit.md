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
- `iss` (issuer): `https://api.ec.com`
- `aud` (audience): `ec-frontend`
- `sub`: Unique user identifier (userId).
- `iat`: UNIX timestamp of token issuance.
- `exp`: UNIX timestamp of expiration (15 min for access, 14 days for refresh).
- `jti`: Unique token ID (UUID v4) for replay attack prevention.
- `orgId`: ID of the organization/tenant.
- `sessionVersion`: Integer for server-side session invalidation.
- `tokenType`: Type of token (`"access"` or `"refresh"`).

**System Cache and Validation:**
- User data retrieved from Redis cache (15 min TTL) or SQL if not found.
- `sessionVersion` validated on each request; mismatch invalidates token.
- Session invalidation increments `sessionVersion` and clears user cache.

### Role-Based Access Control (RBAC)
The system implements a flexible RBAC model based on a `roles` table with 7 predefined roles (`system-admin`, `org-admin`, `org-manager`, `user`, `viewer`, `guest`, `demo`). Users are associated with roles via `users.role_id`.

**Technical Implementation:**
- `User.belongsTo(Role)` relationship.
- `User.prototype.hasRole(roleName)` and `User.prototype.isSystemAdmin()` methods.
- Middleware for authorization: `authenticate`, `requireRole(['role1', 'role2'])`.
- JWT contains `sub`, `role` (id, name, description, is_active), and `orgId`.
- Roles are cached with user data in Redis (15 min TTL).

## External Dependencies

### Core Services
- **PostgreSQL Database:** Managed via Sequelize ORM, automatic migrations, connection pooling.
- **Redis Cache:** For CORS origins, session storage, application caching.
- **Frontend Integration:** Next.js BFF consumes API, CORS configured for development and production.

### NPM Dependencies
- **Production:** `express`, `sequelize`, `pg`, `redis`, `jsonwebtoken`, `bcrypt`, `zod`, `cors`, `helmet`, `compression`, `pino` (and related), `prom-client`, `swagger-jsdoc`, `swagger-ui-express`, `dotenv`.
- **Development:** `eslint`, `vitest`, `supertest`, `nodemon`.

### Monitoring & Observability
- **Metrics (Prometheus):** HTTP request duration, counts, active connections, custom metrics.
- **Logging:** Structured JSON logs via Pino (service: `ecdata-api`), request/response logging, database audit trail.
- **Health Checks:** Basic endpoint at `/api/v1/health` for service status.
## Recent Changes

### October 7, 2025 - "Remember Me" Feature Implementation
- **Extended Sessions:** Implemented optional `remember_me` field in login endpoint to extend session duration
- **Token Duration Logic:** Normal sessions (14 days refresh, 7 days idle) vs Extended sessions (90 days refresh, 30 days idle)
- **Database Schema:** Added `remember_me` boolean column to `refresh_tokens` table (default: false)
- **Dynamic Idle Timeout:** Modified `isIdleTimeout()` to use 7 or 30 days based on stored `remember_me` value
- **Token Cleanup Fix:** Updated `cleanupExpiredTokens()` to respect dynamic idle timeout per session type
- **Environment Variables:** Added `JWT_REFRESH_EXPIRES_IN_LONG=90d` and `JWT_REFRESH_IDLE_DAYS_LONG=30`
- **Swagger Documentation:** Updated `/auth/login` endpoint docs with complete `remember_me` field description
- **Testing:** Verified both normal and extended sessions work correctly with proper expiration times
- **Next.js Integration Guide:** Created comprehensive guide (`docs/NEXTJS_INTEGRATION.md`) with:
  - Token storage strategies (HTTP-only cookies vs localStorage)
  - Axios configuration with automatic token refresh
  - Complete authentication context provider
  - Security best practices for extended sessions
  - Remember Me checkbox component example

### October 7, 2025 - Complete Logout System & Redis Fallback
- **Logout Endpoints:** Implemented POST `/api/v1/auth/logout` and POST `/api/v1/auth/logout-all` with authentication middleware
- **Session Invalidation:** Logout increments `sessionVersion` and clears user cache, instantly revoking all tokens
- **Flexible Logout:** `/logout` accepts optional `refresh_token` in body to revoke specific session, or revokes all sessions if empty
- **Logout All:** `/logout-all` revokes all user sessions and deletes all refresh tokens
- **Redis Fallback:** Implemented in-memory Map-based cache with TTL for sessionVersion when Redis unavailable
- **Development Resilience:** System works correctly in development without Redis (in-memory fallback automatically activates)
- **Translations:** Added complete Spanish/English translations for logout messages ("La sesión ha sido revocada" / "Session has been revoked")
- **Security:** All logout operations require valid access token authentication
- **Swagger Documentation:** Complete OpenAPI documentation for both logout endpoints

### October 6, 2025 - Role-Based Access Control (RBAC) System
- **RBAC Implementation:** Migrated from ENUM-based roles to flexible database-driven RBAC system
- **7 Roles Created:** system-admin, org-admin, org-manager, user, viewer, guest, demo
- **Database Migration:** Created `roles` table, migrated users.role (ENUM) to users.role_id (UUID FK)
- **Data Migration:** Automated mapping of admin→system-admin, manager→org-manager, user→user
- **Role Models:** Created Role model with Sequelize, established User-Role relationship via belongsTo
- **Repository Updates:** All auth repository functions now JOIN roles table and return complete role object
- **Middleware Enhancement:** Updated authorize() to validate by role.name, created requireRole() alias for intuitive usage
- **Cache Integration:** Role data cached with user in Redis (15-min TTL), included in JWT payload
- **User Methods:** Added hasRole(), isSystemAdmin(), isOrgAdmin() instance methods to User model
- **Migration Script:** Created `src/db/migrations/migrate-roles.js` for automated schema migration
- **Role Seeders:** Implemented seeder with UUID v7 generation for 7 system roles
- **Documentation:** Complete RBAC documentation added to replit.md with examples and usage patterns

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
