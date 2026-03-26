# Módulos Implementados

> **CONSULTAR**: Para entender qué funcionalidad existe y dónde encontrarla

## Módulos Core

| Módulo | Ubicación | Propósito | Endpoints |
|--------|-----------|-----------|-----------|
| auth | `src/modules/auth/` | Autenticación y sesiones | [endpoints/auth.md](endpoints/auth.md) |
| users | `src/modules/users/` | Gestión de usuarios | [endpoints/users.md](endpoints/users.md) |
| organizations | `src/modules/organizations/` | Multi-tenant | [endpoints/organizations.md](endpoints/organizations.md) |
| sites | `src/modules/sites/` | Ubicaciones físicas | [endpoints/sites.md](endpoints/sites.md) |
| devices | `src/modules/devices/` | Dispositivos IoT/Edge | [endpoints/devices.md](endpoints/devices.md) |
| device-metadata | `src/modules/device-metadata/` | Catálogos de metadatos de dispositivos | — |
| channels | `src/modules/channels/` | Canales de comunicación | [endpoints/channels.md](endpoints/channels.md) |
| files | `src/modules/files/` | Upload Azure Blob | [endpoints/files.md](endpoints/files.md) |
| telemetry | `src/modules/telemetry/` | Series temporales (Cassandra) | [endpoints/telemetry.md](endpoints/telemetry.md) |
| resource-hierarchy | `src/modules/resource-hierarchy/` | Árbol ltree | [endpoints/resource-hierarchy.md](endpoints/resource-hierarchy.md) |
| asset-categories | `src/modules/asset-categories/` | Tags jerárquicos para clasificar canales | [endpoints/asset-categories.md](endpoints/asset-categories.md) |
| error-logs | `src/modules/error-logs/` | Logging errores frontend | [endpoints/error-logs.md](endpoints/error-logs.md) |
| dashboards | `src/modules/dashboards/` | Dashboards & Analytics multipágina | [endpoints/dashboards.md](endpoints/dashboards.md) |
| realtime | `src/modules/realtime/` | WebSocket + MQTT para telemetría en tiempo real | — |
| schedules | `src/modules/schedules/` | Motor de Horarios para facturación y analítica | `agent-docs/endpoints/schedules.md` |

## Archivos Clave por Módulo

### auth
- `services.js` - Lógica de login, tokens, refresh
- `sessionContextCache.js` - Cache Redis de session_context
- `refreshTokenRepository.js` - CRUD de refresh tokens
- `models/RefreshToken.js` - Modelo Sequelize

### organizations
- Jerarquía con parent_id (auto-referencial)
- Relación many-to-many con users via `user_organizations`

### files
- Generación de SAS URLs para Azure Blob
- Metadata tracking en PostgreSQL

### telemetry
- Multi-language support para nombres de variables
- Timezone-aware filtering
- Apache Cassandra backend

### resource-hierarchy
- Node types: folder, site, channel
- ltree para queries eficientes de ancestros/descendientes
- Access control con herencia
- Redis caching

---

## Módulos de Soporte

| Módulo | Ubicación | Propósito |
|--------|-----------|-----------|
| roles | `src/modules/roles/` | RBAC database-driven |
| countries | `src/modules/countries/` | Catálogo de países (ISO 3166-1) |
| locations | `src/modules/locations/` | Estados/provincias y ciudades |
| audit | `src/modules/audit/` | Modelo para audit_logs |
| health | `src/modules/health/` | Health checks (`GET /health`) |
| seed | `src/modules/seed/` | Datos iniciales para desarrollo |

### locations
Sistema de ubicaciones geográficas con natural keys:
- **countries**: PK=`id` (autoincrement), FK usa `iso_alpha2` (AR, US, ES) - 250 países
- **states**: PK=`code` (natural key: "AR-B", "US-CA", "MX-AGU") - 5,375 estados en DB
- **cities**: NO están en DB - servidas on-demand desde JSONs locales `data/geo/cities/{CC}.json` (~153k ciudades)
- En entidades (sites, devices, etc.) las ciudades se guardan como texto plano (`city`, `state_code`, `country_code`)
- Traducciones: países y estados en tablas `*_translations` para ES/EN; ciudades con traducciones inline en JSON
- Seed estados: `npm run db:seed:geo` (desde `data/geo/states.json`)
- Cache Redis: `states:{CC}:{lang}` y `cities:{stateCode}:{lang}` TTL 1h
- Endpoints: `GET /locations/countries/:cc/states`, `GET /locations/states/:code/cities`
- Fuente: CountryStateCity (github.com/dr5hn/countries-states-cities-database)

### dashboards
Dashboards multi-página con widgets y analytics:
- **8 tablas**: dashboards, dashboard_pages, widgets, widget_data_sources, dashboard_groups, dashboard_group_items, dashboard_collaborators, dashboard_group_collaborators
- **Public codes**: DSH-XXXXX-X (dashboards), DGR-XXXXX-X (grupos)
- **Widgets**: type es string libre (regex `/^[a-zA-Z][a-zA-Z0-9_]*$/`), definido por frontend. Config híbrida: layout JSONB, style_config JSONB, data_config JSONB
- **Data sources**: entity_type (channel/device/site/resource_hierarchy) + entity_id (public_code)
- **Widget Data**: `POST /:dashboardId/pages/:pageId/widgets/:widgetId/data` — consulta telemetría Cassandra en paralelo. Acepta overrides (dateRange, resolution, tz, variables)
- **Date ranges**: resolveDateRange() en dateUtils.js: today, yesterday, last_7d, last_30d, this_week, this_month, last_month, this_year, custom
- **ACL**: Colaboradores con roles viewer/editor por dashboard y por grupo
- **Cache**: Redis con prefijos `ec:v1:dashboards:list:` y `ec:v1:dashboard-groups:list:`
- **Paranoid**: Soft delete en dashboards y dashboard_groups
- **Modelos**: `src/modules/dashboards/models/` (8 archivos)
- **Migración**: `20260213100000-create-dashboards-module.cjs`
- **Rutas**: `/api/v1/dashboards/*` y `/api/v1/dashboard-groups/*`

### asset-categories
Sistema de tags jerárquicos para clasificar canales:
- **Modelo**: AssetCategory con Adjacency List + Materialized Path
- **Alcances**: `organization` (compartidos) y `user` (personales)
- **Jerarquía**: N niveles de profundidad (level numérico)
- **Performance**: Índices en path, scope+org_id, scope+user_id
- **Métodos**: getDescendants(), getAncestors() usando path
- **Integración**: Channel.belongsTo(AssetCategory) via `asset_category_id`
- **Endpoints**: Ver [asset-categories.md](endpoints/asset-categories.md)
- **Seed**: `node data/seed/seed-asset-categories.js <org_uuid>`

### device-metadata
Catálogos de metadatos para dispositivos (tipos, marcas, modelos, redes, servidores, licencias, etc.):
- **Patrón**: CRUD de catálogos con i18n (tablas `*_translations`)
- **Entidades**: DeviceType, DeviceBrand, DeviceModel, NetworkType, ServerType, LicenseType, ValidityPeriod
- **with_translations**: Todos los endpoints de listado soportan `?with_translations=true` para panel admin
- **Arquitectura**: Usa `controller.js` como capa intermedia entre routes y services
- **Modelos**: `src/modules/device-metadata/models/` (16 archivos)

### realtime
Infraestructura WebSocket + MQTT para telemetría en tiempo real:
- **Componentes**:
  - `wsServer.js` — Servidor WebSocket centralizado con upgrade handler en `/ws`
  - `mqtt/client.js` — Cliente MQTT multi-broker (3 brokers con deduplicación)
  - `services/tokenService.js` — Tokens efímeros (5min TTL, single-use, Redis)
  - `handlers/systemHandler.js` — EC:SYSTEM (AUTH, PING/PONG, sesiones)
  - `handlers/dashboardHandler.js` — EC:DASHBOARD (SUBSCRIBE/UNSUBSCRIBE, datos MQTT→WS)
  - `handlers/devHandler.js` — EC:DEV (debug MQTT crudo, roles admin+)
  - `handlers/notifyHandler.js` — EC:NOTIFY (placeholder Fase 4)
  - `handlers/iotHandler.js` — EC:IOT (placeholder Fase 5)
  - `handlers/chatbotHandler.js` — EC:CHATBOT (placeholder Fase 6)
- **Protocolo**: Mensajes EC:* con formato `{type, payload, timestamp, requestId}`
- **Seguridad**: Token efímero single-use, RBAC por mensaje, rate limiting (60 msgs/min)
- **MQTT**: 3 brokers como load balancers, topic `Solution/+/+/{deviceUUID}/#`, deduplicación 5s
- **Endpoint REST**: `POST /api/v1/realtime/token` → genera token efímero para conexión WS


