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

## camelCase End-to-End (Sin Middleware de Transformación)

El API trabaja en **camelCase nativo** en todas las capas. No existe middleware de transformación de case.

### Flujo de datos
```
Frontend (camelCase) → Express (camelCase) → Service (camelCase) → Sequelize (camelCase)
                                                                        ↓
                                                            DB (snake_case automático)
                                                            via underscored: true
```

### Cómo funciona Sequelize `underscored: true`
Todos los modelos tienen `underscored: true` en sus opciones. Esto hace que Sequelize mapee automáticamente:

```javascript
// En el modelo definimos en camelCase:
organizationId: { type: DataTypes.UUID }
// Sequelize mapea a columna DB: organization_id

// En queries escribimos camelCase:
User.findAll({ where: { organizationId: '...' }, order: [['createdAt', 'DESC']] });
// Sequelize genera SQL: WHERE organization_id = '...' ORDER BY created_at DESC

// Acceso a instancias en camelCase:
const name = user.firstName;  // Sequelize lee de columna first_name
```

### Reglas por capa

| Capa | Convención | Ejemplo |
|------|-----------|---------|
| **DTOs (Zod)** | Keys camelCase | `firstName: z.string()` |
| **Serializers** | Output keys + instance access camelCase | `{ isActive: org.isActive }` |
| **Services** | Variables y propiedades camelCase | `const { organizationId } = data` |
| **Repositories** | Queries Sequelize camelCase | `where: { publicCode }` |
| **Routes** | req.body destructuring camelCase | `const { firstName } = req.body` |
| **Modelos** | Propiedades camelCase | `organizationId`, `publicCode` |

### Cuidado con `raw: true`
Cuando se usa `raw: true` en Sequelize, los resultados vienen con nombres de columna DB (snake_case):

```javascript
// Con raw: true, acceder en snake_case (son columnas DB directas)
const [results] = await sequelize.query('SELECT organization_id FROM users', { raw: true });
results[0].organization_id;  // CORRECTO
results[0].organizationId;   // INCORRECTO - undefined

// Sin raw: true (default), acceder en camelCase (Sequelize mapea)
const user = await User.findByPk(id);
user.organizationId;  // CORRECTO
```

## Endpoints de Datos CORE — Requerimientos para Paneles Admin

**Regla obligatoria**: Todo endpoint que exponga datos de catálogo o datos core con traducciones DEBE soportar el query param `with_translations=true` desde el primer día de implementación.

**El problema que evita**: Sin este param, el frontend de administración necesita hacer 2 requests en paralelo (`?lang=es` y `?lang=en`) y mergear los resultados por ID para reconstruir el objeto de traducciones. Esto duplica el tráfico y complica el código del front.

**Patrón canónico** (seguir siempre):

```
Controller → Service → Repository
- Controller: lee `req.query.with_translations === 'true'`, pasa como `withTranslations` al service
- Service: recibe `withTranslations`, pasa al repo, mapea con `toDTO` o `toDTOWithTranslations` según el flag
- Repository: cuando `withTranslations=true`, incluye TODAS las traducciones (sin filtrar por `lang`)
```

**Comportamiento esperado**:
- `with_translations=false` (default): respuesta normal con `name` y `description` en el idioma solicitado
- `with_translations=true`: respuesta incluye campo `translations: { es: { name, description }, en: { name, description } }`

**Aplica a**: cualquier endpoint de listado (`GET /catalogo`) que tenga tabla de traducciones asociada. No aplica a endpoints sin i18n.

**Módulos que ya implementan esto**:
- `GET /api/v1/telemetry/variables?with_translations=true`
- `GET /api/v1/devices/types?with_translations=true`
- `GET /api/v1/devices/brands?with_translations=true`
- `GET /api/v1/devices/models?with_translations=true`
- `GET /api/v1/devices/servers?with_translations=true`
- `GET /api/v1/devices/networks?with_translations=true`
- `GET /api/v1/devices/licenses?with_translations=true`
- `GET /api/v1/devices/validity-periods?with_translations=true`

---

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
10. [ ] Si tiene traducciones: soportar `with_translations=true` en los endpoints de listado (ver sección "Endpoints de Datos CORE" más arriba)
