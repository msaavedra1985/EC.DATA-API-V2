# Guía Maestra de Migración de Plataforma

> **CONSULTAR** antes de planificar o ejecutar cualquier migración de organización o tabla nueva.
>
> Para la migración puntual de devices/channels (caso Sirenis), ver también: `agent-docs/migration-guide.md`

---

## Índice

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema de Migración](#2-arquitectura-del-sistema-de-migración)
3. [Clasificación de Tablas](#3-clasificación-de-tablas)
4. [Orden de Inserción — Dependencias](#4-orden-de-inserción--dependencias)
5. [Patrón Canónico de Script](#5-patrón-canónico-de-script)
6. [Helpers y Funciones Disponibles](#6-helpers-y-funciones-disponibles)
7. [Campos Obligatorios por Tabla](#7-campos-obligatorios-por-tabla)
8. [Mapeo de Datos Legacy → Nuevas Tablas](#8-mapeo-de-datos-legacy--nuevas-tablas)
9. [El UUID Operacional y Cassandra](#9-el-uuid-operacional-y-cassandra)
10. [Cómo Agregar una Nueva Organización](#10-cómo-agregar-una-nueva-organización)
11. [Cómo Agregar una Nueva Tabla](#11-cómo-agregar-una-nueva-tabla)
12. [Checklist Pre-Migración](#12-checklist-pre-migración)
13. [Checklist Post-Migración](#13-checklist-post-migración)
14. [Registro de Migraciones](#14-registro-de-migraciones)
15. [Archivos Clave de Referencia](#15-archivos-clave-de-referencia)

---

## 1. Visión General

La migración de la plataforma legacy (SQL Server) a EC.DATA (PostgreSQL) se divide en **dos fases independientes**:

```
Fase 1: Core Seed          ← Se ejecuta UNA VEZ en cualquier instalación nueva
   └── npm run db:seed:core
       ├── roles (7)
       ├── countries + estados
       ├── measurement_types + variables (con traducciones)
       ├── device_types, brands, models, networks, servers, licenses, validity_periods
       └── usuario admin

Fase 2: Org Migration      ← Se ejecuta UNA VEZ POR ORGANIZACIÓN a migrar
   └── node scripts/migrate-{org}.js
       ├── organization
       ├── sites
       ├── users + user_organizations
       ├── devices
       ├── channels
       ├── channel_variables
       └── (asset_categories, resource_hierarchy — si aplica)
```

**Regla fundamental**: Nunca mezclar ambas fases. El Core Seed no depende de ninguna organización. La Org Migration asume que el Core Seed ya fue ejecutado correctamente.

---

## 2. Arquitectura del Sistema de Migración

```
┌─────────────────────────────────────────────────────────┐
│                   PLATAFORMA LEGACY                     │
│                   (SQL Server)                          │
│                                                         │
│  Equipos → Canales → Canales_Variables                  │
│  Usuarios → Organizaciones → Sitios                     │
│  Variables → Tipos_Medicion → Marcas → Modelos          │
└──────────────────┬──────────────────────────────────────┘
                   │ Export JSON
                   ▼
┌─────────────────────────────────────────────────────────┐
│              attached_assets/{org}/                     │
│                                                         │
│  Equipos_{org}_*.json                                   │
│  Canales_{org}_*.json                                   │
│  Canales_Variables_{org}_*.json                         │
│  (+ otros según lo que exporte la plataforma legacy)    │
└──────────────────┬──────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌─────────────────┐  ┌───────────────────────────────────┐
│  db:seed:core   │  │  scripts/migrate-{org}.js         │
│  (una vez)      │  │  (una vez por org)                │
│                 │  │                                   │
│  • roles        │  │  1. Valida mapeos contra DB       │
│  • countries    │  │  2. Verifica idempotencia         │
│  • device meta  │  │  3. Transacción única:            │
│  • telemetría   │  │     - organization                │
│  • admin user   │  │     - sites                       │
└─────────────────┘  │     - users / user_organizations  │
                     │     - devices                     │
                     │     - channels                    │
                     │     - channel_variables           │
                     └───────────────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │      PostgreSQL (EC.DATA)    │
                     └─────────────────────────────┘
```

---

## 3. Clasificación de Tablas

La DB tiene 44+ tablas. Se clasifican en 4 grupos según cómo se manejan en la migración:

### Grupo A — Core Seed (universales, una vez)

Se cargan con `npm run db:seed:core`. Son datos de la plataforma que NO varían por organización.

| Tabla | Seeder | Registros actuales |
|-------|--------|-------------------|
| `roles` | `roles.seeder.js` | 7 |
| `countries` | `countries.seeder.js` | ~250 |
| `states` | `geo-data.seeder.js` | ~5.000 |
| `country_translations` | idem | idem |
| `state_translations` | idem | idem |
| `measurement_types` + `_translations` | `telemetry.seeder.js` | 4 |
| `variables` + `_translations` | idem | 75 |
| `device_types` + `_translations` | `device-metadata.seeder.js` | 9 |
| `device_brands` + `_translations` | idem | 26 |
| `device_models` | idem | 70 |
| `device_networks` + `_translations` | idem | 9 |
| `device_servers` + `_translations` | idem | 11 |
| `device_licenses` + `_translations` | idem | 7 |
| `device_validity_periods` + `_translations` | idem | 4 |

> **Al agregar nuevas marcas, modelos, tipos, etc.**: actualizar `device-metadata.seeder.js` con los datos reales de la DB (nunca inventar).

### Grupo B — Por Organización (Org Migration)

Se insertan con el script `scripts/migrate-{org}.js`. Varían por cliente.

| Tabla | Fuente | Notas |
|-------|--------|-------|
| `organizations` | Manual o legacy | Debe existir ANTES de ejecutar el script |
| `organization_countries` | Manual | FK a organizations + countries |
| `sites` | Legacy `Sitios` o manual | FK a organizations, countries |
| `users` | Legacy `Usuarios` | Genera hash de password temporal |
| `user_organizations` | Legacy roles | FK a users + organizations + roles |
| `devices` | Legacy `Equipos` | FK a organizations, sites, device_brands, etc. |
| `channels` | Legacy `Canales` | FK a devices, organizations, measurement_types |
| `channel_variables` | Legacy `Canales_Variables` | FK a channels, variables |
| `asset_categories` | Legacy si aplica | Jerarquía de tags para canales |
| `resource_hierarchy` | Derivado | Árbol de sitios/devices/channels |

### Grupo C — Runtime (NO migrar, se generan solos)

| Tabla | Por qué no migrar |
|-------|------------------|
| `audit_logs` | Se generan automáticamente en cada operación CUD |
| `refresh_tokens` | Son tokens de sesión, expiran, no tienen valor histórico |
| `error_logs` | Logs de errores de la nueva plataforma, no de la legacy |
| `organization_resource_counters` | Se actualiza automáticamente via triggers/lógica del API |
| `SequelizeMeta` | Gestionado por `npm run db:migrate` |

### Grupo D — Post-Migración Manual (opcional)

Funcionalidades nuevas de EC.DATA que no existen en la plataforma legacy. Se crean directamente en la nueva plataforma por los usuarios.

| Tabla | Qué es |
|-------|--------|
| `dashboards` | Dashboards multi-página |
| `dashboard_pages` | Páginas de un dashboard |
| `dashboard_groups` | Grupos de widgets |
| `dashboard_group_items` | Relación grupo-widget |
| `dashboard_collaborators` | Permisos de acceso al dashboard |
| `dashboard_group_collaborators` | idem |
| `widgets` | Widgets individuales |
| `widget_data_sources` | Fuentes de datos de cada widget |
| `file_uploads` | Archivos subidos en la nueva plataforma |
| `user_resource_access` | Permisos granulares por recurso |

---

## 4. Orden de Inserción — Dependencias

Las tablas del **Grupo B** tienen dependencias FK estrictas. El orden es obligatorio:

```
organizations
    │
    ├── sites (FK: organizations, countries)
    │
    ├── users (FK: organizations vía user_organizations)
    │   └── user_organizations (FK: users, organizations, roles)
    │
    └── devices (FK: organizations, sites, device_brands, device_models,
        │         device_types, device_servers, device_networks,
        │         device_licenses, device_validity_periods)
        │
        └── channels (FK: devices, organizations, measurement_types)
            │
            └── channel_variables (FK: channels, variables)
                
asset_categories (FK: organizations) — independiente, puede ir antes de channels
resource_hierarchy (FK: sites, devices, channels) — siempre al final
```

**Tabla de orden de inserción**:

| Paso | Tabla | Depende de |
|------|-------|-----------|
| 1 | `organizations` | — |
| 2 | `organization_countries` | `organizations`, `countries` |
| 3 | `sites` | `organizations`, `countries` |
| 4 | `users` | — (la relación va en user_organizations) |
| 5 | `user_organizations` | `users`, `organizations`, `roles` |
| 6 | `devices` | `organizations`, `sites`*, `device_brands`*, `device_models`*, `device_types`*, `device_servers`*, `device_networks`*, `device_licenses`*, `device_validity_periods`* |
| 7 | `channels` | `devices`, `organizations`, `measurement_types` |
| 8 | `channel_variables` | `channels`, `variables` |
| 9 | `asset_categories` | `organizations` |
| 10 | `resource_hierarchy` | `sites`, `devices`, `channels` |

*= puede ser null, el FK no es obligatorio

---

## 5. Patrón Canónico de Script

Todo script de migración de organización **debe seguir este patrón**. Usarlo como base al crear `scripts/migrate-{org}.js`:

```javascript
// scripts/migrate-{org}.js
import { v7 as uuidv7 } from 'uuid';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../src/db/sql/sequelize.js';
import Device from '../src/modules/devices/models/Device.js';
import Channel from '../src/modules/channels/models/Channel.js';
import { generatePublicCode } from '../src/utils/identifiers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, '..', 'attached_assets', '{org}');

// ─── 1. CONSTANTES ───────────────────────────────────────────
// UUID de la organización — debe existir antes de ejecutar el script
const ORG_ID = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

// Mapeo fijo: ID legacy → ID nuevo en measurement_types
const MEASUREMENT_TYPE_MAP = {
    1: 1,  // Energía eléctrica → electric_energy
    3: 2,  // IoT Control
    4: 3,  // IoT
    6: 4,  // IoT Lectura
    // Agregar nuevos si la org tiene tipos adicionales
};

// Mapeo de variables: ID legacy → ID nuevo + validación
// Cada entrada verifica que el variable existe en la DB con el code y unit esperados
const VARIABLE_MAP = {
    24: { newId: 20, expectedCode: 'iot_temperature', expectedUnit: 'ºC' },
    // ... agregar todos los que use esta org
};

// ─── 2. HELPERS ──────────────────────────────────────────────
function loadJson(filename) {
    return JSON.parse(readFileSync(resolve(ASSETS, filename), 'utf-8'));
}

async function getNextHumanId(model, transaction) {
    await sequelize.query(
        `LOCK TABLE "${model.tableName}" IN EXCLUSIVE MODE`,
        { transaction }
    );
    const [result] = await sequelize.query(
        `SELECT COALESCE(MAX(human_id), 0) + 1 as next_id FROM "${model.tableName}"`,
        { transaction, type: sequelize.QueryTypes.SELECT }
    );
    return result.next_id;
}

// ─── 3. VALIDACIONES PREVIAS (fallan rápido antes de tocar la DB) ───
async function validateMeasurementTypes() {
    const targetIds = Object.values(MEASUREMENT_TYPE_MAP);
    const [dbTypes] = await sequelize.query(
        `SELECT id FROM measurement_types WHERE id IN (:ids)`,
        { replacements: { ids: targetIds } }
    );
    if (dbTypes.length !== targetIds.length) {
        const missing = targetIds.filter(id => !dbTypes.map(t => t.id).includes(id));
        throw new Error(`measurement_types faltantes en DB: ${missing.join(', ')}`);
    }
    console.log(`✓ ${targetIds.length} measurement_types validados`);
}

async function validateVariableMappings() {
    const targetIds = Object.values(VARIABLE_MAP).map(v => v.newId);
    const [dbVars] = await sequelize.query(
        `SELECT id, code, unit FROM variables WHERE id IN (:ids)`,
        { replacements: { ids: targetIds } }
    );
    const dbMap = Object.fromEntries(dbVars.map(v => [v.id, v]));
    for (const [oldId, mapping] of Object.entries(VARIABLE_MAP)) {
        const dbVar = dbMap[mapping.newId];
        if (!dbVar) throw new Error(`Variable newId=${mapping.newId} (oldId=${oldId}) no existe en DB`);
        if (dbVar.code !== mapping.expectedCode) throw new Error(`Variable ${mapping.newId}: code esperado="${mapping.expectedCode}", encontrado="${dbVar.code}"`);
        if (dbVar.unit !== mapping.expectedUnit) throw new Error(`Variable ${mapping.newId}: unit esperado="${mapping.expectedUnit}", encontrado="${dbVar.unit}"`);
    }
    console.log(`✓ ${targetIds.length} variables validadas`);
}

async function checkOrgExists() {
    const [rows] = await sequelize.query(
        `SELECT id FROM organizations WHERE id = :orgId`,
        { replacements: { orgId: ORG_ID } }
    );
    if (rows.length === 0) {
        throw new Error(`Organización ${ORG_ID} no existe en la DB. Crearla antes de migrar.`);
    }
    console.log(`✓ Organización encontrada`);
}

async function checkIdempotency() {
    const [result] = await sequelize.query(
        `SELECT COUNT(*) as count FROM devices WHERE organization_id = :orgId`,
        { replacements: { orgId: ORG_ID }, type: sequelize.QueryTypes.SELECT }
    );
    if (parseInt(result.count) > 0) {
        console.log(`\n⚠  Ya existen ${result.count} dispositivos para esta org.`);
        console.log('   Para re-ejecutar: node scripts/migrate-{org}.js --clean\n');
        return false;
    }
    return true;
}

async function cleanOrgData() {
    console.log('Limpiando datos existentes...');
    const transaction = await sequelize.transaction();
    try {
        await sequelize.query(`DELETE FROM channel_variables WHERE channel_id IN (SELECT id FROM channels WHERE organization_id = :orgId)`, { replacements: { orgId: ORG_ID }, transaction });
        await sequelize.query(`DELETE FROM channels WHERE organization_id = :orgId`, { replacements: { orgId: ORG_ID }, transaction });
        await sequelize.query(`DELETE FROM devices WHERE organization_id = :orgId`, { replacements: { orgId: ORG_ID }, transaction });
        await transaction.commit();
        console.log('✓ Limpieza completada');
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

// ─── 4. MIGRACIÓN PRINCIPAL ──────────────────────────────────
async function migrate() {
    console.log(`\n═══ Migración {Org} ═══\n`);

    if (process.argv.includes('--clean')) {
        await cleanOrgData();
    }

    // Validaciones — fallan antes de abrir la transacción
    await checkOrgExists();
    await validateMeasurementTypes();
    await validateVariableMappings();

    const canProceed = await checkIdempotency();
    if (!canProceed) {
        await sequelize.close();
        process.exit(0);
    }

    // Cargar JSONs
    const equipos = loadJson('Equipos_{org}_*.json');
    const canales = loadJson('Canales_{org}_*.json');
    const canalesVariables = loadJson('Canales_Variables_*.json');

    const transaction = await sequelize.transaction();

    try {
        // 1. Devices
        console.log('1/3 Insertando devices...');
        let deviceHumanId = await getNextHumanId(Device, transaction);
        const oldIdToNewUuid = {};

        for (const eq of equipos) {
            const newUuid = uuidv7();
            await Device.create({
                id: newUuid,
                humanId: deviceHumanId++,
                publicCode: generatePublicCode('DEV'),
                organizationId: ORG_ID,
                siteId: null,                             // asignar post-migración
                name: eq.nombre,
                uuid: eq.uuid || null,                    // UUID operacional (clave para Cassandra)
                macAddress: eq.mac || null,
                timezone: eq.timezone || null,
                latitude: eq.lat || null,
                longitude: eq.lon || null,
                topic: eq.topic || null,
                brandId: eq.equiposMarcaId || null,
                modelId: eq.equiposModeloId || null,
                deviceTypeId: null,
                serverId: null,
                networkId: null,
                licenseId: null,
                validityPeriodId: null,
                status: eq.activo === '1' ? 'active' : 'inactive',
                isActive: eq.activo === '1',
                lastSeenAt: eq.lastReport && !eq.lastReport.startsWith('1899') ? new Date(eq.lastReport) : null,
                createdAt: new Date(eq.createdAt),
                updatedAt: new Date(eq.updatedAt),
            }, { transaction });
            oldIdToNewUuid[eq.id] = newUuid;
        }

        // 2. Channels
        console.log('2/3 Insertando channels...');
        let channelHumanId = await getNextHumanId(Channel, transaction);
        const oldChannelIdToNewUuid = {};
        let skipped = 0;

        for (const ch of canales) {
            const deviceUuid = oldIdToNewUuid[ch.equipoId];
            if (!deviceUuid) { skipped++; continue; }
            const newMtId = MEASUREMENT_TYPE_MAP[ch.tipoMedicionId];
            if (!newMtId) { console.warn(`Canal ${ch.id}: tipo medición ${ch.tipoMedicionId} no mapeado`); skipped++; continue; }

            const newUuid = uuidv7();
            await Channel.create({
                id: newUuid,
                humanId: channelHumanId++,
                publicCode: generatePublicCode('CHN'),
                deviceId: deviceUuid,
                organizationId: ORG_ID,
                name: ch.nombre,
                description: ch.descripcion || null,
                ch: ch.ch,
                measurementTypeId: newMtId,
                phaseSystem: ch.sistema || 0,
                phase: ch.fase || null,
                process: ch.procesar === '1',
                status: ch.activo === '1' ? 'active' : 'inactive',
                isActive: ch.activo === '1',
                lastSyncAt: ch.lastReport ? new Date(ch.lastReport) : null,
                createdAt: new Date(ch.createdAt),
                updatedAt: new Date(ch.updatedAt),
            }, { transaction });
            oldChannelIdToNewUuid[ch.id] = newUuid;
        }

        // 3. Channel Variables
        console.log('3/3 Insertando channel_variables...');
        let insertedCv = 0;
        for (const cv of canalesVariables) {
            const channelUuid = oldChannelIdToNewUuid[cv.canaleId];
            if (!channelUuid) continue;
            const mapping = VARIABLE_MAP[cv.variableId];
            if (!mapping) continue;

            await sequelize.query(
                `INSERT INTO channel_variables (channel_id, variable_id, is_active, display_order, created_at, updated_at)
                 VALUES (:channelId, :variableId, :isActive, :displayOrder, NOW(), NOW())`,
                { replacements: { channelId: channelUuid, variableId: mapping.newId, isActive: cv.activo === '1', displayOrder: ++insertedCv }, transaction }
            );
        }

        await transaction.commit();

        console.log(`\n═══ Migración completada ═══`);
        console.log(`  Devices:           ${equipos.length}`);
        console.log(`  Channels:          ${canales.length - skipped} (${skipped} omitidos)`);
        console.log(`  Channel_Variables: ${insertedCv}`);

    } catch (error) {
        await transaction.rollback();
        console.error('✗ Error, rollback ejecutado:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

migrate();
```

---

## 6. Helpers y Funciones Disponibles

**Archivo**: `src/utils/identifiers.js`

| Función | Firma | Uso |
|---------|-------|-----|
| `generateUuidV7()` | `() → string` | UUID v7 para nuevos registros. Siempre usarlo para el campo `id` de entidades nuevas. |
| `generatePublicCode(prefix)` | `(string) → string` | Genera `DEV-4X9-R2T`. Usar para el campo `public_code`. Prefijos estándar: `DEV`, `CHN`, `ORG`, `SITE`, `USR`, `DSH`. |
| `generatePublicCodeWithRetry(prefix, model, field, maxAttempts)` | `async → string` | Igual que el anterior pero verifica unicidad en DB. Usar en entidades de alta concurrencia. |
| `generateHumanId(model, scopeField, scopeValue, options)` | `async → number` | `MAX(human_id) + 1` con scope opcional. Para devices/channels, usar el patrón de LOCK de tabla (ver sección 5) en lugar de esta función para evitar race conditions. |
| `isValidPublicCode(code, prefix?)` | `(string, string?) → boolean` | Valida formato. Útil en validaciones de input. |

**Patrón `getNextHumanId` con LOCK** (para inserciones masivas en transacción):
```javascript
// Usado en migrate-sirenis.js — garantiza unicidad sin race conditions
async function getNextHumanId(model, transaction) {
    await sequelize.query(
        `LOCK TABLE "${model.tableName}" IN EXCLUSIVE MODE`,
        { transaction }
    );
    const [result] = await sequelize.query(
        `SELECT COALESCE(MAX(human_id), 0) + 1 as next_id FROM "${model.tableName}"`,
        { transaction, type: sequelize.QueryTypes.SELECT }
    );
    return result.next_id; // Incrementar manualmente: deviceHumanId++
}
```

---

## 7. Campos Obligatorios por Tabla

### `organizations`

| Campo | Fuente | Generado | Null permitido |
|-------|--------|----------|---------------|
| `id` | — | `uuidv7()` | NO |
| `human_id` | — | `MAX(human_id)+1` | NO |
| `public_code` | — | `generatePublicCode('ORG')` | NO |
| `slug` | legacy / manual | — | NO |
| `name` | legacy | — | NO |
| `country_id` | legacy | — | Sí (recomendado llenar) |
| `is_active` | legacy | — | NO (default true) |

### `sites`

| Campo | Fuente | Generado | Null permitido |
|-------|--------|----------|---------------|
| `id` | — | `uuidv7()` | NO |
| `human_id` | — | `MAX(human_id)+1` | NO |
| `public_code` | — | `generatePublicCode('SITE')` | NO |
| `organization_id` | constante `ORG_ID` | — | NO |
| `name` | legacy | — | NO |
| `country_code` | legacy (`iso_alpha2`) | — | Sí |
| `timezone` | legacy | — | Sí |

### `users`

| Campo | Fuente | Generado | Null permitido |
|-------|--------|----------|---------------|
| `id` | — | `uuidv7()` | NO |
| `email` | legacy | — | NO (unique) |
| `password_hash` | — | hash temporal | NO |
| `first_name`, `last_name` | legacy | — | Sí |
| `is_active` | legacy | — | NO |

> Para la migración, generar un hash temporal: `import bcrypt from 'bcrypt'; const hash = await bcrypt.hash('ChangeMe123!', 12);`. El usuario cambia su password en el primer login.

### `user_organizations`

| Campo | Fuente | Notas |
|-------|--------|-------|
| `user_id` | FK de users insertados | — |
| `organization_id` | constante `ORG_ID` | — |
| `role_id` | FK de roles (lookup por name) | Usar `SELECT id FROM roles WHERE name = 'org-admin'` |
| `is_primary` | legacy o default `true` | Una organización principal por usuario |

### `devices`

| Campo | Fuente | Generado | Null permitido |
|-------|--------|----------|---------------|
| `id` | — | `uuidv7()` | NO |
| `human_id` | — | LOCK + MAX+1 | NO |
| `public_code` | — | `generatePublicCode('DEV')` | NO |
| `organization_id` | constante `ORG_ID` | — | NO |
| `site_id` | — | — | **Sí** (asignar post-migración) |
| `name` | `eq.nombre` | — | NO |
| `uuid` | `eq.uuid` | — | **Sí** (crítico para Cassandra, ver sección 9) |
| `mac_address` | `eq.mac` | — | Sí |
| `topic` | `eq.topic` | — | Sí (MQTT topic) |
| `brand_id` | `eq.equiposMarcaId` | — | Sí (int, directo del legacy) |
| `model_id` | `eq.equiposModeloId` | — | Sí (int, directo del legacy) |
| `device_type_id` | — | — | **Sí** (asignar post-migración o mapear) |
| `server_id` | — | — | Sí |
| `status` | `eq.activo === '1'` | `'active' / 'inactive'` | NO |
| `last_seen_at` | `eq.lastReport` | Filtrar fechas 1899 (son null) | Sí |
| `created_at` / `updated_at` | `eq.createdAt / updatedAt` | `new Date()` | NO |

### `channels`

| Campo | Fuente | Generado | Null permitido |
|-------|--------|----------|---------------|
| `id` | — | `uuidv7()` | NO |
| `human_id` | — | LOCK + MAX+1 | NO |
| `public_code` | — | `generatePublicCode('CHN')` | NO |
| `device_id` | mapa `oldId→newUuid` | — | NO |
| `organization_id` | constante `ORG_ID` | — | NO |
| `name` | `ch.nombre` | — | NO |
| `ch` | `ch.ch` | — | NO (número de canal) |
| `measurement_type_id` | `MEASUREMENT_TYPE_MAP[ch.tipoMedicionId]` | — | NO |
| `phase_system` | `ch.sistema` | 0 si null | NO |
| `phase` | `ch.fase` | — | Sí |
| `process` | `ch.procesar === '1'` | — | NO |
| `status` | `ch.activo === '1'` | `'active' / 'inactive'` | NO |

### `channel_variables`

| Campo | Fuente | Notas |
|-------|--------|-------|
| `channel_id` | mapa `oldChannelId→newUuid` | — |
| `variable_id` | `VARIABLE_MAP[cv.variableId].newId` | — |
| `is_active` | `cv.activo === '1'` | — |
| `display_order` | incremental | Usar contador de inserción |

---

## 8. Mapeo de Datos Legacy → Nuevas Tablas

### Measurement Types (fijo para todos los clientes)

| Legacy ID | Legacy Nombre | New ID | New Code |
|-----------|--------------|--------|----------|
| 1 | Energía eléctrica | 1 | `electric_energy` |
| 3 | IoT Control | 2 | `iot_control` |
| 4 | IoT | 3 | `iot` |
| 6 | IoT Lectura | 4 | `iot_reading` |

### Variables — Mapeo Base (Sirenis / genérico)

Ver tabla completa en `agent-docs/migration-guide.md` sección 2.

> **Si una org tiene variables que no están en este mapeo**: primero verificar si el code existe en la tabla `variables` de PG. Si no existe, crearlo via el seeder de telemetría y luego agregar al `VARIABLE_MAP` del script.

### Activo/Inactivo legacy → status + is_active

```javascript
// Equipos y canales legacy guardan activo como string '1'/'0'
status: eq.activo === '1' ? 'active' : 'inactive',
isActive: eq.activo === '1',
```

### Fechas legacy → timestamps PG

```javascript
// Fechas normales
createdAt: new Date(eq.createdAt),   // → ISO 8601 automáticamente

// Fechas con valor "1899-..." son null reales en la legacy
lastSeenAt: eq.lastReport && !eq.lastReport.startsWith('1899')
    ? new Date(eq.lastReport)
    : null,
```

### brand_id / model_id legacy → device_brands / device_models

Los IDs enteros de la legacy **corresponden directamente** a los IDs de la tabla `device_brands` y `device_models` en PG, porque el Core Seed los inserta con los mismos IDs que tenía la plataforma original.

```javascript
brandId: eq.equiposMarcaId || null,   // int, directo del legacy
modelId: eq.equiposModeloId || null,  // int, directo del legacy
```

---

## 9. El UUID Operacional y Cassandra

Este punto es **crítico** para que la telemetría histórica funcione después de la migración.

Cada dispositivo tiene dos identificadores distintos:

| Campo | Qué es | Usado por |
|-------|--------|-----------|
| `devices.id` | UUID v7 autogenerado | PostgreSQL, relaciones internas, API |
| `devices.uuid` | UUID operacional del hardware | Cassandra (datos históricos), MQTT topic |

El campo `devices.uuid` es el UUID con el que el equipo físico se identifica y con el que sus datos de telemetría están almacenados en Cassandra. Si se pierde o se mapea incorrectamente, el API no podrá recuperar el historial del dispositivo.

**Flujo de resolución UUID en el metadataRepository**:
```
1. devices.metadata->>'legacy_uuid'  ← Casos especiales con UUID diferente
2. devices.uuid                      ← UUID operacional (caso estándar)
3. devices.id                        ← Fallback para dispositivos nativos de EC.DATA
```

**Regla**: Al migrar equipos, **siempre** cargar `devices.uuid` con el valor de `eq.uuid` del JSON legacy. Este es el mismo UUID que Cassandra conoce para los datos históricos del equipo.

---

## 10. Cómo Agregar una Nueva Organización

Checklist completo para cuando llega una org nueva a migrar:

### Antes del script

- [ ] **Exportar JSONs** del SQL Server legacy: `Equipos`, `Canales`, `Canales_Variables` (mínimo). Opcionalmente: `Usuarios`, `Sitios`, `Variables` si difieren del core.
- [ ] **Colocar en** `attached_assets/{nombre-org}/`
- [ ] **Crear la organización** en la DB:
  ```sql
  -- Opción A: via API (POST /organizations con system-admin)
  -- Opción B: manual en DB
  INSERT INTO organizations (id, human_id, public_code, slug, name, is_active, created_at, updated_at)
  VALUES (gen_random_uuid(), (SELECT COALESCE(MAX(human_id),0)+1 FROM organizations), 'ORG-XXX-YYY', 'slug-org', 'Nombre Org', true, NOW(), NOW());
  ```
- [ ] **Anotar el UUID** de la org recién creada (será el `ORG_ID` del script).
- [ ] **Verificar `brand_id` y `model_id`**: chequear en el export si referencian IDs de marcas que existen en `device_brands`. Si hay marcas nuevas, agregarlas al `device-metadata.seeder.js`.
- [ ] **Verificar variables**: listar todos los `variableId` únicos del export de `Canales_Variables` y verificar que cada uno esté en el `VARIABLE_MAP` o en la tabla `variables`.

### Crear el script

```bash
cp scripts/migrate-sirenis.js scripts/migrate-{org}.js
```

Ajustar:
1. `ORG_ID` → UUID de la org destino
2. `ASSETS` → ruta a `attached_assets/{org}/`
3. Nombres de archivos JSON en `loadJson()`
4. `MEASUREMENT_TYPE_MAP` → validar que todos los tipos usados por esta org estén mapeados
5. `VARIABLE_MAP` → agregar/quitar variables según lo que use esta org

### Ejecutar y verificar

```bash
# Dry-run: ver qué haría (agregar flag --dry-run si se implementa)
node scripts/migrate-{org}.js

# Si hay datos previos (re-run):
node scripts/migrate-{org}.js --clean

# Verificar conteos post-migración:
node -e "
import sequelize from './src/db/sql/sequelize.js';
import { QueryTypes } from 'sequelize';
const orgId = 'UUID-ORG';
const [d] = await sequelize.query('SELECT COUNT(*) as c FROM devices WHERE organization_id = :id', { replacements: { id: orgId }, type: QueryTypes.SELECT });
const [ch] = await sequelize.query('SELECT COUNT(*) as c FROM channels WHERE organization_id = :id', { replacements: { id: orgId }, type: QueryTypes.SELECT });
console.log('devices:', d.c, '| channels:', ch.c);
await sequelize.close();
"
```

---

## 11. Cómo Agregar una Nueva Tabla

### Si la tabla es universal (Core Seed)

Por ejemplo: se agrega una tabla `device_protocols` a la plataforma.

1. Crear la migración SQL: `npm run db:generate:migration`
2. Agregar la data real al seeder correspondiente (actualizar `device-metadata.seeder.js` o crear uno nuevo)
3. Si es un seeder nuevo, importarlo y ejecutarlo en `core-seed.js`:
   ```javascript
   // En core-seed.js
   import { seedDeviceProtocols } from './device-protocols.seeder.js';
   // ...
   const deviceProtocols = await seedDeviceProtocols();
   ```
4. Actualizar el log del `runCoreSeed()` para incluir el nuevo contador
5. **NUNCA inventar datos** — siempre usar los datos exactos de la DB de producción

### Si la tabla es por organización (Org Migration)

Por ejemplo: se agrega una tabla `meters` específica de la org.

1. Agregar una nueva función al script de la org:
   ```javascript
   // Al final de la transacción en migrate(), DESPUÉS de channel_variables
   async function insertMeters(equipos, oldIdToNewUuid, transaction) {
       let count = 0;
       for (const eq of equipos.filter(e => e.tipoMetro)) {
           await sequelize.query(
               `INSERT INTO meters (device_id, ...) VALUES (:deviceId, ...) ON CONFLICT DO NOTHING`,
               { replacements: { deviceId: oldIdToNewUuid[eq.id], ... }, transaction }
           );
           count++;
       }
       return count;
   }
   ```
2. Llamarla dentro de la transacción principal respetando el orden de dependencias
3. **No modificar** las funciones existentes del script — solo agregar nuevas al final

### Reglas al agregar cualquier tabla nueva

- Siempre usar `ON CONFLICT DO NOTHING` o check de existencia → idempotencia
- Siempre dentro de la transacción principal → atomicidad
- Si la tabla tiene FK, respetar el orden de la sección 4
- Documentar el nuevo mapeo en la sección 8 de esta guía

---

## 12. Checklist Pre-Migración

- [ ] `npm run db:seed:core` ya fue ejecutado y validado
- [ ] JSONs exportados y colocados en `attached_assets/{org}/`
- [ ] Organización destino creada en DB (anotar UUID)
- [ ] Todos los `brand_id` del export existen en `device_brands`
- [ ] Todos los `variableId` del export están en `VARIABLE_MAP` del script
- [ ] Todos los `tipoMedicionId` del export están en `MEASUREMENT_TYPE_MAP`
- [ ] Hacer backup de la DB: `pg_dump $DATABASE_URL > backup_pre_{org}_{fecha}.sql`
- [ ] El script pasa las validaciones previas sin errores (correr solo las validaciones antes del migrate)

---

## 13. Checklist Post-Migración

- [ ] Verificar conteos: `SELECT COUNT(*) FROM devices/channels/channel_variables WHERE organization_id = 'UUID'`
- [ ] Verificar sample de datos: nombres, UUIDs, MACs, variables asignadas, timestamps
- [ ] Los `devices.uuid` están correctamente migrados (crítico para Cassandra)
- [ ] El API responde para la org: `GET /v1/organizations/{publicCode}/devices`
- [ ] Telemetría histórica accesible: probar endpoint de telemetría en al menos un canal
- [ ] Asignar `site_id` a los dispositivos (si aplica)
- [ ] Asignar `asset_category_id` a los canales (si aplica)
- [ ] Probar idempotencia: correr el script de nuevo sin `--clean` (debe detectar datos existentes y abortar)
- [ ] Registrar en la tabla de migraciones de la sección 14

---

## 14. Registro de Migraciones

> Actualizar esta tabla cada vez que se migra una organización.

| Organización | Fecha | Devices | Channels | Ch_Variables | Script | Notas |
|---|---|---|---|---|---|---|
| Sirenis | 2026-02-12 | 41 | 299 | 151 | `migrate-sirenis.js` | Primera migración de referencia |

---

## 15. Archivos Clave de Referencia

| Archivo | Qué es |
|---------|--------|
| `scripts/migrate-sirenis.js` | Script de migración de referencia (Sirenis). Usar como base para nuevas orgs. |
| `src/db/seeders/core-seed.js` | Orquestador del Core Seed. Punto de entrada de `npm run db:seed:core`. |
| `src/db/seeders/device-metadata.seeder.js` | Data exacta de la plataforma: 9 tipos, 26 marcas, 70 modelos, 9 redes, 11 servers, 7 licencias. |
| `src/db/seeders/telemetry.seeder.js` | 4 measurement_types + 75 variables con traducciones ES/EN. |
| `src/db/seeders/roles.seeder.js` | 7 roles del sistema RBAC. |
| `src/utils/identifiers.js` | `generateUuidV7`, `generatePublicCode`, `generatePublicCodeWithRetry`, `generateHumanId`. |
| `src/modules/telemetry/repositories/metadataRepository.js` | Resolución UUID para Cassandra (prioridad: legacy_uuid → uuid → id). |
| `agent-docs/migration-guide.md` | Guía de migración original (detalla mapeo de campos de Equipos/Canales/Variables). |
| `exports/sirenis-devices.sql` | SQL de dispositivos y canales de Sirenis (formato para importar directo a PG). |
| `attached_assets/` | JSONs exportados de la plataforma legacy por organización. |
