# Technology Stack

> **CONSULTAR**: Al agregar dependencias o verificar versiones

## Core Runtime

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | Runtime (ESM modules) |
| Express.js | 4.21.x | HTTP framework |
| ESM | native | Module system (`"type": "module"`) |

## Databases

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 15+ | Primary relational database |
| Sequelize | 6.37.x | ORM for PostgreSQL |
| Redis | 4.7.x | Caching, sessions, rate limiting |
| Apache Cassandra | 4.8.x | Time-series sensor data (`sensores` keyspace) |

## Security

| Technology | Version | Purpose |
|------------|---------|---------|
| jsonwebtoken | 9.0.x | JWT generation/validation |
| bcrypt | 5.1.x | Password hashing |
| Helmet | 8.0.x | Security headers |
| Zod | 3.24.x | Input validation |
| Cloudflare Turnstile | - | CAPTCHA on login |
| Hashids | 2.3.x | Public code generation |

## Observability

| Technology | Version | Purpose |
|------------|---------|---------|
| Pino | 9.13.x | Application logging (worker thread) |
| pino-http | 10.5.x | HTTP request logging |
| Winston | 3.18.x | Error logging (PostgreSQL + files) |
| winston-daily-rotate-file | 5.0.x | Log rotation |
| prom-client | 15.1.x | Prometheus metrics |

## Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| dayjs | 1.11.x | Date manipulation |
| uuid | 13.0.x | UUIDv7 generation |
| compression | 1.7.x | Brotli/gzip compression |
| cors | 2.8.x | CORS handling |
| i18n | 0.15.x | Internationalization |

## External Services

| Service | Purpose |
|---------|---------|
| Azure Blob Storage | File storage with SAS URLs |
| Cloudflare Turnstile | CAPTCHA validation |
| Next.js Frontend | BFF pattern consumer |

## Documentation

| Technology | Version | Purpose |
|------------|---------|---------|
| swagger-jsdoc | 6.2.x | OpenAPI spec from JSDoc |
| swagger-ui-express | 5.0.x | API documentation UI (`/docs`) |

## Development & Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 2.1.x | Unit and integration testing |
| Supertest | 7.0.x | HTTP testing |
| ESLint | 9.17.x | Code linting |
| sequelize-cli | 6.6.x | Database migrations |

## NPM Scripts

```bash
npm run dev              # Development with watch mode
npm run start            # Production start
npm run test             # Run tests
npm run test:watch       # Watch mode tests
npm run lint             # Check linting
npm run lint:fix         # Fix linting issues
npm run db:migrate       # Run migrations
npm run db:migrate:undo  # Rollback migration
npm run db:dbml          # Generate DBML schema
npm run db:seed          # Seed database
```

## Environment Variables

Variables críticas (ver `src/config/env.js`):

```
DATABASE_URL          # PostgreSQL connection
REDIS_URL             # Redis connection
JWT_ACCESS_SECRET     # Access token signing
JWT_REFRESH_SECRET    # Refresh token signing
AZURE_STORAGE_*       # Azure Blob config
CASSANDRA_*           # Cassandra connection
TURNSTILE_SECRET      # Cloudflare Turnstile
```
