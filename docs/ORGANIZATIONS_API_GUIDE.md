# 🏢 Organizations API - Guía para Frontend

Guía completa de uso de la API de Organizaciones para el equipo de frontend.

## 📋 Tabla de Contenidos

- [Autenticación y Permisos](#autenticación-y-permisos)
- [Identificadores](#identificadores)
- [Endpoints CRUD](#endpoints-crud)
- [Endpoints de Jerarquía](#endpoints-de-jerarquía)
- [Endpoints de Utilidad](#endpoints-de-utilidad)
- [Upload de Imágenes](#upload-de-imágenes)
- [Manejo de Errores](#manejo-de-errores)

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

| Rol | Ver | Crear | Editar | Eliminar |
|-----|-----|-------|--------|----------|
| **system-admin** | Todas | Todas | Todas | Todas |
| **org-admin** | Org + descendientes | Hijas de su org | Org + descendientes | Org + descendientes |
| **org-manager** | Org + hijos directos | Hijas de su org | Org + hijos directos | ❌ No |
| **user/viewer/guest** | Sus orgs directas | ❌ No | ❌ No | ❌ No |

---

## 🔑 Identificadores

**⚠️ IMPORTANTE:** La API usa `public_code` para identificar organizaciones, **NO UUID**.

```javascript
// ✅ CORRECTO
const orgId = "ORG-7K9D2-X"; // public_code

// ❌ INCORRECTO
const orgId = "123e4567-e89b-12d3-a456-426614174000"; // UUID (solo interno)
```

**Nunca exponer UUIDs al frontend.** Usar siempre `public_code`.

---

## 📊 Endpoints CRUD

### 1. GET /api/v1/organizations

Lista organizaciones con paginación y filtros.

**Query Parameters:**
- `limit` (number, default: 20) - Cantidad de resultados
- `offset` (number, default: 0) - Offset para paginación
- `search` (string, opcional) - Búsqueda por nombre o slug
- `parent_id` (string, opcional) - Filtrar por organización padre (public_code)
- `active_only` (boolean, default: true) - Solo organizaciones activas

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "ORG-00123-X",
      "slug": "acme-corp",
      "name": "ACME Corporation",
      "logo_url": "https://storage.azure.com/...",
      "parent": {
        "id": "ORG-00001-X",
        "name": "EC.DATA"
      },
      "is_active": true,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 156,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Ejemplo de uso (React/Next.js):**
```javascript
const fetchOrganizations = async (page = 0, searchQuery = '') => {
  const limit = 20;
  const offset = page * limit;
  
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    ...(searchQuery && { search: searchQuery })
  });
  
  const response = await fetch(
    `/api/v1/organizations?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  const { data, meta } = await response.json();
  return { organizations: data, meta };
};
```

---

### 2. GET /api/v1/organizations/:id

Obtiene detalles de una organización específica.

**URL Parameters:**
- `id` (string, required) - Public code de la organización

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "ORG-00123-X",
    "slug": "acme-corp",
    "name": "ACME Corporation",
    "logo_url": "https://storage.azure.com/...",
    "description": "Corporación multinacional",
    "parent": {
      "id": "ORG-00001-X",
      "name": "EC.DATA",
      "slug": "ecdata"
    },
    "tax_id": "30-1234567-8",
    "email": "contact@acme.com",
    "phone": "+54 11 1234-5678",
    "address": "Av. Corrientes 1234, CABA",
    "config": {
      "theme": {
        "primaryColor": "#FF6B35"
      },
      "settings": {
        "invoicePrefix": "ACME"
      }
    },
    "is_active": true,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-10-13T14:20:00Z"
  }
}
```

**Ejemplo de uso:**
```javascript
const getOrganizationDetails = async (orgPublicCode) => {
  const response = await fetch(
    `/api/v1/organizations/${orgPublicCode}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Organización no encontrada');
    }
    if (response.status === 403) {
      throw new Error('No tienes permisos para ver esta organización');
    }
    throw new Error('Error al obtener organización');
  }
  
  const { data } = await response.json();
  return data;
};
```

---

### 3. POST /api/v1/organizations

Crea una nueva organización.

**Permisos requeridos:** `system-admin` o `org-admin`

**Request Body:**
```json
{
  "name": "Nueva Organización",
  "slug": "nueva-org",
  "logo_url": "https://storage.azure.com/...",
  "parent_id": "ORG-00001-X",
  "description": "Descripción de la organización",
  "tax_id": "30-1234567-8",
  "email": "contact@nueva-org.com",
  "phone": "+54 11 1234-5678",
  "address": "Dirección completa",
  "config": {
    "theme": {
      "primaryColor": "#6C63FF"
    }
  }
}
```

**Campos:**
- `name` (string, required) - Nombre (2-200 caracteres)
- `slug` (string, optional) - Auto-generado si no se envía
- `logo_url` (string, optional) - URL del logo (subir primero vía `/upload-url`)
- `parent_id` (string, optional) - Public code del padre
- `description` (string, optional) - Descripción (max 5000 caracteres)
- `tax_id` (string, optional) - CUIT, RFC, EIN, etc.
- `email` (string, optional) - Email de contacto
- `phone` (string, optional) - Teléfono
- `address` (string, optional) - Dirección
- `config` (object, optional) - Configuración JSON

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "ORG-00456-Y",
    "slug": "nueva-org",
    "name": "Nueva Organización",
    "...": "..."
  }
}
```

**Ejemplo de uso:**
```javascript
const createOrganization = async (formData) => {
  const response = await fetch('/api/v1/organizations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  });
  
  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error.message);
  }
  
  const { data } = await response.json();
  return data;
};
```

---

### 4. PUT /api/v1/organizations/:id

Actualiza una organización existente.

**Permisos requeridos:** `system-admin` o `org-admin` con acceso

**URL Parameters:**
- `id` (string, required) - Public code de la organización

**Request Body:** (Todos los campos opcionales - PATCH semántica)
```json
{
  "name": "Nombre Actualizado",
  "logo_url": "https://storage.azure.com/new-logo.png",
  "description": "Nueva descripción",
  "config": {
    "theme": {
      "primaryColor": "#28A745"
    }
  }
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "ORG-00123-X",
    "name": "Nombre Actualizado",
    "...": "..."
  }
}
```

**Ejemplo de uso:**
```javascript
const updateOrganization = async (orgPublicCode, updates) => {
  const response = await fetch(
    `/api/v1/organizations/${orgPublicCode}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  
  const { data } = await response.json();
  return data;
};
```

---

### 5. POST /api/v1/organizations/batch-delete

Elimina múltiples organizaciones en batch (con cascade).

**Permisos requeridos:** `system-admin` o `org-admin`

**Request Body:**
```json
{
  "organization_ids": ["ORG-00123-X", "ORG-00124-Y"],
  "hard_delete": false,
  "delete_users": false,
  "reassign_org_id": "ORG-00001-X"
}
```

**Campos:**
- `organization_ids` (array, required) - Public codes a eliminar (max 50)
- `hard_delete` (boolean, default: false) - true = físico, false = soft delete
- `delete_users` (boolean, default: false) - Eliminar usuarios asociados
- `reassign_org_id` (string, conditional) - Required si `delete_users=false`

**Response:**
```json
{
  "ok": true,
  "data": {
    "deleted_organizations": 2,
    "deleted_descendants": 3,
    "deleted_users": 0,
    "reassigned_users": 12,
    "invalidated_cache_keys": 10
  }
}
```

---

## 🌳 Endpoints de Jerarquía

### 6. GET /api/v1/organizations/hierarchy

Obtiene el árbol jerárquico completo de organizaciones.

**Query Parameters:**
- `root_id` (string, optional) - Public code de la raíz (default: EC.DATA)
- `active_only` (boolean, default: true) - Solo activas

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "ORG-00001-X",
    "name": "EC.DATA",
    "slug": "ecdata",
    "logo_url": "https://...",
    "is_active": true,
    "children": [
      {
        "id": "ORG-00123-X",
        "name": "ACME Corporation",
        "children": [
          {
            "id": "ORG-00125-Z",
            "name": "ACME LATAM",
            "children": []
          }
        ]
      }
    ]
  }
}
```

**Ejemplo de uso (árbol visual):**
```javascript
const OrganizationTree = ({ node, level = 0 }) => {
  return (
    <div style={{ marginLeft: level * 20 }}>
      <div>
        {node.logo_url && <img src={node.logo_url} alt={node.name} />}
        <span>{node.name}</span>
      </div>
      {node.children?.map(child => (
        <OrganizationTree key={child.id} node={child} level={level + 1} />
      ))}
    </div>
  );
};
```

---

### 7. GET /api/v1/organizations/:id/children

Obtiene solo los hijos directos de una organización.

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "ORG-00125-Z",
      "name": "ACME LATAM",
      "slug": "acme-latam",
      "logo_url": "https://...",
      "parent_id": "ORG-00123-X",
      "is_active": true
    }
  ]
}
```

---

### 8. GET /api/v1/organizations/:id/descendants

Obtiene TODOS los descendientes (recursivo).

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "ORG-00125-Z",
      "name": "ACME LATAM",
      "depth": 1
    },
    {
      "id": "ORG-00130-A",
      "name": "ACME LATAM Argentina",
      "depth": 2
    }
  ]
}
```

---

## 🛠️ Endpoints de Utilidad

### 9. POST /api/v1/organizations/validate

Valida disponibilidad de nombre y/o slug de organización.

**⚠️ Endpoint público - NO requiere autenticación**

**Request Body:**
```json
{
  "name": "Nueva Organización",
  "slug": "nueva-org",
  "exclude_id": "ORG-00123-X"  // Opcional - para excluir en edición
}
```

**Campos:**
- `name` (string, opcional) - Nombre a validar
- `slug` (string, opcional) - Slug a validar
- `exclude_id` (string, opcional) - Public code a excluir (útil al editar)
- **Mínimo uno de `name` o `slug` debe estar presente**

**Response:**
```json
{
  "ok": true,
  "data": {
    "valid": false,
    "conflicts": {
      "name": true,
      "slug": false
    }
  }
}
```

**Ejemplo de uso (validación en tiempo real):**
```javascript
const validateOrganization = async (name, slug, excludeId = null) => {
  const response = await fetch('/api/v1/organizations/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      slug,
      exclude_id: excludeId
    })
  });
  
  const { data } = await response.json();
  return data; // { valid: boolean, conflicts: { name, slug } }
};

// En un formulario de creación
const handleNameChange = async (e) => {
  const name = e.target.value;
  setName(name);
  
  if (name.length >= 2) {
    const result = await validateOrganization(name, null);
    if (result.conflicts.name) {
      setNameError('Este nombre ya está en uso');
    }
  }
};

// En un formulario de edición (excluyendo la org actual)
const validateBeforeUpdate = async (orgId, newName, newSlug) => {
  const result = await validateOrganization(newName, newSlug, orgId);
  return result.valid;
};
```

**Casos de uso:**
- ✅ Validar nombre único antes de crear organización
- ✅ Validar slug único antes de crear organización
- ✅ Validar ambos campos simultáneamente
- ✅ Excluir organización actual al editar (evita falsos positivos)
- ✅ Validación case-insensitive (previene bypass)

---

### 10. GET /api/v1/organizations/validate-slug

**⚠️ Deprecado - Usar POST /api/v1/organizations/validate en su lugar**

Valida si un slug está disponible.

**Query Parameters:**
- `slug` (string, required) - Slug a validar

**Response:**
```json
{
  "ok": true,
  "data": {
    "slug": "nueva-org",
    "available": true
  }
}
```

**Ejemplo de uso (validación en tiempo real):**
```javascript
const validateSlug = async (slug) => {
  const response = await fetch(
    `/api/v1/organizations/validate-slug?slug=${slug}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  const { data } = await response.json();
  return data.available;
};

// En el formulario
const handleSlugChange = async (e) => {
  const slug = e.target.value;
  setSlug(slug);
  
  if (slug.length >= 2) {
    const isAvailable = await validateSlug(slug);
    setSlugAvailable(isAvailable);
  }
};
```

---

### 11. POST /api/v1/organizations/delete-preview

Preview del impacto de eliminación (SIN ejecutar).

**Request Body:**
```json
{
  "organization_ids": ["ORG-00123-X"]
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "organizations": [
      {
        "id": "ORG-00123-X",
        "name": "ACME",
        "descendants_count": 3
      }
    ],
    "affected_organizations_count": 4,
    "affected_descendants_count": 3,
    "affected_users_count": 23,
    "orphan_users_count": 3,
    "warnings": [
      "High impact: 4 organizations will be deleted",
      "3 users will become orphans and need reassignment"
    ]
  }
}
```

**Ejemplo de uso (diálogo de confirmación):**
```javascript
const showDeleteConfirmation = async (orgIds) => {
  const preview = await fetchDeletePreview(orgIds);
  
  const confirmed = await showModal({
    title: '⚠️ Eliminar Organizaciones',
    message: `
      Se eliminarán ${preview.affected_organizations_count} organizaciones
      (${preview.affected_descendants_count} descendientes incluidos).
      
      ${preview.affected_users_count} usuarios serán afectados.
      ${preview.orphan_users_count} quedarán huérfanos.
      
      ${preview.warnings.join('\n')}
    `,
    buttons: ['Cancelar', 'Confirmar Eliminación']
  });
  
  if (confirmed) {
    await deleteOrganizations(orgIds, {
      reassign_org_id: 'ORG-00001-X'
    });
  }
};
```

---

### 11. GET /api/v1/organizations/:id/stats

Estadísticas de una organización.

**Response:**
```json
{
  "ok": true,
  "data": {
    "total_users": 45,
    "total_children": 3,
    "total_descendants": 8,
    "storage_used_bytes": 1258291200,
    "created_at": "2024-01-15T10:30:00Z",
    "last_activity": "2025-10-13T14:20:00Z"
  }
}
```

---

## 📤 Upload de Imágenes

### 12. POST /api/v1/organizations/upload-url

Genera una Presigned URL de Azure para upload directo.

**Request Body:**
```json
{
  "filename": "logo.png",
  "content_type": "image/png",
  "prefix": "org-logo",
  "expiry_minutes": 60
}
```

**Campos:**
- `filename` (string, required) - Nombre del archivo
- `content_type` (string, required) - `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`
- `prefix` (string, optional, default: "org-logo") - Prefijo del nombre
- `expiry_minutes` (number, optional, default: 60) - Validez de la URL (5-120)

**Response:**
```json
{
  "ok": true,
  "data": {
    "upload_url": "https://account.blob.core.windows.net/container/org-logo-1704817200000-a1b2c3d4.png?sv=2021...",
    "public_url": "https://account.blob.core.windows.net/container/org-logo-1704817200000-a1b2c3d4.png",
    "blob_name": "org-logo-1704817200000-a1b2c3d4.png",
    "expires_at": "2025-10-13T15:30:00Z"
  }
}
```

**Flujo completo de upload:**

```javascript
// 1. Pedir presigned URL
const getUploadUrl = async (file) => {
  const response = await fetch('/api/v1/organizations/upload-url', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type,
      prefix: 'org-logo'
    })
  });
  
  const { data } = await response.json();
  return data;
};

// 2. Subir archivo directamente a Azure
const uploadFile = async (file, uploadUrl) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type
    },
    body: file
  });
  
  if (!response.ok) {
    throw new Error('Error uploading file to Azure');
  }
};

// 3. Usar public_url en el POST/PUT de organización
const handleLogoUpload = async (file) => {
  try {
    // Paso 1: Obtener presigned URL
    const { upload_url, public_url } = await getUploadUrl(file);
    
    // Paso 2: Subir archivo directo a Azure
    await uploadFile(file, upload_url);
    
    // Paso 3: Guardar public_url en la organización
    await updateOrganization(orgId, {
      logo_url: public_url
    });
    
    console.log('✅ Logo actualizado exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
  }
};
```

**Validaciones frontend (recomendadas):**
```javascript
const validateImageFile = (file) => {
  const maxSize = 5 * 1024 * 1024; // 5 MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Formato no permitido. Use PNG, JPEG, WEBP o SVG');
  }
  
  if (file.size > maxSize) {
    throw new Error('El archivo no debe superar 5 MB');
  }
  
  return true;
};
```

---

## 🔄 Activar/Desactivar

### 13. PUT /api/v1/organizations/:id/activate

Activa una organización desactivada.

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "ORG-00123-X",
    "is_active": true
  }
}
```

---

### 14. PUT /api/v1/organizations/:id/deactivate

Desactiva una organización (soft disable).

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "ORG-00123-X",
    "is_active": false
  }
}
```

---

## ⚠️ Manejo de Errores

### Códigos de Error Comunes

| Código | Descripción | Acción |
|--------|-------------|--------|
| `400` | Validación fallida | Revisar request body |
| `401` | No autenticado | Renovar access token |
| `403` | Sin permisos | Verificar rol del usuario |
| `404` | No encontrado | Verificar que el public_code existe |
| `409` | Conflicto (slug duplicado) | Cambiar slug |
| `422` | Error de negocio (ciclo jerárquico) | Revisar parent_id |
| `500` | Error del servidor | Reintentar o contactar soporte |

### Estructura de Error

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Slug already exists",
    "details": {
      "field": "slug",
      "value": "acme-corp"
    }
  }
}
```

### Ejemplo de Manejo

```javascript
const handleApiError = (error) => {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      showFormError(error.details.field, error.message);
      break;
    case 'PERMISSION_DENIED':
      showAlert('No tienes permisos para esta acción');
      break;
    case 'CYCLE_DETECTED':
      showAlert('No puedes crear ciclos en la jerarquía');
      break;
    default:
      showAlert('Error inesperado. Intenta nuevamente.');
  }
};
```

---

## 📝 Notas Importantes

1. **Siempre usar `public_code`**, nunca UUIDs en el frontend
2. **Cache del navegador:** La API envía headers `Cache-Control`, respetar
3. **Paginación:** Implementar scroll infinito o paginación clásica
4. **Upload directo:** El archivo NUNCA pasa por tu API backend, va directo a Azure
5. **Permisos:** Verificar el rol del usuario antes de mostrar acciones
6. **Jerarquía:** Máximo 5 niveles de profundidad permitidos
7. **Batch delete:** Siempre mostrar preview antes de confirmar

---

## 🚀 Quick Start

```javascript
// Ejemplo completo de uso
import { useState, useEffect } from 'react';

const OrganizationsPage = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/v1/organizations?limit=20', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        const { data } = await response.json();
        setOrganizations(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  return (
    <div>
      <h1>Organizaciones</h1>
      {organizations.map(org => (
        <div key={org.id}>
          <img src={org.logo_url} alt={org.name} />
          <h3>{org.name}</h3>
          <p>{org.slug}</p>
        </div>
      ))}
    </div>
  );
};
```

---

**¿Preguntas?** Consulta la documentación Swagger en `/api/v1/docs` o contacta al equipo de backend. 🚀
