# Dashboards Endpoints

> **Última actualización**: 2026-02-25
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint del módulo.

## Convenciones importantes

- **Todos los JSON usan camelCase** (request y response)
- **`id` en responses de Dashboard/Group** = publicCode string (ej: `DSH-XXXXX-X`)
- **`id` en responses de Page/Widget/DataSource** = orderNumber integer (ej: `1`, `2`, `3`)
- **`pageId` y `widgetId` en URLs** son integers (orderNumber), no UUIDs
- **Al crear un dashboard**, se crea automáticamente la página 1 con `name: null`
- **Layout usa formato GridStack JS**: `{ x, y, w, h, minW?, minH?, maxW?, maxH? }`
- **Widget `type` es string libre**: El frontend define los nombres (snake_case, regex: `/^[a-z][a-z0-9_]*$/`). No hay enum fijo en el backend.

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
| DELETE | `/api/v1/dashboards/:dashboardId/pages/:pageId` | Eliminar página |

### Widgets
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/dashboards/:dashboardId/pages/:pageId/widgets` | Crear widget (con dataSources inline) |
| PATCH | `/api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId` | Actualizar widget (widgetId = orderNumber integer) |
| DELETE | `/api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId` | Eliminar widget |

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

**Widget `type`**: String libre definido por el frontend. Debe cumplir el regex `/^[a-z][a-z0-9_]*$/` (snake_case alfanumérico, max 50 chars). Ejemplos: `line_chart`, `bar_chart`, `energy_gauge`, `custom_kpi_card`. Para ver qué tipos están en uso, consultar `GET /api/v1/dashboards/widget-types`.

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
