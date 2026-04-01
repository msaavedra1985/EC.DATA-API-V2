# Telemetry Endpoints

> **Última actualización**: 2026-04-01
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de telemetría.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/telemetry/variables` | ~~Listar variables de medición~~ **DEPRECATED** | Sí |
| GET | `/api/v1/telemetry/data` | ~~Obtener datos de series temporales~~ **DEPRECATED** | Sí |
| POST | `/api/v1/telemetry/data` | Insertar mediciones | Sí / API Key |
| GET | `/api/v1/telemetry/channels/:channelId/data` | Obtener datos del canal para el analyzer (E1) | Sí |
| GET | `/api/v1/telemetry/channels/:channelId/variables` | Catálogo de variables del canal (E2) | Sí |
| GET | `/api/v1/telemetry/channels/:channelId/annotations` | Listar anotaciones del canal en un período (E3) | Sí |
| POST | `/api/v1/telemetry/channels/:channelId/annotations` | Crear anotación en el canal (E3) | Sí |
| PUT | `/api/v1/telemetry/channels/:channelId/annotations/:annotationId` | Actualizar una anotación (E3) | Sí (autor o admin) |
| DELETE | `/api/v1/telemetry/channels/:channelId/annotations/:annotationId` | Eliminar una anotación (E3) | Sí (autor o admin) |

> **Nota**: Los endpoints del Data Analyzer (E1–E4, E6) están documentados en [`data-analyzer.md`](./data-analyzer.md).

---

## ~~GET /api/v1/telemetry/variables~~ (DEPRECATED)

> **DEPRECATED**: Este endpoint usa el formato antiguo con `device_public_code` y `variable_id` como strings. Para el catálogo de variables del analyzer, usar `GET /api/v1/telemetry/channels/:channelId/variables` documentado en [`data-analyzer.md`](./data-analyzer.md) (E2).

**Propósito**: Listar variables de medición disponibles

**Autenticación**: Bearer JWT

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| device_public_code | string | - | Filtrar por dispositivo |
| type | string | - | Filtrar por tipo (temperature, humidity, etc.) |
| lang | string | es | Idioma para nombres (es, en) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "temperature_ambient",
      "name": "Temperatura Ambiente",
      "unit": "°C",
      "type": "temperature",
      "description": "Temperatura del aire en el ambiente"
    },
    {
      "id": "humidity_relative",
      "name": "Humedad Relativa",
      "unit": "%",
      "type": "humidity",
      "description": "Porcentaje de humedad en el aire"
    }
  ]
}
```

**Notas**:
- Las variables tienen nombres multi-idioma
- Las unidades son estándar (SI)

---

## ~~GET /api/v1/telemetry/data~~ (DEPRECATED)

> **DEPRECATED**: Este endpoint usa el formato antiguo con `device_public_code` y `variable_id` como strings. Para datos del analyzer, usar `GET /api/v1/telemetry/channels/:channelId/data` documentado en [`data-analyzer.md`](./data-analyzer.md) (E1), que soporta comparación mediante `comparisonFrom` / `comparisonTo`.

**Propósito**: Obtener datos de series temporales desde Cassandra

**Autenticación**: Bearer JWT

**Query Parameters**:
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| device_public_code | string | Sí | Dispositivo |
| variable_id | string | Sí | Variable a consultar |
| from | string | Sí | Fecha inicio (ISO 8601) |
| to | string | Sí | Fecha fin (ISO 8601) |
| aggregation | string | No | raw, hourly, daily (default: raw) |
| timezone | string | No | Zona horaria (default: UTC) |
| limit | number | No | Máximo de puntos (default: 1000) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "device_public_code": "DEV-XXXXX-X",
    "variable": {
      "id": "temperature_ambient",
      "name": "Temperatura Ambiente",
      "unit": "°C"
    },
    "points": [
      {
        "timestamp": "2025-01-21T10:00:00Z",
        "value": 23.5
      },
      {
        "timestamp": "2025-01-21T10:05:00Z",
        "value": 23.7
      }
    ],
    "aggregation": "raw",
    "timezone": "America/Lima"
  },
  "meta": {
    "total_points": 288,
    "from": "2025-01-21T00:00:00Z",
    "to": "2025-01-21T23:59:59Z"
  }
}
```

**Agregaciones**:
| Tipo | Descripción |
|------|-------------|
| raw | Datos sin procesar |
| hourly | Promedio por hora |
| daily | Promedio por día |

**Notas**:
- Backend: Apache Cassandra (keyspace `sensores`)
- Filtrado timezone-aware
- Límite default de 1000 puntos para evitar responses muy grandes

---

## POST /api/v1/telemetry/data

**Propósito**: Insertar mediciones desde dispositivos

**Autenticación**: Bearer JWT o API Key de dispositivo

**Headers**:
| Header | Descripción |
|--------|-------------|
| Authorization | `Bearer {jwt}` o `ApiKey {device_api_key}` |

**Body**:
```json
{
  "device_public_code": "DEV-XXXXX-X",
  "measurements": [
    {
      "variable_id": "temperature_ambient",
      "value": 23.5,
      "timestamp": "2025-01-21T10:00:00Z"
    },
    {
      "variable_id": "humidity_relative",
      "value": 65.2,
      "timestamp": "2025-01-21T10:00:00Z"
    }
  ]
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| device_public_code | string | Sí | Dispositivo que envía datos |
| measurements | array | Sí | Array de mediciones |
| measurements[].variable_id | string | Sí | ID de la variable |
| measurements[].value | number | Sí | Valor numérico |
| measurements[].timestamp | string | No | ISO 8601 (default: now) |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "inserted": 2,
    "device_public_code": "DEV-XXXXX-X"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | INVALID_VARIABLE | Variable no existe |
| 403 | DEVICE_MISMATCH | API Key no corresponde al dispositivo |

**Notas**:
- Soporta batch de múltiples mediciones
- Timestamp opcional (usa server time si no se envía)
- Rate limit más alto para dispositivos (100 req/min)

---

## GET /api/v1/telemetry/channels/:channelId/annotations

**Propósito**: Obtener anotaciones del canal en un período de tiempo.

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| channelId | UUID | ID del canal |

**Query Parameters**:
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| from | string | Sí | Fecha inicio (YYYY-MM-DD o Unix ms) |
| to | string | Sí | Fecha fin (YYYY-MM-DD o Unix ms) |

**Visibilidad**:
- Las anotaciones `public` son visibles para todos los usuarios autenticados.
- Las anotaciones `private` solo son visibles al autor que las creó.

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid-annotation-1",
      "channelId": "uuid-channel-1",
      "from": 1700000000000,
      "to": 1700003600000,
      "text": "Mantenimiento preventivo realizado",
      "category": "maintenance",
      "visibility": "public",
      "author": {
        "id": "uuid-user-1",
        "name": "Juan Pérez"
      },
      "attachments": [],
      "createdAt": "2025-01-21T10:00:00.000Z",
      "updatedAt": "2025-01-21T10:00:00.000Z"
    }
  ]
}
```

**Notas**:
- Las anotaciones son point-in-time cuando `from === to`, o range cuando `from < to`.
- El campo `attachments` siempre retorna `[]` (sin adjuntos implementados aún).
- Los timestamps `from` y `to` en la respuesta son Unix ms (número).

---

## POST /api/v1/telemetry/channels/:channelId/annotations

**Propósito**: Crear una nueva anotación en el canal.

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| channelId | UUID | ID del canal |

**Body**:
```json
{
  "from": 1700000000000,
  "to": 1700003600000,
  "text": "Mantenimiento preventivo realizado",
  "category": "maintenance",
  "visibility": "public"
}
```

**Campos**:
| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| from | number | Sí | - | Timestamp Unix ms inicio |
| to | number | Sí | - | Timestamp Unix ms fin (igual a from para point-in-time) |
| text | string | Sí | - | Contenido de la anotación |
| category | string | No | `observation` | `observation` \| `incident` \| `maintenance` \| `alert_auto` |
| visibility | string | No | `public` | `public` \| `private` |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": "uuid-annotation-1",
    "channelId": "uuid-channel-1",
    "from": 1700000000000,
    "to": 1700003600000,
    "text": "Mantenimiento preventivo realizado",
    "category": "maintenance",
    "visibility": "public",
    "author": {
      "id": "uuid-user-1",
      "name": "Juan Pérez"
    },
    "attachments": [],
    "createdAt": "2025-01-21T10:00:00.000Z",
    "updatedAt": "2025-01-21T10:00:00.000Z"
  }
}
```

**Notas**:
- El campo `authorId` se asigna automáticamente desde el JWT del usuario autenticado.
- `from` debe ser menor o igual a `to`.

---

## PUT /api/v1/telemetry/channels/:channelId/annotations/:annotationId

**Propósito**: Actualizar una anotación existente (patch parcial).

**Autenticación**: Bearer JWT — Solo el autor o un admin (`system-admin` / `org-admin`) puede editar.

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| channelId | UUID | ID del canal |
| annotationId | UUID | ID de la anotación |

**Body** (todos los campos son opcionales):
```json
{
  "text": "Texto actualizado",
  "category": "incident",
  "visibility": "private"
}
```

**Campos editables**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| from | number | Timestamp Unix ms inicio |
| to | number | Timestamp Unix ms fin |
| text | string | Contenido de la anotación |
| category | string | `observation` \| `incident` \| `maintenance` \| `alert_auto` |
| visibility | string | `public` \| `private` |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": { ... }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | VALIDATION_ERROR | Campos inválidos o sin campos para actualizar |
| 403 | FORBIDDEN | El usuario no es el autor ni tiene rol admin |
| 404 | NOT_FOUND | Anotación no encontrada o no pertenece al canal |

---

## DELETE /api/v1/telemetry/channels/:channelId/annotations/:annotationId

**Propósito**: Eliminar una anotación.

**Autenticación**: Bearer JWT — Solo el autor o un admin (`system-admin` / `org-admin`) puede eliminar.

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| channelId | UUID | ID del canal |
| annotationId | UUID | ID de la anotación |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "deleted": true,
    "id": "uuid-annotation-1"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 403 | FORBIDDEN | El usuario no es el autor ni tiene rol admin |
| 404 | NOT_FOUND | Anotación no encontrada o no pertenece al canal |
