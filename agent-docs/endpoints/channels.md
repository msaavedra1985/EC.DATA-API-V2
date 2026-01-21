# Channels Endpoints

> **Última actualización**: 2026-01-21
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de canales.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/channels` | Listar canales | Sí |
| GET | `/api/v1/channels/:publicCode` | Obtener canal | Sí |
| POST | `/api/v1/channels` | Crear canal | Sí (admin) |
| PATCH | `/api/v1/channels/:publicCode` | Actualizar canal | Sí (admin) |
| DELETE | `/api/v1/channels/:publicCode` | Eliminar canal | Sí (admin) |

---

## GET /api/v1/channels

**Propósito**: Listar canales de comunicación de la organización

**Autenticación**: Bearer JWT

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| limit | number | 20 | Máximo de resultados |
| offset | number | 0 | Offset para paginación |
| type | string | - | Filtrar por tipo (mqtt, http, websocket) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "CHN-XXXXX-X",
      "name": "MQTT Principal",
      "type": "mqtt",
      "status": "connected",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
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

## GET /api/v1/channels/:publicCode

**Propósito**: Obtener detalle de un canal

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "CHN-XXXXX-X",
    "name": "MQTT Principal",
    "type": "mqtt",
    "config": {
      "broker_url": "mqtt://broker.example.com:1883",
      "topic_prefix": "hotel/lima"
    },
    "status": "connected",
    "last_message_at": "2025-01-21T10:30:00Z",
    "devices_count": 10,
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

## POST /api/v1/channels

**Propósito**: Crear nuevo canal de comunicación

**Autenticación**: Bearer JWT (requiere rol admin)

**Body**:
```json
{
  "name": "HTTP Webhook",
  "type": "http",
  "config": {
    "endpoint_url": "https://api.example.com/webhook",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer xxx"
    }
  }
}
```

**Tipos soportados**:
| Tipo | Config requerida |
|------|------------------|
| mqtt | `broker_url`, `topic_prefix` |
| http | `endpoint_url`, `method` |
| websocket | `ws_url` |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "public_code": "CHN-YYYYY-Y",
    "name": "HTTP Webhook",
    "type": "http"
  }
}
```

**Notas**:
- Audit log: CREATE
- Validación de config según tipo

---

## PATCH /api/v1/channels/:publicCode

**Propósito**: Actualizar canal

**Autenticación**: Bearer JWT (requiere rol admin)

**Body** (todos opcionales):
```json
{
  "name": "HTTP Webhook - Producción",
  "config": {
    "endpoint_url": "https://prod.example.com/webhook"
  },
  "is_active": true
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "CHN-YYYYY-Y",
    "name": "HTTP Webhook - Producción"
  }
}
```

**Notas**:
- Audit log: UPDATE con changes

---

## DELETE /api/v1/channels/:publicCode

**Propósito**: Eliminar canal (soft delete)

**Autenticación**: Bearer JWT (requiere rol admin)

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Canal eliminado exitosamente"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | HAS_DEVICES | Tiene dispositivos asociados |

**Notas**:
- Audit log: DELETE
- Soft delete
