# Flujo de API Keys (M2M)

Este documento explica cómo funcionan las API Keys para comunicación entre sistemas (Machine to Machine).

> **Términos técnicos:** Si encontrás palabras desconocidas, consultá el [Glosario](../glosario.md).

---

## Resumen Ejecutivo

Las **API Keys** permiten que sistemas externos se conecten a EC.DATA sin intervención humana. A diferencia de los tokens de sesión (login de usuario), las API Keys:

- Están ligadas a una **organización fija**
- Tienen **scopes limitados** (solo pueden hacer ciertas operaciones)
- No expiran automáticamente (pero pueden revocarse)
- Se identifican como "clientes" en lugar de "usuarios"

---

## 1. Diferencias: Session JWT vs API Key JWT

| Característica | Session JWT | API Key JWT |
|----------------|-------------|-------------|
| **Origen** | Login de usuario | Creación de API Key |
| **Identifica a** | Usuario humano | Sistema/Cliente |
| **Organización** | Dinámica (switch-org) | Fija |
| **Duración** | 15 min + refresh | Sin expiración |
| **Scopes** | Todos los del rol | Limitados al crear |
| **Revocación** | Logout | Eliminar API Key |

### Diagrama Comparativo

```mermaid
flowchart LR
    subgraph Session JWT
        U[👤 Usuario] -->|Login| S[Session Token]
        S -->|15 min| EXP[Expira]
        S -->|Refresh| S
        S -->|Switch-org| S2[Nueva org activa]
    end
    
    subgraph API Key JWT
        AK[🔑 API Key] -->|Una vez| JWT[JWT fijo]
        JWT -->|Siempre válido| API[API]
        JWT -.->|Revocación manual| REV[❌ Invalidado]
    end
```

---

## 2. Estructura de API Key

### Campos Principales

| Campo | Descripción |
|-------|-------------|
| `id` | Public code (ej: APIKey-xxx) |
| `client_id` | Identificador del cliente (único) |
| `name` | Nombre descriptivo |
| `organization_id` | Organización fija |
| `scopes` | Permisos permitidos |
| `last_used_at` | Última vez que se usó |
| `created_by` | Usuario que la creó |
| `is_active` | Si está activa |

### Scopes Disponibles

| Scope | Descripción |
|-------|-------------|
| `channels:read` | Leer canales |
| `channels:write` | Crear/editar canales |
| `sites:read` | Leer sitios |
| `sites:write` | Crear/editar sitios |
| `telemetry:read` | Consultar telemetría |
| `telemetry:write` | Enviar datos de telemetría |
| `hierarchy:read` | Leer jerarquía de recursos |
| `hierarchy:write` | Modificar jerarquía |
| `variables:read` | Leer variables |
| `variables:write` | Modificar variables |

---

## 3. Crear API Key

### Diagrama de Flujo

```mermaid
flowchart TD
    A[POST /api-keys] --> B{¿Usuario es admin?}
    B -->|No| C[❌ 403: Sin permisos]
    B -->|Sí| D{Validar scopes}
    D -->|Inválidos| E[❌ 400: Scopes inválidos]
    D -->|OK| F[Generar client_id único]
    F --> G[Generar secret aleatorio]
    G --> H[Hashear secret con SHA-256]
    H --> I[Guardar en BD]
    I --> J[Generar JWT permanente]
    J --> K[✅ Retornar API Key + Secret]
```

### Endpoint

```
POST /api/v1/api-keys
```

**Request:**
```json
{
  "name": "Sistema de Facturación",
  "organization_id": "ORG-xxx",
  "scopes": ["channels:read", "telemetry:read"]
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "id": "APIKEY-yyy",
    "client_id": "cli_a1b2c3d4e5f6",
    "name": "Sistema de Facturación",
    "organization_id": "ORG-xxx",
    "scopes": ["channels:read", "telemetry:read"],
    "secret": "sk_live_AbCdEfGhIjKlMnOpQrStUvWxYz123456",
    "jwt": "eyJhbGciOiJIUzI1NiIs...",
    "created_at": "2025-01-05T10:30:00Z"
  },
  "warning": "Guardá el secret de forma segura. No se podrá recuperar después de cerrar esta ventana."
}
```

> ⚠️ **Importante:** El `secret` solo se muestra una vez al crear la API Key. Guardalo de forma segura.

---

## 4. Usar API Key

### Opción 1: Bearer Token (Recomendado)

Usar el JWT retornado al crear la API Key:

```http
GET /api/v1/channels
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Opción 2: Client Credentials

Enviar client_id y secret en cada petición:

```http
GET /api/v1/channels
X-Client-ID: cli_a1b2c3d4e5f6
X-Client-Secret: sk_live_AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

### Diagrama de Autenticación

```mermaid
flowchart TD
    A[Petición con API Key] --> B{¿Formato Bearer?}
    B -->|Sí| C[Validar JWT]
    B -->|No| D{¿Headers client_id/secret?}
    D -->|No| E[❌ 401: Sin credenciales]
    D -->|Sí| F[Buscar API Key por client_id]
    F --> G{¿Existe y activa?}
    G -->|No| H[❌ 401: API Key inválida]
    G -->|Sí| I[Verificar secret hash]
    I -->|No match| H
    I -->|Match| J[Inyectar contexto]
    C -->|Inválido| H
    C -->|Válido| J
    J --> K[Verificar scope]
    K -->|Insuficiente| L[❌ 403: Scope insuficiente]
    K -->|OK| M[✅ Procesar petición]
```

---

## 5. Verificación de Scopes

Cada endpoint verifica que la API Key tenga el scope necesario:

### Ejemplo de Verificación

```
Petición: POST /api/v1/channels
API Key scopes: ["channels:read"]

Resultado: ❌ 403 - Scope insuficiente
Necesita: channels:write
```

### Respuesta de Error

```json
{
  "ok": false,
  "error": {
    "code": "INSUFFICIENT_SCOPE",
    "message": "Esta API Key no tiene permisos para esta operación",
    "required_scope": "channels:write",
    "available_scopes": ["channels:read"]
  }
}
```

---

## 6. Gestión de API Keys

### Listar API Keys

```
GET /api/v1/api-keys
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "APIKEY-xxx",
      "client_id": "cli_a1b2c3d4e5f6",
      "name": "Sistema de Facturación",
      "organization_id": "ORG-xxx",
      "scopes": ["channels:read", "telemetry:read"],
      "last_used_at": "2025-01-05T14:22:33Z",
      "created_at": "2025-01-01T00:00:00Z",
      "is_active": true
    }
  ]
}
```

### Revocar API Key

```
DELETE /api/v1/api-keys/:id
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "message": "API Key revocada exitosamente"
  }
}
```

### Regenerar Secret

Si el secret se compromete, podés regenerarlo sin perder los scopes:

```
POST /api/v1/api-keys/:id/regenerate
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "APIKEY-xxx",
    "new_secret": "sk_live_NuEvO_SeCrEt_123456",
    "new_jwt": "eyJhbGciOiJIUzI1NiIs..."
  },
  "warning": "El secret anterior ya no es válido"
}
```

---

## 7. Contexto de API Key en Peticiones

Cuando una API Key se autentica, el middleware inyecta:

```javascript
req.user = {
    userId: null,                      // No hay usuario
    role: 'api_key',
    activeOrgId: 'uuid-fijo',          // Org de la API Key
    primaryOrgId: 'uuid-fijo',
    canAccessAllOrgs: false,           // Solo su org
    tokenType: 'api_key',
    scopes: ['channels:read', 'telemetry:read'],
    clientId: 'cli_a1b2c3d4e5f6'
};

req.organizationContext = {
    id: 'uuid-fijo',
    publicCode: 'ORG-xxx',
    source: 'api_key',
    tokenType: 'api_key',
    scopes: ['channels:read', 'telemetry:read'],
    clientId: 'cli_a1b2c3d4e5f6',
    enforced: true,
    canAccessAll: false
};
```

---

## 8. Mejores Prácticas de Seguridad

### ✅ Hacer

| Práctica | Razón |
|----------|-------|
| Usar scopes mínimos necesarios | Principio de menor privilegio |
| Rotar secrets periódicamente | Reducir ventana de exposición |
| Monitorear `last_used_at` | Detectar API Keys sin uso |
| Revocar API Keys no usadas | Reducir superficie de ataque |
| Usar HTTPS siempre | Proteger secrets en tránsito |

### ❌ Evitar

| Práctica | Riesgo |
|----------|--------|
| Hardcodear secrets en código | Exposición en repos |
| Compartir API Keys entre sistemas | Difícil revocar sin afectar otros |
| Dar scopes excesivos "por si acaso" | Ampliar superficie de ataque |
| Ignorar API Keys inactivas | Posible uso malicioso |

---

## 9. Auditoría

Todas las acciones de API Keys se registran en el audit log:

```json
{
  "entity_type": "api_key",
  "entity_id": "APIKEY-xxx",
  "action": "create",
  "performed_by": "USR-admin",
  "changes": {
    "scopes": ["channels:read", "telemetry:read"]
  },
  "metadata": {
    "client_id": "cli_a1b2c3d4e5f6",
    "ip_address": "192.168.1.100"
  }
}
```

---

## 10. Flujo Completo de Integración

```mermaid
sequenceDiagram
    participant Admin as 👤 Admin
    participant FE as Frontend
    participant API as EC.DATA API
    participant EXT as 🔌 Sistema Externo
    participant DB as Base de Datos
    
    Note over Admin,DB: Creación de API Key
    Admin->>FE: Crear API Key
    FE->>API: POST /api-keys
    API->>DB: Guardar API Key (hash)
    API-->>FE: client_id + secret + JWT
    FE-->>Admin: Mostrar credenciales
    Admin->>EXT: Configurar credenciales
    
    Note over Admin,DB: Uso de API Key
    loop Cada petición
        EXT->>API: GET /channels (Bearer token)
        API->>API: Validar JWT
        API->>API: Verificar scope
        API->>DB: Consultar datos
        API->>DB: Actualizar last_used_at
        API-->>EXT: Datos
    end
    
    Note over Admin,DB: Revocación
    Admin->>FE: Revocar API Key
    FE->>API: DELETE /api-keys/:id
    API->>DB: Marcar inactiva
    API-->>FE: OK
    
    EXT->>API: GET /channels
    API-->>EXT: ❌ 401 Unauthorized
```

---

## 11. Códigos de Error

| Código | Error Code | Cuándo ocurre |
|--------|------------|---------------|
| 400 | `VALIDATION_ERROR` | Datos inválidos |
| 400 | `INVALID_SCOPES` | Scopes no reconocidos |
| 401 | `INVALID_API_KEY` | API Key no existe o inactiva |
| 401 | `INVALID_SECRET` | Secret incorrecto |
| 403 | `INSUFFICIENT_SCOPE` | Scope insuficiente para operación |
| 404 | `API_KEY_NOT_FOUND` | API Key no encontrada |
| 409 | `NAME_ALREADY_EXISTS` | Ya existe API Key con ese nombre |

---

## Referencias

- [Glosario de términos](../glosario.md)
- [Autenticación de usuarios](./01-autenticacion.md)
- [Sistema de organizaciones](./04-organizaciones.md)
