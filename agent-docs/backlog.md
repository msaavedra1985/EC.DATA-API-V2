# Backlog de Tareas Pendientes

> **CONSULTAR**: Para ver qué funcionalidad está pendiente de implementar

## Cómo usar este archivo

1. **Antes de empezar trabajo nuevo**, revisa si hay tareas pendientes relacionadas
2. **Al completar una tarea**, márcala con [x] y agrega fecha
3. **Al identificar trabajo pendiente**, agrégalo aquí con contexto

---

## Locations Module

### Seed de Datos
- [ ] Completar seed de estados/provincias
  - Script: `node data/seed/seed-locations.js`
  - Verificar conteo actual: `SELECT COUNT(*) FROM states;`
  - Total esperado: ~5000 estados (librería country-state-city)
  - Pendiente: Optimizar con batch INSERT para mejor performance

### Estados (States)
- [ ] Crear `src/modules/locations/repository.js` con funciones:
  - `getStatesByCountry(countryCode, lang)` - Listar estados de un país
  - `getStateByCode(code)` - Obtener estado por código (ej: AR-B)
- [ ] Crear `src/modules/locations/services.js` con cache Redis:
  - Key pattern: `states:{countryCode}:{lang}` (ej: `states:AR:es`)
  - TTL: 1 hora (datos estáticos)
  - Función `invalidateStatesCache(countryCode)`
- [ ] Crear `src/modules/locations/routes.js` con endpoints:
  - `GET /api/v1/locations/countries/:countryCode/states` - Estados por país

### Ciudades (Cities)
- [ ] Crear funciones en repository:
  - `getCitiesByState(stateCode, lang)` - Listar ciudades de un estado
  - `getCityById(id)` - Obtener ciudad por ID
  - `createCity(cityData, translations)` - Crear ciudad con traducciones
  - `updateCity(id, cityData, translations)` - Actualizar ciudad y traducciones
- [ ] Crear servicios con cache Redis:
  - Key pattern: `cities:{stateCode}:{lang}` (ej: `cities:AR-B:es`)
  - TTL: 30 minutos (ciudades pueden agregarse)
  - Invalidación automática en create/update
- [ ] Crear endpoints:
  - `GET /api/v1/locations/states/:stateCode/cities` - Ciudades por estado
  - `POST /api/v1/locations/cities` - Crear ciudad (con traducciones)
  - `PUT /api/v1/locations/cities/:id` - Actualizar ciudad

### Multi-idioma Automático
- [ ] Implementar helper para inserción multi-idioma en un request:
  ```javascript
  // Ejemplo de request body esperado:
  {
    "state_code": "AR-B",
    "name": "Mar del Plata", // nombre principal
    "translations": {
      "es": "Mar del Plata",
      "en": "Mar del Plata"
    }
  }
  ```
- [ ] Validar que siempre se incluya traducción ES (idioma principal)

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
