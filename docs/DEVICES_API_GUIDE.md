# 📟 Devices API - Guía para Frontend

Guía completa de uso de la API de Devices (Dispositivos IoT/Edge) para el equipo de frontend.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Autenticación y Permisos](#autenticación-y-permisos)
- [Identificadores](#identificadores)
- [Endpoints CRUD](#endpoints-crud)
- [Tipos de Dispositivo](#tipos-de-dispositivo)
- [Estados del Dispositivo](#estados-del-dispositivo)
- [Campos del Device](#campos-del-device)
- [Integración con Files y Channels](#integración-con-files-y-channels)
- [Manejo de Errores](#manejo-de-errores)
- [Ejemplos de Uso (React/Next.js)](#ejemplos-de-uso-reactnextjs)

---

## 📡 Descripción General

El módulo **Devices** gestiona dispositivos IoT y Edge de una organización: sensores, gateways, controladores, etc. Cada device pertenece a una organización y opcionalmente puede estar asociado a un site (ubicación física).

### Características Principales

- **Tipos de dispositivo:** Sensor, Gateway, Controller, Edge, Virtual, Other
- **Estados:** Active, Inactive, Maintenance, Decommissioned
- **Información de red:** IP, MAC Address
- **Firmware:** Versión, actualizaciones
- **Ubicación:** Asociación con Sites + pista de ubicación física
- **Metadatos:** JSON flexible para información adicional
- **Canales:** Cada device puede tener múltiples canales de comunicación
- **Archivos:** Firmware, backups, documentación (via Files API)

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

| Rol | Ver Devices | Crear | Actualizar | Eliminar |
|-----|-------------|-------|------------|----------|
| **system-admin** | ✅ Todos | ✅ | ✅ Todos | ✅ |
| **org-admin** | ✅ Su org | ✅ | ✅ Su org | ❌ |
| **org-manager** | ✅ Su org | ❌ | ❌ | ❌ |
| **user/viewer** | ✅ Su org | ❌ | ❌ | ❌ |

**Notas:**
- Solo `system-admin` puede eliminar devices
- Al eliminar un device, sus canales asociados se marcan como inactivos (cascade)

---

## 🔑 Identificadores

**⚠️ IMPORTANTE:** La API usa `public_code` para identificar devices, **NO UUID**.

```javascript
// ✅ CORRECTO
const deviceId = "DEV-621EAvIr1lqB-5"; // public_code

// ❌ INCORRECTO
const deviceId = "123e4567-e89b-12d3-a456-426614174000"; // UUID (solo interno)
```

### Formato de Public Codes

| Entidad | Formato | Ejemplo |
|---------|---------|---------|
| Device | `DEV-XXXXX-X` | `DEV-621EAvIr1lqB-5` |
| Organization | `ORG-XXXXX-X` | `ORG-yOM9ewfqOeWa-4` |
| Site | `SITE-XXXXX-X` | `SITE-61D4Vc4Oo9R-4` |
| Channel | `CHN-XXXXX-X` | `CHN-abc123def-1` |

---

## 📊 Endpoints CRUD

### 1. POST /api/v1/devices

Crea un nuevo device. Requiere rol `system-admin` u `org-admin`.

**Request Body:**
```json
{
  "organization_id": "ORG-yOM9ewfqOeWa-4",
  "site_id": "SITE-61D4Vc4Oo9R-4",
  "name": "Sensor Temperatura Sala 1",
  "description": "Sensor de temperatura y humedad en sala principal",
  "device_type": "sensor",
  "status": "active",
  "firmware_version": "v2.5.1",
  "serial_number": "SN-2024-001234",
  "ip_address": "192.168.1.100",
  "mac_address": "00:1A:2B:3C:4D:5E",
  "location_hint": "Rack 3, Slot 5",
  "metadata": {
    "manufacturer": "Acme Corp",
    "model": "TH-100",
    "installation_date": "2025-01-15"
  },
  "is_active": true
}
```

**Campos requeridos:**
- `organization_id` - Public code de la organización
- `name` - Nombre del device (máx 200 caracteres)
- `device_type` - Tipo de dispositivo

**Campos opcionales:**
- `site_id` - Public code del site donde está ubicado
- `description` - Descripción (máx 5000 caracteres)
- `status` - Estado del device (default: `active`)
- `firmware_version` - Versión del firmware (máx 50 caracteres)
- `serial_number` - Número de serie (máx 100 caracteres)
- `ip_address` - IPv4 o IPv6 válida
- `mac_address` - Formato `00:1A:2B:3C:4D:5E` o `00-1A-2B-3C-4D-5E`
- `location_hint` - Ubicación física dentro del site (máx 200 caracteres)
- `metadata` - Objeto JSON con datos adicionales
- `is_active` - Estado activo (default: `true`)

**Response (201 Created):**
```json
{
  "ok": true,
  "data": {
    "id": "DEV-621EAvIr1lqB-5",
    "name": "Sensor Temperatura Sala 1",
    "description": "Sensor de temperatura y humedad en sala principal",
    "device_type": "sensor",
    "status": "active",
    "firmware_version": "v2.5.1",
    "serial_number": "SN-2024-001234",
    "ip_address": "192.168.1.100",
    "mac_address": "00:1A:2B:3C:4D:5E",
    "location_hint": "Rack 3, Slot 5",
    "metadata": {
      "manufacturer": "Acme Corp",
      "model": "TH-100"
    },
    "is_active": true,
    "organization": {
      "id": "ORG-yOM9ewfqOeWa-4",
      "name": "EC.DATA",
      "slug": "ecdata"
    },
    "site": {
      "id": "SITE-61D4Vc4Oo9R-4",
      "name": "EC.DATA Headquarters"
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

### 2. GET /api/v1/devices

Lista devices con paginación y filtros.

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `organization_id` | string | - | Filtrar por organización (public_code) |
| `site_id` | string | - | Filtrar por site (public_code) |
| `device_type` | string | - | Filtrar por tipo de dispositivo |
| `status` | string | - | Filtrar por estado |
| `is_active` | boolean | - | Filtrar por estado activo |
| `search` | string | - | Buscar por nombre o serial_number |
| `limit` | number | 20 | Máximo de resultados (máx 100) |
| `offset` | number | 0 | Offset para paginación |

**Ejemplo de Request:**
```
GET /api/v1/devices?organization_id=ORG-yOM9ewfqOeWa-4&device_type=sensor&status=active&limit=10
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "devices": [
      {
        "id": "DEV-621EAvIr1lqB-5",
        "name": "Sensor Temperatura Sala 1",
        "device_type": "sensor",
        "status": "active",
        "firmware_version": "v2.5.1",
        "serial_number": "SN-2024-001234",
        "ip_address": "192.168.1.100",
        "is_active": true,
        "organization": {
          "id": "ORG-yOM9ewfqOeWa-4",
          "name": "EC.DATA"
        },
        "site": {
          "id": "SITE-61D4Vc4Oo9R-4",
          "name": "EC.DATA Headquarters"
        },
        "created_at": "2025-11-25T19:00:00.000Z"
      },
      {
        "id": "DEV-abc123xyz-1",
        "name": "Gateway Principal",
        "device_type": "gateway",
        "status": "active",
        "is_active": true
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

---

### 3. GET /api/v1/devices/{id}

Obtiene detalles completos de un device específico.

**Path Parameters:**
- `id` - Public code del device (`DEV-XXXXX-X`)

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "DEV-621EAvIr1lqB-5",
    "name": "Sensor Temperatura Sala 1",
    "description": "Sensor de temperatura y humedad en sala principal",
    "device_type": "sensor",
    "status": "active",
    "firmware_version": "v2.5.1",
    "serial_number": "SN-2024-001234",
    "ip_address": "192.168.1.100",
    "mac_address": "00:1A:2B:3C:4D:5E",
    "location_hint": "Rack 3, Slot 5",
    "metadata": {
      "manufacturer": "Acme Corp",
      "model": "TH-100",
      "installation_date": "2025-01-15"
    },
    "is_active": true,
    "organization": {
      "id": "ORG-yOM9ewfqOeWa-4",
      "name": "EC.DATA",
      "slug": "ecdata"
    },
    "site": {
      "id": "SITE-61D4Vc4Oo9R-4",
      "name": "EC.DATA Headquarters",
      "city": "Buenos Aires"
    },
    "channels_count": 3,
    "created_at": "2025-11-25T19:00:00.000Z",
    "updated_at": "2025-11-25T19:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

---

### 4. PUT /api/v1/devices/{id}

Actualiza un device existente. Requiere rol `system-admin` u `org-admin`.

**Path Parameters:**
- `id` - Public code del device

**Request Body (campos opcionales):**
```json
{
  "name": "Sensor Temperatura Sala 1 - Actualizado",
  "status": "maintenance",
  "firmware_version": "v2.6.0",
  "location_hint": "Rack 4, Slot 2",
  "metadata": {
    "manufacturer": "Acme Corp",
    "model": "TH-100",
    "last_maintenance": "2025-11-25"
  }
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "DEV-621EAvIr1lqB-5",
    "name": "Sensor Temperatura Sala 1 - Actualizado",
    "status": "maintenance",
    "firmware_version": "v2.6.0",
    "location_hint": "Rack 4, Slot 2",
    "updated_at": "2025-11-25T20:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-11-25T20:00:00.000Z"
  }
}
```

---

### 5. DELETE /api/v1/devices/{id}

Elimina un device (soft delete). **Solo `system-admin`**.

**Path Parameters:**
- `id` - Public code del device

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "device": {
      "id": "DEV-621EAvIr1lqB-5",
      "name": "Sensor Temperatura Sala 1",
      "status": "decommissioned"
    },
    "cascade": {
      "channels_affected": 3,
      "channel_updates": [
        { "id": "CHN-abc123-1", "status": "inactive" },
        { "id": "CHN-def456-2", "status": "inactive" },
        { "id": "CHN-ghi789-3", "status": "inactive" }
      ]
    },
    "deletion_status": {
      "deleted": true,
      "deleted_at": "2025-11-25T20:00:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2025-11-25T20:00:00.000Z",
    "action": "delete"
  }
}
```

**Nota importante:** Al eliminar un device:
- El device se marca como eliminado (soft delete)
- Todos sus canales asociados se marcan como inactivos
- El device no aparece en listados normales

---

## 📱 Tipos de Dispositivo

| Valor | Descripción | Uso típico |
|-------|-------------|------------|
| `sensor` | Sensor | Dispositivos de medición (temperatura, humedad, presión) |
| `gateway` | Gateway | Concentradores de comunicación |
| `controller` | Controlador | Dispositivos de control (PLCs, actuadores) |
| `edge` | Edge Computing | Procesamiento local en el borde |
| `virtual` | Virtual | Dispositivos virtualizados o simulados |
| `other` | Otro | Otros tipos no categorizados |

---

## 🔄 Estados del Dispositivo

| Valor | Descripción | Icono sugerido |
|-------|-------------|----------------|
| `active` | Activo y operando normalmente | 🟢 |
| `inactive` | Inactivo/Apagado | ⚫ |
| `maintenance` | En mantenimiento | 🟡 |
| `decommissioned` | Dado de baja/Retirado | 🔴 |

### Transiciones de Estado Típicas

```
active ──────► inactive (apagado)
   │              │
   ▼              ▼
maintenance ◄───► active (reparado)
   │
   ▼
decommissioned (retirado permanente)
```

---

## 📝 Campos del Device

### Campos Básicos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `organization_id` | string | **Sí** | Public code de la organización |
| `name` | string | **Sí** | Nombre del device (máx 200 chars) |
| `device_type` | enum | **Sí** | Tipo de dispositivo |
| `description` | string | No | Descripción (máx 5000 chars) |
| `status` | enum | No | Estado (default: `active`) |
| `is_active` | boolean | No | Si está activo (default: `true`) |

### Campos de Ubicación

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `site_id` | string | No | Public code del site |
| `location_hint` | string | No | Ubicación física (ej: "Rack 3, Slot 5") |

### Campos de Red

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `ip_address` | string | No | IPv4 o IPv6 válida |
| `mac_address` | string | No | Formato `00:1A:2B:3C:4D:5E` |

### Campos de Hardware

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `serial_number` | string | No | Número de serie (máx 100 chars) |
| `firmware_version` | string | No | Versión del firmware (máx 50 chars) |

### Metadatos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `metadata` | object | No | JSON con datos adicionales |

**Ejemplo de metadata:**
```json
{
  "manufacturer": "Acme Corp",
  "model": "TH-100",
  "installation_date": "2025-01-15",
  "warranty_expires": "2027-01-15",
  "sensors": ["temperature", "humidity"],
  "calibration": {
    "last_date": "2025-06-01",
    "next_date": "2025-12-01"
  }
}
```

---

## 🔗 Integración con Files y Channels

### Subir Archivos al Device

Los devices pueden tener archivos asociados (firmware, manuales, backups). Para subir archivos, usa la [Files API](./FILES_API_GUIDE.md) con:

```javascript
const uploadData = {
  organization_id: "ORG-yOM9ewfqOeWa-4",
  original_name: "firmware_v2.6.0.bin",
  mime_type: "application/octet-stream",
  size_bytes: 5242880,
  category: "firmware",          // Categoría específica para firmware
  owner_type: "device",          // <-- Importante
  owner_id: "DEV-621EAvIr1lqB-5" // <-- Public code del device
};
```

### Listar Archivos del Device

```
GET /api/v1/files?owner_type=device&owner_id=DEV-621EAvIr1lqB-5
```

### Listar Canales del Device

```
GET /api/v1/channels?device_id=DEV-621EAvIr1lqB-5
```

Para más información sobre canales, ver [Channels API Guide](./CHANNELS_API_GUIDE.md).

---

## 🚨 Manejo de Errores

### Códigos de Estado

| Código | Significado |
|--------|-------------|
| 200 | Operación exitosa |
| 201 | Device creado exitosamente |
| 400 | Error de validación |
| 401 | No autenticado |
| 403 | Sin permisos para esta operación |
| 404 | Device, organización o site no encontrado |
| 500 | Error interno del servidor |

### Formato de Error

```json
{
  "ok": false,
  "error": {
    "code": "DEVICE_NOT_FOUND",
    "message": "Device no encontrado",
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
| `device_type debe ser: sensor, gateway...` | Tipo inválido | Usar tipo válido |
| `ip_address debe ser IPv4 o IPv6 válida` | IP mal formateada | Verificar formato |
| `mac_address debe tener formato válido` | MAC mal formateada | Usar formato `00:1A:2B:3C:4D:5E` |
| `DEVICE_NOT_FOUND` | ID no existe | Verificar public_code |
| `SITE_NOT_FOUND` | Site no existe | Verificar site_id |

---

## 💻 Ejemplos de Uso (React/Next.js)

### Hook para Devices

```typescript
// hooks/useDevices.ts
import { useState, useCallback } from 'react';

interface Device {
  id: string;
  name: string;
  description?: string;
  device_type: 'sensor' | 'gateway' | 'controller' | 'edge' | 'virtual' | 'other';
  status: 'active' | 'inactive' | 'maintenance' | 'decommissioned';
  firmware_version?: string;
  serial_number?: string;
  ip_address?: string;
  mac_address?: string;
  location_hint?: string;
  metadata?: Record<string, any>;
  is_active: boolean;
  organization?: { id: string; name: string };
  site?: { id: string; name: string } | null;
  created_at: string;
}

interface ListDevicesParams {
  organization_id?: string;
  site_id?: string;
  device_type?: string;
  status?: string;
  is_active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchDevices = useCallback(async (params: ListDevicesParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.set(key, value.toString());
        }
      });

      const response = await fetch(`/api/devices?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Error al cargar devices');
      }

      setDevices(data.data.devices);
      setTotal(data.data.total);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const getDevice = useCallback(async (id: string): Promise<Device | null> => {
    try {
      const response = await fetch(`/api/devices/${id}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Device no encontrado');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    }
  }, []);

  const createDevice = useCallback(async (deviceData: {
    organization_id: string;
    name: string;
    device_type: string;
    site_id?: string;
    description?: string;
    status?: string;
    firmware_version?: string;
    serial_number?: string;
    ip_address?: string;
    mac_address?: string;
    location_hint?: string;
    metadata?: Record<string, any>;
  }): Promise<Device | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData)
      });
      
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Error al crear device');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDevice = useCallback(async (id: string, updates: Partial<Device>): Promise<Device | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/devices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Error al actualizar device');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDeviceStatus = useCallback(async (
    id: string, 
    status: Device['status']
  ): Promise<Device | null> => {
    return updateDevice(id, { status });
  }, [updateDevice]);

  return {
    devices,
    loading,
    error,
    total,
    fetchDevices,
    getDevice,
    createDevice,
    updateDevice,
    updateDeviceStatus
  };
};
```

### Componente de Lista de Devices

```tsx
// components/DevicesList.tsx
'use client';

import { useEffect, useState } from 'react';
import { useDevices } from '@/hooks/useDevices';

interface DevicesListProps {
  organizationId: string;
  siteId?: string;
}

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  decommissioned: 'bg-red-100 text-red-800'
};

const STATUS_LABELS = {
  active: 'Activo',
  inactive: 'Inactivo',
  maintenance: 'Mantenimiento',
  decommissioned: 'Retirado'
};

const DEVICE_TYPE_ICONS = {
  sensor: '📡',
  gateway: '🌐',
  controller: '🎛️',
  edge: '💻',
  virtual: '☁️',
  other: '📦'
};

export const DevicesList = ({ organizationId, siteId }: DevicesListProps) => {
  const { devices, loading, error, total, fetchDevices } = useDevices();
  const [filter, setFilter] = useState({
    device_type: '',
    status: '',
    search: ''
  });

  useEffect(() => {
    fetchDevices({ 
      organization_id: organizationId,
      site_id: siteId,
      device_type: filter.device_type || undefined,
      status: filter.status || undefined,
      search: filter.search || undefined,
      limit: 20 
    });
  }, [organizationId, siteId, filter, fetchDevices]);

  if (loading) {
    return <div className="p-4">Cargando dispositivos...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <select
          value={filter.device_type}
          onChange={(e) => setFilter(f => ({ ...f, device_type: e.target.value }))}
          className="p-2 border rounded"
        >
          <option value="">Todos los tipos</option>
          <option value="sensor">Sensores</option>
          <option value="gateway">Gateways</option>
          <option value="controller">Controladores</option>
          <option value="edge">Edge</option>
          <option value="virtual">Virtual</option>
          <option value="other">Otros</option>
        </select>

        <select
          value={filter.status}
          onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}
          className="p-2 border rounded"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="maintenance">En mantenimiento</option>
        </select>

        <input
          type="text"
          placeholder="Buscar por nombre o serial..."
          value={filter.search}
          onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
          className="p-2 border rounded flex-1 min-w-48"
        />
      </div>

      {/* Contador */}
      <div className="text-sm text-gray-500">
        {total} dispositivo{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
      </div>

      {/* Lista */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((device) => (
          <div 
            key={device.id} 
            className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {DEVICE_TYPE_ICONS[device.device_type]}
                </span>
                <div>
                  <h3 className="font-semibold">{device.name}</h3>
                  <p className="text-xs text-gray-400">{device.id}</p>
                </div>
              </div>
              
              <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[device.status]}`}>
                {STATUS_LABELS[device.status]}
              </span>
            </div>

            {device.description && (
              <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                {device.description}
              </p>
            )}

            <div className="mt-3 space-y-1 text-xs text-gray-500">
              {device.serial_number && (
                <p><strong>S/N:</strong> {device.serial_number}</p>
              )}
              {device.firmware_version && (
                <p><strong>FW:</strong> {device.firmware_version}</p>
              )}
              {device.ip_address && (
                <p><strong>IP:</strong> {device.ip_address}</p>
              )}
              {device.site && (
                <p><strong>Ubicación:</strong> {device.site.name}</p>
              )}
              {device.location_hint && (
                <p><strong>Posición:</strong> {device.location_hint}</p>
              )}
            </div>

            <div className="mt-3 flex justify-end">
              <a 
                href={`/devices/${device.id}`}
                className="text-blue-600 hover:underline text-sm"
              >
                Ver detalles →
              </a>
            </div>
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay dispositivos registrados
        </div>
      )}
    </div>
  );
};
```

### Panel de Estado de Dispositivos

```tsx
// components/DeviceStatusPanel.tsx
'use client';

import { useEffect } from 'react';
import { useDevices } from '@/hooks/useDevices';

interface DeviceStatusPanelProps {
  organizationId: string;
}

export const DeviceStatusPanel = ({ organizationId }: DeviceStatusPanelProps) => {
  const { devices, fetchDevices } = useDevices();

  useEffect(() => {
    fetchDevices({ 
      organization_id: organizationId,
      limit: 100 
    });
  }, [organizationId, fetchDevices]);

  const stats = {
    total: devices.length,
    active: devices.filter(d => d.status === 'active').length,
    inactive: devices.filter(d => d.status === 'inactive').length,
    maintenance: devices.filter(d => d.status === 'maintenance').length,
    decommissioned: devices.filter(d => d.status === 'decommissioned').length
  };

  const byType = devices.reduce((acc, d) => {
    acc[d.device_type] = (acc[d.device_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Por estado */}
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-3">Por Estado</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>🟢 Activos</span>
            <span className="font-bold">{stats.active}</span>
          </div>
          <div className="flex justify-between">
            <span>⚫ Inactivos</span>
            <span className="font-bold">{stats.inactive}</span>
          </div>
          <div className="flex justify-between">
            <span>🟡 Mantenimiento</span>
            <span className="font-bold">{stats.maintenance}</span>
          </div>
          <div className="flex justify-between">
            <span>🔴 Retirados</span>
            <span className="font-bold">{stats.decommissioned}</span>
          </div>
          <hr />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{stats.total}</span>
          </div>
        </div>
      </div>

      {/* Por tipo */}
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-3">Por Tipo</h3>
        <div className="space-y-2">
          {Object.entries(byType).map(([type, count]) => (
            <div key={type} className="flex justify-between">
              <span className="capitalize">{type}</span>
              <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## 📊 Dashboard Sugerido

Para un dashboard de dispositivos, considera mostrar:

1. **Panel de Estado Global:**
   - Contadores por estado (active, inactive, maintenance)
   - Gráfico de torta por tipo de dispositivo

2. **Lista de Alertas:**
   - Dispositivos en mantenimiento
   - Dispositivos offline (sin comunicación reciente)

3. **Mapa de Dispositivos:**
   - Ubicación de devices por site
   - Código de colores por estado

4. **Actividad Reciente:**
   - Últimos dispositivos agregados
   - Cambios de estado recientes

---

## 🔗 Endpoints Relacionados

- `GET /api/v1/organizations` - Listar organizaciones
- `GET /api/v1/sites` - Listar sites donde ubicar devices
- `GET /api/v1/channels?device_id=DEV-XXX` - Canales del device
- `GET /api/v1/files?owner_type=device&owner_id=DEV-XXX` - Archivos del device

---

*Última actualización: Noviembre 2025*
