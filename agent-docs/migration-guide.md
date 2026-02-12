# Guía de Migración: Legacy SQL Server → EC.DATA PostgreSQL

> **CONSULTAR**: Antes de crear cualquier script de migración de datos desde la plataforma anterior

## Resumen

Esta guía documenta el proceso probado con la migración de Sirenis (2026-02-12) para replicarlo con otras organizaciones de la plataforma legacy.

**Script de referencia**: `scripts/migrate-sirenis.js`

---

## 1. Datos de Entrada

### Exportar JSONs desde la plataforma anterior

Se necesitan mínimo 3 exports de SQL Server:

| Tabla legacy | Archivo esperado | Descripción |
|---|---|---|
| `Equipos` | `Equipos_{org}_*.json` | Dispositivos físicos |
| `Canales` | `Canales_{org}_*.json` | Canales de medición por equipo |
| `Canales_Variables` | `Canales_Variables_*.json` | Relación canal↔variable |

Colocar en `attached_assets/`.

### Campos relevantes de cada export

**Equipos (→ devices)**:
```
id, nombre, uuid, mac, timezone, lat, lon, topic, activo,
equiposMarcaId, equiposModeloId, lastReport, createdAt, updatedAt
```

**Canales (→ channels)**:
```
id, equipoId, nombre, descripcion, ch, tipoMedicionId, sistema, fase,
procesar, activo, lastReport, createdAt, updatedAt
```

**Canales_Variables (→ channel_variables)**:
```
id, canaleId, variableId, activo
```

---

## 2. Tablas de Mapeo

### Tipos de Medición (measurement_types)

Mapeo fijo legacy → nueva plataforma:

| Legacy ID | Legacy Nombre | New ID | New Code |
|---|---|---|---|
| 1 | Energía eléctrica | 1 | `electrical_energy` |
| 3 | IoT Control | 2 | `iot_control` |
| 4 | IoT | 3 | `iot` |
| 6 | IoT Lectura | 4 | `iot_reading` |

### Variables

Mapeo basado en nombre + definición + unidad. Referencia completa:

| Legacy ID | Nombre | Def | Unidad | New ID | New Code |
|---|---|---|---|---|---|
| 24 | Temperatura | val1 | ºC | 20 | `iot_temperature` |
| 26 | Estado On/Off | val1 | | 22 | `iot_on_off` |
| 29 | FlowRate | val1 | m3/h | 25 | `iot_flow_rate` |
| 32 | Negative Accumulator | val4 | m3 | 28 | `iot_negative_accumulator` |
| 33 | Positive Accumulator | val5 | m3 | 29 | `iot_positive_accumulator` |
| 35 | Contador | val1 | | 30 | `iot_counter` |
| 36 | Presion | val1 | PSI | 31 | `iot_pressure_psi` |
| 37 | Porcentaje | val1 | % | 32 | `iot_percentage` |
| 39 | Energy flow rate | val6 | BTU/h | 34 | `iot_energy_flow_rate` |
| 41 | Frecuencia | val1 | Hz | 36 | `iot_frequency` |
| 42 | Presion | val2 | BAR | 37 | `iot_pressure_bar` |
| 47 | Temperatura [F] | val24F | °F | 40 | `iot_temperature_f` |
| 48 | BTU | val3 | BTU | 41 | `iot_btu` |
| 59 | Temperatura Salida | val7 | ºC | 51 | `iot_temperature_out` |
| 60 | Temperatura Retorno | val8 | ºC | 52 | `iot_temperature_return` |
| 65 | Quality | val2 | | 57 | `iot_quality_signal` |

> **IMPORTANTE**: Si la organización a migrar tiene variables no listadas aquí, primero verificar que existan en la tabla `variables` de PG y agregar el mapeo al script.

---

## 3. Mapeo de Campos

### Equipos → Devices

| Campo Legacy | Campo Nuevo | Transformación |
|---|---|---|
| `id` | *(descartado)* | Se genera nuevo UUID v7 |
| `nombre` | `name` | Directo |
| `uuid` | `uuid` | Directo (UUID operacional para técnicos) |
| `mac` | `mac_address` | Directo |
| `timezone` | `timezone` | Directo |
| `lat` | `latitude` | Directo |
| `lon` | `longitude` | Directo |
| `topic` | `topic` | Directo (topic MQTT) |
| `activo` | `status`, `is_active` | `'1'` → `active/true`, otro → `inactive/false` |
| `equiposMarcaId` | `brand_id` | Directo (int) |
| `equiposModeloId` | `model_id` | Directo (int) |
| `lastReport` | `last_seen_at` | Filtrar fechas `1899-*` (son null reales) |
| `createdAt` | `created_at` | `new Date()` |
| `updatedAt` | `updated_at` | `new Date()` |
| *(nuevo)* | `id` | UUID v7 autogenerado |
| *(nuevo)* | `human_id` | Incremental global (MAX+1) |
| *(nuevo)* | `public_code` | `generatePublicCode('DEV', uuid)` |
| *(nuevo)* | `organization_id` | UUID de la org destino |
| *(nuevo)* | `site_id` | null (asignar manualmente después) |

### Canales → Channels

| Campo Legacy | Campo Nuevo | Transformación |
|---|---|---|
| `id` | *(descartado)* | Se genera nuevo UUID v7 |
| `equipoId` | `device_id` | Lookup en mapa oldId→newUuid |
| `nombre` | `name` | Directo |
| `descripcion` | `description` | Directo |
| `ch` | `ch` | Directo (número de canal) |
| `tipoMedicionId` | `measurement_type_id` | Via MEASUREMENT_TYPE_MAP |
| `sistema` | `phase_system` | Directo (0=N/A, 1=mono, 2=bi, 3=tri) |
| `fase` | `phase` | Directo (1-3) |
| `procesar` | `process` | `'1'` → `true` |
| `activo` | `status`, `is_active` | `'1'` → `active/true` |
| `lastReport` | `last_sync_at` | `new Date()` |
| *(nuevo)* | `organization_id` | UUID de la org destino (reduce JOINs) |

### Canales_Variables → channel_variables

| Campo Legacy | Campo Nuevo | Transformación |
|---|---|---|
| `canaleId` | `channel_id` | Lookup en mapa oldChannelId→newUuid |
| `variableId` | `variable_id` | Via VARIABLE_MAP |
| `activo` | `is_active` | `'1'` → `true` |
| *(nuevo)* | `display_order` | Incremental por inserción |

---

## 4. Estructura del Script

### Patrón obligatorio

```javascript
// 1. Validar mapeos contra DB ANTES de insertar
await validateMeasurementTypes();  // Verificar que IDs existen
await validateVariableMappings();  // Verificar code + unit de cada variable

// 2. Check idempotencia
const canProceed = await checkIdempotency(); // COUNT devices WHERE org_id = X

// 3. Todo en una transacción
const transaction = await sequelize.transaction();
try {
    // 3a. Lock tablas para human_id seguro
    await sequelize.query('LOCK TABLE "devices" IN EXCLUSIVE MODE', { transaction });
    
    // 3b. Insertar devices → guardar mapa oldId→newUuid
    // 3c. Insertar channels → guardar mapa oldChannelId→newUuid
    // 3d. Insertar channel_variables
    
    await transaction.commit();
} catch (error) {
    await transaction.rollback();
}
```

### Flags del script

| Flag | Efecto |
|---|---|
| *(sin flags)* | Ejecuta migración, falla si ya hay datos |
| `--clean` | Borra datos existentes de la org y re-inserta |

---

## 5. Checklist Pre-Migración

- [ ] JSONs exportados y colocados en `attached_assets/`
- [ ] Organización destino creada en `organizations` (anotar UUID)
- [ ] Verificar que todas las variables usadas por la org están en la tabla `variables`
- [ ] Si hay variables nuevas: crearlas primero y agregar al VARIABLE_MAP
- [ ] Si hay tipos de medición nuevos: crearlos primero y agregar al MEASUREMENT_TYPE_MAP
- [ ] Verificar que `brand_id` y `model_id` existen en sus tablas (o dejar null)
- [ ] Hacer backup de la DB antes de ejecutar

## 6. Checklist Post-Migración

- [ ] Verificar conteos: `SELECT COUNT(*) FROM devices/channels/channel_variables WHERE org_id = X`
- [ ] Verificar sample de datos: nombres, UUIDs, MACs, variables asignadas
- [ ] Asignar `site_id` a dispositivos si aplica
- [ ] Asignar `asset_category_id` a canales si aplica
- [ ] Verificar que el API responde correctamente para la org migrada
- [ ] Probar idempotencia: correr script de nuevo sin `--clean` (debe detectar datos existentes)

---

## 7. Organizaciones Migradas

| Organización | Fecha | Devices | Channels | Ch_Variables | Script |
|---|---|---|---|---|---|
| Sirenis | 2026-02-12 | 41 | 299 | 151 | `scripts/migrate-sirenis.js` |

> Agregar cada organización migrada a esta tabla como registro.
