# EC.DATA API - Documentación de Respuestas de Autenticación

> **Versión:** 1.0  
> **Última actualización:** 2026-01-15  
> **Dirigido a:** Equipo de Frontend

---

## Política de Seguridad

**IMPORTANTE:** La API **NUNCA** expone UUIDs internos en las respuestas. Todos los identificadores expuestos son `public_codes` (formato Hashids + Luhn checksum) que son:
- Opacos (no revelan información del sistema)
- No enumerables (no se pueden adivinar secuencialmente)
- Verificables (checksum Luhn detecta manipulación)

---

## 1. POST `/api/v1/auth/login`

### Request Body
```json
{
  "identifier": "admin@ecdata.com",
  "password": "contraseña123",
  "turnstile_token": "token-captcha-opcional"
}
```

### Response (200 OK)
```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900,
    "token_type": "Bearer",
    "user": {
      "public_code": "USR-5LYJX-4",
      "email": "admin@ecdata.com",
      "first_name": "Admin",
      "last_name": "Sistema",
      "avatar_url": "https://storage.blob.core.windows.net/avatars/admin.jpg",
      "language": "es",
      "timezone": "America/Lima",
      "role": "system-admin",
      "permissions": ["users.read", "users.write", "orgs.manage", ...]
    },
    "session_context": {
      "activeOrgPublicCode": "ORG-ABC12-3",
      "activeOrgName": "Hoteles Libertador",
      "activeOrgLogoUrl": "https://storage.blob.core.windows.net/logos/libertador.png",
      "primaryOrgPublicCode": "ORG-ABC12-3",
      "primaryOrgName": "Hoteles Libertador",
      "primaryOrgLogoUrl": "https://storage.blob.core.windows.net/logos/libertador.png",
      "canAccessAllOrgs": true,
      "role": "system-admin",
      "email": "admin@ecdata.com",
      "firstName": "Admin",
      "lastName": "Sistema",
      "userPublicCode": "USR-5LYJX-4"
    },
    "message": "auth.login.success"
  }
}
```

---

## 2. GET `/api/v1/auth/me`

Retorna el perfil del usuario autenticado y su contexto de sesión.

### Headers
```
Authorization: Bearer <access_token>
```

### Response (200 OK)
```json
{
  "ok": true,
  "data": {
    "user": {
      "public_code": "USR-5LYJX-4",
      "email": "admin@ecdata.com",
      "first_name": "Admin",
      "last_name": "Sistema",
      "avatar_url": "https://storage.blob.core.windows.net/avatars/admin.jpg",
      "language": "es",
      "timezone": "America/Lima",
      "role": "system-admin",
      "permissions": ["users.read", "users.write", "orgs.manage", ...]
    },
    "session_context": {
      "activeOrgPublicCode": "ORG-ABC12-3",
      "activeOrgName": "Hoteles Libertador",
      "activeOrgLogoUrl": "https://storage.blob.core.windows.net/logos/libertador.png",
      "primaryOrgPublicCode": "ORG-ABC12-3",
      "primaryOrgName": "Hoteles Libertador",
      "primaryOrgLogoUrl": "https://storage.blob.core.windows.net/logos/libertador.png",
      "canAccessAllOrgs": true,
      "role": "system-admin",
      "email": "admin@ecdata.com",
      "firstName": "Admin",
      "lastName": "Sistema",
      "userPublicCode": "USR-5LYJX-4"
    },
    "impersonating": false,
    "impersonatedOrg": null,
    "message": "auth.profile.retrieved"
  }
}
```

**Nota:** Los campos `impersonating` e `impersonatedOrg` solo aparecen cuando el usuario es `system-admin`.

---

## 3. POST `/api/v1/auth/switch-org`

Cambia la organización activa del usuario (solo entre orgs a las que pertenece).

### Request Body
```json
{
  "organization_id": "ORG-XYZ78-9"
}
```

### Response (200 OK)
```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900,
    "token_type": "Bearer",
    "session_context": {
      "activeOrgPublicCode": "ORG-XYZ78-9",
      "activeOrgName": "Nueva Organización",
      "activeOrgLogoUrl": "https://...",
      "primaryOrgPublicCode": "ORG-ABC12-3",
      "primaryOrgName": "Hoteles Libertador",
      "primaryOrgLogoUrl": "https://...",
      "canAccessAllOrgs": false,
      "role": "org-admin",
      "email": "user@ecdata.com",
      "firstName": "Usuario",
      "lastName": "Normal",
      "userPublicCode": "USR-XXXXX-X"
    }
  }
}
```

---

## 4. POST `/api/v1/auth/impersonate-org` (Solo system-admin)

Permite a un system-admin "entrar" a cualquier organización para gestionar sus recursos.

### Request Body
```json
{
  "organization_id": "ORG-TARGET-1"
}
```

### Response (200 OK)
```json
{
  "ok": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 900,
    "token_type": "Bearer",
    "session_context": {
      "activeOrgPublicCode": "ORG-TARGET-1",
      "activeOrgName": "Organización Impersonada",
      "activeOrgLogoUrl": "https://...",
      "primaryOrgPublicCode": null,
      "primaryOrgName": null,
      "primaryOrgLogoUrl": null,
      "canAccessAllOrgs": true,
      "role": "system-admin",
      "email": "admin@ecdata.com",
      "firstName": "Admin",
      "lastName": "Sistema",
      "userPublicCode": "USR-ADMIN-1"
    },
    "impersonating": true,
    "impersonatedOrg": {
      "publicCode": "ORG-TARGET-1"
    },
    "message": "Impersonation started successfully"
  }
}
```

**Frontend debe:** Mostrar un indicador visual cuando `impersonating: true` (ej. banner rojo "Impersonando organización X").

---

## 5. POST `/api/v1/auth/exit-impersonation` (Solo system-admin)

Sale del modo impersonación y vuelve al panel admin global (God View).

### Response (200 OK)
```json
{
  "ok": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 900,
    "token_type": "Bearer",
    "session_context": {
      "activeOrgPublicCode": null,
      "activeOrgName": null,
      "activeOrgLogoUrl": null,
      "primaryOrgPublicCode": null,
      "primaryOrgName": null,
      "primaryOrgLogoUrl": null,
      "canAccessAllOrgs": true,
      "role": "system-admin",
      "email": "admin@ecdata.com",
      "firstName": "Admin",
      "lastName": "Sistema",
      "userPublicCode": "USR-ADMIN-1"
    },
    "impersonating": false,
    "impersonatedOrg": null,
    "message": "Exited impersonation mode successfully"
  }
}
```

---

## 6. GET `/api/v1/auth/session-context`

Endpoint rápido para obtener solo el contexto de sesión (sin tokens nuevos).

### Response (200 OK)
```json
{
  "ok": true,
  "data": {
    "session_context": {
      "activeOrgPublicCode": "ORG-ABC12-3",
      "activeOrgName": "Hoteles Libertador",
      "activeOrgLogoUrl": "https://...",
      "primaryOrgPublicCode": "ORG-ABC12-3",
      "primaryOrgName": "Hoteles Libertador",
      "primaryOrgLogoUrl": "https://...",
      "canAccessAllOrgs": false,
      "role": "org-admin",
      "email": "user@ecdata.com",
      "firstName": "Usuario",
      "lastName": "Normal",
      "userPublicCode": "USR-XXXXX-X"
    },
    "impersonating": false,
    "impersonatedOrg": null,
    "message": "Session context retrieved successfully"
  }
}
```

---

## Estructuras de Datos

### Objeto `user` (en respuestas)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `public_code` | string | Identificador público del usuario (formato USR-XXXXX-X) |
| `email` | string | Email del usuario |
| `first_name` | string | Nombre |
| `last_name` | string | Apellido |
| `avatar_url` | string\|null | URL del avatar |
| `language` | string | Idioma preferido (es, en) |
| `timezone` | string | Zona horaria (ej. America/Lima) |
| `role` | string | Nombre del rol (system-admin, org-admin, etc.) |
| `permissions` | string[] | Lista de permisos del rol |

### Objeto `session_context` (en respuestas)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `activeOrgPublicCode` | string\|null | Public code de la org activa (null = God View) |
| `activeOrgName` | string\|null | Nombre de la org activa |
| `activeOrgLogoUrl` | string\|null | URL del logo de la org activa |
| `primaryOrgPublicCode` | string\|null | Public code de la org primaria del usuario |
| `primaryOrgName` | string\|null | Nombre de la org primaria |
| `primaryOrgLogoUrl` | string\|null | URL del logo de la org primaria |
| `canAccessAllOrgs` | boolean | Si puede acceder a todas las orgs (solo system-admin) |
| `role` | string | Nombre del rol del usuario |
| `email` | string | Email del usuario |
| `firstName` | string | Nombre del usuario |
| `lastName` | string | Apellido del usuario |
| `userPublicCode` | string | Public code del usuario |

---

## Campos que NO se exponen (por seguridad)

Los siguientes campos **NUNCA** aparecen en las respuestas API:
- `id` (UUID interno)
- `userId` (UUID interno)
- `activeOrgId` (UUID interno)
- `primaryOrgId` (UUID interno)
- `role_id` (UUID interno)
- `organization_id` (UUID interno)
- `human_id` (ID legible interno)
- `created_at`, `updated_at`, `deleted_at` (timestamps internos)
- `email_verified_at`, `last_login_at` (timestamps sensibles)
- `is_active` (estado interno)
- `session_version` (versión de sesión interna)

---

## Modo God View (solo system-admin)

Cuando un `system-admin` está en modo "God View":
- `activeOrgPublicCode` = `null`
- `canAccessAllOrgs` = `true`
- Puede usar `?showAll=true` en endpoints de listado para ver TODOS los recursos de todas las organizaciones
- Puede impersonar cualquier organización con `/auth/impersonate-org`

---

## Ejemplos de Uso en Frontend

### Detectar si el usuario es system-admin en God View
```javascript
const isGodView = sessionContext.canAccessAllOrgs && !sessionContext.activeOrgPublicCode;
```

### Detectar si está impersonando
```javascript
const isImpersonating = authResponse.impersonating === true;
if (isImpersonating) {
  // Mostrar banner de impersonación
  showImpersonationBanner(authResponse.impersonatedOrg.publicCode);
}
```

### Obtener la organización activa
```javascript
const activeOrg = {
  publicCode: sessionContext.activeOrgPublicCode,
  name: sessionContext.activeOrgName,
  logoUrl: sessionContext.activeOrgLogoUrl
};
```
