# Changelog - EC.DATA API

Todos los cambios importantes de la API se documentan en este archivo.

---

## [Unreleased] - 2025-12-19

### BREAKING CHANGES - Estructura de Respuesta de Endpoints de Listado

Se estandariza la estructura de respuesta de todos los endpoints de listado siguiendo las mejores prácticas de REST APIs 2024.

#### Endpoints Afectados
- `GET /api/v1/devices`
- `GET /api/v1/channels`
- `GET /api/v1/sites`
- `GET /api/v1/organizations`

#### Cambio de Estructura

**ANTES:**
```json
{
  "ok": true,
  "data": {
    "devices": [...],
    "total": 33,
    "page": 1,
    "limit": 20
  },
  "meta": {
    "timestamp": "...",
    "organizationFilter": {...}
  }
}
```

**DESPUÉS:**
```json
{
  "ok": true,
  "data": [...],
  "meta": {
    "total": 33,
    "page": 1,
    "limit": 20,
    "timestamp": "...",
    "organizationFilter": {...}
  }
}
```

#### Guía de Migración para Frontend

1. **Acceso a datos:**
   - Antes: `response.data.devices` o `response.data.channels`
   - Ahora: `response.data` (directamente el array)

2. **Acceso a paginación:**
   - Antes: `response.data.total`, `response.data.page`
   - Ahora: `response.meta.total`, `response.meta.page`

3. **Ejemplo de actualización React Query:**
```typescript
// ANTES
const { data } = useQuery(['devices'], fetchDevices);
const devices = data?.data?.devices ?? [];
const total = data?.data?.total ?? 0;

// DESPUÉS
const { data } = useQuery(['devices'], fetchDevices);
const devices = data?.data ?? [];
const total = data?.meta?.total ?? 0;
```

4. **Ejemplo de actualización fetch:**
```typescript
// ANTES
const response = await fetch('/api/v1/devices');
const json = await response.json();
const devices = json.data.devices;

// DESPUÉS
const response = await fetch('/api/v1/devices');
const json = await response.json();
const devices = json.data;
```

#### Beneficios del Cambio
- Estructura más limpia y predecible
- Consistente con estándares de la industria (Stripe, GitHub API)
- `data` siempre contiene el recurso solicitado
- `meta` siempre contiene información contextual (paginación, timestamps)
- Facilita la creación de tipos TypeScript genéricos

---

## Versiones Anteriores

### 2025-12-19: Hoteles Libertador Migration
- Modificación de constraint `channels_device_ch_unique` para permitir CH duplicado en canales de energía eléctrica (fases R, S, T)
- Migración de datos: 1 organización, 33 dispositivos, 222 canales
