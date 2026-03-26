# Devices Endpoints

> **Última actualización**: 2026-03-26
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

**Propósito**: Registrar nuevo dispositivo (con canales opcionales, creación atómica)

**Autenticación**: Bearer JWT (requiere rol `system-admin` o `org-admin`)

**Middleware**: `enforceActiveOrganization` resuelve la org activa del JWT

**Body**:
```json
{
  "name": "Equipo prueba Atria",
  "organizationId": "ORG-XXXXX-X",
  "siteId": "SIT-XXXXX-X",
  "deviceTypeId": 1,
  "brandId": 4,
  "modelId": 17,
  "serialNumber": "SN-12345",
  "channels": [
    {
      "name": "Canal 1 Energia",
      "description": "Medición eléctrica trifásica",
      "channelIndex": 1,
      "measurementTypeId": 1,
      "system": "Trifásico",
      "phase": 1
    },
    {
      "name": "Canal 1 IOT",
      "channelIndex": 1,
      "measurementTypeId": 3,
      "val1": "Analog In",
      "val2": "Pulso"
    }
  ]
}
```

**Campos del device**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | Sí | Nombre del dispositivo (max 200) |
| organizationId | string | No | Public code de la organización. Si no se envía, usa la org activa del JWT |
| siteId | string | No | Public code del sitio |
| deviceTypeId | integer | No | FK catálogo tipo de dispositivo |
| brandId | integer | No | FK catálogo marca |
| modelId | integer | No | FK catálogo modelo |
| serialNumber | string | No | Número de serie |
| uuid | string | No | UUID externo (si se quiere asignar uno específico) |
| firmwareVersion | string | No | Versión de firmware |
| ipAddress | string | No | Dirección IP |
| macAddress | string | No | Dirección MAC |
| topic | string | No | Topic MQTT |
| metadata | object | No | Datos adicionales |
| isActive | boolean | No | Default: true |
| channels | array | No | Canales a crear junto con el dispositivo (max 50) |

**Campos de cada channel** (dentro de `channels[]`):
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | Sí | Nombre del canal (max 200) |
| description | string | No | Descripción (max 5000) |
| channelIndex | integer | No | Índice físico del canal (→ `ch` en DB) |
| measurementTypeId | integer | No | FK tipo de medición |
| system | string | No | "Trifásico" → 3, "Monofásico" → 1, null → 0 (→ `phaseSystem`) |
| phase | integer | No | Número de fase (1, 2, 3) |
| process | boolean | No | Default: true |
| status | enum | No | active, inactive, error, disabled. Default: active |
| isActive | boolean | No | Default: true |
| metadata | object | No | Datos adicionales |
| val1..val8 | string/number | No | Solo para IOT (measurementTypeId=3): IDs de variables de la tabla `variables`. Cada valX crea un registro en `channel_variables` |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": "DEV-YYYYY-Y",
    "name": "Equipo prueba Atria",
    "organization": {
      "id": "ORG-XXXXX-X",
      "slug": "hotel-libertador",
      "name": "Hotel Libertador"
    },
    "channels": [
      {
        "id": "CHN-AAAAA-A",
        "name": "Canal 1 electrico",
        "ch": 1,
        "measurementTypeId": 1,
        "phaseSystem": 3,
        "status": "active"
      },
      {
        "id": "CHN-BBBBB-B",
        "name": "Canal 1 IOT",
        "ch": 1,
        "measurementTypeId": 3,
        "phaseSystem": 0,
        "status": "active",
        "variables": [
          { "variableId": 22, "displayOrder": 1 },
          { "variableId": 50, "displayOrder": 2 },
          { "variableId": 75, "displayOrder": 3 },
          { "variableId": 28, "displayOrder": 4 }
        ]
      }
    ]
  }
}
```

**Notas**:
- `organizationId` es opcional: si no se envía, usa la organización activa del JWT del usuario
- Solo `system-admin` y `org-admin` necesitarían enviar `organizationId` explícito para crear en otra org
- Los canales se crean atómicamente con el device (transacción SQL). Si falla un canal, no se crea nada
- `system` acepta texto ("Trifásico", "Monofásico", "N/A") y se convierte a `phaseSystem` (3, 1, 0)
- **val1..val8 para IOT**: son IDs de variables (tabla `variables`, `measurement_type_id=3`). Se crean registros en `channel_variables` vinculando canal → variable. Se valida que existan y pertenezcan al tipo IOT
- **Canales eléctricos**: NO se crean `channel_variables`. Se asume que pueden leer todas las variables eléctricas
- Audit log: CREATE para device + CREATE para cada canal (con `createdVia: "device-inline"` y `variablesAssigned`)
- Invalida cache de devices y channels

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
