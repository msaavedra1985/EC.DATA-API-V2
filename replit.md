# EC.DATA API - Enterprise REST API

## Overview
EC.DATA API is a Node.js and Express-based REST API designed for multi-tenant e-commerce platforms. It provides robust backend solutions for complex business operations across diverse market sectors, integrating with Next.js frontends via a BFF (Backend for Frontend) pattern. The API prioritizes observability, security, scalability, and supports a wide range of features including IoT device management, time-series data handling, and flexible resource hierarchies.

## User Preferences
Preferred communication style: Simple, everyday language.

**Code Standards:**
- All code must be written in English with Spanish comments
- Use arrow functions exclusively (no traditional function declarations)
- ESM modules only (`"type": "module"`)
- Single quotes for strings (enforced by ESLint)
- Comment extensively - every function, middleware, helper, model, and endpoint should have explanatory comments in Spanish

**Identifier Security Policy (MANDATORY):**
- **NEVER expose internal UUIDs** in API responses - Use public_codes exclusively (e.g., `CHN-5LYJX-4`, `SIT-xxx`, `RES-xxx`)
- **Public codes use Hashids + Luhn checksum** - Opaque, non-enumerable, and tamper-detectable
- **UUIDv7 stays internal only** - Contains timestamp info that could leak creation patterns
- **When creating new tables, ask if data is sensitive** to decide between classic IDs vs public_codes
- **reference_id fields store public_codes** (VARCHAR), not UUIDs - Enables safe cross-module references

**Audit Standards (MANDATORY):**
- **Every CREATE, UPDATE, DELETE operation MUST log to `audit_logs` table** - No exceptions
- Use the centralized `auditLog` helper service (never direct database inserts)
- Log structure: `{ entity_type, entity_id, action, performed_by, changes: { field: { old, new } }, metadata }`
- Include IP address and user agent for security tracking
- Never skip audit logging, even in batch operations or background jobs

**Error Logging Standards (MANDATORY):
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
- **Security:** JWT, Zod for validation, Helmet, bcrypt, Cloudflare Turnstile, login rate limiting, resource ownership validation.
- **Observability:** Pino, Prometheus, database audit logging, Winston for error logging.
- **Documentation:** Swagger/OpenAPI (`/docs`).

### Architectural Patterns
- **Layered Architecture:** Strict separation into Routes, Services, Repositories, and Database layers.
- **Feature-Based Organization:** Code structured by domain (e.g., auth, tenants).
- **Response Envelope Pattern:** Consistent `{ ok: true/false, data/error, meta }` structure.
- **Configuration Management:** Centralized `src/config/env.js`.

### Performance & Scalability
- **Caching:** Redis-based caching with configurable TTLs and automatic invalidation.
- **Compression:** Brotli/gzip compression.
- **Rate Limiting:** Redis-powered, intelligent rate limiting with role-based limits.
- **Pagination:** Mandatory offset-based pagination (`limit`, `offset`) for list endpoints.

### Extensibility & Robustness
- **Identifier System:** UUID v7, human_id, and public_code (Hashids + Luhn checksum). Public APIs must use `public_code`.
- **Authentication:** JWT-based access/refresh tokens with token rotation, theft detection, and RBAC. Hybrid login identifier (email, username, public_code).
- **RBAC:** Flexible, database-driven RBAC with predefined roles and middleware.
- **Multi-Tenant Organizations:** Hierarchical organization system with many-to-many user-organization relationships and Redis-cached scope calculation.
- **Session Context Caching:** All session context cached in Redis and returned via API responses.
- **Global Audit Logging:** Every CUD operation logged to `audit_logs` table.
- **Organization Hierarchy:** Supports unlimited depth using PostgreSQL ltree, permission inheritance, soft delete with cascade, and automatic path calculation. Node types include folder, site, channel, with flexible parent-child relationships. Access control is per-node with inheritance.
- **Admin Panel & Impersonation System:** Dedicated `system-admin` capabilities for global platform management, including God View mode and impersonation of other organizations. This is managed via JWT payload flags and specific API endpoints, with full audit logging for impersonation actions.
- **Request Context Architecture:** Server-derived contextual data (user, organization, locale) is injected into dedicated `req` objects (`req.user`, `req.organizationContext`, `req.locale`) to maintain a clear separation from client-sent data in `req.query`. Supports both Session JWTs (web/frontend) and API Key JWTs (M2M with limited scopes).

### Core Modules
- **Sites Module:** Manages physical locations linked to organizations.
- **Devices Module:** Manages IoT/Edge devices.
- **Channels Module:** Manages communication channels (MQTT, HTTP, WebSocket).
- **Files Module:** Centralized file upload management via Azure Blob Storage.
- **Telemetry Module:** Handles time-series measurement data from Apache Cassandra, including CRUD for variables, multi-language support, and timezone-aware filtering.
- **Resource Hierarchy Module:** Provides a flexible tree-based organization for resources (folders, sites, channels) using PostgreSQL's `ltree` extension for efficient ancestor/descendant queries. Includes a REST API for CRUD operations, tree manipulation, and access management with performance optimizations like Redis caching and indexing.

## External Dependencies

### Core Services
- **PostgreSQL Database:** Managed via Sequelize ORM.
- **Redis Cache:** For CORS origins, session storage, and application caching.
- **Azure Blob Storage:** File storage with SAS URL generation.
- **Apache Cassandra:** Time-series sensor data storage (`sensores` keyspace).
- **Next.js Frontend:** Consumes API via BFF pattern.
- **Cloudflare Turnstile:** For captcha validation on login.

### Testing & Quality Assurance
- **Testing Framework:** Vitest for unit and integration tests.

### Monitoring & Observability
- **Metrics:** Prometheus for HTTP request duration, counts, and custom metrics.
- **Logging:** Pino for general application logs; Winston for structured error persistence to PostgreSQL and files; database-backed audit logging; correlation system using `correlation_id`.