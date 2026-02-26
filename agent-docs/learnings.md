# Learnings & Gotchas

> **CONSULTAR PRIMERO**: Antes de debuggear cualquier problema

## Cómo usar este archivo

1. **Antes de debuggear**, busca aquí si el problema ya fue resuelto
2. **Después de resolver** un bug no trivial, documéntalo aquí
3. Formato: Síntoma → Causa → Solución

---

## Autenticación

### Session context expira antes que el refresh token
**Fecha**: 2026-01-16
**Síntoma**: Frontend recibe 404 en `/auth/session-context` después de hacer refresh token
**Causa**: El TTL del session_context en Redis era 15 minutos, mientras que el refresh_token duraba 14-90 días
**Solución**: 
- Alinear TTL del session_context con el refresh_token (14 días normal, 90 días con remember_me)
- Regenerar session_context durante `refreshAccessToken`, no solo en login
- Preservar `remember_me` del token original usando `Boolean(storedToken.remember_me)`

**Archivos afectados**: `src/modules/auth/services.js`, `src/modules/auth/sessionContextCache.js`

### session_context null o campos null en impersonate-org y /me
**Fecha**: 2026-02-18
**Síntoma**: POST /impersonate-org devuelve `session_context: null`. GET /me estando impersonando devuelve `activeOrgPublicCode: null` y `impersonatedOrg.publicCode: null`. `primaryOrgPublicCode` siempre null.
**Causa**: Múltiples problemas:
1. Login y refresh NO poblaban campos `*PublicCode`, `*Name`, `*LogoUrl` en el session_context de Redis
2. `/me` al reconstruir cache asumía `activeOrgId = primaryOrgId` en vez de leer `req.user.activeOrgId` del JWT
3. `updateActiveOrg()` retornaba null si no había cache previo en Redis, y ese null se pasaba a `sanitizeSessionContext()`
4. `switchOrganization()` llamaba `updateActiveOrg()` sin pasar orgInfo (publicCode, name, logoUrl)
**Solución**: 
- Login y refresh ahora resuelven info pública de org primaria y activa antes de guardar session_context
- `/me` usa `req.user.activeOrgId` del JWT como fuente de verdad para la org activa
- `/me` resuelve org activa y primaria por separado (pueden ser diferentes durante impersonación)
- `impersonate-org` y `exit-impersonation` reconstruyen session_context completo (no dependen de `updateActiveOrg`)
- `switch-org` tiene fallback: si `updateActiveOrg` retorna null, reconstruye contexto completo
- `switchOrganization` en services.js ahora pasa orgInfo al `updateActiveOrg`
- Agregados `public_code` y `logo_url` a los attributes del query en `switchOrganization`

**Archivos afectados**: `src/modules/auth/services.js`, `src/modules/auth/index.js`

---

## Organizaciones

### country_code migrado a organization_countries (many-to-many)
**Fecha**: 2026-02-09
**Síntoma**: Organizations solo soportaba un país (country_code en tabla organizations)
**Causa**: Requerimiento de negocio - organizaciones operan en múltiples países
**Solución**: 
- Nueva tabla `organization_countries` (organization_id, country_code, is_primary)
- Migración `20260209180000` elimina `organizations.country_code` y migra datos existentes a la nueva tabla marcando como is_primary
- DTOs aceptan `countries: [{code, is_primary}]` - mínimo 1, exactamente 1 primary
- `selected_users` se acepta en el payload pero se stripea (no se procesa aún)
- Serializer devuelve `countries` array + `primary_country` field
- Si solo hay 1 país se auto-asigna como primary

**Archivos afectados**: `src/db/migrations/20260209180000-create-organization-countries-table.cjs`, `src/modules/organizations/models/OrganizationCountry.js`, `src/modules/organizations/models/Organization.js`, `src/modules/organizations/dtos/create.dto.js`, `src/modules/organizations/dtos/update.dto.js`, `src/modules/organizations/repository.js`, `src/helpers/serializers.js`

---

### scanAndDelete loop infinito por comparación de tipos
**Fecha**: 2026-02-10
**Síntoma**: POST /organizations crea la organización correctamente (INSERT + COMMIT exitosos) pero nunca responde al frontend, causando timeout
**Causa**: En `scanAndDelete()` del cliente Redis, el cursor SCAN se comparaba como string (`cursor !== '0'`) pero node-redis v4 retorna `cursor` como número. La comparación estricta `0 !== '0'` siempre es `true`, creando un loop infinito de SCAN.
**Solución**: 
- Cambiar `let cursor = '0'` a `let cursor = 0` (número)
- Cambiar comparación a `cursor !== 0` (número)
- Agregar `Number(result.cursor)` para garantizar el tipo
- Cambiar `redisClient.del(...keysToDelete)` a `redisClient.del(keysToDelete)` (array directo)
- Hacer `invalidateAllOrganizationLists()` fire-and-forget en `createOrganization` para que no bloquee la respuesta

**Archivos afectados**: `src/db/redis/client.js`, `src/modules/organizations/repository.js`

**Nota**: Este bug afectaba a TODAS las funciones que usan `scanAndDelete`: organizations/cache.js, resource-hierarchy/cache.js, telemetry/cache.js, auth/rolesCache.js

---

### Resiliencia Redis implementada
**Fecha**: 2026-02-10
**Síntoma**: Si Redis se caía después de estar conectado, el sistema no activaba el fallback en memoria ni intentaba reconectar (tenía `reconnectStrategy: false` sin alternativa)
**Causa**: El cliente solo manejaba el caso de "Redis no disponible al inicio" pero no el caso de "Redis se cae en runtime"
**Solución**: 
- Agregar listener para evento `end` que activa fallback en memoria
- Implementar reconexión periódica cada 30s cuando Redis no está disponible
- Health check con PING cada 60s para detectar conexiones zombie
- En operaciones individuales que fallan (GET, SET), activar fallback + programar reconexión
- En `setCache`, si Redis falla, guardar el dato en el Map de memoria como respaldo inmediato
- `getRedisStatus()` expone estado para el endpoint `/health`
- Graceful shutdown limpia timers antes de cerrar

**Archivos afectados**: `src/db/redis/client.js`, `src/modules/health/index.js`, `agent-docs/architecture.md`

---

### Content-Type duplicado causa body vacío
**Fecha**: 2026-02-10
**Síntoma**: POST /organizations retorna 400 con `name` y `countries` como `undefined` aunque el payload es correcto
**Causa**: Frontend envía header `Content-Type: application/json, application/json` (duplicado). Express `json()` middleware no reconoce este valor y no parsea el body, dejando `req.body = {}`
**Solución**: Corregir en el cliente HTTP del frontend (Axios interceptor probablemente agrega `Content-Type` manualmente cuando Axios ya lo pone por default)
**Diagnóstico**: Se confirmó con logs de debug temporales que mostraron `bodyKeys: []` y `bodyRaw: {}` con `contentLength: "243"` - el body llega pero no se parsea

---

## Template para nuevos entries

### [Título descriptivo del problema]
**Fecha**: YYYY-MM-DD
**Síntoma**: Qué observaste / qué error apareció
**Causa**: Por qué ocurrió
**Solución**: Cómo se arregló
**Archivos afectados**: Lista de archivos modificados

---

## Sequelize

### ORDER BY columna inexistente causa error 500
**Fecha**: 2026-02-05
**Síntoma**: `GET /devices/metadata` retornaba error 500 con queries SQL inválidos tipo `ORDER BY "DeviceType"."name" ASC`
**Causa**: Al intentar ordenar alfabéticamente, se usó `order: [['name', 'ASC']]` pero las tablas principales (device_types, device_brands, etc.) no tienen columna `name` - ese campo está en las tablas de traducciones
**Solución**: 
- Usar la sintaxis correcta de Sequelize para ordenar por campo de asociación:
- `order: [[{ model: DeviceTypeTranslation, as: 'translations' }, 'name', 'ASC']]`
- Esto genera el SQL correcto: `ORDER BY "translations"."name" ASC`
**Archivos afectados**: `src/modules/device-metadata/repository.js`

---

## Locations / Countries

### Repository usa findByPk pero PK no es iso_alpha2
**Fecha**: 2026-01-27
**Síntoma**: `findCountryByCode` fallaba porque usaba `findByPk(code)` pero PK de countries es `id` (integer), no `iso_alpha2`
**Causa**: Al migrar a natural keys, se usó `iso_alpha2` como FK en otras tablas pero la PK de `countries` sigue siendo `id` (autoincrement)
**Solución**: 
- Usar `findOne({ where: { iso_alpha2: code.toUpperCase() } })` en lugar de `findByPk(code)`
- El modelo usa `id` como PK pero relaciones usan `sourceKey: 'iso_alpha2'`
**Archivos afectados**: `src/modules/countries/repository.js`

### Seed de locations muy lento por inserciones individuales
**Fecha**: 2026-01-27
**Síntoma**: Script de seed timeout después de 3+ minutos, solo 1000 de ~5000 estados
**Causa**: El script hacía INSERT individual para cada estado + 2 traducciones
**Solución**: 
- Usar batch commits cada 500 estados para evitar transacción larga
- Considerar batch INSERT con múltiples VALUES para mejor performance
- Seed ejecutable en background: `nohup node data/seed/seed-locations.js &`
**Archivos afectados**: `data/seed/seed-locations.js`

### Proceso completo de seed geográfico (estados + ciudades)
**Fecha**: 2026-02-09

**Fuente de datos**: [CountryStateCity](https://github.com/dr5hn/countries-states-cities-database) por dr5hn
- Repositorio con datos ISO actualizados de 250 países, 5,296 estados y 153,000+ ciudades
- Incluye traducciones en múltiples idiomas (es, en, fr, de, pt, ja, ko, zh, etc.)
- Licencia: Open Database License (ODbL)
- API pública: `https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/`

**Archivos fuente en el repositorio de CountryStateCity**:
- `json/states.json` - Todos los estados con traducciones (usado para estados)
- `json/cities.json` - Todas las ciudades con traducciones (usado para ciudades)
- Ambos incluyen traducciones en: es, en, fr, de, pt, ja, ko, zh, ar, etc.

**Archivos procesados en nuestro proyecto**:
1. `data/geo/states.json` - 5,296 estados en formato slim con traducciones ES/EN
   - Formato: `[{name, iso2, country_code, latitude, longitude, type, translations: {es, en}}]`
   - Generado desde: `json/states.json` del repo CountryStateCity
   - Procesamiento: se extrajo solo los campos necesarios y traducciones ES/EN

2. `data/geo/cities/{CC}.json` - 218 archivos, uno por país (ej: `MX.json`, `AR.json`)
   - Formato: `[{name, state_code, latitude, longitude, population, timezone, type, translations: {es, en}}]`
   - Generado desde: `json/cities.json` del repo CountryStateCity
   - Procesamiento: se descargó `cities.json` (~185MB), se agrupó por `country_code` y se guardó un archivo por país con campos reducidos
   - `state_code` es el código LOCAL del estado (ej: "AGU"), NO el código completo (ej: "MX-AGU")
   - Para buscar ciudades de "MX-AGU": abrir `MX.json` y filtrar por `state_code === "AGU"`
   - Total: ~30MB en disco repartidos en 218 archivos

**Procedimiento original de descarga y procesamiento**:
```bash
# 1. Descargar estados (liviano, ~5MB)
curl -o /tmp/states.json https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json

# 2. Procesar estados: extraer campos slim + traducciones ES/EN → data/geo/states.json
# (se usó un script Node.js ad-hoc que mapeó cada estado a formato slim)

# 3. Descargar ciudades (pesado, ~185MB)
curl -o /tmp/cities.json https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/cities.json

# 4. Splitear ciudades por país → data/geo/cities/{CC}.json
# Script ad-hoc: lee /tmp/cities.json, agrupa por country_code,
# mapea cada ciudad a formato slim con traducciones ES/EN,
# escribe un archivo JSON por país
```

**Scripts de seed (estados a DB)**:
- `npm run db:seed:geo` → ejecuta `node src/db/seeders/run-geo.js`
- El seeder (`src/db/seeders/geo-data.seeder.js`) lee `data/geo/states.json` y hace:
  1. Consulta estados existentes en DB para evitar duplicados
  2. Inserta estados faltantes con `bulkCreate` en batches de 500
  3. Inserta traducciones ES/EN para cada estado nuevo
  4. Resultado: 5,375 estados en DB (1,000 originales + 4,375 nuevos)
- Las ciudades NO se insertan en DB - se sirven on-demand desde los JSONs

**Cómo agregar un nuevo idioma (ej: portugués "pt")**:

Paso 1 - Descargar fuentes actualizadas:
```bash
curl -o /tmp/states.json https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json
curl -o /tmp/cities.json https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/cities.json
```

Paso 2 - Actualizar `data/geo/states.json` con las traducciones del nuevo idioma:
```javascript
// Leer states.json del repo (tiene todas las traducciones)
// Para cada estado en nuestro data/geo/states.json:
//   buscar el estado en el JSON fuente por iso2 + country_code
//   agregar translations.pt = fuente.translations.pt || fuente.name
// Guardar data/geo/states.json actualizado
```

Paso 3 - Actualizar `data/geo/cities/{CC}.json` con las traducciones del nuevo idioma:
```javascript
// Leer cities.json del repo (tiene todas las traducciones)
// Para cada archivo data/geo/cities/{CC}.json:
//   para cada ciudad, buscar en el JSON fuente por name + state_code + country_code
//   agregar translations.pt = fuente.translations.pt || fuente.name
// Guardar cada archivo actualizado
```

Paso 4 - Insertar traducciones de estados en DB:
```javascript
// Leer data/geo/states.json actualizado
// Para cada estado que tenga translations.pt:
//   INSERT INTO state_translations (state_code, lang, name) VALUES (code, 'pt', translations.pt)
//   Usar bulkCreate con ignoreDuplicates para evitar conflictos
// Usar el mismo patrón que geo-data.seeder.js
```

Paso 5 - Actualizar código:
- Agregar `'pt'` al array `validLangs` en `src/modules/locations/routes.js`
- Agregar `'pt'` al array `validLangs` en `src/modules/countries/routes.js` si aplica
- Invalidar cache Redis: borrar keys `states:*` y `cities:*`

**Cache Redis**:
- Estados: key `states:{CC}:{lang}` (ej: `states:MX:es`), TTL 1 hora
- Ciudades: key `cities:{stateCode}:{lang}` (ej: `cities:MX-AGU:es`), TTL 1 hora

**Archivos del módulo**:
- `src/modules/locations/repository.js` - Queries Sequelize para estados desde DB
- `src/modules/locations/services.js` - Cache Redis + lectura de JSONs para ciudades
- `src/modules/locations/routes.js` - Endpoints públicos (sin auth)
- `src/modules/locations/index.js` - Export del router
- `src/db/seeders/geo-data.seeder.js` - Seeder de estados
- `src/db/seeders/run-geo.js` - Runner del seeder

---

## Rate Limiting

### Contador de intentos no se resetea después de login exitoso
**Fecha**: 2026-01-21
**Síntoma**: Usuario logueado exitosamente pero en siguiente intento (ej: re-login) recibe error de rate limit
**Causa**: El middleware de rate limit incrementaba contador antes de validar credenciales, pero no lo reseteaba en login exitoso
**Solución**: 
- Llamar `resetLoginCounters(email, ip)` después de login exitoso en el handler
- El reset elimina las keys de Redis: `login_attempts:email:{email}` y `login_attempts:ip:{ip}`
**Archivos afectados**: `src/modules/auth/index.js`, `src/middleware/loginRateLimit.js`

### Rate limit por IP afecta a usuarios legítimos en redes compartidas
**Fecha**: 2026-01-21
**Síntoma**: Múltiples usuarios en misma oficina (misma IP) se bloquean mutuamente
**Causa**: Rate limit solo por IP es muy agresivo en redes corporativas/NAT
**Solución**: 
- Usar rate limit combinado: IP + email (ambos deben exceder límite)
- Límites actuales: 5 intentos por email, 20 intentos por IP en ventana de 15 minutos
- Captcha se requiere después de 3 intentos fallidos (antes del bloqueo)
**Archivos afectados**: `src/middleware/loginRateLimit.js`

---

## Database

(Agregar problemas de DB aquí)

---

## Redis

(Agregar problemas de Redis aquí)

---

## Validación / DTOs

### Slug duplicado por doble disparo de React StrictMode
**Fecha**: 2026-02-10
**Síntoma**: Error `SLUG_EXISTS` al crear organización, aunque el slug no existía previamente
**Causa**: React en modo desarrollo (`StrictMode`) ejecuta `useEffect` dos veces, disparando dos POST simultáneos. El segundo falla porque el primero ya creó el slug
**Solución**: 
- Backend: Implementar `generateUniqueSlug()` que auto-genera slugs únicos (atria → atria-2 → atria-3) en vez de rechazar duplicados
- Helper en `src/modules/organizations/helpers/slug.js`
- Aplica tanto en creación (POST) como actualización (PUT)
- Endpoint `validate-slug` ahora devuelve campo `suggestion` cuando el slug está tomado

---

## Migración de Datos (Legacy SQL Server → PostgreSQL)

### FOR UPDATE no permite funciones de agregación en PostgreSQL
**Fecha**: 2026-02-12
**Síntoma**: `FOR UPDATE is not allowed with aggregate functions` al ejecutar `SELECT MAX(human_id) FROM devices FOR UPDATE`
**Causa**: PostgreSQL no permite `FOR UPDATE` con funciones de agregación (MAX, COUNT, SUM, etc.) porque FOR UPDATE bloquea filas individuales, pero los aggregates no operan sobre filas individuales
**Solución**: 
- Usar `LOCK TABLE "devices" IN EXCLUSIVE MODE` antes del SELECT con MAX()
- Esto bloquea toda la tabla durante la transacción, evitando colisiones de human_id
- Alternativa: usar secuencias de DB (pero human_id no es autoincremental por diseño)

**Archivos afectados**: `scripts/migrate-sirenis.js`

---

### Script de migración debe ser idempotente
**Fecha**: 2026-02-12
**Síntoma**: Re-ejecutar el script duplicaba todos los datos (devices, channels, channel_variables)
**Causa**: No había guardia de idempotencia - el script siempre creaba nuevos UUIDs y public_codes
**Solución**: 
- Agregar check previo: `SELECT COUNT(*) FROM devices WHERE organization_id = :orgId`
- Si hay datos, informar y no insertar (sugerir `--clean` para re-ejecutar)
- Flag `--clean` borra datos de la organización antes de re-insertar
- La limpieza se ejecuta en transacción separada del insert para no perder datos si falla

---

### Validar mapeos contra la DB antes de insertar
**Fecha**: 2026-02-12
**Síntoma**: Riesgo de insertar variable_id incorrectos si cambian los catálogos
**Causa**: Los mapeos (VARIABLE_MAP, MEASUREMENT_TYPE_MAP) eran hardcoded sin validación
**Solución**: 
- Antes de insertar, consultar la tabla `variables` y verificar que cada newId tenga el code y unit esperados
- Lo mismo con `measurement_types`
- Si alguno no coincide, el script falla con mensaje claro antes de insertar nada

---

### Mapeo de campos entre plataformas
**Fecha**: 2026-02-12
**Contexto**: Referencia rápida de mapeo de campos para migración legacy → nueva plataforma
**Equipos → Devices**:
- `nombre` → `name`, `uuid` → `uuid`, `mac` → `mac_address`
- `timezone` → `timezone`, `lat/lon` → `latitude/longitude`
- `topic` → `topic`, `activo === '1'` → `status: 'active'`
- `equiposMarcaId` → `brand_id`, `equiposModeloId` → `model_id`
- `lastReport` → `last_seen_at` (filtrar fechas `1899-*`)
- Campos nuevos sin equivalente: `site_id`, `device_type_id`, `server_id`, `network_id`, `license_id`, etc.
**Canales → Channels**:
- `nombre` → `name`, `ch` → `ch`, `sistema` → `phase_system`, `fase` → `phase`
- `procesar === '1'` → `process: true`, `lastReport` → `last_sync_at`
- `tipoMedicionId` → `measurement_type_id` (requiere mapeo: 1→1, 3→2, 4→3, 6→4)
- Se agrega `organization_id` por diseño de la nueva plataforma (reduce JOINs)

---

## Migraciones vs sequelize.sync()

### Síntoma
Migración falla con `ERROR: relation "xxx_idx" already exists` al ejecutar `npm run db:migrate`.

### Causa
El servidor usa `sequelize.sync({ alter: false })` en `src/db/sql/sequelize.js` al iniciar. Si los modelos Sequelize tienen `indexes` definidos, sync crea las tablas e índices antes que la migración CLI. Cuando la migración intenta crear los mismos índices con `addIndex`, PostgreSQL rechaza porque ya existen.

### Solución
Usar un helper `safeAddIndex` en las migraciones que ignore errores "already exists":

```javascript
const safeAddIndex = async (table, fields, options) => {
  try {
    await queryInterface.addIndex(table, fields, options);
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }
};
```

**Aplicado en**: `20260213100000-create-dashboards-module.cjs`

---

## Performance

### Redis cache para resolveOrganizationId
**Fecha**: 2026-02-18
**Síntoma**: Cada request autenticado hacía un query a DB para resolver `public_code → UUID` en `resolveOrganizationId`
**Solución**: 
- Cache bidireccional en Redis: `org:resolve:uuid:{uuid}` → publicCode y `org:resolve:code:{publicCode}` → uuid
- TTL de 5 minutos (300s)
- Best-effort: si Redis falla, se cae a DB sin bloquear
- Función `invalidateOrgResolveCache(uuid, publicCode)` exportada para invalidar en update/delete
- Invalidación llamada desde `organizations/routes.js` en handlers de update y delete

**Archivos afectados**: `src/middleware/enforceActiveOrganization.js`, `src/modules/organizations/routes.js`

### Rate limiting por organización
**Fecha**: 2026-02-18
**Síntoma**: No había límite de requests por organización, solo por usuario/IP
**Solución**: 
- `orgRateLimitMiddleware` en `src/middleware/rateLimit.js` con key `ratelimit:org:{orgId}`
- Default: 600 requests/minuto por organización
- Headers: `X-Org-RateLimit-Limit`, `X-Org-RateLimit-Remaining`, `X-Org-RateLimit-Reset`
- `Retry-After` header en respuesta 429
- Skip para `canAccessAll` (system-admin sin org específica)
- Helper `enforceOrgWithRateLimit()` en enforceActiveOrganization.js combina ambos middlewares
- Best-effort: si Redis falla, no bloquea requests

**Archivos afectados**: `src/middleware/rateLimit.js`, `src/middleware/enforceActiveOrganization.js`

---

## Neon Database

### Endpoint deshabilitado por inactividad (cold start)
**Fecha**: 2026-02-20
**Síntoma**: `SequelizeConnectionError: The endpoint has been disabled. Enable it using Neon API and retry.` (código XX000)
**Causa**: Neon deshabilita endpoints tras períodos de inactividad. El cold start puede tardar varios minutos o requerir re-provisionar la DB.
**Solución**:
- Se agregó retry logic con backoff en `initializeDatabase()` (5 intentos, delay incremental 3s→15s)
- Si persiste: usar `create_postgresql_database_tool` para re-provisionar, o esperar y reiniciar
- El error es transitorio y no relacionado con el código de la aplicación

---

## camelCase End-to-End

### Migración de snake_case a camelCase completa
**Fecha**: 2026-02-24
**Contexto**: El codebase originalmente usaba snake_case internamente con un middleware `caseTransform` que traducía bidireccionalmente entre camelCase (frontend) y snake_case (backend). Esto generaba una capa de complejidad innecesaria.
**Decisión**: Eliminar el middleware y migrar TODO el código JavaScript a camelCase nativo.
**Cambios realizados** (Fase 1 + Fase 2):
- Fase 1: Todos los modelos Sequelize (~50) convertidos a propiedades camelCase
- Fase 2: DTOs, serializers, services, repositories, routes de los 14 módulos convertidos
- Middleware `caseTransform` eliminado de `app.js`
- Sequelize `underscored: true` maneja el mapeo automático JS↔DB

**Resultado**: Arquitectura más simple. Frontend envía/recibe camelCase directo sin intermediarios.

### Gotcha: raw queries devuelven snake_case
**Fecha**: 2026-02-24
**Síntoma**: Al usar `raw: true` o `sequelize.query()`, las propiedades vienen en snake_case (nombres de columna DB)
**Causa**: Sequelize solo mapea camelCase↔snake_case en instancias de modelo, no en resultados raw
**Solución**: 
- En queries `raw: true`, acceder a propiedades en snake_case: `row.organization_id`
- En queries normales (sin raw), acceder en camelCase: `user.organizationId`
- Si necesitás usar raw results en un serializer, mapear explícitamente:
  ```javascript
  const dto = { organizationId: row.organization_id, isActive: row.is_active };
  ```

### Gotcha: Migraciones siguen en snake_case
**Fecha**: 2026-02-24
**Contexto**: Las migraciones (.cjs) usan `queryInterface` que opera directamente contra la DB
**Regla**: En migraciones, usar snake_case para nombres de columna y tabla:
```javascript
// CORRECTO en migración
await queryInterface.addColumn('users', 'avatar_url', { type: Sequelize.STRING });

// INCORRECTO en migración
await queryInterface.addColumn('users', 'avatarUrl', { type: Sequelize.STRING });
```

---

## Telemetría

### [RESUELTO] Public codes migrados de Hashids a nanoid
- **Fecha**: 2026-02-25
- **Antes**: Hashids+Luhn generaba códigos case-sensitive de longitud variable (`CHN-3GKyM6HXvQB-1`)
- **Después**: nanoid con alfabeto seguro genera `PREFIX-XXX-XXX` todo mayúsculas (`CHN-F74-CEL`)
- **Migración**: 348 registros migrados (channels: 299, devices: 41, orgs: 3, users: 1, dashboards: 4)
- **Importante**: También se migró `widget_data_sources.entity_id` que almacena public codes como referencia cruzada
- **Regex actualizada**: `/^[A-Z]{2,4}-[A-Z2-9]{3}-[A-Z2-9]{3}$/`

### Variables vacías en canales eléctricos (sin channel_variables)
- **Fecha**: 2026-02-25
- **Síntoma**: Widget data endpoint retorna `variables: {}` y `data` solo con timestamps sin valores para canales eléctricos.
- **Causa**: `getTelemetryMetadata` solo buscaba variables en `channel_variables` (join tabla). Los canales eléctricos (measurement_type_id=1) no tienen registros en `channel_variables` — sus variables estándar (`e`, `p`, `v`, `i`, etc.) están solo en la tabla global `variables`. Además, `seriesConfig.variableId` (singular) no se pasaba como `variables` array al search.
- **Solución**:
  1. Nuevo helper `getVariablesByMeasurementType()` en `metadataRepository.js` — busca variables directamente en tabla `variables` por `measurement_type_id`, con filtro opcional de `variableIds`
  2. Fallback en `getTelemetryMetadata`: si `getChannelVariables` retorna vacío, llama a `getVariablesByMeasurementType` con el `measurement_type_id` del canal
  3. En `dashboards/services.js`: extraer `seriesConfig.variableId` (singular) como `[variableId]` array, además de `seriesConfig.variables` (plural)
- **Archivos**: `src/modules/telemetry/repositories/metadataRepository.js`, `src/modules/dashboards/services.js`
- **Regla**: Canales IoT → `channel_variables`. Canales eléctricos → fallback a tabla `variables` global por `measurement_type_id`.

### mqtt_key necesario para mapeo MQTT ↔ variable
- **Fecha**: 2026-02-26
- **Síntoma**: El WS dashboard enviaba datos usando `column_name.toUpperCase()` como key para buscar en el payload MQTT, pero `fp.toUpperCase() = FP` mientras en MQTT llega como `PF`.
- **Causa**: Los nombres de columna en Cassandra (`column_name`) no siempre coinciden con las keys del payload MQTT (`rtdata[].PF`). El mapeo no es una simple transformación de case.
- **Solución**:
  - Agregar campo `mqtt_key VARCHAR(50)` nullable a tabla `variables`
  - Popular explícitamente para cada variable eléctrica con `is_realtime=true` (P, PF, V, I, S, U, D, Q, F)
  - Dejar NULL para variables no-realtime y para IoT (pendiente definir sus payloads)
  - Migración: `20260226100000-add-mqtt-key-to-variables.cjs`
- **Archivos afectados**: `src/db/migrations/20260226100000-add-mqtt-key-to-variables.cjs`, `src/modules/telemetry/models/Variable.js`, `src/modules/realtime/handlers/dashboardHandler.js`

### WS Dashboard: triple filtrado por is_realtime, canal y variable
- **Fecha**: 2026-02-26
- **Contexto**: El handler MQTT anterior reenviaba datos sin filtrar adecuadamente — pasaba payloads completos o usaba `series_config.variables` (que no existía en la configuración actual de data sources).
- **Cambios**:
  1. `resolveDashboardAssets` ahora hace JOIN a `variables` con guard `is_realtime=true`, trayendo `mqtt_key` y `variable_id` por cada data source
  2. `processMqttForDashboards` solo procesa `rtdata`, filtra por uid hex (canal), y extrae solo la `mqtt_key` solicitada
  3. Formato de salida agrupado por channel: `{ channels: { "CHN-xxx": { ts, values: { "3": value } } } }`
  4. Las keys de `values` son `variableId` (string) — consistente con endpoint REST
- **Archivos afectados**: `src/modules/realtime/handlers/dashboardHandler.js`

### Redis last-value cache para dashboard realtime (SNAPSHOT)
**Fecha**: 2026-02-26
**Contexto**: Al reconectarse al WS, el frontend veía pantalla vacía hasta que llegaba el siguiente ciclo MQTT (~1-5 seg).
**Solución**:
- Cache fire-and-forget en Redis con key `ec:rt:last:{channelPublicCode}:{variableId}` (TTL 300s)
- Al `handleSubscribe`, leer todos los valores cacheados y enviar mensaje `EC:DASHBOARD:{id}:SNAPSHOT`
- El SNAPSHOT usa el mismo formato que DATA, así el frontend reutiliza la misma lógica de renderizado
- Si no hay cache (primera vez o TTL expiró), no se envía SNAPSHOT (silencioso)
- `setCache` es fire-and-forget (no bloquea flujo MQTT→WS), `getCache` sí se espera (solo en subscribe, una vez)
**Archivos afectados**: `src/modules/realtime/handlers/dashboardHandler.js`
**Regla**: Toda nueva key Redis debe declararse en `agent-docs/redis-glossary.md`

### Soft delete + unique constraints = conflict silencioso
**Fecha**: 2026-02-26
**Síntoma**: Error 500 al crear widget: `duplicate key value violates unique constraint "widgets_page_order_number_uk"`, a pesar de haber eliminado el widget anterior.
**Causa**: Los unique constraints `(dashboard_page_id, order_number)` no excluían registros con `deleted_at IS NOT NULL`. Con `paranoid: true` (soft delete global), los registros "eliminados" seguían bloqueando la creación de nuevos registros con el mismo `order_number`.
**Solución**: Reemplazar los 3 constraints por **partial unique indexes** con `WHERE deleted_at IS NULL`:
- `dashboard_pages_dashboard_order_number_uk`
- `widgets_page_order_number_uk`
- `widget_data_sources_widget_order_number_uk`
**Regla general**: Toda tabla con `paranoid: true` que tenga unique constraints debe usar partial indexes (`WHERE deleted_at IS NULL`), no constraints planos.
**Migración**: `20260226180000-fix-dashboard-order-number-constraints.cjs`
**Archivos afectados**: Solo migración (los modelos Sequelize no declaran uniqueness inline para estos campos)

### WS resolveDashboardAssets no necesita organizationId
**Fecha**: 2026-02-26
**Síntoma**: WS subscribe a dashboard devolvía `NO_ASSETS` porque la query incluía `AND db.organization_id = :organizationId` y el token efímero tenía `organizationId: null`.
**Causa inicial**: La ruta `POST /api/v1/realtime/token` no tenía middleware `enforceActiveOrganization` (corregido). Pero el filtro de org en la query era innecesario: el `public_code` del dashboard ya es único globalmente, el WS ya requiere autenticación (JWT + token efímero), y el frontend controla las suscripciones.
**Solución**: Se eliminó el filtro `AND db.organization_id = :organizationId` de la query y el parámetro `organizationId` de `resolveDashboardAssets`. Se mantuvo el middleware `enforceActiveOrganization` en la ruta token por si otras funcionalidades lo necesitan.
**Regla general**: No agregar filtros de seguridad multi-tenant en queries WS cuando el recurso ya se identifica por `public_code` único y el acceso está protegido por autenticación. El aislamiento multi-tenant se gestiona mejor en la capa REST (acceso al dashboard) que en la capa WS (suscripción realtime).
**Archivos afectados**: `src/modules/realtime/handlers/dashboardHandler.js`

### Regex en template string JS pierde backslash al llegar a PostgreSQL
**Fecha**: 2026-02-26
**Síntoma**: La query `resolveDashboardAssets` devolvía 0 rows para todos los dashboards. El log mostraba `~ '^d+$'` en vez de `~ '^\d+$'`.
**Causa**: En un template string de JavaScript (backticks), `\d` no es un escape reconocido por JS, así que lo convierte silenciosamente en `d`. PostgreSQL recibía `'^d+$'` (literal "d") que nunca matchea strings numéricas como `"2"` o `"3"`.
**Solución**: Escapar el backslash: `'^\\d+$'` para que JS pase `\d` a PostgreSQL.
**Regla general**: Siempre usar doble backslash (`\\d`, `\\w`, `\\s`) en regex PostgreSQL dentro de template strings JS. Esto aplica a cualquier query SQL con regex que se escriba en template literals.
**Archivos afectados**: `src/modules/realtime/handlers/dashboardHandler.js`

---

## Deployment

(Agregar problemas de deployment aquí)
