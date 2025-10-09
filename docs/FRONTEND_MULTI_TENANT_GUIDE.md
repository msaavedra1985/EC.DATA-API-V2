# Multi-Tenant Hierarchical Organizations - Frontend Integration Guide

## Resumen Ejecutivo

La API EC.DATA ahora soporta **organizaciones jerárquicas con relaciones many-to-many** entre usuarios y organizaciones. Los usuarios pueden pertenecer a múltiples organizaciones, una debe ser marcada como primaria. La jerarquía organizacional permite control de acceso basado en roles con herencia.

---

## Cambios en el Modelo de Datos

### Tabla `organizations`

**Nuevos campos agregados:**
- `parent_id` (UUID, nullable) - ID de la organización padre para jerarquía
- `logo_url` (VARCHAR 500, nullable) - URL del logo de la organización
- `description` (TEXT, nullable) - Descripción de la organización
- `config` (JSONB) - Configuración personalizada (theme, formats, preferences)

**Organización raíz:**
- `EC.DATA` es la organización raíz (parent_id = null)
- Todas las demás organizaciones son hijas o descendientes de EC.DATA
- system-admins deben pertenecer a EC.DATA

### Nueva Tabla `user_organizations` (Many-to-Many)

Relaciona usuarios con organizaciones. Un usuario puede pertenecer a múltiples organizaciones.

```sql
CREATE TABLE user_organizations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    is_primary BOOLEAN DEFAULT false,
    joined_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,
    UNIQUE(user_id, organization_id)
);
```

**Reglas:**
- Un usuario DEBE tener al menos una organización
- Exactamente UNA organización debe tener `is_primary = true`
- La organización primaria es donde el usuario "pertenece" principalmente
- `is_primary` se usa para calcular `primaryOrgId` en el JWT

---

## ⚠️ REGLA CRÍTICA: Frontend NUNCA decodifica el JWT

**El frontend NO debe decodificar el JWT bajo ninguna circunstancia.**

En su lugar, la API provee un objeto `session_context` cacheado en Redis que contiene toda la información que el frontend necesita:

```typescript
interface SessionContext {
  activeOrgId: string;      // Organización actualmente activa
  primaryOrgId: string;     // Organización primaria del usuario
  canAccessAllOrgs: boolean; // true solo para system-admin
  role: string;             // Nombre del rol ("system-admin", "org-admin", etc.)
  email: string;
  firstName: string;
  lastName: string;
  userId: string;
}
```

### ¿Por qué NO decodificar el JWT?

1. **Performance**: `session_context` viene de Redis (ultra-rápido), no requiere operaciones de decodificación
2. **Seguridad**: El JWT debe ser opaco para el frontend
3. **Escalabilidad**: Redis distribuido permite cachear información de sesión sin carga en DB
4. **Mantenibilidad**: El frontend no depende de la estructura interna del JWT

### ¿Cómo obtener el session_context?

El `session_context` se devuelve automáticamente en:
- `POST /auth/login` - En la respuesta inicial
- `GET /auth/me` - Al consultar el perfil del usuario
- `POST /auth/switch-org` - Al cambiar de organización
- `GET /auth/session-context` - Endpoint dedicado (solo lee Redis, ultra-rápido)

---

## Nuevos Endpoints

### 1. GET `/api/v1/auth/organizations`

Obtiene todas las organizaciones disponibles para el usuario actual.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "canAccessAll": false,
    "userOrganizations": [
      {
        "organization_id": "01919d30-...",
        "slug": "acme-corp",
        "name": "ACME Corporation",
        "logo_url": "https://...",
        "is_primary": true,
        "is_active": true,
        "parent_id": "01919d2f-...",
        "joined_at": "2025-10-09T10:30:00.000Z"
      },
      {
        "organization_id": "01919d31-...",
        "slug": "acme-subsidiary",
        "name": "ACME Subsidiary",
        "logo_url": null,
        "is_primary": false,
        "is_active": true,
        "parent_id": "01919d30-...",
        "joined_at": "2025-10-09T11:00:00.000Z"
      }
    ],
    "totalAccessible": 5
  },
  "meta": {
    "timestamp": "2025-10-09T16:32:55.000Z",
    "locale": "es"
  }
}
```

**Campos:**
- `canAccessAll`: Si el usuario es system-admin (acceso a todas las orgs)
- `userOrganizations`: Array de organizaciones donde el usuario es miembro
- `totalAccessible`: Total de organizaciones a las que puede acceder (incluye descendientes según rol)

**Uso en Frontend:**
```typescript
const getAvailableOrganizations = async () => {
  const response = await fetch('/api/v1/auth/organizations', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const { data } = await response.json();
  
  // Renderizar selector de organizaciones
  const primaryOrg = data.userOrganizations.find(o => o.is_primary);
  const secondaryOrgs = data.userOrganizations.filter(o => !o.is_primary);
  
  return { primaryOrg, secondaryOrgs };
};
```

---

### 2. POST `/api/v1/auth/switch-org`

Cambia la organización activa del usuario. Retorna nuevos tokens JWT con `activeOrgId` actualizado.

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "organization_id": "01919d31-abcd-ef01-2345-6789abcdef01"
}
```

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "15m",
    "token_type": "Bearer",
    "active_organization_id": "01919d31-abcd-ef01-2345-6789abcdef01"
  },
  "meta": {
    "timestamp": "2025-10-09T16:35:00.000Z"
  }
}
```

**Errores:**
- `403 Forbidden` - El usuario no puede acceder a esa organización
- `400 Bad Request` - organization_id inválido

**Uso en Frontend:**
```typescript
const switchOrganization = async (organizationId: string) => {
  const response = await fetch('/api/v1/auth/switch-org', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ organization_id: organizationId })
  });
  
  const { data } = await response.json();
  
  // IMPORTANTE: Guardar nuevos tokens
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  
  // Recargar datos de la nueva organización
  window.location.reload(); // O usar router.reload()
};
```

---

## Lógica de Permisos Jerárquicos

### Reglas por Rol

| Rol | Scope de Acceso |
|-----|----------------|
| `system-admin` | **TODAS** las organizaciones del sistema (canAccessAllOrgs=true) |
| `org-admin` | Su organización + **todos los descendientes** (recursivo) |
| `org-manager` | Su organización + **hijos directos** (1 nivel) |
| `user` | Solo sus organizaciones directas (user_organizations) |
| `viewer` | Solo sus organizaciones directas (user_organizations) |
| `guest` | Solo sus organizaciones directas (user_organizations) |
| `demo` | Solo sus organizaciones directas (user_organizations) |

### Ejemplo de Jerarquía

```
EC.DATA (root)
│
├── ACME Corporation
│   ├── ACME Subsidiary A
│   └── ACME Subsidiary B
│
├── Tech Solutions Argentina
│   └── Tech Solutions Chile
│
└── Global Enterprises S.A.
```

**Escenario:**
- Usuario: `admin@acme.com`
- Rol: `org-admin`
- Organización primaria: `ACME Corporation`

**Acceso:**
- ✅ ACME Corporation (directa)
- ✅ ACME Subsidiary A (descendiente)
- ✅ ACME Subsidiary B (descendiente)
- ❌ Tech Solutions Argentina (no relacionada)
- ❌ EC.DATA (padre, no descendiente)

---

## Cambios en Endpoints Existentes

### POST `/api/v1/auth/login`

**Response actualizado:**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "01919d2f-...",
      "email": "admin@ecdata.com",
      "first_name": "System",
      "last_name": "Admin",
      "role": "system-admin",
      "is_active": true,
      "created_at": "2025-10-09T10:00:00.000Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "15m",
    "token_type": "Bearer"
  },
  "meta": {
    "timestamp": "2025-10-09T16:30:00.000Z"
  }
}
```

**Cambios importantes:**
- `user.role` ahora es un **string simple** con el nombre del rol (ej: "system-admin", "org-admin", "user")
- El JWT incluye `activeOrgId`, `primaryOrgId` y `canAccessAllOrgs`
- `activeOrgId` = `primaryOrgId` en el primer login

### POST `/api/v1/auth/refresh`

**Sin cambios en la request**, pero el nuevo JWT incluye los campos organizacionales actualizados.

---

## Implementación en Frontend

### 1. Obtener Session Context (SIN decodificar JWT)

**❌ NUNCA hagas esto:**
```typescript
import { jwtDecode } from 'jwt-decode';  // ❌ NO INSTALAR NI USAR
const decoded = jwtDecode(accessToken);  // ❌ PROHIBIDO
```

**✅ HAZ ESTO en su lugar:**
```typescript
// Opción A: Usar el session_context que viene en la respuesta de login
const handleLogin = async (email: string, password: string) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const { data } = await response.json();
  
  // Guardar tokens
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  
  // Guardar session_context en estado/localStorage
  localStorage.setItem('session_context', JSON.stringify(data.session_context));
  
  // Usar el contexto
  console.log('Active Org:', data.session_context.activeOrgId);
  console.log('Primary Org:', data.session_context.primaryOrgId);
  console.log('Can Access All:', data.session_context.canAccessAllOrgs);
  console.log('Role:', data.session_context.role);
};

// Opción B: Consultar el endpoint dedicado (ultra-rápido, solo Redis)
const getSessionContext = async () => {
  const response = await fetch('/api/v1/auth/session-context', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });
  
  const { data } = await response.json();
  return data.session_context;
};

// Verificar permisos basados en rol
const sessionContext = JSON.parse(localStorage.getItem('session_context'));
const isSystemAdmin = sessionContext.role === 'system-admin';
const isOrgAdmin = sessionContext.role === 'org-admin';
const canManageUsers = ['system-admin', 'org-admin', 'org-manager'].includes(sessionContext.role);
```

### 2. Selector de Organizaciones (UI Component)

```tsx
import { useState, useEffect } from 'react';

interface Organization {
  organization_id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  is_primary: boolean;
  is_active: boolean;
  parent_id: string | null;
  joined_at: string;
}

const OrganizationSwitcher = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    const response = await fetch('/api/v1/auth/organizations', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    const { data } = await response.json();
    setOrgs(data.userOrganizations);
    
    // Obtener activeOrgId del session_context
    const sessionContext = JSON.parse(localStorage.getItem('session_context'));
    setActiveOrgId(sessionContext.activeOrgId);
  };

  const handleSwitch = async (orgId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/switch-org', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ organization_id: orgId })
      });

      const { data } = await response.json();
      
      // Actualizar tokens
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Actualizar session_context con la nueva organización activa
      localStorage.setItem('session_context', JSON.stringify(data.session_context));
      
      // Recargar aplicación
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="org-switcher">
      <h3>Cambiar Organización</h3>
      <ul>
        {orgs.map(org => (
          <li key={org.organization_id}>
            <button
              onClick={() => handleSwitch(org.organization_id)}
              disabled={loading || org.organization_id === activeOrgId}
              className={org.organization_id === activeOrgId ? 'active' : ''}
            >
              {org.logo_url && <img src={org.logo_url} alt={org.name} />}
              <span>{org.name}</span>
              {org.is_primary && <span className="badge">Primary</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OrganizationSwitcher;
```

### 3. Context Provider para Multi-Tenancy

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface OrgContext {
  activeOrgId: string;
  primaryOrgId: string;
  canAccessAllOrgs: boolean;
  organizations: Organization[];
  switchOrganization: (orgId: string) => Promise<void>;
  refetchOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrgContext | null>(null);

export const OrganizationProvider: React.FC = ({ children }) => {
  const [activeOrgId, setActiveOrgId] = useState('');
  const [primaryOrgId, setPrimaryOrgId] = useState('');
  const [canAccessAllOrgs, setCanAccessAllOrgs] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    initializeOrganizations();
  }, []);

  const initializeOrganizations = async () => {
    // Obtener session_context (NO decodificar JWT)
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    // Leer desde localStorage o consultar el endpoint
    const cachedContext = localStorage.getItem('session_context');
    let sessionContext;
    
    if (cachedContext) {
      sessionContext = JSON.parse(cachedContext);
    } else {
      // Consultar endpoint si no hay cache
      const response = await fetch('/api/v1/auth/session-context', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const { data } = await response.json();
      sessionContext = data.session_context;
      localStorage.setItem('session_context', JSON.stringify(sessionContext));
    }
    
    setActiveOrgId(sessionContext.activeOrgId);
    setPrimaryOrgId(sessionContext.primaryOrgId);
    setCanAccessAllOrgs(sessionContext.canAccessAllOrgs);
    
    // Fetch organizaciones
    await refetchOrganizations();
  };

  const refetchOrganizations = async () => {
    const response = await fetch('/api/v1/auth/organizations', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    const { data } = await response.json();
    setOrganizations(data.userOrganizations);
  };

  const switchOrganization = async (orgId: string) => {
    const response = await fetch('/api/v1/auth/switch-org', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ organization_id: orgId })
    });

    const { data } = await response.json();
    
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('session_context', JSON.stringify(data.session_context));
    
    await initializeOrganizations();
  };

  return (
    <OrganizationContext.Provider value={{
      activeOrgId,
      primaryOrgId,
      canAccessAllOrgs,
      organizations,
      switchOrganization,
      refetchOrganizations
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
```

---

## Usuarios de Prueba (Seed Data)

El endpoint `/api/v1/seed/test-data?fresh=true` crea usuarios de prueba con organizaciones:

| Email | Password | Rol | Org Primaria |
|-------|----------|-----|--------------|
| admin@ecdata.com | Test123! | system-admin | EC.DATA |
| orgadmin@acme.com | Test123! | org-admin | ACME Corporation |
| manager@techsolutions.com.ar | Test123! | org-manager | Tech Solutions Argentina |
| user@global.es | Test123! | user | Global Enterprises S.A. |
| viewer@acme.com | Test123! | viewer | ACME Corporation |
| guest@demo.com | Test123! | guest | EC.DATA |
| demo@ecdata.com | Test123! | demo | EC.DATA |

**Organizaciones creadas:**
1. EC.DATA (root, parent_id=null)
2. ACME Corporation (parent: EC.DATA)
3. Tech Solutions Argentina (parent: EC.DATA)
4. Global Enterprises S.A. (parent: EC.DATA)

---

## Cache y Performance

### Redis Cache

El sistema usa Redis para cachear:
- **Organization Scope** (TTL: 15 minutos) - Lista de organizaciones accesibles por usuario
- **Organization Tree** (TTL: 30 minutos) - Descendientes de una organización

**Fallback:** Si Redis no está disponible, usa caché en memoria (solo durante la sesión actual).

### Invalidación de Cache

El cache se invalida automáticamente cuando:
- El usuario cambia su organización primaria
- Se modifica la jerarquía de organizaciones
- El usuario hace switch de organización

---

## Migraci\u00f3n de Proyectos Existentes

### 1. ⚠️ ELIMINAR librería jwt-decode y actualizar código

**❌ Código ANTIGUO a eliminar:**
```bash
npm uninstall jwt-decode  # Eliminar la librería
```

```typescript
import { jwtDecode } from 'jwt-decode';  // ❌ BORRAR ESTE IMPORT
const { orgId } = jwtDecode(token);       // ❌ BORRAR ESTA LÓGICA
```

**✅ Código NUEVO:**
```typescript
// Ya no necesitas jwt-decode - usa session_context
const sessionContext = JSON.parse(localStorage.getItem('session_context'));
const activeOrgId = sessionContext.activeOrgId;
const primaryOrgId = sessionContext.primaryOrgId;
const canAccessAllOrgs = sessionContext.canAccessAllOrgs;
const role = sessionContext.role;
```

O si necesitas obtenerlo fresh desde el servidor:
```typescript
const response = await fetch('/api/v1/auth/session-context', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
const sessionContext = data.session_context;
```

### 2. Actualizar Headers de Request

Si antes enviabas `X-Organization-Id`, ahora está en el JWT como `activeOrgId`:

**Antes:**
```typescript
fetch('/api/v1/products', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Organization-Id': currentOrgId // ❌ Ya no necesario
  }
});
```

**Ahora:**
```typescript
fetch('/api/v1/products', {
  headers: {
    'Authorization': `Bearer ${token}` // ✅ activeOrgId está en el JWT
  }
});
```

### 3. Implementar Selector de Organizaciones

Agrega un selector de organizaciones en el header/navbar del frontend para permitir a los usuarios cambiar entre sus organizaciones.

---

## FAQs

### ¿Cómo sé cuál es la organización activa actual?
Decodifica el JWT y lee `activeOrgId`.

### ¿Puedo cambiar la organización primaria desde el frontend?
No directamente. El cambio de organización primaria requiere actualizar `is_primary` en la base de datos y debe ser manejado por un endpoint administrativo.

### ¿Qué pasa si cambio de organización?
El endpoint `/auth/switch-org` genera nuevos tokens JWT. Debes:
1. Guardar los nuevos tokens
2. Recargar la aplicación para reflejar el contexto de la nueva organización

### ¿Los usuarios deben cambiar de organización manualmente?
No siempre. Si un usuario solo pertenece a una organización, no necesita switcher. Usa `userOrganizations.length > 1` para mostrar el selector.

### ¿Cómo funciona la jerarquía?
- `org-admin` de ACME puede acceder a ACME + todas sus subsidiarias (recursivo)
- `org-manager` de ACME puede acceder a ACME + hijas directas (1 nivel)
- `user` solo puede acceder a las orgs donde es miembro explícito

### ¿Qué es `canAccessAllOrgs`?
Solo `system-admin` tiene este flag en `true`. Significa que puede acceder a TODAS las organizaciones del sistema, incluyendo EC.DATA.

---

## Recursos Adicionales

- **Swagger Docs:** `/docs` - Documentación interactiva de la API
- **DBML Visualization:** `database.dbml.txt` - Diagrama de base de datos (visualizar en https://dbdiagram.io)
- **Postman Collection:** Solicitar al equipo backend

---

**Fecha de actualización:** 2025-10-09  
**Versión API:** v1  
**Estado:** ✅ Implementado y funcional
