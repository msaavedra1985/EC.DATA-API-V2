# Backlog de Tareas Pendientes

> **CONSULTAR**: Para ver qué funcionalidad está pendiente de implementar

## Cómo usar este archivo

1. **Antes de empezar trabajo nuevo**, revisa si hay tareas pendientes relacionadas
2. **Al completar una tarea**, márcala con [x] y agrega fecha
3. **Al identificar trabajo pendiente**, agrégalo aquí con contexto

---

## Locations Module

### Completado ✅
- [x] Seed de estados: `npm run db:seed:geo` - 5,375 estados con traducciones ES/EN
- [x] Repository: `getStatesByCountry(countryCode, lang)`, `getStateByCode(code)`
- [x] Service con cache Redis: `states:{countryCode}:{lang}` TTL 1h
- [x] Ciudades on-demand desde JSONs locales: `data/geo/cities/{CC}.json` (153k+ ciudades)
- [x] Endpoints: `GET /locations/countries/:countryCode/states`, `GET /locations/states/:stateCode/cities`

### Pendientes
- [ ] CRUD de ciudades en DB (crear/actualizar ciudades personalizadas por organización)
- [ ] Endpoint `GET /api/v1/locations/states/:stateCode` - Detalle de un estado

---

## Countries Module

### Mejoras Pendientes
- [ ] No exponer `id` interno en respuestas API (solo `code`/`iso_alpha2`)
  - Archivo: `src/modules/countries/repository.js` línea ~62
  - Cambiar mapeo para omitir `id` en response

---

## Documentación Endpoints

### Nuevos Endpoints a Documentar
- [ ] Crear `agent-docs/endpoints/locations.md` cuando se implementen los endpoints
  - Seguir template de `agent-docs/endpoints/_template.md`
  - Incluir ejemplos de request/response multi-idioma

---

## Infraestructura

### Optimizaciones de Seed
- [ ] Considerar script de seed con batch INSERT (múltiples rows por query)
- [ ] Agregar flag `--country=AR` para seed parcial por país

---

### Verificaciones Pendientes
- [ ] Verificar que cache Redis de countries funciona correctamente en producción
  - Test: Llamar `GET /api/v1/countries` dos veces, segunda debe venir de cache
  - Key esperada: `countries:es`, `countries:en`
- [ ] Verificar que `findCountryByCode` funciona correctamente tras corrección
  - Ahora usa `findOne({ where: { iso_alpha2 } })` en lugar de `findByPk`

---

## Device Metadata Module

### Implementado ✅
- [x] Migración 7 tablas catálogo + 7 tablas traducción (IDs seriales)
- [x] Modelos Sequelize con relaciones
- [x] Seed script con datos iniciales (5 tipos, 21 marcas, 48 modelos, 8 servers, 4 redes, 6 licencias, 4 vigencias)
- [x] Endpoint GET /devices/metadata con cache Redis
- [x] Documentación agent-docs/endpoints/device-metadata.md

### Pendiente
- [ ] CRUDs individuales para administración (si se requiere):
  - POST/PUT/DELETE para device_types
  - POST/PUT/DELETE para device_brands
  - POST/PUT/DELETE para device_models
  - POST/PUT/DELETE para device_servers
  - POST/PUT/DELETE para device_networks
  - POST/PUT/DELETE para device_licenses
  - POST/PUT/DELETE para device_validity_periods
- [ ] Invalidación de caché automática en CUD operations
- [ ] Swagger docs para nuevos endpoints

---

## Auth Security Hardening

### Completado ✅ (2026-02-18)
- [x] Audit trail en switch-org, impersonate-org, exit-impersonation
- [x] Validación org activa/no-deleted en enforceActiveOrganization middleware
- [x] Cache Redis para resolveOrganizationId (TTL 5min, bidireccional)
- [x] Invalidación de cache en update/delete de organizaciones
- [x] Rate limiting por organización (600 req/min, headers estándar, 429 con Retry-After)
- [x] Helper `enforceOrgWithRateLimit()` para combinar enforcement + rate limit
- [x] Traducciones i18n (ES/EN) para errores de rate limit y org inactiva

### Pendiente
- [ ] Refactor auth/index.js (1563 líneas) → dividir en sub-módulos
- [ ] Refactor auth/services.js (1037 líneas) → dividir en sub-módulos
- [ ] Tests unitarios para orgRateLimitMiddleware
- [ ] Tests unitarios para enforceActiveOrganization (validación is_active/deleted_at)
- [ ] Documentación OpenAPI/Swagger para nuevos headers de rate limit

---

## Historial de Completados

### 2026-02-04
- [x] Device Metadata endpoint GET /devices/metadata

### 2026-01-27
- [x] Migración country_id → country_code en organizations y sites
- [x] Modelos State, StateTranslation, City, CityTranslation
- [x] Seed de 250 países con traducciones ES/EN
- [x] Seed parcial de estados con traducciones
- [x] Cache Redis para countries (key: `countries:{lang}`)
- [x] Instalación librería `country-state-city`
- [x] Script de seed `data/seed/seed-locations.js`
- [x] Módulo asset-categories completo (tags jerárquicos para canales)
  - Migración: tabla asset_categories + constraint scope + asset_category_id en channels
  - Modelo: AssetCategory con hooks para path/level automáticos
  - Repository/Services/Routes con CRUD completo
  - Documentación: agent-docs/endpoints/asset-categories.md
  - Seed: data/seed/seed-asset-categories.js
