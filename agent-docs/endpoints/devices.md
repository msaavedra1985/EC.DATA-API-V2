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
| limit | number | 20 | Máximo de resultados (1-100) |
| offset | number | 0 | Offset para paginación |
| site_id | string | - | Filtrar por sitio (public_code) |
| device_type_id | number | - | Filtrar por tipo de dispositivo (FK catálogo) |
| status | string | - | Filtrar por estado (active, inactive, maintenance, decommissioned) |
| search | string | - | Buscar por nombre o serial_number (iLike) |
| include_channels | string | false | Si `true`, incluye array de canales del dispositivo |
| is_active | string | - | Filtrar por activo/inactivo (`true`/`false`) |
| all | string | - | Solo admins: `true` muestra devices de todas las orgs |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "DEV-XXXXX-X",
      "name": "Sensor Temperatura Lobby",
      "serial_number": "SN-12345",
      "status": "active",
      "last_seen_at": "2025-01-21T10:30:00Z",
      "organization": {
        "id": "ORG-XXXXX-X",
        "slug": "hotel-libertador",
        "name": "Hotel Libertador",
        "logo_url": null
      },
      "site": {
        "id": "SIT-XXXXX-X",
        "name": "Lobby Principal",
        "city": "Lima",
        "country_code": "PE"
      },
      "channels": [
        {
          "id": "CHN-XXXXX-X",
          "name": "Temperatura Ambiente",
          "description": "Canal de temperatura",
          "status": "active",
          "measurement_type_id": 1,
          "unit": "°C"
        }
      ],
      "is_active": true
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 20
  }
}
```

**Notas**:
- `channels` solo se incluye si `include_channels=true`
- `organization` siempre se incluye con datos básicos (id, slug, name, logo_url)
- Paginación usa `distinct: true` para conteo correcto con JOINs

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
