# 🚀 Error Logging - Cheat Sheet

> Quick reference para reportar errores desde el frontend

---

## Setup (Copy-Paste Ready)

```javascript
// lib/errorLogger.js
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const logError = async (errorData) => {
  try {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    await axios.post(`${API_URL}/api/v1/error-logs`, { source: 'frontend', ...errorData }, { headers });
  } catch (err) {
    console.error('❌ Failed to log error:', err);
  }
};

export const generateCorrelationId = () => crypto.randomUUID();
```

---

## Uso Básico

```javascript
import { logError } from '@/lib/errorLogger';

logError({
  error_code: 'API_REQUEST_FAILED',         // REQUERIDO
  error_message: 'Failed to fetch data',    // REQUERIDO
  level: 'error',                            // opcional: error | warning | critical
  stack_trace: error.stack,                  // recomendado
  endpoint: '/dashboard',                    // opcional
  context: { component: 'Dashboard' },       // opcional
  metadata: { browser: navigator.userAgent } // opcional
});
```

---

## Con Correlation ID

```javascript
import { logError, generateCorrelationId } from '@/lib/errorLogger';

const correlationId = generateCorrelationId();

try {
  await api.post('/organizations', data, {
    headers: { 'X-Correlation-ID': correlationId }
  });
} catch (error) {
  await logError({
    error_code: 'ORG_CREATE_FAILED',
    error_message: error.message,
    correlation_id: correlationId  // ← Vincula con auditoría
  });
}
```

---

## Códigos de Error

| Código | Uso |
|--------|-----|
| `COMPONENT_RENDER_ERROR` | Error al renderizar componente React |
| `NEXTJS_ERROR` | Error en Next.js (server/client) |
| `API_REQUEST_FAILED` | Request a API falló |
| `API_TIMEOUT` | Timeout de API |
| `API_UNAUTHORIZED` | 401 Unauthorized |
| `FORM_SUBMIT_ERROR` | Error al enviar formulario |
| `FILE_UPLOAD_ERROR` | Error al subir archivo |
| `STATE_UPDATE_ERROR` | Error al actualizar estado |
| `NAVIGATION_ERROR` | Error al navegar |
| `JS_RUNTIME_ERROR` | Error de JavaScript genérico |

[Ver lista completa](./FRONTEND_ERROR_LOGGING.md#códigos-de-error-estándar)

---

## Error Boundary (React)

```javascript
import { Component } from 'react';
import { logError } from '@/lib/errorLogger';

class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    logError({
      error_code: 'COMPONENT_RENDER_ERROR',
      error_message: error.message,
      stack_trace: error.stack,
      context: { component_stack: errorInfo.componentStack }
    });
  }
  
  render() {
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}
```

---

## Axios Interceptor

```javascript
import axios from 'axios';
import { logError } from '@/lib/errorLogger';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status >= 500) {
      await logError({
        error_code: 'API_REQUEST_FAILED',
        error_message: error.message,
        level: 'critical',
        endpoint: error.config?.url,
        method: error.config?.method,
        status_code: error.response?.status
      });
    }
    return Promise.reject(error);
  }
);
```

---

## ✅ DO

- ✅ Usa códigos de error estándar
- ✅ Incluye `stack_trace` siempre que esté disponible
- ✅ Envía JWT token si el usuario está autenticado
- ✅ Usa `correlation_id` para operaciones críticas
- ✅ Agrega contexto útil (componente, acción, datos)

## ❌ DON'T

- ❌ Envíes passwords, API keys, o datos sensibles
- ❌ Envíes más de 10 errores por minuto (implementa rate limiting)
- ❌ Envíes el mismo error repetidamente (usa debounce)
- ❌ Bloquees la UI esperando respuesta de logging

---

## 📚 Docs Completas

- **Guía Completa**: [FRONTEND_ERROR_LOGGING.md](./FRONTEND_ERROR_LOGGING.md)
- **Guía Detallada**: [frontend-winston-error-logging.md](./frontend-winston-error-logging.md)
- **API Docs**: http://localhost:5000/docs

---

**TL;DR**: Copia `lib/errorLogger.js`, importa `logError()`, y úsala en tus try-catch. Done! 🎉
