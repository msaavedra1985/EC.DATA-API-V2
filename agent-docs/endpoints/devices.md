# Devices Endpoints

> **Última actualización**: 2026-01-21
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de dispositivos.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/devices` | Listar dispositivos | Sí |
| GET | `/api/v1/devices/:publicCode` | Obtener dispositivo | Sí |
| POST | `/api/v1/devices` | Registrar dispositivo | Sí (admin) |
| PATCH | `/api/v1/devices/:publicCode` | Actualizar dispositivo | Sí (admin) |
| DELETE | `/api/v1/devices/:publicCode` | Eliminar dispositivo | Sí (admin) |

---

## GET /api/v1/devices

**Propósito**: Listar dispositivos IoT/Edge de la organización

**Autenticación**: Bearer JWT

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| limit | number | 20 | Máximo de resultados |
| offset | number | 0 | Offset para paginación |
| site_public_code | string | - | Filtrar por sitio |
| type | string | - | Filtrar por tipo de dispositivo |
| status | string | - | Filtrar por estado (online, offline) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "DEV-XXXXX-X",
      "name": "Sensor Temperatura Lobby",
      "type": "temperature_sensor",
      "serial_number": "SN-12345",
      "status": "online",
      "last_seen": "2025-01-21T10:30:00Z",
      "site_public_code": "SIT-XXXXX-X",
      "is_active": true
    }
  ],
  "meta": {
    "total": 25,
    "limit": 20,
    "offset": 0
  }
}
```

---

## GET /api/v1/devices/:publicCode

**Propósito**: Obtener detalle de un dispositivo

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "DEV-XXXXX-X",
    "name": "Sensor Temperatura Lobby",
    "type": "temperature_sensor",
    "serial_number": "SN-12345",
    "firmware_version": "1.2.3",
    "status": "online",
    "last_seen": "2025-01-21T10:30:00Z",
    "site": {
      "public_code": "SIT-XXXXX-X",
      "name": "Lobby Principal"
    },
    "channels": [
      {
        "public_code": "CHN-XXXXX-X",
        "name": "MQTT Principal"
      }
    ],
    "metadata": {
      "manufacturer": "SensorCorp",
      "model": "TC-100"
    },
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

## POST /api/v1/devices

**Propósito**: Registrar nuevo dispositivo

**Autenticación**: Bearer JWT (requiere rol admin)

**Body**:
```json
{
  "name": "Sensor Humedad Cocina",
  "type": "humidity_sensor",
  "serial_number": "SN-67890",
  "site_public_code": "SIT-XXXXX-X",
  "channel_public_codes": ["CHN-XXXXX-X"],
  "metadata": {
    "manufacturer": "SensorCorp",
    "model": "HM-200"
  }
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | Sí | Nombre del dispositivo |
| type | string | Sí | Tipo de dispositivo |
| serial_number | string | No | Número de serie |
| site_public_code | string | No | Sitio donde está instalado |
| channel_public_codes | array | No | Canales de comunicación |
| metadata | object | No | Datos adicionales |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "public_code": "DEV-YYYYY-Y",
    "name": "Sensor Humedad Cocina",
    "api_key": "dk_xxxxxxxxxxxxxxxx"
  }
}
```

**Notas**:
- Audit log: CREATE
- Genera `api_key` para autenticación M2M del dispositivo
- El `api_key` solo se muestra una vez en la creación

---

## PATCH /api/v1/devices/:publicCode

**Propósito**: Actualizar dispositivo

**Autenticación**: Bearer JWT (requiere rol admin)

**Body** (todos opcionales):
```json
{
  "name": "Sensor Humedad Cocina - Actualizado",
  "site_public_code": "SIT-YYYYY-Y",
  "is_active": true
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "DEV-YYYYY-Y",
    "name": "Sensor Humedad Cocina - Actualizado"
  }
}
```

**Notas**:
- Audit log: UPDATE con changes

---

## DELETE /api/v1/devices/:publicCode

**Propósito**: Eliminar dispositivo (soft delete)

**Autenticación**: Bearer JWT (requiere rol admin)

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Dispositivo eliminado exitosamente"
  }
}
```

**Notas**:
- Audit log: DELETE
- Soft delete
- Revoca el `api_key` del dispositivo
