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
- **Authentication:** Comprehensive JWT-based system with access/refresh tokens, token rotation, theft detection, and role-based access control (RBAC). Refresh tokens are database-persisted and SHA-256 hashed. JWT includes standard claims (`iss`, `aud`, `sub`, `iat`, `exp`, `jti`, `activeOrgId`, `primaryOrgId`, `canAccessAllOrgs`, `sessionVersion`, `tokenType`).
- **RBAC:** Flexible, database-driven RBAC with 7 predefined roles (`system-admin`, `org-admin`, `org-manager`, `user`, `viewer`, `guest`, `demo`). Implemented with `User.belongsTo(Role)`, `User.prototype.hasRole()`, `authenticate` and `requireRole` middleware. Role data is cached in Redis and included in JWT.
- **Multi-Tenant Organizations:** Hierarchical organization system with many-to-many user-organization relationships. Users can belong to multiple organizations with one marked as primary. Supports organizational scope with role-based access inheritance (system-admin: all orgs, org-admin: org + descendants, org-manager: org + direct children, user/viewer/guest/demo: direct orgs only). EC.DATA is the root organization.
- **Organization Scope Service:** Redis-cached organizational scope calculation (TTL: 15min) with hierarchical access control. Includes endpoints: `GET /auth/organizations` (list available orgs), `POST /auth/switch-org` (change active org with new JWT generation).
- **Logout System:** Endpoints for `/logout` and `/logout-all` to invalidate sessions by incrementing `sessionVersion` and clearing user cache. Supports revoking specific refresh tokens.
- **"Remember Me" Feature:** Extends session duration for login with `remember_me` flag, dynamically adjusting token expiration and idle timeouts.
- **Session Context Caching:** **CRITICAL RULE: Frontend NEVER decodes JWT.** All session context (activeOrgId, primaryOrgId, role, canAccessAllOrgs, user info) is cached in Redis with 15-min TTL and returned via API responses (`/auth/login`, `/auth/me`, `/auth/switch-org`, `/auth/session-context`). This eliminates frontend JWT decoding, improves performance, and maintains security. The `session_context` object is the single source of truth for frontend state.

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