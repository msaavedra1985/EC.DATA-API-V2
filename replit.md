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
| **Para ver tareas pendientes** | `agent-docs/backlog.md` |
| **Al migrar datos de plataforma legacy** | `agent-docs/migration-guide.md` |

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
├── migration-guide.md    # Guía de migración legacy SQL Server → PostgreSQL
├── nodejs-best-practices.md  # Mejores prácticas Node.js API
├── database.dbml.txt     # Schema de DB en formato DBML (actualizar con npm run db:dbml)
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
    └── dashboards.md     # Dashboards multi-página, widgets, grupos, colaboradores
```

## Reglas Críticas (Resumen)

1. **NUNCA exponer UUIDs** en respuestas API → usar `public_code` exclusivamente
2. **SIEMPRE audit logging** en operaciones CUD → usar helper `auditLog`
3. **Máximo 1000 líneas** por archivo → dividir si se excede
4. **Comentarios en español**, código en inglés
5. **"What works, don't touch"** → análisis de impacto antes de modificar código funcional
6. **Actualizar docs de endpoints** al modificarlos → `agent-docs/endpoints/{modulo}.md`
7. **Case transform bidireccional**: DB=snake_case, API=camelCase (automático via middleware)

## Quick Start

```bash
npm run dev              # Desarrollo con watch
npm run db:migrate       # Ejecutar migraciones
npm run db:dbml          # Generar visualización schema
```

## Preferencias de Comunicación

- Lenguaje simple y cotidiano
- Explicar decisiones arquitectónicas claramente
- Proponer soluciones prácticas para integración con Next.js
