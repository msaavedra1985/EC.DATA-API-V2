# API EC ESM - Enterprise API Project

## Overview

This is an enterprise-grade REST API built with Node.js and Express, designed to support a multi-tenant e-commerce platform with comprehensive observability, security, and scalability features. The API uses modern ESM (ECMAScript Modules) syntax and follows a feature-based architecture pattern.

The project is structured to integrate with a separate Next.js BFF (Backend for Frontend) project running on Replit, providing backend services for both public-facing and administrative interfaces.

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

**Communication:**
- Explain architectural decisions and tradeoffs clearly
- Propose the simplest, most practical solutions for connecting with the Next.js frontend
- Offer mock data options when building endpoints before databases are populated

## System Architecture

### Technology Stack

**Core Framework:**
- Express.js 4.x as the web framework
- Node.js 20+ runtime with ESM modules
- API versioning with `/api/v1` base path

**Data Layer:**
- **Sequelize ORM** (mandatory - no Prisma or TypeORM allowed) for PostgreSQL interactions
- PostgreSQL as the primary relational database
- Redis for caching and session management
- Snake_case naming in SQL, camelCase in JSON responses

**Security & Validation:**
- JWT-based authentication with Bearer tokens and scopes
- Zod for comprehensive request validation (body, query, params)
- Helmet for HTTP security headers
- bcrypt for password hashing
- Dynamic CORS origins loaded from database with Redis caching (600s TTL) and environment variable fallback

**Observability:**
- Pino for structured JSON logging with pino-http middleware
- Prometheus metrics exposed at `/metrics` endpoint (dev/internal only)
- Database-backed audit logging for sensitive operations
- Request/response logging for all API calls

**API Documentation:**
- Swagger/OpenAPI documentation served at `/docs` (development only)
- swagger-jsdoc for generating specs from code annotations
- swagger-ui-express for interactive documentation

### Architectural Patterns

**Layered Architecture:**
The application follows strict layer separation:
1. **Routes/Endpoints** - HTTP request handling and response formatting
2. **Services** - Business logic and orchestration
3. **Repositories** - Data access abstraction
4. **Database** - Sequelize models and queries

No layer skipping is allowed - each layer must call only the layer directly below it.

**Feature-Based Organization:**
Code is organized by feature/domain (auth, tenants, sites, bills) rather than by technical role. Each module contains:
- `index.js` - Main router and public API
- `dtos/` - Zod validation schemas
- `models/` - Sequelize model definitions (one model per file)
- `services.js` - Business logic
- `repository.js` - Database operations

**Response Envelope Pattern:**
All API responses follow a consistent envelope structure:
- Success: `{ ok: true, data: {...}, meta: { timestamp, ... } }`
- Error: `{ ok: false, error: { message, code, status, details? }, meta: { timestamp, ... } }`

This provides consistent error handling and makes client-side response processing predictable.

**Configuration Management:**
Centralized environment configuration in `src/config/env.js` with:
- Validation at application startup
- Type coercion for numeric values
- Sensible defaults for development
- Support for both individual env vars and connection URLs (DATABASE_URL, REDIS_URL)

### Performance & Scalability

**Caching Strategy:**
- Redis-based caching for frequently accessed data (CORS origins, user sessions)
- ETag generation with `If-None-Match` support for 304 Not Modified responses
- Configurable TTLs per cache type

**Compression:**
- Brotli/gzip compression middleware for all responses
- Configurable compression thresholds

**Rate Limiting:**
- Rate limiting in "observe mode" (non-blocking) with `X-RateLimit-*` headers
- Configurable windows and request limits
- Designed for easy transition to enforcing mode in production

**Pagination:**
- Mandatory pagination for all list endpoints
- Default limit: 50 items, maximum: 200 items
- Offset-based pagination with `limit` and `offset` query parameters

### Internationalization

**Multi-language Design:**
The system is designed for multi-language support from the ground up:
- Separate translation tables (e.g., `countries` + `country_translations`)
- Translation selection based on user language from JWT token or Accept-Language header
- Schema: `{ entity_id, lang, field_name, translated_value }`

### Future Extensibility

**WebSocket Preparation:**
The HTTP server initialization in `src/index.js` is isolated to allow easy Socket.io integration:
- Server instance can be wrapped for WS support
- CORS configuration will extend to WebSocket origins
- Separate port configuration available if needed

**Graceful Shutdown:**
Proper cleanup on SIGINT/SIGTERM signals:
- Close Redis connections
- Close Sequelize connection pool
- Finish in-flight requests before shutdown

## External Dependencies

### Core Services

**PostgreSQL Database:**
- Managed via Sequelize ORM with automatic migration support (Umzug)
- Connection via individual credentials or DATABASE_URL
- Models use underscored naming (snake_case) with automatic timestamp fields
- Connection pooling configured for production load

**Redis Cache:**
- Used for CORS origin caching, session storage, and application-level caching
- Connection via individual credentials or REDIS_URL
- Fallback to in-memory cache if Redis unavailable (development only)

**Frontend Integration:**
- Next.js BFF project connects via `NEXT_PUBLIC_API_URL` environment variable
- Development: CORS allows `DEV_FRONT_URL`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_ADMIN_URL`
- Production: CORS origins stored in database and cached in Redis
- Optional Replit proxy/tunnel for stable subdomain mapping

### NPM Dependencies

**Production:**
- `express` - Web framework
- `sequelize` - PostgreSQL ORM (mandatory)
- `pg` & `pg-hstore` - PostgreSQL client and serialization
- `redis` - Redis client (v4+)
- `jsonwebtoken` - JWT authentication
- `bcrypt` - Password hashing
- `zod` - Schema validation
- `cors` - CORS middleware
- `helmet` - Security headers
- `compression` - Response compression
- `pino`, `pino-http`, `pino-pretty` - Structured logging
- `prom-client` - Prometheus metrics
- `swagger-jsdoc` & `swagger-ui-express` - API documentation
- `dotenv` - Environment variable loading

**Development:**
- `eslint` & `eslint-plugin-import` - Code linting with import cycle detection
- `vitest` - Fast unit testing framework
- `supertest` - HTTP integration testing
- `nodemon` - Development file watching

### Testing Strategy

- **Unit Tests:** Vitest for service and utility function testing
- **Integration Tests:** Supertest for endpoint testing
- Test files colocated with source or in `tests/` directory
- Mock data fixtures available for testing without database dependencies

### Monitoring & Observability

**Metrics (Prometheus):**
- HTTP request duration histograms
- Request count by endpoint and status code
- Active connections gauge
- Custom business metrics

**Logging:**
- Structured JSON logs via Pino (high performance)
- Request/response logging with configurable log levels
- Database audit trail for sensitive operations
- Pretty printing in development, JSON in production

**Health Checks:**
- Basic health endpoint at `/api/v1/health`
- Returns service status, version, uptime, and timestamp
- Future: Deep health checks for database and Redis connectivity

## Recent Changes

### October 4, 2025 - Phase 2 Completed: Authentication Module

**Auth Module Implementation:**
- Complete user authentication system with JWT-based security
- User model with UUID primary keys, soft deletes (paranoid), and multi-tenancy support
- Secure password hashing with bcrypt (password_hash never exposed in API responses)
- Role-based access control (RBAC): admin, manager, user roles
- Repository pattern ensures clean data layer separation

**Endpoints Implemented:**
- `POST /api/v1/auth/register` - User registration with validation
- `POST /api/v1/auth/login` - Login with JWT token generation (access + refresh)
- `POST /api/v1/auth/refresh` - Refresh access token using refresh token
- `POST /api/v1/auth/change-password` - Change password (protected route)
- `GET /api/v1/auth/me` - Get current user profile (protected route)

**Security Features:**
- JWT access tokens (24h expiry) and refresh tokens (7d expiry)
- Bearer token authentication via Authorization header
- Token type validation (access vs refresh tokens)
- Active user verification on every protected request
- Password strength validation via Zod schemas

**Middleware:**
- `authenticate` - JWT verification for protected routes
- `authorize(roles)` - Role-based access control
- `optionalAuth` - Optional authentication for public/hybrid endpoints

**Database Preparation:**
- Cassandra configuration file created (`db/cassandra/client.js`) - awaiting credentials
- MongoDB configuration file created (`db/mongodb/client.js`) - awaiting credentials
- Both databases ready for connection once credentials are provided

**Response Helpers Update:**
- `successResponse` and `errorResponse` now send HTTP responses directly
- Consistent envelope pattern across all endpoints
- Simplified endpoint code (no manual `res.json()` calls)

### October 4, 2025 - UUID v7 + human_id + public_code System Implemented

**Identifier System Architecture:**
- Successfully implemented selective UUID v7 identifier system for user-specified "visible" entities
- All SQL table names now in English (per new directive)
- Comprehensive identifier utilities in `src/utils/identifiers.js`

**Three-Tier Identifier Pattern:**
1. **UUID v7** - Primary key (time-ordered, globally unique)
2. **human_id** - Incremental ID (scoped by organization_id for users, global for organizations)
3. **public_code** - Opaque public identifier (format: PREFIX-XXXXX-Y with Hashids + Luhn checksum)

**Database Schema:**
- **countries** - Reference table with ISO 3166-1 codes (id: serial - no UUID v7)
- **country_translations** - Multi-language support (Spanish/English)
- **organizations** - UUID v7 + human_id (global) + public_code (ORG- prefix)
- **users** - UUID v7 + human_id (scoped by organization_id) + public_code (EC- prefix)

**Identifier Implementation Details:**
- UUID v7 generator using `uuid` package v7() function
- human_id generator with optional scope support (global or organization-scoped)
- public_code now uses UUID v7 as source (not human_id) to ensure global uniqueness
- Hashids encoding with configurable salt (HASHIDS_SALT environment variable)
- Luhn checksum validation for typo detection in public codes

**Data Seeding:**
- Countries seeder successfully populated 55 countries with 110 translations (es/en)
- Seeder includes idempotency check to prevent duplicate insertions
- Proper dependency order: countries → organizations → users

**Testing Results:**
- ✅ Created global user (no organization): UUID v7, human_id=1, public_code="EC-jmQng-9"
- ✅ Created organization "Acme Corp": UUID v7, human_id=1, public_code="ORG-jmQng-9"
- ✅ Created organization user: UUID v7, human_id=1 (scoped), public_code="EC-z6VKDMIn9Wx-3" (unique)
- ✅ Verified no collisions in public_code between users with same human_id in different scopes

**Key Files Modified:**
- `src/utils/identifiers.js` - Complete identifier utility functions
- `src/modules/organizations/models/Organization.js` - Organization model with UUID v7
- `src/modules/auth/models/User.js` - User model with scoped human_id
- `src/modules/auth/repository.js` - Updated to use UUID v7 for public_code generation
- `src/db/models.js` - Model imports in correct dependency order
- `src/db/seeders/countries.seeder.js` - Countries and translations seeder