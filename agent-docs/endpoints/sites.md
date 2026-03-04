# Sites Endpoints

> **Última actualización**: 2026-01-21
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de sitios.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/sites` | Listar sitios | Sí |
| GET | `/api/v1/sites/:publicCode` | Obtener sitio | Sí |
| POST | `/api/v1/sites` | Crear sitio | Sí (admin) |
| PATCH | `/api/v1/sites/:publicCode` | Actualizar sitio | Sí (admin) |
| DELETE | `/api/v1/sites/:publicCode` | Eliminar sitio | Sí (admin) |

---

## GET /api/v1/sites

**Propósito**: Listar sitios de la organización activa

**Autenticación**: Bearer JWT

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| limit | number | 20 | Máximo de resultados |
| offset | number | 0 | Offset para paginación |
| search | string | - | Buscar por nombre |
| is_active | boolean | - | Filtrar por estado |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "SIT-XXXXX-X",
      "name": "Lobby Principal",
      "description": "Área de recepción",
      "address": "Av. Example 123",
      "coordinates": {
        "lat": -12.0464,
        "lng": -77.0428
      },
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "limit": 20,
    "offset": 0
  }
}
```

---

## GET /api/v1/sites/:publicCode

**Propósito**: Obtener detalle de un sitio

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "SIT-XXXXX-X",
    "name": "Lobby Principal",
    "description": "Área de recepción del hotel",
    "address": "Av. Example 123, Lima",
    "coordinates": {
      "lat": -12.0464,
      "lng": -77.0428
    },
    "timezone": "America/Lima",
    "metadata": {
      "floor": 1,
      "capacity": 50
    },
    "is_active": true,
    "organization_public_code": "ORG-XXXXX-X",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-15T00:00:00Z"
  }
}
```

---

## POST /api/v1/sites

**Propósito**: Crear nuevo sitio en la organización activa

**Autenticación**: Bearer JWT (requiere rol admin)

**Body**:
```json
{
  "name": "Restaurante Principal",
  "description": "Área de comedor",
  "address": "Av. Example 123, Piso 2",
  "coordinates": {
    "lat": -12.0464,
    "lng": -77.0428
  },
  "timezone": "America/Lima",
  "metadata": {
    "floor": 2,
    "capacity": 100
  }
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | Sí | Nombre del sitio |
| description | string | No | Descripción |
| address | string | No | Dirección física |
| coordinates | object | No | `{ lat, lng }` |
| timezone | string | No | Zona horaria (default: org timezone) |
| metadata | object | No | Datos adicionales flexibles |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "public_code": "SIT-YYYYY-Y",
    "name": "Restaurante Principal"
  }
}
```

**Notas**:
- Audit log: CREATE
- Se asigna automáticamente a la organización activa

---

## PATCH /api/v1/sites/:publicCode

**Propósito**: Actualizar sitio

**Autenticación**: Bearer JWT (requiere rol admin)

**Body** (todos opcionales):
```json
{
  "name": "Restaurante Principal - Renovado",
  "is_active": true
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "SIT-YYYYY-Y",
    "name": "Restaurante Principal - Renovado"
  }
}
```

**Notas**:
- Audit log: UPDATE con changes

---

## DELETE /api/v1/sites/:publicCode

**Propósito**: Eliminar sitio (soft delete)

**Autenticación**: Bearer JWT (requiere rol admin)

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Sitio eliminado exitosamente"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | HAS_DEVICES | Tiene dispositivos asociados activos |

**Notas**:
- Audit log: DELETE
- Soft delete
