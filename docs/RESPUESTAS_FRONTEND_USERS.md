# 📋 Respuestas para Frontend: API de Usuarios - Estado Actual

**Fecha:** 28 de Octubre, 2025  
**Estado:** Documentación sincronizada 1:1 con backend funcional

---

## 🎯 Resumen Ejecutivo

La API de usuarios está **100% funcional** con las siguientes capacidades:
- ✅ CRUD completo de usuarios
- ✅ Gestión de perfil propio
- ✅ RBAC (control de acceso basado en roles)
- ✅ Multi-tenancy (1 usuario = 1 organización primaria)
- ✅ Validación de jerarquía de roles
- ✅ Cache Redis + invalidación automática

**Lo que NO está disponible todavía:**
- ❌ Campos: phone, language, timezone, avatar_url
- ❌ Multi-organización (1 usuario = múltiples organizaciones)
- ❌ Endpoint de validación de email

---

## 1️⃣ POST /api/v1/users - Crear Usuario

### ✅ Payload que FUNCIONA HOY:

```json
{
  "email": "maria@energycompany.com",
  "password": "SecurePass123!",
  "first_name": "María",
  "last_name": "González",
  "role": "user",
  "organization_id": "ORG-00123-X",
  "send_invite": false
}
```

### 📌 Campos OBLIGATORIOS:
- `email` (string) - Email único, normalizado automáticamente (trim + toLowerCase)
- `password` (string) - Mínimo 8 caracteres, máximo 255 (sin validación de caracteres especiales)
- `first_name` (string, 1-100 caracteres)
- `last_name` (string, 1-100 caracteres)
- `role` (string) - Slug del rol: `system-admin`, `org-admin`, `org-manager`, `user`, `viewer`, `guest`, `demo`

### 📌 Campos OPCIONALES:
- `organization_id` (string) - Public code (formato: `ORG-XXXXX-X`)
  - ⚠️ Si eres `org-admin`, **NO envíes este campo** (se fuerza automáticamente a tu organización)
- `send_invite` (boolean, default: false) - Enviar email de invitación

### ⚠️ Validaciones:
1. **Email:** Único en toda la plataforma (no por organización)
2. **Role:** Debe existir en la BD. **No puedes asignar un rol superior al tuyo** (jerarquía):
   - `org-admin` puede crear: org-admin, org-manager, user, viewer, guest, demo
   - `org-admin` NO puede crear: system-admin
3. **Organization:** Si se envía `organization_id`, debe existir
4. **Password:** Solo validación de longitud (8-255 caracteres)

### ✅ Respuesta Exitosa (201 Created):

```json
{
  "ok": true,
  "data": {
    "id": "USR-7K9D2-X",
    "email": "maria@energycompany.com",
    "first_name": "María",
    "last_name": "González",
    "role": {
      "id": "ROLE-XXXXX-X",
      "name": "user",
      "description": "Usuario estándar con acceso limitado"
    },
    "primary_organization": {
      "id": "ORG-00123-X",
      "name": "Energy Company",
      "slug": "energy-company"
    },
    "is_active": true,
    "created_at": "2025-10-28T12:00:00Z",
    "updated_at": "2025-10-28T12:00:00Z"
  }
}
```

### ❌ Errores Posibles:

**409 - Email duplicado:**
```json
{
  "ok": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "Email already exists"
  }
}
```

**404 - Rol no encontrado:**
```json
{
  "ok": false,
  "error": {
    "code": "ROLE_NOT_FOUND",
    "message": "Role not found"
  }
}
```

**403 - Violación de jerarquía de roles:**
```json
{
  "ok": false,
  "error": {
    "code": "ROLE_HIERARCHY_VIOLATION",
    "message": "Cannot assign role higher than your own",
    "details": {
      "current_role": "org-admin",
      "target_role": "system-admin"
    }
  }
}
```

**400 - Validación (Zod):**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "password": ["Password must be at least 8 characters"],
      "email": ["Must be a valid email address"]
    }
  }
}
```

---

## 2️⃣ PUT /api/v1/users/:id - Actualizar Usuario

### ✅ Payload que FUNCIONA HOY:

```json
{
  "first_name": "Carlos Alberto",
  "last_name": "Rodríguez",
  "role": "org-manager",
  "organization_id": "ORG-00456-Y",
  "is_active": true
}
```

### 📌 Campos OPCIONALES (todos):
- `first_name` (string, 1-100 caracteres)
- `last_name` (string, 1-100 caracteres)
- `role` (string) - Slug del rol. **No puedes asignar rol superior al tuyo**
- `organization_id` (string) - Public code (formato: ORG-XXXXX-X)
- `is_active` (boolean) - Activar/desactivar usuario

### ⚠️ NO se puede cambiar:
- Email (inmutable - requiere endpoint dedicado)
- Password (usar PATCH /users/me/password)

### ✅ Respuesta Exitosa (200 OK):

```json
{
  "ok": true,
  "data": {
    "id": "USR-3B8K1-M",
    "email": "carlos.rodriguez@acme.com",
    "first_name": "Carlos Alberto",
    "last_name": "Rodríguez",
    "role": {
      "name": "org-manager",
      "description": "Manager de organización con permisos elevados"
    },
    "primary_organization": {
      "id": "ORG-00456-Y",
      "name": "ACME Subsidiary",
      "slug": "acme-sub"
    },
    "is_active": true,
    "created_at": "2025-10-22T19:35:00Z",
    "updated_at": "2025-10-22T19:40:00Z"
  }
}
```

---

## 3️⃣ PUT /api/v1/users/me - Actualizar Mi Perfil

### ✅ Payload que FUNCIONA HOY:

```json
{
  "first_name": "Juan Carlos",
  "last_name": "Pérez"
}
```

### 📌 Campos OPCIONALES (todos):
- `first_name` (string, 1-100 caracteres)
- `last_name` (string, 1-100 caracteres)

### ⚠️ NO se puede cambiar desde este endpoint:
- Email (inmutable)
- Password (usar PATCH /users/me/password)
- Rol (solo administradores)
- Organización (requiere aprobación de administrador)
- Estado activo (solo administradores)

---

## 4️⃣ GET /api/v1/users - Listar Usuarios

### 📌 Query Parameters:
- `limit` (number, default: 20, max: 100)
- `offset` (number, default: 0)
- `search` (string, opcional) - Búsqueda por nombre o email
- `organization_id` (string, opcional) - Filtrar por organización (public_code)
- `role_name` (string, opcional) - Filtrar por rol
- `active_only` (boolean, default: true) - Solo usuarios activos

### ✅ Respuesta:

```json
{
  "ok": true,
  "data": [
    {
      "id": "USR-9A2F7-K",
      "email": "juan.perez@acme.com",
      "first_name": "Juan",
      "last_name": "Pérez",
      "role": {
        "name": "org-admin",
        "description": "Administrador de organización"
      },
      "primary_organization": {
        "id": "ORG-00123-X",
        "name": "ACME Corporation",
        "slug": "acme-corp"
      },
      "is_active": true,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-10-20T09:15:00Z"
    }
  ],
  "meta": {
    "total": 47,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

## 5️⃣ GET /api/v1/users/:id - Ver Usuario

### ✅ Respuesta:

```json
{
  "ok": true,
  "data": {
    "id": "USR-9A2F7-K",
    "email": "juan.perez@acme.com",
    "first_name": "Juan",
    "last_name": "Pérez",
    "role": {
      "name": "org-admin",
      "description": "Administrador de organización"
    },
    "primary_organization": {
      "id": "ORG-00123-X",
      "name": "ACME Corporation",
      "slug": "acme-corp"
    },
    "is_active": true,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-10-20T09:15:00Z"
  }
}
```

---

## 6️⃣ GET /api/v1/users/me - Mi Perfil

### ✅ Respuesta:

```json
{
  "ok": true,
  "data": {
    "id": "USR-9A2F7-K",
    "email": "juan.perez@acme.com",
    "first_name": "Juan",
    "last_name": "Pérez",
    "role": {
      "name": "org-admin",
      "description": "Administrador de organización"
    },
    "primary_organization": {
      "id": "ORG-00123-X",
      "name": "ACME Corporation",
      "slug": "acme-corp"
    },
    "is_active": true,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-10-20T09:15:00Z"
  }
}
```

---

## 🚀 Próximas Funcionalidades (NO disponibles HOY)

### Opción 2: Campos Adicionales (Próxima iteración)
- `phone`, `language`, `timezone`, `avatar_url`
- Endpoint: `GET /api/v1/users/validate-email?email=...`

### Opción 3: Multi-Organización (Futuro)
- Campo `organization_memberships[]` en POST
- Endpoints: `/users/:id/organizations` (CRUD completo)
- Un usuario puede pertenecer a múltiples organizaciones con diferentes roles

---

## 📝 Notas Importantes

1. **Campos que NO vienen en las respuestas:**
   - ❌ `phone`, `language`, `timezone`, `avatar_url` (no existen)
   - ❌ `email_verified`, `last_login_at` (existen en BD pero no se serializan)

2. **Nombres de campos correctos:**
   - ✅ `role` (NO `role_name`)
   - ✅ `organization_id` (NO `primary_organization_id`)

3. **Autenticación:**
   - Todos los endpoints requieren Bearer token JWT
   - Header: `Authorization: Bearer ${accessToken}`

4. **Identificadores:**
   - Usa siempre `public_code` (ej: `USR-7K9D2-X`)
   - Nunca expongas UUIDs al frontend

---

## 💡 Ejemplo Completo de Uso

```javascript
// Crear usuario
const response = await fetch('/api/v1/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: "maria@energycompany.com",
    password: "SecurePass123!",
    first_name: "María",
    last_name: "González",
    role: "user",
    organization_id: "ORG-00123-X", // Omitir si eres org-admin
    send_invite: false
  })
});

if (!response.ok) {
  const error = await response.json();
  console.error('Error:', error);
  throw new Error(error.error.message);
}

const { data } = await response.json();
console.log('Usuario creado:', data.id); // USR-7K9D2-X
```

---

## 🔗 Documentación Completa

Ver: `docs/USERS_API_GUIDE.md` para ejemplos detallados y todos los endpoints.
