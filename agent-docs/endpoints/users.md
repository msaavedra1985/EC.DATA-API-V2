# Users Endpoints

> **Última actualización**: 2026-01-21
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de usuarios.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/users` | Listar usuarios | Sí |
| GET | `/api/v1/users/:publicCode` | Obtener usuario | Sí |
| POST | `/api/v1/users` | Crear usuario | Sí (admin) |
| PATCH | `/api/v1/users/:publicCode` | Actualizar usuario | Sí |
| DELETE | `/api/v1/users/:publicCode` | Eliminar usuario | Sí (admin) |

---

## GET /api/v1/users

**Propósito**: Listar usuarios con paginación (filtrado por organización activa)

**Autenticación**: Bearer JWT

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| limit | number | 20 | Máximo de resultados (max: 100) |
| offset | number | 0 | Offset para paginación |
| search | string | - | Buscar por nombre o email |
| role | string | - | Filtrar por rol |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "USR-XXXXX-X",
      "email": "user@example.com",
      "first_name": "Juan",
      "last_name": "Pérez",
      "role": "user",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

**Notas**:
- Filtra por organización activa del usuario autenticado
- System-admin en God View ve todos los usuarios

---

## GET /api/v1/users/:publicCode

**Propósito**: Obtener detalle de un usuario

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| publicCode | string | Public code del usuario (ej: `USR-XXXXX-X`) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "USR-XXXXX-X",
    "email": "user@example.com",
    "first_name": "Juan",
    "last_name": "Pérez",
    "role": "user",
    "is_active": true,
    "organizations": [
      {
        "public_code": "ORG-XXXXX-X",
        "name": "Hotel Lima",
        "is_primary": true
      }
    ],
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-15T00:00:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | NOT_FOUND | Usuario no encontrado |
| 403 | FORBIDDEN | Sin acceso a este usuario |

---

## POST /api/v1/users

**Propósito**: Crear nuevo usuario (admin de organización)

**Autenticación**: Bearer JWT (requiere rol admin)

**Body**:
```json
{
  "email": "nuevo@example.com",
  "password": "TempPass123!",
  "first_name": "María",
  "last_name": "García",
  "role_id": "uuid del rol",
  "send_welcome_email": true
}
```

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "public_code": "USR-XXXXX-X",
    "email": "nuevo@example.com",
    "first_name": "María",
    "last_name": "García"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | VALIDATION_ERROR | Datos inválidos |
| 409 | EMAIL_EXISTS | Email ya registrado |

**Notas**:
- Audit log: CREATE
- Asigna automáticamente a la organización activa del creador

---

## PATCH /api/v1/users/:publicCode

**Propósito**: Actualizar datos de usuario

**Autenticación**: Bearer JWT

**Body** (todos opcionales):
```json
{
  "first_name": "Juan Carlos",
  "last_name": "Pérez López",
  "is_active": true
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "USR-XXXXX-X",
    "first_name": "Juan Carlos",
    "last_name": "Pérez López"
  }
}
```

**Notas**:
- Audit log: UPDATE con `changes: { field: { old, new } }`
- Usuario puede editar su propio perfil
- Admin puede editar usuarios de su organización

---

## DELETE /api/v1/users/:publicCode

**Propósito**: Eliminar usuario (soft delete)

**Autenticación**: Bearer JWT (requiere rol admin)

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Usuario eliminado exitosamente"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 403 | CANNOT_DELETE_SELF | No puedes eliminarte a ti mismo |
| 404 | NOT_FOUND | Usuario no encontrado |

**Notas**:
- Audit log: DELETE
- Soft delete: Marca `deleted_at`
- Revoca todas las sesiones del usuario
