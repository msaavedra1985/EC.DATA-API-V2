# 📋 Frontend Error Logging - Guía Completa

## 🎯 Arquitectura de Error Logging

El sistema de error logging utiliza **Winston** como motor principal, con doble persistencia:

- **PostgreSQL** (tabla `error_logs`) - Queryable, indexado, optimizado para análisis
- **Archivos rotados** (`logs/errors-YYYY-MM-DD.log`) - Backup diario, retención 30 días

### Flujo de Errores:

```
Frontend Error → POST /api/v1/error-logs → Winston → [SQL + Archivos]
Backend Error → Global Middleware → Winston → [SQL + Archivos]
```

---

## 🔗 Correlación con Auditorías (NUEVO)

Los errores pueden vincularse opcionalmente con acciones de auditoría usando `correlation_id`:

```javascript
// Generar correlation_id al inicio de una operación
const correlationId = crypto.randomUUID();

// 1. Intentar operación (ej: crear organización)
try {
  const response = await api.post('/organizations', data, {
    headers: { 'X-Correlation-ID': correlationId }
  });
  // Éxito - la auditoría se registra en backend
} catch (error) {
  // 2. Si falla, reportar error con el MISMO correlation_id
  logError({
    error_code: 'ORG_CREATE_FAILED',
    error_message: error.message,
    correlation_id: correlationId  // ← Vincula error con auditoría
  });
}
```

**Queries útiles para backend:**
```sql
-- Ver error + auditoría relacionada
SELECT e.*, a.* 
FROM error_logs e
LEFT JOIN audit_logs a ON e.correlation_id = a.correlation_id
WHERE e.correlation_id = 'abc-123';
```

---

## 📡 Endpoint de Error Logging

### **POST /api/v1/error-logs**

**Autenticación:** NO requerida (endpoint público)
- ✅ Si envías JWT Bearer token → asocia error con `user_id` y `organization_id`
- ✅ Si no envías token → registra error como anónimo

---

## 📊 Estructura de Datos

### **Campos REQUERIDOS:**

```typescript
{
  error_code: string;      // Código único del error (ej: "COMPONENT_RENDER_ERROR")
  error_message: string;   // Mensaje descriptivo
}
```

### **Campos OPCIONALES:**

```typescript
{
  level?: 'error' | 'warning' | 'critical';  // Default: 'error'
  stack_trace?: string;                       // Stack trace completo
  endpoint?: string;                          // URL/ruta (ej: "/dashboard/products")
  method?: string;                            // Método HTTP (GET, POST, etc)
  status_code?: number;                       // Status code HTTP (400, 500, etc)
  session_id?: string;                        // ID de sesión del usuario
  correlation_id?: string;                    // Para vincular con audit_logs
  
  context?: {                                 // Contexto específico del error
    component?: string;
    action?: string;
    user_action?: string;
    [key: string]: any;
  };
  
  metadata?: {                                // Metadata del entorno
    browser?: string;
    os?: string;
    screen_size?: string;
    viewport?: string;
    app_version?: string;
    [key: string]: any;
  };
}
```

### **Campos AUTO-CAPTURADOS (no enviar):**

El backend captura automáticamente:
- ✅ `source: 'frontend'` (forzado)
- ✅ `ip_address` (desde `req.ip`)
- ✅ `user_agent` (desde headers)
- ✅ `user_id` (desde JWT si está presente)
- ✅ `organization_id` (desde JWT si está presente)
- ✅ `request_id` (UUID generado automáticamente)

---

## 🔤 Códigos de Error Recomendados

### **JavaScript Runtime Errors:**
- `JS_RUNTIME_ERROR` - Error genérico de JavaScript
- `JS_TYPE_ERROR` - TypeError
- `JS_REFERENCE_ERROR` - ReferenceError
- `JS_SYNTAX_ERROR` - SyntaxError

### **React/Component Errors:**
- `COMPONENT_RENDER_ERROR` - Error al renderizar componente
- `COMPONENT_MOUNT_ERROR` - Error en componentDidMount/useEffect
- `COMPONENT_UNMOUNT_ERROR` - Error en cleanup
- `COMPONENT_UPDATE_ERROR` - Error en actualización de estado

### **Next.js Errors:**
- `NEXTJS_SERVER_ERROR` - Error en server component
- `NEXTJS_CLIENT_ERROR` - Error en client component
- `NEXTJS_API_ROUTE_ERROR` - Error en API route
- `NEXTJS_HYDRATION_ERROR` - Error de hidratación

### **API/Network Errors:**
- `API_REQUEST_FAILED` - Request a API falló
- `API_TIMEOUT` - Timeout de API
- `API_NETWORK_ERROR` - Error de red
- `API_PARSE_ERROR` - Error al parsear respuesta
- `API_UNAUTHORIZED` - 401 Unauthorized
- `API_FORBIDDEN` - 403 Forbidden

### **State Management Errors:**
- `STATE_UPDATE_ERROR` - Error al actualizar estado
- `STATE_SYNC_ERROR` - Error de sincronización
- `REDUX_ACTION_ERROR` - Error en acción de Redux

### **Routing/Navigation Errors:**
- `ROUTE_NOT_FOUND` - Ruta no encontrada
- `NAVIGATION_ERROR` - Error al navegar
- `ROUTE_GUARD_ERROR` - Error en route guard

### **Form/Validation Errors:**
- `FORM_SUBMIT_ERROR` - Error al enviar formulario
- `FORM_VALIDATION_ERROR` - Error de validación
- `FILE_UPLOAD_ERROR` - Error al subir archivo

---

## 📝 Ejemplos Completos

### **1. JavaScript Runtime Error:**

```javascript
// ErrorBoundary.jsx
import { logError } from '@/lib/errorLogger';

class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    logError({
      error_code: 'JS_RUNTIME_ERROR',
      error_message: error.message,
      level: 'error',
      stack_trace: error.stack,
      context: {
        error_type: error.name,
        component: errorInfo.componentStack,
        url: window.location.pathname
      },
      metadata: {
        browser: navigator.userAgent,
        screen_size: `${window.screen.width}x${window.screen.height}`,
        react_version: React.version
      }
    });
  }
}
```

### **2. Next.js Error (App Router):**

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
        page: window.location.pathname,
        is_server_side: false
      },
      metadata: {
        next_version: '14.0.0',
        browser: navigator.userAgent
      }
    });
  }, [error]);

  return <div>Something went wrong!</div>;
}
```

### **3. API Request Error (con correlation_id):**

```javascript
// lib/api.js
import axios from 'axios';
import { logError } from '@/lib/errorLogger';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.response.use(
  response => response,
  async error => {
    // Extraer correlation_id del header de respuesta (si existe)
    const correlationId = error.response?.headers['x-correlation-id'];
    
    if (error.response && error.response.status >= 500) {
      await logError({
        error_code: 'API_REQUEST_FAILED',
        error_message: `API error: ${error.message}`,
        level: 'critical',
        endpoint: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status_code: error.response?.status,
        correlation_id: correlationId,  // ← Vincular con auditoría del backend
        context: {
          url: window.location.pathname,
          request_data: error.config?.data,
          response_data: error.response?.data,
          retry_count: error.config?.retryCount || 0
        }
      });
    }
    
    return Promise.reject(error);
  }
);
```

### **4. Form Submit Error:**

```javascript
// components/OrganizationForm.jsx
import { logError } from '@/lib/errorLogger';

const handleSubmit = async (formData) => {
  const correlationId = crypto.randomUUID();
  
  try {
    const response = await api.post('/organizations', formData, {
      headers: { 'X-Correlation-ID': correlationId }
    });
    // Éxito
  } catch (error) {
    await logError({
      error_code: 'FORM_SUBMIT_ERROR',
      error_message: `Failed to submit organization form: ${error.message}`,
      level: 'error',
      stack_trace: error.stack,
      correlation_id: correlationId,  // ← Mismo ID de la auditoría
      context: {
        url: '/organizations/create',
        component: 'OrganizationForm',
        action: 'submit',
        form_data: {
          name: formData.name,
          slug: formData.slug
        }
      }
    });
    
    // Mostrar error al usuario
    toast.error('Failed to create organization');
  }
};
```

### **5. Navigation Error:**

```javascript
// middleware.ts (Next.js)
import { NextResponse } from 'next/server';
import { logError } from '@/lib/errorLogger';

export function middleware(request) {
  const token = request.cookies.get('access_token');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    // Reportar intento de acceso no autorizado
    logError({
      error_code: 'NAVIGATION_ERROR',
      error_message: 'Unauthorized access attempt to protected route',
      level: 'warning',
      context: {
        from: request.headers.get('referer'),
        to: request.nextUrl.pathname,
        reason: 'no_token'
      }
    });
    
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

---

## 🛠️ Utility Function

### **lib/errorLogger.js:**

```javascript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Registrar error en el backend usando Winston
 * 
 * @param {object} errorData - Datos del error
 * @param {string} errorData.error_code - Código del error (REQUERIDO)
 * @param {string} errorData.error_message - Mensaje del error (REQUERIDO)
 * @param {string} [errorData.level] - Nivel: 'error' | 'warning' | 'critical'
 * @param {string} [errorData.stack_trace] - Stack trace
 * @param {string} [errorData.endpoint] - Endpoint o ruta
 * @param {string} [errorData.method] - Método HTTP
 * @param {number} [errorData.status_code] - Status code HTTP
 * @param {string} [errorData.session_id] - Session ID
 * @param {string} [errorData.correlation_id] - Correlation ID (para vincular con audit_logs)
 * @param {object} [errorData.context] - Contexto adicional
 * @param {object} [errorData.metadata] - Metadata adicional
 */
export const logError = async (errorData) => {
  try {
    // Obtener token JWT si está disponible (opcional)
    const token = localStorage.getItem('access_token') || 
                  sessionStorage.getItem('access_token');
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
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
    console.error('Failed to log error to backend:', err);
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

---

## ✅ Best Practices

### **DO:**
- ✅ Enviar `stack_trace` siempre que esté disponible
- ✅ Incluir `context` con URL, componente y acción del usuario
- ✅ Usar `level: 'critical'` para errores que bloquean funcionalidad
- ✅ Usar `correlation_id` para vincular errores con acciones de auditoría
- ✅ Incluir `metadata` del navegador/OS para debugging
- ✅ Enviar JWT Bearer token si el usuario está autenticado
- ✅ Usar `session_id` consistente durante toda la sesión
- ✅ Implementar try-catch alrededor de `logError()` para evitar que fallos en logging rompan la app

### **DON'T:**
- ❌ No enviar datos sensibles (passwords, tokens) en `context` o `metadata`
- ❌ No enviar campos auto-capturados (`ip_address`, `user_agent`, `source`)
- ❌ No bloquear la UI esperando respuesta del error logging (usar async/await sin await)
- ❌ No enviar más de 10 errores por minuto (implementar rate limiting)
- ❌ No duplicar errores (usar debounce para errores repetitivos)

---

## 📈 Rate Limiting (Frontend)

```javascript
// lib/errorLogger.js
const errorQueue = [];
const MAX_ERRORS_PER_MINUTE = 10;

export const logError = async (errorData) => {
  // Limpiar errores antiguos (más de 1 minuto)
  const oneMinuteAgo = Date.now() - 60000;
  errorQueue = errorQueue.filter(timestamp => timestamp > oneMinuteAgo);
  
  // Si ya enviamos 10 errores en el último minuto, NO enviar más
  if (errorQueue.length >= MAX_ERRORS_PER_MINUTE) {
    console.warn('Error logging rate limit exceeded, skipping log');
    return;
  }
  
  // Registrar timestamp del error
  errorQueue.push(Date.now());
  
  // Enviar error...
  try {
    await axios.post(`${API_URL}/api/v1/error-logs`, ...);
  } catch (err) {
    console.error('Failed to log error:', err);
  }
};
```

---

## 🔍 Debugging

### **Ver errores en desarrollo:**

```javascript
// Solo en desarrollo, también loguear en consola
if (process.env.NODE_ENV === 'development') {
  console.error('Error logged:', errorData);
}
```

### **Ver archivos de log en el backend:**

```bash
# Logs rotados diariamente
tail -f logs/errors-2025-10-14.log
```

### **Query SQL para ver errores:**

```sql
-- Errores del frontend de las últimas 24 horas
SELECT * FROM error_logs 
WHERE source = 'frontend' 
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Errores críticos con su auditoría relacionada
SELECT e.*, a.*
FROM error_logs e
LEFT JOIN audit_logs a ON e.correlation_id = a.correlation_id
WHERE e.level = 'critical'
ORDER BY e.created_at DESC;
```

---

## 📞 Soporte

Si tienes dudas sobre:
- Qué `error_code` usar → Ver sección "Códigos de Error Recomendados"
- Cómo vincular errores con auditorías → Ver sección "Correlación con Auditorías"
- Estructura de `context` o `metadata` → Son campos JSONB flexibles, usa cualquier estructura

**Contacto Backend Team:** Para preguntas sobre queries SQL o análisis de errores.
