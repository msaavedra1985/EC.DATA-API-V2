# Channels Endpoints

> **Última actualización**: 2026-03-06

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v1/channels` | Listar canales (puntos de medición) | Autenticado |
| `GET` | `/api/v1/channels/:id` | Obtener canal por publicCode | Autenticado |
| `POST` | `/api/v1/channels` | Crear canal | system-admin, org-admin |
| `PUT` | `/api/v1/channels/:id` | Actualizar canal | system-admin, org-admin |
| `DELETE` | `/api/v1/channels/:id` | Eliminar canal (soft delete) | system-admin |

---

## GET /api/v1/channels

**Propósito**: Listar canales (puntos de medición) con filtros y paginación. La organización se filtra automáticamente según el contexto del usuario activo.

**Autenticación**: Bearer JWT + `enforceActiveOrganization`

### Query Parameters

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `deviceId` | string | — | Filtrar por publicCode del dispositivo. Ej: `DEV-abc123xyz-1` |
| `device_id` | string | — | **Alias** de `deviceId` (ambos funcionan igual) |
| `organizationId` | string | — | Filtrar por publicCode de la organización |
| `measurementTypeId` | integer | — | Filtrar por ID de tipo de medición |
| `status` | string | — | Estado: `active`, `inactive`, `error`, `disabled` |
| `search` | string | — | Búsqueda en nombre o descripción |
| `notInHierarchy` | `"true"` | — | Si es `"true"`, retorna solo canales que NO están asignados a ningún nodo de jerarquía de recursos |
| `page` | integer | — | Página (calcula `offset` automáticamente). Alternativa a `offset` |
| `limit` | integer | `20` | Resultados por página (máx 100) |
| `offset` | integer | `0` | Offset para paginación manual |

> **Importante**: El parámetro correcto es `deviceId` (camelCase). El alias `device_id` también es aceptado para compatibilidad con frontends legacy, pero se recomienda usar `deviceId`.

### Comportamiento por rol

| Rol | Comportamiento |
|-----|---------------|
| `system-admin` con `all=true` | Ve canales de **todas** las organizaciones (`showAll=true`, ignora filtro de organización) |
| `system-admin` sin `all=true` | Ve canales de su organización activa |
| `org-admin` / otros | Ve canales de su organización activa |

### Response 200

```json
{
  "ok": true,
  "data": [
    {
      "id": "CHN-abc123xyz-1",
      "name": "Edificio 1 - Lado Derecho",
      "description": "Canal de medición trifásica",
      "ch": 1,
      "measurementTypeId": 3,
      "measurementType": {
        "id": 3,
        "code": "electrical_energy"
      },
      "phaseSystem": 3,
      "phase": 1,
      "process": true,
      "status": "active",
      "lastSyncAt": "2026-01-15T10:30:00.000Z",
      "metadata": {},
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-15T10:30:00.000Z",
      "device": {
        "id": "DEV-abc123xyz-1",
        "name": "Node Lobby",
        "status": "active"
      },
      "organization": {
        "id": "ORG-yOM9ewfqOeWa-4",
        "slug": "sirenis",
        "name": "Sirenis",
        "logoUrl": "https://cdn.example.com/logos/sirenis.png"
      }
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "timestamp": "2026-03-06T00:00:00.000Z",
    "locale": "es"
  }
}
```

### Errores comunes

| Código | Cuándo |
|--------|--------|
| `404` | `deviceId` o `organizationId` proporcionados no existen |
| `400` | Parámetros de paginación inválidos |
| `401` | No autenticado |
| `403` | Sin organización activa |

---

## GET /api/v1/channels/:id

**Propósito**: Obtener detalle de un canal por su publicCode.

**Autenticación**: Bearer JWT + validación de ownership (el canal debe pertenecer a una org accesible por el usuario)

**Path param**: `id` = publicCode del canal (ej: `CHN-abc123xyz-1`)

### Response 200

Mismo shape que cada item del listado. Incluye siempre `device` y `organization`.

### Response 404

```json
{ "ok": false, "error": "Channel no encontrado" }
```

---

## POST /api/v1/channels

**Propósito**: Crear un canal (punto de medición) asociado a un dispositivo.

**Autenticación**: Bearer JWT — roles: `system-admin`, `org-admin`

> La `organizationId` se deriva automáticamente del dispositivo. No se puede especificar manualmente.

### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `deviceId` | string | **Sí** | publicCode del dispositivo al que pertenece el canal |
| `name` | string | **Sí** | Nombre del canal (único por dispositivo, máx 200 chars) |
| `description` | string | No | Descripción (máx 5000 chars) |
| `ch` | integer | No | Número de canal físico (≥ 0) |
| `measurementTypeId` | integer | No | ID del tipo de medición |
| `phaseSystem` | integer | No | Sistema eléctrico: `0`=N/A, `1`=monofásico, `3`=trifásico |
| `phase` | integer | No | Fase que lee: `1`, `2` o `3` |
| `process` | boolean | No (default `true`) | Si se procesan los datos |
| `status` | string | No (default `"active"`) | `active`, `inactive`, `error`, `disabled` |
| `metadata` | object | No | Metadatos adicionales (JSON libre) |
| `isActive` | boolean | No (default `true`) | Activo/inactivo |

### Response 201

```json
{
  "ok": true,
  "data": {
    "id": "CHN-abc123xyz-1",
    "name": "Edificio 1 - Lado Derecho",
    "ch": 1,
    "measurementTypeId": 3,
    "phaseSystem": 3,
    "phase": 1,
    "process": true,
    "status": "active",
    "isActive": true,
    "device": {
      "id": "DEV-abc123xyz-1",
      "name": "Node Lobby"
    },
    "organization": {
      "id": "ORG-yOM9ewfqOeWa-4",
      "name": "Sirenis"
    }
  }
}
```

---

## PUT /api/v1/channels/:id

**Propósito**: Actualizar datos de un canal existente.

**Autenticación**: Bearer JWT — roles: `system-admin`, `org-admin`

**Path param**: `id` = publicCode del canal

### Request Body (todos opcionales)

`name`, `description`, `ch`, `measurementTypeId`, `phaseSystem`, `phase`, `process`, `status`, `metadata`, `isActive`

### Response 200

Mismo shape que el detalle del canal (GET /:id).

---

## DELETE /api/v1/channels/:id

**Propósito**: Soft delete de un canal (queda con `isActive: false`).

**Autenticación**: Bearer JWT — rol: `system-admin` exclusivamente

**Path param**: `id` = publicCode del canal

### Response 200

```json
{
  "ok": true,
  "data": {
    "message": "Channel eliminado exitosamente"
  }
}
```

---

## Notas Técnicas

- **Respuestas en camelCase**: Todos los campos del response usan camelCase (`measurementTypeId`, `phaseSystem`, `isActive`, `lastSyncAt`, etc.)
- **ID siempre es publicCode**: El campo `id` en las respuestas es siempre el `publicCode` del canal. Nunca se expone el UUID interno.
- **`device_id` vs `deviceId`**: La API acepta ambos en el GET. Internamente siempre usa `deviceId`. El frontend debe migrar a `deviceId`.
- **Caché de lista**: `GET /channels` tiene caché Redis. El caché se invalida automáticamente en cada create/update/delete.
- **`notInHierarchy`**: Útil para el selector de "agregar canal a jerarquía" — retorna solo los canales que aún no tienen nodo asignado. Usa una query con LEFT JOIN a `resource_hierarchy`.
- **Ownership check**: El GET y DELETE verifican que el canal pertenezca a una organización accesible por el usuario antes de responder.
