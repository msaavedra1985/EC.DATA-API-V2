# Variables — Diccionario de Medición

Las variables son el diccionario central del sistema. Cada variable define un dato físico que puede medirse, qué columna ocupa en Cassandra, cómo visualizarlo, y qué unidad de escala usar. Son datos de **solo lectura** vía API — se configuran en la DB y se consultan a través de `GET /devices/metadata`.

---

## Concepto

```
MeasurementType  ─┬─▶  Variable  ──▶  Cassandra column
                  │         │
                  │         └──▶  unit  ──▶  unitScales  ──▶  valor de display
                  │
Channel ──────────┘ (channel_variables muchos-a-muchos)
```

- **MeasurementType**: agrupa variables del mismo dominio físico (ej: `electric_energy`, `iot`).
- **Variable**: mapea un dato a una columna específica de Cassandra.
- **Channel**: cada canal tiene un `measurementTypeId` y una lista de variables habilitadas (via `channel_variables`).
- **unit → unitScales**: el campo `unit` de la variable es la clave para buscar escalas de display en el objeto `unitScales` que devuelve `GET /devices/metadata`.

Las variables **no tienen endpoints CRUD propios**. Se gestionan directamente en la DB (via seeder o SQL). Se modifican con una migración cuando se agrega o cambia una variable del sistema.

---

## Modelo: campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | ID incremental |
| `code` | string | Código slug único con prefijo del tipo (`ee_power`, `iot_temperature`). Inmutable. |
| `measurementTypeId` | integer | FK a `measurement_types` |
| `columnName` | string | Nombre de columna en Cassandra (`e`, `p`, `val1`, `val2`, etc.) |
| `unit` | string | Unidad del valor raw. Es la clave para buscar escalas en `unitScales`. Ej: `Wh`, `W`, `ºC` |
| `chartType` | enum | Tipo de gráfico recomendado (ver tabla abajo) |
| `axisName` | string | Label del eje Y en gráficos (ej: `Energia (Wh)`) |
| `axisId` | string | ID para agrupar varias variables en el mismo eje (ej: `'temp'` para todas las temperaturas) |
| `axisMin` | number | Mínimo del eje Y. `null` = auto |
| `axisFunction` | string | Función para columnas de tabla resumen (`total`, `avg`, etc.) |
| `aggregationType` | enum | Agregación por defecto para queries (ver tabla abajo) |
| `displayOrder` | integer | Orden en listas y gráficos |
| `showInBilling` | boolean | Mostrar en sección de facturación |
| `showInAnalysis` | boolean | Mostrar en sección de análisis |
| `isRealtime` | boolean | Tiene dato en tiempo real vía WebSocket |
| `isDefault` | boolean | Variable por defecto del tipo de medición (preseleccionada en la UI) |
| `mqttKey` | string | Key exacta en el payload MQTT (`E`, `P`, `PF`). `null` si no aplica para realtime |
| `isActive` | boolean | Estado activo |

### Chart types

| Valor | Cuándo usarlo |
|-------|--------------|
| `column` | Energía acumulada, contadores — datos que se suman por período |
| `spline` | Magnitudes continuas — potencia, temperatura, voltaje, corriente |
| `line` | Igual que spline pero con puntos angulares |
| `area` | Como spline, con relleno bajo la curva |
| `bar` | Barras horizontales — comparativas |
| `pie` | Distribuciones porcentuales |
| `scatter` | Puntos dispersos — correlaciones |
| `gauge` | Valor puntual — velocidad, nivel, factor de potencia |
| `none` | No se grafica (solo tablas o facturación) |

### Aggregation types

| Valor | Cuándo usarlo |
|-------|--------------|
| `sum` | Acumulados — energía en períodos agregados |
| `avg` | Promedios — temperatura, voltaje, corriente |
| `min` | Mínimos del período |
| `max` | Máximos del período |
| `count` | Contadores, acumuladores de caudal |
| `last` | Último valor del período — estado de un relay |
| `first` | Primer valor del período |
| `none` | Sin agregación definida |

---

## Tipos de medición (MeasurementType)

Los tipos de medición agrupan variables del mismo dominio. El `tablePrefix` determina la tabla de Cassandra.

| ID | code | tablePrefix | Descripción | Variables |
|----|------|-------------|-------------|-----------|
| 1 | `electric_energy` | `''` (vacío) | Energía eléctrica — medidores convencionales | IDs 1–19 |
| 2 | `iot_control` | `'sim'` | IoT control — salidas digitales, relays | — |
| 3 | `iot` | `'sim'` | IoT general — temperatura, caudal, presión, etc. | IDs 20–75 |
| 4 | `iot_reading` | `''` | IoT lectura — sensors de solo lectura | — |

El prefijo de código de variables sigue el patrón: `ee_`, `iot_`, `iotc_`, `iotr_`.

---

## Prefijos de código de variable

| Prefijo | MeasurementType | Ejemplo |
|---------|-----------------|---------|
| `ee_` | `electric_energy` | `ee_energy`, `ee_power`, `ee_voltage_ln` |
| `iot_` | `iot` | `iot_temperature`, `iot_humidity`, `iot_co2` |
| `iotc_` | `iot_control` | `iotc_relay_state` |
| `iotr_` | `iot_reading` | `iotr_level` |

---

## Relación con Unit Scales

El campo `unit` de la variable es la clave de búsqueda en el objeto `unitScales` del metadata:

```javascript
// Después de cargar GET /devices/metadata
const { variables, unitScales } = metadata;

const variable = variables.find(v => v.code === 'ee_energy');
// variable.unit === 'Wh'

const scales = unitScales['Wh'];
// [
//   { symbol: 'Wh',  factor: 1,          minValue: 0          },
//   { symbol: 'kWh', factor: 1000,        minValue: 1000       },
//   { symbol: 'MWh', factor: 1000000,     minValue: 1000000    },
//   { symbol: 'GWh', factor: 1000000000,  minValue: 1000000000 }
// ]

function formatValue(rawValue, scales) {
  if (!scales?.length) return `${rawValue}`;
  const sorted = [...scales].sort((a, b) => b.minValue - a.minValue);
  const scale = sorted.find(s => rawValue >= s.minValue) ?? scales[0];
  return `${(rawValue / scale.factor).toFixed(2)} ${scale.symbol}`;
}

formatValue(1_500_000, scales); // "1.50 MWh"
formatValue(850, scales);       // "850.00 Wh"
```

Si `variable.unit` no existe como clave en `unitScales`, mostrar el valor raw con la unidad tal cual: `${rawValue} ${variable.unit}`.

---

## Realtime / MQTT

Cuando `isRealtime: true`, la variable tiene un dato en tiempo real disponible vía WebSocket.

El campo `mqttKey` contiene la key exacta como llega en el payload MQTT:

```json
// Payload MQTT publicado por un medidor eléctrico
{
  "E": 15230,
  "P": 4200,
  "PF": 0.92,
  "I": 18.5,
  "V": 220.1
}
```

| mqttKey | variable | unit |
|---------|----------|------|
| `E` | `ee_energy` | `Wh` |
| `P` | `ee_power` | `W` |
| `PF` | `ee_power_factor` | — |
| `I` | `ee_current` | `A` |
| `V` | `ee_voltage_ln` | `V` |

Si `mqttKey` es `null`, la variable no tiene dato en tiempo real (solo histórico en Cassandra).

---

## API: cómo acceder a variables

Las variables se consultan exclusivamente a través del endpoint de metadata:

```
GET /api/v1/devices/metadata
Authorization: Bearer {token}
```

Devuelve, entre otros campos:

```json
{
  "data": {
    "measurementTypes": [
      { "id": 1, "code": "electric_energy", "tablePrefix": "", "name": "Energía Eléctrica", "isActive": true },
      { "id": 3, "code": "iot", "tablePrefix": "sim", "name": "IoT", "isActive": true }
    ],
    "variables": [
      {
        "id": 2,
        "code": "ee_energy",
        "measurementTypeId": 1,
        "columnName": "e",
        "name": "Energia Calculada",
        "description": "energia",
        "unit": "Wh",
        "chartType": "column",
        "axisName": "Energia (wh)",
        "axisId": "energia",
        "axisMin": 0,
        "axisFunction": "total",
        "aggregationType": null,
        "displayOrder": 1,
        "showInBilling": true,
        "showInAnalysis": true,
        "isRealtime": false,
        "isDefault": true,
        "isActive": true
      }
    ],
    "unitScales": {
      "Wh": [ ... ],
      "W":  [ ... ]
    }
  }
}
```

> **Nota**: `mqttKey` no se expone en el DTO de la API (es un dato interno del backend para procesar el broker). El frontend no lo necesita — solo consume el dato ya procesado vía WebSocket.

---

## Ejemplos reales

### Variables de Energía Eléctrica (measurementTypeId: 1)

| id | code | columnName | unit | chartType | isRealtime | isDefault | showInBilling |
|----|------|------------|------|-----------|------------|-----------|---------------|
| 2 | `ee_energy` | `e` | `Wh` | `column` | false | true | true |
| 3 | `ee_power` | `p` | `W` | `spline` | **true** | false | true |
| 4 | `ee_reactive_energy` | `re` | `VArh` | `column` | false | false | true |
| 5 | `ee_power_factor` | `fp` | — | `spline` | **true** | false | true |
| 7 | `ee_voltage_ln` | `v` | `V` | `spline` | **true** | false | false |
| 8 | `ee_current` | `i` | `A` | `spline` | **true** | false | false |

**DTO completo de `ee_energy`**:
```json
{
  "id": 2,
  "code": "ee_energy",
  "measurementTypeId": 1,
  "columnName": "e",
  "name": "Energia Calculada",
  "description": "energia",
  "unit": "Wh",
  "chartType": "column",
  "axisName": "Energia (wh)",
  "axisId": "energia",
  "axisMin": 0,
  "axisFunction": "total",
  "aggregationType": null,
  "displayOrder": 1,
  "showInBilling": true,
  "showInAnalysis": true,
  "isRealtime": false,
  "isDefault": true,
  "isActive": true
}
```

---

### Variables IoT (measurementTypeId: 3)

| id | code | columnName | unit | chartType | isRealtime | isDefault |
|----|------|------------|------|-----------|------------|-----------|
| 20 | `iot_temperature` | `val1` | `ºC` | `spline` | **true** | true |
| 21 | `iot_humidity` | `val2` | `%` | `spline` | **true** | false |
| 25 | `iot_flow_rate` | `val1` | `m3/h` | `spline` | **true** | false |
| 27 | `iot_net_accumulator` | `val3` | `m3` | `column` | **true** | false |
| 39 | `iot_co2` | `val1` | `ppm` | `spline` | **true** | false |

**DTO completo de `iot_temperature`**:
```json
{
  "id": 20,
  "code": "iot_temperature",
  "measurementTypeId": 3,
  "columnName": "val1",
  "name": "Temperatura",
  "description": "Temperatura",
  "unit": "ºC",
  "chartType": "spline",
  "axisName": "Temperatura (°C)",
  "axisId": "temp",
  "axisMin": null,
  "axisFunction": null,
  "aggregationType": "avg",
  "displayOrder": 1,
  "showInBilling": false,
  "showInAnalysis": true,
  "isRealtime": true,
  "isDefault": true,
  "isActive": true
}
```

---

## Cómo el frontend usa variables

### Paso 1: Cargar metadata una sola vez

```javascript
const metadata = await api.get('/devices/metadata');
// Guardar en store global
store.metadata = metadata.data;
```

### Paso 2: Determinar variables disponibles para un canal

```javascript
const channel = { measurementTypeId: 1, ... };

// Variables del tipo de medición del canal
const availableVars = metadata.variables.filter(
  v => v.measurementTypeId === channel.measurementTypeId && v.isActive
);
```

### Paso 3: Preseleccionar variables por defecto

```javascript
const defaultVars = availableVars.filter(v => v.isDefault);
// Para electric_energy → ['ee_energy']
```

### Paso 4: Construir configuración de gráfico

```javascript
// Con las variables seleccionadas por el usuario
const selectedVars = availableVars.filter(v => selectedIds.includes(v.id));

const chartSeries = selectedVars.map(variable => {
  const scales = metadata.unitScales[variable.unit] ?? null;
  return {
    name: variable.name,
    type: variable.chartType,
    yAxis: variable.axisId,           // agrupar en mismo eje
    tooltip: {
      formatter: (raw) => formatValue(raw, scales)
    }
  };
});
```

### Paso 5: Agrupar ejes Y

```javascript
// Agrupar variables por axisId para crear un eje por grupo
const axes = {};
for (const v of selectedVars) {
  const key = v.axisId || v.code;
  if (!axes[key]) {
    axes[key] = { id: key, title: v.axisName ?? v.name };
  }
}
const yAxes = Object.values(axes);
```

---

## Columnas compartidas en Cassandra

Algunos tipos de medición comparten el mismo nombre de columna (`val1`, `val2`, ...). Esto es normal — el tipo de medición del canal determina qué tabla usar y por lo tanto el contexto del dato:

```
canal.measurementTypeId = 3 (iot)
variable.columnName     = 'val1'
→ leer columna 'val1' de la tabla sim1m_t_datos

canal.measurementTypeId = 1 (electric_energy)
variable.columnName     = 'e'
→ leer columna 'e' de la tabla 1m_t_datos
```

Por eso una variable del tipo `iot` con `columnName: 'val1'` y otra del tipo `iot_reading` con `columnName: 'val1'` son variables **distintas**, aunque compartan el nombre de columna.

---

## Notas técnicas

- Las variables se cargan en `GET /devices/metadata` **sin traducciones**: la API devuelve la traducción del idioma solicitado ya resuelta en el campo `name`. No se expone el objeto `translations` en el DTO de listado.
- El campo `mqttKey` **no se expone** en la API. Solo lo usa el backend para procesar el stream MQTT y actualizar el caché Redis de realtime (`ec:rt:last:{channelCode}:{varId}`).
- Las variables están en la tabla `variables` de PostgreSQL. No en Cassandra — Cassandra solo almacena los valores numéricos por timestamp.
- El campo `columnName` es una referencia directa al nombre de columna en Cassandra. Si cambia en Cassandra, hay que actualizar el registro en la tabla `variables`.
