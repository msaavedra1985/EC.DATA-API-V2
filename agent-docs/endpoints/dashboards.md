# Dashboards Endpoints

> **Última actualización**: 2026-02-23
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint del módulo.

## Resumen

### Dashboards
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/dashboards` | Listar dashboards |
| GET | `/api/v1/dashboards/:id` | Obtener dashboard por public_code |
| POST | `/api/v1/dashboards` | Crear dashboard |
| PATCH | `/api/v1/dashboards/:id` | Actualizar dashboard |
| DELETE | `/api/v1/dashboards/:id` | Eliminar dashboard (soft delete) |
| PUT | `/api/v1/dashboards/:id/home` | Marcar dashboard como home |

### Pages
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/dashboards/:dashboardId/pages` | Listar páginas de un dashboard |
| POST | `/api/v1/dashboards/:dashboardId/pages` | Crear página |
| PATCH | `/api/v1/dashboards/:dashboardId/pages/:pageId` | Actualizar página |
| DELETE | `/api/v1/dashboards/:dashboardId/pages/:pageId` | Eliminar página |

### Widgets
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/dashboards/:dashboardId/pages/:pageId/widgets` | Crear widget |
| PATCH | `/api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId` | Actualizar widget |
| DELETE | `/api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId` | Eliminar widget |

### Widget Data Sources
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/dashboards/widgets/:widgetId/data-sources` | Crear fuente de datos |
| PATCH | `/api/v1/dashboards/widgets/:widgetId/data-sources/:dataSourceId` | Actualizar fuente de datos |
| DELETE | `/api/v1/dashboards/widgets/:widgetId/data-sources/:dataSourceId` | Eliminar fuente de datos |

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

## DASHBOARDS

### GET /api/v1/dashboards

**Propósito**: Listar dashboards de la organización con paginación y filtros

**Autenticación**: Bearer JWT

**Headers**:
| Header | Requerido | Descripción |
|--------|-----------|-------------|
| Authorization | Sí | `Bearer {access_token}` |

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| limit | number | 20 | Máximo de resultados (1-100) |
| offset | number | 0 | Offset para paginación |
| search | string | - | Filtrar por nombre |
| is_public | boolean | - | Filtrar por publicidad (true/false) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "DSH-XXXXX-X",
      "name": "Dashboard Ventas",
      "description": "Dashboard principal de ventas",
      "icon": "chart-bar",
      "is_public": false,
      "is_active": true,
      "owner_id": "user-123",
      "organization_id": "org-123",
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-02-13T15:45:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "limit": 20,
    "offset": 0
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 401 | UNAUTHORIZED | Token inválido o expirado |
| 403 | FORBIDDEN | Sin permisos para este recurso |

**Notas**:
- Audit log: No (solo lectura)
- Rate limit: 30 req/min
- Cache: No

---

### GET /api/v1/dashboards/:id

**Propósito**: Obtener un dashboard específico con todas sus relaciones

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
    "public_code": "DSH-XXXXX-X",
    "name": "Dashboard Ventas",
    "description": "Dashboard principal de ventas",
    "icon": "chart-bar",
    "is_public": false,
    "is_active": true,
    "owner_id": "user-123",
    "organization_id": "org-123",
    "pages": [
      {
        "id": "page-1",
        "name": "Resumen",
        "order_index": 0,
        "widgets": [
          {
            "id": "widget-1",
            "type": "stat_card",
            "title": "Total Ventas",
            "layout": {
              "x": 0,
              "y": 0,
              "w": 3,
              "h": 2
            },
            "order_index": 0
          }
        ]
      }
    ],
    "collaborators": [
      {
        "id": "collab-1",
        "user_id": "user-456",
        "role": "viewer",
        "created_at": "2026-02-01T12:00:00Z"
      }
    ],
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-02-13T15:45:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | NOT_FOUND | Dashboard no encontrado |
| 401 | UNAUTHORIZED | Token inválido |
| 403 | FORBIDDEN | Sin permisos para acceder a este dashboard |

**Notas**:
- Incluye páginas, widgets y colaboradores
- Requiere permisos de acceso (owner o colaborador)

---

### POST /api/v1/dashboards

**Propósito**: Crear nuevo dashboard en la organización

**Autenticación**: Bearer JWT (requiere rol: system-admin, org-admin)

**Body** (JSON):
```json
{
  "name": "Dashboard Operacional",
  "description": "Monitor de operaciones en tiempo real",
  "icon": "monitor",
  "is_public": false,
  "size": "HD",
  "positioning": "AUTO",
  "settings": { "forceK": true }
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | Sí | Nombre del dashboard (max 200 caracteres) |
| description | string | No | Descripción del dashboard |
| icon | string | No | Icono del dashboard (max 50 caracteres) |
| is_public | boolean | No | Si es público (default: false) |
| size | string | No | Resolución del canvas: `FREE` (default), `HD` (1920x1080), `VERTICAL` (1080x1920), `CUSTOM` |
| positioning | string | No | Modo posicionamiento widgets: `AUTO` (default, grid), `FLOAT` (libre) |
| custom_width | number | Condicional | Ancho en px (800-3840). Requerido si `size=CUSTOM` |
| custom_height | number | Condicional | Alto en px (600-2160). Requerido si `size=CUSTOM` |
| settings | object | No | Config extensible: `{ forceK: bool, backgroundImage: url|null }` |
| template_id | string | No | Public code de template para precargar estructura |

**Validaciones condicionales**:
- Si `size=CUSTOM`: `custom_width` y `custom_height` son **requeridos**
- Si `size!=CUSTOM`: `custom_width` y `custom_height` deben ser **null** o ausentes

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
    "custom_width": null,
    "custom_height": null,
    "is_home": false,
    "is_public": false,
    "is_active": true,
    "settings": { "forceK": true },
    "created_at": "2026-02-13T15:45:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | VALIDATION_ERROR | Datos inválidos |
| 401 | UNAUTHORIZED | Token inválido |
| 403 | FORBIDDEN | Sin permisos (requiere admin) |

**Notas**:
- Audit log: Sí (CREATE)
- Genera public_code automáticamente (DSH-XXXXX-X)
- El usuario actual es asignado como owner

---

### PATCH /api/v1/dashboards/:id

**Propósito**: Actualizar un dashboard existente

**Autenticación**: Bearer JWT (requiere ser owner o admin)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del dashboard |

**Body** (JSON):
```json
{
  "name": "Dashboard Ventas Actualizado",
  "description": "Dashboard de ventas con nuevas métricas",
  "icon": "chart-line",
  "is_public": true,
  "is_active": true,
  "size": "CUSTOM",
  "positioning": "FLOAT",
  "custom_width": 1600,
  "custom_height": 900,
  "settings": { "forceK": false, "backgroundImage": "https://example.com/bg.jpg" }
}
```

**Campos** (todos opcionales):
| Campo | Tipo | Descripción |
|-------|------|-------------|
| name | string | Nuevo nombre (max 200 caracteres) |
| description | string | Nueva descripción |
| icon | string | Nuevo icono (max 50 caracteres) |
| is_public | boolean | Cambiar visibilidad |
| is_active | boolean | Activar/desactivar dashboard |
| size | string | Resolución: `FREE`, `HD`, `VERTICAL`, `CUSTOM` |
| positioning | string | Posicionamiento: `AUTO`, `FLOAT` |
| custom_width | number\|null | Ancho personalizado (800-3840, solo con `size=CUSTOM`) |
| custom_height | number\|null | Alto personalizado (600-2160, solo con `size=CUSTOM`) |
| settings | object | Config extensible: `{ forceK, backgroundImage }` |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "DSH-XXXXX-X",
    "name": "Dashboard Ventas Actualizado",
    "description": "Dashboard de ventas con nuevas métricas",
    "icon": "chart-line",
    "is_public": true,
    "is_active": true,
    "updated_at": "2026-02-13T16:00:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | VALIDATION_ERROR | Datos inválidos |
| 404 | NOT_FOUND | Dashboard no encontrado |
| 401 | UNAUTHORIZED | Token inválido |
| 403 | FORBIDDEN | Sin permisos para actualizar |

**Notas**:
- Audit log: Sí (UPDATE con changes)
- Solo enviar campos a modificar
- Requiere permisos de owner o admin

---

### DELETE /api/v1/dashboards/:id

**Propósito**: Eliminar dashboard (soft delete)

**Autenticación**: Bearer JWT (requiere ser owner o admin)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del dashboard |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Dashboard eliminado exitosamente"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | NOT_FOUND | Dashboard no encontrado |
| 401 | UNAUTHORIZED | Token inválido |
| 403 | FORBIDDEN | Sin permisos para eliminar |

**Notas**:
- Audit log: Sí (DELETE)
- Soft delete: Marca `deleted_at`, no elimina físicamente
- Requiere permisos de owner o admin

---

### PUT /api/v1/dashboards/:id/home

**Propósito**: Marcar un dashboard como "home" del usuario en la organización activa

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del dashboard |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "id": "DSH-XXXXX-X",
    "name": "Dashboard Principal",
    "is_home": true,
    "size": "HD",
    "positioning": "AUTO",
    "settings": {},
    "..."
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | DASHBOARD_NOT_FOUND | Dashboard no encontrado |
| 401 | UNAUTHORIZED | Token inválido |
| 403 | FORBIDDEN | Solo el owner puede marcar como home |

**Notas**:
- Audit log: Sí (SET_HOME)
- Solo puede haber **1 home** por usuario+organización
- Al marcar uno como home, se desmarca cualquier otro que lo fuera
- No requiere rol admin, solo ser owner del dashboard

---

## PAGES

### GET /api/v1/dashboards/:dashboardId/pages

**Propósito**: Listar páginas de un dashboard

**Autenticación**: Bearer JWT

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
      "id": "page-1",
      "name": "Resumen",
      "dashboard_id": "DSH-XXXXX-X",
      "order_index": 0,
      "created_at": "2026-01-15T10:30:00Z"
    },
    {
      "id": "page-2",
      "name": "Detalle",
      "dashboard_id": "DSH-XXXXX-X",
      "order_index": 1,
      "created_at": "2026-01-15T11:00:00Z"
    }
  ]
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | NOT_FOUND | Dashboard no encontrado |
| 403 | FORBIDDEN | Sin permisos |

---

### POST /api/v1/dashboards/:dashboardId/pages

**Propósito**: Crear nueva página en un dashboard

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| dashboardId | string | Public code del dashboard |

**Body** (JSON):
```json
{
  "name": "Análisis",
  "order_index": 2
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | Sí | Nombre de la página (max 200 caracteres) |
| order_index | number | No | Orden de la página (default: 0) |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": "page-3",
    "name": "Análisis",
    "dashboard_id": "DSH-XXXXX-X",
    "order_index": 2,
    "created_at": "2026-02-13T15:45:00Z"
  }
}
```

**Notas**:
- Audit log: Sí (CREATE)

---

### PATCH /api/v1/dashboards/:dashboardId/pages/:pageId

**Propósito**: Actualizar página

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| dashboardId | string | Public code del dashboard |
| pageId | string | ID de la página |

**Body** (JSON):
```json
{
  "name": "Análisis Actualizado",
  "order_index": 1
}
```

**Campos** (todos opcionales):
| Campo | Tipo | Descripción |
|-------|------|-------------|
| name | string | Nuevo nombre (max 200 caracteres) |
| order_index | number | Nuevo orden |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "id": "page-3",
    "name": "Análisis Actualizado",
    "dashboard_id": "DSH-XXXXX-X",
    "order_index": 1,
    "updated_at": "2026-02-13T16:00:00Z"
  }
}
```

**Notas**:
- Audit log: Sí (UPDATE)

---

### DELETE /api/v1/dashboards/:dashboardId/pages/:pageId

**Propósito**: Eliminar página de un dashboard

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| dashboardId | string | Public code del dashboard |
| pageId | string | ID de la página |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Página eliminada exitosamente"
  }
}
```

**Notas**:
- Audit log: Sí (DELETE)
- Elimina todos los widgets de la página

---

## WIDGETS

### POST /api/v1/dashboards/:dashboardId/pages/:pageId/widgets

**Propósito**: Crear widget en una página

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| dashboardId | string | Public code del dashboard |
| pageId | string | ID de la página |

**Body** (JSON):
```json
{
  "type": "line_chart",
  "title": "Ventas Mensuales",
  "layout": {
    "x": 0,
    "y": 0,
    "w": 6,
    "h": 4
  },
  "style_config": {
    "color": "#1f77b4",
    "showLegend": true
  },
  "data_config": {
    "metric": "total_sales"
  },
  "order_index": 0
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| type | string | Sí | Tipo: line_chart, bar_chart, gauge, stat_card, table, map, heatmap, pie_chart, area_chart, scatter_chart |
| title | string | No | Título del widget (max 200 caracteres) |
| layout | object | No | Posición y tamaño {x, y, w, h} |
| style_config | object | No | Configuración de estilos |
| data_config | object | No | Configuración de datos |
| order_index | number | No | Orden del widget (default: 0) |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": "widget-1",
    "type": "line_chart",
    "title": "Ventas Mensuales",
    "page_id": "page-1",
    "layout": {
      "x": 0,
      "y": 0,
      "w": 6,
      "h": 4
    },
    "order_index": 0,
    "created_at": "2026-02-13T15:45:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | VALIDATION_ERROR | Tipo de widget inválido |

**Notas**:
- Audit log: Sí (CREATE)
- Widget types: line_chart, bar_chart, gauge, stat_card, table, map, heatmap, pie_chart, area_chart, scatter_chart

---

### PATCH /api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId

**Propósito**: Actualizar widget

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| dashboardId | string | Public code del dashboard |
| pageId | string | ID de la página |
| widgetId | string | ID del widget |

**Body** (JSON):
```json
{
  "title": "Ventas Mensuales 2026",
  "layout": {
    "x": 0,
    "y": 0,
    "w": 8,
    "h": 5
  },
  "style_config": {
    "color": "#2ca02c",
    "showLegend": false
  }
}
```

**Campos** (todos opcionales):
| Campo | Tipo | Descripción |
|-------|------|-------------|
| type | string | Nuevo tipo de widget |
| title | string | Nuevo título |
| layout | object | Nueva posición y tamaño |
| style_config | object | Nuevos estilos |
| data_config | object | Nueva configuración de datos |
| order_index | number | Nuevo orden |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "id": "widget-1",
    "type": "line_chart",
    "title": "Ventas Mensuales 2026",
    "page_id": "page-1",
    "layout": {
      "x": 0,
      "y": 0,
      "w": 8,
      "h": 5
    },
    "updated_at": "2026-02-13T16:00:00Z"
  }
}
```

**Notas**:
- Audit log: Sí (UPDATE)

---

### DELETE /api/v1/dashboards/:dashboardId/pages/:pageId/widgets/:widgetId

**Propósito**: Eliminar widget

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| dashboardId | string | Public code del dashboard |
| pageId | string | ID de la página |
| widgetId | string | ID del widget |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Widget eliminado exitosamente"
  }
}
```

**Notas**:
- Audit log: Sí (DELETE)
- Elimina todas las fuentes de datos asociadas

---

## WIDGET DATA SOURCES

### POST /api/v1/dashboards/widgets/:widgetId/data-sources

**Propósito**: Crear fuente de datos para un widget

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| widgetId | string | ID del widget |

**Body** (JSON):
```json
{
  "entity_type": "channel",
  "entity_id": "channel-123",
  "label": "Canal MQTT Principal",
  "series_config": {
    "variable": "temperature",
    "aggregation": "average"
  },
  "order_index": 0
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| entity_type | string | Sí | Tipo: channel, device, site, resource_hierarchy |
| entity_id | string | Sí | ID de la entidad (max 100 caracteres) |
| label | string | No | Etiqueta descriptiva (max 200 caracteres) |
| series_config | object | No | Configuración de series |
| order_index | number | No | Orden (default: 0) |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": "ds-1",
    "widget_id": "widget-1",
    "entity_type": "channel",
    "entity_id": "channel-123",
    "label": "Canal MQTT Principal",
    "order_index": 0,
    "created_at": "2026-02-13T15:45:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | VALIDATION_ERROR | Tipo de entidad inválido |

**Notas**:
- Audit log: Sí (CREATE)
- Entity types: channel, device, site, resource_hierarchy

---

### PATCH /api/v1/dashboards/widgets/:widgetId/data-sources/:dataSourceId

**Propósito**: Actualizar fuente de datos

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| widgetId | string | ID del widget |
| dataSourceId | string | ID de la fuente de datos |

**Body** (JSON):
```json
{
  "label": "Canal MQTT Secundario",
  "series_config": {
    "variable": "humidity",
    "aggregation": "sum"
  }
}
```

**Campos** (todos opcionales):
| Campo | Tipo | Descripción |
|-------|------|-------------|
| entity_type | string | Nuevo tipo de entidad |
| entity_id | string | Nuevo ID de entidad |
| label | string | Nueva etiqueta |
| series_config | object | Nueva configuración |
| order_index | number | Nuevo orden |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "id": "ds-1",
    "widget_id": "widget-1",
    "entity_type": "channel",
    "entity_id": "channel-123",
    "label": "Canal MQTT Secundario",
    "updated_at": "2026-02-13T16:00:00Z"
  }
}
```

**Notas**:
- Audit log: Sí (UPDATE)

---

### DELETE /api/v1/dashboards/widgets/:widgetId/data-sources/:dataSourceId

**Propósito**: Eliminar fuente de datos

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| widgetId | string | ID del widget |
| dataSourceId | string | ID de la fuente de datos |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Fuente de datos eliminada exitosamente"
  }
}
```

**Notas**:
- Audit log: Sí (DELETE)

---

## DASHBOARD COLLABORATORS

### GET /api/v1/dashboards/:id/collaborators

**Propósito**: Listar colaboradores de un dashboard

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del dashboard |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "collab-1",
      "user_id": "user-456",
      "user": {
        "id": "user-456",
        "name": "Juan García",
        "email": "juan@example.com"
      },
      "role": "viewer",
      "created_at": "2026-02-01T12:00:00Z"
    },
    {
      "id": "collab-2",
      "user_id": "user-789",
      "user": {
        "id": "user-789",
        "name": "María López",
        "email": "maria@example.com"
      },
      "role": "editor",
      "created_at": "2026-02-05T14:30:00Z"
    }
  ]
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | NOT_FOUND | Dashboard no encontrado |
| 403 | FORBIDDEN | Sin permisos |

---

### POST /api/v1/dashboards/:id/collaborators

**Propósito**: Agregar colaborador a un dashboard

**Autenticación**: Bearer JWT (requiere ser owner)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del dashboard |

**Body** (JSON):
```json
{
  "user_id": "user-999",
  "role": "viewer"
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| user_id | string | Sí | ID del usuario a agregar |
| role | string | Sí | Rol: viewer, editor |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": "collab-3",
    "user_id": "user-999",
    "role": "viewer",
    "created_at": "2026-02-13T15:45:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | VALIDATION_ERROR | Rol inválido |
| 404 | NOT_FOUND | Usuario o dashboard no encontrado |
| 409 | CONFLICT | Colaborador ya existe |

**Notas**:
- Audit log: Sí (CREATE)
- Roles: viewer, editor

---

### PATCH /api/v1/dashboards/:id/collaborators/:collaboratorId

**Propósito**: Actualizar rol de colaborador

**Autenticación**: Bearer JWT (requiere ser owner)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del dashboard |
| collaboratorId | string | ID del colaborador |

**Body** (JSON):
```json
{
  "role": "editor"
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| role | string | Sí | Nuevo rol: viewer, editor |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "id": "collab-3",
    "user_id": "user-999",
    "role": "editor",
    "updated_at": "2026-02-13T16:00:00Z"
  }
}
```

**Notas**:
- Audit log: Sí (UPDATE)

---

### DELETE /api/v1/dashboards/:id/collaborators/:collaboratorId

**Propósito**: Eliminar colaborador de un dashboard

**Autenticación**: Bearer JWT (requiere ser owner)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del dashboard |
| collaboratorId | string | ID del colaborador |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Colaborador removido exitosamente"
  }
}
```

**Notas**:
- Audit log: Sí (DELETE)

---

## DASHBOARD GROUPS

### GET /api/v1/dashboard-groups

**Propósito**: Listar grupos de dashboards con paginación

**Autenticación**: Bearer JWT

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
      "public_code": "DGR-XXXXX-X",
      "name": "Grupo Ventas",
      "description": "Dashboards de ventas y reportes",
      "is_active": true,
      "owner_id": "user-123",
      "organization_id": "org-123",
      "created_at": "2026-01-20T09:00:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

**Notas**:
- Audit log: No (solo lectura)

---

### GET /api/v1/dashboard-groups/:id

**Propósito**: Obtener un grupo de dashboards específico

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del grupo |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "DGR-XXXXX-X",
    "name": "Grupo Ventas",
    "description": "Dashboards de ventas y reportes",
    "is_active": true,
    "owner_id": "user-123",
    "organization_id": "org-123",
    "dashboards": [
      {
        "public_code": "DSH-AAAAA-A",
        "name": "Dashboard Ventas Diarias",
        "order_index": 0
      },
      {
        "public_code": "DSH-BBBBB-B",
        "name": "Dashboard Ventas Mensuales",
        "order_index": 1
      }
    ],
    "collaborators": [
      {
        "id": "collab-1",
        "user_id": "user-456",
        "role": "viewer"
      }
    ],
    "created_at": "2026-01-20T09:00:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | NOT_FOUND | Grupo no encontrado |

---

### POST /api/v1/dashboard-groups

**Propósito**: Crear nuevo grupo de dashboards

**Autenticación**: Bearer JWT (requiere rol: system-admin, org-admin)

**Body** (JSON):
```json
{
  "name": "Grupo Operaciones",
  "description": "Dashboards de operaciones y monitoreo"
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | Sí | Nombre del grupo (max 200 caracteres) |
| description | string | No | Descripción del grupo |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "public_code": "DGR-YYYYY-Y",
    "name": "Grupo Operaciones",
    "description": "Dashboards de operaciones y monitoreo",
    "is_active": true,
    "owner_id": "user-123",
    "organization_id": "org-123",
    "created_at": "2026-02-13T15:45:00Z"
  }
}
```

**Notas**:
- Audit log: Sí (CREATE)
- Genera public_code automáticamente (DGR-XXXXX-X)

---

### PATCH /api/v1/dashboard-groups/:id

**Propósito**: Actualizar grupo de dashboards

**Autenticación**: Bearer JWT (requiere ser owner o admin)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del grupo |

**Body** (JSON):
```json
{
  "name": "Grupo Operaciones Actualizado",
  "description": "Dashboards de operaciones, monitoreo y alertas",
  "is_active": true
}
```

**Campos** (todos opcionales):
| Campo | Tipo | Descripción |
|-------|------|-------------|
| name | string | Nuevo nombre (max 200 caracteres) |
| description | string | Nueva descripción |
| is_active | boolean | Activar/desactivar grupo |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "DGR-YYYYY-Y",
    "name": "Grupo Operaciones Actualizado",
    "description": "Dashboards de operaciones, monitoreo y alertas",
    "is_active": true,
    "updated_at": "2026-02-13T16:00:00Z"
  }
}
```

**Notas**:
- Audit log: Sí (UPDATE)

---

### DELETE /api/v1/dashboard-groups/:id

**Propósito**: Eliminar grupo de dashboards (soft delete)

**Autenticación**: Bearer JWT (requiere ser owner o admin)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del grupo |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Grupo eliminado exitosamente"
  }
}
```

**Notas**:
- Audit log: Sí (DELETE)
- Soft delete: Marca `deleted_at`, no elimina físicamente
- No elimina los dashboards del grupo

---

## GROUP ITEMS

### POST /api/v1/dashboard-groups/:groupId/dashboards

**Propósito**: Agregar dashboard a un grupo

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| groupId | string | Public code del grupo |

**Body** (JSON):
```json
{
  "dashboard_id": "DSH-XXXXX-X",
  "order_index": 0
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| dashboard_id | string | Sí | Public code del dashboard |
| order_index | number | No | Orden en el grupo (default: 0) |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": "item-1",
    "group_id": "DGR-XXXXX-X",
    "dashboard_id": "DSH-AAAAA-A",
    "order_index": 0,
    "created_at": "2026-02-13T15:45:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | NOT_FOUND | Dashboard o grupo no encontrado |
| 409 | CONFLICT | Dashboard ya existe en el grupo |

**Notas**:
- Audit log: Sí (CREATE)

---

### DELETE /api/v1/dashboard-groups/:groupId/dashboards/:dashboardId

**Propósito**: Remover dashboard de un grupo

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| groupId | string | Public code del grupo |
| dashboardId | string | Public code del dashboard |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Dashboard removido del grupo exitosamente"
  }
}
```

**Notas**:
- Audit log: Sí (DELETE)
- No elimina el dashboard, solo la asociación

---

## GROUP COLLABORATORS

### GET /api/v1/dashboard-groups/:id/collaborators

**Propósito**: Listar colaboradores de un grupo de dashboards

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del grupo |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "collab-1",
      "user_id": "user-456",
      "user": {
        "id": "user-456",
        "name": "Juan García",
        "email": "juan@example.com"
      },
      "role": "viewer",
      "created_at": "2026-02-01T12:00:00Z"
    }
  ]
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | NOT_FOUND | Grupo no encontrado |

---

### POST /api/v1/dashboard-groups/:id/collaborators

**Propósito**: Agregar colaborador a un grupo

**Autenticación**: Bearer JWT (requiere ser owner)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del grupo |

**Body** (JSON):
```json
{
  "user_id": "user-999",
  "role": "editor"
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| user_id | string | Sí | ID del usuario a agregar |
| role | string | Sí | Rol: viewer, editor |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": "collab-2",
    "user_id": "user-999",
    "role": "editor",
    "created_at": "2026-02-13T15:45:00Z"
  }
}
```

**Notas**:
- Audit log: Sí (CREATE)
- Roles: viewer, editor

---

### PATCH /api/v1/dashboard-groups/:id/collaborators/:collaboratorId

**Propósito**: Actualizar rol de colaborador del grupo

**Autenticación**: Bearer JWT (requiere ser owner)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del grupo |
| collaboratorId | string | ID del colaborador |

**Body** (JSON):
```json
{
  "role": "viewer"
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| role | string | Sí | Nuevo rol: viewer, editor |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "id": "collab-2",
    "user_id": "user-999",
    "role": "viewer",
    "updated_at": "2026-02-13T16:00:00Z"
  }
}
```

**Notas**:
- Audit log: Sí (UPDATE)

---

### DELETE /api/v1/dashboard-groups/:id/collaborators/:collaboratorId

**Propósito**: Eliminar colaborador del grupo

**Autenticación**: Bearer JWT (requiere ser owner)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del grupo |
| collaboratorId | string | ID del colaborador |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Colaborador removido exitosamente"
  }
}
```

**Notas**:
- Audit log: Sí (DELETE)
