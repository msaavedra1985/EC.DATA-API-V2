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
| channels | `src/modules/channels/` | Canales de comunicación | [endpoints/channels.md](endpoints/channels.md) |
| files | `src/modules/files/` | Upload Azure Blob | [endpoints/files.md](endpoints/files.md) |
| telemetry | `src/modules/telemetry/` | Series temporales (Cassandra) | [endpoints/telemetry.md](endpoints/telemetry.md) |
| resource-hierarchy | `src/modules/resource-hierarchy/` | Árbol ltree | [endpoints/resource-hierarchy.md](endpoints/resource-hierarchy.md) |
| error-logs | `src/modules/error-logs/` | Logging errores frontend | [endpoints/error-logs.md](endpoints/error-logs.md) |
| dashboards | `src/modules/dashboards/` | Dashboards & Analytics multipágina | [endpoints/dashboards.md](endpoints/dashboards.md) |

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
| health | `src/modules/health/` | Health checks (`GET /health`, `GET /health/ready`) |
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

### dashboards (Nuevo)
Módulo de Dashboards & Analytics multipágina:
- **8 tablas**: dashboards, dashboard_pages, widgets, widget_data_sources, dashboard_groups, dashboard_group_items, dashboard_collaborators, dashboard_group_collaborators
- **Entidades públicas**: Dashboard (DSH-xxx), DashboardGroup (DGR-xxx) con public_code
- **Widgets**: Configuración híbrida JSON + relacional (layout JSONB, style_config JSONB, data_config JSONB)
- **Data Sources**: Vinculan widgets con recursos reales (entity_type: channel, device, site, resource_hierarchy)
- **Playlists**: DashboardGroup agrupa dashboards con orden (DashboardGroupItem)
- **ACLs**: Permisos granulares viewer/editor por dashboard y por grupo
- **Cascade**: Borrar dashboard → borra páginas, widgets, data sources, permisos
- **Paranoid**: Soft delete en dashboards y dashboard_groups
- **Modelos**: `src/modules/dashboards/models/` (8 archivos)
- **Migración**: `20260213100000-create-dashboards-module.cjs`

### asset-categories (Nuevo)
Sistema de tags jerárquicos para clasificar canales:
- **Modelo**: AssetCategory con Adjacency List + Materialized Path
- **Alcances**: `organization` (compartidos) y `user` (personales)
- **Jerarquía**: N niveles de profundidad (level numérico)
- **Performance**: Índices en path, scope+org_id, scope+user_id
- **Métodos**: getDescendants(), getAncestors() usando path
- **Integración**: Channel.belongsTo(AssetCategory) via `asset_category_id`
- **Endpoints**: Ver [asset-categories.md](endpoints/asset-categories.md)
- **Seed**: `node data/seed/seed-asset-categories.js <org_uuid>`

### dashboards (Nuevo)
Dashboards multi-página con widgets y analytics:
- **Modelos**: Dashboard, DashboardPage, Widget, WidgetDataSource, DashboardGroup, DashboardGroupItem, DashboardCollaborator, DashboardGroupCollaborator
- **Public codes**: DSH-XXXXX-X (dashboards), DGR-XXXXX-X (grupos)
- **Widgets**: line_chart, bar_chart, gauge, stat_card, table, map, heatmap, pie_chart, area_chart, scatter_chart
- **Data sources**: entity_type (channel/device/site/resource_hierarchy) + entity_id (public_code)
- **ACL**: Colaboradores con roles viewer/editor por dashboard y por grupo
- **Cache**: Redis con prefijos ec:v1:dashboards:list: y ec:v1:dashboard-groups:list:
- **Endpoints**: Ver [dashboards.md](endpoints/dashboards.md)
- **Rutas**: `/api/v1/dashboards/*` y `/api/v1/dashboard-groups/*`
