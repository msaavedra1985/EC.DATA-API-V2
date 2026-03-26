# Sites Endpoints

> **Última actualización**: 2026-03-25
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
| organization_id | string | - | Filtrar por organización específica (public code). Si no se especifica, usa la organización activa del usuario |
| all | string (`"true"/"false"`) | - | Solo admins: si es `"true"`, muestra todos los sites sin filtrar por organización |
| country_code | string (2 chars) | - | Filtrar por país (ISO 3166-1 alpha-2, ej: `"AR"`) |
| is_active | string (`"true"/"false"`) | - | Filtrar por estado activo |
| city | string | - | Filtrar por ciudad |
| not_in_hierarchy | string (`"true"/"false"`) | - | Si es `"true"`, muestra solo sites que NO están en ninguna jerarquía de recursos |
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
    "timestamp": "2026-03-25T00:00:00.000Z",
    "locale": "es",
    "organizationFilter": {}
  }
}
```

---

## GET /api/v1/sites/:id

**Propósito**: Obtener sitio por ID

**Respuesta exitosa** (200): Site completo (estructura igual a GET /)

---

## POST /api/v1/sites

**Propósito**: Crear nuevo sitio

**Autenticación**: Bearer JWT (requiere rol `system-admin` u `org-admin`)

### Resolución de organización

El comportamiento de `organizationId` varía según el contexto del usuario:

| Contexto | `organizationId` en body | Resultado |
|----------|--------------------------|-----------|
| `system-admin` **sin** organización activa (modo global) | **Requerido** | Usa la organización del body |
| `system-admin` **impersonando** una organización | Ignorado | Siempre usa la org impersonada |
| `org-admin` (o cualquier usuario con org activa) | Opcional | Si se omite, usa la org activa del contexto; si se envía, verifica acceso |

> Si el `system-admin` está en modo global y no envía `organizationId`, la API responde `400 ORGANIZATION_REQUIRED`.  
> Si envía un `organizationId` mientras impersona una org distinta, se ignora silenciosamente y se usa la org del contexto.

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
| organizationId | string | Condicional* | Public code de la organización. Ver tabla de resolución arriba |
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
    "timestamp": "2026-03-25T00:00:00.000Z",
    "locale": "es"
  }
}
```

**Notas**:
- Audit log: CREATE
- Resolución de `organizationId` explicada en la tabla de resolución de organización arriba
- Un site no puede existir sin organización padre — siempre se asigna una

---

## PUT /api/v1/sites/:id

**Propósito**: Actualizar sitio existente

**Respuesta exitosa** (200): Site actualizado (estructura igual a POST /)

---

## DELETE /api/v1/sites/:id

**Propósito**: Eliminar sitio (soft delete)

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Site eliminado exitosamente"
  },
  "meta": {
    "timestamp": "2026-03-25T00:00:00.000Z",
    "locale": "es"
  }
}
```
