# 👥 Users API - Guía para Frontend

Guía completa de uso de la API de Usuarios para el equipo de frontend.

## 📋 Tabla de Contenidos

- [Autenticación y Permisos](#autenticación-y-permisos)
- [Identificadores](#identificadores)
- [Endpoints CRUD](#endpoints-crud)
- [Endpoints de Perfil](#endpoints-de-perfil)
- [Endpoints de Información Relacionada](#endpoints-de-información-relacionada)
- [Endpoint de Roles](#endpoint-de-roles)
- [Manejo de Errores](#manejo-de-errores)

---

## 🔐 Autenticación y Permisos

Todos los endpoints requieren autenticación mediante Bearer token JWT:

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

### Permisos por Rol

| Rol | Ver Usuarios | Crear | Editar | Eliminar | Ver Otros Perfiles |
|-----|--------------|-------|--------|----------|-------------------|
| **system-admin** | Todos | ✅ | Todos | Todos | ✅ |
| **org-admin** | Org + descendientes | ✅ | Org + descendientes | Org + descendientes | ✅ |
| **org-manager** | Org + hijos directos | ✅ | Org + hijos directos | ❌ | ✅ |
| **user/viewer/guest/demo** | Sus orgs directas | ❌ | Solo su perfil | ❌ | Solo su org |

### Jerarquía de Roles

Al crear o editar usuarios, **no puedes asignar roles superiores al tuyo**:

- `system-admin` puede asignar cualquier rol
- `org-admin` puede asignar: org-admin, org-manager, user, viewer, guest, demo
- `org-manager` puede asignar: user, viewer, guest, demo
- Otros roles: no pueden crear usuarios

---

## 🔑 Identificadores

**⚠️ IMPORTANTE:** La API usa `public_code` para identificar usuarios, **NO UUID**.

```javascript
// ✅ CORRECTO
const userId = "USR-9A2F7-K"; // public_code

// ❌ INCORRECTO
const userId = "123e4567-e89b-12d3-a456-426614174000"; // UUID (solo interno)
```

**Nunca exponer UUIDs al frontend.** Usar siempre `public_code`.

---

## 📊 Endpoints CRUD

### 1. GET /api/v1/users

Lista usuarios con paginación y filtros según el scope del usuario autenticado.

**Query Parameters:**
- `limit` (number, default: 20, max: 100) - Cantidad de resultados
- `offset` (number, default: 0) - Offset para paginación
- `search` (string, opcional) - Búsqueda por nombre o email
- `organization_id` (string, opcional) - Filtrar por organización (public_code)
- `role_name` (string, opcional) - Filtrar por rol (system-admin, org-admin, etc.)
- `active_only` (boolean, default: true) - Solo usuarios activos

**Response:**
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
        "description": "Administrador de organización con acceso a todas las funcionalidades"
      },
      "primary_organization": {
        "id": "ORG-00123-X",
        "name": "ACME Corporation",
        "slug": "acme-corp"
      },
      "is_active": true,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-10-20T09:15:00Z"
    },
    {
      "id": "USR-7K3D2-P",
      "email": "maria.gonzalez@acme.com",
      "first_name": "María",
      "last_name": "González",
      "role": {
        "name": "user",
        "description": "Usuario estándar con acceso limitado"
      },
      "primary_organization": {
        "id": "ORG-00123-X",
        "name": "ACME Corporation",
        "slug": "acme-corp"
      },
      "is_active": true,
      "created_at": "2025-02-10T14:20:00Z",
      "updated_at": "2025-02-10T14:20:00Z"
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

**Nota:** La respuesta NO incluye `email_verified`, `last_login_at`, `phone`, `language`, `timezone`, `avatar_url` (campos no disponibles aún). Tampoco incluye `timestamp` ni `locale` en meta.

**Ejemplo de uso (React/Next.js):**
```javascript
const fetchUsers = async (page = 0, filters = {}) => {
  const limit = 20;
  const offset = page * limit;
  
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    ...(filters.search && { search: filters.search }),
    ...(filters.organizationId && { organization_id: filters.organizationId }),
    ...(filters.role && { role_name: filters.role }),
    ...(filters.activeOnly !== undefined && { active_only: filters.activeOnly })
  });
  
  const response = await fetch(
    `/api/v1/users?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  const { data, meta } = await response.json();
  return { users: data, meta };
};
```

---

### 2. GET /api/v1/users/:id

Obtiene detalles de un usuario específico.

**URL Parameters:**
- `id` (string, required) - Public code del usuario

**Response:**
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
      "description": "Administrador de organización con acceso a todas las funcionalidades"
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

**Nota:** La respuesta NO incluye `email_verified`, `last_login_at`, `phone`, `language`, `timezone`, `avatar_url` (campos no disponibles aún).

**Ejemplo de uso:**
```javascript
const getUserDetails = async (userPublicCode) => {
  const response = await fetch(
    `/api/v1/users/${userPublicCode}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Usuario no encontrado');
    }
    if (response.status === 403) {
      throw new Error('No tienes permiso para ver este usuario');
    }
    throw new Error('Error al obtener usuario');
  }
  
  const { data } = await response.json();
  return data;
};
```

---

### 3. POST /api/v1/users

Crea un nuevo usuario. Requiere rol `org-admin` o superior.

**Request Body:**
```json
{
  "email": "nuevo.usuario@acme.com",
  "password": "SecurePass123!",
  "first_name": "Carlos",
  "last_name": "Rodríguez",
  "role": "user",
  "organization_id": "ORG-00123-X",
  "send_invite": false
}
```

**Campos requeridos:**
- `email` (string) - Email único, normalizado automáticamente (trim + toLowerCase)
- `password` (string, min 8 caracteres, max 255) - Hasheado con bcrypt
- `first_name` (string, 1-100 caracteres)
- `last_name` (string, 1-100 caracteres)
- `role` (string) - Slug del rol: system-admin, org-admin, org-manager, user, viewer, guest, demo

**Campos opcionales:**
- `organization_id` (string) - Public code de la organización (formato: ORG-XXXXX-X)
  - **Nota:** Si eres `org-admin`, se fuerza automáticamente a tu organización (no envíes este campo)
- `send_invite` (boolean, default: false) - Enviar email de invitación al usuario

**⚠️ Campos NO disponibles aún (próxima iteración):**
- `phone`, `language`, `timezone`, `avatar_url` - Planificados para implementación futura

**Response 201:**
```json
{
  "ok": true,
  "data": {
    "id": "USR-3B8K1-M",
    "email": "nuevo.usuario@acme.com",
    "first_name": "Carlos",
    "last_name": "Rodríguez",
    "role": {
      "name": "user",
      "description": "Usuario estándar con acceso limitado"
    },
    "primary_organization": {
      "id": "ORG-00123-X",
      "name": "ACME Corporation",
      "slug": "acme-corp"
    },
    "is_active": true,
    "created_at": "2025-10-22T19:35:00Z",
    "updated_at": "2025-10-22T19:35:00Z"
  }
}
```

**Nota:** La respuesta NO incluye `email_verified` ni `last_login_at` (campos internos no serializados).

**Validaciones:**
- Email debe ser único en toda la plataforma (no por organización)
- No puedes asignar un rol superior al tuyo (jerarquía de roles)
- La organización debe existir (si se proporciona `organization_id`)
- Password: mínimo 8 caracteres, máximo 255 (sin validación de caracteres especiales)
- Role debe ser un slug válido existente en la base de datos

**Ejemplo de uso:**
```javascript
const createUser = async (userData) => {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (response.status === 409) {
      throw new Error('El email ya está en uso');
    }
    if (response.status === 403) {
      throw new Error('No tienes permiso para asignar ese rol');
    }
    throw new Error(error.error.message);
  }
  
  const { data } = await response.json();
  return data;
};
```

---

### 4. PUT /api/v1/users/:id

Actualiza un usuario existente. Requiere permisos según scope.

**URL Parameters:**
- `id` (string, required) - Public code del usuario

**Request Body:**
```json
{
  "first_name": "Carlos Alberto",
  "last_name": "Rodríguez",
  "role": "org-manager",
  "organization_id": "ORG-00456-Y",
  "is_active": true
}
```

**Campos opcionales (todos):**
- `first_name` (string, 1-100 caracteres)
- `last_name` (string, 1-100 caracteres)
- `role` (string) - Slug del rol. No puedes asignar rol superior al tuyo (jerarquía de roles)
- `organization_id` (string) - Public code de la organización (formato: ORG-XXXXX-X)
- `is_active` (boolean) - Activar/desactivar usuario

**⚠️ NO se puede cambiar:**
- Email (inmutable - requiere endpoint dedicado)
- Password (usar PATCH /users/me/password)

**⚠️ Campos NO disponibles aún (próxima iteración):**
- `phone`, `language`, `timezone`, `avatar_url` - Planificados para implementación futura

**Response 200:**
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

**Nota:** La respuesta NO incluye `email_verified`, `last_login_at`, `phone`, `language`, `timezone`, `avatar_url` (campos no disponibles aún).

**Ejemplo de uso:**
```javascript
const updateUser = async (userPublicCode, updates) => {
  const response = await fetch(`/api/v1/users/${userPublicCode}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (response.status === 403) {
      throw new Error('No tienes permiso para editar este usuario');
    }
    if (response.status === 404) {
      throw new Error('Usuario no encontrado');
    }
    throw new Error(error.error.message);
  }
  
  const { data } = await response.json();
  return data;
};
```

---

### 5. DELETE /api/v1/users/:id

Elimina un usuario (soft delete). Requiere permisos según scope.

**URL Parameters:**
- `id` (string, required) - Public code del usuario

**⚠️ Restricciones:**
- No puedes eliminarte a ti mismo
- system-admin puede eliminar cualquier usuario
- org-admin puede eliminar usuarios de su org + descendientes
- org-manager NO puede eliminar usuarios

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "message": "Usuario eliminado correctamente",
    "deleted_user_id": "USR-3B8K1-M"
  },
  "meta": {
    "timestamp": "2025-10-22T19:45:00Z",
    "locale": "es"
  }
}
```

**Ejemplo de uso:**
```javascript
const deleteUser = async (userPublicCode) => {
  if (!confirm('¿Estás seguro de eliminar este usuario?')) {
    return;
  }
  
  const response = await fetch(`/api/v1/users/${userPublicCode}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (response.status === 403) {
      throw new Error('No tienes permiso para eliminar este usuario');
    }
    if (response.status === 400) {
      throw new Error('No puedes eliminarte a ti mismo');
    }
    throw new Error(error.error.message);
  }
  
  return await response.json();
};
```

---

## 👤 Endpoints de Perfil

### 6. GET /api/v1/users/me

Obtiene el perfil del usuario autenticado actual.

**⚠️ IMPORTANTE:** Este endpoint debe estar ANTES de `GET /users/:id` en las rutas para evitar que Express interprete "me" como un ID.

**Response:**
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
      "description": "Administrador de organización con acceso a todas las funcionalidades"
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

**Nota:** La respuesta NO incluye `email_verified`, `last_login_at`, `phone`, `language`, `timezone`, `avatar_url` (campos no disponibles aún).

**Ejemplo de uso:**
```javascript
const getMyProfile = async () => {
  const response = await fetch('/api/v1/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const { data } = await response.json();
  return data;
};
```

---

### 7. PUT /api/v1/users/me

Actualiza el perfil del usuario autenticado.

**Request Body:**
```json
{
  "first_name": "Juan Carlos",
  "last_name": "Pérez"
}
```

**Campos opcionales (todos):**
- `first_name` (string, 1-100 caracteres)
- `last_name` (string, 1-100 caracteres)

**⚠️ NO se puede cambiar desde este endpoint:**
- Email (inmutable - requiere verificación)
- Password (usar PATCH /users/me/password)
- Rol (solo administradores pueden cambiar roles)
- Organización (requiere aprobación de administrador)
- Estado activo (solo administradores)

**⚠️ Campos NO disponibles aún (próxima iteración):**
- `phone`, `language`, `timezone`, `avatar_url` - Planificados para implementación futura

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "id": "USR-9A2F7-K",
    "email": "juan.perez@acme.com",
    "first_name": "Juan Carlos",
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
    "updated_at": "2025-10-22T19:50:00Z"
  }
}
```

**Nota:** La respuesta NO incluye `email_verified`, `last_login_at`, `phone`, `language`, `timezone`, `avatar_url` (campos no disponibles aún).

**Ejemplo de uso:**
```javascript
const updateMyProfile = async (updates) => {
  const response = await fetch('/api/v1/users/me', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  const { data } = await response.json();
  return data;
};
```

---

### 8. PATCH /api/v1/users/me/password

Cambia la contraseña del usuario autenticado.

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePass456!"
}
```

**Campos requeridos:**
- `current_password` (string) - Contraseña actual para verificación
- `new_password` (string, min 8 caracteres) - Nueva contraseña

**Validaciones:**
- current_password debe ser correcto
- new_password debe ser diferente de current_password
- new_password debe tener al menos 8 caracteres

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "message": "Contraseña actualizada correctamente"
  },
  "meta": {
    "timestamp": "2025-10-22T19:55:00Z",
    "locale": "es"
  }
}
```

**Ejemplo de uso:**
```javascript
const changeMyPassword = async (currentPassword, newPassword) => {
  const response = await fetch('/api/v1/users/me/password', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (response.status === 401) {
      throw new Error('Contraseña actual incorrecta');
    }
    if (response.status === 400) {
      throw new Error('La nueva contraseña debe ser diferente de la actual');
    }
    throw new Error(error.error.message);
  }
  
  return await response.json();
};
```

---

## 🔗 Endpoints de Información Relacionada

### 9. GET /api/v1/users/:id/organizations

Obtiene todas las organizaciones a las que pertenece un usuario.

**URL Parameters:**
- `id` (string, required) - Public code del usuario

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "organization_id": "ORG-00123-X",
      "slug": "acme-corp",
      "name": "ACME Corporation",
      "logo_url": "https://storage.azure.com/logos/acme.png",
      "is_primary": true,
      "joined_at": "2025-01-15T10:30:00Z"
    },
    {
      "organization_id": "ORG-00456-Y",
      "slug": "acme-subsidiary",
      "name": "ACME Subsidiary",
      "logo_url": null,
      "is_primary": false,
      "joined_at": "2025-03-20T14:15:00Z"
    }
  ],
  "meta": {
    "total": 2,
    "timestamp": "2025-10-22T20:00:00Z",
    "locale": "es"
  }
}
```

**Ejemplo de uso:**
```javascript
const getUserOrganizations = async (userPublicCode) => {
  const response = await fetch(`/api/v1/users/${userPublicCode}/organizations`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Error al obtener organizaciones del usuario');
  }
  
  const { data } = await response.json();
  return data;
};
```

---

### 10. GET /api/v1/users/:id/audit-logs

Obtiene el historial de auditoría de un usuario (acciones realizadas por él).

**URL Parameters:**
- `id` (string, required) - Public code del usuario

**Query Parameters:**
- `limit` (number, default: 20, max: 100) - Cantidad de resultados
- `offset` (number, default: 0) - Offset para paginación
- `entity_type` (string, opcional) - Filtrar por tipo de entidad (users, organizations, products, etc.)
- `action` (string, opcional) - Filtrar por acción (create, update, delete)

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "01999999-1111-7777-8888-999999999999",
      "entity_type": "users",
      "entity_id": "USR-7K3D2-P",
      "action": "create",
      "performed_by": "USR-9A2F7-K",
      "changes": {
        "email": {
          "old": null,
          "new": "maria.gonzalez@acme.com"
        },
        "role_name": {
          "old": null,
          "new": "user"
        }
      },
      "metadata": {
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0..."
      },
      "created_at": "2025-02-10T14:20:00Z"
    },
    {
      "id": "01999999-2222-7777-8888-999999999999",
      "entity_type": "organizations",
      "entity_id": "ORG-00789-Z",
      "action": "update",
      "performed_by": "USR-9A2F7-K",
      "changes": {
        "name": {
          "old": "Old Name",
          "new": "New Organization Name"
        }
      },
      "metadata": {
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0..."
      },
      "created_at": "2025-03-05T10:15:00Z"
    }
  ],
  "meta": {
    "total": 147,
    "limit": 20,
    "offset": 0,
    "has_more": true,
    "timestamp": "2025-10-22T20:05:00Z",
    "locale": "es"
  }
}
```

**Ejemplo de uso:**
```javascript
const getUserAuditLogs = async (userPublicCode, page = 0, filters = {}) => {
  const limit = 20;
  const offset = page * limit;
  
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    ...(filters.entityType && { entity_type: filters.entityType }),
    ...(filters.action && { action: filters.action })
  });
  
  const response = await fetch(
    `/api/v1/users/${userPublicCode}/audit-logs?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  const { data, meta } = await response.json();
  return { auditLogs: data, meta };
};
```

---

### 11. PATCH /api/v1/users/:id/status

Activa o desactiva un usuario. Requiere permisos de admin.

**URL Parameters:**
- `id` (string, required) - Public code del usuario

**Request Body:**
```json
{
  "is_active": false
}
```

**Campos requeridos:**
- `is_active` (boolean) - true para activar, false para desactivar

**⚠️ Restricciones:**
- No puedes desactivarte a ti mismo
- Requiere rol org-admin o superior
- El usuario debe estar en tu scope organizacional

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "id": "USR-7K3D2-P",
    "email": "maria.gonzalez@acme.com",
    "first_name": "María",
    "last_name": "González",
    "is_active": false,
    "updated_at": "2025-10-22T20:10:00Z"
  },
  "meta": {
    "timestamp": "2025-10-22T20:10:00Z",
    "locale": "es"
  }
}
```

**Ejemplo de uso:**
```javascript
const toggleUserStatus = async (userPublicCode, isActive) => {
  const response = await fetch(`/api/v1/users/${userPublicCode}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ is_active: isActive })
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (response.status === 403) {
      throw new Error('No tienes permiso para cambiar el estado de este usuario');
    }
    if (response.status === 400) {
      throw new Error('No puedes desactivarte a ti mismo');
    }
    throw new Error(error.error.message);
  }
  
  const { data } = await response.json();
  return data;
};
```

---

## 🎭 Endpoint de Roles

### 12. GET /api/v1/roles

Obtiene la lista de roles disponibles para dropdowns y selects.

**⚠️ IMPORTANTE:** Este endpoint NO requiere autenticación para facilitar UX en formularios.

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "name": "system-admin",
      "description": "Administrador del sistema con acceso total a todas las organizaciones y funcionalidades"
    },
    {
      "name": "org-admin",
      "description": "Administrador de organización con acceso a todas las funcionalidades de su organización y descendientes"
    },
    {
      "name": "org-manager",
      "description": "Manager de organización con permisos elevados pero sin acceso a configuraciones críticas"
    },
    {
      "name": "user",
      "description": "Usuario estándar con acceso limitado a las funcionalidades de su organización"
    },
    {
      "name": "viewer",
      "description": "Visualizador con permisos de solo lectura"
    },
    {
      "name": "guest",
      "description": "Invitado con acceso temporal y limitado"
    },
    {
      "name": "demo",
      "description": "Usuario de demostración con acceso restringido"
    }
  ],
  "meta": {
    "total": 7,
    "timestamp": "2025-10-22T20:15:00Z",
    "locale": "es"
  }
}
```

**Ejemplo de uso (React Select):**
```javascript
const RoleSelect = () => {
  const [roles, setRoles] = useState([]);
  
  useEffect(() => {
    // No requiere token - endpoint público
    fetch('/api/v1/roles')
      .then(res => res.json())
      .then(({ data }) => setRoles(data));
  }, []);
  
  return (
    <select name="role_name">
      <option value="">Selecciona un rol</option>
      {roles.map(role => (
        <option key={role.name} value={role.name}>
          {role.name} - {role.description}
        </option>
      ))}
    </select>
  );
};
```

---

## ❌ Manejo de Errores

Todos los endpoints retornan errores con el siguiente formato:

```json
{
  "ok": false,
  "error": {
    "message": "Descripción del error",
    "code": "ERROR_CODE",
    "status": 400
  },
  "meta": {
    "timestamp": "2025-10-22T20:20:00Z",
    "locale": "es"
  }
}
```

### Códigos de Error Comunes

| HTTP Status | Código | Descripción |
|------------|--------|-------------|
| 400 | VALIDATION_ERROR | Datos de entrada inválidos |
| 400 | INVALID_PASSWORD | Contraseña actual incorrecta |
| 400 | SAME_PASSWORD | Nueva contraseña igual a la actual |
| 400 | CANNOT_DELETE_SELF | No puedes eliminarte a ti mismo |
| 400 | CANNOT_DEACTIVATE_SELF | No puedes desactivarte a ti mismo |
| 401 | UNAUTHORIZED | Token inválido o expirado |
| 403 | FORBIDDEN | Sin permisos para esta acción |
| 403 | ROLE_HIERARCHY_VIOLATION | No puedes asignar un rol superior al tuyo |
| 403 | ORGANIZATION_OUT_OF_SCOPE | Organización fuera de tu scope |
| 404 | NOT_FOUND | Usuario no encontrado |
| 409 | DUPLICATE_EMAIL | El email ya existe |
| 500 | INTERNAL_ERROR | Error interno del servidor |

### Ejemplo de Manejo de Errores (React)

```javascript
const handleUserAction = async (action) => {
  try {
    const result = await action();
    toast.success('Operación exitosa');
    return result;
  } catch (error) {
    // Parsear error de la API
    const apiError = await error.response?.json();
    
    switch (apiError?.error?.code) {
      case 'VALIDATION_ERROR':
        toast.error('Por favor verifica los datos ingresados');
        break;
      case 'DUPLICATE_EMAIL':
        toast.error('Este email ya está en uso');
        break;
      case 'ROLE_HIERARCHY_VIOLATION':
        toast.error('No puedes asignar un rol superior al tuyo');
        break;
      case 'FORBIDDEN':
        toast.error('No tienes permiso para realizar esta acción');
        break;
      case 'NOT_FOUND':
        toast.error('Usuario no encontrado');
        break;
      default:
        toast.error('Ocurrió un error inesperado');
    }
    
    throw error;
  }
};
```

---

## 📝 Notas Importantes

### Caching
- Los usuarios se cachean en Redis por 15 minutos
- La lista de usuarios se cachea por 5 minutos
- El cache se invalida automáticamente al crear/actualizar/eliminar usuarios

### Audit Logging
- **TODAS** las operaciones CUD (Create, Update, Delete) se registran en `audit_logs`
- Los logs incluyen: IP, user agent, cambios específicos (old/new values)
- Cambios de contraseña NO registran el hash por seguridad
- Usa `GET /users/:id/audit-logs` para ver historial de acciones de un usuario

### Scope Organizacional
- system-admin: Ve todos los usuarios de todas las organizaciones
- org-admin: Ve usuarios de su org + organizaciones descendientes
- org-manager: Ve usuarios de su org + hijos directos
- user/viewer/guest/demo: Solo ve usuarios de sus organizaciones directas

### Seguridad
- Contraseñas hasheadas con bcrypt (10 rounds)
- Emails normalizados (trim + toLowerCase) para evitar duplicados
- public_code con checksum Luhn para validación
- Tokens JWT para autenticación (ver NEXTJS_INTEGRATION.md)

---

## 🚀 Ejemplos de Flujos Completos

### Flujo de Creación de Usuario

```javascript
// 1. Obtener roles disponibles
const roles = await fetch('/api/v1/roles').then(r => r.json());

// 2. Obtener organizaciones del scope del admin
const orgs = await fetch('/api/v1/organizations?limit=100', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
}).then(r => r.json());

// 3. Crear usuario
const newUser = await fetch('/api/v1/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'nuevo@acme.com',
    password: 'SecurePass123!',
    first_name: 'Nuevo',
    last_name: 'Usuario',
    role_name: 'user',
    primary_organization_id: 'ORG-00123-X',
    language: 'es'
  })
}).then(r => r.json());

console.log('Usuario creado:', newUser.data.id);
```

### Flujo de Gestión de Perfil

```javascript
// 1. Obtener perfil actual
const profile = await fetch('/api/v1/users/me', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
}).then(r => r.json());

// 2. Actualizar datos del perfil
const updated = await fetch('/api/v1/users/me', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    first_name: 'Juan Carlos',
    phone: '+54 11 1234-5678',
    language: 'en'
  })
}).then(r => r.json());

// 3. Cambiar contraseña
await fetch('/api/v1/users/me/password', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    current_password: 'OldPass123!',
    new_password: 'NewSecurePass456!'
  })
});
```

### Flujo de Administración de Usuario

```javascript
// 1. Buscar usuario
const users = await fetch('/api/v1/users?search=maria&limit=10', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
}).then(r => r.json());

const userId = users.data[0].id; // USR-7K3D2-P

// 2. Ver detalles completos
const userDetails = await fetch(`/api/v1/users/${userId}`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
}).then(r => r.json());

// 3. Ver organizaciones del usuario
const userOrgs = await fetch(`/api/v1/users/${userId}/organizations`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
}).then(r => r.json());

// 4. Ver historial de acciones
const auditLogs = await fetch(`/api/v1/users/${userId}/audit-logs?limit=20`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
}).then(r => r.json());

// 5. Desactivar usuario
await fetch(`/api/v1/users/${userId}/status`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ is_active: false })
});
```

---

## 📞 Soporte

Para más información sobre autenticación y manejo de sesiones, ver:
- [NEXTJS_INTEGRATION.md](./NEXTJS_INTEGRATION.md) - Integración con Next.js
- [FRONTEND_MULTI_TENANT_GUIDE.md](./FRONTEND_MULTI_TENANT_GUIDE.md) - Multi-tenancy
- [ORGANIZATIONS_API_GUIDE.md](./ORGANIZATIONS_API_GUIDE.md) - API de Organizaciones
