# Agent Documentation

Esta carpeta contiene la documentación interna del proyecto **ecdata-api**, creada y mantenida por el equipo de desarrollo y agentes de IA.

## Estructura

```
agent-docs/
├── endpoints/
│   ├── schedules.md          # Motor de horarios (schedules, validities, timeProfiles, exceptions)
│   ├── sites.md              # Locaciones físicas (sites)
│   ├── channels.md           # Canales de medición (devices, measurements)
│   ├── devices.md            # Dispositivos
│   ├── resource-hierarchy.md # Jerarquía de recursos (nodos)
│   ├── organizations.md      # Organizaciones
│   ├── auth.md               # Autenticación y autorización
│   └── [others].md           # Otros módulos
├── database/
│   ├── schema.md             # Esquema de base de datos
│   ├── migrations.md         # Migraciones aplicadas
│   └── indexes.md            # Índices de BD
├── architecture/
│   ├── modules.md            # Estructura de módulos
│   ├── middleware.md         # Middlewares del proyecto
│   └── conventions.md        # Convenciones de código
└── guides/
    ├── setup.md              # Configuración local
    └── development.md        # Guía de desarrollo
```

## Propósito

- **Referencia rápida** para endpoints, parámetros, respuestas, errores
- **Documentación actualizada** sincronizada con cambios en el código
- **Base para generación automática** de Postman, OpenAPI specs, etc.

## Convenciones

### Endpoints
- Todos los query params en **snake_case** (URL)
- Body params en **camelCase** (JSON)
- Responses en **camelCase** (JSON)
- Timestamps siempre en ISO 8601 (UTC)

### Actualización
- Cada archivo menciona "Última actualización: YYYY-MM-DD" al inicio
- Se actualiza al modificar endpoint, parámetros, errores, response shapes
- Los commits deben referenciar el archivo si cambia la API

## Archivos de Referencia

### agent-docs/endpoints/schedules.md
**Motor de horarios** con soporte multi-vigencia:
- GET `/api/v1/schedules` - listar
- GET `/api/v1/schedules/:id` - detalle completo
- POST `/api/v1/schedules` - crear
- PATCH `/api/v1/schedules/:id/validities/:validityId` - actualizar vigencia (con opción nextValidity atómica)

**Conceptos clave**:
- Una Schedule tiene múltiples Validities (períodos de validez)
- Cada Validity tiene timeProfiles (definición de rangos horarios)
- Cada Validity tiene exceptions (feriados, días especiales)
- Metrics: rangesCount, exceptionsCount, weekCoveragePercent calculados automáticamente

### agent-docs/endpoints/sites.md
**Locaciones físicas** de la organización:
- GET `/api/v1/sites` - listar con filtros
- GET `/api/v1/sites/:id` - detalle
- POST `/api/v1/sites` - crear (organizationId condicional según contexto)
- PUT `/api/v1/sites/:id` - actualizar
- DELETE `/api/v1/sites/:id` - soft delete

**Resolución de organizationId** (POST):
- System-admin global: organizationId **requerido** en body
- System-admin impersonando: organizationId del body se **ignora** (usa contexto)
- Org-admin o usuario con org activa: organizationId **opcional**

## Uso

1. **Consultar un endpoint**: `grep -r "POST /api/v1" agent-docs/endpoints/`
2. **Buscar error específico**: `grep -r "VALIDATION_ERROR" agent-docs/`
3. **Actualizar documentación**: Editar el archivo `.md` relevante y commitear
4. **Sincronizar con código**: Si cambias un endpoint en `src/`, actualiza `agent-docs/`

## Mantenimiento

- **Agentes/Desarrolladores**: Actualizar `agent-docs/` cuando modifiquen endpoints
- **Code reviews**: Verificar que cambios de API tengan doc actualizada
- **Auto-sync**: Futuros scripts pueden generar OpenAPI spec desde estos `.md` files

---

*Última actualización: 2026-03-25*
