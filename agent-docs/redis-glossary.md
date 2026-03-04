# Glosario Redis — Plataforma ECData

> **REGLA OBLIGATORIA**: Cada vez que se agregue una nueva key a Redis, DEBE declararse en este glosario. Esta directiva aplica tanto a desarrolladores humanos como al agente de IA.

---

## Convenciones de naming

| Convención | Ejemplo |
|---|---|
| Prefijo global automático | `{ENV}:EC:` — aplicado por `addPrefix()` en `redis/client.js` |
| Entornos | `DEV:EC:` (development), `PROD:EC:` (production), `TEST:EC:` (test) |
| Separador de niveles | `:` |
| Módulo como segundo nivel | `ec:user:`, `ec:rh:`, `ec:tm:` |
| Versionado de estructura | `ec:v2:org:list:`, `ec:v1:dashboards:list:` |
| Hashes de filtros | MD5 parcial al final de la key |
| IDs públicos sobre UUIDs | Usar `publicCode` cuando sea posible |

> **IMPORTANTE**: Todas las funciones del cliente Redis (`getCache`, `setCache`, `deleteCache`, `incrWithTTL`, `scanAndDelete`) aplican automáticamente el prefijo `{ENV}:EC:`. Los módulos NO necesitan agregar este prefijo manualmente — solo definen su key lógica (ej: `ec:user:USR-123`).
> En Redis, la key real sería `DEV:EC:ec:user:USR-123` en desarrollo.
> **Export**: `REDIS_KEY_PREFIX` exportado desde `src/db/redis/client.js` para referencia.

---

## Auth

### `ec:auth:pub:{publicCode}`
- **TTL**: 900s (15 min)
- **Tipo**: String (UUID crudo)
- **Descripción**: Lookup publicCode → userId (UUID). Permite a `verifyToken` resolver el `sub` del JWT (que ahora es un publicCode) a UUID interno sin query a DB. Key auxiliar creada junto con `ec:user:{userId}` al cachear un usuario.
- **Archivo fuente**: `src/modules/auth/cache.js`
- **Ejemplo de key**: `ec:auth:pub:USR-MY4-JMY`
- **Ejemplo de valor**: `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`
- **Invalidación**: `deleteUserCache(userId)` — se borra junto con `ec:user:{userId}` al invalidar sesión.

### `ec:user:{userId}`
- **TTL**: 900s (15 min)
- **Tipo**: String (JSON serializado)
- **Descripción**: Cache de datos del usuario autenticado (por UUID interno). Usado en middleware de autenticación para evitar query a DB en cada request.
- **Archivo fuente**: `src/modules/auth/cache.js`
- **Ejemplo de valor**:
  ```json
  "{\"id\":\"a1b2c3d4-...\",\"email\":\"admin@example.com\",\"firstName\":\"Juan\",\"lastName\":\"García\",\"role\":\"org-admin\"}"
  ```
- **Invalidación**: `deleteUserCache(userId)` — al actualizar perfil, cambiar contraseña, o invalidar sesión. También elimina `ec:auth:pub:{publicCode}` del mismo usuario.

### `ec:session_version:{userId}`
- **TTL**: Sin TTL (persistente)
- **Tipo**: String (entero)
- **Descripción**: Versión de sesión del usuario. Se incrementa al invalidar sesión (logout, cambio de contraseña, revocación). El middleware compara este valor con el del JWT para detectar tokens revocados.
- **Archivo fuente**: `src/modules/auth/cache.js`
- **Ejemplo de valor**: `"3"`
- **Invalidación**: Se incrementa con `incrementSessionVersion(userId)`.

### `ec:role:{roleName}`
- **TTL**: 1800s (30 min)
- **Tipo**: String (JSON)
- **Descripción**: Cache de rol por nombre. Evita query a DB para verificaciones RBAC frecuentes.
- **Archivo fuente**: `src/modules/auth/rolesCache.js`
- **Ejemplo de valor**:
  ```json
  {"id":1,"name":"system-admin","description":"Administrador del sistema","isActive":true}
  ```
- **Invalidación**: `invalidateRole(roleName)` o `invalidateAllRoles()` (pattern `ec:role:*`).

### `ec:session_context:{userId}`
- **TTL**: 1209600s (14 días) normal / 7776000s (90 días) con remember_me
- **Tipo**: String (JSON serializado)
- **Descripción**: Contexto de sesión completo que el frontend necesita sin decodificar JWT. Incluye organización activa, primaria, rol, nombre, email. **Para system-admin, es la FUENTE DE VERDAD del `activeOrgId`** (el JWT puede ser stale por race conditions del frontend).
- **Archivo fuente**: `src/modules/auth/sessionContextCache.js`
- **Ejemplo de valor**:
  ```json
  "{\"activeOrgId\":\"uuid-123\",\"activeOrgPublicCode\":\"ORG-ABC\",\"activeOrgName\":\"Mi Empresa\",\"primaryOrgId\":\"uuid-123\",\"canAccessAllOrgs\":false,\"role\":\"org-admin\",\"email\":\"admin@example.com\",\"firstName\":\"Juan\",\"lastName\":\"García\",\"userPublicCode\":\"USR-12345-A\"}"
  ```
- **Escrituras**: Login (`services.js`), refresh (`services.js` — preserva Redis si JWT tiene null), switch-org, impersonate-org, exit-impersonation.
- **Lecturas**: Middleware `enforceActiveOrganization` (fuente primaria para system-admin), GET /me, GET /session-context, impersonate-org (merge).
- **Invalidación**: `deleteSessionContext(userId)` — al logout, logout-all, cambio de contraseña. `updateActiveOrg()` actualiza solo `activeOrgId`.
- **Regla GET /me**: Si cache expiró y el usuario es system-admin con JWT sin `activeOrgId`, la reconstrucción NO se cachea (evita sobreescribir con datos stale).

---

## Organizations

### `org:{publicCode}`
- **TTL**: 1800s (30 min)
- **Tipo**: String (JSON)
- **Descripción**: Cache de organización individual por public_code.
- **Archivo fuente**: `src/modules/organizations/cache.js`
- **Ejemplo de valor**:
  ```json
  {"id":"uuid-org","public_code":"ORG-ABC","name":"Mi Empresa","slug":"mi-empresa","logoUrl":null,"isActive":true,"parentId":null}
  ```
- **Invalidación**: `invalidateOrganizationCache(publicCode)` — al crear, actualizar o eliminar la organización.

### `org:hierarchy:{publicCode}`
- **TTL**: 1800s (30 min)
- **Tipo**: String (JSON)
- **Descripción**: Jerarquía de una organización (hijos directos y descendientes).
- **Archivo fuente**: `src/modules/organizations/cache.js`
- **Ejemplo de valor**:
  ```json
  {"children":["ORG-CHILD1","ORG-CHILD2"],"descendants":["ORG-CHILD1","ORG-CHILD2","ORG-GRANDCHILD1"]}
  ```
- **Invalidación**: `invalidateOrganizationCache(publicCode, parentPublicCode)` o `invalidateOrganizationHierarchyBulk(publicCodes)`.

### `org:access:{userId}:{publicCode}`
- **TTL**: 900s (15 min)
- **Tipo**: String (JSON)
- **Descripción**: Permisos de un usuario sobre una organización (canView, canEdit, canDelete).
- **Archivo fuente**: `src/modules/organizations/cache.js`
- **Ejemplo de valor**:
  ```json
  {"canView":true,"canEdit":true,"canDelete":false}
  ```
- **Invalidación**: Expira por TTL (15 min). `invalidateUserOrgPermissions(userId)` marca para limpieza.

### `ec:v2:org:list:{limit}:{offset}:{filtersHash}`
- **TTL**: 300s (5 min)
- **Tipo**: String (JSON)
- **Descripción**: Lista paginada de organizaciones. Estructura v2 con `items[]`.
- **Archivo fuente**: `src/modules/organizations/cache.js`
- **Ejemplo de key**: `ec:v2:org:list:20:0:a1b2c3d4e5f6`
- **Ejemplo de valor**:
  ```json
  {"items":[{"publicCode":"ORG-ABC","name":"Mi Empresa"}],"total":1,"page":1,"limit":20}
  ```
- **Invalidación**: `invalidateAllOrganizationLists()` (pattern `ec:v2:org:list:*`) — al crear, actualizar o eliminar cualquier organización.

### `ec:org_resolve:{idOrCode}`
- **TTL**: 300s (5 min)
- **Tipo**: String (JSON serializado)
- **Descripción**: Cache bidireccional de resolución de organización (UUID ↔ public_code). Evita query a DB en cada request del middleware `enforceActiveOrganization`.
- **Archivo fuente**: `src/middleware/enforceActiveOrganization.js`
- **Ejemplo de key**: `ec:org_resolve:ORG-ABC` o `ec:org_resolve:uuid-org-123`
- **Ejemplo de valor**:
  ```json
  "{\"uuid\":\"uuid-org-123\",\"publicCode\":\"ORG-ABC\",\"isActive\":true,\"isDeleted\":false}"
  ```
- **Invalidación**: `invalidateOrgResolveCache(orgUuid, orgPublicCode)` — al modificar `is_active`, `deleted_at`, o `public_code`.

### `ec:org_scope:{userId}`
- **TTL**: 900s (15 min)
- **Tipo**: String (JSON)
- **Descripción**: Scope organizacional calculado del usuario. Contiene todas las organizaciones a las que puede acceder según su rol y membresías.
- **Archivo fuente**: `src/modules/organizations/services.js`
- **Ejemplo de valor**:
  ```json
  {"canAccessAll":false,"organizationIds":["uuid-1","uuid-2"],"userOrganizations":[{"organizationId":"uuid-1","slug":"mi-empresa","isPrimary":true}]}
  ```
- **Invalidación**: `invalidateUserOrgScope(userId)` — al cambiar membresías, rol, o switchear organización primaria.

### `ec:org_tree:{orgId}`
- **TTL**: 1800s (30 min)
- **Tipo**: String (JSON serializado)
- **Descripción**: Lista de IDs descendientes de una organización. Usado para calcular scope organizacional.
- **Archivo fuente**: `src/modules/organizations/services.js`
- **Ejemplo de valor**:
  ```json
  "[\"uuid-child-1\",\"uuid-child-2\",\"uuid-grandchild-1\"]"
  ```
- **Invalidación**: `invalidateOrgDescendants(organizationId)` — al mover, crear o eliminar organizaciones hijas.

---

## Resource Hierarchy

### `ec:rh:node:{publicCode}`
- **TTL**: 600s (10 min)
- **Tipo**: String (JSON)
- **Descripción**: Nodo individual del árbol de recursos por public_code.
- **Archivo fuente**: `src/modules/resource-hierarchy/cache.js`
- **Ejemplo de valor**:
  ```json
  {"publicCode":"RH-SITE-001","nodeType":"site","name":"Planta Norte","parentPublicCode":"RH-ORG-001","depth":1}
  ```
- **Invalidación**: `invalidateNode(publicCode)` o `invalidateNodeAndRelated(publicCode, orgId, parentPublicCode)`.

### `ec:rh:tree:{orgId}:{optionsHash}`
- **TTL**: 300s (5 min)
- **Tipo**: String (JSON)
- **Descripción**: Árbol completo o parcial de una organización.
- **Archivo fuente**: `src/modules/resource-hierarchy/cache.js`
- **Ejemplo de key**: `ec:rh:tree:uuid-org:a1b2c3d4`
- **Invalidación**: `invalidateOrganizationHierarchy(organizationId)` (pattern `ec:rh:tree:{orgId}:*`).

### `ec:rh:children:{orgId}:{parentPublicCode|root}:{optionsHash}`
- **TTL**: 300s (5 min)
- **Tipo**: String (JSON)
- **Descripción**: Hijos de un nodo en el árbol de recursos. `root` para nodos raíz.
- **Archivo fuente**: `src/modules/resource-hierarchy/cache.js`
- **Ejemplo de key**: `ec:rh:children:uuid-org:RH-SITE-001:a1b2c3d4`
- **Invalidación**: `invalidateOrganizationHierarchy(organizationId)` (pattern `ec:rh:children:{orgId}:*`), `invalidateNodeAndRelated()`, `invalidateAfterMove()`.

### `ec:rh:list:{orgId}:{optionsHash}`
- **TTL**: 300s (5 min)
- **Tipo**: String (JSON)
- **Descripción**: Listado paginado de nodos de una organización.
- **Archivo fuente**: `src/modules/resource-hierarchy/cache.js`
- **Ejemplo de key**: `ec:rh:list:uuid-org:a1b2c3d4`
- **Invalidación**: `invalidateOrganizationHierarchy(organizationId)` (pattern `ec:rh:list:{orgId}:*`).

### `ec:rh:ancestors:{publicCode}`
- **TTL**: 600s (10 min)
- **Tipo**: String (JSON)
- **Descripción**: Lista de ancestros de un nodo (cambian poco).
- **Archivo fuente**: `src/modules/resource-hierarchy/cache.js`
- **Ejemplo de valor**:
  ```json
  [{"publicCode":"RH-ORG-001","nodeType":"organization","name":"Mi Empresa"},{"publicCode":"RH-SITE-001","nodeType":"site","name":"Planta Norte"}]
  ```
- **Invalidación**: `invalidateNodeAndRelated()`, `invalidateAfterMove()` — elimina `ec:rh:ancestors:{publicCode}`.

---

## Telemetry

### `ec:tm:resolve:{identifierKey}`
- **TTL**: 600s (10 min)
- **Tipo**: String (JSON)
- **Descripción**: Resolución de identificador de canal (public_code → channelId, etc.).
- **Archivo fuente**: `src/modules/telemetry/cache.js`
- **Ejemplo de key**: `ec:tm:resolve:publicCode:CHN-5Q775-2`
- **Invalidación**: `invalidateResolveCache(identifierKey)` o `invalidateAllResolveCache()` (pattern `ec:tm:resolve:*`).

### `ec:tm:meta:{channelId}:{lang}`
- **TTL**: 600s (10 min)
- **Tipo**: String (JSON)
- **Descripción**: Metadata completa del canal con traducciones.
- **Archivo fuente**: `src/modules/telemetry/cache.js`
- **Ejemplo de key**: `ec:tm:meta:uuid-channel:es`
- **Invalidación**: `invalidateChannelTelemetryCache(channelId)` (pattern `ec:tm:meta:{channelId}:*`).

### `ec:tm:vars:global:{lang}`
- **TTL**: 86400s (24 horas)
- **Tipo**: String (JSON)
- **Descripción**: Mapa de todas las variables con traducciones. Casi nunca cambian.
- **Archivo fuente**: `src/modules/telemetry/cache.js`
- **Ejemplo de key**: `ec:tm:vars:global:es`
- **Invalidación**: `invalidateGlobalVariablesCache()` (pattern `ec:tm:vars:global:*`).

### `ec:tm:mtypes:global:{lang}`
- **TTL**: 86400s (24 horas)
- **Tipo**: String (JSON)
- **Descripción**: Mapa de todos los measurement types con traducciones. Casi nunca cambian.
- **Archivo fuente**: `src/modules/telemetry/cache.js`
- **Ejemplo de key**: `ec:tm:mtypes:global:es`
- **Invalidación**: `invalidateGlobalMeasurementTypesCache()` (pattern `ec:tm:mtypes:global:*`).

### `ec:tm:latest:{channelId}`
- **TTL**: 30s
- **Tipo**: String (JSON)
- **Descripción**: Último dato de telemetría de un canal (polling frecuente).
- **Archivo fuente**: `src/modules/telemetry/cache.js`
- **Invalidación**: `invalidateChannelTelemetryCache(channelId)`.

### `ec:tm:data:{channelId}:{from}:{to}:{resolution}`
- **TTL**: 3600s (1 hora) para daily / 86400s (24 horas) para monthly
- **Tipo**: String (JSON)
- **Descripción**: Datos históricos agregados por canal.
- **Archivo fuente**: `src/modules/telemetry/cache.js`
- **Ejemplo de key**: `ec:tm:data:uuid-ch:2026-01-01:2026-01-31:daily`
- **Invalidación**: `invalidateChannelTelemetryCache(channelId)` (pattern `ec:tm:data:{channelId}:*`).

---

## Locations

### `states:{countryCode}:{lang}`
- **TTL**: 3600s (1 hora)
- **Tipo**: String (JSON)
- **Descripción**: Lista de estados/provincias de un país con traducciones.
- **Archivo fuente**: `src/modules/locations/services.js`
- **Ejemplo de key**: `states:MX:es`
- **Ejemplo de valor**:
  ```json
  [{"name":"Aguascalientes","code":"MX-AGU","latitude":21.88,"longitude":-102.29}]
  ```
- **Invalidación**: `invalidateStatesCache(countryCode)` — elimina `states:{countryCode}:es` y `states:{countryCode}:en`.

### `cities:{stateCode}:{lang}`
- **TTL**: 3600s (1 hora)
- **Tipo**: String (JSON)
- **Descripción**: Lista de ciudades de un estado (leídas de archivos JSON locales).
- **Archivo fuente**: `src/modules/locations/services.js`
- **Ejemplo de key**: `cities:MX-AGU:es`
- **Invalidación**: `invalidateCitiesCache(stateCode)` — elimina `cities:{stateCode}:es` y `cities:{stateCode}:en`.

---

## Countries

### `countries:{lang}`
- **TTL**: 3600s (1 hora)
- **Tipo**: String (JSON)
- **Descripción**: Lista de todos los países activos con nombre traducido.
- **Archivo fuente**: `src/modules/countries/services.js`
- **Ejemplo de key**: `countries:es`
- **Ejemplo de valor**:
  ```json
  [{"code":"MX","name":"México","phoneCode":"+52"},{"code":"US","name":"Estados Unidos","phoneCode":"+1"}]
  ```
- **Invalidación**: `invalidateCountriesCache(lang)` — elimina `countries:{lang}`. Sin argumento elimina `countries:es` y `countries:en`.

---

## Devices

### `ec:v2:devices:list:{hash}`
- **TTL**: 600s (10 min)
- **Tipo**: String (JSON serializado)
- **Descripción**: Lista paginada de devices. Estructura v2 con `items[]`.
- **Archivo fuente**: `src/modules/devices/cache.js`
- **Ejemplo de key**: `ec:v2:devices:list:a1b2c3d4`
- **Invalidación**: `invalidateDeviceCache()` — elimina `ec:v2:devices:list:*`.

---

## Channels

### `ec:v2:channels:list:{hash}`
- **TTL**: 600s (10 min)
- **Tipo**: String (JSON serializado)
- **Descripción**: Lista paginada de channels. Estructura v2 con `items[]`.
- **Archivo fuente**: `src/modules/channels/cache.js`
- **Ejemplo de key**: `ec:v2:channels:list:a1b2c3d4`
- **Invalidación**: `invalidateChannelCache()` — elimina `ec:v2:channels:list:*`.

---

## Sites

### `ec:v2:sites:list:{hash}`
- **TTL**: 600s (10 min)
- **Tipo**: String (JSON serializado)
- **Descripción**: Lista paginada de sites. Estructura v2 con `items[]`.
- **Archivo fuente**: `src/modules/sites/cache.js`
- **Ejemplo de key**: `ec:v2:sites:list:a1b2c3d4`
- **Invalidación**: `invalidateSiteCache()` — elimina `ec:v2:sites:list:*`.

---

## Dashboards

### `ec:v1:dashboards:list:{hash}`
- **TTL**: 600s (10 min)
- **Tipo**: String (JSON serializado)
- **Descripción**: Lista paginada de dashboards.
- **Archivo fuente**: `src/modules/dashboards/cache.js`
- **Ejemplo de key**: `ec:v1:dashboards:list:a1b2c3d4`
- **Invalidación**: `invalidateDashboardCache()` — elimina `ec:v1:dashboards:list:*`.

### `ec:v1:dashboard-groups:list:{hash}`
- **TTL**: 600s (10 min)
- **Tipo**: String (JSON serializado)
- **Descripción**: Lista paginada de grupos de dashboards.
- **Archivo fuente**: `src/modules/dashboards/cache.js`
- **Ejemplo de key**: `ec:v1:dashboard-groups:list:a1b2c3d4`
- **Invalidación**: `invalidateGroupCache()` — elimina `ec:v1:dashboard-groups:list:*`.

---

## Device Metadata

### `ec:device_metadata:all:{lang}`
- **TTL**: 3600s (1 hora)
- **Tipo**: String (JSON)
- **Descripción**: Cache completo de todo el metadata de dispositivos (types, brands, models, servers, networks, licenses, validity periods, measurement types, variables).
- **Archivo fuente**: `src/modules/device-metadata/services.js`
- **Ejemplo de key**: `ec:device_metadata:all:es` → en Redis real: `DEV:EC:ec:device_metadata:all:es`
- **Invalidación**: `invalidateCache(lang)` — al crear, actualizar o eliminar cualquier catálogo de metadata. Sin argumento elimina `ec:device_metadata:all:es` y `ec:device_metadata:all:en`.

---

## Users

### `ec:user:{publicCode}`
- **TTL**: 900s (15 min)
- **Tipo**: String (JSON)
- **Descripción**: Cache de usuario individual por public_code (USR-XXXXX-X). Distinto de `ec:user:{userId}` en auth — este usa public_code.
- **Archivo fuente**: `src/modules/users/cache.js`
- **Ejemplo de key**: `ec:user:USR-12345-A`
- **Ejemplo de valor**:
  ```json
  {"publicCode":"USR-12345-A","email":"admin@example.com","firstName":"Juan","lastName":"García","role":"org-admin","isActive":true}
  ```
- **Invalidación**: `invalidateUserCache(publicCode)`.

### `ec:user:list:{limit}:{offset}:{filtersHash}`
- **TTL**: 300s (5 min)
- **Tipo**: String (JSON)
- **Descripción**: Lista paginada de usuarios con filtros.
- **Archivo fuente**: `src/modules/users/cache.js`
- **Ejemplo de key**: `ec:user:list:20:0:a1b2c3d4`
- **Invalidación**: Auto-expira por TTL (5 min). `invalidateAllUserLists()` es no-op (confía en TTL).

---

## Rate Limiting

### `ratelimit:{identifier}:{normalizedPath}`
- **TTL**: 60s
- **Tipo**: String (entero vía INCR)
- **Descripción**: Contador de requests por usuario/IP por ruta normalizada. IDs numéricos y UUIDs en path se normalizan a `:id`/`:uuid`.
- **Archivo fuente**: `src/middleware/rateLimit.js`
- **Ejemplo de key**: `ratelimit:user:uuid-123:/api/v1/devices/:id`
- **Ejemplo de valor**: `"15"`
- **Invalidación**: Expira automáticamente por TTL.

### `ratelimit:org:{orgId}`
- **TTL**: 60s
- **Tipo**: String (entero vía INCR)
- **Descripción**: Contador compartido de requests por organización. Limita el total de requests de todos los usuarios de una org.
- **Archivo fuente**: `src/middleware/rateLimit.js`
- **Ejemplo de key**: `ratelimit:org:uuid-org-123`
- **Ejemplo de valor**: `"42"`
- **Invalidación**: Expira automáticamente por TTL.

---

## Login Rate Limiting

> **AVISO**: Las keys de Login Rate Limiting usan su **propio cliente Redis** (creado con `createClient` directamente en `loginRateLimit.js`), independiente del cliente global. Por eso **NO llevan el prefijo `DEV:EC:`** automático — sus keys existen en la raíz del namespace Redis. Esta es la única excepción documentada al prefijado global.

### `login_fail_ip:{ip}`
- **TTL**: 900s (15 min)
- **Tipo**: String (entero vía INCR)
- **Descripción**: Contador de intentos de login fallidos por IP. Al alcanzar 20, se bloquea la IP. **Key sin prefijo `DEV:EC:`** — cliente propio.
- **Archivo fuente**: `src/middleware/loginRateLimit.js`
- **Ejemplo de key**: `login_fail_ip:192.168.1.100` (literal, sin prefijo global)
- **Ejemplo de valor**: `"3"`
- **Invalidación**: `resetLoginCounters(ip, identifier)` — tras login exitoso.

### `login_fail_id:{email}`
- **TTL**: 300s (5 min)
- **Tipo**: String (entero vía INCR)
- **Descripción**: Contador de intentos de login fallidos por email/username (normalizado a lowercase). Al alcanzar 5, se bloquea el identifier. **Key sin prefijo `DEV:EC:`** — cliente propio.
- **Archivo fuente**: `src/middleware/loginRateLimit.js`
- **Ejemplo de key**: `login_fail_id:admin@example.com` (literal, sin prefijo global)
- **Ejemplo de valor**: `"2"`
- **Invalidación**: `resetLoginCounters(ip, identifier)` — tras login exitoso.

### `login_block_ip:{ip}`
- **TTL**: 1800s (30 min)
- **Tipo**: String (`"1"`)
- **Descripción**: Flag de bloqueo por IP. Mientras exista, todos los intentos de login desde esta IP son rechazados (429). **Key sin prefijo `DEV:EC:`** — cliente propio.
- **Archivo fuente**: `src/middleware/loginRateLimit.js`
- **Ejemplo de key**: `login_block_ip:192.168.1.100` (literal, sin prefijo global)
- **Invalidación**: Expira automáticamente por TTL.

### `login_block_id:{email}`
- **TTL**: 900s (15 min)
- **Tipo**: String (`"1"`)
- **Descripción**: Flag de bloqueo por email/username. Mientras exista, todos los intentos de login con este identifier son rechazados (429). **Key sin prefijo `DEV:EC:`** — cliente propio.
- **Archivo fuente**: `src/middleware/loginRateLimit.js`
- **Ejemplo de key**: `login_block_id:admin@example.com` (literal, sin prefijo global)
- **Invalidación**: Expira automáticamente por TTL.

---

## Realtime WebSocket

### `ws:ephemeral:{tokenId}`
- **TTL**: 300s (5 min)
- **Tipo**: String (JSON serializado)
- **Descripción**: Token efímero de un solo uso para autenticación WebSocket. Se consume atómicamente (GET+DEL) al conectar.
- **Archivo fuente**: `src/modules/realtime/services/tokenService.js`
- **Ejemplo de key**: `ws:ephemeral:eph_a1b2c3d4e5f6...`
- **Ejemplo de valor**:
  ```json
  "{\"tokenId\":\"eph_abc...\",\"userId\":\"uuid-123\",\"organizationId\":\"uuid-org\",\"role\":\"org-admin\",\"allowedServices\":[\"SYSTEM\",\"DASHBOARD\",\"NOTIFY\"],\"email\":\"admin@example.com\",\"createdAt\":\"2026-02-26T10:00:00.000Z\"}"
  ```
- **Invalidación**: Consumido automáticamente al autenticar WS (single-use). `revokeToken(tokenId)` para revocación manual.

### `ws:session:{sessionId}`
- **TTL**: 86400s (24 horas)
- **Tipo**: String (JSON serializado)
- **Descripción**: Sesión WebSocket activa. Contiene datos del usuario, servicios permitidos, suscripciones activas y timestamps de actividad.
- **Archivo fuente**: `src/modules/realtime/services/sessionService.js`
- **Ejemplo de key**: `ws:session:sess_a1b2c3d4e5f6...`
- **Ejemplo de valor**:
  ```json
  "{\"sessionId\":\"sess_abc...\",\"userId\":\"uuid-123\",\"organizationId\":\"uuid-org\",\"role\":\"org-admin\",\"allowedServices\":[\"SYSTEM\",\"DASHBOARD\"],\"subscriptions\":[{\"type\":\"DASHBOARD\",\"resourceId\":\"DSH-ABC\",\"subscribedAt\":\"2026-02-26T10:00:00Z\"}],\"connectedAt\":\"2026-02-26T10:00:00Z\",\"lastActivity\":\"2026-02-26T10:05:00Z\"}"
  ```
- **Invalidación**: `destroySession(sessionId)` — al desconectar WS.

### `ws:user_sessions:{userId}`
- **TTL**: 86400s (24 horas)
- **Tipo**: String (JSON serializado — array de sessionIds)
- **Descripción**: Lista de sesiones WebSocket activas de un usuario. Usado para conteo de conexiones y aplicar límite de conexiones simultáneas.
- **Archivo fuente**: `src/modules/realtime/services/sessionService.js`
- **Ejemplo de key**: `ws:user_sessions:uuid-123`
- **Ejemplo de valor**:
  ```json
  "[\"sess_abc...\",\"sess_def...\"]"
  ```
- **Invalidación**: `destroySession(sessionId)` remueve el sessionId de la lista. Se elimina si queda vacía.

### `ws:token_rate:{userId}`
- **TTL**: 60s
- **Tipo**: String (entero vía INCR)
- **Descripción**: Rate limiter para generación de tokens efímeros. Máximo 10 tokens por minuto por usuario.
- **Archivo fuente**: `src/modules/realtime/routes.js`
- **Ejemplo de key**: `ws:token_rate:uuid-123`
- **Ejemplo de valor**: `"3"`
- **Invalidación**: Expira automáticamente por TTL.

---

## Realtime MQTT

### `ec:rt:last:{channelPublicCode}:{variableId}`
- **TTL**: 300s (5 min)
- **Tipo**: String (JSON)
- **Descripción**: Último valor MQTT recibido por channel+variable. Usado para enviar SNAPSHOT al suscribirse a un dashboard (reconexión sin pantalla vacía). Se escribe fire-and-forget en cada procesamiento MQTT.
- **Archivo fuente**: `src/modules/realtime/handlers/dashboardHandler.js`
- **Ejemplo de key**: `ec:rt:last:CHN-5Q775-2:3`
- **Ejemplo de valor**:
  ```json
  {"ts":1772071967,"value":22614,"devicePublicCode":"DEV-ABC"}
  ```
- **Invalidación**: Expira automáticamente por TTL (5 min). Si no llega MQTT en 5 min, el valor se considera stale y no se incluye en SNAPSHOT.

---

## Invalidación — Resumen por operación

| Operación | Keys invalidadas |
|---|---|
| **Login exitoso** | `login_fail_ip:{ip}`, `login_fail_id:{email}` |
| **Logout / Cambio contraseña** | `ec:user:{userId}`, `ec:session_version:{userId}` (incrementado), `ec:session_context:{userId}` |
| **Crear/Editar organización** | `org:{publicCode}`, `org:hierarchy:{publicCode}`, `ec:v2:org:list:*`, `ec:org_resolve:{uuid}`, `ec:org_resolve:{publicCode}` |
| **Eliminar organización** | Igual que editar + `ec:org_tree:{orgId}` |
| **Mover organización** | `org:{code}`, `org:hierarchy:{oldParent}`, `org:hierarchy:{newParent}`, `ec:v2:org:list:*` |
| **Cambiar membresía de usuario** | `ec:org_scope:{userId}` |
| **Switch organización activa** | `ec:session_context:{userId}` (actualizado), `ec:org_scope:{userId}` |
| **Crear/Editar/Eliminar nodo RH** | `ec:rh:node:{code}`, `ec:rh:ancestors:{code}`, `ec:rh:tree:{orgId}:*`, `ec:rh:children:{orgId}:*`, `ec:rh:list:{orgId}:*` |
| **Mover nodo RH** | Igual que editar + hijos de padre antiguo y nuevo |
| **Crear/Editar device** | `ec:v2:devices:list:*` |
| **Crear/Editar channel** | `ec:v2:channels:list:*`, `ec:tm:resolve:*` |
| **Crear/Editar site** | `ec:v2:sites:list:*` |
| **Crear/Editar dashboard** | `ec:v1:dashboards:list:*` |
| **Crear/Editar grupo dashboard** | `ec:v1:dashboard-groups:list:*` |
| **Editar catálogo metadata** | `device_metadata:all:es`, `device_metadata:all:en` |
| **Crear/Editar usuario** | `ec:user:{publicCode}` (individual), listas expiran por TTL |
| **Editar rol** | `ec:role:{roleName}` o `ec:role:*` (todos) |
| **Nuevo dato MQTT** | `ec:rt:last:{channelCode}:{varId}` (sobrescrito) |
| **Desconexión WS** | `ws:session:{sessionId}`, `ws:user_sessions:{userId}` (actualizado) |
