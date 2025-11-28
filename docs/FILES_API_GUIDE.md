# 📁 Files API - Guía para Frontend (BFF)

Guía completa de uso de la API de Archivos para el equipo de frontend/BFF.

## 📋 Tabla de Contenidos

- [Arquitectura y Flujo General](#arquitectura-y-flujo-general)
- [Autenticación y Permisos](#autenticación-y-permisos)
- [Identificadores](#identificadores)
- [Flujo Completo de Upload](#flujo-completo-de-upload)
- [Endpoints CRUD](#endpoints-crud)
- [Categorías y Límites](#categorías-y-límites)
- [Owner Types (Propietarios)](#owner-types-propietarios)
- [Manejo de Errores](#manejo-de-errores)
- [Ejemplos de Integración (Next.js BFF)](#ejemplos-de-integración-nextjs-bff)

---

## 🏗️ Arquitectura y Flujo General

### Diagrama de Arquitectura

```
┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Browser    │────▶│   Next.js   │────▶│  EC.DATA    │────▶│  Azure Blob     │
│   (Usuario)  │     │   BFF       │     │  API        │     │  Storage        │
└──────────────┘     └─────────────┘     └─────────────┘     └─────────────────┘
      │                    │                   │                     │
      │  1. FormData       │  2. POST          │                     │
      │  (file + metadata) │  /upload-url      │                     │
      │───────────────────▶│──────────────────▶│                     │
      │                    │                   │                     │
      │                    │  3. Response:     │                     │
      │                    │  {upload_url,     │                     │
      │                    │   file_id}        │                     │
      │                    │◀──────────────────│                     │
      │                    │                   │                     │
      │                    │  4. PUT blob      │                     │
      │                    │  (Binary upload)  │                     │
      │                    │─────────────────────────────────────────▶│
      │                    │                   │                     │
      │                    │  5. HTTP 201      │                     │
      │                    │◀─────────────────────────────────────────│
      │                    │                   │                     │
      │                    │  6. POST          │                     │
      │                    │  /{id}/confirm    │                     │
      │                    │──────────────────▶│                     │
      │                    │                   │                     │
      │  7. Response:      │  8. File data     │                     │
      │  {file uploaded}   │◀──────────────────│                     │
      │◀───────────────────│                   │                     │
```

### Flujo Simplificado

1. **Usuario** sube archivo via FormData al **BFF** (Next.js)
2. **BFF** extrae metadata y solicita URL firmada a la **API**
3. **API** crea registro `pending` y retorna SAS URL (válida 15 min)
4. **BFF** sube binario directamente a **Azure** usando la SAS URL
5. **BFF** confirma upload exitoso a la **API**
6. **API** cambia estado a `uploaded` y retorna datos del archivo

---

## 🔐 Autenticación y Permisos

Todos los endpoints requieren autenticación mediante Bearer token JWT:

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

### Permisos por Rol

| Rol | Subir (upload-url) | Ver (list/get) | Confirmar | Vincular | Eliminar |
|-----|-------------------|----------------|-----------|----------|----------|
| **system-admin** | ✅ Todos | ✅ Todos | ✅ Todos | ✅ Todos | ✅ Todos |
| **org-admin** | ✅ Su org | ✅ Su org | ✅ Su org | ✅ Su org | ❌ No |
| **org-manager** | ✅ Su org | ✅ Su org | ✅ Su org | ✅ Su org | ❌ No |
| **user/viewer** | ✅ Su org | ✅ Su org | ✅ Su org | ✅ Su org | ❌ No |

**Nota:** Solo `system-admin` puede eliminar archivos. Todos los endpoints requieren autenticación.

---

## 🔑 Identificadores

**⚠️ IMPORTANTE:** La API usa `public_code` para identificar archivos, **NO UUID**.

```javascript
// ✅ CORRECTO
const fileId = "FILE-7K9D2-X"; // public_code

// ❌ INCORRECTO
const fileId = "123e4567-e89b-12d3-a456-426614174000"; // UUID (solo interno)
```

### Formato de Public Codes por Entidad

| Entidad | Formato | Ejemplo |
|---------|---------|---------|
| File | `FILE-XXXXX-X` | `FILE-laMJ3rhv-5` |
| Organization | `ORG-XXXXX-X` | `ORG-yOM9ewfq-4` |
| Site | `SITE-XXXXX-X` | `SITE-61D4Vc4O-4` |
| Device | `DEV-XXXXX-X` | `DEV-621EAvIr-5` |
| User | `USR-XXXXX-X` | `USR-K6AZe6h9-6` |
| Channel | `CHN-XXXXX-X` | `CHN-abc123-1` |

---

## 📤 Flujo Completo de Upload

### Paso 1: Recibir FormData del Usuario

El frontend envía un FormData al BFF con el archivo y metadata:

```javascript
// Frontend (React/Next.js client)
const uploadFile = async (file, targetType, targetId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('owner_type', targetType);  // 'site', 'device', 'organization', etc.
  formData.append('owner_id', targetId);      // 'SITE-7K9D2-X', 'DEV-abc123-1', etc.
  formData.append('category', 'document');    // Categoría del archivo
  formData.append('is_public', 'false');      // Si es público o privado

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};
```

### Paso 2: BFF Solicita SAS URL a la API

```javascript
// BFF (Next.js API Route) - /api/files/upload
export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const ownerType = formData.get('owner_type');
  const ownerId = formData.get('owner_id');
  const category = formData.get('category') || 'document';
  const isPublic = formData.get('is_public') === 'true';

  // 1. Solicitar URL firmada a EC.DATA API
  const uploadUrlResponse = await fetch(`${API_BASE_URL}/files/upload-url`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      organization_id: 'ORG-xxxxx-x',  // ID de la organización del usuario
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      category: category,
      owner_type: ownerType,           // 'site', 'device', 'user', 'organization', 'channel'
      owner_id: ownerId,               // Public code de la entidad destino
      is_public: isPublic
    })
  });

  const { data } = await uploadUrlResponse.json();
  // data contiene: { file_id, upload_url, blob_path, expires_at, ... }
  
  // Continuar al Paso 3...
}
```

### Paso 3: BFF Sube Binario a Azure

```javascript
// Continuación del BFF...

  // 2. Subir archivo directamente a Azure usando la SAS URL
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  
  const azureUploadResponse = await fetch(data.upload_url, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type
    },
    body: fileBuffer
  });

  if (!azureUploadResponse.ok) {
    throw new Error('Error subiendo archivo a Azure');
  }

  // Continuar al Paso 4...
```

### Paso 4: BFF Confirma Upload a la API

```javascript
// Continuación del BFF...

  // 3. Confirmar upload exitoso
  const confirmResponse = await fetch(`${API_BASE_URL}/files/${data.file_id}/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      checksum_sha256: await calculateSha256(fileBuffer)  // Opcional
    })
  });

  const confirmedFile = await confirmResponse.json();
  
  // 4. Retornar resultado al frontend
  return Response.json({
    ok: true,
    data: confirmedFile.data
  });
}
```

---

## 📊 Endpoints CRUD

### 1. POST /api/v1/files/upload-url

Solicita URL pre-firmada (SAS) para subir archivo.

**Request Body:**
```json
{
  "organization_id": "ORG-7K9D2-X",
  "original_name": "factura-enero-2025.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 245760,
  "category": "document",
  "owner_type": "site",
  "owner_id": "SITE-7K9D2-X",
  "is_public": false,
  "metadata": {
    "description": "Factura del mes de enero"
  }
}
```

**Campos obligatorios:**
- `organization_id` - Public code de la organización
- `original_name` - Nombre original del archivo
- `mime_type` - Tipo MIME del archivo
- `size_bytes` - Tamaño en bytes
- `category` - Categoría del archivo

**Campos opcionales:**
- `owner_type` + `owner_id` - Si no se proporcionan, se usa `organization` como propietario
- `is_public` - Default: `false`
- `metadata` - Objeto con datos adicionales

**Response (201 Created):**
```json
{
  "ok": true,
  "data": {
    "file_id": "FILE-7K9D2-X",
    "upload_url": "https://ecblob.blob.core.windows.net/ecdatav2-private/site/SITE-7K9D2-X/019abc62_factura-enero-2025.pdf?sv=2025-07-05&sig=...",
    "blob_path": "site/SITE-7K9D2-X/019abc62_factura-enero-2025.pdf",
    "expires_at": "2025-11-25T19:15:00.000Z",
    "max_size_bytes": 52428800,
    "allowed_mime_types": ["application/pdf", "application/msword", "..."],
    "is_public": false
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

**Si `is_public: true`, incluye campo adicional:**
```json
{
  "data": {
    "...": "...",
    "is_public": true,
    "public_url": "https://ecblob.blob.core.windows.net/ecdatav2-public/site/SITE-7K9D2-X/019abc62_logo.png"
  }
}
```

---

### 2. POST /api/v1/files/{id}/confirm

Confirma que el upload a Azure fue exitoso.

**Path Parameters:**
- `id` - Public code del archivo (`FILE-XXXXX-X`)

**Request Body (opcional):**
```json
{
  "checksum_sha256": "abc123def456789...",
  "metadata": {
    "width": 1920,
    "height": 1080
  }
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "FILE-7K9D2-X",
    "blob_url": "https://ecblob.blob.core.windows.net/ecdatav2-private/site/SITE-7K9D2-X/019abc62_factura.pdf",
    "original_name": "factura-enero-2025.pdf",
    "file_name": "factura_enero_2025.pdf",
    "mime_type": "application/pdf",
    "extension": "pdf",
    "size_bytes": 245760,
    "size_formatted": "240 KB",
    "checksum_sha256": "abc123def456789...",
    "category": "document",
    "status": "uploaded",
    "uploaded_at": "2025-11-25T19:02:00.000Z"
  },
  "meta": {
    "timestamp": "2025-11-25T19:02:00.000Z"
  }
}
```

---

### 3. GET /api/v1/files

Lista archivos con filtros y paginación.

**⚠️ Filtrado por Organización Activa**

Este endpoint aplica filtrado automático basado en la organización activa del usuario:
- Por defecto, solo retorna archivos de la **organización activa del usuario** (JWT `activeOrgId`)
- Si se envía `organization_id`, solo se permite si el usuario tiene acceso a esa organización
- Solo usuarios con rol `system-admin` u `org-admin` pueden usar `all=true` para ver múltiples organizaciones

**Query Parameters:**
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `organization_id` | string | - | Filtrar por organización específica (public_code). Debe tener acceso. |
| `all` | boolean | false | **Solo admins**: `true` para ver archivos de todas las organizaciones permitidas |
| `category` | string | - | Filtrar por categoría |
| `status` | string | - | Filtrar por estado |
| `owner_type` | string | - | Filtrar por tipo de propietario |
| `owner_id` | string | - | Filtrar por ID de propietario |
| `mime_type` | string | - | Filtrar por tipo MIME (parcial) |
| `search` | string | - | Buscar en nombre de archivo |
| `limit` | number | 20 | Máximo de resultados (máx 100) |
| `offset` | number | 0 | Offset para paginación |

**Comportamiento de `all=true`:**
- `system-admin`: Acceso total a todas las organizaciones
- `org-admin`: Acceso a su organización y todas sus sub-organizaciones descendientes
- Otros roles: Error 403 Forbidden

**Ejemplo - Listar archivos de un sitio:**
```
GET /api/v1/files?owner_type=site&owner_id=SITE-7K9D2-X&limit=10
```

**Ejemplo para admin (ver todos):**
```
GET /api/v1/files?all=true&limit=50
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "files": [
      {
        "id": "FILE-7K9D2-X",
        "blob_url": "https://...",
        "original_name": "factura-enero-2025.pdf",
        "file_name": "factura_enero_2025.pdf",
        "mime_type": "application/pdf",
        "extension": "pdf",
        "size_bytes": 245760,
        "size_formatted": "240 KB",
        "category": "document",
        "owner_type": "site",
        "owner_id": "SITE-7K9D2-X",
        "status": "uploaded",
        "is_public": false,
        "uploaded_at": "2025-11-25T19:02:00.000Z",
        "created_at": "2025-11-25T19:00:00.000Z",
        "organization": {
          "id": "ORG-7K9D2-X",
          "name": "ACME Corp",
          "slug": "acme-corp"
        },
        "uploaded_by": {
          "id": "USR-abc123-1",
          "email": "usuario@acme.com",
          "first_name": "Juan",
          "last_name": "Pérez"
        }
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 10,
      "offset": 0,
      "has_more": true
    }
  }
}
```

---

### 4. GET /api/v1/files/{id}

Obtiene detalles de un archivo específico.

**Path Parameters:**
- `id` - Public code del archivo (`FILE-XXXXX-X`)

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "FILE-7K9D2-X",
    "blob_url": "https://...",
    "original_name": "factura-enero-2025.pdf",
    "file_name": "factura_enero_2025.pdf",
    "mime_type": "application/pdf",
    "extension": "pdf",
    "size_bytes": 245760,
    "size_formatted": "240 KB",
    "checksum_sha256": "abc123...",
    "category": "document",
    "owner_type": "site",
    "owner_id": "SITE-7K9D2-X",
    "status": "uploaded",
    "is_public": false,
    "uploaded_at": "2025-11-25T19:02:00.000Z",
    "metadata": {},
    "created_at": "2025-11-25T19:00:00.000Z",
    "updated_at": "2025-11-25T19:02:00.000Z"
  }
}
```

---

### 5. POST /api/v1/files/{id}/link

Vincula un archivo ya subido a una nueva entidad.

**Path Parameters:**
- `id` - Public code del archivo

**Request Body:**
```json
{
  "owner_type": "device",
  "owner_id": "DEV-abc123-1"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "FILE-7K9D2-X",
    "owner_type": "device",
    "owner_id": "DEV-abc123-1",
    "status": "linked",
    "...": "..."
  }
}
```

---

### 6. DELETE /api/v1/files/{id}

Elimina un archivo (soft delete). **Solo `system-admin`**.

**Path Parameters:**
- `id` - Public code del archivo

**Response:**
```json
{
  "ok": true,
  "data": {
    "deleted": true,
    "file_id": "FILE-7K9D2-X"
  }
}
```

---

### 7. GET /api/v1/files/stats/{organizationId}

Obtiene estadísticas de almacenamiento de una organización.

**Path Parameters:**
- `organizationId` - Public code de la organización

**Response:**
```json
{
  "ok": true,
  "data": {
    "organization_id": "ORG-7K9D2-X",
    "total_files": 156,
    "total_bytes": 524288000,
    "total_formatted": "500 MB",
    "by_category": {
      "document": {
        "count": 45,
        "bytes": 125829120,
        "formatted": "120 MB"
      },
      "image": {
        "count": 89,
        "bytes": 209715200,
        "formatted": "200 MB"
      },
      "logo": {
        "count": 12,
        "bytes": 5242880,
        "formatted": "5 MB"
      }
    }
  }
}
```

---

## 📥 Acceso y Descarga de Archivos

**⚠️ IMPORTANTE:** No existe un endpoint GET de descarga directa. El acceso a los archivos es mediante URLs.

### Archivos Públicos (`is_public: true`)

Los archivos subidos con `is_public: true` están en el contenedor público y tienen acceso directo:

```javascript
// El campo public_url o blob_url contiene la URL directa
const imageUrl = file.blob_url; // https://ecblob.blob.core.windows.net/ecdatav2-public/...

// Usar directamente en <img>, <a>, etc.
<img src={file.blob_url} alt={file.original_name} />
<a href={file.blob_url} download={file.original_name}>Descargar</a>
```

### Archivos Privados (`is_public: false`)

Los archivos privados requieren una **nueva SAS URL** para cada descarga:

```javascript
// 1. Obtener metadata del archivo (incluye blob_url sin SAS)
const fileResponse = await fetch(`${API_URL}/files/${fileId}`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const { data: file } = await fileResponse.json();

// 2. Para descargar, el BFF debe generar una SAS URL de lectura
// Esto se hace a través de Azure SDK en el backend, NO hay endpoint de descarga

// Ejemplo BFF: generar SAS URL de lectura
import { BlobSASPermissions, generateBlobSASQueryParameters } from '@azure/storage-blob';

const downloadSasUrl = generateReadSasUrl(file.blob_url); // Implementar en BFF
```

### Flujo de Descarga (BFF)

```javascript
// app/api/files/[id]/download/route.ts
import { BlobServiceClient } from '@azure/storage-blob';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  
  // 1. Obtener metadata del archivo desde la API
  const fileResponse = await fetch(`${API_URL}/files/${id}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const { data: file } = await fileResponse.json();
  
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  
  // 2. Si es público, redirigir a la URL directa
  if (file.is_public) {
    return NextResponse.redirect(file.blob_url);
  }
  
  // 3. Si es privado, generar SAS URL temporal de lectura
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING!
  );
  
  // Extraer container y blob name de la URL
  const url = new URL(file.blob_url);
  const pathParts = url.pathname.split('/');
  const containerName = pathParts[1];
  const blobName = pathParts.slice(2).join('/');
  
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);
  
  // Generar SAS URL con 15 minutos de validez
  const sasUrl = await blobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'), // Read only
    expiresOn: new Date(Date.now() + 15 * 60 * 1000) // 15 min
  });
  
  return NextResponse.redirect(sasUrl);
}
```

### Resumen de Acceso

| Tipo | Cómo Acceder | Cuándo Usar |
|------|--------------|-------------|
| **Público** | URL directa (`blob_url`) | Logos, imágenes de perfil, assets públicos |
| **Privado** | Generar SAS URL de lectura en BFF | Documentos, facturas, datos sensibles |

---

## 📁 Categorías y Límites

| Categoría | Tipos MIME | Extensiones | Tamaño Máx | Uso |
|-----------|------------|-------------|------------|-----|
| **logo** | image/png, jpeg, webp, svg+xml | png, jpg, jpeg, webp, svg | 5 MB | Logos de organizaciones |
| **image** | image/png, jpeg, webp, gif, svg+xml | png, jpg, jpeg, webp, gif, svg | 10 MB | Imágenes generales |
| **document** | application/pdf, msword, excel, powerpoint, text | pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv | 50 MB | Documentos de oficina |
| **firmware** | application/octet-stream, zip, tar, gzip | bin, hex, zip, tar, gz, tgz | 100 MB | Firmware de dispositivos |
| **backup** | application/zip, tar, gzip, 7z | zip, tar, gz, tgz, 7z, bak | 500 MB | Archivos de backup |
| **export** | application/json, csv, excel, zip | json, csv, xls, xlsx, zip | 100 MB | Exportaciones de datos |
| **import** | application/json, csv, excel | json, csv, xls, xlsx | 50 MB | Importaciones de datos |
| **attachment** | Mixed (imágenes + documentos) | Multiple | 25 MB | Adjuntos generales |
| **other** | application/octet-stream | * (cualquiera) | 50 MB | Otros archivos |

---

## 👤 Owner Types (Propietarios)

Los archivos pueden pertenecer a diferentes tipos de entidades:

| Owner Type | Descripción | Ejemplo owner_id |
|------------|-------------|------------------|
| `organization` | Archivos de la organización (default) | `ORG-7K9D2-X` |
| `site` | Archivos de un sitio/ubicación | `SITE-abc123-1` |
| `device` | Archivos de un dispositivo (firmware, backups) | `DEV-xyz789-5` |
| `channel` | Archivos de un canal de comunicación | `CHN-def456-3` |
| `user` | Archivos personales del usuario | `USR-ghi321-2` |

### Comportamiento del Owner

1. **Si no se proporciona `owner_type` ni `owner_id`:**
   - Se usa `organization` como owner_type
   - Se usa el `organization_id` del request como owner_id

2. **Si se proporcionan ambos:**
   - Se valida que `owner_type` sea uno de los permitidos
   - Se usan los valores proporcionados

3. **Si solo se proporciona uno:**
   - Error de validación: ambos deben proporcionarse juntos

### Ruta del Blob en Azure

El archivo se guarda con esta estructura:
```
{owner_type}/{owner_id}/{uuid_prefix}_{sanitized_filename}
```

**Ejemplos:**
```
organization/ORG-7K9D2-X/019abc62_logo.png
site/SITE-abc123-1/019abc62_factura_enero.pdf
device/DEV-xyz789-5/019abc62_firmware_v2.bin
user/USR-ghi321-2/019abc62_documento_personal.pdf
```

---

## 🚨 Manejo de Errores

### Códigos de Estado

| Código | Significado |
|--------|-------------|
| 200 | Operación exitosa |
| 201 | Recurso creado exitosamente |
| 400 | Error de validación |
| 401 | No autenticado |
| 403 | Sin permisos |
| 404 | Recurso no encontrado |
| 413 | Archivo muy grande |
| 415 | Tipo de archivo no soportado |
| 500 | Error interno |

### Formato de Error

```json
{
  "ok": false,
  "error": {
    "message": "Tipo MIME no permitido para categoría document: image/png",
    "code": "VALIDATION_ERROR",
    "status": 400
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Tipo MIME no permitido` | El archivo no corresponde a la categoría | Verificar categoría correcta |
| `Archivo muy grande` | Excede el límite de la categoría | Comprimir o cambiar categoría |
| `owner_type inválido` | Owner type no reconocido | Usar: organization, site, device, channel, user |
| `URL de carga ha expirado` | SAS URL expiró (15 min) | Solicitar nueva URL |
| `No se puede confirmar archivo en estado: uploaded` | Ya fue confirmado | Verificar estado antes de confirmar |

---

## 💻 Ejemplos de Integración (Next.js BFF)

### API Route Completa (App Router)

```typescript
// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';

const API_BASE_URL = process.env.ECDATA_API_URL;

// Calcular SHA-256 del archivo
const calculateSha256 = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await getServerSession();
    if (!session?.accessToken) {
      return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
    }

    // 2. Extraer datos del FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const ownerType = formData.get('owner_type') as string;
    const ownerId = formData.get('owner_id') as string;
    const category = (formData.get('category') as string) || 'document';
    const isPublic = formData.get('is_public') === 'true';
    const organizationId = formData.get('organization_id') as string;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'Archivo requerido' }, { status: 400 });
    }

    // 3. Solicitar URL de carga a EC.DATA API
    const uploadUrlPayload: any = {
      organization_id: organizationId,
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      category,
      is_public: isPublic
    };

    // Solo agregar owner si se proporcionan ambos
    if (ownerType && ownerId) {
      uploadUrlPayload.owner_type = ownerType;
      uploadUrlPayload.owner_id = ownerId;
    }

    const uploadUrlRes = await fetch(`${API_BASE_URL}/files/upload-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(uploadUrlPayload)
    });

    const uploadUrlData = await uploadUrlRes.json();

    if (!uploadUrlData.ok) {
      return NextResponse.json(uploadUrlData, { status: uploadUrlRes.status });
    }

    // 4. Subir archivo a Azure
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const azureRes = await fetch(uploadUrlData.data.upload_url, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': file.type
      },
      body: fileBuffer
    });

    if (!azureRes.ok) {
      const errorText = await azureRes.text();
      console.error('Azure upload error:', errorText);
      return NextResponse.json(
        { ok: false, error: 'Error subiendo archivo a Azure' },
        { status: 500 }
      );
    }

    // 5. Confirmar upload
    const checksum = calculateSha256(fileBuffer);

    const confirmRes = await fetch(
      `${API_BASE_URL}/files/${uploadUrlData.data.file_id}/confirm`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ checksum_sha256: checksum })
      }
    );

    const confirmData = await confirmRes.json();

    if (!confirmData.ok) {
      return NextResponse.json(confirmData, { status: confirmRes.status });
    }

    // 6. Retornar resultado exitoso
    return NextResponse.json({
      ok: true,
      data: confirmData.data
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

### Hook de React para Upload

```typescript
// hooks/useFileUpload.ts
import { useState } from 'react';

interface UploadOptions {
  ownerType?: string;
  ownerId?: string;
  category?: string;
  isPublic?: boolean;
  organizationId: string;
}

interface UploadResult {
  ok: boolean;
  data?: {
    id: string;
    blob_url: string;
    original_name: string;
    size_formatted: string;
  };
  error?: string;
}

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File, options: UploadOptions): Promise<UploadResult> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organization_id', options.organizationId);
      
      if (options.ownerType) formData.append('owner_type', options.ownerType);
      if (options.ownerId) formData.append('owner_id', options.ownerId);
      if (options.category) formData.append('category', options.category);
      if (options.isPublic) formData.append('is_public', 'true');

      setProgress(25);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      setProgress(75);

      const result = await response.json();

      setProgress(100);

      if (!result.ok) {
        setError(result.error || 'Error al subir archivo');
        return result;
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      return { ok: false, error: errorMessage };
    } finally {
      setIsUploading(false);
    }
  };

  return {
    upload,
    isUploading,
    progress,
    error
  };
};
```

### Componente de Upload

```tsx
// components/FileUploader.tsx
'use client';

import { useFileUpload } from '@/hooks/useFileUpload';
import { useState } from 'react';

interface FileUploaderProps {
  ownerType: string;
  ownerId: string;
  organizationId: string;
  category?: string;
  onSuccess?: (file: any) => void;
}

export const FileUploader = ({
  ownerType,
  ownerId,
  organizationId,
  category = 'document',
  onSuccess
}: FileUploaderProps) => {
  const { upload, isUploading, progress, error } = useFileUpload();
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    const result = await upload(file, {
      ownerType,
      ownerId,
      organizationId,
      category
    });

    if (result.ok && onSuccess) {
      onSuccess(result.data);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={() => setDragActive(true)}
      onDragLeave={() => setDragActive(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        handleUpload(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
        id="file-input"
        disabled={isUploading}
      />
      
      <label htmlFor="file-input" className="cursor-pointer">
        {isUploading ? (
          <div>
            <p className="text-gray-600">Subiendo... {progress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-600">
              Arrastra un archivo aquí o <span className="text-blue-600">selecciona</span>
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Categoría: {category}
            </p>
          </div>
        )}
      </label>

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
};
```

### Uso del Componente

```tsx
// pages/sites/[id]/documents.tsx
import { FileUploader } from '@/components/FileUploader';

export default function SiteDocuments({ siteId, organizationId }) {
  const handleUploadSuccess = (file) => {
    console.log('Archivo subido:', file);
    // Actualizar lista de archivos, mostrar notificación, etc.
  };

  return (
    <div>
      <h2>Documentos del Sitio</h2>
      
      <FileUploader
        ownerType="site"
        ownerId={siteId}  // Por ejemplo: "SITE-7K9D2-X"
        organizationId={organizationId}  // Por ejemplo: "ORG-abc123-1"
        category="document"
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
```

---

## 🔄 Contenedores de Azure

### Público vs Privado

| Aspecto | Público (`ecdatav2-public`) | Privado (`ecdatav2-private`) |
|---------|----------------------------|------------------------------|
| **Acceso** | URL directa sin autenticación | Requiere SAS URL |
| **Uso típico** | Logos, favicons, imágenes públicas | Documentos, backups, firmware |
| **Caché CDN** | Puede cachear | No cacheable por diseño |
| **URL después de upload** | `blob_url` + `public_url` | Solo `blob_url` (necesita SAS para leer) |

### Generación de URL de Lectura para Archivos Privados

Para archivos privados, el BFF debe solicitar una URL de lectura con SAS:

```javascript
// Este endpoint aún no existe - pendiente de implementar
// GET /api/v1/files/{id}/download-url
```

Por ahora, el `blob_url` de archivos privados puede usarse directamente si el BFF tiene acceso al storage, o implementar un proxy.

---

## ⏱️ Tiempos de Expiración

| Tipo de URL | Expiración | Uso |
|-------------|------------|-----|
| **Upload SAS URL** | 15 minutos | Para subir archivo a Azure |
| **Download SAS URL** | Configurable (default 15 min) | Para descargar archivos privados |
| **Public URL** | Sin expiración | Acceso directo a archivos públicos |

---

## 📌 Notas Importantes

1. **La SAS URL es de un solo uso práctico:** Aunque técnicamente permite múltiples uploads, el archivo se sobrescribe.

2. **Confirmar siempre después de subir:** Si no se confirma en 15 minutos, el registro queda como `pending` y el archivo "huérfano" en Azure.

3. **El checksum es opcional pero recomendado:** Permite verificar integridad del archivo.

4. **Los archivos `deleted` no se borran inmediatamente:** El blob permanece en Azure hasta que un job de limpieza lo elimine.

5. **Nombres de archivo se sanitizan:** Caracteres especiales se reemplazan por `_`, se limita a 100 caracteres.

---

## 🔗 Endpoints Relacionados

- `GET /api/v1/sites/{id}` - Puede incluir archivos del sitio
- `GET /api/v1/devices/{id}` - Puede incluir archivos del dispositivo
- `GET /api/v1/organizations/{id}` - Puede incluir logo de organización

---

*Última actualización: Noviembre 2025*
