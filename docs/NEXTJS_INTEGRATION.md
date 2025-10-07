# Integración de EC.DATA API con Next.js

Guía completa para integrar el sistema de autenticación JWT de EC.DATA API con aplicaciones Next.js, incluyendo refresh automático de tokens y funcionalidad "Remember Me".

## Tabla de Contenidos

1. [Conceptos Básicos](#conceptos-básicos)
2. [Almacenamiento de Tokens](#almacenamiento-de-tokens)
3. [Configuración de Axios](#configuración-de-axios)
4. [Refresh Automático](#refresh-automático)
5. [Manejo de "Remember Me"](#manejo-de-remember-me)
6. [Ejemplo Completo](#ejemplo-completo)
7. [Seguridad](#seguridad)

---

## Conceptos Básicos

### Tipos de Tokens

La API EC.DATA utiliza dos tipos de tokens JWT:

1. **Access Token** (15 minutos):
   - Token de corta duración para autenticar cada request
   - Se envía en el header `Authorization: Bearer {token}`
   - Expira en 15 minutos

2. **Refresh Token** (14 o 90 días):
   - Token de larga duración para renovar el access token
   - Duración normal: 14 días
   - Duración extendida (Remember Me): 90 días
   - Idle timeout: 7 días (normal) o 30 días (Remember Me)

### Flujo de Autenticación

```
Usuario → Login → API
       ← {access_token, refresh_token} ←

Usuario → API Request (access_token) → API
       ← Response ←

(Access token expira después de 15 min)

Usuario → API Request (access_token) → API
       ← 401 Unauthorized ←

Cliente → Refresh (refresh_token) → API
       ← {nuevo access_token, nuevo refresh_token} ←

Usuario → API Request (nuevo access_token) → API
       ← Response ←
```

---

## Almacenamiento de Tokens

### Opción 1: HTTP-Only Cookies (Recomendado)

**Ventajas:**
- No accesible desde JavaScript (protección contra XSS)
- Enviadas automáticamente en cada request
- Más seguro para refresh tokens

**Implementación:**

```typescript
// app/api/auth/login/route.ts (Next.js 13+ App Router)
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { email, password, remember_me } = await request.json();

  // Llamar a la API de EC.DATA
  const response = await fetch('https://api.ec.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember_me })
  });

  const data = await response.json();

  if (data.ok) {
    const cookieStore = cookies();
    
    // Guardar access token (15 minutos)
    cookieStore.set('access_token', data.data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 // 15 minutos
    });

    // Guardar refresh token (14 o 90 días según remember_me)
    const refreshMaxAge = remember_me 
      ? 90 * 24 * 60 * 60  // 90 días
      : 14 * 24 * 60 * 60; // 14 días
    
    cookieStore.set('refresh_token', data.data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshMaxAge
    });

    return Response.json({ ok: true, user: data.data.user });
  }

  return Response.json(data, { status: response.status });
}
```

### Opción 2: LocalStorage (Solo para Aplicaciones SPA)

**Ventajas:**
- Simple de implementar
- Funciona sin backend Next.js (modo client-only)

**Desventajas:**
- Vulnerable a XSS
- No se puede usar con SSR/SSG

**Implementación:**

```typescript
// lib/auth.ts
export const saveTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};
```

---

## Configuración de Axios

### Crear una Instancia de Axios

```typescript
// lib/axios.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ec.com';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Para enviar cookies automáticamente
});

// Interceptor para agregar access token en cada request
apiClient.interceptors.request.use(
  (config) => {
    // Si usas localStorage
    const token = localStorage.getItem('access_token');
    
    // Si usas cookies, el token se envía automáticamente
    // pero puedes leerlo manualmente si necesitas verificar
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

---

## Refresh Automático

### Implementación con Interceptor de Axios

```typescript
// lib/axios.ts (continuación)
import { refreshAccessToken } from './auth';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Interceptor para manejar errores 401 (token expirado)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si el error es 401 y no hemos intentado refresh todavía
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Si ya hay un refresh en progreso, esperar a que termine
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        // Intentar renovar el access token
        const newAccessToken = await refreshAccessToken();
        
        // Actualizar el token en localStorage
        localStorage.setItem('access_token', newAccessToken);
        
        // Procesar la cola de requests pendientes
        processQueue(null, newAccessToken);
        
        // Reintentar el request original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        // Si el refresh falla, cerrar sesión
        processQueue(refreshError, null);
        
        // Limpiar tokens y redirigir al login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
        
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Función para Refresh

```typescript
// lib/auth.ts
import { apiClient } from './axios';

export const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (response.data.ok) {
      const { access_token, refresh_token: newRefreshToken } = response.data.data;
      
      // Guardar los nuevos tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', newRefreshToken);
      
      return access_token;
    }
    
    throw new Error('Failed to refresh token');
    
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
};
```

---

## Manejo de "Remember Me"

### Componente de Login

```tsx
// components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/axios';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
        remember_me: rememberMe
      });

      if (response.data.ok) {
        const { access_token, refresh_token, user } = response.data.data;
        
        // Guardar tokens
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        
        // Guardar información del usuario
        localStorage.setItem('user', JSON.stringify(user));
        
        // Redirigir al dashboard
        router.push('/dashboard');
      }
      
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border p-2"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border p-2"
          required
        />
      </div>

      <div className="flex items-center">
        <input
          id="remember_me"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="remember_me" className="ml-2 text-sm">
          Recordarme (sesión de 90 días)
        </label>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
```

### Información sobre "Remember Me"

Cuando el usuario activa "Remember Me":
- **Refresh token válido por 90 días** (en lugar de 14)
- **Idle timeout de 30 días** (en lugar de 7)
- Ideal para dispositivos personales
- **NO recomendado para dispositivos compartidos**

---

## Ejemplo Completo

### Context Provider para Autenticación

```tsx
// context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/axios';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: {
    name: string;
    description: string;
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar si hay sesión al cargar
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('access_token');
    
    if (storedUser && accessToken) {
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
      remember_me: rememberMe
    });

    if (response.data.ok) {
      const { access_token, refresh_token, user } = response.data.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
    }
  };

  const logout = async () => {
    try {
      // Llamar al endpoint de logout para invalidar la sesión en el servidor
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Limpiar tokens localmente
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Uso en Componentes

```tsx
// app/dashboard/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bienvenido, {user?.first_name} {user?.last_name}</p>
      <p>Rol: {user?.role.name}</p>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}
```

---

## Seguridad

### Recomendaciones de Seguridad

1. **HTTPS Obligatorio en Producción:**
   ```typescript
   // Asegúrate de que las cookies sean secure en producción
   secure: process.env.NODE_ENV === 'production'
   ```

2. **SameSite Protection:**
   ```typescript
   sameSite: 'strict' // Previene CSRF
   ```

3. **HTTPOnly Cookies para Refresh Tokens:**
   - Los refresh tokens NO deben ser accesibles desde JavaScript
   - Usar HTTP-only cookies cuando sea posible

4. **Validación de Tokens:**
   - Nunca confíes ciegamente en el contenido del JWT
   - Siempre valida en el backend

5. **Logout Completo:**
   ```typescript
   const logout = async () => {
     // 1. Llamar al endpoint de logout del servidor
     await apiClient.post('/auth/logout');
     
     // 2. Limpiar storage local
     localStorage.clear();
     
     // 3. Redirigir al login
     router.push('/login');
   };
   ```

6. **Manejo de Errores:**
   ```typescript
   // Siempre manejar errores de refresh
   try {
     await refreshAccessToken();
   } catch (error) {
     // Si falla, cerrar sesión completa
     await logout();
   }
   ```

7. **Remember Me - Advertencias:**
   - Mostrar advertencia en dispositivos compartidos
   - Considerar agregar verificación 2FA para sesiones extendidas
   - Permitir al usuario revocar todas las sesiones desde el panel de control

### Variables de Entorno

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.ec.com
NODE_ENV=production
```

---

## Resumen

- **Access Token:** 15 minutos, se envía en cada request
- **Refresh Token:** 14 días (normal) o 90 días (Remember Me)
- **Idle Timeout:** 7 días (normal) o 30 días (Remember Me)
- **Refresh Automático:** Interceptor de Axios maneja el refresh transparentemente
- **Seguridad:** HTTP-only cookies + HTTPS + SameSite protection
- **Logout:** Siempre llamar al endpoint `/auth/logout` para invalidar la sesión en el servidor

---

## Recursos Adicionales

- [Documentación de la API EC.DATA](http://localhost:5000/docs)
- [RFC 7519 - JWT Standard](https://tools.ietf.org/html/rfc7519)
- [Axios Interceptors Documentation](https://axios-http.com/docs/interceptors)
- [Next.js Authentication Patterns](https://nextjs.org/docs/authentication)
