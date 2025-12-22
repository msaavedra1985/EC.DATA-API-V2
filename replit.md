# EC.DATA API - Enterprise REST API

## Overview
EC.DATA API is a Node.js and Express-based REST API for multi-tenant e-commerce platforms. It provides robust backend solutions for complex business operations across diverse market sectors, integrating with Next.js frontends via a BFF pattern. The API prioritizes observability, security, and scalability.

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

**Database Migration Standards (MANDATORY):**
- **Use Sequelize CLI migrations** for all schema changes to ensure reproducibility across environments
- **Never modify database schema manually** without creating a corresponding migration file
- **Always test migrations**: Run `npm run db:migrate` (up) and `npm run db:migrate:undo` (down) before committing
- **Migration files** are located in `src/db/migrations/` and use CommonJS format
- **Naming convention**: Timestamp-based (auto-generated) followed by descriptive name (e.g., `20251125131324-add-extended-fields-to-sites.js`)
- **Configuration**: `.sequelizerc` defines project structure; `src/config/database.cjs` contains database connection settings (CommonJS for CLI compatibility)

**Communication:**
- Explain architectural decisions and tradeoffs clearly
- Propose the simplest, most practical solutions for connecting with the Next.js frontend
- Offer mock data options when building endpoints before databases are populated

## System Architecture

### Technology Stack
- **Core:** Express.js 4.x, Node.js 20+ (ESM modules), API versioning (`/api/v1`).
- **Data:** Sequelize ORM for PostgreSQL, Redis for caching/sessions.
- **Security:** JWT (Bearer tokens, scopes), Zod for validation, Helmet, bcrypt, Cloudflare Turnstile integration, login rate limiting, resource ownership validation.
- **Observability:** Pino, Prometheus metrics, database audit logging, request/response logging, Winston for error logging.
- **Documentation:** Swagger/OpenAPI (`/docs`).

### Architectural Patterns
- **Layered Architecture:** Strict separation into Routes, Services, Repositories, and Database layers.
- **Feature-Based Organization:** Code structured by domain (auth, tenants).
- **Response Envelope Pattern:** Consistent `{ ok: true/false, data/error, meta }` structure.
- **Configuration Management:** Centralized `src/config/env.js`.

### Performance & Scalability
- **Caching:** Redis-based caching with configurable TTLs and automatic invalidation.
- **Compression:** Brotli/gzip compression.
- **Rate Limiting:** Redis-powered, intelligent rate limiting with role-based limits (including a dual-layer login rate limiter).
- **Pagination:** Mandatory offset-based pagination (`limit`, `offset`) for list endpoints.

### Extensibility & Robustness
- **Identifier System:** UUID v7, human_id, and public_code (opaque, Hashids + Luhn checksum). Public APIs MUST use `public_code`.
- **Authentication:** JWT-based system with access/refresh tokens, token rotation, theft detection, and RBAC. Refresh tokens are database-persisted and SHA-256 hashed. Hybrid login identifier supporting email, username, or public_code.
- **RBAC:** Flexible, database-driven RBAC with 7 predefined roles and middleware.
- **Multi-Tenant Organizations:** Hierarchical organization system with many-to-many user-organization relationships and Redis-cached scope calculation. Organization-scoped filtering on list endpoints.
- **Session Context Caching:** All session context is cached in Redis and returned via API responses.
- **Global Audit Logging:** Every CUD operation is logged to the `audit_logs` table using the `auditLog` helper.
- **Organization Hierarchy:** Supports unlimited depth, root organization, tree navigation, lazy loading, and cycle prevention.
- **Hybrid Role System:** Combines Global Roles (`users.role_id`) and Organization Roles (`user_organizations.role_in_org`) for granular permissions.

### Core Modules
- **Sites Module:** Manages physical locations (offices, branches, warehouses) linked to organizations, including geolocation and address.
- **Devices Module:** Manages IoT/Edge devices associated with organizations and sites.
- **Channels Module:** Manages communication channels for devices, including MQTT, HTTP, WebSocket.
- **Files Module:** Centralized file upload management via Azure Blob Storage with SAS URLs.
- **Telemetry Module:** Time-series measurement data from Apache Cassandra for IoT measurements. Supports historical and latest data retrieval with various resolutions (raw, 1m, 15m, 60m, daily, monthly). Features multi-language variable definitions and timezone-aware filtering.
  - **Variables CRUD:** Full REST API for managing telemetry variables (`GET/POST/PUT/DELETE /api/v1/telemetry/variables`)
    - Filters: search (name/description/column_name), measurementTypeId, isRealtime, isDefault, isActive, showInBilling, showInAnalysis, chartType, aggregationType
    - Pagination: limit, offset with sortBy/sortOrder
    - Multi-language translations support (es, en, etc.)
    - Zod validation, audit logging, cache invalidation on CUD

## External Dependencies

### Core Services
- **PostgreSQL Database:** Managed via Sequelize ORM.
- **Redis Cache:** For CORS origins, session storage, and application caching.
- **Azure Blob Storage:** File storage with dual containers (public/private) and SAS URL generation.
- **Apache Cassandra:** Time-series sensor data storage for IoT measurements. Keyspace `sensores`.
- **Next.js Frontend:** Consumes API via BFF pattern.
- **Cloudflare Turnstile:** For captcha validation on login.

### Testing & Quality Assurance
- **Testing Framework:** Vitest for unit and integration tests.

### Monitoring & Observability
- **Metrics:** Prometheus for HTTP request duration, counts, active connections, and custom metrics.
- **Logging:** Pino for general application logs; Winston for structured error persistence to PostgreSQL and rotating files; database-backed audit logging (`audit_logs` table); correlation system using `correlation_id`.
- **Health Checks:** Basic endpoint at `/api/v1/health`.