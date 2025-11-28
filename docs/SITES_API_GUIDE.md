# 📍 Sites API - Guía para Frontend

Guía completa de uso de la API de Sites (Locaciones Físicas) para el equipo de frontend.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Autenticación y Permisos](#autenticación-y-permisos)
- [Identificadores](#identificadores)
- [Endpoints CRUD](#endpoints-crud)
- [Tipos de Edificio](#tipos-de-edificio)
- [Campos del Site](#campos-del-site)
- [Integración con Files](#integración-con-files)
- [Manejo de Errores](#manejo-de-errores)
- [Ejemplos de Uso (React/Next.js)](#ejemplos-de-uso-reactnextjs)

---

## 🏢 Descripción General

El módulo **Sites** gestiona las locaciones físicas de una organización: oficinas, sucursales, bodegas, fábricas, etc. Cada site pertenece a una organización y puede tener dispositivos asociados.

### Características Principales

- **Geolocalización:** Coordenadas GPS (latitud/longitud)
- **Dirección completa:** Calle, número, ciudad, provincia, código postal, país
- **Información del edificio:** Tipo, área en m², pisos, horario de operación
- **Contacto:** Nombre, teléfono, email del responsable
- **Estado:** Activo/Inactivo con soft-delete
- **Archivos asociados:** Documentos, imágenes, planos (via Files API)

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

| Rol | Ver Sites | Crear | Actualizar | Eliminar |
|-----|-----------|-------|------------|----------|
| **system-admin** | ✅ Todos | ✅ | ✅ Todos | ✅ |
| **org-admin** | ✅ Su org | ✅ | ✅ Su org | ❌ |
| **org-manager** | ✅ Su org | ❌ | ❌ | ❌ |
| **user/viewer** | ✅ Su org | ❌ | ❌ | ❌ |

**Notas:**
- Solo `system-admin` puede eliminar sites
- `org-admin` puede crear y editar sites de su organización
- Usuarios normales solo pueden ver sites de su organización

---

## 🔑 Identificadores

**⚠️ IMPORTANTE:** La API usa `public_code` para identificar sites, **NO UUID**.

```javascript
// ✅ CORRECTO
const siteId = "SITE-61D4Vc4O-4"; // public_code

// ❌ INCORRECTO
const siteId = "123e4567-e89b-12d3-a456-426614174000"; // UUID (solo interno)
```

### Formato de Public Codes

| Entidad | Formato | Ejemplo |
|---------|---------|---------|
| Site | `SITE-XXXXX-X` | `SITE-61D4Vc4Oo9R-4` |
| Organization | `ORG-XXXXX-X` | `ORG-yOM9ewfqOeWa-4` |

---

## 📊 Endpoints CRUD

### 1. POST /api/v1/sites

Crea un nuevo site. Requiere rol `system-admin` u `org-admin`.

**Request Body:**
```json
{
  "organization_id": "ORG-yOM9ewfqOeWa-4",
  "name": "Sucursal Centro",
  "description": "Oficina central en el microcentro de Buenos Aires",
  "latitude": -34.6037389,
  "longitude": -58.3815704,
  "address": "Av. Corrientes 1234",
  "street_number": "1234",
  "city": "Buenos Aires",
  "state_province": "Ciudad Autónoma de Buenos Aires",
  "postal_code": "C1043",
  "country_id": 10,
  "timezone": "America/Argentina/Buenos_Aires",
  "building_type": "office",
  "area_m2": 2500.50,
  "floors": 12,
  "operating_hours": "Lun-Vie 9:00-18:00",
  "image_url": "https://example.com/site.jpg",
  "contact_name": "Juan Pérez",
  "contact_phone": "+54-11-5555-0300",
  "contact_email": "contacto@empresa.com",
  "is_active": true
}
```

**Campos requeridos:**
- `organization_id` - Public code de la organización
- `name` - Nombre del site (máx 200 caracteres)
- `country_id` - ID del país (numérico, de tabla `countries`)

**Response (201 Created):**
```json
{
  "ok": true,
  "data": {
    "id": "SITE-61D4Vc4Oo9R-4",
    "name": "Sucursal Centro",
    "description": "Oficina central en el microcentro de Buenos Aires",
    "latitude": -34.6037389,
    "longitude": -58.3815704,
    "address": "Av. Corrientes 1234",
    "street_number": "1234",
    "city": "Buenos Aires",
    "state_province": "Ciudad Autónoma de Buenos Aires",
    "postal_code": "C1043",
    "timezone": "America/Argentina/Buenos_Aires",
    "building_type": "office",
    "area_m2": 2500.50,
    "floors": 12,
    "operating_hours": "Lun-Vie 9:00-18:00",
    "image_url": "https://example.com/site.jpg",
    "contact_name": "Juan Pérez",
    "contact_phone": "+54-11-5555-0300",
    "contact_email": "contacto@empresa.com",
    "is_active": true,
    "organization": {
      "id": "ORG-yOM9ewfqOeWa-4",
      "name": "EC.DATA",
      "slug": "ecdata"
    },
    "country": {
      "id": 10,
      "name": "Argentina",
      "iso_alpha2": "AR",
      "iso_alpha3": "ARG"
    },
    "created_at": "2025-11-25T19:00:00.000Z",
    "updated_at": "2025-11-25T19:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

---

### 2. GET /api/v1/sites

Lista sites con paginación y filtros.

**⚠️ Filtrado por Organización Activa**

Este endpoint aplica filtrado automático basado en la organización activa del usuario:
- Por defecto, solo retorna sites de la **organización activa del usuario** (JWT `activeOrgId`)
- Si se envía `organization_id`, solo se permite si el usuario tiene acceso a esa organización
- Solo usuarios con rol `system-admin` u `org-admin` pueden usar `all=true` para ver múltiples organizaciones

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `organization_id` | string | - | Filtrar por organización específica (public_code). Debe tener acceso. |
| `all` | boolean | false | **Solo admins**: `true` para ver sites de todas las organizaciones permitidas |
| `country_id` | number | - | Filtrar por país |
| `is_active` | boolean | true | Filtrar por estado activo |
| `city` | string | - | Filtrar por ciudad |
| `limit` | number | 20 | Máximo de resultados (máx 100) |
| `offset` | number | 0 | Offset para paginación |

**Comportamiento de `all=true`:**
- `system-admin`: Acceso total a todas las organizaciones
- `org-admin`: Acceso a su organización y todas sus sub-organizaciones descendientes
- Otros roles: Error 403 Forbidden

**Ejemplo de Request:**
```
GET /api/v1/sites?organization_id=ORG-yOM9ewfqOeWa-4&is_active=true&limit=10
```

**Ejemplo para admin (ver todos):**
```
GET /api/v1/sites?all=true&limit=50
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "sites": [
      {
        "id": "SITE-61D4Vc4Oo9R-4",
        "name": "Sucursal Centro",
        "description": "Oficina central",
        "latitude": -34.6037389,
        "longitude": -58.3815704,
        "address": "Av. Corrientes 1234",
        "city": "Buenos Aires",
        "state_province": "CABA",
        "postal_code": "C1043",
        "timezone": "America/Argentina/Buenos_Aires",
        "building_type": "office",
        "area_m2": 2500.50,
        "floors": 12,
        "is_active": true,
        "organization": {
          "id": "ORG-yOM9ewfqOeWa-4",
          "name": "EC.DATA"
        },
        "country": {
          "id": 10,
          "name": "Argentina",
          "iso_alpha2": "AR"
        },
        "created_at": "2025-11-25T19:00:00.000Z"
      },
      {
        "id": "SITE-abc123xyz-1",
        "name": "Planta Industrial Norte",
        "building_type": "factory",
        "city": "Córdoba",
        "is_active": true
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 10
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

---

### 3. GET /api/v1/sites/{id}

Obtiene detalles completos de un site específico.

**Path Parameters:**
- `id` - Public code del site (`SITE-XXXXX-X`)

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "SITE-61D4Vc4Oo9R-4",
    "name": "Sucursal Centro",
    "description": "Oficina central en el microcentro de Buenos Aires",
    "latitude": -34.6037389,
    "longitude": -58.3815704,
    "address": "Av. Corrientes 1234",
    "street_number": "1234",
    "city": "Buenos Aires",
    "state_province": "Ciudad Autónoma de Buenos Aires",
    "postal_code": "C1043",
    "timezone": "America/Argentina/Buenos_Aires",
    "building_type": "office",
    "area_m2": 2500.50,
    "floors": 12,
    "operating_hours": "Lun-Vie 9:00-18:00",
    "image_url": "https://example.com/site.jpg",
    "contact_name": "Juan Pérez",
    "contact_phone": "+54-11-5555-0300",
    "contact_email": "contacto@empresa.com",
    "is_active": true,
    "organization": {
      "id": "ORG-yOM9ewfqOeWa-4",
      "name": "EC.DATA",
      "slug": "ecdata"
    },
    "country": {
      "id": 10,
      "name": "Argentina",
      "iso_alpha2": "AR",
      "iso_alpha3": "ARG",
      "phone_code": "+54"
    },
    "devices_count": 8,
    "created_at": "2025-11-25T19:00:00.000Z",
    "updated_at": "2025-11-25T19:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

---

### 4. PUT /api/v1/sites/{id}

Actualiza un site existente. Requiere rol `system-admin` u `org-admin`.

**Path Parameters:**
- `id` - Public code del site

**Request Body (campos opcionales):**
```json
{
  "name": "Sucursal Centro - Renovada",
  "description": "Oficina renovada con nuevas instalaciones",
  "operating_hours": "Lun-Vie 8:00-20:00, Sáb 9:00-13:00",
  "area_m2": 3200.00,
  "floors": 15,
  "contact_name": "María García",
  "contact_phone": "+54-11-5555-0400"
}
```

**Nota:** Debe proporcionar al menos un campo para actualizar.

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "SITE-61D4Vc4Oo9R-4",
    "name": "Sucursal Centro - Renovada",
    "description": "Oficina renovada con nuevas instalaciones",
    "operating_hours": "Lun-Vie 8:00-20:00, Sáb 9:00-13:00",
    "area_m2": 3200.00,
    "floors": 15,
    "contact_name": "María García",
    "contact_phone": "+54-11-5555-0400",
    "updated_at": "2025-11-25T20:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-11-25T20:00:00.000Z"
  }
}
```

---

### 5. DELETE /api/v1/sites/{id}

Elimina un site (soft delete). **Solo `system-admin`**.

**Path Parameters:**
- `id` - Public code del site

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "message": "Site eliminado exitosamente"
  },
  "meta": {
    "timestamp": "2025-11-25T20:00:00.000Z"
  }
}
```

**Nota:** El site no se borra físicamente, se marca como eliminado. Los dispositivos asociados también se desactivan.

---

## 🏗️ Tipos de Edificio

| Valor | Descripción | Uso típico |
|-------|-------------|------------|
| `office` | Oficina | Espacios de trabajo administrativo |
| `warehouse` | Almacén/Bodega | Almacenamiento y logística |
| `factory` | Fábrica | Producción industrial |
| `retail` | Comercio | Tiendas y locales comerciales |
| `hospital` | Hospital | Centros de salud |
| `school` | Escuela | Instituciones educativas |
| `datacenter` | Centro de datos | Infraestructura IT |
| `hotel` | Hotel | Hospedaje |
| `restaurant` | Restaurante | Gastronomía |
| `residential` | Residencial | Edificios de viviendas |
| `mixed` | Mixto | Uso múltiple |
| `other` | Otro | Otros usos |

---

## 📝 Campos del Site

### Campos de Ubicación

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `latitude` | number | No | Latitud GPS (-90 a 90) |
| `longitude` | number | No | Longitud GPS (-180 a 180) |
| `address` | string | No | Dirección completa (máx 500 chars) |
| `street_number` | string | No | Número de calle (máx 20 chars) |
| `city` | string | No | Ciudad (máx 100 chars) |
| `state_province` | string | No | Provincia/Estado (máx 100 chars) |
| `postal_code` | string | No | Código postal (máx 20 chars) |
| `country_id` | number | **Sí** | ID del país (tabla countries) |
| `timezone` | string | No | Zona horaria IANA |

### Campos del Edificio

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `building_type` | enum | No | Tipo de edificio (ver tabla anterior) |
| `area_m2` | number | No | Área en metros cuadrados |
| `floors` | number | No | Número de pisos |
| `operating_hours` | string | No | Horario de operación (máx 200 chars) |
| `image_url` | string | No | URL de imagen del site |

### Campos de Contacto

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `contact_name` | string | No | Nombre del responsable (máx 100 chars) |
| `contact_phone` | string | No | Teléfono (máx 50 chars) |
| `contact_email` | string | No | Email (debe ser válido) |

### Campos de Estado

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `is_active` | boolean | true | Si el site está activo |

---

## 📁 Integración con Files

Los sites pueden tener archivos asociados (documentos, planos, imágenes). Para subir archivos a un site, usa la [Files API](./FILES_API_GUIDE.md) con:

```javascript
// Subir archivo a un site
const uploadData = {
  organization_id: "ORG-yOM9ewfqOeWa-4",
  original_name: "plano-oficina.pdf",
  mime_type: "application/pdf",
  size_bytes: 2457600,
  category: "document",
  owner_type: "site",              // <-- Importante
  owner_id: "SITE-61D4Vc4Oo9R-4"  // <-- Public code del site
};
```

### Listar Archivos de un Site

```
GET /api/v1/files?owner_type=site&owner_id=SITE-61D4Vc4Oo9R-4
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "files": [
      {
        "id": "FILE-abc123-1",
        "original_name": "plano-oficina.pdf",
        "category": "document",
        "size_formatted": "2.3 MB",
        "uploaded_at": "2025-11-25T19:00:00.000Z"
      },
      {
        "id": "FILE-def456-2",
        "original_name": "foto-fachada.jpg",
        "category": "image",
        "size_formatted": "1.2 MB"
      }
    ],
    "pagination": {
      "total": 2,
      "limit": 20,
      "offset": 0
    }
  }
}
```

---

## 🚨 Manejo de Errores

### Códigos de Estado

| Código | Significado |
|--------|-------------|
| 200 | Operación exitosa |
| 201 | Site creado exitosamente |
| 400 | Error de validación |
| 401 | No autenticado |
| 403 | Sin permisos para esta operación |
| 404 | Site u organización no encontrado |
| 500 | Error interno del servidor |

### Formato de Error

```json
{
  "ok": false,
  "error": {
    "code": "SITE_NOT_FOUND",
    "message": "Site no encontrado",
    "status": 404
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `organization_id es requerido` | Falta organización | Agregar organization_id |
| `country_id es requerido` | Falta país | Agregar country_id válido |
| `latitude debe estar entre -90 y 90` | Coordenada inválida | Verificar formato GPS |
| `SITE_NOT_FOUND` | ID no existe | Verificar public_code |
| `Sin permisos` (403) | Rol insuficiente | Verificar rol del usuario |

---

## 💻 Ejemplos de Uso (React/Next.js)

### Hook para Sites

```typescript
// hooks/useSites.ts
import { useState, useCallback } from 'react';

interface Site {
  id: string;
  name: string;
  description?: string;
  city?: string;
  country?: {
    id: number;
    name: string;
    iso_alpha2: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  is_active: boolean;
  created_at: string;
}

interface ListSitesParams {
  organization_id?: string;
  country_id?: number;
  city?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export const useSites = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchSites = useCallback(async (params: ListSitesParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      if (params.organization_id) queryParams.set('organization_id', params.organization_id);
      if (params.country_id) queryParams.set('country_id', params.country_id.toString());
      if (params.city) queryParams.set('city', params.city);
      if (params.is_active !== undefined) queryParams.set('is_active', params.is_active.toString());
      if (params.limit) queryParams.set('limit', params.limit.toString());
      if (params.offset) queryParams.set('offset', params.offset.toString());

      const response = await fetch(`/api/sites?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Error al cargar sites');
      }

      setSites(data.data.sites);
      setTotal(data.data.total);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const getSite = useCallback(async (id: string): Promise<Site | null> => {
    try {
      const response = await fetch(`/api/sites/${id}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Site no encontrado');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    }
  }, []);

  const createSite = useCallback(async (siteData: Partial<Site> & { 
    organization_id: string; 
    name: string; 
    country_id: number 
  }): Promise<Site | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteData)
      });
      
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Error al crear site');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSite = useCallback(async (id: string, updates: Partial<Site>): Promise<Site | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sites/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Error al actualizar site');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sites,
    loading,
    error,
    total,
    fetchSites,
    getSite,
    createSite,
    updateSite
  };
};
```

### Componente de Lista de Sites

```tsx
// components/SitesList.tsx
'use client';

import { useEffect } from 'react';
import { useSites } from '@/hooks/useSites';

interface SitesListProps {
  organizationId: string;
}

export const SitesList = ({ organizationId }: SitesListProps) => {
  const { sites, loading, error, total, fetchSites } = useSites();

  useEffect(() => {
    fetchSites({ 
      organization_id: organizationId,
      is_active: true,
      limit: 20 
    });
  }, [organizationId, fetchSites]);

  if (loading) {
    return <div className="p-4">Cargando sites...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Sites ({total})</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <div 
            key={site.id} 
            className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-lg">{site.name}</h3>
            
            {site.description && (
              <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                {site.description}
              </p>
            )}

            <div className="mt-3 space-y-1 text-sm text-gray-500">
              {site.city && (
                <p>
                  <span className="mr-1">📍</span>
                  {site.city}
                  {site.country && `, ${site.country.name}`}
                </p>
              )}
              
              <p>
                <span className="mr-1">🏢</span>
                {site.organization?.name}
              </p>
            </div>

            <div className="mt-3 flex justify-between items-center">
              <span className={`px-2 py-1 rounded text-xs ${
                site.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {site.is_active ? 'Activo' : 'Inactivo'}
              </span>
              
              <a 
                href={`/sites/${site.id}`}
                className="text-blue-600 hover:underline text-sm"
              >
                Ver detalles →
              </a>
            </div>
          </div>
        ))}
      </div>

      {sites.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay sites registrados
        </div>
      )}
    </div>
  );
};
```

### Formulario de Creación de Site

```tsx
// components/CreateSiteForm.tsx
'use client';

import { useState } from 'react';
import { useSites } from '@/hooks/useSites';

interface CreateSiteFormProps {
  organizationId: string;
  onSuccess?: (site: any) => void;
}

const BUILDING_TYPES = [
  { value: 'office', label: 'Oficina' },
  { value: 'warehouse', label: 'Almacén/Bodega' },
  { value: 'factory', label: 'Fábrica' },
  { value: 'retail', label: 'Comercio' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'school', label: 'Escuela' },
  { value: 'datacenter', label: 'Centro de datos' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'residential', label: 'Residencial' },
  { value: 'mixed', label: 'Mixto' },
  { value: 'other', label: 'Otro' }
];

export const CreateSiteForm = ({ organizationId, onSuccess }: CreateSiteFormProps) => {
  const { createSite, loading, error } = useSites();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country_id: 10, // Argentina por defecto
    latitude: '',
    longitude: '',
    building_type: 'office',
    area_m2: '',
    floors: '',
    operating_hours: '',
    contact_name: '',
    contact_phone: '',
    contact_email: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const siteData = {
      organization_id: organizationId,
      name: formData.name,
      description: formData.description || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state_province: formData.state_province || undefined,
      postal_code: formData.postal_code || undefined,
      country_id: formData.country_id,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      building_type: formData.building_type,
      area_m2: formData.area_m2 ? parseFloat(formData.area_m2) : undefined,
      floors: formData.floors ? parseInt(formData.floors) : undefined,
      operating_hours: formData.operating_hours || undefined,
      contact_name: formData.contact_name || undefined,
      contact_phone: formData.contact_phone || undefined,
      contact_email: formData.contact_email || undefined
    };

    const site = await createSite(siteData);
    
    if (site && onSuccess) {
      onSuccess(site);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Información básica */}
      <div className="space-y-4">
        <h3 className="font-semibold border-b pb-2">Información Básica</h3>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre del Site *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            maxLength={200}
            className="w-full p-2 border rounded"
            placeholder="Ej: Sucursal Centro"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 border rounded"
            placeholder="Descripción del site..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tipo de Edificio</label>
          <select
            name="building_type"
            value={formData.building_type}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            {BUILDING_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ubicación */}
      <div className="space-y-4">
        <h3 className="font-semibold border-b pb-2">Ubicación</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Dirección</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Av. Corrientes 1234"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ciudad</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Buenos Aires"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Provincia/Estado</label>
            <input
              type="text"
              name="state_province"
              value={formData.state_province}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Código Postal</label>
            <input
              type="text"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Latitud</label>
            <input
              type="number"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              step="any"
              min="-90"
              max="90"
              className="w-full p-2 border rounded"
              placeholder="-34.6037"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Longitud</label>
            <input
              type="number"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              step="any"
              min="-180"
              max="180"
              className="w-full p-2 border rounded"
              placeholder="-58.3816"
            />
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div className="space-y-4">
        <h3 className="font-semibold border-b pb-2">Contacto</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              name="contact_name"
              value={formData.contact_name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          className="px-4 py-2 border rounded hover:bg-gray-50"
          onClick={() => window.history.back()}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear Site'}
        </button>
      </div>
    </form>
  );
};
```

---

## 🗺️ Integración con Mapas

Para mostrar sites en un mapa, usa las coordenadas `latitude` y `longitude`:

```tsx
// Ejemplo con react-leaflet
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const SitesMap = ({ sites }) => (
  <MapContainer center={[-34.6037, -58.3816]} zoom={13}>
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    
    {sites
      .filter(site => site.latitude && site.longitude)
      .map(site => (
        <Marker 
          key={site.id} 
          position={[site.latitude, site.longitude]}
        >
          <Popup>
            <strong>{site.name}</strong>
            <br />
            {site.address}
          </Popup>
        </Marker>
      ))
    }
  </MapContainer>
);
```

---

## 🔗 Endpoints Relacionados

- `GET /api/v1/organizations` - Listar organizaciones
- `GET /api/v1/countries` - Listar países disponibles
- `GET /api/v1/devices?site_id=SITE-XXX` - Dispositivos del site
- `GET /api/v1/files?owner_type=site&owner_id=SITE-XXX` - Archivos del site

---

*Última actualización: Noviembre 2025*
