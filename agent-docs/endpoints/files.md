# Files Endpoints

> **Última actualización**: 2026-01-21
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de archivos.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/files/upload` | Subir archivo | Sí |
| GET | `/api/v1/files/:publicCode` | Obtener URL firmada | Sí |
| DELETE | `/api/v1/files/:publicCode` | Eliminar archivo | Sí (admin) |

---

## POST /api/v1/files/upload

**Propósito**: Subir archivo a Azure Blob Storage

**Autenticación**: Bearer JWT

**Content-Type**: `multipart/form-data`

**Form Data**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| file | File | Sí | Archivo a subir |
| folder | string | No | Carpeta destino (default: `general`) |
| description | string | No | Descripción del archivo |

**Límites**:
- Tamaño máximo: 10 MB
- Tipos permitidos: jpg, png, gif, pdf, doc, docx, xls, xlsx

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "public_code": "FIL-XXXXX-X",
    "original_name": "documento.pdf",
    "mime_type": "application/pdf",
    "size": 1024567,
    "url": "https://storage.blob.core.windows.net/container/path/file.pdf?sas=xxx"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | FILE_TOO_LARGE | Excede 10 MB |
| 400 | INVALID_FILE_TYPE | Tipo no permitido |
| 413 | PAYLOAD_TOO_LARGE | Request muy grande |

**Notas**:
- Audit log: CREATE
- El archivo se almacena en Azure Blob Storage
- La URL retornada tiene SAS token con expiración

---

## GET /api/v1/files/:publicCode

**Propósito**: Obtener URL firmada (SAS) para descargar archivo

**Autenticación**: Bearer JWT

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| publicCode | string | Public code del archivo (ej: `FIL-XXXXX-X`) |

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| expires_in | number | 3600 | Segundos de validez del SAS (max: 86400) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "public_code": "FIL-XXXXX-X",
    "original_name": "documento.pdf",
    "mime_type": "application/pdf",
    "size": 1024567,
    "url": "https://storage.blob.core.windows.net/container/path/file.pdf?sas=xxx",
    "expires_at": "2025-01-21T12:00:00Z"
  }
}
```

**Notas**:
- El SAS URL permite descarga directa sin autenticación
- La URL expira según `expires_in`

---

## DELETE /api/v1/files/:publicCode

**Propósito**: Eliminar archivo

**Autenticación**: Bearer JWT (requiere rol admin o propietario)

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Archivo eliminado exitosamente"
  }
}
```

**Notas**:
- Audit log: DELETE
- Elimina de Azure Blob Storage + registro en DB
- El propietario del archivo puede eliminarlo sin ser admin
