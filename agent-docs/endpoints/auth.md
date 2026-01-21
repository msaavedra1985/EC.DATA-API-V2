# Auth Endpoints

> **Última actualización**: 2026-01-21
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de autenticación.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Registrar usuario | No |
| POST | `/api/v1/auth/login` | Iniciar sesión | No |
| POST | `/api/v1/auth/refresh` | Renovar access token | No (usa refresh_token) |
| POST | `/api/v1/auth/logout` | Cerrar sesión | Sí |
| POST | `/api/v1/auth/logout-all` | Cerrar todas las sesiones | Sí |
| GET | `/api/v1/auth/me` | Perfil completo (reconstruye cache) | Sí |
| GET | `/api/v1/auth/session-context` | Contexto desde Redis (rápido) | Sí |
| GET | `/api/v1/auth/organizations` | Organizaciones del usuario | Sí |
| POST | `/api/v1/auth/switch-org` | Cambiar organización activa | Sí |
| POST | `/api/v1/auth/impersonate-org` | Impersonar organización | Sí (system-admin) |
| POST | `/api/v1/auth/stop-impersonation` | Detener impersonación | Sí |

---

## POST /api/v1/auth/register

**Propósito**: Registrar un nuevo usuario en el sistema

**Autenticación**: No requerida

**Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "Juan",
  "last_name": "Pérez",
  "organization_id": "uuid (opcional)"
}
```

**Validaciones**:
- `email`: Formato email válido, único en sistema
- `password`: Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número
- `first_name`, `last_name`: Mínimo 2 caracteres

**Respuesta exitosa** (201):
```json
{
  "ok": true,
  "data": {
    "user": {
      "public_code": "USR-XXXXX-X",
      "email": "user@example.com",
      "first_name": "Juan",
      "last_name": "Pérez"
    },
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "expires_in": "15m",
    "token_type": "Bearer"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | VALIDATION_ERROR | Datos inválidos |
| 409 | EMAIL_EXISTS | Email ya registrado |

---

## POST /api/v1/auth/login

**Propósito**: Autenticar usuario y obtener tokens JWT

**Autenticación**: No requerida

**Rate Limit**: 5 intentos fallidos bloquean por 15 minutos

**Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "remember_me": false,
  "captcha_token": "cf-turnstile-token (opcional)"
}
```

**Campos**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| email | string | Sí | Email, username o public_code |
| password | string | Sí | Contraseña |
| remember_me | boolean | No | Si `true`: sesión 90 días. Si `false`: 14 días |
| captcha_token | string | Condicional | Requerido después de intentos fallidos |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "user": {
      "public_code": "USR-XXXXX-X",
      "email": "user@example.com",
      "first_name": "Juan",
      "role": "user"
    },
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "expires_in": "15m",
    "token_type": "Bearer"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | VALIDATION_ERROR | Datos inválidos |
| 401 | INVALID_CREDENTIALS | Email o contraseña incorrectos |
| 403 | ACCOUNT_LOCKED | Cuenta bloqueada por intentos fallidos |
| 403 | CAPTCHA_REQUIRED | Requiere validación captcha |

**Notas**:
- Guarda `session_context` en Redis con TTL alineado al refresh_token
- Registra IP y user-agent para auditoría

---

## POST /api/v1/auth/refresh

**Propósito**: Renovar access_token usando refresh_token

**Autenticación**: No requerida (usa refresh_token en body)

**Body**:
```json
{
  "refresh_token": "eyJhbG..."
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "expires_in": "15m",
    "token_type": "Bearer"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 401 | TOKEN_EXPIRED | Refresh token expirado |
| 401 | TOKEN_REVOKED | Token revocado (logout, password change) |
| 401 | TOKEN_REUSE_DETECTED | Posible robo de token (revoca familia) |

**Notas**:
- Implementa rotación de tokens (el refresh_token anterior se invalida)
- Regenera `session_context` en Redis con TTL correcto
- Preserva `remember_me` del token original

---

## POST /api/v1/auth/logout

**Propósito**: Cerrar sesión actual (revocar refresh_token)

**Autenticación**: Bearer JWT

**Body**:
```json
{
  "refresh_token": "eyJhbG..."
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Sesión cerrada exitosamente"
  }
}
```

**Notas**:
- Revoca solo el refresh_token proporcionado
- El session_context permanece hasta que expire

---

## POST /api/v1/auth/logout-all

**Propósito**: Cerrar todas las sesiones del usuario

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "message": "Todas las sesiones cerradas",
    "sessions_revoked": 3
  }
}
```

**Notas**:
- Incrementa `session_version` invalidando todos los access_tokens
- Revoca todos los refresh_tokens del usuario
- Elimina session_context de Redis

---

## GET /api/v1/auth/me

**Propósito**: Obtener perfil completo del usuario (reconstruye cache)

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "user": {
      "public_code": "USR-XXXXX-X",
      "email": "user@example.com",
      "first_name": "Juan",
      "last_name": "Pérez",
      "role": "user"
    },
    "session_context": {
      "active_org": {
        "public_code": "ORG-XXXXX-X",
        "name": "Mi Organización"
      },
      "primary_org": {
        "public_code": "ORG-XXXXX-X",
        "name": "Mi Organización"
      },
      "can_access_all_orgs": false
    }
  }
}
```

**Notas**:
- **Lento**: ~50-200ms (consulta DB + reconstruye cache)
- Usar solo como fallback cuando `/session-context` retorna 404
- Reconstruye session_context en Redis

---

## GET /api/v1/auth/session-context

**Propósito**: Obtener contexto de sesión desde Redis (rápido)

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "activeOrgId": "uuid",
    "primaryOrgId": "uuid",
    "canAccessAllOrgs": false,
    "role": "user",
    "email": "user@example.com",
    "firstName": "Juan",
    "lastName": "Pérez"
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 404 | SESSION_CONTEXT_NOT_FOUND | Cache expirado, usar `/auth/me` |

**Notas**:
- **Rápido**: ~5-15ms (solo Redis)
- Preferir para lecturas frecuentes
- Si 404 → fallback a `/auth/me`

---

## GET /api/v1/auth/organizations

**Propósito**: Listar organizaciones a las que pertenece el usuario

**Autenticación**: Bearer JWT

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "public_code": "ORG-XXXXX-X",
      "name": "Hotel Lima",
      "parent_public_code": null,
      "is_direct_member": true
    },
    {
      "public_code": "ORG-YYYYY-Y",
      "name": "Hotel Cusco",
      "parent_public_code": "ORG-XXXXX-X",
      "is_direct_member": false
    }
  ]
}
```

**Notas**:
- Incluye organizaciones directas e heredadas
- `is_direct_member`: true si el usuario está asignado directamente
- **NUNCA** expone UUIDs internos

---

## POST /api/v1/auth/switch-org

**Propósito**: Cambiar la organización activa del usuario

**Autenticación**: Bearer JWT

**Body**:
```json
{
  "organization_public_code": "ORG-XXXXX-X"
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbG...",
    "active_org": {
      "public_code": "ORG-XXXXX-X",
      "name": "Hotel Lima"
    }
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 403 | ACCESS_DENIED | Usuario no pertenece a esa organización |
| 404 | ORG_NOT_FOUND | Organización no existe |

**Notas**:
- Genera nuevo access_token con `activeOrgId` actualizado
- Actualiza session_context en Redis

---

## POST /api/v1/auth/impersonate-org

**Propósito**: System-admin opera "como" otra organización

**Autenticación**: Bearer JWT (requiere rol `system-admin`)

**Body**:
```json
{
  "organization_public_code": "ORG-XXXXX-X"
}
```

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbG...",
    "impersonating": {
      "public_code": "ORG-XXXXX-X",
      "name": "Hotel Lima"
    }
  }
}
```

**Errores**:
| Status | Código | Descripción |
|--------|--------|-------------|
| 403 | FORBIDDEN | No es system-admin |
| 404 | ORG_NOT_FOUND | Organización no existe |

**Notas**:
- Solo disponible para `system-admin`
- JWT incluye `isImpersonating: true` y `originalUserId`
- **Audit log obligatorio** para todas las acciones durante impersonación

---

## POST /api/v1/auth/stop-impersonation

**Propósito**: Detener impersonación y volver a God View

**Autenticación**: Bearer JWT (durante impersonación)

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbG...",
    "message": "Impersonación terminada"
  }
}
```

**Notas**:
- Vuelve al estado de God View (`activeOrgId: null`, `canAccessAllOrgs: true`)
