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

**UX Standards (Frontend Integration):**
- **Skeleton Loaders:** Every section with data loading MUST implement skeleton loaders that mimic the final UI structure
- **Purpose:** Show users the interface layout before content loads, providing a modern, responsive feel
- **Implementation:** Skeleton should match the shape, size, and position of actual content (cards, lists, forms, etc.)
- **Applies to:** All data-fetching scenarios (API calls, async operations, initial page loads)

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

### Role-Based Access Control (RBAC)
- **Hierarchical Role System:** Seven predefined roles with explicit scope and capabilities:
  - `system-admin`: Global control across all organizations (audits, plans/quotas, feature flags, create/suspend/delete orgs)
  - `org-admin`: Administrator of their organization (user/role management, org settings, can create other org-admins). **Rule:** Every organization MUST have at least one org-admin
  - `org-manager`: Operational management within org (teams, workflows, reports, dashboards) without global config access (no billing, branding, SSO)
  - `user`: Standard internal user with access to assigned sections, can create/view own content and team content
  - `viewer`: Read-only access for dashboards and reports, can download files/reports if enabled
  - `guest`: Temporary/limited access via token with expiration, read-only on specific resources for sharing with external parties
  - `demo`: Demo environment user, always read-only with isolated mock data, cannot modify anything
- **Database Structure:** 
  - `roles` table: Master data with slug, name, description, scope (global/organization), hierarchy_rank, capabilities (JSONB), is_assignable
  - `user_roles` join table: Many-to-many relationship between users and roles with optional organization_id for scoped assignments
- **Authorization Model:**
  - Capability-based permissions: Fine-grained control via JSON capabilities (e.g., `users.create`, `billing.view`, `reports.export`)
  - Hierarchical verification: Higher rank roles inherit lower rank capabilities
  - Organizational scope: Roles can be global (system-admin) or organization-scoped (org-admin, org-manager, etc.)
  - Multi-role support: Users can have different roles in different organizations
- **Business Rules:**
  - Minimum org-admin enforcement: Prevents deletion/demotion of last org-admin in an organization
  - Demo user isolation: Automatic data segregation to mock dataset with statistical coherence
  - Guest token management: Time-limited access with automatic revocation on expiry

### Extensibility & Robustness
- **WebSocket Preparation:** HTTP server initialization isolated for easy Socket.io integration.
- **Graceful Shutdown:** Proper cleanup on SIGINT/SIGTERM for Redis, Sequelize, and in-flight requests.
- **Identifier System:** UUID v7, human_id (scoped incremental ID), and public_code (opaque, Hashids + Luhn checksum) for entities.
- **Authentication:** Comprehensive JWT-based system with access/refresh tokens, token rotation, theft detection. Refresh tokens are database-persisted and SHA-256 hashed.

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