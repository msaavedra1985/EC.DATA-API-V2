# 🚨 Error Logging para Frontend - Guía Oficial

> **Sistema Winston de Error Logging** - Doble persistencia (PostgreSQL + archivos rotados) con tracking de correlación

---

## 📋 Tabla de Contenidos

1. [¿Qué es esto?](#qué-es-esto)
2. [Setup Rápido](#setup-rápido)
3. [Cómo Reportar Errores](#cómo-reportar-errores)
4. [Correlation ID (Vincular errores con acciones)](#correlation-id)
5. [Códigos de Error Estándar](#códigos-de-error-estándar)
6. [Ejemplos Prácticos](#ejemplos-prácticos)
7. [FAQ](#faq)

---

## ¿Qué es esto?

**EC.DATA Error Logging** es un sistema centralizado que captura y persiste todos los errores de la aplicación (frontend + backend) en una base de datos PostgreSQL y archivos rotados diariamente.

### Beneficios:
- ✅ **Debugging proactivo**: Ver errores antes que los usuarios se quejen
- ✅ **Analytics de errores**: Identificar patrones y problemas frecuentes
- ✅ **Tracking de usuarios**: Saber qué usuarios experimentan qué errores
- ✅ **Correlación**: Vincular errores con acciones de auditoría para debugging completo
- ✅ **Historial**: 30-90 días de retención para análisis histórico

### Arquitectura:

```
┌─────────────┐
│   Frontend  │
│   (React/   │
│   Next.js)  │
└──────┬──────┘
       │ POST /api/v1/error-logs
       │ (error_code, error_message, stack_trace, etc.)
       ▼
┌──────────────────────────────────────────────────┐
│          EC.DATA API - Error Logger              │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │       Winston Logger                       │ │
│  │  (Recibe error, procesa, distribuye)       │ │
│  └───────────────┬────────────────────────────┘ │
│                  │                               │
│        ┌─────────┴─────────┐                    │
│        ▼                   ▼                     │
│  ┌──────────┐       ┌────────────────┐          │
│  │PostgreSQL│       │ Rotating Files │          │
│  │error_logs│       │errors-YYYY-MM- │          │
│  │  table   │       │     DD.log     │          │
│  └──────────┘       └────────────────┘          │
└──────────────────────────────────────────────────┘
```

---

## Setup Rápido

### 1. Instalar utility function en tu proyecto:

```bash
# Crear archivo lib/errorLogger.js (o .ts)
touch lib/errorLogger.js
```

### 2. Copiar este código:

```javascript
// lib/errorLogger.js
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Reportar error al backend usando Winston
 * 
 * @param {object} errorData - Datos del error
 * @param {string} errorData.error_code - Código del error (REQUERIDO)
 * @param {string} errorData.error_message - Mensaje del error (REQUERIDO)
 * @param {string} [errorData.level='error'] - Nivel: 'error' | 'warning' | 'critical'
 * @param {string} [errorData.stack_trace] - Stack trace completo
 * @param {string} [errorData.endpoint] - Endpoint o ruta donde ocurrió el error
 * @param {string} [errorData.correlation_id] - ID para vincular con auditorías
 * @param {object} [errorData.context] - Contexto adicional (componente, acción, etc.)
 * @param {object} [errorData.metadata] - Metadata del entorno (browser, OS, etc.)
 */
export const logError = async (errorData) => {
  try {
    // Obtener token JWT si está disponible (opcional)
    const token = localStorage.getItem('access_token') || 
                  sessionStorage.getItem('access_token');
    
    const headers = { 'Content-Type': 'application/json' };
    
    // Si hay token, agregarlo para asociar error con usuario
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    await axios.post(
      `${API_URL}/api/v1/error-logs`,
      {
        source: 'frontend',
        ...errorData
      },
      { headers }
    );
  } catch (err) {
    // Si falla el logging, solo hacer console.error
    // NO interrumpir la aplicación por un error de logging
    console.error('❌ Failed to log error to backend:', err);
  }
};

/**
 * Generar un correlation_id único
 * Usar al inicio de operaciones que pueden fallar y necesitan tracking
 */
export const generateCorrelationId = () => {
  return crypto.randomUUID();
};
```

### 3. Ya está listo para usar! 🎉

---

## Cómo Reportar Errores

### Estructura Básica:

```javascript
import { logError } from '@/lib/errorLogger';

// Reportar error simple
logError({
  error_code: 'MY_ERROR_CODE',        // REQUERIDO
  error_message: 'Descripción clara',  // REQUERIDO
  level: 'error',                      // opcional: 'error' | 'warning' | 'critical'
  stack_trace: error.stack,            // opcional pero recomendado
  endpoint: '/dashboard/products',     // opcional: ruta donde ocurrió
  context: {                           // opcional: contexto específico
    component: 'ProductForm',
    action: 'submit',
    productId: '123'
  },
  metadata: {                          // opcional: info del entorno
    browser: navigator.userAgent,
    screen_size: `${window.screen.width}x${window.screen.height}`
  }
});
```

### Campos AUTO-CAPTURADOS por el backend:
- ✅ `source: 'frontend'` (forzado automáticamente)
- ✅ `ip_address` (desde `req.ip`)
- ✅ `user_agent` (desde headers HTTP)
- ✅ `user_id` (desde JWT si está autenticado)
- ✅ `organization_id` (desde JWT si está autenticado)
- ✅ `request_id` (UUID generado automáticamente)

**NO necesitas enviar estos campos** - el backend los captura automáticamente.

---

## Correlation ID

### ¿Qué es?

Un `correlation_id` es un UUID que vincula **errores** con **acciones de auditoría**. Es útil cuando una operación falla y quieres ver:
- ¿Qué intentó hacer el usuario?
- ¿Por qué falló?
- ¿Qué datos se enviaron?

### ¿Cuándo usarlo?

Úsalo en operaciones críticas que:
1. **Modifican datos** (CREATE, UPDATE, DELETE)
2. **Pueden fallar** (validación, permisos, errores de red)
3. **Necesitas debugging detallado** (investigar por qué falló X operación)

### Ejemplo completo:

```javascript
import { logError, generateCorrelationId } from '@/lib/errorLogger';
import { api } from '@/lib/api';

const createOrganization = async (formData) => {
  // 1. Generar correlation_id ANTES de la operación
  const correlationId = generateCorrelationId();
  
  try {
    // 2. Enviar correlation_id en header de la request
    const response = await api.post('/organizations', formData, {
      headers: { 'X-Correlation-ID': correlationId }
    });
    
    // ✅ Éxito - el backend registra la auditoría con este correlation_id
    return response.data;
    
  } catch (error) {
    // ❌ Falló - reportar error con el MISMO correlation_id
    await logError({
      error_code: 'ORG_CREATE_FAILED',
      error_message: `Failed to create organization: ${error.message}`,
      level: 'error',
      stack_trace: error.stack,
      correlation_id: correlationId,  // ← Mismo ID de la auditoría
      context: {
        component: 'OrganizationForm',
        action: 'create',
        form_data: {
          name: formData.name,
          slug: formData.slug
        }
      }
    });
    
    // Mostrar error al usuario
    throw error;
  }
};
```

### ¿Qué hace el backend con esto?

Cuando el backend recibe `X-Correlation-ID`:
1. **Si la operación tiene éxito**: Guarda la auditoría con ese `correlation_id`
2. **Si fallas y reportas el error**: El error también tiene ese `correlation_id`

Ahora puedes hacer esta query en la base de datos:

```sql
-- Ver error + auditoría relacionada
SELECT 
  e.error_code,
  e.error_message,
  e.created_at as error_time,
  a.entity_type,
  a.action,
  a.changes,
  a.created_at as audit_time
FROM error_logs e
LEFT JOIN audit_logs a ON e.correlation_id = a.correlation_id
WHERE e.correlation_id = '01234567-89ab-cdef-0123-456789abcdef';
```

**Resultado**: Ves exactamente qué intentó hacer el usuario y por qué falló, con todos los detalles.

---

## Códigos de Error Estándar

Usa estos códigos estándar para mantener consistencia en toda la aplicación:

### JavaScript/Runtime Errors:
```javascript
'JS_RUNTIME_ERROR'      // Error genérico de JavaScript
'JS_TYPE_ERROR'         // TypeError
'JS_REFERENCE_ERROR'    // ReferenceError
'JS_SYNTAX_ERROR'       // SyntaxError
```

### React/Component Errors:
```javascript
'COMPONENT_RENDER_ERROR'   // Error al renderizar componente
'COMPONENT_MOUNT_ERROR'    // Error en componentDidMount/useEffect
'COMPONENT_UNMOUNT_ERROR'  // Error en cleanup
'COMPONENT_UPDATE_ERROR'   // Error en actualización de estado
```

### Next.js Errors:
```javascript
'NEXTJS_SERVER_ERROR'      // Error en server component
'NEXTJS_CLIENT_ERROR'      // Error en client component
'NEXTJS_API_ROUTE_ERROR'   // Error en API route
'NEXTJS_HYDRATION_ERROR'   // Error de hidratación
```

### API/Network Errors:
```javascript
'API_REQUEST_FAILED'    // Request a API falló
'API_TIMEOUT'           // Timeout de API
'API_NETWORK_ERROR'     // Error de red
'API_PARSE_ERROR'       // Error al parsear respuesta
'API_UNAUTHORIZED'      // 401 Unauthorized
'API_FORBIDDEN'         // 403 Forbidden
```

### Form/Validation Errors:
```javascript
'FORM_SUBMIT_ERROR'      // Error al enviar formulario
'FORM_VALIDATION_ERROR'  // Error de validación
'FILE_UPLOAD_ERROR'      // Error al subir archivo
```

### State Management Errors:
```javascript
'STATE_UPDATE_ERROR'   // Error al actualizar estado
'STATE_SYNC_ERROR'     // Error de sincronización
'REDUX_ACTION_ERROR'   // Error en acción de Redux
```

### Routing/Navigation Errors:
```javascript
'ROUTE_NOT_FOUND'       // Ruta no encontrada
'NAVIGATION_ERROR'      // Error al navegar
'ROUTE_GUARD_ERROR'     // Error en route guard
```

---

## Ejemplos Prácticos

### 1. Error Boundary (React)

```javascript
// components/ErrorBoundary.jsx
import { Component } from 'react';
import { logError } from '@/lib/errorLogger';

class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    logError({
      error_code: 'COMPONENT_RENDER_ERROR',
      error_message: error.message,
      level: 'error',
      stack_trace: error.stack,
      context: {
        component_stack: errorInfo.componentStack,
        url: window.location.pathname
      },
      metadata: {
        browser: navigator.userAgent,
        screen_size: `${window.screen.width}x${window.screen.height}`
      }
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### 2. Next.js App Router Error Handler

```javascript
// app/error.tsx
'use client';

import { useEffect } from 'react';
import { logError } from '@/lib/errorLogger';

export default function Error({ error, reset }) {
  useEffect(() => {
    logError({
      error_code: 'NEXTJS_ERROR',
      error_message: error.message,
      level: 'error',
      stack_trace: error.stack,
      context: {
        error_type: 'client_component',
        digest: error.digest,
        page: window.location.pathname
      }
    });
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### 3. API Request Error (con Axios Interceptor)

```javascript
// lib/api.js
import axios from 'axios';
import { logError } from '@/lib/errorLogger';

const api = axios.create({ baseURL: '/api/v1' });

// Interceptor para capturar errores automáticamente
api.interceptors.response.use(
  response => response,
  async error => {
    // Solo loguear errores 5xx (server errors)
    if (error.response && error.response.status >= 500) {
      // Extraer correlation_id del header de respuesta (si existe)
      const correlationId = error.response?.headers['x-correlation-id'];
      
      await logError({
        error_code: 'API_REQUEST_FAILED',
        error_message: `API error: ${error.message}`,
        level: 'critical',
        endpoint: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status_code: error.response?.status,
        correlation_id: correlationId,
        context: {
          url: window.location.pathname,
          request_data: error.config?.data,
          response_data: error.response?.data
        }
      });
    }
    
    return Promise.reject(error);
  }
);

export { api };
```

### 4. Form Submit Error (con correlation_id)

```javascript
// components/CreateOrganizationForm.jsx
import { useState } from 'react';
import { logError, generateCorrelationId } from '@/lib/errorLogger';
import { api } from '@/lib/api';

export default function CreateOrganizationForm() {
  const [formData, setFormData] = useState({ name: '', slug: '' });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Generar correlation_id
    const correlationId = generateCorrelationId();
    
    try {
      const response = await api.post('/organizations', formData, {
        headers: { 'X-Correlation-ID': correlationId }
      });
      
      // Success
      console.log('Organization created:', response.data);
      
    } catch (error) {
      // Reportar error con correlation_id
      await logError({
        error_code: 'FORM_SUBMIT_ERROR',
        error_message: `Failed to create organization: ${error.message}`,
        level: 'error',
        stack_trace: error.stack,
        correlation_id: correlationId,
        context: {
          component: 'CreateOrganizationForm',
          action: 'submit',
          form_data: formData
        }
      });
      
      setError('Failed to create organization. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### 5. Async Function Error

```javascript
// utils/fetchUserData.js
import { logError } from '@/lib/errorLogger';

export const fetchUserData = async (userId) => {
  try {
    const response = await fetch(`/api/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
    
  } catch (error) {
    await logError({
      error_code: 'API_REQUEST_FAILED',
      error_message: `Failed to fetch user data: ${error.message}`,
      level: 'error',
      stack_trace: error.stack,
      context: {
        function: 'fetchUserData',
        user_id: userId
      }
    });
    
    throw error; // Re-throw para que el caller pueda manejar
  }
};
```

### 6. Global Window Error Handler (opcional)

```javascript
// app/layout.tsx o _app.tsx
'use client';

import { useEffect } from 'react';
import { logError } from '@/lib/errorLogger';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Capturar errores globales no manejados
    const handleError = (event) => {
      logError({
        error_code: 'JS_RUNTIME_ERROR',
        error_message: event.message,
        level: 'error',
        stack_trace: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          url: window.location.href
        }
      });
    };

    // Capturar promesas rechazadas no manejadas
    const handleUnhandledRejection = (event) => {
      logError({
        error_code: 'JS_UNHANDLED_PROMISE_REJECTION',
        error_message: event.reason?.message || 'Unhandled promise rejection',
        level: 'error',
        stack_trace: event.reason?.stack,
        context: {
          url: window.location.href,
          promise: event.promise
        }
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
}
```

---

## FAQ

### ¿Necesito autenticarme para reportar errores?

**NO.** El endpoint `POST /api/v1/error-logs` es público y no requiere autenticación. Sin embargo:
- ✅ Si envías JWT Bearer token → el error se asocia con `user_id` y `organization_id`
- ✅ Si NO envías token → el error se registra como anónimo

**Recomendación**: Siempre envía el token si está disponible para mejor tracking.

### ¿Qué pasa si el logging falla?

La función `logError()` tiene un try-catch interno que:
1. Intenta enviar el error al backend
2. Si falla, solo hace `console.error()` 
3. **NUNCA interrumpe tu aplicación**

Es seguro usarla sin preocuparte por errores secundarios.

### ¿Puedo loguear warnings en lugar de errors?

**SÍ.** Usa el campo `level`:

```javascript
logError({
  error_code: 'SLOW_API_RESPONSE',
  error_message: 'API response took more than 3 seconds',
  level: 'warning',  // ← 'error' | 'warning' | 'critical'
  context: {
    endpoint: '/api/products',
    duration_ms: 3500
  }
});
```

### ¿Debo enviar datos sensibles en context o metadata?

**NO.** Nunca envíes:
- ❌ Passwords
- ❌ API keys / tokens
- ❌ Números de tarjetas de crédito
- ❌ Información personal sensible (SSN, etc.)

Estos datos se guardan en la base de datos y archivos de log.

### ¿Cuántos errores puedo enviar?

**Sin límite técnico**, pero se recomienda:
- ✅ Implementar rate limiting en el frontend (max 10 errores/minuto)
- ✅ Usar debounce para errores repetitivos
- ✅ No loguear el mismo error múltiples veces seguidas

Ejemplo de rate limiting:

```javascript
// lib/errorLogger.js
const errorQueue = [];
const MAX_ERRORS_PER_MINUTE = 10;

export const logError = async (errorData) => {
  // Limpiar errores antiguos
  const oneMinuteAgo = Date.now() - 60000;
  const recentErrors = errorQueue.filter(time => time > oneMinuteAgo);
  
  // Si ya enviamos 10 errores, skip
  if (recentErrors.length >= MAX_ERRORS_PER_MINUTE) {
    console.warn('⚠️ Error logging rate limit exceeded, skipping');
    return;
  }
  
  // Registrar timestamp
  errorQueue.push(Date.now());
  
  // Enviar error...
  try {
    await axios.post(...);
  } catch (err) {
    console.error('❌ Failed to log error:', err);
  }
};
```

### ¿Dónde puedo ver los errores logueados?

**Opciones:**

1. **Base de datos (PostgreSQL)**:
```sql
SELECT * FROM error_logs 
WHERE source = 'frontend' 
ORDER BY created_at DESC 
LIMIT 50;
```

2. **Archivos de log**:
```bash
tail -f logs/errors-2025-10-14.log
```

3. **Dashboard** (próximamente): Panel de admin para visualizar errores

### ¿Cuánto tiempo se guardan los errores?

- **Base de datos**: 30-90 días (configurable)
- **Archivos**: 30 días (rotación automática)
- **Auditorías**: 2 años (para compliance)

### ¿Qué es correlation_id y cuándo usarlo?

`correlation_id` vincula errores con acciones de auditoría. Úsalo cuando:
- ✅ Modificas datos (CREATE, UPDATE, DELETE)
- ✅ Necesitas debugging detallado
- ✅ Quieres saber qué intentó hacer el usuario cuando falló

Ver sección [Correlation ID](#correlation-id) para ejemplos completos.

---

## 📚 Recursos Adicionales

- **Guía Completa**: `docs/frontend-winston-error-logging.md` (con todos los códigos de error y ejemplos avanzados)
- **Código Backend**: `src/modules/error-logs/` (para entender cómo funciona internamente)
- **Winston Docs**: https://github.com/winstonjs/winston
- **Swagger API Docs**: `http://localhost:5000/docs` (ver endpoint `/api/v1/error-logs`)

---

## 🆘 Soporte

Si tienes dudas o problemas:
1. Revisa esta documentación primero
2. Consulta la guía completa: `docs/frontend-winston-error-logging.md`
3. Pregunta en Slack: `#backend-support`
4. Contacta al equipo de backend: `backend-team@ec.data`

---

**Última actualización**: Octubre 14, 2025
**Versión**: 1.0.0
**Mantenido por**: EC.DATA Backend Team
