# Error Logs Endpoints

> **Última actualización**: 2026-01-21
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de error logs.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/error-logs` | Registrar error | No (público) |

---

## POST /api/v1/error-logs

**Propósito**: Registrar errores desde frontend u otros servicios

**Autenticación**: **No requerida** (endpoint público)

> **Nota**: Si se envía JWT en header, se extrae automáticamente `user_id` y `organization_id` del token para enriquecer el log.

**Body**:
```json
{
  "source": "frontend",
  "level": "error",
  "error_code": "COMPONENT_RENDER_ERROR",
  "error_message": "Failed to render ProductList component",
  "stack_trace": "Error: Cannot read property 'map' of undefined\n    at ProductList.render...",
  "endpoint": "/dashboard/products",
  "method": "GET",
  "status_code": 500,
  "session_id": "sess_abc123xyz",
  "correlation_id": "corr_xyz789",
  "context": {
    "url": "/dashboard/products",
    "component": "ProductList",
    "action": "initial_render"
  },
  "metadata": {
    "browser": "Chrome 118",
    "os": "Windows 11",
    "screen_size": "1920x1080"
  }
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| source | string | Sí | `frontend` o `backend` |
| level | string | No | `error`, `warning`, `critical` (default: `error`) |
| error_code | string | Sí | Código único del error |
| error_message | string | Sí | Mensaje descriptivo |
| stack_trace | string | No | Stack trace del error |
| endpoint | string | No | Endpoint donde ocurrió |
| method | string | No | Método HTTP |
| status_code | number | No | Código HTTP |
| session_id | string | No | ID de sesión frontend |
| correlation_id | string | No | ID para correlacionar con audit_logs |
| context | object | No | Contexto adicional |
| metadata | object | No | Metadata del cliente |

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "request_id": "01919eb8-5e8a-7890-b456-123456789abc",
    "source": "frontend",
    "level": "error",
    "error_code": "COMPONENT_RENDER_ERROR",
    "correlation_id": "corr_xyz789"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | VALIDATION_ERROR | Campos requeridos faltantes |

**Notas**:
- **Endpoint público**: Permite reportar errores incluso sin autenticación
- **Captura automática**: IP y user-agent del request
- **Enriquecimiento**: Si hay JWT válido, extrae user_id y organization_id
- **Dual storage**: Winston escribe a PostgreSQL (`error_logs`) + archivos diarios
- **Correlation**: Usar `correlation_id` para vincular con entradas en `audit_logs`

## Ejemplo de uso desde frontend

```javascript
// Error boundary o catch global
const reportError = async (error, context = {}) => {
  try {
    await fetch('/api/v1/error-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // JWT opcional - si está disponible, lo enviamos
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      },
      body: JSON.stringify({
        source: 'frontend',
        level: 'error',
        error_code: error.name || 'UNKNOWN_ERROR',
        error_message: error.message,
        stack_trace: error.stack,
        context: {
          url: window.location.pathname,
          ...context
        },
        metadata: {
          browser: navigator.userAgent,
          screen_size: `${window.innerWidth}x${window.innerHeight}`
        }
      })
    });
  } catch (e) {
    // Silenciar errores del reporte para no crear loops
    console.error('Failed to report error:', e);
  }
};
```
