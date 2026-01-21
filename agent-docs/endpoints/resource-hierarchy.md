# Resource Hierarchy Endpoints

> **Última actualización**: 2026-01-21
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de jerarquía.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/resources` | Obtener árbol o nodo | Sí |
| GET | `/api/v1/resources/:publicCode` | Obtener nodo específico | Sí |
| GET | `/api/v1/resources/:publicCode/children` | Obtener hijos | Sí |
| GET | `/api/v1/resources/:publicCode/ancestors` | Obtener ancestros | Sí |
| POST | `/api/v1/resources` | Crear nodo | Sí (admin) |
| PATCH | `/api/v1/resources/:publicCode` | Actualizar nodo | Sí (admin) |
| DELETE | `/api/v1/resources/:publicCode` | Eliminar nodo | Sí (admin) |
| POST | `/api/v1/resources/:publicCode/move` | Mover nodo | Sí (admin) |

---

## GET /api/v1/resources

**Propósito**: Obtener árbol completo o filtrado

**Autenticación**: Bearer JWT

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| root_only | boolean | false | Solo nodos raíz |
| type | string | - | Filtrar por tipo (folder, site, channel) |
| depth | number | - | Profundidad máxima del árbol |
| flat | boolean | false | Retornar lista plana en vez de árbol |

**Respuesta exitosa** (200) - Árbol:
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "RES-XXXXX-X",
      "name": "Hoteles",
      "type": "folder",
      "path": "hoteles",
      "children": [
        {
          "public_code": "RES-YYYYY-Y",
          "name": "Hotel Lima",
          "type": "folder",
          "path": "hoteles.lima",
          "children": [
            {
              "public_code": "RES-ZZZZZ-Z",
              "name": "Lobby",
              "type": "site",
              "path": "hoteles.lima.lobby",
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

**Respuesta con `flat=true`**:
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "RES-XXXXX-X",
      "name": "Hoteles",
      "type": "folder",
      "path": "hoteles",
      "depth": 0
    },
    {
      "public_code": "RES-YYYYY-Y",
      "name": "Hotel Lima",
      "type": "folder",
      "path": "hoteles.lima",
      "depth": 1
    }
  ]
}
```

---

## GET /api/v1/resources/:publicCode

**Propósito**: Obtener detalle de un nodo

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "RES-ZZZZZ-Z",
    "name": "Lobby",
    "type": "site",
    "path": "hoteles.lima.lobby",
    "depth": 2,
    "parent_public_code": "RES-YYYYY-Y",
    "reference_id": "SIT-XXXXX-X",
    "metadata": {
      "floor": 1
    },
    "access_level": "read_write",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Campos especiales**:
| Campo | Descripción |
|-------|-------------|
| path | ltree path para queries eficientes |
| reference_id | Public code del recurso referenciado (site, channel) |
| access_level | Nivel de acceso del usuario actual |

---

## GET /api/v1/resources/:publicCode/children

**Propósito**: Obtener hijos directos de un nodo

**Autenticación**: Bearer JWT

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| type | string | - | Filtrar por tipo |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "RES-ZZZZZ-Z",
      "name": "Lobby",
      "type": "site",
      "path": "hoteles.lima.lobby"
    }
  ]
}
```

---

## GET /api/v1/resources/:publicCode/ancestors

**Propósito**: Obtener ancestros de un nodo (path hasta raíz)

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "RES-XXXXX-X",
      "name": "Hoteles",
      "type": "folder",
      "depth": 0
    },
    {
      "public_code": "RES-YYYYY-Y",
      "name": "Hotel Lima",
      "type": "folder",
      "depth": 1
    }
  ]
}
```

**Notas**:
- Ordenado desde raíz hasta padre inmediato
- Útil para breadcrumbs

---

## POST /api/v1/resources

**Propósito**: Crear nuevo nodo en el árbol

**Autenticación**: Bearer JWT (requiere rol admin)

**Body**:
```json
{
  "name": "Restaurante",
  "type": "site",
  "parent_public_code": "RES-YYYYY-Y",
  "reference_id": "SIT-WWWWW-W",
  "metadata": {
    "floor": 2
  }
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | Sí | Nombre del nodo |
| type | string | Sí | folder, site, channel |
| parent_public_code | string | No | Padre (null = raíz) |
| reference_id | string | Condicional | Public code del recurso (requerido para site/channel) |
| metadata | object | No | Datos adicionales |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "public_code": "RES-NNNNN-N",
    "name": "Restaurante",
    "type": "site",
    "path": "hoteles.lima.restaurante"
  }
}
```

**Notas**:
- Audit log: CREATE
- El `path` se calcula automáticamente basado en el padre
- Para `folder`: no requiere `reference_id`
- Para `site`/`channel`: requiere `reference_id` válido

---

## PATCH /api/v1/resources/:publicCode

**Propósito**: Actualizar nodo

**Autenticación**: Bearer JWT (requiere rol admin)

**Body** (todos opcionales):
```json
{
  "name": "Restaurante Principal",
  "metadata": {
    "floor": 2,
    "capacity": 100
  }
}
```

**Notas**:
- Audit log: UPDATE
- No se puede cambiar `type` ni `parent` (usar `/move`)

---

## DELETE /api/v1/resources/:publicCode

**Propósito**: Eliminar nodo (soft delete con cascade)

**Autenticación**: Bearer JWT (requiere rol admin)

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| cascade | boolean | true | Eliminar hijos también |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Nodo eliminado exitosamente",
    "deleted_count": 3
  }
}
```

**Notas**:
- Audit log: DELETE
- Soft delete con `deleted_at`
- Por defecto elimina hijos (cascade)

---

## POST /api/v1/resources/:publicCode/move

**Propósito**: Mover nodo a otro padre

**Autenticación**: Bearer JWT (requiere rol admin)

**Body**:
```json
{
  "new_parent_public_code": "RES-XXXXX-X"
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "RES-NNNNN-N",
    "old_path": "hoteles.lima.restaurante",
    "new_path": "hoteles.restaurante"
  }
}
```

**Notas**:
- Audit log: UPDATE
- Recalcula `path` del nodo y todos sus descendientes
- Valida que no se cree un ciclo (no puede moverse a un descendiente)
