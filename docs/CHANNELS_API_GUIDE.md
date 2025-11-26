# 📡 Channels API - Guía para Frontend

Guía completa de uso de la API de Channels (Canales de Comunicación) para el equipo de frontend.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Autenticación y Permisos](#autenticación-y-permisos)
- [Identificadores](#identificadores)
- [Endpoints CRUD](#endpoints-crud)
- [Tipos de Canal](#tipos-de-canal)
- [Protocolos Soportados](#protocolos-soportados)
- [Estados del Canal](#estados-del-canal)
- [Campos del Channel](#campos-del-channel)
- [Manejo de Errores](#manejo-de-errores)
- [Ejemplos de Uso (React/Next.js)](#ejemplos-de-uso-reactnextjs)

---

## 📶 Descripción General

El módulo **Channels** gestiona los canales de comunicación de los dispositivos IoT. Cada channel define cómo un device se conecta con sistemas externos o internos: MQTT brokers, APIs HTTP, WebSockets, protocolos industriales (Modbus, OPC-UA, BACnet), redes LPWAN (LoRaWAN, Sigfox), etc.

### Características Principales

- **Tipos de canal:** MQTT, HTTP, WebSocket, CoAP, Modbus, OPC-UA, BACnet, LoRaWAN, Sigfox
- **Protocolos:** Soporte completo para protocolos de IoT e industriales
- **Direcciones:** Inbound (entrada), Outbound (salida), Bidirectional
- **Estados:** Active, Inactive, Error, Disabled
- **Configuración flexible:** JSON para config y metadata
- **Prioridad:** Sistema de priorización de canales (1-10)
- **Credenciales:** Referencia segura a credenciales almacenadas

### Relación con Devices

Un **Device** puede tener múltiples **Channels**. Por ejemplo:
- Sensor de temperatura → Canal MQTT para datos + Canal HTTP para configuración
- Gateway → Múltiples canales Modbus para cada PLC conectado

Al eliminar un Device, todos sus Channels se marcan como inactivos automáticamente.

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

| Rol | Ver Channels | Crear | Actualizar | Eliminar |
|-----|--------------|-------|------------|----------|
| **system-admin** | ✅ Todos | ✅ | ✅ Todos | ✅ |
| **org-admin** | ✅ Su org | ✅ | ✅ Su org | ❌ |
| **org-manager** | ✅ Su org | ❌ | ❌ | ❌ |
| **user/viewer** | ✅ Su org | ❌ | ❌ | ❌ |

---

## 🔑 Identificadores

**⚠️ IMPORTANTE:** La API usa `public_code` para identificar channels, **NO UUID**.

```javascript
// ✅ CORRECTO
const channelId = "CHN-abc123def-1"; // public_code

// ❌ INCORRECTO
const channelId = "123e4567-e89b-12d3-a456-426614174000"; // UUID (solo interno)
```

### Formato de Public Codes

| Entidad | Formato | Ejemplo |
|---------|---------|---------|
| Channel | `CHN-XXXXX-X` | `CHN-abc123def-1` |
| Device | `DEV-XXXXX-X` | `DEV-621EAvIr1lqB-5` |
| Organization | `ORG-XXXXX-X` | `ORG-yOM9ewfqOeWa-4` |

---

## 📊 Endpoints CRUD

### 1. POST /api/v1/channels

Crea un nuevo channel para un device. Requiere rol `system-admin` u `org-admin`.

**Request Body:**
```json
{
  "device_id": "DEV-621EAvIr1lqB-5",
  "name": "MQTT Sensor Data Channel",
  "description": "Canal MQTT para recibir datos de sensores de temperatura",
  "channel_type": "mqtt",
  "protocol": "mqtt",
  "direction": "inbound",
  "status": "active",
  "endpoint_url": "mqtt://broker.example.com:1883",
  "config": {
    "topic": "sensors/temperature/#",
    "qos": 1,
    "retain": false,
    "clean_session": true
  },
  "credentials_ref": "mqtt_credentials_prod",
  "priority": 7,
  "metadata": {
    "retry_count": 3,
    "timeout_ms": 5000,
    "reconnect_interval": 10000
  },
  "is_active": true
}
```

**Campos requeridos:**
- `device_id` - Public code del device
- `name` - Nombre del canal (máx 200 caracteres)
- `channel_type` - Tipo de canal
- `protocol` - Protocolo de comunicación

**Campos opcionales:**
- `description` - Descripción (máx 5000 caracteres)
- `direction` - Dirección de comunicación (default: `bidirectional`)
- `status` - Estado del canal (default: `active`)
- `endpoint_url` - URL del endpoint (máx 500 caracteres)
- `config` - Objeto JSON con configuración específica
- `credentials_ref` - Referencia a credenciales almacenadas (máx 100 caracteres)
- `priority` - Prioridad 1-10 (default: 5)
- `metadata` - Objeto JSON con datos adicionales
- `is_active` - Estado activo (default: `true`)

**Response (201 Created):**
```json
{
  "ok": true,
  "data": {
    "id": "CHN-abc123def-1",
    "name": "MQTT Sensor Data Channel",
    "description": "Canal MQTT para recibir datos de sensores de temperatura",
    "channel_type": "mqtt",
    "protocol": "mqtt",
    "direction": "inbound",
    "status": "active",
    "endpoint_url": "mqtt://broker.example.com:1883",
    "config": {
      "topic": "sensors/temperature/#",
      "qos": 1
    },
    "credentials_ref": "mqtt_credentials_prod",
    "priority": 7,
    "is_active": true,
    "device": {
      "id": "DEV-621EAvIr1lqB-5",
      "name": "Sensor Temperatura Sala 1"
    },
    "organization": {
      "id": "ORG-yOM9ewfqOeWa-4",
      "name": "EC.DATA"
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

### 2. GET /api/v1/channels

Lista channels con paginación y filtros.

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `device_id` | string | - | Filtrar por device (public_code) |
| `organization_id` | string | - | Filtrar por organización (public_code) |
| `channel_type` | string | - | Filtrar por tipo de canal |
| `status` | string | - | Filtrar por estado |
| `search` | string | - | Buscar en nombre o endpoint_url |
| `limit` | number | 20 | Máximo de resultados (máx 100) |
| `offset` | number | 0 | Offset para paginación |

**Ejemplo de Request:**
```
GET /api/v1/channels?device_id=DEV-621EAvIr1lqB-5&channel_type=mqtt&status=active&limit=10
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "channels": [
      {
        "id": "CHN-abc123def-1",
        "name": "MQTT Sensor Data Channel",
        "channel_type": "mqtt",
        "protocol": "mqtt",
        "direction": "inbound",
        "status": "active",
        "endpoint_url": "mqtt://broker.example.com:1883",
        "priority": 7,
        "is_active": true,
        "device": {
          "id": "DEV-621EAvIr1lqB-5",
          "name": "Sensor Temperatura Sala 1"
        },
        "organization": {
          "id": "ORG-yOM9ewfqOeWa-4",
          "name": "EC.DATA"
        },
        "created_at": "2025-11-25T19:00:00.000Z"
      },
      {
        "id": "CHN-xyz789ghi-2",
        "name": "HTTP Config API",
        "channel_type": "http",
        "protocol": "https",
        "direction": "bidirectional",
        "status": "active"
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

### 3. GET /api/v1/channels/{id}

Obtiene detalles completos de un channel específico.

**Path Parameters:**
- `id` - Public code del channel (`CHN-XXXXX-X`)

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "CHN-abc123def-1",
    "name": "MQTT Sensor Data Channel",
    "description": "Canal MQTT para recibir datos de sensores de temperatura",
    "channel_type": "mqtt",
    "protocol": "mqtt",
    "direction": "inbound",
    "status": "active",
    "endpoint_url": "mqtt://broker.example.com:1883",
    "config": {
      "topic": "sensors/temperature/#",
      "qos": 1,
      "retain": false,
      "clean_session": true
    },
    "credentials_ref": "mqtt_credentials_prod",
    "priority": 7,
    "metadata": {
      "retry_count": 3,
      "timeout_ms": 5000
    },
    "is_active": true,
    "device": {
      "id": "DEV-621EAvIr1lqB-5",
      "name": "Sensor Temperatura Sala 1",
      "device_type": "sensor",
      "status": "active"
    },
    "organization": {
      "id": "ORG-yOM9ewfqOeWa-4",
      "name": "EC.DATA",
      "slug": "ecdata"
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

### 4. PUT /api/v1/channels/{id}

Actualiza un channel existente. Requiere rol `system-admin` u `org-admin`.

**Path Parameters:**
- `id` - Public code del channel

**Request Body (campos opcionales):**
```json
{
  "name": "MQTT Sensor Data Channel - Updated",
  "status": "inactive",
  "config": {
    "topic": "sensors/temperature/#",
    "qos": 2,
    "retain": true
  },
  "priority": 8,
  "metadata": {
    "retry_count": 5,
    "timeout_ms": 10000,
    "last_maintenance": "2025-11-25"
  }
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "CHN-abc123def-1",
    "name": "MQTT Sensor Data Channel - Updated",
    "status": "inactive",
    "priority": 8,
    "updated_at": "2025-11-25T20:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-11-25T20:00:00.000Z"
  }
}
```

---

### 5. DELETE /api/v1/channels/{id}

Elimina un channel (soft delete). **Solo `system-admin`**.

**Path Parameters:**
- `id` - Public code del channel

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "message": "Channel eliminado exitosamente"
  },
  "meta": {
    "timestamp": "2025-11-25T20:00:00.000Z"
  }
}
```

---

## 📻 Tipos de Canal

| Valor | Descripción | Uso típico |
|-------|-------------|------------|
| `mqtt` | MQTT Message Broker | Telemetría IoT en tiempo real |
| `http` | HTTP/REST API | Configuración, comandos, integraciones |
| `websocket` | WebSocket | Comunicación bidireccional en tiempo real |
| `coap` | CoAP (Constrained Application Protocol) | Dispositivos con recursos limitados |
| `modbus` | Modbus TCP/RTU | Automatización industrial, PLCs |
| `opcua` | OPC Unified Architecture | Sistemas SCADA, automatización industrial |
| `bacnet` | BACnet IP | Automatización de edificios (HVAC) |
| `lorawan` | LoRaWAN | Redes LPWAN de largo alcance |
| `sigfox` | Sigfox | Redes LPWAN de bajo consumo |
| `other` | Otro | Protocolos personalizados |

---

## 🔌 Protocolos Soportados

| Valor | Descripción | Puerto típico |
|-------|-------------|---------------|
| `mqtt` | MQTT sin encriptar | 1883 |
| `mqtts` | MQTT sobre TLS | 8883 |
| `http` | HTTP | 80 |
| `https` | HTTP sobre TLS | 443 |
| `ws` | WebSocket | 80 |
| `wss` | WebSocket sobre TLS | 443 |
| `coap` | CoAP | 5683 |
| `coaps` | CoAP sobre DTLS | 5684 |
| `modbus_tcp` | Modbus TCP | 502 |
| `modbus_rtu` | Modbus RTU (Serial) | - |
| `opcua` | OPC UA | 4840 |
| `bacnet_ip` | BACnet/IP | 47808 |
| `lorawan` | LoRaWAN | - |
| `sigfox` | Sigfox | - |
| `tcp` | TCP genérico | Variable |
| `udp` | UDP genérico | Variable |
| `other` | Otro | Variable |

---

## 🔄 Estados del Canal

| Valor | Descripción | Icono sugerido |
|-------|-------------|----------------|
| `active` | Activo y funcionando correctamente | 🟢 |
| `inactive` | Inactivo/Detenido intencionalmente | ⚫ |
| `error` | En error, requiere atención | 🔴 |
| `disabled` | Deshabilitado por configuración | 🟡 |

### Transiciones de Estado Típicas

```
active ──────► inactive (detenido)
   │              │
   │              ▼
   ▼          disabled (configuración)
 error ◄───────────┘
   │
   ▼
active (recuperado)
```

---

## ↔️ Direcciones de Comunicación

| Valor | Descripción | Ejemplo |
|-------|-------------|---------|
| `inbound` | Solo recibe datos | Sensor enviando telemetría |
| `outbound` | Solo envía datos | API enviando comandos |
| `bidirectional` | Envía y recibe | WebSocket interactivo |

---

## 📝 Campos del Channel

### Campos Básicos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `device_id` | string | **Sí** | Public code del device |
| `name` | string | **Sí** | Nombre del canal (máx 200 chars) |
| `channel_type` | enum | **Sí** | Tipo de canal |
| `protocol` | enum | **Sí** | Protocolo de comunicación |
| `description` | string | No | Descripción (máx 5000 chars) |

### Campos de Comunicación

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `direction` | enum | No | Dirección (default: `bidirectional`) |
| `status` | enum | No | Estado (default: `active`) |
| `endpoint_url` | string | No | URL del endpoint (máx 500 chars) |

### Campos de Configuración

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `config` | object | No | Configuración específica del protocolo |
| `credentials_ref` | string | No | Referencia a credenciales (máx 100 chars) |
| `priority` | number | No | Prioridad 1-10 (default: 5) |
| `metadata` | object | No | Metadatos adicionales |
| `is_active` | boolean | No | Estado activo (default: `true`) |

### Ejemplos de Config por Tipo

**MQTT:**
```json
{
  "topic": "sensors/temperature/#",
  "qos": 1,
  "retain": false,
  "clean_session": true,
  "client_id": "device_001"
}
```

**HTTP:**
```json
{
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "timeout_ms": 5000,
  "retry_count": 3
}
```

**WebSocket:**
```json
{
  "ping_interval": 30000,
  "reconnect_delay": 5000,
  "max_reconnect_attempts": 10
}
```

**Modbus:**
```json
{
  "slave_id": 1,
  "register_start": 0,
  "register_count": 10,
  "function_code": 3,
  "poll_interval_ms": 1000
}
```

---

## 🚨 Manejo de Errores

### Códigos de Estado

| Código | Significado |
|--------|-------------|
| 200 | Operación exitosa |
| 201 | Channel creado exitosamente |
| 400 | Error de validación |
| 401 | No autenticado |
| 403 | Sin permisos para esta operación |
| 404 | Channel o device no encontrado |
| 500 | Error interno del servidor |

### Formato de Error

```json
{
  "ok": false,
  "error": {
    "code": "CHANNEL_NOT_FOUND",
    "message": "Channel no encontrado",
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
| `device_id es requerido` | Falta device | Agregar device_id |
| `channel_type debe ser: mqtt, http...` | Tipo inválido | Usar tipo válido |
| `protocol debe ser: mqtt, http...` | Protocolo inválido | Usar protocolo válido |
| `endpoint_url debe ser una URL válida` | URL mal formateada | Verificar formato URL |
| `priority debe estar entre 1 y 10` | Prioridad fuera de rango | Usar valor 1-10 |
| `DEVICE_NOT_FOUND` | Device no existe | Verificar device_id |
| `CHANNEL_NOT_FOUND` | Channel no existe | Verificar public_code |

---

## 💻 Ejemplos de Uso (React/Next.js)

### Hook para Channels

```typescript
// hooks/useChannels.ts
import { useState, useCallback } from 'react';

interface Channel {
  id: string;
  name: string;
  description?: string;
  channel_type: 'mqtt' | 'http' | 'websocket' | 'coap' | 'modbus' | 'opcua' | 'bacnet' | 'lorawan' | 'sigfox' | 'other';
  protocol: string;
  direction: 'inbound' | 'outbound' | 'bidirectional';
  status: 'active' | 'inactive' | 'error' | 'disabled';
  endpoint_url?: string;
  config?: Record<string, any>;
  credentials_ref?: string;
  priority: number;
  metadata?: Record<string, any>;
  is_active: boolean;
  device?: { id: string; name: string };
  organization?: { id: string; name: string };
  created_at: string;
}

interface ListChannelsParams {
  device_id?: string;
  organization_id?: string;
  channel_type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const useChannels = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchChannels = useCallback(async (params: ListChannelsParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.set(key, value.toString());
        }
      });

      const response = await fetch(`/api/channels?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Error al cargar channels');
      }

      setChannels(data.data.channels);
      setTotal(data.data.total);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const getChannel = useCallback(async (id: string): Promise<Channel | null> => {
    try {
      const response = await fetch(`/api/channels/${id}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Channel no encontrado');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    }
  }, []);

  const createChannel = useCallback(async (channelData: {
    device_id: string;
    name: string;
    channel_type: string;
    protocol: string;
    description?: string;
    direction?: string;
    status?: string;
    endpoint_url?: string;
    config?: Record<string, any>;
    credentials_ref?: string;
    priority?: number;
    metadata?: Record<string, any>;
  }): Promise<Channel | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelData)
      });
      
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Error al crear channel');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateChannel = useCallback(async (id: string, updates: Partial<Channel>): Promise<Channel | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Error al actualizar channel');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateChannelStatus = useCallback(async (
    id: string, 
    status: Channel['status']
  ): Promise<Channel | null> => {
    return updateChannel(id, { status });
  }, [updateChannel]);

  return {
    channels,
    loading,
    error,
    total,
    fetchChannels,
    getChannel,
    createChannel,
    updateChannel,
    updateChannelStatus
  };
};
```

### Componente de Lista de Channels por Device

```tsx
// components/DeviceChannels.tsx
'use client';

import { useEffect } from 'react';
import { useChannels } from '@/hooks/useChannels';

interface DeviceChannelsProps {
  deviceId: string;
  deviceName: string;
}

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  error: 'bg-red-100 text-red-800',
  disabled: 'bg-yellow-100 text-yellow-800'
};

const STATUS_LABELS = {
  active: 'Activo',
  inactive: 'Inactivo',
  error: 'Error',
  disabled: 'Deshabilitado'
};

const CHANNEL_TYPE_ICONS = {
  mqtt: '📡',
  http: '🌐',
  websocket: '🔌',
  coap: '📶',
  modbus: '🏭',
  opcua: '⚙️',
  bacnet: '🏢',
  lorawan: '📻',
  sigfox: '📱',
  other: '📦'
};

const DIRECTION_ARROWS = {
  inbound: '⬅️',
  outbound: '➡️',
  bidirectional: '↔️'
};

export const DeviceChannels = ({ deviceId, deviceName }: DeviceChannelsProps) => {
  const { channels, loading, error, fetchChannels } = useChannels();

  useEffect(() => {
    fetchChannels({ device_id: deviceId });
  }, [deviceId, fetchChannels]);

  if (loading) {
    return <div className="p-4">Cargando canales...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">
          Canales de {deviceName} ({channels.length})
        </h3>
        <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          + Nuevo Canal
        </button>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
          Este dispositivo no tiene canales configurados
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((channel) => (
            <div 
              key={channel.id} 
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {CHANNEL_TYPE_ICONS[channel.channel_type]}
                  </span>
                  <div>
                    <h4 className="font-medium">{channel.name}</h4>
                    <p className="text-xs text-gray-400">{channel.id}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-lg" title={channel.direction}>
                    {DIRECTION_ARROWS[channel.direction]}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[channel.status]}`}>
                    {STATUS_LABELS[channel.status]}
                  </span>
                </div>
              </div>

              {channel.description && (
                <p className="text-gray-600 text-sm mt-2 line-clamp-1">
                  {channel.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-gray-100 rounded">
                  {channel.channel_type.toUpperCase()}
                </span>
                <span className="px-2 py-1 bg-gray-100 rounded">
                  {channel.protocol}
                </span>
                {channel.priority !== 5 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    Prioridad: {channel.priority}
                  </span>
                )}
              </div>

              {channel.endpoint_url && (
                <div className="mt-2 text-xs text-gray-500 font-mono truncate">
                  {channel.endpoint_url}
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <a 
                  href={`/channels/${channel.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Configurar →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Panel de Estado de Channels

```tsx
// components/ChannelStatusPanel.tsx
'use client';

interface ChannelStatusPanelProps {
  channels: Array<{
    id: string;
    name: string;
    channel_type: string;
    status: string;
  }>;
}

export const ChannelStatusPanel = ({ channels }: ChannelStatusPanelProps) => {
  const stats = {
    total: channels.length,
    active: channels.filter(c => c.status === 'active').length,
    inactive: channels.filter(c => c.status === 'inactive').length,
    error: channels.filter(c => c.status === 'error').length,
    disabled: channels.filter(c => c.status === 'disabled').length
  };

  const byType = channels.reduce((acc, c) => {
    acc[c.channel_type] = (acc[c.channel_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Por estado */}
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-3">Estado de Canales</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>🟢 Activos</span>
            <span className="font-bold text-green-600">{stats.active}</span>
          </div>
          <div className="flex justify-between">
            <span>⚫ Inactivos</span>
            <span className="font-bold text-gray-600">{stats.inactive}</span>
          </div>
          <div className="flex justify-between">
            <span>🔴 Con error</span>
            <span className="font-bold text-red-600">{stats.error}</span>
          </div>
          <div className="flex justify-between">
            <span>🟡 Deshabilitados</span>
            <span className="font-bold text-yellow-600">{stats.disabled}</span>
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
        <h3 className="font-semibold mb-3">Por Protocolo</h3>
        <div className="space-y-2">
          {Object.entries(byType)
            .sort(([,a], [,b]) => b - a)
            .map(([type, count]) => (
              <div key={type} className="flex justify-between">
                <span className="uppercase text-sm">{type}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};
```

---

## 🔗 Endpoints Relacionados

- `GET /api/v1/devices` - Listar devices (padres de channels)
- `GET /api/v1/devices/{id}` - Detalle del device
- `GET /api/v1/organizations` - Listar organizaciones
- `GET /api/v1/files?owner_type=channel&owner_id=CHN-XXX` - Archivos del channel

---

## 📌 Notas Importantes

1. **Herencia de organización:** El `organization_id` del channel se hereda automáticamente del device padre. No se especifica en la creación.

2. **Cascade en eliminación de device:** Cuando se elimina un device, todos sus channels se marcan como `inactive` y `is_active: false`.

3. **Nombre único por device:** El nombre del channel debe ser único dentro del mismo device.

4. **Credenciales seguras:** Usa `credentials_ref` para referenciar credenciales almacenadas de forma segura, nunca almacenes passwords en `config`.

5. **Prioridad:** Útil cuando un device tiene múltiples canales y necesitas definir cuál usar primero (menor número = mayor prioridad).

---

*Última actualización: Noviembre 2025*
