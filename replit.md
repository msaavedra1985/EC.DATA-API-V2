# EC.DATA API - Enterprise REST API

## Overview
EC.DATA is a technology company specializing in enterprise data solutions and scalable backend infrastructure. This repository contains our flagship REST API, built with Node.js and Express, designed to support multi-tenant e-commerce platforms. The API provides robust observability, security, and scalability, integrating seamlessly with Next.js frontends via a BFF (Backend for Frontend) pattern. Our mission is to deliver highly reliable and secure backend solutions capable of handling complex business operations across multiple tenants and diverse market sectors.

## User Preferences

Preferred communication style: Simple, everyday language.

**Code Standards:**
- All code must be written in English with Spanish comments
- Use arrow functions exclusively (no traditional function declarations)
- ESM modules only (`"type": "module"`)
- Single quotes for strings (enforced by ESLint)
- Comment extensively - every function, middleware, helper, model, and endpoint should have explanatory comments in Spanish

**Audit Standards (MANDATORY):**
- **Every CREATE, UPDATE, DELETE operation MUST log to `audit_logs` table** - No exceptions
- Use the centralized `auditLog` helper service (never direct database inserts)
- Log structure: `{ entity_type, entity_id, action, performed_by, changes: { field: { old, new } }, metadata }`
- Include IP address and user agent for security tracking
- Never skip audit logging, even in batch operations or background jobs

**Error Logging Standards (MANDATORY):**
- **Winston-powered error logging system** with dual transports: PostgreSQL (`error_logs` table) + rotating daily files (`logs/errors-YYYY-MM-DD.log`)
- **ALL API errors (4xx, 5xx) are automatically logged via global middleware** - Zero configuration required
- **Correlation tracking:** Both `error_logs` and `audit_logs` support `correlation_id` field to link related errors and audit actions

**Development Approach:**
- **CRITICAL DEVELOPMENT DIRECTIVE**: "What works, don't touch" - Do NOT modify working files unless absolutely necessary. If changes to working code are required, perform deep impact analysis first to assess platform-wide effects.
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
- **Data:** Sequelize ORM for PostgreSQL, Redis for caching/sessions.
- **Security:** JWT (Bearer tokens, scopes), Zod for validation, Helmet, bcrypt.
- **Observability:** Pino, Prometheus metrics, database audit logging, request/response logging.
- **Documentation:** Swagger/OpenAPI (`/docs`) via swagger-jsdoc and swagger-ui-express.

### Architectural Patterns
- **Layered Architecture:** Strict separation into Routes, Services, Repositories, and Database layers.
- **Feature-Based Organization:** Code structured by domain (auth, tenants) with dedicated files per feature.
- **Response Envelope Pattern:** Consistent `{ ok: true/false, data/error, meta }` structure.
- **Configuration Management:** Centralized `src/config/env.js` for environment variables.

### Performance & Scalability
- **Caching:** Redis-based caching with configurable TTLs and automatic invalidation on CUD operations.
- **Compression:** Brotli/gzip compression middleware.
- **Rate Limiting:** Redis-powered intelligent rate limiting with role-based limits and dual modes.
- **Pagination:** Mandatory offset-based pagination (`limit`, `offset`) for list endpoints.

### Extensibility & Robustness
- **Identifier System:** UUID v7, human_id, and public_code (opaque, Hashids + Luhn checksum).
- **Public API Identifier Policy (CRITICAL SECURITY):** Public APIs MUST always use `public_code` as `id` in responses; UUIDs or `human_id` are never exposed. Internal operations use UUID. This applies to ALL entities.
- **Authentication:** Comprehensive JWT-based system with access/refresh tokens, token rotation, theft detection, and RBAC. Refresh tokens are database-persisted and SHA-256 hashed.
- **RBAC:** Flexible, database-driven RBAC with 7 predefined roles and middleware for access control.
- **Multi-Tenant Organizations:** Hierarchical organization system with many-to-many user-organization relationships and Redis-cached scope calculation.
- **Session Context Caching:** Frontend NEVER decodes JWT; all session context is cached in Redis and returned via API responses, acting as the single source of truth for frontend state.
- **Global Audit Logging:** Every CUD operation MUST be logged to the `audit_logs` table using the `auditLog` helper.

## External Dependencies

### Core Services
- **PostgreSQL Database:** Managed via Sequelize ORM.
- **Redis Cache:** For CORS origins, session storage, and application caching.
- **Next.js Frontend:** Consumes API via BFF pattern.

### Testing & Quality Assurance
- **Testing Framework:** Vitest for unit and integration tests.
- **Test Coverage:** V8 coverage provider with HTML/JSON reports.
- **Test Helpers:** `testServer.js`, `fixtures.js`, `cleanupDB.js`.

### NPM Dependencies
- **Production:** `express`, `sequelize`, `pg`, `redis`, `jsonwebtoken`, `bcrypt`, `zod`, `cors`, `helmet`, `compression`, `pino`, `prom-client`, `swagger-jsdoc`, `swagger-ui-express`, `dotenv`.
- **Development:** `eslint`, `vitest`, `supertest`, `nodemon`.

### Monitoring & Observability
- **Metrics:** Prometheus for HTTP request duration, counts, active connections, and custom metrics.
- **Logging:** Pino for general application logs; Winston for structured error persistence to PostgreSQL and rotating files; database-backed audit logging (`audit_logs` table); correlation system using `correlation_id`.
- **Health Checks:** Basic endpoint at `/api/v1/health`.