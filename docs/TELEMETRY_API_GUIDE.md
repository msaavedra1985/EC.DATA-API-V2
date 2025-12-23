# 📊 Telemetry API - Guía para Frontend

Guía completa de uso de la API de Telemetría para el equipo de frontend. Esta API permite consultar datos de sensores IoT almacenados en Apache Cassandra.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura de Datos](#arquitectura-de-datos)
- [Autenticación](#autenticación)
- [Endpoints de Datos](#endpoints-de-datos)
  - [Datos Históricos](#1-get-apiv1telemetrychannelschannelIddata)
  - [Último Dato (Polling)](#2-get-apiv1telemetrychannelschannelIdlatest)
  - [Batch de Últimos Datos](#3-post-apiv1telemetrybatchlatest)
- [Resoluciones Temporales](#resoluciones-temporales)
- [Filtros Avanzados](#filtros-avanzados)
- [Variables CRUD](#variables-crud)
- [Estructura de Respuestas](#estructura-de-respuestas)
- [Manejo de Errores](#manejo-de-errores)
- [Integración Next.js](#integración-nextjs)
- [Estrategias de Polling y Caching](#estrategias-de-polling-y-caching)

---

## 📡 Descripción General

El módulo **Telemetry** gestiona la consulta de datos de mediciones de dispositivos IoT. Los datos se almacenan en Apache Cassandra optimizado para series temporales, mientras que los metadatos (variables, tipos de medición, canales) residen en PostgreSQL.

### Características Principales

- **Múltiples resoluciones:** raw, 1 minuto, 15 minutos, 1 hora, diario, mensual
- **Consultas en paralelo:** Batch de hasta 50 canales simultáneos
- **Polling optimizado:** Parámetro `since` para reducir transferencia de datos
- **Filtros temporales:** Excluir días de la semana, rangos horarios
- **Soporte timezone:** Conversión automática a cualquier zona horaria
- **Cache Redis:** Respuestas cacheadas con TTL inteligente por resolución
- **Multi-idioma:** Variables con traducciones (español, inglés)

### Flujo de Datos

```
Sensor → Gateway → Cassandra (raw) → Agregaciones (1m, 15m, 60m, daily, monthly)
                          ↓
                    API Telemetry
                          ↓
                   Frontend (Dashboard)
```

---

## 🗄️ Arquitectura de Datos

### Cassandra (Datos de Series Temporales)

| Tabla | Resolución | Retención | Uso |
|-------|------------|-----------|-----|
| `measurements_raw` | Sin agregación | 7 días | Debugging, análisis detallado |
| `measurements_1m` | 1 minuto | 30 días | Dashboards tiempo real |
| `measurements_15m` | 15 minutos | 90 días | Gráficas corto plazo |
| `measurements_60m` | 1 hora | 1 año | Análisis semanal/mensual |
| `measurements_daily` | Diario | 5 años | Reportes, facturación |
| `measurements_monthly` | Mensual | Indefinido | Históricos, tendencias |

### PostgreSQL (Metadatos)

- **channels:** Información del canal (nombre, device, organización)
- **devices:** Información del dispositivo
- **measurement_types:** Tipos de medición (energía, agua, gas, ambiente)
- **variables:** Definición de variables con traducciones
- **variable_translations:** Nombres y descripciones por idioma

---

## 🔐 Autenticación

Todos los endpoints requieren autenticación mediante Bearer token JWT:

```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

---

## 📊 Endpoints de Datos

### 1. GET /api/v1/telemetry/channels/{channelId}/data

Obtiene datos históricos de telemetría de un canal específico.

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `channelId` | string | ✅ | ID del canal (UUID o public_code `CHN-XXXXX-X`) |

**Query Parameters:**

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `from` | string | ✅ | - | Fecha inicio (ISO 8601 o YYYY-MM-DD) |
| `to` | string | ✅ | - | Fecha fin (ISO 8601 o YYYY-MM-DD) |
| `resolution` | string | ❌ | `1m` | Resolución: `raw`, `1m`, `15m`, `60m`, `daily`, `monthly` |
| `tz` | string | ❌ | UTC | Timezone IANA (ej: `America/Lima`) |
| `variables` | number[] | ❌ | todas | IDs de variables específicas |
| `excludeDays` | number[] | ❌ | ninguno | Días a excluir (0=Dom, 6=Sáb) |

**Ejemplo Request:**

```javascript
const response = await fetch(
  `${API_URL}/api/v1/telemetry/channels/CHN-5Q775-2/data?` + 
  new URLSearchParams({
    from: '2024-12-01',
    to: '2024-12-15',
    resolution: 'daily',
    tz: 'America/Lima'
  }),
  { headers }
);
```

**Ejemplo Response:**

```json
{
  "ok": true,
  "data": {
    "metadata": {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "timezone": "America/Lima",
      "deviceName": "Medidor Principal Hotel",
      "channelName": "Canal Energía Activa",
      "resolution": "daily",
      "totalRecords": 15,
      "period": {
        "from": "2024-12-01T00:00:00-05:00",
        "to": "2024-12-15T23:59:59-05:00"
      }
    },
    "variables": {
      "1": {
        "id": 1,
        "name": "Energía Activa",
        "unit": "kWh",
        "column": "energia_activa",
        "chartType": "line",
        "aggregationType": "sum"
      },
      "2": {
        "id": 2,
        "name": "Potencia Máxima",
        "unit": "kW",
        "column": "potencia_max",
        "chartType": "line",
        "aggregationType": "max"
      }
    },
    "data": [
      {
        "ts": "2024-12-01T00:00:00-05:00",
        "values": {
          "1": 1250.5,
          "2": 85.3
        }
      },
      {
        "ts": "2024-12-02T00:00:00-05:00",
        "values": {
          "1": 1180.2,
          "2": 82.1
        }
      }
    ]
  }
}
```

---

### 2. GET /api/v1/telemetry/channels/{channelId}/latest

Obtiene el último dato disponible de un canal. Ideal para polling/pseudo-realtime.

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `channelId` | string | ✅ | ID del canal (UUID o public_code) |

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `since` | string | ❌ | ISO timestamp del último dato que tiene el cliente |

**Optimización con `since`:**

El parámetro `since` reduce transferencia de datos en polling frecuente:
- Si **no hay datos más nuevos** → retorna `{ hasNew: false }` (respuesta mínima)
- Si **hay datos nuevos** → retorna datos completos con `{ hasNew: true }`

**Ejemplo Request (sin since):**

```javascript
const response = await fetch(
  `${API_URL}/api/v1/telemetry/channels/CHN-5Q775-2/latest`,
  { headers }
);
```

**Ejemplo Response (con datos):**

```json
{
  "ok": true,
  "data": {
    "hasNew": true,
    "lastChecked": "2024-12-22T15:30:00.000Z",
    "metadata": {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "deviceName": "Medidor Principal Hotel",
      "channelName": "Canal Energía Activa"
    },
    "variables": {
      "1": { "name": "Energía Activa", "unit": "kWh" },
      "2": { "name": "Potencia Actual", "unit": "kW" }
    },
    "data": {
      "ts": "2024-12-22T15:29:00.000Z",
      "values": {
        "1": 45.2,
        "2": 12.8
      }
    }
  }
}
```

**Ejemplo Request (con since - polling optimizado):**

```javascript
const lastTs = "2024-12-22T15:29:00.000Z";
const response = await fetch(
  `${API_URL}/api/v1/telemetry/channels/CHN-5Q775-2/latest?since=${lastTs}`,
  { headers }
);
```

**Ejemplo Response (sin cambios):**

```json
{
  "ok": true,
  "data": {
    "hasNew": false,
    "lastChecked": "2024-12-22T15:30:05.000Z"
  }
}
```

---

### 3. POST /api/v1/telemetry/batch/latest

Obtiene últimos datos de múltiples canales en paralelo. Ideal para dashboards con múltiples sensores.

**Request Body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `channels` | array | ✅ | Array de identificadores (máx 50) |
| `since` | string | ❌ | ISO timestamp para optimización de polling |

**Tipos de identificador soportados:**

```javascript
// Opción 1: Array de public_codes (más común)
{
  "channels": ["CHN-5Q775-2", "CHN-7B3R2-8", "CHN-4K9P1-3"]
}

// Opción 2: Objeto con publicCode
{
  "channels": [
    { "publicCode": "CHN-5Q775-2" },
    { "publicCode": "CHN-7B3R2-8" }
  ]
}

// Opción 3: Objeto con channelUuid (para backend/cron)
{
  "channels": [
    { "channelUuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
  ]
}

// Opción 4: Objeto deviceChannel (para batch por device)
{
  "channels": [
    { "deviceChannel": { "deviceCode": "DEV-XXXXX-X", "ch": 1 } },
    { "deviceChannel": { "deviceCode": "DEV-XXXXX-X", "ch": 2 } }
  ]
}
```

**Ejemplo Request:**

```javascript
const response = await fetch(
  `${API_URL}/api/v1/telemetry/batch/latest`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      channels: ["CHN-5Q775-2", "CHN-7B3R2-8", "CHN-4K9P1-3"],
      since: "2024-12-22T15:00:00.000Z"
    })
  }
);
```

**Ejemplo Response:**

```json
{
  "ok": true,
  "data": {
    "batchMeta": {
      "totalChannels": 3,
      "successCount": 3,
      "errorCount": 0,
      "withNewData": 2,
      "elapsedMs": 45
    },
    "results": [
      {
        "identifier": "CHN-5Q775-2",
        "success": true,
        "hasNew": true,
        "data": {
          "ts": "2024-12-22T15:29:00.000Z",
          "values": { "1": 45.2, "2": 12.8 }
        },
        "metadata": {
          "deviceName": "Medidor Principal",
          "channelName": "Energía Activa"
        }
      },
      {
        "identifier": "CHN-7B3R2-8",
        "success": true,
        "hasNew": true,
        "data": {
          "ts": "2024-12-22T15:28:30.000Z",
          "values": { "5": 22.1, "6": 65.0 }
        },
        "metadata": {
          "deviceName": "Sensor Ambiente",
          "channelName": "Temperatura/Humedad"
        }
      },
      {
        "identifier": "CHN-4K9P1-3",
        "success": true,
        "hasNew": false
      }
    ]
  }
}
```

---

## ⏱️ Resoluciones Temporales

| Resolución | Descripción | Uso Recomendado | TTL Cache |
|------------|-------------|-----------------|-----------|
| `raw` | Datos sin procesar | Debugging, análisis detallado | 30s |
| `1m` | Promedio cada minuto | Dashboards realtime | 30s |
| `15m` | Promedio cada 15 min | Gráficas intradiarias | 10min |
| `60m` | Promedio cada hora | Análisis semanal | 1h |
| `daily` | Agregado diario | Reportes, facturación | 1h |
| `monthly` | Agregado mensual | Históricos, tendencias | 24h |

### Selección de Resolución por Rango de Fechas

```javascript
const getOptimalResolution = (from, to) => {
  const diffDays = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24);
  
  if (diffDays <= 1) return '1m';      // Hasta 1 día → minutos
  if (diffDays <= 7) return '15m';     // Hasta 1 semana → 15 min
  if (diffDays <= 30) return '60m';    // Hasta 1 mes → horas
  if (diffDays <= 365) return 'daily'; // Hasta 1 año → diario
  return 'monthly';                     // Más de 1 año → mensual
};
```

---

## 🔧 Filtros Avanzados

### Excluir Días de la Semana

Útil para análisis de consumo laboral vs. fines de semana:

```javascript
// Excluir sábados (6) y domingos (0)
const params = new URLSearchParams({
  from: '2024-12-01',
  to: '2024-12-31',
  resolution: 'daily',
  'excludeDays[]': [0, 6]
});
```

| Valor | Día |
|-------|-----|
| 0 | Domingo |
| 1 | Lunes |
| 2 | Martes |
| 3 | Miércoles |
| 4 | Jueves |
| 5 | Viernes |
| 6 | Sábado |

### Filtrar Variables Específicas

Solo consultar variables de interés:

```javascript
// Solo energía activa (1) y reactiva (3)
const params = new URLSearchParams({
  from: '2024-12-01',
  to: '2024-12-15',
  resolution: 'daily',
  'variables[]': [1, 3]
});
```

---

## 📐 Variables CRUD

### GET /api/v1/telemetry/variables

Lista todas las variables de telemetría con filtros opcionales.

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `search` | string | Búsqueda por nombre, descripción o column_name |
| `measurementTypeId` | number | Filtrar por tipo de medición |
| `isRealtime` | boolean | Variables con soporte realtime |
| `isDefault` | boolean | Variables por defecto |
| `isActive` | boolean | Estado activo (default: true) |
| `showInBilling` | boolean | Visibilidad en facturación |
| `showInAnalysis` | boolean | Visibilidad en análisis |
| `chartType` | string | Tipo de gráfico (line, bar, area, gauge) |
| `aggregationType` | string | Tipo de agregación (sum, avg, max, min, last) |
| `limit` | number | Límite de resultados (default: 20, max: 100) |
| `offset` | number | Offset para paginación |
| `sortBy` | string | Campo de ordenamiento |
| `sortOrder` | string | asc o desc |
| `lang` | string | Idioma para traducciones (es, en) |

**Ejemplo Request:**

```javascript
const response = await fetch(
  `${API_URL}/api/v1/telemetry/variables?` +
  new URLSearchParams({
    measurementTypeId: 1,
    isActive: true,
    showInAnalysis: true,
    lang: 'es',
    limit: 50
  }),
  { headers }
);
```

**Ejemplo Response:**

```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "column_name": "energia_activa",
      "name": "Energía Activa",
      "description": "Consumo de energía activa en kWh",
      "unit": "kWh",
      "measurement_type_id": 1,
      "measurement_type_name": "Energía Eléctrica",
      "is_realtime": true,
      "is_default": true,
      "show_in_billing": true,
      "show_in_analysis": true,
      "chart_type": "line",
      "aggregation_type": "sum",
      "decimal_places": 2,
      "icon": "zap",
      "color": "#22c55e",
      "display_order": 1
    }
  ],
  "meta": {
    "total": 71,
    "page": 1,
    "limit": 50
  }
}
```

### GET /api/v1/telemetry/variables/{id}

Obtiene una variable específica con todas sus traducciones.

```javascript
const response = await fetch(
  `${API_URL}/api/v1/telemetry/variables/1?lang=es`,
  { headers }
);
```

### POST /api/v1/telemetry/variables

Crea una nueva variable (requiere rol admin).

```javascript
const response = await fetch(
  `${API_URL}/api/v1/telemetry/variables`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      column_name: "energia_solar",
      measurement_type_id: 1,
      unit: "kWh",
      is_realtime: true,
      is_default: false,
      show_in_billing: true,
      show_in_analysis: true,
      chart_type: "area",
      aggregation_type: "sum",
      decimal_places: 2,
      icon: "sun",
      color: "#f59e0b",
      display_order: 10,
      translations: {
        es: {
          name: "Energía Solar",
          description: "Generación de energía solar fotovoltaica"
        },
        en: {
          name: "Solar Energy",
          description: "Photovoltaic solar energy generation"
        }
      }
    })
  }
);
```

### PUT /api/v1/telemetry/variables/{id}

Actualiza una variable existente.

### DELETE /api/v1/telemetry/variables/{id}

Elimina una variable (soft delete, marca como inactiva).

---

## 📦 Estructura de Respuestas

Todas las respuestas siguen el patrón envelope estándar:

```typescript
interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp?: string;
  };
}
```

---

## ⚠️ Manejo de Errores

| Código HTTP | Código Error | Descripción |
|-------------|--------------|-------------|
| 400 | `VALIDATION_ERROR` | Parámetros inválidos |
| 401 | `UNAUTHORIZED` | Token inválido o expirado |
| 404 | `NOT_FOUND` | Canal no encontrado |
| 404 | `CHANNEL_NOT_FOUND` | Canal no existe |
| 404 | `VARIABLE_NOT_FOUND` | Variable no existe |
| 409 | `DUPLICATE_VARIABLE` | Variable duplicada (mismo column_name y measurement_type) |
| 500 | `INTERNAL_ERROR` | Error interno del servidor |
| 503 | `CASSANDRA_UNAVAILABLE` | Base de datos de telemetría no disponible |

**Ejemplo Error Response:**

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Parámetros inválidos",
    "details": [
      {
        "field": "from",
        "message": "from es requerido"
      }
    ]
  }
}
```

---

## ⚛️ Integración Next.js

### Hook: useTelemetryData

```typescript
// hooks/useTelemetryData.ts
import { useState, useEffect, useCallback } from 'react';

interface TelemetryParams {
  channelId: string;
  from: string;
  to: string;
  resolution?: 'raw' | '1m' | '15m' | '60m' | 'daily' | 'monthly';
  tz?: string;
  variables?: number[];
}

export const useTelemetryData = (params: TelemetryParams) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!params.channelId || !params.from || !params.to) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        from: params.from,
        to: params.to,
        resolution: params.resolution || '1m',
        ...(params.tz && { tz: params.tz })
      });
      
      if (params.variables?.length) {
        params.variables.forEach(v => queryParams.append('variables[]', v.toString()));
      }
      
      const response = await fetch(
        `/api/telemetry/channels/${params.channelId}/data?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      
      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(result.error?.message || 'Error al obtener datos');
      }
      
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
```

### Hook: useTelemetryPolling

```typescript
// hooks/useTelemetryPolling.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface PollingOptions {
  channelId: string;
  interval?: number; // ms, default 30000
  enabled?: boolean;
}

export const useTelemetryPolling = ({ channelId, interval = 30000, enabled = true }: PollingOptions) => {
  const [data, setData] = useState(null);
  const [lastTs, setLastTs] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  const fetchLatest = useCallback(async () => {
    if (!channelId) return;
    
    setLoading(true);
    
    try {
      const url = lastTs 
        ? `/api/telemetry/channels/${channelId}/latest?since=${lastTs}`
        : `/api/telemetry/channels/${channelId}/latest`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      const result = await response.json();
      
      if (result.ok && result.data.hasNew) {
        setData(result.data);
        setLastTs(result.data.data?.ts || null);
      }
    } catch (err) {
      console.error('Polling error:', err);
    } finally {
      setLoading(false);
    }
  }, [channelId, lastTs]);

  useEffect(() => {
    if (!enabled) return;
    
    fetchLatest();
    intervalRef.current = setInterval(fetchLatest, interval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, fetchLatest]);

  return { data, loading, lastTs };
};
```

### Hook: useTelemetryBatch

```typescript
// hooks/useTelemetryBatch.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface BatchOptions {
  channels: string[];
  interval?: number;
  enabled?: boolean;
}

export const useTelemetryBatch = ({ channels, interval = 30000, enabled = true }: BatchOptions) => {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [batchMeta, setBatchMeta] = useState(null);
  const lastCheckRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  const fetchBatch = useCallback(async () => {
    if (!channels.length) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/telemetry/batch/latest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channels,
          since: lastCheckRef.current
        })
      });
      
      const result = await response.json();
      
      if (result.ok) {
        setBatchMeta(result.data.batchMeta);
        
        const newResults = { ...results };
        result.data.results.forEach((r: any) => {
          if (r.success && r.hasNew) {
            newResults[r.identifier] = r;
          }
        });
        setResults(newResults);
        
        lastCheckRef.current = new Date().toISOString();
      }
    } catch (err) {
      console.error('Batch polling error:', err);
    } finally {
      setLoading(false);
    }
  }, [channels, results]);

  // Auto-polling
  useEffect(() => {
    if (!enabled) return;
    
    fetchBatch();
    intervalRef.current = setInterval(fetchBatch, interval);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, interval]);

  return { results, loading, batchMeta, refetch: fetchBatch };
};
```

### Componente: TelemetryChart

```tsx
// components/TelemetryChart.tsx
import { useMemo } from 'react';
import { useTelemetryData } from '@/hooks/useTelemetryData';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  channelId: string;
  from: string;
  to: string;
  resolution?: string;
  variableId?: number;
}

export const TelemetryChart = ({ channelId, from, to, resolution = 'daily', variableId }: Props) => {
  const { data, loading, error } = useTelemetryData({
    channelId,
    from,
    to,
    resolution,
    variables: variableId ? [variableId] : undefined,
    tz: 'America/Lima'
  });

  const chartData = useMemo(() => {
    if (!data?.data) return [];
    
    return data.data.map((point: any) => ({
      ts: new Date(point.ts).toLocaleDateString(),
      ...point.values
    }));
  }, [data]);

  const variables = data?.variables || {};

  if (loading) return <div className="animate-pulse h-64 bg-gray-100 rounded" />;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!chartData.length) return <div>Sin datos disponibles</div>;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <XAxis dataKey="ts" />
          <YAxis />
          <Tooltip />
          {Object.entries(variables).map(([id, variable]: [string, any]) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              name={variable.name}
              stroke={variable.color || '#8884d8'}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

---

## 🔄 Estrategias de Polling y Caching

### Intervalos Recomendados

| Caso de Uso | Intervalo | Método |
|-------------|-----------|--------|
| Dashboard realtime | 10-30 seg | `useTelemetryPolling` con `since` |
| Panel multi-sensor | 30-60 seg | `useTelemetryBatch` |
| Gráfica histórica | Sin polling | `useTelemetryData` + refetch manual |
| Alertas críticas | 5-10 seg | WebSocket (futuro) o polling agresivo |

### Optimización de Polling con `since`

```typescript
// ✅ CORRECTO - Solo transfiere datos nuevos
const url = `/api/telemetry/channels/${id}/latest?since=${lastTs}`;

// ❌ INCORRECTO - Transfiere datos completos cada vez
const url = `/api/telemetry/channels/${id}/latest`;
```

### Cache del Lado del Cliente

```typescript
// Ejemplo con React Query
import { useQuery } from '@tanstack/react-query';

export const useTelemetryWithCache = (channelId: string, from: string, to: string) => {
  return useQuery({
    queryKey: ['telemetry', channelId, from, to],
    queryFn: () => fetchTelemetryData(channelId, from, to),
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false
  });
};
```

### Gestión de Errores de Conexión

```typescript
const fetchWithRetry = async (url: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok) return response.json();
      
      if (response.status === 503) {
        // Cassandra no disponible, esperar y reintentar
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
```

---

## 📝 Notas Adicionales

- **Límite de batch:** Máximo 50 canales por request en `/batch/latest`
- **Timezone:** Si no se especifica `tz`, los datos se retornan en UTC
- **Variables:** Si no se especifica `variables`, se retornan todas las variables del canal
- **Soft delete:** Las variables eliminadas se marcan como `is_active = false`, no se borran
- **Cache invalidation:** Al crear/editar/eliminar variables, el cache global se invalida automáticamente

---

*Documentación actualizada: Diciembre 2024*
*Versión API: v1*
