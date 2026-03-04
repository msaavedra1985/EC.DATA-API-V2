# Telemetry Endpoints

> **Última actualización**: 2026-01-21
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de telemetría.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/telemetry/variables` | Listar variables de medición | Sí |
| GET | `/api/v1/telemetry/data` | Obtener datos de series temporales | Sí |
| POST | `/api/v1/telemetry/data` | Insertar mediciones | Sí / API Key |

---

## GET /api/v1/telemetry/variables

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

## GET /api/v1/telemetry/data

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
