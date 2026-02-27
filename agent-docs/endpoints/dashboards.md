# Dashboards Endpoints

> **Última actualización**: 2026-02-26
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint del módulo.

## Convenciones importantes

- **Todos los JSON usan camelCase** (request y response)
- **`id` en responses de Dashboard/Group** = publicCode string (ej: `DSH-XXXXX-X`)
- **`id` en responses de Page/Widget/DataSource** = orderNumber integer (ej: `1`, `2`, `3`)
- **`pageId` y `widgetId` en URLs** son integers (orderNumber), no UUIDs
- **Al crear un dashboard**, se crea automáticamente la página 1 con `name: null`
- **Layout usa formato GridStack JS**: `{ x, y, w, h, minW?, minH?, maxW?, maxH? }`
- **Widget `type` es string libre**: El frontend define los nombres (regex: `/^[a-zA-Z][a-zA-Z0-9_]*$/`). No hay enum fijo en el backend.

## Resumen

### Dashboards
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/dashboards/widget-types` | Conteo de uso de tipos de widget por organización |
| GET | `/api/v1/dashboards` | Listar dashboards |
| GET | `/api/v1/dashboards/:id` | Obtener dashboard por publicCode |
| POST | `/api/v1/dashboards` | Crear dashboard (crea página 1 automáticamente) |
| PATCH | `/api/v1/dashboards/:id` | Actualizar dashboard |
| DELETE | `/api/v1/dashboards/:id` | Eliminar dashboard (soft delete) |
| PUT | `/api/v1/dashboards/:id/home` | Marcar dashboard como home |

### Pages
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/dashboards/:dashboardId/pages` | Listar páginas de un dashboard |
| POST | `/api/v1/dashboards/:dashboardId/pages` | Crear página |
| PATCH | `/api/v1/dashboards/:dashboardId/pages/:pageId` | Actualizar página (pageId = orderNumber integer) |
| PATCH | `/api/v1/dashboards/:dashboardId/pages/:pageId/layouts` | Batch update de layouts de widgets (GridStack) |
| DELETE | `/api/v1/dashboards/:dashboardId/pages/:pageId` | Eliminar página |

### Widgets
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/dashboards/:dashboardId/pages/:pageId/widgets` | Crear widget (con dataSources inline) |
| PATCH | `/api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId` | Actualizar widget (widgetId = orderNumber integer) |
| DELETE | `/api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId` | Eliminar widget |
| POST | `/api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId/data` | Obtener datos de telemetría del widget |

### Widget Data Sources (operaciones individuales)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/dashboards/widgets/:widgetId/data-sources` | Crear fuente de datos individual |
| PATCH | `/api/v1/dashboards/widgets/:widgetId/data-sources/:dataSourceId` | Actualizar fuente de datos |
| DELETE | `/api/v1/dashboards/widgets/:widgetId/data-sources/:dataSourceId` | Eliminar fuente de datos |

> **Nota**: Los endpoints individuales de data sources se mantienen por retrocompatibilidad, pero el flujo recomendado es usar `dataSources` inline al crear/actualizar widgets.

### Dashboard Collaborators
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/dashboards/:id/collaborators` | Listar colaboradores |
| POST | `/api/v1/dashboards/:id/collaborators` | Agregar colaborador |
| PATCH | `/api/v1/dashboards/:id/collaborators/:collaboratorId` | Actualizar rol |
| DELETE | `/api/v1/dashboards/:id/collaborators/:collaboratorId` | Eliminar colaborador |

### Dashboard Groups
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/dashboard-groups` | Listar grupos |
| GET | `/api/v1/dashboard-groups/:id` | Obtener grupo |
| POST | `/api/v1/dashboard-groups` | Crear grupo |
| PATCH | `/api/v1/dashboard-groups/:id` | Actualizar grupo |
| DELETE | `/api/v1/dashboard-groups/:id` | Eliminar grupo (soft delete) |

### Group Items
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/dashboard-groups/:groupId/dashboards` | Agregar dashboard al grupo |
| DELETE | `/api/v1/dashboard-groups/:groupId/dashboards/:dashboardId` | Remover dashboard |

### Group Collaborators
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/dashboard-groups/:id/collaborators` | Listar colaboradores del grupo |
| POST | `/api/v1/dashboard-groups/:id/collaborators` | Agregar colaborador |
| PATCH | `/api/v1/dashboard-groups/:id/collaborators/:collaboratorId` | Actualizar rol |
| DELETE | `/api/v1/dashboard-groups/:id/collaborators/:collaboratorId` | Eliminar colaborador |

### WebSocket Realtime
| Mensaje | Dirección | Descripción |
|---------|-----------|-------------|
| `EC:DASHBOARD:{id}:SUBSCRIBE` | Client → Server | Suscribirse a datos realtime de un dashboard |
| `EC:DASHBOARD:{id}:SUBSCRIBED` | Server → Client | Confirmación con metadata de channels/variables |
| `EC:DASHBOARD:{id}:SNAPSHOT` | Server → Client | Últimos valores conocidos (cache Redis, al suscribirse) |
| `EC:DASHBOARD:{id}:DATA` | Server → Client | Datos MQTT filtrados y agrupados por channel |
| `EC:DASHBOARD:{id}:UNSUBSCRIBE` | Client → Server | Desuscribirse |
| `EC:DASHBOARD:{id}:UNSUBSCRIBED` | Server → Client | Confirmación de desuscripción |
| `EC:DASHBOARD:{id}:IDLE_TIMEOUT` | Server → Client | Suscripción auto-removida por inactividad |
| `EC:DASHBOARD:ERROR` | Server → Client | Error en operación |

---

## WIDGET TYPE ANALYTICS

### GET /api/v1/dashboards/widget-types

**Propósito**: Obtener conteo de uso de cada tipo de widget en la organización activa

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    { "type": "line_chart", "count": 12 },
    { "type": "stat_card", "count": 8 },
    { "type": "energy_gauge", "count": 5 },
    { "type": "bar_chart", "count": 3 }
  ]
}
```

**Notas**:
- Ordenado por count descendente (más usado primero)
- Solo cuenta widgets de dashboards activos (no eliminados)
- Filtrado por la organización activa del usuario
- Audit log: No (solo lectura)

---

## DASHBOARDS

### GET /api/v1/dashboards

**Propósito**: Listar dashboards de la organización con paginación y filtros

**Autenticación**: Bearer JWT

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| limit | number | 20 | Máximo de resultados (1-100) |
| offset | number | 0 | Offset para paginación |
| page | number | - | Alternativa a offset (calcula offset automáticamente) |
| search | string | - | Filtrar por nombre o descripción |
| isPublic | boolean | - | Filtrar por visibilidad |
| includeWidgets | boolean | false | Si true, incluye pages/widgets/dataSources anidados |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "DSH-XXXXX-X",
      "name": "Dashboard Energía",
      "description": "Monitor de consumo energético",
      "icon": "chart-bar",
      "size": "HD",
      "positioning": "AUTO",
      "customWidth": null,
      "customHeight": null,
      "isHome": false,
      "isPublic": false,
      "isActive": true,
      "settings": { "forceK": true },
      "pageCount": 2,
      "widgetCount": 8,
      "owner": {
        "id": "USR-XXXXX-X",
        "email": "admin@hotel.com",
        "firstName": "Admin",
        "lastName": "Hotel"
      },
      "organization": {
        "id": "ORG-XXXXX-X",
        "slug": "hotel-lima",
        "name": "Hotel Lima",
        "logoUrl": "https://..."
      },
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-02-13T15:45:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "limit": 20,
    "offset": 0
  }
}
```

**Notas**:
- Con `includeWidgets=true`, cada dashboard incluye `pages[]` → `widgets[]` → `dataSources[]`
- Sin `includeWidgets`, usa el serializer ligero (sin pages/widgets, con contadores)

---

### GET /api/v1/dashboards/:id

**Propósito**: Obtener un dashboard con todas sus relaciones (pages, widgets, dataSources, collaborators)

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del dashboard (ej: `DSH-XXXXX-X`) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "id": "DSH-XXXXX-X",
    "name": "Dashboard Energía",
    "description": "Monitor de consumo energético",
    "icon": "chart-bar",
    "size": "HD",
    "positioning": "AUTO",
    "customWidth": null,
    "customHeight": null,
    "isHome": true,
    "isPublic": false,
    "isActive": true,
    "settings": { "forceK": true },
    "pageCount": 2,
    "widgetCount": 5,
    "owner": {
      "id": "USR-XXXXX-X",
      "email": "admin@hotel.com",
      "firstName": "Admin",
      "lastName": "Hotel"
    },
    "organization": {
      "id": "ORG-XXXXX-X",
      "slug": "hotel-lima",
      "name": "Hotel Lima",
      "logoUrl": "https://..."
    },
    "pages": [
      {
        "id": 1,
        "name": null,
        "orderIndex": 0,
        "widgets": [
          {
            "id": 1,
            "type": "line_chart",
            "title": "Consumo kWh",
            "layout": { "x": 0, "y": 0, "w": 6, "h": 4 },
            "styleConfig": { "color": "#1f77b4", "showLegend": true },
            "dataConfig": { "timeRange": "24h", "aggregation": "avg" },
            "orderIndex": 0,
            "dataSources": [
              {
                "id": 1,
                "entityType": "channel",
                "entityId": "CHN-AAAAA-A",
                "label": "Medidor Principal",
                "seriesConfig": { "color": "#ff0000", "yAxis": "left" },
                "orderIndex": 0,
                "createdAt": "2026-02-13T15:45:00Z"
              }
            ],
            "createdAt": "2026-02-13T15:45:00Z",
            "updatedAt": "2026-02-13T15:45:00Z"
          }
        ],
        "createdAt": "2026-01-15T10:30:00Z",
        "updatedAt": "2026-01-15T10:30:00Z"
      }
    ],
    "collaborators": [
      {
        "id": "uuid-collab",
        "role": "viewer",
        "user": {
          "id": "USR-YYYYY-Y",
          "email": "viewer@hotel.com",
          "firstName": "Juan",
          "lastName": "García"
        },
        "createdAt": "2026-02-01T12:00:00Z"
      }
    ],
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-02-13T15:45:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | DASHBOARD_NOT_FOUND | Dashboard no encontrado |
| 403 | FORBIDDEN | Sin permisos para acceder |

---

### POST /api/v1/dashboards

**Propósito**: Crear nuevo dashboard. Crea automáticamente la página 1 con `name: null`.

**Autenticación**: Bearer JWT (requiere rol: system-admin, org-admin)

**Body** (JSON):
```json
{
  "name": "Dashboard Operacional",
  "description": "Monitor de operaciones en tiempo real",
  "icon": "monitor",
  "isPublic": false,
  "size": "HD",
  "positioning": "AUTO",
  "settings": { "forceK": true }
}
```

**Campos**:
| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| name | string | Sí | - | Nombre del dashboard (max 200 chars) |
| description | string | No | - | Descripción |
| icon | string | No | - | Icono (max 50 chars) |
| isPublic | boolean | No | false | Si es público |
| size | enum | No | "FREE" | Resolución: `FREE`, `HD`, `VERTICAL`, `CUSTOM` |
| positioning | enum | No | "AUTO" | Posicionamiento: `AUTO` (grid), `FLOAT` (libre) |
| customWidth | number | Condicional | null | Ancho px (800-3840). Requerido si `size=CUSTOM` |
| customHeight | number | Condicional | null | Alto px (600-2160). Requerido si `size=CUSTOM` |
| settings | object | No | {} | `{ forceK: bool, backgroundImage: url\|null }` |
| templateId | string | No | null | Public code de template |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": "DSH-YYYYY-Y",
    "name": "Dashboard Operacional",
    "description": "Monitor de operaciones en tiempo real",
    "icon": "monitor",
    "size": "HD",
    "positioning": "AUTO",
    "customWidth": null,
    "customHeight": null,
    "isHome": false,
    "isPublic": false,
    "isActive": true,
    "settings": { "forceK": true },
    "pageCount": 1,
    "widgetCount": 0,
    "pages": [
      {
        "id": 1,
        "name": null,
        "orderIndex": 0,
        "widgets": [],
        "createdAt": "2026-02-25T10:00:00Z",
        "updatedAt": "2026-02-25T10:00:00Z"
      }
    ],
    "collaborators": [],
    "owner": { "..." },
    "organization": { "..." },
    "createdAt": "2026-02-25T10:00:00Z"
  }
}
```

**Notas**:
- Audit log: Sí (CREATE)
- La página 1 se crea con `name: null`. Si solo hay 1 página, el frontend no necesita mostrar el navegador de páginas
- Genera publicCode automáticamente (DSH-XXXXX-X)

---

### PATCH /api/v1/dashboards/:id

**Propósito**: Actualizar un dashboard existente

**Autenticación**: Bearer JWT (requiere ser owner o editor)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del dashboard |

**Body** (JSON) - todos los campos opcionales:
```json
{
  "name": "Dashboard Ventas Actualizado",
  "isPublic": true,
  "size": "CUSTOM",
  "positioning": "FLOAT",
  "customWidth": 1600,
  "customHeight": 900,
  "settings": { "forceK": false, "backgroundImage": "https://example.com/bg.jpg" }
}
```

**Notas**:
- Audit log: Sí (UPDATE con changes)
- Solo enviar campos a modificar

---

### DELETE /api/v1/dashboards/:id

**Propósito**: Eliminar dashboard (soft delete)

**Autenticación**: Bearer JWT (requiere ser owner o admin)

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": { "message": "Dashboard eliminado exitosamente" }
}
```

**Notas**:
- Audit log: Sí (DELETE)
- Soft delete: marca `deletedAt`

---

### PUT /api/v1/dashboards/:id/home

**Propósito**: Marcar dashboard como "home" del usuario en la organización activa

**Autenticación**: Bearer JWT

**Notas**:
- Solo puede haber 1 home por usuario+organización
- Al marcar uno, se desmarca cualquier otro

---

## PAGES

### GET /api/v1/dashboards/:dashboardId/pages

**Propósito**: Listar páginas de un dashboard con sus widgets y dataSources

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| dashboardId | string | Public code del dashboard |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "name": null,
      "orderIndex": 0,
      "widgets": [
        {
          "id": 1,
          "type": "stat_card",
          "title": "Total Consumo",
          "layout": { "x": 0, "y": 0, "w": 3, "h": 2 },
          "dataSources": [ "..." ],
          "createdAt": "2026-02-25T10:00:00Z",
          "updatedAt": "2026-02-25T10:00:00Z"
        }
      ],
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "name": "Detalle por zona",
      "orderIndex": 1,
      "widgets": [],
      "createdAt": "2026-02-25T11:00:00Z",
      "updatedAt": "2026-02-25T11:00:00Z"
    }
  ]
}
```

**Notas**:
- `id` es un integer (orderNumber), no un UUID
- `name: null` indica que es la página por defecto (el frontend puede omitir el navegador si hay solo 1 página)

---

### POST /api/v1/dashboards/:dashboardId/pages

**Propósito**: Crear nueva página en un dashboard

**Body** (JSON):
```json
{
  "name": "Análisis por zona",
  "orderIndex": 1
}
```

**Campos**:
| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| name | string | No | null | Nombre de la pestaña (max 200 chars). null = sin nombre |
| orderIndex | number | No | 0 | Orden de la pestaña |

**Respuesta exitosa** (201): Misma estructura que el GET de una página.

**Notas**:
- Audit log: Sí (CREATE)
- El `id` retornado es el orderNumber (integer auto-incremental dentro del dashboard)

---

### PATCH /api/v1/dashboards/:dashboardId/pages/:pageId

**Propósito**: Actualizar página

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| dashboardId | string | Public code del dashboard |
| pageId | integer | orderNumber de la página (1, 2, 3...) |

**Body** (JSON) - todos opcionales:
```json
{
  "name": "Análisis Actualizado",
  "orderIndex": 1
}
```

---

### PATCH /api/v1/dashboards/:dashboardId/pages/:pageId/layouts

**Propósito**: Actualizar en batch las posiciones y tamaños de widgets dentro de una grilla GridStack. Diseñado para cuando mover/redimensionar un widget afecta a otros.

**Permisos**: `editor` sobre el dashboard (owner o collaborator con rol editor)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| dashboardId | string | Public code del dashboard |
| pageId | integer | orderNumber de la página (1, 2, 3...) |

**Body** (JSON):
```json
{
  "widgets": [
    { "widgetId": 1, "layout": { "x": 60, "y": 0, "w": 60, "h": 320 } },
    { "widgetId": 2, "layout": { "x": 0, "y": 0, "w": 60, "h": 320 } }
  ]
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| widgets | array | Sí | Array de 1-50 widgets a actualizar |
| widgets[].widgetId | integer | Sí | orderNumber del widget (≥1) |
| widgets[].layout | object | Sí | Nuevo layout GridStack |
| widgets[].layout.x | integer | Sí | Posición X (≥0) |
| widgets[].layout.y | integer | Sí | Posición Y (≥0) |
| widgets[].layout.w | integer | Sí | Ancho (≥1) |
| widgets[].layout.h | integer | Sí | Alto (≥1) |

**Validaciones**:
- No se permiten `widgetId` duplicados en el array
- Todos los `widgetId` deben pertenecer a la página indicada
- Solo actualiza el campo `layout` — no toca `styleConfig`, `dataConfig`, ni `dataSources`
- Se ejecuta en una transacción SQL (todo o nada)

**Response (200)**:
```json
{
  "ok": true,
  "data": {
    "updated": 2,
    "widgets": [
      { "id": 1, "layout": { "x": 60, "y": 0, "w": 60, "h": 320 } },
      { "id": 2, "layout": { "x": 0, "y": 0, "w": 60, "h": 320 } }
    ]
  }
}
```

**Errores posibles**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | WIDGETS_NOT_FOUND | Uno o más widgetId no pertenecen a la página |
| 400 | VALIDATION_ERROR | Body inválido (duplicados, layout inválido, etc.) |
| 403 | FORBIDDEN | Sin permisos de editor |
| 404 | DASHBOARD_NOT_FOUND | Dashboard no encontrado |
| 404 | PAGE_NOT_FOUND | Página no encontrada |

**Tip frontend**: Solo incluir widgets cuyo layout realmente cambió, para minimizar payload.

---

### DELETE /api/v1/dashboards/:dashboardId/pages/:pageId

**Propósito**: Eliminar página y todos sus widgets

**Path Parameters**: Igual que PATCH

---

## WIDGETS

### POST /api/v1/dashboards/:dashboardId/pages/:pageId/widgets

**Propósito**: Crear widget en una página, opcionalmente con data sources inline

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| dashboardId | string | Public code del dashboard |
| pageId | integer | orderNumber de la página |

**Body** (JSON):
```json
{
  "type": "line_chart",
  "title": "Consumo Energético 24h",
  "layout": {
    "x": 0,
    "y": 0,
    "w": 6,
    "h": 4,
    "minW": 3,
    "minH": 2
  },
  "styleConfig": {
    "showLegend": true,
    "showGrid": true,
    "colors": ["#1f77b4", "#ff7f0e"]
  },
  "dataConfig": {
    "timeRange": "24h",
    "aggregation": "avg",
    "refreshInterval": 60
  },
  "dataSources": [
    {
      "entityType": "channel",
      "entityId": "CHN-AAAAA-A",
      "label": "Medidor Lobby",
      "seriesConfig": { "color": "#1f77b4", "yAxis": "left" }
    },
    {
      "entityType": "channel",
      "entityId": "CHN-BBBBB-B",
      "label": "Medidor Piscina",
      "seriesConfig": { "color": "#ff7f0e", "yAxis": "left" }
    }
  ]
}
```

**Campos**:
| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| type | enum | Sí | - | Tipo de widget (ver tabla abajo) |
| title | string | No | null | Título visible (max 200 chars) |
| layout | object | No | `{x:0, y:0, w:4, h:2}` | Posición y tamaño GridStack |
| styleConfig | object | No | {} | Configuración visual |
| dataConfig | object | No | {} | Configuración de datos |
| orderIndex | number | No | 0 | Orden para renderizado mobile |
| dataSources | array | No | [] | Data sources inline (max 20) |

**Layout GridStack**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| x | integer | Sí | Columna (0-based) |
| y | integer | Sí | Fila (0-based) |
| w | integer | Sí | Ancho en columnas (min 1) |
| h | integer | Sí | Alto en filas (min 1) |
| minW | integer | No | Ancho mínimo al redimensionar |
| minH | integer | No | Alto mínimo al redimensionar |
| maxW | integer | No | Ancho máximo al redimensionar |
| maxH | integer | No | Alto máximo al redimensionar |

**Cada dataSource inline**:
| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| entityType | enum | Sí | - | `channel`, `device`, `site`, `resource_hierarchy` |
| entityId | string | Sí | - | Public code de la entidad (ej: `CHN-XXXXX-X`) |
| label | string | No | null | Etiqueta para esta serie (max 200 chars) |
| seriesConfig | object | No | {} | Config de la serie: color, eje Y, etc. |

> **Nota**: El `orderIndex` de cada dataSource se calcula automáticamente por su posición en el array (0, 1, 2...). No es necesario enviarlo.

**Widget `type`**: String libre definido por el frontend. Debe cumplir el regex `/^[a-zA-Z][a-zA-Z0-9_]*$/` (alfanumérico con underscores, max 50 chars). Ejemplos: `ENERGY_BY_CHANNEL`, `line_chart`, `CUSTOM_KPI_CARD`. Para ver qué tipos están en uso, consultar `GET /api/v1/dashboards/widget-types`.

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "type": "line_chart",
    "title": "Consumo Energético 24h",
    "layout": { "x": 0, "y": 0, "w": 6, "h": 4, "minW": 3, "minH": 2 },
    "styleConfig": { "showLegend": true, "showGrid": true, "colors": ["#1f77b4", "#ff7f0e"] },
    "dataConfig": { "timeRange": "24h", "aggregation": "avg", "refreshInterval": 60 },
    "orderIndex": 0,
    "dataSources": [
      {
        "id": 1,
        "entityType": "channel",
        "entityId": "CHN-AAAAA-A",
        "label": "Medidor Lobby",
        "seriesConfig": { "color": "#1f77b4", "yAxis": "left" },
        "orderIndex": 0,
        "createdAt": "2026-02-25T10:00:00Z"
      },
      {
        "id": 2,
        "entityType": "channel",
        "entityId": "CHN-BBBBB-B",
        "label": "Medidor Piscina",
        "seriesConfig": { "color": "#ff7f0e", "yAxis": "left" },
        "orderIndex": 1,
        "createdAt": "2026-02-25T10:00:00Z"
      }
    ],
    "createdAt": "2026-02-25T10:00:00Z",
    "updatedAt": "2026-02-25T10:00:00Z"
  }
}
```

**Notas**:
- Audit log: Sí (CREATE)
- Widget + dataSources se crean en una sola transacción
- `id` del widget es integer (orderNumber dentro de la página)
- `id` de cada dataSource es integer (orderNumber dentro del widget)

---

### PATCH /api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId

**Propósito**: Actualizar widget. Si se envía `dataSources`, reemplaza **todos** los data sources existentes.

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| dashboardId | string | Public code del dashboard |
| pageId | integer | orderNumber de la página |
| widgetId | integer | orderNumber del widget |

**Body** (JSON) - todos opcionales:
```json
{
  "title": "Consumo Actualizado",
  "layout": { "x": 0, "y": 0, "w": 8, "h": 5 },
  "styleConfig": { "showLegend": false },
  "dataSources": [
    {
      "entityType": "channel",
      "entityId": "CHN-CCCCC-C",
      "label": "Medidor Nuevo",
      "seriesConfig": { "color": "#2ca02c" }
    }
  ]
}
```

**Comportamiento de `dataSources`**:
- Si **no se envía** `dataSources`: los data sources existentes no se tocan
- Si se envía `dataSources: []` (array vacío): se **eliminan todos** los data sources
- Si se envía `dataSources: [...]` (con items): se **reemplazan todos** (delete + create)
- Es un patrón "replace all", no merge

**Notas**:
- Audit log: Sí (UPDATE con changes)
- Solo enviar campos a modificar
- El reemplazo de dataSources se ejecuta en transacción

---

### DELETE /api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId

**Propósito**: Eliminar widget y todos sus data sources

**Path Parameters**: Igual que PATCH

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": { "message": "Widget eliminado exitosamente" }
}
```

---

### POST /api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId/data

**Propósito**: Obtener datos de telemetría (Cassandra) de un widget. Lee la configuración guardada del widget y consulta todos sus dataSources en paralelo. Acepta overrides opcionales en el body para pisar la configuración guardada.

**Requiere**: `viewer` (owner, colaborador viewer/editor, o dashboard público)

**Path Parameters**:
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| dashboardId | string | Public code del dashboard |
| pageId | integer | orderNumber de la página |
| widgetId | integer | orderNumber del widget |

**Body** (JSON, todos opcionales — pisan el `dataConfig` guardado en el widget):
| Campo | Tipo | Descripción |
|-------|------|-------------|
| dateRange | string | Rango temporal: `today`, `yesterday`, `last_7d`, `last_30d`, `this_week`, `this_month`, `last_month`, `this_year`, `custom` |
| from | string | Fecha inicio (YYYY-MM-DD o ISO). Requerido si dateRange=`custom` |
| to | string | Fecha fin (YYYY-MM-DD o ISO). Requerido si dateRange=`custom` |
| resolution | string | Resolución: `raw`, `1m`, `15m`, `60m`, `daily`, `monthly` |
| tz | string | Timezone IANA (ej: `America/Lima`) |
| variables | integer[] | IDs de variables a consultar |

**Resolución de date ranges**:
- `today` → hoy (en la tz del request o UTC)
- `yesterday` → ayer
- `last_7d` → últimos 7 días (hoy inclusive)
- `last_30d` → últimos 30 días (hoy inclusive)
- `this_week` → desde inicio de semana hasta hoy
- `this_month` → desde inicio del mes hasta hoy
- `last_month` → mes anterior completo
- `this_year` → desde inicio del año hasta hoy
- `custom` → usa `from` y `to` del body

**Flujo interno**:
1. Resuelve dashboard → page → widget (verificando acceso viewer)
2. Lee `widget.dataConfig` de SQL
3. Merge body overrides sobre dataConfig (overrides pisan valores guardados)
4. Resuelve dateRange a from/to concretos
5. Para cada dataSource tipo `channel`, llama `telemetryService.search()` en paralelo
6. Retorna resultados unificados por dataSource

**Request ejemplo** (body vacío = usa config guardada del widget):
```json
{}
```

**Request ejemplo** (override de dateRange):
```json
{
  "dateRange": "yesterday"
}
```

**Request ejemplo** (override custom con fechas explícitas):
```json
{
  "dateRange": "custom",
  "from": "2026-01-01",
  "to": "2026-01-31",
  "resolution": "daily"
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "widget": {
      "type": "ENERGY_BY_CHANNEL",
      "title": "Consumo por canal",
      "dataConfig": {
        "dateRange": "yesterday",
        "resolution": "60m"
      }
    },
    "resolvedDates": {
      "from": "2026-02-24",
      "to": "2026-02-24"
    },
    "series": [
      {
        "orderNumber": 1,
        "label": "Canal 1",
        "entityType": "channel",
        "entityId": "CHN-XXXXX-X",
        "success": true,
        "metadata": {
          "uuid": "device-uuid",
          "timezone": "America/Lima",
          "deviceName": "Medidor 1",
          "channelName": "Canal 1",
          "channelCh": 1,
          "resolution": "60m",
          "tableName": "60m_t_datos",
          "from": "2026-02-24T05:00:00.000Z",
          "to": "2026-02-25T04:59:59.999Z",
          "totalRecords": 24
        },
        "variables": {
          "1": { "name": "Energía Activa", "unit": "kWh", "column": "val1" }
        },
        "data": [
          { "ts": "2026-02-24T05:00:00.000Z", "values": { "1": 123.45 } }
        ]
      },
      {
        "orderNumber": 2,
        "label": "Canal 2",
        "entityType": "device",
        "entityId": "DEV-XXXXX-X",
        "success": false,
        "error": "entityType \"device\" no soportado aún — solo \"channel\" está implementado"
      }
    ]
  }
}
```

**Errores parciales**: Si un dataSource falla (canal no encontrado, Cassandra timeout, etc.), su entrada en `series` incluye `success: false` + `error` con el mensaje. Los demás dataSources se resuelven normalmente. Solo entityType `channel` está soportado actualmente.

**Errores comunes**:
| Código | Status | Mensaje |
|--------|--------|---------|
| DASHBOARD_NOT_FOUND | 404 | Dashboard no encontrado |
| FORBIDDEN | 403 | No tienes permisos para ver este dashboard |
| PAGE_NOT_FOUND | 404 | Página no encontrada |
| WIDGET_NOT_FOUND | 404 | Widget no encontrado |
| MISSING_DATE_RANGE | 400 | No se encontró dateRange en la configuración del widget ni en los overrides |

---

## WIDGET DATA SOURCES (operaciones individuales)

> **Nota**: Estos endpoints se mantienen para operaciones granulares. El flujo recomendado es usar `dataSources` inline en el create/update del widget.

### POST /api/v1/dashboards/widgets/:widgetId/data-sources

**Propósito**: Agregar un data source individual a un widget existente

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| widgetId | integer | orderNumber del widget |

**Body** (JSON):
```json
{
  "entityType": "channel",
  "entityId": "CHN-DDDDD-D",
  "label": "Canal Adicional",
  "seriesConfig": { "color": "#d62728" }
}
```

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": 3,
    "entityType": "channel",
    "entityId": "CHN-DDDDD-D",
    "label": "Canal Adicional",
    "seriesConfig": { "color": "#d62728" },
    "orderIndex": 2,
    "createdAt": "2026-02-25T10:00:00Z"
  }
}
```

---

### PATCH /api/v1/dashboards/widgets/:widgetId/data-sources/:dataSourceId

**Propósito**: Actualizar un data source

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| widgetId | integer | orderNumber del widget |
| dataSourceId | integer | orderNumber del data source |

**Body** (JSON) - todos opcionales:
```json
{
  "label": "Etiqueta actualizada",
  "seriesConfig": { "color": "#9467bd", "yAxis": "right" }
}
```

---

### DELETE /api/v1/dashboards/widgets/:widgetId/data-sources/:dataSourceId

**Propósito**: Eliminar un data source individual

---

## DASHBOARD COLLABORATORS

### GET /api/v1/dashboards/:id/collaborators

**Propósito**: Listar colaboradores de un dashboard

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid-collab",
      "role": "viewer",
      "user": {
        "id": "USR-XXXXX-X",
        "email": "viewer@hotel.com",
        "firstName": "Juan",
        "lastName": "García"
      },
      "createdAt": "2026-02-01T12:00:00Z"
    }
  ]
}
```

---

### POST /api/v1/dashboards/:id/collaborators

**Body** (JSON):
```json
{
  "userId": "USR-YYYYY-Y",
  "role": "editor"
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| userId | string | Sí | Public code del usuario |
| role | enum | Sí | `viewer` o `editor` |

---

### PATCH /api/v1/dashboards/:id/collaborators/:collaboratorId

**Body** (JSON):
```json
{ "role": "editor" }
```

---

### DELETE /api/v1/dashboards/:id/collaborators/:collaboratorId

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": { "message": "Colaborador removido exitosamente" }
}
```

---

## DASHBOARD GROUPS

### GET /api/v1/dashboard-groups

**Propósito**: Listar grupos de dashboards con paginación

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| limit | number | 20 | Máximo de resultados (1-100) |
| offset | number | 0 | Offset para paginación |
| search | string | - | Filtrar por nombre |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "DGR-XXXXX-X",
      "name": "Grupo Energía",
      "description": "Dashboards de energía y consumo",
      "isActive": true,
      "owner": {
        "id": "USR-XXXXX-X",
        "email": "admin@hotel.com",
        "firstName": "Admin",
        "lastName": "Hotel"
      },
      "organization": {
        "id": "ORG-XXXXX-X",
        "slug": "hotel-lima",
        "name": "Hotel Lima"
      },
      "createdAt": "2026-01-20T09:00:00Z",
      "updatedAt": "2026-01-20T09:00:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

---

### GET /api/v1/dashboard-groups/:id

**Propósito**: Obtener grupo con dashboards y colaboradores

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "id": "DGR-XXXXX-X",
    "name": "Grupo Energía",
    "description": "Dashboards de energía y consumo",
    "isActive": true,
    "owner": { "..." },
    "organization": { "..." },
    "dashboards": [
      {
        "id": "DSH-AAAAA-A",
        "name": "Dashboard Consumo Diario",
        "description": "...",
        "orderIndex": 0
      }
    ],
    "collaborators": [
      {
        "id": "uuid-collab",
        "role": "viewer",
        "user": {
          "id": "USR-YYYYY-Y",
          "email": "viewer@hotel.com",
          "firstName": "Juan",
          "lastName": "García"
        },
        "createdAt": "2026-02-01T12:00:00Z"
      }
    ],
    "createdAt": "2026-01-20T09:00:00Z",
    "updatedAt": "2026-01-20T09:00:00Z"
  }
}
```

---

### POST /api/v1/dashboard-groups

**Body** (JSON):
```json
{
  "name": "Grupo Operaciones",
  "description": "Dashboards de operaciones y monitoreo"
}
```

---

### PATCH /api/v1/dashboard-groups/:id

**Body** (JSON) - todos opcionales:
```json
{
  "name": "Grupo Actualizado",
  "description": "Nueva descripción",
  "isActive": false
}
```

---

### DELETE /api/v1/dashboard-groups/:id

Soft delete. No elimina los dashboards del grupo.

---

## GROUP ITEMS

### POST /api/v1/dashboard-groups/:groupId/dashboards

**Body** (JSON):
```json
{
  "dashboardId": "DSH-XXXXX-X",
  "orderIndex": 0
}
```

---

### DELETE /api/v1/dashboard-groups/:groupId/dashboards/:dashboardId

Remueve la asociación, no elimina el dashboard.

---

## GROUP COLLABORATORS

Misma estructura que Dashboard Collaborators pero bajo la ruta `/api/v1/dashboard-groups/:id/collaborators`.

| Método | Endpoint | Body |
|--------|----------|------|
| GET | `/:id/collaborators` | - |
| POST | `/:id/collaborators` | `{ "userId": "USR-X", "role": "editor" }` |
| PATCH | `/:id/collaborators/:collaboratorId` | `{ "role": "viewer" }` |
| DELETE | `/:id/collaborators/:collaboratorId` | - |

---

## WEBSOCKET REALTIME (DASHBOARD)

### Flujo completo (conexión inicial)

```
1. GET /api/v1/auth/realtime-token          → obtener token WS
2. ws://host:port/ws                        → conectar WebSocket
3. EC:SYSTEM:AUTH { token }                 → autenticar sesión
4. EC:DASHBOARD:{id}:SUBSCRIBE              → suscribirse a dashboard
5. EC:DASHBOARD:{id}:SUBSCRIBED             → metadata de channels/variables
6. EC:DASHBOARD:{id}:SNAPSHOT (opcional)    → últimos valores conocidos (cache Redis)
7. EC:DASHBOARD:{id}:DATA (continuo)        → datos MQTT filtrados en tiempo real
8. EC:DASHBOARD:{id}:UNSUBSCRIBE            → desuscribirse
```

### Flujo de reconexión (después de desconexión/refresh)

```
  FRONTEND                              SERVIDOR                        REDIS
  ────────                              ────────                        ─────
      │                                     │                              │
      │ ── 1. GET /realtime-token ────────► │                              │
      │ ◄── token JWT (5min) ──────────────│                              │
      │                                     │                              │
      │ ── 2. ws://host/ws ───────────────► │                              │
      │ ◄── connection open ───────────────│                              │
      │                                     │                              │
      │ ── 3. EC:SYSTEM:AUTH { token } ───► │                              │
      │ ◄── EC:SYSTEM:AUTH_OK ─────────────│                              │
      │                                     │                              │
      │ ── 4. EC:DASHBOARD:{id}:SUBSCRIBE ► │                              │
      │                                     │── resolveDashboardAssets() ──►│
      │                                     │◄─ { devices, channels } ─────│
      │                                     │                              │
      │ ◄── 5. SUBSCRIBED (metadata) ──────│                              │
      │                                     │── getCache(ec:rt:last:*) ───►│
      │                                     │◄─ últimos valores ───────────│
      │                                     │                              │
      │ ◄── 6. SNAPSHOT (si hay cache) ────│                              │
      │     (renderizar datos inmediatos)   │                              │
      │                                     │                              │
      │ ◄── 7. DATA (continuo, MQTT) ─────│ ──setCache(fire-and-forget)─►│
      │     (actualizar en tiempo real)     │                              │
      ▼                                     ▼                              ▼
```

**Notas sobre reconexión**:
- El frontend debe re-ejecutar el flujo completo (pasos 1-4) en cada reconexión. No hay "resume" de sesión.
- El SNAPSHOT permite que el dashboard muestre datos inmediatamente sin esperar el siguiente ciclo MQTT (~1-5 seg).
- **Gap de datos**: Entre la desconexión y el SNAPSHOT puede haber un gap de hasta 5 minutos (TTL del cache Redis). Para datos históricos en ese gap, usar el endpoint REST `POST .../widgets/:widgetId/data`.
- Si no hay valores cacheados (primera suscripción, o TTL expiró), el servidor no envía SNAPSHOT — el frontend simplemente espera el primer DATA.
- El SNAPSHOT se envía asíncronamente después del SUBSCRIBED. El orden garantizado es: SUBSCRIBED primero, SNAPSHOT después (si hay datos).

### Implementación frontend recomendada

```javascript
// Reconexión con backoff exponencial
class DashboardWS {
  constructor(dashboardId) {
    this.dashboardId = dashboardId;
    this.retryDelay = 1000;
    this.maxRetryDelay = 30000;
    this.channelMeta = []; // metadata de SUBSCRIBED
  }

  async connect() {
    const { token } = await fetch('/api/v1/auth/realtime-token').then(r => r.json());
    this.ws = new WebSocket(`ws://${host}/ws`);

    this.ws.onopen = () => {
      this.retryDelay = 1000; // reset backoff
      this.ws.send(JSON.stringify({
        type: 'EC:SYSTEM:AUTH',
        payload: { token }
      }));
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'EC:SYSTEM:AUTH_OK') {
        // Autenticado → suscribirse al dashboard
        this.ws.send(JSON.stringify({
          type: `EC:DASHBOARD:${this.dashboardId}:SUBSCRIBE`,
          requestId: crypto.randomUUID()
        }));
      }

      if (msg.type.endsWith(':SUBSCRIBED')) {
        // Guardar metadata para mapping widget→channel
        this.channelMeta = msg.payload.subscribedChannels;
      }

      if (msg.type.endsWith(':SNAPSHOT') || msg.type.endsWith(':DATA')) {
        // Mismo formato de payload → misma función de renderizado
        this.renderChannelData(msg.payload.channels || msg.payload);
      }
    };

    this.ws.onclose = () => {
      // Reconectar con backoff exponencial
      setTimeout(() => this.connect(), this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelay);
    };
  }

  renderChannelData(channels) {
    for (const [channelCode, data] of Object.entries(channels)) {
      for (const meta of this.channelMeta) {
        if (meta.id === channelCode) {
          // Encontrar widget por pageNumber + widgetNumber
          updateWidget(meta.pageNumber, meta.widgetNumber, {
            variableId: meta.variableId,
            value: data.values[String(meta.variableId)],
            ts: data.ts
          });
        }
      }
    }
  }
}
```

### Triple filtrado de seguridad

Los datos MQTT pasan por 3 filtros antes de llegar al frontend:

1. **Guard `dataConfig.dateRange = 'realtime'`**: Solo widgets cuyo `dataConfig.dateRange` sea `"realtime"` participan en WS. El usuario decide explícitamente qué widgets son realtime desde el frontend. Además, la variable debe tener `mqtt_key IS NOT NULL` (para saber qué campo extraer del payload MQTT).

2. **Filtro por canal (ch/uid)**: Solo se reenvían datos de canales que están configurados como data sources en el dashboard. El uid MQTT (`EC:C3:8A:60:43:CC:00:05`) contiene el número de canal en los últimos 2 bytes hex (`00:05` = canal 5). Se compara contra `channels.ch` de la DB.

3. **Filtro por variable (mqtt_key)**: Solo se extrae el valor específico que pidió el widget via `seriesConfig.variableId`. Por ejemplo, si un widget pide potencia (variableId=3, mqtt_key=`P`), solo se envía el valor `P` del payload, no voltaje, corriente, ni ningún otro valor.

### Campo `mqtt_key` en tabla `variables`

La tabla `variables` tiene un campo `mqtt_key VARCHAR(50)` que mapea la key exacta como llega en el payload MQTT. Esto es necesario porque `column_name.toUpperCase()` no siempre coincide con la key MQTT (ej: `column_name=fp` pero en MQTT llega como `PF`).

**Mapeo actual (variables eléctricas con `is_realtime=true`)**:

| id | code | column_name | mqtt_key | is_realtime |
|----|------|-------------|----------|-------------|
| 3  | ee_power | p | P | true |
| 5  | ee_power_factor | fp | PF | true |
| 7  | ee_voltage_ln | v | V | true |
| 8  | ee_current | i | I | true |
| 9  | ee_apparent_power | s | S | true |
| 10 | ee_voltage_ll | u | U | true |
| 13 | ee_harmonic_distortion | d | D | true |
| 16 | ee_reactive_power | q | Q | true |
| 19 | ee_frequency | f | F | true |

Variables con `mqtt_key=NULL` (energía, energía reactiva, costos, etc.) no pueden participar en WS aunque el widget tenga `dateRange: "realtime"`, porque no hay forma de extraer su valor del payload MQTT.

### EC:DASHBOARD:{id}:SUBSCRIBE

**Client → Server**

```json
{
  "type": "EC:DASHBOARD:DSH-NKH-NNQ:SUBSCRIBE",
  "requestId": "req-001"
}
```

### EC:DASHBOARD:{id}:SUBSCRIBED

**Server → Client** — Confirmación con metadata completa para mapping en frontend.

```json
{
  "type": "EC:DASHBOARD:DSH-NKH-NNQ:SUBSCRIBED",
  "payload": {
    "dashboardId": "DSH-NKH-NNQ",
    "subscribedDevices": ["DEV-X7K-QWR"],
    "subscribedChannels": [
      {
        "id": "CHN-F74-CEL",
        "name": "Coffe Shop y Sport Bar",
        "deviceId": "DEV-X7K-QWR",
        "variableId": 3,
        "measurementTypeId": 1,
        "label": "Coffe Shop",
        "pageNumber": 1,
        "widgetNumber": 1,
        "datasourceNumber": 1
      },
      {
        "id": "CHN-F74-CEL",
        "name": "Coffe Shop y Sport Bar",
        "deviceId": "DEV-X7K-QWR",
        "variableId": 7,
        "measurementTypeId": 1,
        "label": "Coffe Shop Voltaje",
        "pageNumber": 1,
        "widgetNumber": 2,
        "datasourceNumber": 1
      }
    ]
  },
  "timestamp": "2026-02-26T02:12:47.664Z",
  "requestId": "req-001"
}
```

**Notas**:
- `subscribedChannels` solo incluye entries de widgets con `dataConfig.dateRange === "realtime"` y cuya variable tiene `mqtt_key` definido. Si un widget no tiene dateRange "realtime" o pide una variable sin mqtt_key, ese data source no aparece aquí.
- Un mismo channel puede aparecer múltiples veces si distintos widgets lo usan con diferentes variables.
- `pageNumber`, `widgetNumber`, `datasourceNumber` son orderNumbers (integers, 1-based) para que el frontend mapee qué widget renderiza qué dato.
- No se expone `ch` (interno) — solo `id` (publicCode).

### EC:DASHBOARD:{id}:SNAPSHOT

**Server → Client** — Últimos valores conocidos desde Redis cache. Se envía automáticamente después del SUBSCRIBED si hay datos cacheados. Formato idéntico a DATA (sin `deviceId`).

```json
{
  "type": "EC:DASHBOARD:DSH-NKH-NNQ:SNAPSHOT",
  "payload": {
    "channels": {
      "CHN-F74-CEL": {
        "ts": 1772071967,
        "values": {
          "3": 22614,
          "7": 120.374
        }
      },
      "CHN-ABC-DEF": {
        "ts": 1772071900,
        "values": {
          "3": 15203
        }
      }
    }
  },
  "timestamp": "2026-02-26T02:12:47.700Z"
}
```

**Notas**:
- El SNAPSHOT se envía solo si hay al menos un valor cacheado en Redis para los channels del dashboard.
- Si no hay valores (primera conexión, o cache expiró por TTL de 5 minutos), no se envía SNAPSHOT — el frontend espera silenciosamente al primer DATA.
- Cada channel muestra el `ts` más reciente entre todas sus variables cacheadas.
- No incluye `deviceId` porque los valores pueden provenir de distintos momentos/devices.
- El frontend debe tratar SNAPSHOT y DATA con la misma lógica de renderizado — el formato de `channels` es idéntico.
- No incluye `requestId` — es un mensaje asíncrono derivado del SUBSCRIBE.
- **Redis key**: `ec:rt:last:{channelPublicCode}:{variableId}` con TTL 300s. Valor almacenado: `{ ts, value, devicePublicCode }`.

### EC:DASHBOARD:{id}:DATA

**Server → Client** — Datos MQTT filtrados, agrupados por channel. Se envía un mensaje por cada device que reporta.

```json
{
  "type": "EC:DASHBOARD:DSH-NKH-NNQ:DATA",
  "payload": {
    "deviceId": "DEV-X7K-QWR",
    "channels": {
      "CHN-F74-CEL": {
        "ts": 1772071967,
        "values": {
          "3": 22614,
          "7": 120.374
        }
      },
      "CHN-ABC-DEF": {
        "ts": 1772071967,
        "values": {
          "3": 15203
        }
      }
    }
  },
  "timestamp": "2026-02-26T02:12:47.664Z"
}
```

**Notas**:
- `channels` es un objeto donde cada key es el publicCode del canal.
- `ts` es UTC epoch seconds — el frontend convierte a timezone local.
- `values` tiene como keys el `variableId` (string), consistente con el endpoint REST `POST .../widgets/:widgetId/data`.
- Solo aparecen values de variables que el widget pidió, cuyo widget tiene `dateRange: "realtime"`, Y cuya mqtt_key tiene un valor en el payload MQTT.
- Si un canal matchea pero ninguna variable tiene valor en ese instante → el canal no aparece (silencioso).

**Frontend mapping**: Para renderizar datos en un widget:
```javascript
// subscribedChannels[i] da: { id: "CHN-xxx", variableId: 3, pageNumber: 1, widgetNumber: 1 }
// DATA payload da: channels["CHN-xxx"].values["3"] = 22614

const channel = subscribedChannels.find(ch => 
  ch.pageNumber === activePage && ch.widgetNumber === widgetId
);
const value = data.channels[channel.id]?.values[String(channel.variableId)];
```

### EC:DASHBOARD:{id}:UNSUBSCRIBE

**Client → Server**

```json
{
  "type": "EC:DASHBOARD:DSH-NKH-NNQ:UNSUBSCRIBE",
  "requestId": "req-002"
}
```

### EC:DASHBOARD:{id}:UNSUBSCRIBED

**Server → Client**

```json
{
  "type": "EC:DASHBOARD:DSH-NKH-NNQ:UNSUBSCRIBED",
  "payload": { "dashboardId": "DSH-NKH-NNQ" },
  "timestamp": "2026-02-26T02:12:50.123Z",
  "requestId": "req-002"
}
```

### EC:DASHBOARD:{id}:IDLE_TIMEOUT

**Server → Client** — Suscripción auto-removida porque no llegaron datos MQTT durante el período configurado.

```json
{
  "type": "EC:DASHBOARD:DSH-NKH-NNQ:IDLE_TIMEOUT",
  "payload": {
    "dashboardId": "DSH-NKH-NNQ",
    "idleSeconds": 300,
    "message": "Subscription auto-removed: no data received for 300s"
  },
  "timestamp": "2026-02-26T02:17:47.664Z"
}
```

### EC:DASHBOARD:ERROR

**Server → Client** — Error en operación.

```json
{
  "type": "EC:DASHBOARD:ERROR",
  "payload": {
    "code": "NO_ASSETS",
    "message": "No active devices/channels with realtime variables found for this dashboard.",
    "fatal": false
  },
  "timestamp": "2026-02-26T02:12:47.664Z",
  "requestId": "req-001"
}
```

**Códigos de error**:
| code | fatal | Descripción |
|------|-------|-------------|
| AUTH_REQUIRED | true | No se envió EC:SYSTEM:AUTH antes |
| INVALID_MESSAGE | false | Falta dashboardId en el message type |
| NO_ASSETS | false | Dashboard sin devices/channels con variables realtime |
| SUBSCRIPTION_LIMIT | false | Máximo de suscripciones simultáneas alcanzado |

### Arquitectura interna

**Archivo**: `src/modules/realtime/handlers/dashboardHandler.js`

**Funciones principales**:
- `resolveDashboardAssets(dashboardPublicCode)`: Query SQL que resuelve dashboard → pages → widgets → dataSources → channels → devices, filtrado por `widget.data_config->>'dateRange' = 'realtime'` y `variable.mqtt_key IS NOT NULL`. Retorna `{ devices, channels }` donde cada channel incluye `mqttKey`, `variableId`, `pageNumber`, `widgetNumber`, `datasourceNumber`.
- `processMqttForDashboards(mqttData)`: Procesa mensajes MQTT. Solo extrae `rtdata`. Para cada suscripción activa, filtra por device → canal (uid hex) → variable (mqtt_key). Construye payload agrupado por channel y lo envía por WS. Guarda último valor en Redis (fire-and-forget).
- `sendSnapshot(ws, dashboardId, channels)`: Lee últimos valores conocidos de Redis (`ec:rt:last:*`) para todos los channels del dashboard. Si hay valores cacheados, envía mensaje SNAPSHOT al cliente. Se ejecuta asíncronamente después del SUBSCRIBED.
- `handleSubscribe/handleUnsubscribe`: Handlers WS para suscripción/desuscripción.
- `sweepIdleDashboardSubscriptions()`: Timer periódico que limpia suscripciones sin datos.

**Helpers**:
- `intToHex(num)`: Convierte número de canal a formato hex de 2 bytes (`5` → `00:05`).
- `extractChannelFromUid(uid)`: Extrae número de canal desde uid MQTT (`EC:...:00:05` → `5`).

---

## WEBSOCKET DEBUG (EC:DEV — MQTT CRUDO)

Handler para suscripción directa a un device por UUID. Reenvía el payload MQTT completo sin filtrar. Disponible en todos los entornos, requiere rol admin+.

**Archivo**: `src/modules/realtime/handlers/devHandler.js`

### Comparación: Debug vs Dashboard

| Aspecto | Debug (`EC:DEV`) | Dashboard (`EC:DASHBOARD`) |
|---------|-----------------|---------------------------|
| **Propósito** | Testing / diagnóstico MQTT | Visualización en widgets |
| **Suscripción por** | UUID del device | publicCode del dashboard |
| **Payload** | MQTT crudo completo (sin filtrar) | Filtrado por canal + variable + dateRange realtime |
| **Roles requeridos** | admin, superadmin, system-admin | Cualquier usuario autenticado |
| **Tipo de dato** | Todo lo que llega por MQTT | Solo widgets con `dateRange: "realtime"` y variables con `mqtt_key` |
| **SNAPSHOT** | No | Sí (últimos valores de Redis al suscribirse) |
| **Campo `source`** | `"debug"` | `"dashboard"` (o ausente) |
| **Disponibilidad** | Todos los entornos | Todos los entornos |

### Flujo completo (debug)

```
1. GET /api/v1/auth/realtime-token          → obtener token WS
2. ws://host:port/ws                        → conectar WebSocket
3. EC:SYSTEM:AUTH { token }                 → autenticar sesión
4. EC:DEV:MQTT:SUBSCRIBE { deviceUuid }     → suscribirse a device
5. EC:DEV:MQTT:DATA (server→client)         → datos MQTT crudos
6. EC:DEV:MQTT:UNSUBSCRIBE { deviceUuid }   → desuscribirse
```

### EC:DEV:MQTT:SUBSCRIBE

**Client → Server** — Suscripción directa a un device por UUID para recibir datos MQTT sin filtrar.

```json
{
  "type": "EC:DEV:MQTT:SUBSCRIBE",
  "payload": {
    "deviceUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "source": "debug"
  },
  "requestId": "req_123",
  "timestamp": "2026-02-26T15:30:00.000Z"
}
```

### EC:DEV:MQTT:SUBSCRIBED

**Server → Client** — Confirmación con estado de los brokers MQTT.

```json
{
  "type": "EC:DEV:MQTT:SUBSCRIBED",
  "payload": {
    "deviceUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "message": "Subscribed to MQTT data for device xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx. Real-time data will arrive as EC:DEV:MQTT:DATA messages.",
    "brokers": [
      { "index": 0, "connected": true },
      { "index": 1, "connected": true },
      { "index": 2, "connected": true }
    ]
  },
  "timestamp": "2026-02-26T15:30:00.100Z",
  "requestId": "req_123"
}
```

### EC:DEV:MQTT:DATA

**Server → Client** — Payload MQTT completo, sin ningún filtrado. Se recibe cada vez que el device publica por MQTT.

```json
{
  "type": "EC:DEV:MQTT:DATA",
  "payload": {
    "deviceUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "topic": "Solution/some/level/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/data",
    "brokerIndex": 0,
    "data": {
      "rtdata": [
        {
          "uid": "EC:C3:8A:60:43:CC:00:05",
          "canal": 5,
          "ts": "2026-02-26T15:30:01.000Z",
          "P": 22614,
          "V": 120.374,
          "I": 3.5,
          "PF": 0.95,
          "S": 23804,
          "F": 60.01
        }
      ]
    },
    "raw": true
  },
  "timestamp": "2026-02-26T15:30:01.050Z"
}
```

**Notas**:
- `data` contiene el JSON completo tal como llega por MQTT — incluye `rtdata` y cualquier otra key que traiga el payload.
- `topic` es el topic MQTT original (útil para diagnóstico).
- `brokerIndex` indica de cuál broker MQTT llegó el mensaje (0, 1, o 2).
- `raw: true` indica que el payload fue parseado como JSON exitosamente.
- No se aplica ningún filtrado por canal, variable, ni `is_realtime`.

### EC:DEV:MQTT:UNSUBSCRIBE

**Client → Server**

```json
{
  "type": "EC:DEV:MQTT:UNSUBSCRIBE",
  "payload": {
    "deviceUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "source": "debug"
  },
  "requestId": "req_124",
  "timestamp": "2026-02-26T15:35:00.000Z"
}
```

### EC:DEV:MQTT:UNSUBSCRIBED

**Server → Client**

```json
{
  "type": "EC:DEV:MQTT:UNSUBSCRIBED",
  "payload": {
    "deviceUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "message": "Unsubscribed from MQTT data for device xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  },
  "timestamp": "2026-02-26T15:35:00.100Z",
  "requestId": "req_124"
}
```

### EC:DEV:MQTT:STATUS

**Client → Server** — Consultar estado de conexiones MQTT y suscripciones activas.

```json
{
  "type": "EC:DEV:MQTT:STATUS",
  "requestId": "req_125"
}
```

**Server → Client**

```json
{
  "type": "EC:DEV:MQTT:STATUS",
  "payload": {
    "mqtt": {
      "brokers": [
        { "index": 0, "connected": true, "url": "mqtt://broker1:1883" }
      ],
      "activeTopics": ["Solution/+/+/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/#"]
    },
    "devSubscriptions": [
      {
        "deviceUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "sessionId": "sess_abc",
        "subscribedAt": "2026-02-26T15:30:00.000Z"
      }
    ]
  },
  "timestamp": "2026-02-26T15:35:00.100Z"
}
```

### EC:DEV:MQTT:IDLE_TIMEOUT

**Server → Client** — Suscripción auto-removida por inactividad.

```json
{
  "type": "EC:DEV:MQTT:IDLE_TIMEOUT",
  "payload": {
    "deviceUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "idleSeconds": 300,
    "message": "Subscription auto-removed: no data received for 300s"
  },
  "timestamp": "2026-02-26T15:35:00.000Z"
}
```

### EC:DEV:ERROR

**Server → Client**

```json
{
  "type": "EC:DEV:ERROR",
  "payload": {
    "code": "FORBIDDEN",
    "message": "DEV service requires admin or superadmin role",
    "fatal": false
  },
  "timestamp": "2026-02-26T15:30:00.000Z",
  "requestId": "req_123"
}
```

**Códigos de error**:
| code | fatal | Descripción |
|------|-------|-------------|
| FORBIDDEN | false | Rol insuficiente (requiere admin, superadmin, o system-admin) |
| INVALID_PAYLOAD | false | Falta `deviceUuid` en el payload |
| INVALID_UUID | false | `deviceUuid` no tiene formato UUID válido |
| NOT_SUBSCRIBED | false | Intentó desuscribirse de un device al que no estaba suscrito |
| ALREADY_SUBSCRIBED | false | Ya está suscrito a ese device |

### Campo `source` en mensajes WS

El campo `source` en el payload es informativo — indica desde qué sección del frontend se originó la suscripción:

- `"debug"`: Sección de testing/diagnóstico → usa `EC:DEV:MQTT:*`
- `"dashboard"`: Dashboard de visualización → usa `EC:DASHBOARD:{id}:*`

El backend no usa `source` para routing (eso se determina por el tipo de mensaje `EC:DEV` vs `EC:DASHBOARD`). El campo queda loggeado para trazabilidad.

### Ejemplo: suscripción desde dashboard con `source`

```json
{
  "type": "EC:DASHBOARD:DSH-NKH-NNQ:SUBSCRIBE",
  "payload": {
    "source": "dashboard"
  },
  "requestId": "req-001",
  "timestamp": "2026-02-26T15:30:00.000Z"
}
```

```json
{
  "type": "EC:DASHBOARD:DSH-NKH-NNQ:UNSUBSCRIBE",
  "payload": {
    "source": "dashboard"
  },
  "requestId": "req-002",
  "timestamp": "2026-02-26T15:35:00.000Z"
}
```

### Arquitectura interna (devHandler)

**Archivo**: `src/modules/realtime/handlers/devHandler.js`

**Funciones principales**:
- `processMqttForDev(mqttData)`: Recibe todos los mensajes MQTT y los reenvía sin filtrar a las suscripciones activas que coincidan por `deviceUuid`.
- `handleMqttSubscribe/handleMqttUnsubscribe`: Handlers para suscripción/desuscripción.
- `handleMqttStatus`: Retorna estado de brokers MQTT y suscripciones activas.
- `sweepIdleDevSubscriptions()`: Timer periódico que limpia suscripciones sin datos.
- `cleanupDevSubscriptions(sessionId)`: Limpia suscripciones al desconectarse el WS.
