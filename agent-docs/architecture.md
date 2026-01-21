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

```
┌──────────┐     ┌─────────┐     ┌───────────┐     ┌───────┐
│ Frontend │────▶│ /login  │────▶│ Validate  │────▶│ Redis │
└──────────┘     └─────────┘     │ Turnstile │     │ Cache │
                      │          └───────────┘     └───────┘
                      ▼                                 │
               ┌─────────────┐                          │
               │ Generate    │◀─────────────────────────┘
               │ JWT Tokens  │
               └─────────────┘
                      │
                      ▼
               ┌─────────────────────┐
               │ access_token (15m)  │
               │ refresh_token (14d) │
               │ session_context     │
               └─────────────────────┘
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
