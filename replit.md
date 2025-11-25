# EC.DATA API - Enterprise REST API

## Overview
EC.DATA is a technology company specializing in enterprise data solutions. This repository contains our flagship REST API, built with Node.js and Express, designed to support multi-tenant e-commerce platforms. The API provides robust observability, security, and scalability, integrating seamlessly with Next.js frontends via a BFF (Backend for Frontend) pattern. Our mission is to deliver highly reliable and secure backend solutions capable of handling complex business operations across multiple tenants and diverse market sectors.

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
- **Public API Identifier Policy:** Public APIs MUST always use `public_code` as `id` in responses; UUIDs or `human_id` are never exposed.
- **Authentication:** Comprehensive JWT-based system with access/refresh tokens, token rotation, theft detection, and RBAC. Refresh tokens are database-persisted and SHA-256 hashed.
- **RBAC:** Flexible, database-driven RBAC with 7 predefined roles and middleware for access control.
- **Multi-Tenant Organizations:** Hierarchical organization system with many-to-many user-organization relationships and Redis-cached scope calculation.
- **Session Context Caching:** All session context is cached in Redis and returned via API responses, acting as the single source of truth for frontend state.
- **Global Audit Logging:** Every CUD operation MUST be logged to the `audit_logs` table using the `auditLog` helper.

### Organization Hierarchy & Hybrid Role System
- **Organization Hierarchy:** Supports unlimited depth, root organization, tree navigation helpers, lazy loading for API endpoints, and cycle prevention.
- **Hybrid Role System:** Combines Global Roles (`users.role_id`) and Organization Roles (`user_organizations.role_in_org`) to define granular permissions.
- **Automatic Filtering:** All organization endpoints automatically filter results based on user's hybrid permissions.

### Sites Module - Physical Locations
- **Purpose:** Represents physical locations (offices, branches, warehouses) associated with organizations, including geolocation and address information.
- **Data Model:** Uses triple identifiers (UUID v7, human_id, public_code), `belongsTo Organization` and `belongsTo Country` relations, geolocation, address fields, building characteristics, and contact information.
- **Public Code Policy:** Sites are exposed using `public_code` as `id`.
- **Security & Permissions:** Endpoints require JWT authentication, and users can only access sites within their authorized organizations.

### Database Migrations - Sequelize CLI

**Purpose:**
The project uses Sequelize CLI for database migrations, ensuring reproducible schema changes across all environments (development, staging, production).

**Configuration Files:**
- `.sequelizerc` - Defines paths for migrations, models, seeders, and config
- `src/config/database.cjs` - Database connection settings (CommonJS format for CLI compatibility)
- `src/db/migrations/` - Migration files directory

**Available Commands:**
```bash
# Check migration status
npm run db:migrate:status

# Run pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:undo

# Rollback all migrations
npm run db:migrate:undo:all

# Create new migration
npm run db:migration:create -- my-migration-name
```

**Workflow for Schema Changes:**
1. **Create migration:** `npm run db:migration:create -- descriptive-name`
2. **Edit migration file:** Add `up()` and `down()` logic in `src/db/migrations/XXXXXX-descriptive-name.js`
3. **Test migration:** Run `npm run db:migrate` to apply, then `npm run db:migrate:undo` to rollback
4. **Update DBML:** Run `npm run db:dbml` to update database diagram
5. **Commit changes:** Include migration file in version control

**Migration Best Practices:**
- Always write both `up()` and `down()` methods for reversibility
- Test rollback before committing to ensure migrations are reversible
- Use transactions for complex multi-step migrations
- Never modify existing migrations that have been deployed
- Include comments explaining the purpose of each migration
- For ENUM types, use conditional creation (`IF NOT EXISTS`) to avoid errors

**Example Migration Structure:**
```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add schema changes here
    await queryInterface.addColumn('table_name', 'column_name', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverse the changes here
    await queryInterface.removeColumn('table_name', 'column_name');
  }
};
```

## External Dependencies

### Core Services
- **PostgreSQL Database:** Managed via Sequelize ORM.
- **Redis Cache:** For CORS origins, session storage, and application caching.
- **Next.js Frontend:** Consumes API via BFF pattern.

### Testing & Quality Assurance
- **Testing Framework:** Vitest for unit and integration tests.
- **Test Coverage:** V8 coverage provider with HTML/JSON reports.

### Monitoring & Observability
- **Metrics:** Prometheus for HTTP request duration, counts, active connections, and custom metrics.
- **Logging:** Pino for general application logs; Winston for structured error persistence to PostgreSQL and rotating files; database-backed audit logging (`audit_logs` table); correlation system using `correlation_id`.
- **Health Checks:** Basic endpoint at `/api/v1/health`.