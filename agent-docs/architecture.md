# Arquitectura del Sistema

> **CONSULTAR**: Al diseñar nuevas features o entender flujos existentes

## Overview

EC.DATA API es un backend Node.js/Express diseñado para plataformas e-commerce multi-tenant. Se integra con frontends Next.js via patrón BFF (Backend for Frontend).

## Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Routes Layer                        │
│  (HTTP handlers, request validation, response formatting)│
├─────────────────────────────────────────────────────────┤
│                     Services Layer                       │
│  (Business logic, orchestration, authorization checks)   │
├─────────────────────────────────────────────────────────┤
│                   Repositories Layer                     │
│  (Data access, Sequelize queries, caching)               │
├─────────────────────────────────────────────────────────┤
│                    Database Layer                        │
│  (PostgreSQL, Redis, Cassandra)                          │
└─────────────────────────────────────────────────────────┘
```

### Responsabilidades por capa

| Layer | Responsabilidad | NO debe hacer |
|-------|-----------------|---------------|
| Routes | Validar input (Zod), formatear response, manejar HTTP | Lógica de negocio, queries directas |
| Services | Lógica de negocio, orquestación, audit logging | Queries SQL directas |
| Repositories | Queries Sequelize, caching Redis | Lógica de negocio |
| Database | Almacenamiento, constraints, triggers | - |

## Authentication Flow

### Login Flow (detallado)
```
┌──────────┐     ┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│ Frontend │────▶│ POST /login │────▶│ Rate Limit    │────▶│ Turnstile    │
└──────────┘     └─────────────┘     │ Check (Redis) │     │ Verification │
                                     └───────────────┘     └──────────────┘
                                            │                     │
                                     ┌──────▼─────────────────────▼──────┐
                                     │         Validate Credentials       │
                                     │  1. Find user by email/username    │
                                     │  2. Compare bcrypt hash            │
                                     │  3. Check is_active                │
                                     └────────────────┬──────────────────┘
                                                      │
                      ┌───────────────────────────────▼────────────────────────────┐
                      │                     Generate Tokens                         │
                      │  1. access_token (JWT 15min) con user + activeOrgId        │
                      │  2. refresh_token (JWT 14d/90d) → hash guardado en DB      │
                      │  3. session_context → Redis con mismo TTL que refresh      │
                      └────────────────────────────────────────────────────────────┘
```

### Refresh Token Flow
```
┌──────────┐     ┌───────────────┐     ┌─────────────────────────────────┐
│ Frontend │────▶│ POST /refresh │────▶│ Validate refresh_token JWT      │
└──────────┘     └───────────────┘     └─────────────────────────────────┘
                                                      │
                      ┌───────────────────────────────▼────────────────────────────┐
                      │                   Security Checks                           │
                      │  1. Buscar token hasheado en DB                            │
                      │  2. Verificar no revocado (!is_revoked)                    │
                      │  3. Comparar sessionVersion del user                       │
                      │  4. Detectar reuso (token ya usado = posible robo)         │
                      └────────────────────────────────────────────────────────────┘
                                                      │
                      ┌───────────────────────────────▼────────────────────────────┐
                      │                   Token Rotation                            │
                      │  1. Revocar token anterior (is_revoked = true)             │
                      │  2. Generar nuevo access_token + refresh_token             │
                      │  3. Regenerar session_context en Redis (preservar TTL)     │
                      │  4. Preservar remember_me del token original               │
                      └────────────────────────────────────────────────────────────┘
```

### Session Context Strategy
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Frontend Request Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   GET /session-context ──────▶ Redis GET ──────▶ 200 OK (fast, ~5-15ms)     │
│                                    │                                         │
│                               404 Not Found (cache miss)                     │
│                                    │                                         │
│                                    ▼                                         │
│   GET /auth/me ──────────▶ DB Query ──────▶ Rebuild Redis ──────▶ 200 OK   │
│                                              (~50-200ms)                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

IMPORTANTE: session_context TTL = refresh_token TTL (14 días o 90 días)
```

### Token Types

| Token | Duración Normal | Duración Extended (remember_me) |
|-------|-----------------|--------------------------------|
| access_token | 15 minutos | 15 minutos |
| refresh_token | 14 días | 90 días |
| session_context (Redis) | 14 días | 90 días |

## Request Context Architecture

El servidor inyecta datos contextuales en objetos dedicados del request:

```javascript
req.user = {
  id,              // UUID interno (solo para queries)
  email,
  role,
  sessionVersion
};

req.organizationContext = {
  activeOrgId,     // UUID de org activa
  primaryOrgId,    // UUID de org principal del usuario
  canAccessAllOrgs // true para system-admin en God View
};

req.locale = 'es';  // Idioma detectado
```

**Separación clara**: Datos del servidor en `req.user/req.organizationContext` vs datos del cliente en `req.query/req.body`.

## Multi-Tenant Organization Model

```
┌─────────────────────────────────────────────────────┐
│                  System Admin                        │
│  (God View: sin org activa, puede impersonar)       │
└─────────────────────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Org A   │    │ Org B   │    │ Org C   │
    │ (Hotel) │    │ (Hotel) │    │ (Corp)  │
    └─────────┘    └─────────┘    └─────────┘
         │              │              │
    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │ Sites   │    │ Sites   │    │ Sub-orgs│
    │ Devices │    │ Devices │    │ Sites   │
    │ Channels│    │ Channels│    │ Devices │
    └─────────┘    └─────────┘    └─────────┘
```

### Relaciones clave

- **users ↔ organizations**: Many-to-many via `user_organizations`
- **organizations ↔ organizations**: Self-referential (parent_id) para jerarquías
- **Resource Hierarchy**: ltree de PostgreSQL para árboles flexibles

## Resource Hierarchy (ltree)

```
root
├── folder.hotels
│   ├── folder.hotels.lima
│   │   ├── site.hotels.lima.lobby
│   │   └── site.hotels.lima.restaurant
│   └── folder.hotels.cusco
│       └── site.hotels.cusco.lobby
└── folder.offices
    └── site.offices.main
```

- **PostgreSQL ltree extension** para queries eficientes de ancestros/descendientes
- **Node types**: folder, site, channel
- **Access control**: Per-node con herencia
- **Soft delete**: Con cascade automático

## Session Context Caching

```
┌─────────────┐     ┌─────────────────────────────────┐
│ /auth/me    │────▶│ DB Query + Build + Cache Redis  │ ~50-200ms
└─────────────┘     └─────────────────────────────────┘

┌────────────────────┐     ┌─────────────────────────┐
│ /session-context   │────▶│ Redis GET (cached)      │ ~5-15ms
└────────────────────┘     └─────────────────────────┘
```

**Estrategia**: Frontend usa `/session-context` para lecturas rápidas. Si retorna 404, fallback a `/auth/me` que reconstruye el cache.

## Admin Panel & Impersonation

- **God View Mode**: System-admin sin organización activa, ve toda la plataforma
- **Impersonation**: System-admin puede operar "como" otra organización
- **Audit Trail**: Todas las acciones de impersonación quedan logueadas
- **JWT Flags**: `isImpersonating`, `originalUserId` en payload

## Datos Geográficos (Países, Estados, Ciudades)

### Almacenamiento por nivel

| Nivel | Almacenamiento | Cantidad | Traducciones |
|-------|---------------|----------|--------------|
| Países | DB (tabla `countries` + `country_translations`) | ~250 | ES/EN en DB |
| Estados | DB (tabla `states` + `state_translations`) | ~5,375 | ES/EN en DB |
| Ciudades | Archivos JSON locales (`data/geo/cities/{CC}.json`) | ~153,000 | ES/EN inline en JSON |

### Patrón de uso de ciudades en entidades

Las ciudades **NO se almacenan en la base de datos**. Se sirven on-demand desde archivos JSON para que el frontend arme selectores de ubicación.

Cuando una entidad (site, device, etc.) necesita guardar su ubicación geográfica, se guarda como **texto plano**:

```
Tabla sites (u otra entidad):
  city          VARCHAR(200)   → "Aguascalientes" (nombre de la ciudad)
  state_code    VARCHAR(10)    → "MX-AGU" (código completo del estado)
  country_code  VARCHAR(2)     → "MX" (código ISO alpha-2 del país)
```

### Flujo frontend: Selección de ubicación

```
1. GET /api/v1/countries?lang=es
   → Usuario selecciona país (ej: México → "MX")

2. GET /api/v1/locations/countries/MX/states?lang=es
   → Usuario selecciona estado (ej: Aguascalientes → "MX-AGU")

3. GET /api/v1/locations/states/MX-AGU/cities?lang=es
   → Usuario selecciona ciudad (ej: Aguascalientes)

4. POST /api/v1/sites (o la entidad que sea)
   → Body: { city: "Aguascalientes", state_code: "MX-AGU", country_code: "MX", ... }
```

### Traducción de ciudad según idioma del usuario

Con el `state_code` guardado se puede obtener el nombre traducido:

```
GET /api/v1/locations/states/MX-AGU/cities?lang=en
→ Devuelve todas las ciudades de ese estado con nombres en inglés
→ Frontend busca la que coincide con el nombre guardado
```

En la práctica, la mayoría de nombres de ciudades son iguales en todos los idiomas. Las diferencias aparecen en ciudades con alfabetos distintos (ej: asiáticas).

### Filtrado por ciudad en consultas

Como la ciudad se guarda como texto, las consultas son directas:

```sql
-- Equipos en una ciudad específica
SELECT * FROM sites WHERE city = 'Aguascalientes' AND state_code = 'MX-AGU';

-- Equipos en un estado
SELECT * FROM sites WHERE state_code = 'MX-AGU';

-- Equipos en un país
SELECT * FROM sites WHERE country_code = 'MX';
```

### Cache Redis para datos geográficos

| Dato | Key pattern | TTL | Fuente |
|------|-------------|-----|--------|
| Estados de un país | `states:{CC}:{lang}` | 1 hora | DB |
| Ciudades de un estado | `cities:{stateCode}:{lang}` | 1 hora | JSON local |

### Agregar idiomas

Ver `agent-docs/learnings.md` → sección "Proceso completo de seed geográfico" para instrucciones detalladas de cómo agregar un nuevo idioma.

## Resiliencia Redis

### Estrategia de fallback

El cliente Redis (`src/db/redis/client.js`) implementa un sistema de resiliencia con 3 capas:

```
┌────────────────────────────────────────────────────────┐
│                  Redis Client                            │
│                                                          │
│  Inicio ──▶ Conectar Redis                               │
│              │                                           │
│              ├─ OK ──▶ modo: redis                       │
│              │         health check cada 60s (PING)      │
│              │                                           │
│              └─ FAIL ──▶ modo: in-memory (Map)           │
│                          reconexión cada 30s             │
│                                                          │
│  Runtime:                                                │
│  ┌─────────────────────────────────────────────┐         │
│  │ Evento end/error/PING fail                  │         │
│  │  → activar fallback en memoria              │         │
│  │  → programar reconexión periódica (30s)     │         │
│  │  → operaciones siguen funcionando (Map)     │         │
│  └─────────────────────────────────────────────┘         │
│  ┌─────────────────────────────────────────────┐         │
│  │ Reconexión exitosa                          │         │
│  │  → desactivar fallback                      │         │
│  │  → reactivar health check                   │         │
│  │  → operaciones vuelven a Redis              │         │
│  └─────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────┘
```

### Comportamiento por entorno

| Escenario | Desarrollo | Producción |
|-----------|------------|------------|
| Redis no disponible al inicio | Fallback en memoria + reconexión | Throw (obligatorio) |
| Redis se cae en runtime | Fallback en memoria + reconexión | Fallback en memoria + reconexión |
| Operación individual falla | Fallback silencioso + activar reconexión | Fallback silencioso + activar reconexión |

### Configuración de tiempos

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `RECONNECT_INTERVAL_MS` | 30s | Tiempo entre intentos de reconexión |
| `HEALTH_CHECK_INTERVAL_MS` | 60s | Intervalo del PING periódico |
| `PING_TIMEOUT_MS` | 5s | Timeout para considerar PING fallido |
| `connectTimeout` | 10s | Timeout de conexión inicial |

### Endpoint de monitoreo

`GET /api/v1/health` reporta el estado de Redis:

```json
{
  "services": {
    "redis": {
      "status": "connected",      // "connected" | "fallback"
      "mode": "redis",            // "redis" | "in-memory"
      "reconnecting": false,      // true si hay intento de reconexión activo
      "inMemoryKeys": null        // número de keys en memoria (solo en fallback)
    }
  }
}
```

### Notas importantes

- **Fallback en memoria NO persiste datos**: si Redis se cae, las keys en memoria se pierden al reiniciar el proceso
- **Reconexión limpia el cliente anterior**: antes de reconectar, se hace `disconnect()` del cliente viejo para evitar leaks
- **Todas las operaciones pasan por el wrapper**: ningún módulo accede a `redisClient` directamente
- **setCache con error guarda en memoria**: si un SET falla en Redis, los datos se guardan en el Map local como respaldo inmediato
- **graceful shutdown**: `closeRedis()` cancela timers de reconexión y health check antes de cerrar

## External Services Integration

```
┌─────────────────────────────────────────────────────────────┐
│                        EC.DATA API                           │
└───────┬──────────┬──────────┬──────────┬──────────┬─────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
   ┌─────────┐ ┌───────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │PostgreSQL│ │ Redis │ │Cassandra│ │ Azure   │ │Cloudflare│
   │  (main) │ │(cache)│ │(timeseries)│ │ Blob  │ │Turnstile│
   └─────────┘ └───────┘ └─────────┘ └─────────┘ └─────────┘
```
