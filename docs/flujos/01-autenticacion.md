# Flujo de Autenticación

Este documento explica cómo funciona el sistema de login, tokens y seguridad de EC.DATA API.

> **Términos técnicos:** Si encontrás palabras desconocidas, consultá el [Glosario](../glosario.md).

---

## Resumen Ejecutivo

El sistema usa **tokens JWT** (→ Glosario) para autenticar usuarios. Después del login, recibís dos tokens:
- **Access Token**: Dura 15 minutos, se usa en cada petición
- **Refresh Token**: Dura 7 días, se usa para obtener nuevos access tokens

---

## 1. Proceso de Login

### Diagrama de Flujo

```mermaid
flowchart TD
    A[Usuario ingresa credenciales] --> B{Validar Turnstile}
    B -->|Token inválido| C[❌ Error 403: Captcha inválido]
    B -->|OK| D{Verificar Rate Limit}
    D -->|Límite excedido| E[❌ Error 429: Demasiados intentos]
    D -->|OK| F{Buscar usuario}
    F -->|No existe| G[❌ Error 401: Credenciales inválidas]
    F -->|Existe| H{Verificar contraseña}
    H -->|Incorrecta| I[Registrar intento fallido]
    I --> J{¿5 intentos fallidos?}
    J -->|Sí| K[Bloquear cuenta 15 min]
    J -->|No| G
    H -->|Correcta| L[Limpiar intentos fallidos]
    L --> M[Generar Access Token]
    M --> N[Generar Refresh Token]
    N --> O[Guardar Refresh Token en BD]
    O --> P[✅ Retornar ambos tokens]
```

### Paso a Paso

1. **Usuario envía credenciales**
   - Puede usar: email, username, o public_code
   - Incluye: contraseña y token de Turnstile

2. **Validación de Turnstile** (→ Glosario)
   - Verifica que el usuario es humano
   - Si falla: Error 403

3. **Rate Limiting Dual** (→ Glosario)
   - **Límite por IP**: 30 intentos / 15 minutos
   - **Límite por cuenta**: 5 intentos fallidos / 15 minutos
   - Protege contra ataques de fuerza bruta

4. **Búsqueda de usuario**
   - Acepta email, username o public_code
   - Búsqueda case-insensitive

5. **Verificación de contraseña**
   - Usa bcrypt con salt
   - Tiempo constante para evitar timing attacks

6. **Generación de tokens**
   - Access Token: JWT firmado, 15 min de vida
   - Refresh Token: Token aleatorio, 7 días de vida

### Endpoint

```
POST /api/v1/auth/login
```

**Request:**
```json
{
  "identifier": "usuario@email.com",
  "password": "MiContraseña123",
  "turnstileToken": "0.abc123..."
}
```

**Response exitosa (200):**
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "7f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "expiresIn": 900,
    "user": {
      "id": "USR-xxx",
      "email": "usuario@email.com",
      "name": "Juan Pérez",
      "role": "operator"
    }
  }
}
```

### Códigos de Error

| Código | Error Code | Significado |
|--------|------------|-------------|
| 400 | VALIDATION_ERROR | Faltan campos requeridos |
| 401 | INVALID_CREDENTIALS | Usuario o contraseña incorrectos |
| 403 | INVALID_CAPTCHA | Token de Turnstile inválido |
| 403 | ACCOUNT_LOCKED | Cuenta bloqueada por intentos fallidos |
| 429 | RATE_LIMIT_EXCEEDED | Demasiados intentos de login |

---

## 2. Uso del Access Token

Una vez autenticado, incluí el access token en cada petición:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Diagrama de Validación

```mermaid
flowchart TD
    A[Petición con Bearer Token] --> B{¿Token presente?}
    B -->|No| C[❌ 401: Token requerido]
    B -->|Sí| D{¿Formato válido?}
    D -->|No| E[❌ 401: Token malformado]
    D -->|Sí| F{¿Firma válida?}
    F -->|No| G[❌ 401: Token inválido]
    F -->|Sí| H{¿Expirado?}
    H -->|Sí| I[❌ 401: Token expirado]
    H -->|No| J[✅ Continuar con la petición]
```

### Contenido del Access Token

El token contiene (codificado):
- `userId`: ID interno del usuario
- `role`: Rol global del usuario
- `activeOrgId`: Organización activa
- `primaryOrgId`: Organización principal
- `canAccessAllOrgs`: Si puede ver todas las orgs
- `exp`: Timestamp de expiración

---

## 3. Renovación de Tokens (Refresh)

Cuando el access token expira, usá el refresh token para obtener uno nuevo sin volver a hacer login.

### Diagrama de Flujo

```mermaid
flowchart TD
    A[Enviar Refresh Token] --> B{¿Token existe en BD?}
    B -->|No| C[❌ 401: Sesión inválida]
    B -->|Sí| D{¿Token expirado?}
    D -->|Sí| E[Eliminar token de BD]
    E --> C
    D -->|No| F{¿Token ya usado?}
    F -->|Sí| G[⚠️ Posible robo detectado]
    G --> H[Invalidar TODA la familia de tokens]
    H --> C
    F -->|No| I[Generar nuevo Access Token]
    I --> J[Generar nuevo Refresh Token]
    J --> K[Marcar token anterior como usado]
    K --> L[✅ Retornar nuevos tokens]
```

### Seguridad: Rotación de Tokens

El sistema implementa **rotación de refresh tokens**:
- Cada vez que usás un refresh token, se genera uno nuevo
- El anterior queda marcado como "usado"
- Si alguien intenta usar un token ya usado → se invalida toda la cadena (posible robo)

### Endpoint

```
POST /api/v1/auth/refresh
```

**Request:**
```json
{
  "refreshToken": "7f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "nuevo-refresh-token-uuid",
    "expiresIn": 900
  }
}
```

---

## 4. Logout

Cierra la sesión invalidando el refresh token.

### Endpoint

```
POST /api/v1/auth/logout
```

**Request:**
```json
{
  "refreshToken": "7f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "message": "Sesión cerrada correctamente"
  }
}
```

---

## 5. Cambio de Organización Activa

Un usuario puede pertenecer a múltiples organizaciones. Para cambiar la organización activa:

### Endpoint

```
POST /api/v1/auth/switch-organization
```

**Request:**
```json
{
  "organizationId": "ORG-xxx"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "accessToken": "nuevo-token-con-org-actualizada...",
    "refreshToken": "nuevo-refresh-token",
    "activeOrganization": {
      "id": "ORG-xxx",
      "name": "Sucursal Norte"
    }
  }
}
```

---

## 6. Seguridad Implementada

### Protecciones Activas

| Protección | Descripción |
|------------|-------------|
| **Bcrypt** | Contraseñas hasheadas con salt |
| **Rate Limiting** | 30 req/15min por IP, 5 intentos/cuenta |
| **Turnstile** | Verificación anti-bot invisible |
| **Token Rotation** | Refresh tokens de un solo uso |
| **Theft Detection** | Re-uso de token invalida toda la sesión |
| **Secure Headers** | Helmet.js para headers de seguridad |
| **CORS** | Orígenes permitidos configurados |

### Tokens en la Base de Datos

Los refresh tokens se guardan hasheados (SHA-256), nunca en texto plano.

---

## 7. Flujo Completo de Sesión

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant A as API
    participant DB as Base de Datos
    participant R as Redis

    U->>F: Ingresa credenciales
    F->>A: POST /auth/login
    A->>A: Validar Turnstile
    A->>R: Verificar rate limit
    A->>DB: Buscar usuario
    A->>A: Verificar password
    A->>DB: Guardar refresh token (hash)
    A->>R: Guardar sesión en cache
    A-->>F: Access + Refresh tokens
    F->>F: Guardar tokens
    
    Note over U,R: Usuario usa la app...
    
    F->>A: GET /channels (Bearer token)
    A->>A: Validar JWT
    A->>R: Obtener contexto de sesión
    A-->>F: Lista de canales
    
    Note over U,R: Access token expira (15 min)...
    
    F->>A: POST /auth/refresh
    A->>DB: Validar refresh token
    A->>DB: Rotar tokens
    A-->>F: Nuevos tokens
    
    Note over U,R: Usuario cierra sesión...
    
    F->>A: POST /auth/logout
    A->>DB: Invalidar refresh token
    A->>R: Limpiar sesión
    A-->>F: OK
```

---

## Referencias

- [Glosario de términos](../glosario.md)
- [API Keys para M2M](./05-api-keys.md)
- [Sistema de Organizaciones](./04-organizaciones.md)
