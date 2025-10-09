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

## Cambios en JWT (Token)

### ❌ Campo ELIMINADO
- `orgId` - Ya NO existe en el JWT

### ✅ Nuevos Campos en JWT

```json
{
  "iss": "ec.data-api",
  "aud": "ec.data-client",
  "sub": "01919d2f-...",
  "activeOrgId": "01919d30-...",
  "primaryOrgId": "01919d30-...",
  "canAccessAllOrgs": false,
  "sessionVersion": 1,
  "role": {
    "id": "01919d2e-...",
    "name": "org-admin",
    "description": "Organization Administrator",
    "is_active": true
  },
  "tokenType": "access",
  "jti": "uuid...",
  "iat": 1728489723,
  "exp": 1728490623
}
```

**Campos clave:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `activeOrgId` | UUID | Organización actualmente activa en la sesión |
| `primaryOrgId` | UUID | Organización primaria del usuario (is_primary=true) |
| `canAccessAllOrgs` | boolean | `true` solo para system-admin, permite acceso global |

**Flujo:**
1. Al hacer login, `activeOrgId` = `primaryOrgId` por defecto
2. El usuario puede cambiar `activeOrgId` usando el endpoint `/auth/switch-org`
3. `primaryOrgId` nunca cambia a menos que se actualice `is_primary` en la BD

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
      "role": {
        "id": "01919d2e-...",
        "name": "system-admin",
        "description": "System Administrator",
        "is_active": true
      },
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

**Cambios en JWT:**
- El JWT ahora incluye `activeOrgId`, `primaryOrgId` y `canAccessAllOrgs`
- `activeOrgId` = `primaryOrgId` en el primer login

### POST `/api/v1/auth/refresh`

**Sin cambios en la request**, pero el nuevo JWT incluye los campos organizacionales actualizados.

---

## Implementación en Frontend

### 1. Decodificar JWT

```typescript
import { jwtDecode } from 'jwt-decode';

interface JWTPayload {
  sub: string;
  activeOrgId: string;
  primaryOrgId: string;
  canAccessAllOrgs: boolean;
  role: {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
  };
  sessionVersion: number;
  tokenType: 'access' | 'refresh';
  jti: string;
  iat: number;
  exp: number;
}

const decoded: JWTPayload = jwtDecode(accessToken);
console.log('Active Org:', decoded.activeOrgId);
console.log('Primary Org:', decoded.primaryOrgId);
console.log('Can Access All:', decoded.canAccessAllOrgs);
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
    
    // Obtener activeOrgId del JWT
    const token = localStorage.getItem('access_token');
    const decoded = jwtDecode(token);
    setActiveOrgId(decoded.activeOrgId);
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
    // Decodificar JWT
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    const decoded = jwtDecode(token);
    setActiveOrgId(decoded.activeOrgId);
    setPrimaryOrgId(decoded.primaryOrgId);
    setCanAccessAllOrgs(decoded.canAccessAllOrgs);
    
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
| admin@ecdata.com | Admin123! | system-admin | EC.DATA |
| orgadmin@acme.com | Admin123! | org-admin | ACME Corporation |
| manager@techsolutions.com.ar | Admin123! | org-manager | Tech Solutions Argentina |
| user@global.es | Admin123! | user | Global Enterprises S.A. |
| viewer@acme.com | Admin123! | viewer | ACME Corporation |
| guest@demo.com | Admin123! | guest | EC.DATA |
| demo@ecdata.com | Admin123! | demo | EC.DATA |

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

### 1. Actualizar Decodificación de JWT

**Antes:**
```typescript
const { orgId } = jwtDecode(token);
```

**Ahora:**
```typescript
const { activeOrgId, primaryOrgId, canAccessAllOrgs } = jwtDecode(token);
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

## Contacto

Para dudas sobre esta implementación:
- Backend Lead: [email]
- Frontend Lead: [email]
- Slack: #api-ec-data

---

**Fecha de actualización:** 2025-10-09  
**Versión API:** v1  
**Estado:** ✅ Implementado y funcional
