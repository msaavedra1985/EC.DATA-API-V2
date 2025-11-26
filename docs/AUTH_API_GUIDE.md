# 🔐 Authentication API - Guía para Frontend

Guía completa de autenticación y gestión de tokens JWT para el equipo de frontend/BFF.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Sistema de Tokens JWT](#sistema-de-tokens-jwt)
- [Flujo de Autenticación](#flujo-de-autenticación)
- [Endpoints de Autenticación](#endpoints-de-autenticación)
- [Almacenamiento de Tokens](#almacenamiento-de-tokens)
- [Refresh Automático de Tokens](#refresh-automático-de-tokens)
- [Manejo de Sesiones](#manejo-de-sesiones)
- [Roles y Permisos (RBAC)](#roles-y-permisos-rbac)
- [Manejo de Errores](#manejo-de-errores)
- [Ejemplos de Integración (Next.js)](#ejemplos-de-integración-nextjs)

---

## 🔐 Descripción General

El sistema de autenticación de EC.DATA API implementa:

- **JWT Dual Token System:** Access tokens de corta duración + Refresh tokens de larga duración
- **Token Rotation:** Cada refresh genera un nuevo par de tokens
- **Remember Me:** Sesiones extendidas (90 días vs 14 días)
- **Theft Detection:** Detección de robo de tokens mediante versión de sesión
- **RBAC:** Control de acceso basado en roles

---

## 🎟️ Sistema de Tokens JWT

### Tipos de Tokens

| Token | Duración | Uso |
|-------|----------|-----|
| **Access Token** | 15 minutos | Autenticar cada request |
| **Refresh Token (normal)** | 14 días | Renovar access token |
| **Refresh Token (Remember Me)** | 90 días | Sesión extendida |

### Idle Timeout

| Modo | Timeout |
|------|---------|
| Normal | 7 días sin actividad |
| Remember Me | 30 días sin actividad |

### Estructura del Access Token (Claims)

```json
{
  "iss": "https://api.ec.com",
  "aud": "ec-frontend",
  "sub": "0199baa7-ff28-743c-9673-6bed636d0f33",
  "iat": 1700000000,
  "exp": 1700000900,
  "jti": "unique-token-id",
  "orgId": "org-uuid-or-null",
  "sessionVersion": 1,
  "tokenType": "access",
  "role": {
    "id": "role-uuid",
    "name": "user",
    "description": "Usuario estándar",
    "is_active": true
  }
}
```

| Claim | Descripción |
|-------|-------------|
| `iss` | Emisor (issuer) |
| `aud` | Audiencia (audience) |
| `sub` | ID del usuario (subject) |
| `iat` | Fecha de emisión (issued at) |
| `exp` | Fecha de expiración |
| `jti` | ID único del token |
| `orgId` | ID de organización (puede ser null) |
| `sessionVersion` | Versión de sesión para invalidación |
| `tokenType` | Tipo: "access" o "refresh" |
| `role` | Rol del usuario con permisos |

---

## 🔄 Flujo de Autenticación

### Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE AUTENTICACIÓN                       │
└─────────────────────────────────────────────────────────────────────┘

1. LOGIN
   Usuario ──────────► POST /auth/login ──────────► API
                       (email, password)
                       
   Usuario ◄───────── {access_token, refresh_token, user} ◄─── API

2. REQUESTS AUTENTICADOS
   Usuario ──────────► GET /api/v1/sites ──────────► API
                       Authorization: Bearer {access_token}
                       
   Usuario ◄───────── {data} ◄──────────────────────── API

3. TOKEN EXPIRADO (después de 15 min)
   Usuario ──────────► GET /api/v1/sites ──────────► API
                       Authorization: Bearer {access_token_expirado}
                       
   Usuario ◄───────── 401 Unauthorized ◄────────────── API

4. REFRESH TOKEN
   Cliente ──────────► POST /auth/refresh ──────────► API
                       {refresh_token}
                       
   Cliente ◄───────── {nuevo_access_token, nuevo_refresh_token} ◄─ API

5. CONTINUAR CON NUEVO TOKEN
   Usuario ──────────► GET /api/v1/sites ──────────► API
                       Authorization: Bearer {nuevo_access_token}
                       
   Usuario ◄───────── {data} ◄──────────────────────── API
```

### Flujo de Logout

```
Usuario ──────────► POST /auth/logout ──────────► API
                    Authorization: Bearer {access_token}
                    
Usuario ◄───────── {ok: true, message} ◄──────── API
                    (Tokens invalidados en servidor)
```

---

## 📡 Endpoints de Autenticación

### 1. POST /api/v1/auth/register

Registra un nuevo usuario.

> **⚠️ NOTA:** Este endpoint puede estar deshabilitado en producción dependiendo de la configuración del sistema. Consulta con el administrador antes de integrarlo.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "password": "SecurePass123!",
  "first_name": "Juan",
  "last_name": "Pérez"
}
```

**Validaciones de Password:**
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número

**Response (201 Created):**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "USR-abc123def-1",
      "email": "usuario@example.com",
      "first_name": "Juan",
      "last_name": "Pérez",
      "role": {
        "id": "role-uuid",
        "name": "user",
        "description": "Usuario estándar"
      }
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "15m",
    "token_type": "Bearer"
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

---

### 2. POST /api/v1/auth/login

Inicia sesión de usuario.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "password": "SecurePass123!",
  "remember_me": false
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | **Sí** | Email del usuario |
| `password` | string | **Sí** | Contraseña |
| `remember_me` | boolean | No | Extender duración de sesión (default: false) |

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "USR-abc123def-1",
      "email": "usuario@example.com",
      "first_name": "Juan",
      "last_name": "Pérez",
      "role": {
        "name": "user",
        "description": "Usuario estándar"
      }
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "15m",
    "token_type": "Bearer"
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

**Con Remember Me activado:**
- Refresh token dura 90 días (en lugar de 14)
- Idle timeout de 30 días (en lugar de 7)

---

### 3. POST /api/v1/auth/refresh

Renueva el access token usando el refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "15m",
    "token_type": "Bearer"
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

**⚠️ IMPORTANTE:** 
- Cada refresh genera un **nuevo par de tokens**
- El refresh token anterior queda **invalidado**
- Debes actualizar ambos tokens en el cliente

---

### 4. POST /api/v1/auth/logout

Cierra la sesión e invalida tokens.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "message": "Sesión cerrada exitosamente"
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

---

### 5. GET /api/v1/auth/me

Obtiene información del usuario autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "USR-abc123def-1",
    "email": "usuario@example.com",
    "first_name": "Juan",
    "last_name": "Pérez",
    "role": {
      "id": "role-uuid",
      "name": "user",
      "description": "Usuario estándar"
    },
    "organizations": [
      {
        "id": "ORG-abc123-1",
        "name": "Mi Empresa",
        "role_in_org": "org-admin"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

---

## 💾 Almacenamiento de Tokens

### Opción 1: HTTP-Only Cookies (Recomendado)

**Ventajas:**
- No accesible desde JavaScript (protección XSS)
- Enviadas automáticamente en cada request
- Más seguro para producción

```typescript
// app/api/auth/login/route.ts (Next.js App Router)
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { email, password, remember_me } = await request.json();

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember_me })
  });

  const data = await response.json();

  if (data.ok) {
    const cookieStore = cookies();
    
    // Access token (15 minutos)
    cookieStore.set('access_token', data.data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60
    });

    // Refresh token (14 o 90 días)
    const refreshMaxAge = remember_me 
      ? 90 * 24 * 60 * 60
      : 14 * 24 * 60 * 60;
    
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

### Opción 2: localStorage (Desarrollo)

**Ventajas:**
- Más simple de implementar
- Útil para desarrollo

**Desventajas:**
- Vulnerable a XSS
- No recomendado para producción

```typescript
// Guardar tokens
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('refresh_token', data.refresh_token);
localStorage.setItem('user', JSON.stringify(data.user));

// Leer tokens
const accessToken = localStorage.getItem('access_token');
const refreshToken = localStorage.getItem('refresh_token');

// Limpiar tokens (logout)
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
localStorage.removeItem('user');
```

---

## 🔄 Refresh Automático de Tokens

### Interceptor de Axios

```typescript
// lib/axios.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

// Agregar token a cada request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Variables para manejar refresh
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

// Manejar 401 y hacer refresh automático
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken
        });
        
        const { access_token, refresh_token } = response.data.data;
        
        // Actualizar AMBOS tokens
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        
        processQueue(null, access_token);
        
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Logout: limpiar y redirigir
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
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

---

## 👤 Manejo de Sesiones

### Context Provider de Autenticación

```tsx
// context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/axios';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  // Verificar sesión al cargar
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
      router.push('/dashboard');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
      router.push('/login');
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

### Uso del Hook

```tsx
// components/Header.tsx
'use client';

import { useAuth } from '@/context/AuthContext';

export function Header() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <header>
        <a href="/login">Iniciar Sesión</a>
      </header>
    );
  }

  return (
    <header>
      <span>Hola, {user?.first_name}</span>
      <button onClick={logout}>Cerrar Sesión</button>
    </header>
  );
}
```

---

## 👮 Roles y Permisos (RBAC)

### Roles del Sistema

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| `system-admin` | Global | Administrador del sistema completo |
| `org-admin` | Organización | Administrador de una organización |
| `org-manager` | Organización | Gestor de recursos de organización |
| `org-billing` | Organización | Gestión de facturación |
| `user` | Usuario | Usuario estándar |
| `viewer` | Usuario | Solo lectura |
| `guest` | Usuario | Acceso limitado |

### Sistema Híbrido de Roles

EC.DATA implementa un sistema de roles híbrido:

1. **Rol Global** (`users.role_id`): Rol del usuario a nivel de sistema
2. **Rol en Organización** (`user_organizations.role_in_org`): Rol específico dentro de una organización

Un usuario puede tener diferentes roles en diferentes organizaciones.

### Verificación de Permisos en Frontend

```typescript
// hooks/usePermissions.ts
import { useAuth } from '@/context/AuthContext';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasRole = (role: string | string[]): boolean => {
    if (!user?.role?.name) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role.name);
  };

  const isAdmin = (): boolean => {
    return hasRole(['system-admin', 'org-admin']);
  };

  const canCreate = (): boolean => {
    return hasRole(['system-admin', 'org-admin']);
  };

  const canUpdate = (): boolean => {
    return hasRole(['system-admin', 'org-admin', 'org-manager']);
  };

  const canDelete = (): boolean => {
    return hasRole('system-admin');
  };

  return {
    hasRole,
    isAdmin,
    canCreate,
    canUpdate,
    canDelete,
    userRole: user?.role?.name
  };
};
```

### Componente de Protección de Rutas

```tsx
// components/ProtectedRoute.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
    
    if (!loading && isAuthenticated && requiredRoles) {
      const hasRequiredRole = requiredRoles.includes(user?.role?.name || '');
      if (!hasRequiredRole) {
        router.push('/unauthorized');
      }
    }
  }, [isAuthenticated, loading, user, requiredRoles, router]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

---

## 🚨 Manejo de Errores

### Códigos de Estado

| Código | Significado |
|--------|-------------|
| 200 | Login/Refresh exitoso |
| 201 | Registro exitoso |
| 400 | Error de validación |
| 401 | No autenticado o token inválido |
| 403 | Sin permisos para el recurso |
| 404 | Usuario no encontrado |
| 429 | Demasiados intentos (rate limit) |

### Formato de Error

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email o contraseña incorrectos",
    "status": 401
  },
  "meta": {
    "timestamp": "2025-11-25T19:00:00.000Z"
  }
}
```

### Errores Comunes

| Error | Código | Causa | Solución |
|-------|--------|-------|----------|
| `INVALID_CREDENTIALS` | 401 | Email/password incorrectos | Verificar credenciales |
| `TOKEN_EXPIRED` | 401 | Access token expiró | Hacer refresh |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token inválido/expirado | Re-login |
| `USER_INACTIVE` | 403 | Usuario desactivado | Contactar admin |
| `SESSION_REVOKED` | 401 | Sesión revocada | Re-login |
| `VALIDATION_ERROR` | 400 | Datos inválidos | Corregir inputs |

---

## 💻 Ejemplos de Integración (Next.js)

### Formulario de Login

```tsx
// components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password, rememberMe);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

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
        <label htmlFor="remember_me" className="ml-2 text-sm text-gray-600">
          Recordarme (90 días)
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>

      <p className="text-center text-sm text-gray-600">
        ¿No tienes cuenta?{' '}
        <a href="/register" className="text-blue-600 hover:underline">
          Regístrate
        </a>
      </p>
    </form>
  );
}
```

### Formulario de Registro

```tsx
// components/RegisterForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/axios';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name
      });

      if (response.data.ok) {
        const { access_token, refresh_token, user } = response.data.data;
        
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input
            name="first_name"
            type="text"
            value={formData.first_name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2"
            required
            minLength={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Apellido</label>
          <input
            name="last_name"
            type="text"
            value={formData.last_name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2"
            required
            minLength={2}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border p-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Contraseña</label>
        <input
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border p-2"
          required
          minLength={8}
        />
        <p className="text-xs text-gray-500 mt-1">
          Mínimo 8 caracteres, una mayúscula, una minúscula y un número
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium">Confirmar Contraseña</label>
        <input
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border p-2"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Registrando...' : 'Crear Cuenta'}
      </button>

      <p className="text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="text-blue-600 hover:underline">
          Inicia sesión
        </a>
      </p>
    </form>
  );
}
```

---

## 🔗 Endpoints Relacionados

- `GET /api/v1/users/me` - Información del usuario actual
- `PUT /api/v1/users/me` - Actualizar perfil del usuario
- `POST /api/v1/auth/change-password` - Cambiar contraseña
- `POST /api/v1/auth/forgot-password` - Solicitar reset de contraseña
- `POST /api/v1/auth/reset-password` - Confirmar reset de contraseña

---

## 📌 Notas de Seguridad

1. **Nunca almacenes tokens en código fuente o logs**
2. **Usa HTTPS en producción**
3. **Implementa logout en cierre de sesión del navegador** (opcional)
4. **Considera rate limiting en login** (ya implementado en API)
5. **El refresh token solo debe enviarse al endpoint `/auth/refresh`**
6. **Almacena user data pero nunca los tokens en sessionStorage**

---

*Última actualización: Noviembre 2025*
