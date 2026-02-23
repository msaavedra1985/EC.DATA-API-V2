# Convenciones del Proyecto

> **CONSULTAR**: Al crear nuevos módulos o archivos

## Directory Structure

```
src/
├── config/              # Configuración centralizada
│   ├── env.js           # Variables de entorno (Zod validated)
│   └── database.cjs     # Config Sequelize CLI (CommonJS)
├── db/
│   ├── migrations/      # Migraciones Sequelize (CommonJS)
│   ├── seeders/         # Seeds para datos iniciales
│   └── utils/           # Utilidades DB (generateDbml.js)
├── middleware/          # Middleware global
│   ├── auth.js          # JWT authentication
│   ├── rbac.js          # Role-based access control
│   └── errorHandler.js  # Global error handling
├── modules/             # Feature-based modules
│   └── [module]/
│       ├── index.js     # Router + exports
│       ├── routes.js    # Route definitions (si separado)
│       ├── services.js  # Business logic
│       ├── repository.js # Data access
│       ├── models/      # Sequelize models
│       ├── dtos/        # Zod schemas for validation
│       └── helpers/     # Module-specific utilities
├── utils/               # Shared utilities
│   ├── logger.js        # Pino logger
│   ├── redis.js         # Redis client
│   └── winston/         # Winston error logger
└── index.js             # App entry point
```

## Import Conventions

```javascript
// 1. Node.js built-ins
import { Router } from 'express';
import crypto from 'crypto';

// 2. External dependencies
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// 3. Internal config
import { config } from '../../config/env.js';

// 4. Internal modules (relative)
import { userService } from '../users/services.js';
import logger from '../../utils/logger.js';
```

## Response Envelope Pattern

Todas las respuestas API siguen este formato:

```javascript
// Success
{
  ok: true,
  data: { ... },
  meta: { total, limit, offset }  // Para listas paginadas
}

// Error
{
  ok: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human readable message',
    details: []  // Opcional, para validación
  }
}
```

## Database Migration Standards

- **Use Sequelize CLI migrations** for all schema changes
- **Never modify database schema manually** without creating a corresponding migration file
- **Always test migrations**: Run `npm run db:migrate` (up) and `npm run db:migrate:undo` (down) before committing
- **Migration files** are located in `src/db/migrations/` and use **CommonJS format**
- **Naming convention**: Timestamp-based (auto-generated) followed by descriptive name
  - Example: `20251125131324-add-extended-fields-to-sites.js`
- **Configuration**: `.sequelizerc` defines project structure; `src/config/database.cjs` contains database connection settings

### Migration Commands

```bash
npm run db:migrate           # Run pending migrations
npm run db:migrate:undo      # Undo last migration
npm run db:migrate:undo:all  # Undo all migrations
npm run db:migrate:status    # Check migration status
npm run db:migration:create  # Create new migration
npm run db:dbml              # Generate DBML visualization
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `user-service.js` |
| Variables | camelCase | `userId`, `accessToken` |
| Constants | SCREAMING_SNAKE | `SESSION_TTL_NORMAL` |
| Classes/Models | PascalCase | `Organization`, `RefreshToken` |
| Database tables | snake_case | `refresh_tokens`, `audit_logs` |
| DB columns | snake_case | `created_at`, `public_code` |
| API endpoints | kebab-case | `/api/v1/session-context` |
| API request keys | camelCase | `{ "customWidth": 1920 }` |
| API response keys | camelCase | `{ "publicCode": "DSH-X", "isHome": true }` |
| Public codes | PREFIX-HASH-CHECK | `ORG-5LYJX-4` |

## API Case Transform (Bidireccional)

El API usa transformación automática de case mediante middlewares globales en `src/middleware/caseTransform.js`:

- **Request** (Frontend → API): `req.body` y `req.query` se convierten de camelCase a snake_case
- **Response** (API → Frontend): `res.json()` convierte keys de snake_case a camelCase

Esto permite que:
- El **código interno** del API trabaje en snake_case (alineado con DB y Sequelize)
- El **frontend** trabaje exclusivamente en camelCase
- Los **DTOs Zod** sigan validando en snake_case sin cambios
- La transformación es **transparente** y no requiere acción por módulo

**Utilidades**: `src/utils/caseTransform.js` (snakeToCamel, camelToSnake, toCamelCase, toSnakeCase)

**Orden en app.js**: Se monta después de `express.json()` + `compression()` y antes de `i18n` y rutas

## Module Creation Checklist

Al crear un nuevo módulo:

1. [ ] Crear estructura de carpetas en `src/modules/[nombre]/`
2. [ ] Crear modelo Sequelize con timestamps y paranoid (soft delete)
3. [ ] Crear DTOs con Zod para validación
4. [ ] Crear service con lógica de negocio
5. [ ] Crear routes con documentación Swagger
6. [ ] Agregar audit logging a operaciones CUD
7. [ ] Registrar router en `src/index.js`
8. [ ] Crear migración si hay cambios de schema
9. [ ] Actualizar `modules.md` con descripción del módulo
