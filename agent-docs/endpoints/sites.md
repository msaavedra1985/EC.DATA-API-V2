# Sites Endpoints

> **Última actualización**: 2026-03-19
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de sitios.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/sites` | Listar sitios | Sí |
| GET | `/api/v1/sites/:id` | Obtener sitio | Sí |
| POST | `/api/v1/sites` | Crear sitio | Sí (admin) |
| PUT | `/api/v1/sites/:id` | Actualizar sitio | Sí (admin) |
| DELETE | `/api/v1/sites/:id` | Eliminar sitio | Sí (system-admin) |

---

## GET /api/v1/sites

**Propósito**: Listar sitios con paginación y filtros

**Autenticación**: Bearer JWT

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| organizationId | string | - | Filtrar por organización específica (public code). Si no se especifica, usa la organización activa del usuario |
| all | string (`"true"/"false"`) | - | Solo admins: si es `"true"`, muestra todos los sites sin filtrar por organización |
| countryCode | string (2 chars) | - | Filtrar por país (ISO 3166-1 alpha-2, ej: `"AR"`) |
| isActive | string (`"true"/"false"`) | - | Filtrar por estado activo |
| city | string | - | Filtrar por ciudad |
| notInHierarchy | string (`"true"/"false"`) | - | Si es `"true"`, muestra solo sites que NO están en ninguna jerarquía de recursos |
| page | number (≥1) | - | Página (si se usa, calcula offset automáticamente) |
| limit | number | 20 | Máximo de resultados |
| offset | number | 0 | Offset para paginación |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "SITE-abc123xyz-1",
      "name": "Lobby Principal",
      "description": "Área de recepción",
      "address": "Av. Example 123",
      "latitude": -12.0464,
      "longitude": -77.0428,
      "city": "Lima",
      "isActive": true,
      "organization": {
        "id": "ORG-XXXXX-X",
        "slug": "mi-organizacion",
        "name": "Mi Organización",
        "logoUrl": null
      },
      "country": {
        "id": 10,
        "isoAlpha2": "PE",
        "isoAlpha3": "PER",
        "phoneCode": "51"
      }
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "timestamp": "2026-03-19T00:00:00.000Z",
    "locale": "es",
    "organizationFilter": {}
  }
}
```

---

## GET /api/v1/sites/:id

**Propósito**: Obtener detalle de un sitio por su public code

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "id": "SITE-abc123xyz-1",
    "name": "Lobby Principal",
    "description": "Área de recepción del hotel",
    "address": "Av. Example 123, Lima",
    "streetNumber": "123",
    "city": "Lima",
    "stateProvince": "Lima",
    "postalCode": "15001",
    "latitude": -12.0464,
    "longitude": -77.0428,
    "timezone": "America/Lima",
    "buildingType": "hotel",
    "areaM2": 1200.5,
    "floors": 3,
    "operatingHours": "Lun-Dom 0:00-23:59",
    "imageUrl": "https://example.com/site.jpg",
    "contactName": "Juan Pérez",
    "contactPhone": "+51-1-5555-0300",
    "contactEmail": "contacto@site.com",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z",
    "organization": {
      "id": "ORG-XXXXX-X",
      "slug": "mi-organizacion",
      "name": "Mi Organización",
      "logoUrl": null
    },
    "country": {
      "id": 10,
      "isoAlpha2": "PE",
      "isoAlpha3": "PER",
      "phoneCode": "51"
    }
  },
  "meta": {
    "timestamp": "2026-03-19T00:00:00.000Z",
    "locale": "es"
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
  "organizationId": "ORG-XXXXX-X",
  "name": "Restaurante Principal",
  "countryCode": "PE",
  "description": "Área de comedor",
  "address": "Av. Example 123, Piso 2",
  "streetNumber": "123",
  "city": "Lima",
  "stateProvince": "Lima",
  "postalCode": "15001",
  "latitude": -12.0464,
  "longitude": -77.0428,
  "timezone": "America/Lima",
  "buildingType": "restaurant",
  "areaM2": 500.0,
  "floors": 1,
  "operatingHours": "Lun-Dom 12:00-22:00",
  "imageUrl": "https://example.com/site.jpg",
  "contactName": "Juan Pérez",
  "contactPhone": "+51-1-5555-0300",
  "contactEmail": "contacto@site.com"
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| organizationId | string | Sí | Public code de la organización a la que pertenece el sitio |
| name | string | Sí | Nombre del sitio (máx 200 chars) |
| countryCode | string (2 chars) | Sí | Código de país ISO 3166-1 alpha-2 (ej: `"PE"`, `"AR"`) |
| description | string | No | Descripción (máx 5000 chars) |
| address | string | No | Dirección completa (máx 500 chars) |
| streetNumber | string | No | Número de calle (máx 20 chars) |
| city | string | No | Ciudad (máx 100 chars) |
| stateProvince | string | No | Provincia/Estado (máx 100 chars) |
| postalCode | string | No | Código postal (máx 20 chars) |
| latitude | number | No | Latitud GPS (-90 a 90) |
| longitude | number | No | Longitud GPS (-180 a 180) |
| timezone | string | No | Zona horaria (máx 100 chars) |
| buildingType | string (enum) | No | Tipo de edificio: `office`, `warehouse`, `factory`, `retail`, `hospital`, `school`, `datacenter`, `hotel`, `restaurant`, `residential`, `mixed`, `other` |
| areaM2 | number | No | Área en metros cuadrados (positivo) |
| floors | number (entero) | No | Número de pisos (entero positivo) |
| operatingHours | string | No | Horario de operación (máx 200 chars) |
| imageUrl | string (URL) | No | URL de imagen del sitio (máx 500 chars) |
| contactName | string | No | Nombre del contacto (máx 100 chars) |
| contactPhone | string | No | Teléfono del contacto (máx 50 chars) |
| contactEmail | string (email) | No | Email del contacto (máx 100 chars) |
| isActive | boolean | No | Estado activo (default: `true`) |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "id": "SITE-YYYYY-Y",
    "name": "Restaurante Principal",
    "description": "Área de comedor",
    "latitude": -12.0464,
    "longitude": -77.0428,
    "address": "Av. Example 123, Piso 2",
    "city": "Lima",
    "isActive": true,
    "organization": {
      "id": "ORG-XXXXX-X",
      "slug": "mi-organizacion",
      "name": "Mi Organización",
      "logoUrl": null
    },
    "country": {
      "id": 10,
      "isoAlpha2": "PE",
      "isoAlpha3": "PER",
      "phoneCode": "51"
    }
  },
  "meta": {
    "timestamp": "2026-03-19T00:00:00.000Z",
    "locale": "es"
  }
}
```

**Notas**:
- Audit log: CREATE
- `organizationId` en el body indica la organización a la que pertenece el sitio

---

## PUT /api/v1/sites/:id

**Propósito**: Actualizar sitio existente

**Autenticación**: Bearer JWT (requiere rol admin)

**Body** (todos opcionales, debe enviarse al menos uno):
```json
{
  "name": "Restaurante Principal - Renovado",
  "description": "Nueva descripción",
  "countryCode": "AR",
  "city": "Buenos Aires",
  "isActive": true
}
```

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| name | string | Nombre del sitio (máx 200 chars) |
| description | string | Descripción (máx 5000 chars) |
| address | string | Dirección completa (máx 500 chars) |
| streetNumber | string | Número de calle (máx 20 chars) |
| city | string | Ciudad (máx 100 chars) |
| stateProvince | string | Provincia/Estado (máx 100 chars) |
| postalCode | string | Código postal (máx 20 chars) |
| countryCode | string (2 chars) | Código de país ISO 3166-1 alpha-2 |
| latitude | number | Latitud GPS (-90 a 90) |
| longitude | number | Longitud GPS (-180 a 180) |
| timezone | string | Zona horaria (máx 100 chars) |
| buildingType | string (enum) | Tipo de edificio (mismos valores que POST) |
| areaM2 | number | Área en metros cuadrados (positivo) |
| floors | number (entero) | Número de pisos (entero positivo) |
| operatingHours | string | Horario de operación (máx 200 chars) |
| imageUrl | string (URL) | URL de imagen del sitio (máx 500 chars) |
| contactName | string | Nombre del contacto (máx 100 chars) |
| contactPhone | string | Teléfono del contacto (máx 50 chars) |
| contactEmail | string (email) | Email del contacto (máx 100 chars) |
| isActive | boolean | Estado activo/inactivo |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "id": "SITE-YYYYY-Y",
    "name": "Restaurante Principal - Renovado",
    "description": "Nueva descripción",
    "latitude": -12.0464,
    "longitude": -77.0428,
    "address": "Av. Example 123, Piso 2",
    "city": "Buenos Aires",
    "isActive": true,
    "organization": {
      "id": "ORG-XXXXX-X",
      "slug": "mi-organizacion",
      "name": "Mi Organización",
      "logoUrl": null
    },
    "country": {
      "id": 11,
      "isoAlpha2": "AR",
      "isoAlpha3": "ARG",
      "phoneCode": "54"
    }
  },
  "meta": {
    "timestamp": "2026-03-19T00:00:00.000Z",
    "locale": "es"
  }
}
```

**Notas**:
- Audit log: UPDATE con changes

---

## DELETE /api/v1/sites/:id

**Propósito**: Eliminar sitio (soft delete)

**Autenticación**: Bearer JWT (requiere rol system-admin)

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Site eliminado exitosamente"
  },
  "meta": {
    "timestamp": "2026-03-19T00:00:00.000Z",
    "locale": "es"
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
