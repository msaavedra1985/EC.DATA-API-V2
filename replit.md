# EC.DATA API

REST API Node.js/Express multi-tenant para plataformas e-commerce. Integra con frontends Next.js via BFF pattern.

## Directivas de Consulta

| Situación | Archivo a consultar |
|-----------|---------------------|
| **ANTES de escribir código** | `agent-docs/rules.md` |
| **ANTES de debuggear** | `agent-docs/learnings.md` |
| **Al crear módulos/archivos** | `agent-docs/conventions.md` |
| **Al diseñar features** | `agent-docs/architecture.md` |
| **Al agregar dependencias** | `agent-docs/tech-stack.md` |
| **Al encontrar términos desconocidos** | `agent-docs/glosario.md` |
| **Para entender qué existe** | `agent-docs/modules.md` |
| **Al implementar nuevas features** | `agent-docs/nodejs-best-practices.md` |
| **Al modificar/consultar endpoints** | `agent-docs/endpoints/{modulo}.md` |
| **Al trabajar con la base de datos** | `agent-docs/database.dbml.txt` |
| **Al agregar keys Redis** | `agent-docs/redis-glossary.md` |
| **Para ver tareas pendientes** | `agent-docs/backlog.md` |
| **Al migrar datos de plataforma legacy** | `agent-docs/platform-migration-guide.md` |
| **Al migrar devices/channels (detalle campos)** | `agent-docs/migration-guide.md` |
| **Al hacer deploy en Azure** | `agent-docs/deployment-azure.md` |

## Índice de Documentación

```
agent-docs/
├── rules.md              # Reglas OBLIGATORIAS (security, audit, code style)
├── conventions.md        # Patrones del proyecto (estructura, imports, migrations)
├── architecture.md       # Arquitectura (capas, flujos, servicios)
├── tech-stack.md         # Dependencias y versiones
├── modules.md            # Módulos implementados y endpoints
├── glosario.md           # Términos de dominio (public_code, session_context, etc.)
├── learnings.md          # Errores resueltos y gotchas
├── backlog.md            # Tareas pendientes por módulo
├── migration-guide.md    # Guía de migración: mapeo de campos devices/channels (Sirenis)
├── platform-migration-guide.md  # Plan maestro de migración: todas las tablas, patrón canónico, extensible
├── deployment-azure.md   # Guía de deployment en Azure (flujos, gotchas, checklist)
├── nodejs-best-practices.md  # Mejores prácticas Node.js API
├── database.dbml.txt     # Schema de DB en formato DBML (actualizar con npm run db:dbml)
├── redis-glossary.md     # Inventario completo de keys Redis (obligatorio actualizar al agregar keys)
└── endpoints/            # Documentación detallada de endpoints
    ├── _template.md      # Template para nuevos módulos
    ├── auth.md           # Autenticación (login, refresh, session)
    ├── users.md          # CRUD usuarios
    ├── organizations.md  # CRUD organizaciones
    ├── sites.md          # CRUD sitios
    ├── devices.md        # CRUD dispositivos
    ├── channels.md       # CRUD canales
    ├── files.md          # Upload/download archivos
    ├── telemetry.md      # Series temporales
    ├── resource-hierarchy.md  # Árbol de recursos
    ├── error-logs.md     # Logging de errores (público)
    ├── asset-categories.md  # Tags jerárquicos para canales
    ├── dashboards.md     # Dashboards multi-página, widgets (con dataSources inline), grupos, colaboradores
    └── device-metadata.md  # Catálogos core: types, brands, models, servers, networks, licenses, validity-periods
```

## Reglas Críticas (Resumen)

1. **NUNCA exponer UUIDs** en respuestas API → usar `public_code` exclusivamente
2. **SIEMPRE audit logging** en operaciones CUD → usar helper `auditLog`
3. **Máximo 1000 líneas** por archivo → dividir si se excede
4. **Comentarios en español**, código en inglés
5. **"What works, don't touch"** → análisis de impacto antes de modificar código funcional
6. **Actualizar docs de endpoints** al modificarlos → `agent-docs/endpoints/{modulo}.md`
7. **camelCase end-to-end**: Todo el código JS usa camelCase (modelos, DTOs, serializers, services, repos, routes). Sequelize `underscored: true` mapea automáticamente a columnas snake_case en la DB. El middleware caseTransform fue eliminado — el frontend envía/recibe camelCase directo.
8. **Excepciones snake_case**: Nombres de tabla, valores ENUM, i18n keys, raw SQL queries, y acceso a resultados de `raw: true` queries mantienen snake_case (son columnas DB directas).

## Exports (mantener actualizados)

```
exports/
├── EC.DATA API.postman_collection.json  # Colección Postman con todos los endpoints + params
└── database.dbml.txt                    # Schema DB en formato DBML
```

**Regla**: Al modificar endpoints (agregar, cambiar params, cambiar body) o schema de DB, actualizar los archivos correspondientes en `exports/`. El DBML se regenera con `npm run db:dbml` y debe copiarse a `exports/`. La colección Postman debe actualizarse manualmente.

## Quick Start

```bash
npm run dev              # Desarrollo con watch
npm run db:setup         # Fresh DB vacía: crea tablas + registra migraciones históricas
npm run db:migrate       # Re-deploy: aplica solo migraciones nuevas
npm run db:seed:core     # Poblar datos base (roles, países, tipos)
npm run db:seed          # Poblar datos iniciales de la organización
npm run db:dbml          # Generar visualización schema
```

## Preferencias de Comunicación

- Lenguaje simple y cotidiano
- Explicar decisiones arquitectónicas claramente
- Proponer soluciones prácticas para integración con Next.js
