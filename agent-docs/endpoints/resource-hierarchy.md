# Resource Hierarchy Endpoints

> **Última actualización**: 2026-03-20
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de jerarquía.

## Base URL

```
/api/v1/resource-hierarchy
```

## Autenticación

Todos los endpoints requieren `Authorization: Bearer {access_token}`.

La organización activa se resuelve automáticamente desde el token del usuario. Se puede pasar `organizationId` como query param para sobrescribirla.

## Shape del nodo (ResourceNode)

Todos los endpoints retornan nodos con esta estructura (camelCase):

```json
{
  "id": "RES-abc123xyz-1",
  "name": "Medidor de Energía",
  "description": "Canal principal de medición",
  "nodeType": "channel",
  "referenceId": "CHN-5LYJX-4",
  "icon": "activity",
  "displayOrder": 0,
  "depth": 2,
  "parentId": "RES-def456ghi-2",
  "hasChildren": false,
  "childrenCount": 0,
  "metadata": { "unidad": "kWh" },
  "isActive": true,
  "createdAt": "2026-03-20T10:00:00.000Z",
  "updatedAt": "2026-03-20T10:00:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Public code del nodo (ej: `RES-abc123xyz-1`) |
| `name` | string | Nombre visible del nodo |
| `description` | string \| null | Descripción opcional |
| `nodeType` | string | `folder`, `site` o `channel` |
| `referenceId` | string \| null | Public code del recurso referenciado (`CHN-xxx`, `SIT-xxx`). Null para folders. |
| `icon` | string | Nombre del ícono. Defaults: folder→`folder`, site→`building`, channel→`activity` |
| `displayOrder` | integer | Orden entre hermanos (0 = primero). Se ordena ASC, luego por nombre. |
| `depth` | integer | Profundidad en el árbol (0 = raíz) |
| `parentId` | string \| null | Public code del padre. Null si es raíz. |
| `hasChildren` | boolean | Si tiene al menos un hijo activo |
| `childrenCount` | integer | Cantidad de hijos directos (solo si `includeCounts=true`) |
| `metadata` | object | JSON libre de metadatos |
| `isActive` | boolean | Estado del nodo (false = soft deleted) |
| `createdAt` | string | Fecha de creación ISO 8601 |
| `updatedAt` | string | Fecha de última actualización ISO 8601 |

---

## Resumen de Endpoints

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/nodes` | Crear nodo (folder, site o channel) | org-admin, org-manager, system-admin |
| GET | `/nodes` | Listar nodos con filtros y paginación | Cualquier usuario autenticado |
| GET | `/nodes/:id` | Obtener un nodo por public code | Cualquier usuario autenticado |
| PUT | `/nodes/:id` | Actualizar campos editables de un nodo | org-admin, org-manager, system-admin |
| DELETE | `/nodes/:id` | Eliminar nodo (soft delete, con/sin cascade) | org-admin, system-admin |
| PATCH | `/nodes/:id/move` | Mover nodo a otro padre y/o cambiar orden | org-admin, org-manager, system-admin |
| GET | `/nodes/:id/children` | Obtener hijos directos de un nodo | Cualquier usuario autenticado |
| GET | `/nodes/:id/descendants` | Obtener todos los descendientes (lista plana) | Cualquier usuario autenticado |
| GET | `/nodes/:id/ancestors` | Obtener ancestros hasta la raíz (breadcrumb) | Cualquier usuario autenticado |
| GET | `/roots` | Obtener nodos raíz de la organización | Cualquier usuario autenticado |
| GET | `/tree` | Obtener árbol completo anidado | Cualquier usuario autenticado |
| GET | `/tree/filter` | Obtener árbol filtrado por categoría de asset | Cualquier usuario autenticado |
| POST | `/nodes/batch` | Obtener múltiples nodos por IDs (máx 100) | Cualquier usuario autenticado |
| POST | `/nodes/batch-create` | Crear múltiples nodos en lote (máx 50) | org-admin, org-manager, system-admin |

---

## POST /nodes

Crear un nuevo nodo en la jerarquía.

**Roles**: `org-admin`, `org-manager`, `system-admin`

### Campos del body (discriminated union por `nodeType`)

| Campo | Tipo | folder | site | channel | Descripción |
|-------|------|--------|------|---------|-------------|
| `nodeType` | string | **Sí** | **Sí** | **Sí** | Discriminante: `folder`, `site` o `channel` |
| `name` | string | **Sí** | Opcional* | Opcional* | Nombre (1-255 chars). *Auto-enriquecido desde el recurso referenciado si no se envía. |
| `referenceId` | string | — | **Sí** | **Sí** | Public code del recurso (ej: `SIT-xxx`, `CHN-xxx`). No aplica para folder. |
| `parentId` | string \| null | No | No | No | Public code del padre. `null` o ausente = nodo raíz |
| `organizationId` | string | No | No | No | Public code de la org. Usa la org activa si no se envía. |
| `description` | string \| null | No | No | No | Descripción (máx 2000 caracteres) |
| `icon` | string | No | No | No | Nombre del ícono (máx 50 chars). Auto-asignado si no se envía. |
| `displayOrder` | integer | No | No | No | Orden entre hermanos (default: 0) |
| `metadata` | object | No | No | No | JSON libre de metadatos |

### Ejemplo 1: Crear folder

**Request:**
```json
POST /api/v1/resource-hierarchy/nodes
{
  "nodeType": "folder",
  "name": "Sensores de Temperatura",
  "description": "Carpeta para agrupar sensores de temperatura",
  "parentId": "RES-def456ghi-2",
  "icon": "folder",
  "displayOrder": 0
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "id": "RES-new001abc-3",
    "name": "Sensores de Temperatura",
    "description": "Carpeta para agrupar sensores de temperatura",
    "nodeType": "folder",
    "referenceId": null,
    "icon": "folder",
    "displayOrder": 0,
    "depth": 1,
    "parentId": "RES-def456ghi-2",
    "hasChildren": false,
    "childrenCount": 0,
    "metadata": {},
    "isActive": true,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T10:00:00.000Z"
  }
}
```

### Ejemplo 2: Crear site

**Request:**
```json
POST /api/v1/resource-hierarchy/nodes
{
  "nodeType": "site",
  "name": "Planta Norte",
  "description": "Site de la planta norte",
  "parentId": "RES-def456ghi-2",
  "referenceId": "SIT-ABCDE-1",
  "icon": "building",
  "displayOrder": 1
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "id": "RES-new002def-3",
    "name": "Planta Norte",
    "description": "Site de la planta norte",
    "nodeType": "site",
    "referenceId": "SIT-ABCDE-1",
    "icon": "building",
    "displayOrder": 1,
    "depth": 1,
    "parentId": "RES-def456ghi-2",
    "hasChildren": false,
    "childrenCount": 0,
    "metadata": {},
    "isActive": true,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T10:00:00.000Z"
  }
}
```

### Ejemplo 3: Crear channel

**Request:**
```json
POST /api/v1/resource-hierarchy/nodes
{
  "nodeType": "channel",
  "name": "Medidor de Energía Principal",
  "description": "Canal de medición de energía",
  "parentId": "RES-new002def-3",
  "referenceId": "CHN-5LYJX-4",
  "icon": "activity",
  "displayOrder": 0,
  "metadata": {
    "unidad": "kWh",
    "categoria": "energia"
  }
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "id": "RES-new003ghi-4",
    "name": "Medidor de Energía Principal",
    "description": "Canal de medición de energía",
    "nodeType": "channel",
    "referenceId": "CHN-5LYJX-4",
    "icon": "activity",
    "displayOrder": 0,
    "depth": 2,
    "parentId": "RES-new002def-3",
    "hasChildren": false,
    "childrenCount": 0,
    "metadata": {
      "unidad": "kWh",
      "categoria": "energia"
    },
    "isActive": true,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T10:00:00.000Z"
  }
}
```

### Ejemplo 4: Crear site sin nombre (auto-enriquecimiento)

Cuando se crea un `site` o `channel` sin `name` ni `icon`, estos se auto-enriquecen desde el recurso referenciado.

**Request:**
```json
POST /api/v1/resource-hierarchy/nodes
{
  "nodeType": "site",
  "parentId": "RES-def456ghi-2",
  "referenceId": "SIT-ABCDE-1"
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "id": "RES-auto001-5",
    "name": "Planta Norte",
    "description": null,
    "nodeType": "site",
    "referenceId": "SIT-ABCDE-1",
    "icon": "building",
    "displayOrder": 0,
    "depth": 1,
    "parentId": "RES-def456ghi-2",
    "hasChildren": false,
    "childrenCount": 0,
    "metadata": {},
    "isActive": true,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T10:00:00.000Z"
  }
}
```

> El `name` ("Planta Norte") y el `icon` ("building") fueron tomados automáticamente del site `SIT-ABCDE-1`.

### Ejemplo 5: Crear nodo raíz (sin padre)

**Request:**
```json
POST /api/v1/resource-hierarchy/nodes
{
  "nodeType": "folder",
  "name": "Organización Principal",
  "parentId": null
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "id": "RES-root001-1",
    "name": "Organización Principal",
    "nodeType": "folder",
    "referenceId": null,
    "icon": "folder",
    "displayOrder": 0,
    "depth": 0,
    "parentId": null,
    "hasChildren": false,
    "childrenCount": 0,
    "metadata": {},
    "isActive": true,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T10:00:00.000Z"
  }
}
```

### Errores

| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | `VALIDATION_ERROR` | Campo requerido faltante o inválido |
| 400 | `PARENT_ORG_MISMATCH` | El nodo padre pertenece a otra organización |
| 401 | — | Token inválido o expirado |
| 403 | — | Rol insuficiente |
| 404 | `PARENT_NODE_NOT_FOUND` | El `parentId` no corresponde a un nodo existente |
| 404 | `ORGANIZATION_NOT_FOUND` | La organización especificada no existe |
| 404 | `REFERENCE_NOT_FOUND` | El `referenceId` (site/channel) no existe o no pertenece a la organización |
| 409 | `REFERENCE_ALREADY_IN_HIERARCHY` | El `referenceId` ya existe en la jerarquía de la organización |

**Ejemplo error 409 (duplicado):**
```json
{
  "ok": false,
  "error": {
    "code": "REFERENCE_ALREADY_IN_HIERARCHY",
    "message": "Este recurso (CHN-5LYJX-4) ya existe en la jerarquía de la organización"
  }
}
```

**Ejemplo error 404 (referencia no encontrada):**
```json
{
  "ok": false,
  "error": {
    "code": "REFERENCE_NOT_FOUND",
    "message": "Canal no encontrado o no pertenece a esta organización: CHN-5LYJX-4"
  }
}
```

---

## PUT /nodes/:id

Actualizar campos editables de un nodo. Enviar solo los campos que se quieren modificar.

**Roles**: `org-admin`, `org-manager`, `system-admin`

### Campos editables

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre (1-255 caracteres) |
| `description` | string \| null | Descripción (máx 2000 caracteres) |
| `icon` | string | Nombre del ícono (máx 50 caracteres) |
| `displayOrder` | integer | Orden entre hermanos (≥ 0) |
| `metadata` | object | Metadatos (reemplaza el objeto completo) |
| `isActive` | boolean | Activar/desactivar el nodo |

**Campos NO editables:** `nodeType`, `referenceId`, `parentId` (usar `PATCH /nodes/:id/move` para cambiar padre).

### Ejemplo 1: Renombrar un nodo

**Request:**
```json
PUT /api/v1/resource-hierarchy/nodes/RES-abc123xyz-1
{
  "name": "Sensores de Humedad"
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "id": "RES-abc123xyz-1",
    "name": "Sensores de Humedad",
    "description": "Carpeta para agrupar sensores de temperatura",
    "nodeType": "folder",
    "referenceId": null,
    "icon": "folder",
    "displayOrder": 0,
    "depth": 1,
    "parentId": "RES-def456ghi-2",
    "hasChildren": true,
    "childrenCount": 3,
    "metadata": {},
    "isActive": true,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T10:30:00.000Z"
  }
}
```

### Ejemplo 2: Actualizar múltiples campos

**Request:**
```json
PUT /api/v1/resource-hierarchy/nodes/RES-abc123xyz-1
{
  "name": "Medidores Zona Norte",
  "description": "Medidores de la zona norte de la planta",
  "icon": "zap",
  "displayOrder": 2,
  "metadata": {
    "zona": "norte",
    "responsable": "Juan Pérez"
  }
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "id": "RES-abc123xyz-1",
    "name": "Medidores Zona Norte",
    "description": "Medidores de la zona norte de la planta",
    "nodeType": "folder",
    "referenceId": null,
    "icon": "zap",
    "displayOrder": 2,
    "depth": 1,
    "parentId": "RES-def456ghi-2",
    "hasChildren": true,
    "childrenCount": 3,
    "metadata": {
      "zona": "norte",
      "responsable": "Juan Pérez"
    },
    "isActive": true,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T11:00:00.000Z"
  }
}
```

### Ejemplo 3: Desactivar un nodo

**Request:**
```json
PUT /api/v1/resource-hierarchy/nodes/RES-abc123xyz-1
{
  "isActive": false
}
```

### Errores

| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | `VALIDATION_ERROR` | Campo con formato inválido |
| 404 | `NODE_NOT_FOUND` | El nodo no existe |

---

## DELETE /nodes/:id

Eliminar un nodo (soft delete). Soporta eliminación con y sin cascade.

**Roles**: `org-admin`, `system-admin`

### Query params

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `cascade` | boolean | `false` | Si `true`, elimina el nodo y todos sus descendientes |

### Flujo recomendado en el frontend

1. Llamar `DELETE /nodes/:id` **sin** `cascade`
2. Si la respuesta es `409` (`HAS_CHILDREN`), mostrar al usuario los nodos afectados de `data.affectedNodes`
3. Si el usuario confirma, reintentar con `cascade=true`

### Ejemplo 1: Eliminar nodo hoja (sin hijos)

**Request:**
```
DELETE /api/v1/resource-hierarchy/nodes/RES-leaf001-1
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "deletedCount": 1,
    "deletedNodes": [
      {
        "publicCode": "RES-leaf001-1",
        "name": "Medidor A",
        "nodeType": "channel"
      }
    ],
    "cascade": false
  }
}
```

### Ejemplo 2: Intentar eliminar nodo con hijos (sin cascade)

**Request:**
```
DELETE /api/v1/resource-hierarchy/nodes/RES-parent001-1
```

**Response (409):**
```json
{
  "ok": false,
  "error": {
    "code": "HAS_CHILDREN",
    "message": "El nodo tiene hijos. Debe confirmar la eliminación en cascada."
  },
  "data": {
    "affectedNodes": [
      {
        "publicCode": "RES-child001-1",
        "name": "Zona Norte",
        "nodeType": "folder"
      },
      {
        "publicCode": "RES-child002-1",
        "name": "Medidor A",
        "nodeType": "channel"
      },
      {
        "publicCode": "RES-child003-1",
        "name": "Medidor B",
        "nodeType": "channel"
      }
    ],
    "totalAffected": 4
  }
}
```

### Ejemplo 3: Eliminar con cascade confirmado

**Request:**
```
DELETE /api/v1/resource-hierarchy/nodes/RES-parent001-1?cascade=true
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "deletedCount": 4,
    "deletedNodes": [
      {
        "publicCode": "RES-parent001-1",
        "name": "Carpeta Principal",
        "nodeType": "folder"
      },
      {
        "publicCode": "RES-child001-1",
        "name": "Zona Norte",
        "nodeType": "folder"
      },
      {
        "publicCode": "RES-child002-1",
        "name": "Medidor A",
        "nodeType": "channel"
      },
      {
        "publicCode": "RES-child003-1",
        "name": "Medidor B",
        "nodeType": "channel"
      }
    ],
    "cascade": true
  }
}
```

### Errores

| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | `NODE_NOT_FOUND` | El nodo no existe |
| 409 | `HAS_CHILDREN` | El nodo tiene hijos y no se confirmó cascade |

---

## PATCH /nodes/:id/move

Mover un nodo (y todo su subárbol) a un nuevo padre y/o cambiar su `displayOrder`.

**Roles**: `org-admin`, `org-manager`, `system-admin`

### Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `newParentId` | string \| null | **Sí** | Public code del nuevo padre. `null` = mover a nivel raíz. |
| `displayOrder` | integer | No | Nuevo orden entre hermanos en el destino |

### Ejemplo 1: Mover a otro padre

**Request:**
```json
PATCH /api/v1/resource-hierarchy/nodes/RES-medidor001-1/move
{
  "newParentId": "RES-zonanorte-2",
  "displayOrder": 0
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "id": "RES-medidor001-1",
    "name": "Medidor A",
    "nodeType": "channel",
    "referenceId": "CHN-AAA01-1",
    "icon": "activity",
    "displayOrder": 0,
    "depth": 2,
    "parentId": "RES-zonanorte-2",
    "hasChildren": false,
    "childrenCount": 0,
    "metadata": {},
    "isActive": true,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T12:00:00.000Z"
  }
}
```

### Ejemplo 2: Mover a nivel raíz

**Request:**
```json
PATCH /api/v1/resource-hierarchy/nodes/RES-carpeta001-1/move
{
  "newParentId": null
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "id": "RES-carpeta001-1",
    "name": "Carpeta Independiente",
    "nodeType": "folder",
    "referenceId": null,
    "displayOrder": 0,
    "depth": 0,
    "parentId": null,
    "hasChildren": true,
    "childrenCount": 3,
    "isActive": true,
    "createdAt": "2026-03-20T10:00:00.000Z",
    "updatedAt": "2026-03-20T12:00:00.000Z"
  }
}
```

### Ejemplo 3: Solo cambiar orden (mismo padre)

**Request:**
```json
PATCH /api/v1/resource-hierarchy/nodes/RES-medidor001-1/move
{
  "newParentId": "RES-currentparent-1",
  "displayOrder": 5
}
```

### Errores

| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | `CYCLE_DETECTED` | No se puede mover un nodo a uno de sus descendientes |
| 400 | `SELF_REFERENCE` | No se puede mover un nodo a sí mismo |
| 400 | `CROSS_ORG_MOVE_NOT_ALLOWED` | No se puede mover a una organización diferente |
| 403 | `INSUFFICIENT_SOURCE_PERMISSIONS` | Sin permisos para mover el nodo origen |
| 403 | `INSUFFICIENT_DESTINATION_PERMISSIONS` | Sin permisos sobre el nodo destino |
| 404 | `NODE_NOT_FOUND` | El nodo a mover no existe |
| 404 | `NEW_PARENT_NOT_FOUND` | El nuevo nodo padre no existe |

**Ejemplo error CYCLE_DETECTED:**
```json
{
  "ok": false,
  "error": {
    "code": "CYCLE_DETECTED",
    "message": "No se puede mover un nodo a uno de sus descendientes"
  }
}
```

**Ejemplo error SELF_REFERENCE:**
```json
{
  "ok": false,
  "error": {
    "code": "SELF_REFERENCE",
    "message": "No se puede mover un nodo a sí mismo"
  }
}
```

---

## GET /roots

Obtener nodos raíz (nivel superior, sin padre) de la organización.

### Query params

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `organizationId` | string | org activa | Public code de la organización |
| `nodeType` | string | — | Filtrar: `folder`, `site` o `channel` |
| `includeCounts` | boolean | `true` | Incluir `childrenCount` |
| `limit` | integer | 50 | Límite (máx 500) |
| `offset` | integer | 0 | Offset para paginación |

### Ejemplo

**Request:**
```
GET /api/v1/resource-hierarchy/roots
```

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RES-root001-1",
      "name": "Hoteles",
      "nodeType": "folder",
      "referenceId": null,
      "icon": "folder",
      "displayOrder": 0,
      "depth": 0,
      "parentId": null,
      "hasChildren": true,
      "childrenCount": 5,
      "metadata": {},
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "RES-root002-1",
      "name": "Oficinas",
      "nodeType": "folder",
      "referenceId": null,
      "icon": "folder",
      "displayOrder": 1,
      "depth": 0,
      "parentId": null,
      "hasChildren": true,
      "childrenCount": 3,
      "metadata": {},
      "isActive": true,
      "createdAt": "2026-01-05T00:00:00.000Z",
      "updatedAt": "2026-01-05T00:00:00.000Z"
    },
    {
      "id": "RES-root003-1",
      "name": "Planta Central",
      "nodeType": "site",
      "referenceId": "SIT-XYZ99-1",
      "icon": "building",
      "displayOrder": 2,
      "depth": 0,
      "parentId": null,
      "hasChildren": false,
      "childrenCount": 0,
      "metadata": {},
      "isActive": true,
      "createdAt": "2026-01-10T00:00:00.000Z",
      "updatedAt": "2026-01-10T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 3,
    "limit": 50,
    "offset": 0
  }
}
```

---

## GET /nodes/:id/children

Obtener hijos directos de un nodo (un solo nivel).

Los nodos se ordenan por `displayOrder` ASC, luego por nombre ASC.

### Parámetros

**Path:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Public code del nodo padre |

**Query:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `nodeType` | string | — | Filtrar: `folder`, `site` o `channel` |
| `includeCounts` | boolean | `true` | Incluir `childrenCount` |
| `limit` | integer | 100 | Límite (máx 500) |
| `offset` | integer | 0 | Offset |

### Ejemplo

**Request:**
```
GET /api/v1/resource-hierarchy/nodes/RES-root001-1/children
```

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RES-hotel001-1",
      "name": "Hotel Lima",
      "nodeType": "folder",
      "referenceId": null,
      "icon": "folder",
      "displayOrder": 0,
      "depth": 1,
      "parentId": "RES-root001-1",
      "hasChildren": true,
      "childrenCount": 4,
      "metadata": {},
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "RES-hotel002-1",
      "name": "Hotel Cusco",
      "nodeType": "folder",
      "referenceId": null,
      "icon": "folder",
      "displayOrder": 1,
      "depth": 1,
      "parentId": "RES-root001-1",
      "hasChildren": true,
      "childrenCount": 2,
      "metadata": {},
      "isActive": true,
      "createdAt": "2026-01-02T00:00:00.000Z",
      "updatedAt": "2026-01-02T00:00:00.000Z"
    },
    {
      "id": "RES-site001-1",
      "name": "Planta Norte",
      "nodeType": "site",
      "referenceId": "SIT-NORTH-1",
      "icon": "building",
      "displayOrder": 2,
      "depth": 1,
      "parentId": "RES-root001-1",
      "hasChildren": false,
      "childrenCount": 0,
      "metadata": {},
      "isActive": true,
      "createdAt": "2026-01-03T00:00:00.000Z",
      "updatedAt": "2026-01-03T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 3,
    "limit": 100,
    "offset": 0
  }
}
```

### Ejemplo: Filtrar solo channels

**Request:**
```
GET /api/v1/resource-hierarchy/nodes/RES-hotel001-1/children?nodeType=channel
```

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RES-chn001-1",
      "name": "Medidor Energía Lobby",
      "nodeType": "channel",
      "referenceId": "CHN-LOBBY-1",
      "icon": "activity",
      "displayOrder": 0,
      "depth": 2,
      "parentId": "RES-hotel001-1",
      "hasChildren": false,
      "childrenCount": 0,
      "metadata": { "unidad": "kWh" },
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 100,
    "offset": 0
  }
}
```

### Errores

| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | `NODE_NOT_FOUND` | El nodo padre no existe |

---

## GET /nodes/:id/descendants

Obtener **todos** los descendientes de un nodo como lista plana (no anidada).

Usa ltree para queries eficientes. Útil para obtener todos los channels debajo de una carpeta.

### Query params

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `nodeType` | string | — | Filtrar: `folder`, `site` o `channel` |
| `maxDepth` | integer | sin límite | Profundidad máxima relativa (1=hijos, 2=hijos+nietos, etc.) |
| `limit` | integer | 500 | Límite (máx 500) |
| `offset` | integer | 0 | Offset |

### Ejemplo 1: Todos los descendientes

**Request:**
```
GET /api/v1/resource-hierarchy/nodes/RES-root001-1/descendants
```

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RES-hotel001-1",
      "name": "Hotel Lima",
      "nodeType": "folder",
      "referenceId": null,
      "depth": 1,
      "parentId": "RES-root001-1",
      "hasChildren": true,
      "isActive": true
    },
    {
      "id": "RES-lobby001-1",
      "name": "Lobby",
      "nodeType": "site",
      "referenceId": "SIT-LOBBY-1",
      "depth": 2,
      "parentId": "RES-hotel001-1",
      "hasChildren": true,
      "isActive": true
    },
    {
      "id": "RES-chn001-1",
      "name": "Medidor Energía Lobby",
      "nodeType": "channel",
      "referenceId": "CHN-LOBBY-1",
      "depth": 3,
      "parentId": "RES-lobby001-1",
      "hasChildren": false,
      "isActive": true
    },
    {
      "id": "RES-chn002-1",
      "name": "Medidor Agua Lobby",
      "nodeType": "channel",
      "referenceId": "CHN-WATER-1",
      "depth": 3,
      "parentId": "RES-lobby001-1",
      "hasChildren": false,
      "isActive": true
    }
  ],
  "meta": {
    "total": 4,
    "limit": 500,
    "offset": 0
  }
}
```

### Ejemplo 2: Solo channels descendientes

**Request:**
```
GET /api/v1/resource-hierarchy/nodes/RES-root001-1/descendants?nodeType=channel
```

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RES-chn001-1",
      "name": "Medidor Energía Lobby",
      "nodeType": "channel",
      "referenceId": "CHN-LOBBY-1",
      "depth": 3,
      "parentId": "RES-lobby001-1",
      "hasChildren": false,
      "isActive": true
    },
    {
      "id": "RES-chn002-1",
      "name": "Medidor Agua Lobby",
      "nodeType": "channel",
      "referenceId": "CHN-WATER-1",
      "depth": 3,
      "parentId": "RES-lobby001-1",
      "hasChildren": false,
      "isActive": true
    }
  ],
  "meta": {
    "total": 2,
    "limit": 500,
    "offset": 0
  }
}
```

### Ejemplo 3: Limitar profundidad

**Request:**
```
GET /api/v1/resource-hierarchy/nodes/RES-root001-1/descendants?maxDepth=1
```

Solo retorna hijos directos (profundidad relativa = 1).

### Errores

| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | `NODE_NOT_FOUND` | El nodo no existe |

---

## GET /nodes/:id/ancestors

Obtener la cadena de ancestros desde la raíz hasta el padre directo del nodo. Útil para breadcrumbs.

El nodo consultado **no** se incluye en la respuesta. Si el nodo es raíz, retorna array vacío.

### Ejemplo

**Request:**
```
GET /api/v1/resource-hierarchy/nodes/RES-chn001-1/ancestors
```

**Response (200):** (para un channel en Hoteles > Hotel Lima > Lobby)
```json
{
  "ok": true,
  "data": [
    {
      "id": "RES-root001-1",
      "name": "Hoteles",
      "nodeType": "folder",
      "referenceId": null,
      "depth": 0,
      "parentId": null,
      "hasChildren": true,
      "isActive": true
    },
    {
      "id": "RES-hotel001-1",
      "name": "Hotel Lima",
      "nodeType": "folder",
      "referenceId": null,
      "depth": 1,
      "parentId": "RES-root001-1",
      "hasChildren": true,
      "isActive": true
    },
    {
      "id": "RES-lobby001-1",
      "name": "Lobby",
      "nodeType": "site",
      "referenceId": "SIT-LOBBY-1",
      "depth": 2,
      "parentId": "RES-hotel001-1",
      "hasChildren": true,
      "isActive": true
    }
  ]
}
```

### Ejemplo: Nodo raíz (sin ancestros)

**Request:**
```
GET /api/v1/resource-hierarchy/nodes/RES-root001-1/ancestors
```

**Response (200):**
```json
{
  "ok": true,
  "data": []
}
```

### Errores

| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | `NODE_NOT_FOUND` | El nodo no existe |

---

## GET /tree

Obtener el árbol completo de la organización en formato anidado (cada nodo tiene `children`).

### Query params

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `organizationId` | string | org activa | Public code de la organización |
| `rootId` | string | — | Retornar subárbol desde este nodo |
| `maxDepth` | integer | sin límite | Profundidad máxima (1-50) |
| `includeCounts` | boolean | `true` | Incluir `childrenCount` |

### Ejemplo 1: Árbol completo

**Request:**
```
GET /api/v1/resource-hierarchy/tree
```

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RES-root001-1",
      "name": "Hoteles",
      "nodeType": "folder",
      "referenceId": null,
      "icon": "folder",
      "displayOrder": 0,
      "depth": 0,
      "parentId": null,
      "hasChildren": true,
      "childrenCount": 2,
      "isActive": true,
      "children": [
        {
          "id": "RES-hotel001-1",
          "name": "Hotel Lima",
          "nodeType": "folder",
          "referenceId": null,
          "icon": "folder",
          "displayOrder": 0,
          "depth": 1,
          "parentId": "RES-root001-1",
          "hasChildren": true,
          "childrenCount": 2,
          "isActive": true,
          "children": [
            {
              "id": "RES-lobby001-1",
              "name": "Lobby",
              "nodeType": "site",
              "referenceId": "SIT-LOBBY-1",
              "icon": "building",
              "displayOrder": 0,
              "depth": 2,
              "parentId": "RES-hotel001-1",
              "hasChildren": true,
              "childrenCount": 2,
              "isActive": true,
              "children": [
                {
                  "id": "RES-chn001-1",
                  "name": "Medidor Energía",
                  "nodeType": "channel",
                  "referenceId": "CHN-LOBBY-1",
                  "icon": "activity",
                  "displayOrder": 0,
                  "depth": 3,
                  "parentId": "RES-lobby001-1",
                  "hasChildren": false,
                  "childrenCount": 0,
                  "isActive": true,
                  "children": []
                },
                {
                  "id": "RES-chn002-1",
                  "name": "Medidor Agua",
                  "nodeType": "channel",
                  "referenceId": "CHN-WATER-1",
                  "icon": "activity",
                  "displayOrder": 1,
                  "depth": 3,
                  "parentId": "RES-lobby001-1",
                  "hasChildren": false,
                  "childrenCount": 0,
                  "isActive": true,
                  "children": []
                }
              ]
            },
            {
              "id": "RES-rest001-1",
              "name": "Restaurante",
              "nodeType": "site",
              "referenceId": "SIT-REST-1",
              "icon": "building",
              "displayOrder": 1,
              "depth": 2,
              "parentId": "RES-hotel001-1",
              "hasChildren": false,
              "childrenCount": 0,
              "isActive": true,
              "children": []
            }
          ]
        },
        {
          "id": "RES-hotel002-1",
          "name": "Hotel Cusco",
          "nodeType": "folder",
          "referenceId": null,
          "icon": "folder",
          "displayOrder": 1,
          "depth": 1,
          "parentId": "RES-root001-1",
          "hasChildren": false,
          "childrenCount": 0,
          "isActive": true,
          "children": []
        }
      ]
    }
  ]
}
```

### Ejemplo 2: Subárbol desde un nodo

**Request:**
```
GET /api/v1/resource-hierarchy/tree?rootId=RES-hotel001-1
```

Retorna solo el subárbol del Hotel Lima.

### Ejemplo 3: Limitar profundidad

**Request:**
```
GET /api/v1/resource-hierarchy/tree?maxDepth=2
```

Retorna solo 2 niveles del árbol. Los nodos más profundos no se incluyen.

### Errores

| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | `NODE_NOT_FOUND` | El `rootId` especificado no existe |

---

## GET /tree/filter

Obtener el árbol filtrado por categoría de asset. Solo retorna las ramas que contienen nodos con la categoría especificada.

Los nodos padres (carpetas, sites) se incluyen para mantener la estructura jerárquica, pero solo si tienen descendientes que coinciden con el filtro.

Cada nodo incluye `matchesFilter: true` si coincide directamente.

### Query params

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `categoryId` | integer | **requerido** | ID de la categoría de asset |
| `organizationId` | string | org activa | Public code de la organización |
| `includeSubcategories` | boolean | `true` | Incluir subcategorías del tag |

### Ejemplo

**Request:**
```
GET /api/v1/resource-hierarchy/tree/filter?categoryId=42
```

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RES-root001-1",
      "name": "Hoteles",
      "nodeType": "folder",
      "depth": 0,
      "matchesFilter": false,
      "children": [
        {
          "id": "RES-hotel001-1",
          "name": "Hotel Lima",
          "nodeType": "folder",
          "depth": 1,
          "matchesFilter": false,
          "children": [
            {
              "id": "RES-lobby001-1",
              "name": "Lobby",
              "nodeType": "site",
              "depth": 2,
              "matchesFilter": false,
              "children": [
                {
                  "id": "RES-ac001-1",
                  "name": "Aire Acondicionado Lobby",
                  "nodeType": "channel",
                  "referenceId": "CHN-AC001-1",
                  "depth": 3,
                  "matchesFilter": true,
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Errores

| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | `VALIDATION_ERROR` | `categoryId` faltante o no es un entero positivo |

---

## POST /nodes/batch

Obtener múltiples nodos por sus public codes en una sola llamada.

**Límite: 100 IDs por request.**

Solo retorna nodos que pertenezcan a la organización activa del usuario (seguridad multi-tenant). Nodos de otras organizaciones se filtran automáticamente sin generar error.

### Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `ids` | string[] | **Sí** | Array de public codes (1-100) |
| `includeCounts` | boolean | No | Incluir `childrenCount` (default: `true`) |

### Ejemplo

**Request:**
```json
POST /api/v1/resource-hierarchy/nodes/batch
{
  "ids": [
    "RES-root001-1",
    "RES-hotel001-1",
    "RES-chn001-1",
    "RES-inexistente-9"
  ],
  "includeCounts": true
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RES-root001-1",
      "name": "Hoteles",
      "nodeType": "folder",
      "referenceId": null,
      "icon": "folder",
      "displayOrder": 0,
      "depth": 0,
      "parentId": null,
      "hasChildren": true,
      "childrenCount": 5,
      "metadata": {},
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "RES-hotel001-1",
      "name": "Hotel Lima",
      "nodeType": "folder",
      "referenceId": null,
      "icon": "folder",
      "displayOrder": 0,
      "depth": 1,
      "parentId": "RES-root001-1",
      "hasChildren": true,
      "childrenCount": 4,
      "metadata": {},
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "RES-chn001-1",
      "name": "Medidor Energía Lobby",
      "nodeType": "channel",
      "referenceId": "CHN-LOBBY-1",
      "icon": "activity",
      "displayOrder": 0,
      "depth": 3,
      "parentId": "RES-lobby001-1",
      "hasChildren": false,
      "childrenCount": 0,
      "metadata": { "unidad": "kWh" },
      "isActive": true,
      "createdAt": "2026-01-05T00:00:00.000Z",
      "updatedAt": "2026-01-05T00:00:00.000Z"
    }
  ],
  "meta": {
    "requested": 4,
    "found": 3
  }
}
```

> **Nota:** Se solicitaron 4 IDs pero solo se encontraron 3. El ID `RES-inexistente-9` no existe, por lo que simplemente no se incluye en la respuesta. No genera error.

### Errores

| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | `VALIDATION_ERROR` | Se superó el límite de 100 IDs, o `ids` está vacío |

---

## POST /nodes/batch-create

Crear múltiples nodos en lote bajo el mismo padre. Soporta **éxito parcial**.

**Límite: 50 nodos por request.**

### Comportamiento

| Resultado | HTTP Status | Descripción |
|-----------|-------------|-------------|
| Todos exitosos | **201** | Todos los nodos se crearon correctamente |
| Parcial | **200** | Algunos nodos se insertaron, otros fallaron |
| Todos fallaron | **409** | Ningún nodo se insertó, error `ALL_NODES_FAILED` |

### Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `parentId` | string \| null | No | Padre para todos los nodos del batch. `null` = raíz. |
| `nodes` | array | **Sí** | Array de 1-50 nodos a crear |

Cada nodo en `nodes` (discriminated union por `nodeType`, igual que POST /nodes):

| Campo | Tipo | folder | site | channel | Descripción |
|-------|------|--------|------|---------|-------------|
| `nodeType` | string | **Sí** | **Sí** | **Sí** | Discriminante: `folder`, `site` o `channel` |
| `name` | string | **Sí** | Opcional* | Opcional* | Nombre (1-255 chars). *Auto-enriquecido si no se envía. |
| `referenceId` | string | — | **Sí** | **Sí** | Public code del recurso (ej: `SIT-xxx`, `CHN-xxx`). |
| `description` | string \| null | No | No | No | Descripción (máx 2000) |
| `icon` | string \| null | No | No | No | Nombre del ícono (auto-asignado si no se envía) |
| `displayOrder` | integer | No | No | No | Orden (default: 0) |
| `metadata` | object | No | No | No | Metadatos JSON |

### Códigos de fallo por nodo

| Código | Descripción |
|--------|-------------|
| `DUPLICATE_IN_BATCH` | El mismo `referenceId` aparece más de una vez en el batch |
| `ALREADY_IN_HIERARCHY` | El recurso ya existe en la jerarquía de la organización |
| `INVALID_NODE_TYPE` | Tipo de nodo no permitido |
| `UNKNOWN_ERROR` | Error inesperado |

### Ejemplo 1: Todos exitosos (201)

**Request:**
```json
POST /api/v1/resource-hierarchy/nodes/batch-create
{
  "parentId": "RES-lobby001-1",
  "nodes": [
    {
      "nodeType": "channel",
      "name": "Medidor Energía",
      "referenceId": "CHN-ENG01-1",
      "icon": "activity",
      "displayOrder": 0
    },
    {
      "nodeType": "channel",
      "name": "Medidor Agua",
      "referenceId": "CHN-WAT01-1",
      "icon": "activity",
      "displayOrder": 1
    },
    {
      "nodeType": "channel",
      "name": "Medidor Gas",
      "referenceId": "CHN-GAS01-1",
      "icon": "activity",
      "displayOrder": 2
    }
  ]
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "inserted": [
      {
        "publicCode": "RES-new001-1",
        "referenceId": "CHN-ENG01-1",
        "nodeType": "channel",
        "name": "Medidor Energía"
      },
      {
        "publicCode": "RES-new002-1",
        "referenceId": "CHN-WAT01-1",
        "nodeType": "channel",
        "name": "Medidor Agua"
      },
      {
        "publicCode": "RES-new003-1",
        "referenceId": "CHN-GAS01-1",
        "nodeType": "channel",
        "name": "Medidor Gas"
      }
    ],
    "failed": [],
    "meta": {
      "requested": 3,
      "inserted": 3,
      "failed": 0
    }
  }
}
```

### Ejemplo 2: Éxito parcial (200)

**Request:**
```json
POST /api/v1/resource-hierarchy/nodes/batch-create
{
  "parentId": "RES-lobby001-1",
  "nodes": [
    {
      "nodeType": "channel",
      "name": "Medidor Nuevo",
      "referenceId": "CHN-NEW01-1",
      "displayOrder": 0
    },
    {
      "nodeType": "channel",
      "name": "Medidor Energía Duplicado",
      "referenceId": "CHN-ENG01-1",
      "displayOrder": 1
    },
    {
      "nodeType": "channel",
      "name": "Medidor Repetido en Batch",
      "referenceId": "CHN-NEW01-1",
      "displayOrder": 2
    }
  ]
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "inserted": [
      {
        "publicCode": "RES-new004-1",
        "referenceId": "CHN-NEW01-1",
        "nodeType": "channel",
        "name": "Medidor Nuevo"
      }
    ],
    "failed": [
      {
        "referenceId": "CHN-ENG01-1",
        "name": "Medidor Energía Duplicado",
        "reasonCode": "ALREADY_IN_HIERARCHY",
        "message": "Este recurso ya existe en la jerarquía"
      },
      {
        "referenceId": "CHN-NEW01-1",
        "name": "Medidor Repetido en Batch",
        "reasonCode": "DUPLICATE_IN_BATCH",
        "message": "Este recurso está duplicado dentro del mismo batch"
      }
    ],
    "meta": {
      "requested": 3,
      "inserted": 1,
      "failed": 2
    }
  }
}
```

### Ejemplo 3: Todos fallaron (409)

**Request:**
```json
POST /api/v1/resource-hierarchy/nodes/batch-create
{
  "parentId": "RES-lobby001-1",
  "nodes": [
    {
      "nodeType": "channel",
      "name": "Medidor Ya Existente A",
      "referenceId": "CHN-ENG01-1"
    },
    {
      "nodeType": "channel",
      "name": "Medidor Ya Existente B",
      "referenceId": "CHN-WAT01-1"
    }
  ]
}
```

**Response (409):**
```json
{
  "ok": false,
  "error": {
    "code": "ALL_NODES_FAILED",
    "message": "Todos los nodos fallaron al insertarse"
  },
  "data": {
    "inserted": [],
    "failed": [
      {
        "referenceId": "CHN-ENG01-1",
        "name": "Medidor Ya Existente A",
        "reasonCode": "ALREADY_IN_HIERARCHY",
        "message": "Este recurso ya existe en la jerarquía"
      },
      {
        "referenceId": "CHN-WAT01-1",
        "name": "Medidor Ya Existente B",
        "reasonCode": "ALREADY_IN_HIERARCHY",
        "message": "Este recurso ya existe en la jerarquía"
      }
    ],
    "meta": {
      "requested": 2,
      "inserted": 0,
      "failed": 2
    }
  }
}
```

### Ejemplo 4: Crear folders en batch (sin referenceId)

**Request:**
```json
POST /api/v1/resource-hierarchy/nodes/batch-create
{
  "parentId": "RES-root001-1",
  "nodes": [
    {
      "nodeType": "folder",
      "name": "Zona Norte",
      "icon": "folder",
      "displayOrder": 0
    },
    {
      "nodeType": "folder",
      "name": "Zona Sur",
      "icon": "folder",
      "displayOrder": 1
    },
    {
      "nodeType": "folder",
      "name": "Zona Centro",
      "icon": "folder",
      "displayOrder": 2
    }
  ]
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "inserted": [
      {
        "publicCode": "RES-norte-1",
        "referenceId": null,
        "nodeType": "folder",
        "name": "Zona Norte"
      },
      {
        "publicCode": "RES-sur-1",
        "referenceId": null,
        "nodeType": "folder",
        "name": "Zona Sur"
      },
      {
        "publicCode": "RES-centro-1",
        "referenceId": null,
        "nodeType": "folder",
        "name": "Zona Centro"
      }
    ],
    "failed": [],
    "meta": {
      "requested": 3,
      "inserted": 3,
      "failed": 0
    }
  }
}
```

### Errores generales de batch-create

| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | `VALIDATION_ERROR` | Más de 50 nodos, o campo requerido faltante |
| 400 | `PARENT_ORG_MISMATCH` | El padre pertenece a otra organización |
| 404 | `PARENT_NODE_NOT_FOUND` | El `parentId` no existe |
| 409 | `ALL_NODES_FAILED` | Ningún nodo se pudo insertar |

---

## Errores comunes (todos los endpoints)

| Status | Código | Cuándo ocurre |
|--------|--------|---------------|
| 400 | `VALIDATION_ERROR` | Body o query params inválidos |
| 401 | — | Token JWT ausente, inválido o expirado |
| 403 | — | El rol del usuario no tiene permiso para la operación |
| 404 | `NODE_NOT_FOUND` | El nodo consultado no existe o fue eliminado |
| 404 | `ORGANIZATION_NOT_FOUND` | La organización especificada no existe |
| 404 | `REFERENCE_NOT_FOUND` | El referenceId (site/channel) no existe o no pertenece a la org |
