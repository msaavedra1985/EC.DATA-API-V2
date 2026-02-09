# Organizations Endpoints

> **Última actualización**: 2026-02-09
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de organizaciones.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/organizations` | Listar organizaciones | Sí |
| GET | `/api/v1/organizations/:publicCode` | Obtener organización | Sí |
| POST | `/api/v1/organizations` | Crear organización | Sí (admin) |
| PATCH | `/api/v1/organizations/:publicCode` | Actualizar organización | Sí (admin) |
| DELETE | `/api/v1/organizations/:publicCode` | Eliminar organización | Sí (system-admin) |

---

## GET /api/v1/organizations

**Propósito**: Listar organizaciones accesibles por el usuario

**Autenticación**: Bearer JWT

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| limit | number | 20 | Máximo de resultados |
| offset | number | 0 | Offset para paginación |
| parent_id | string | - | Filtrar por parent (public_code) |
| include_children | boolean | false | Incluir sub-organizaciones |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "ORG-XXXXX-X",
      "name": "Hoteles Libertador",
      "parent_public_code": null,
      "type": "corporation",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    },
    {
      "public_code": "ORG-YYYYY-Y",
      "name": "Hotel Lima",
      "parent_public_code": "ORG-XXXXX-X",
      "type": "hotel",
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

**Notas**:
- Usuarios normales ven solo sus organizaciones asignadas
- System-admin en God View ve todas

---

## GET /api/v1/organizations/:publicCode

**Propósito**: Obtener detalle de una organización

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| publicCode | string | Public code (ej: `ORG-XXXXX-X`) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "ORG-XXXXX-X",
    "name": "Hoteles Libertador",
    "description": "Cadena hotelera nacional",
    "type": "corporation",
    "parent_public_code": null,
    "settings": {
      "timezone": "America/Lima",
      "currency": "PEN"
    },
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-15T00:00:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | NOT_FOUND | Organización no encontrada |
| 403 | FORBIDDEN | Sin acceso a esta organización |

---

## POST /api/v1/organizations

**Propósito**: Crear nueva organización

**Autenticación**: Bearer JWT (requiere rol admin o system-admin)

**Body**:
```json
{
  "name": "Hotel Cusco",
  "description": "Sucursal en Cusco",
  "parent_id": "ORG-XXXXX-X",
  "countries": [
    { "code": "PE", "is_primary": true },
    { "code": "CO", "is_primary": false }
  ],
  "config": {
    "business": { "industry": "hospitality" }
  }
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | Sí | Nombre (2-200 chars) |
| slug | string | No | Slug único (auto-generado si no se envía) |
| description | string | No | Descripción (hasta 5000 chars) |
| parent_id | string | No | Public code del padre (para jerarquía) |
| countries | array | Sí | Países donde opera (mínimo 1) |
| countries[].code | string | Sí | Código ISO 3166-1 alpha-2 (ej: "MX", "PE") |
| countries[].is_primary | boolean | No | Si es el país principal (exactamente 1 debe ser true) |
| tax_id | string | No | RFC o Tax ID |
| email | string | No | Email de contacto |
| phone | string | No | Teléfono |
| address | string | No | Dirección |
| logo_url | string | No | URL del logo |
| config | object | No | Configuraciones personalizadas JSON |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "public_code": "ORG-ZZZZZ-Z",
    "name": "Hotel Cusco",
    "parent_public_code": "ORG-XXXXX-X",
    "countries": [
      { "code": "PE", "is_primary": true },
      { "code": "CO", "is_primary": false }
    ],
    "primary_country": "PE"
  }
}
```

**Notas**:
- Audit log: CREATE
- Genera public_code automáticamente
- Si tiene `parent_id`, hereda permisos del padre
- Si solo se envía 1 país, se marca automáticamente como primary
- Si ningún país es primary, el primero se asigna como primary
- `selected_users` se acepta pero se ignora (no se procesa aún)

---

## PATCH /api/v1/organizations/:publicCode

**Propósito**: Actualizar organización

**Autenticación**: Bearer JWT (requiere rol admin de la organización)

**Body** (todos opcionales):
```json
{
  "name": "Hotel Cusco - Centro",
  "description": "Nueva descripción",
  "countries": [
    { "code": "PE", "is_primary": true },
    { "code": "CL", "is_primary": false }
  ],
  "config": {
    "business": { "industry": "hospitality" }
  }
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "ORG-ZZZZZ-Z",
    "name": "Hotel Cusco - Centro",
    "countries": [
      { "code": "PE", "is_primary": true },
      { "code": "CL", "is_primary": false }
    ],
    "primary_country": "PE"
  }
}
```

**Notas**:
- Audit log: UPDATE con changes
- Al enviar `countries`, reemplaza todos los países (delete + insert)
- Mismas validaciones que en creación (mínimo 1 país, exactamente 1 primary)

---

## DELETE /api/v1/organizations/:publicCode

**Propósito**: Eliminar organización (soft delete)

**Autenticación**: Bearer JWT (requiere rol system-admin)

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Organización eliminada exitosamente"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | HAS_CHILDREN | Tiene sub-organizaciones activas |
| 400 | HAS_USERS | Tiene usuarios asignados |
| 403 | FORBIDDEN | No es system-admin |

**Notas**:
- Audit log: DELETE
- Soft delete: Marca `deleted_at`
- Requiere que no tenga hijos ni usuarios activos
