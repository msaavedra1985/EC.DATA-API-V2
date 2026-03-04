# [Módulo] Endpoints

> **Última actualización**: YYYY-MM-DD
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint del módulo.

## Resumen

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/recurso` | Listar recursos |
| GET | `/api/v1/recurso/:publicCode` | Obtener recurso |
| POST | `/api/v1/recurso` | Crear recurso |
| PATCH | `/api/v1/recurso/:publicCode` | Actualizar recurso |
| DELETE | `/api/v1/recurso/:publicCode` | Eliminar recurso |

---

## GET /api/v1/recurso

**Propósito**: Listar recursos con paginación

**Autenticación**: Bearer JWT

**Headers**:
| Header | Requerido | Descripción |
|--------|-----------|-------------|
| Authorization | Sí | `Bearer {access_token}` |

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| limit | number | 20 | Máximo de resultados |
| offset | number | 0 | Offset para paginación |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "XXX-XXXXX-X",
      "name": "Ejemplo"
    }
  ],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 401 | UNAUTHORIZED | Token inválido o expirado |
| 403 | FORBIDDEN | Sin permisos para este recurso |

**Notas**:
- Audit log: No (solo lectura)
- Rate limit: 30 req/min
- Cache: No

---

## GET /api/v1/recurso/:publicCode

**Propósito**: Obtener un recurso específico

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| publicCode | string | Public code del recurso (ej: `XXX-XXXXX-X`) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "XXX-XXXXX-X",
    "name": "Ejemplo",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | NOT_FOUND | Recurso no encontrado |

---

## POST /api/v1/recurso

**Propósito**: Crear nuevo recurso

**Autenticación**: Bearer JWT

**Body** (JSON):
```json
{
  "name": "string (requerido)",
  "description": "string (opcional)"
}
```

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "public_code": "XXX-XXXXX-X",
    "name": "Nuevo recurso"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | VALIDATION_ERROR | Datos inválidos |
| 409 | CONFLICT | Recurso ya existe |

**Notas**:
- Audit log: Sí (CREATE)
- Genera public_code automáticamente

---

## PATCH /api/v1/recurso/:publicCode

**Propósito**: Actualizar recurso existente

**Autenticación**: Bearer JWT

**Body** (JSON):
```json
{
  "name": "string (opcional)",
  "description": "string (opcional)"
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "XXX-XXXXX-X",
    "name": "Nombre actualizado"
  }
}
```

**Notas**:
- Audit log: Sí (UPDATE con changes)
- Solo enviar campos a modificar

---

## DELETE /api/v1/recurso/:publicCode

**Propósito**: Eliminar recurso (soft delete)

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Recurso eliminado exitosamente"
  }
}
```

**Notas**:
- Audit log: Sí (DELETE)
- Soft delete: Marca `deleted_at`, no elimina físicamente
