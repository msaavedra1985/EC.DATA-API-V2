# Device Metadata — Endpoints

> Catálogos core de dispositivos. Datos de referencia universales (no dependen de organización).
> Se usan para popular selects, filtros y formularios en las vistas de dispositivos.

---

## Visión General

El módulo expone **7 catálogos** independientes + 1 endpoint combinado + 1 invalidador de caché.
Todos viven bajo `/api/v1/devices/`.

| Catálogo | Ruta base | Qué es | Ejemplo de uso en UI |
|----------|-----------|--------|---------------------|
| **Types** | `/devices/types` | Clasificación del dispositivo | Select "Tipo": Node, Gateway, Sensor, Controller... |
| **Brands** | `/devices/brands` | Fabricante | Select "Marca": Circutor, Schneider, Siemens... |
| **Models** | `/devices/models` | Modelo específico (pertenece a una marca) | Select "Modelo": CVM-C10, iON7400... (filtrado por marca) |
| **Servers** | `/devices/servers` | Servidor MQTT/broker al que se conecta | Select "Servidor": mqttssl.energycloud.tv, ECmqttCluster... |
| **Networks** | `/devices/networks` | Tipo de conexión de red | Select "Red": ethernet, wifi, 4g, lora... |
| **Licenses** | `/devices/licenses` | Licencia de software asignada | Select "Licencia": EC IoT, EC Automation, EC Billing... |
| **Validity Periods** | `/devices/validity-periods` | Vigencia de la licencia | Select "Vigencia": 12 meses, 24 meses... |

### Permisos

| Operación | Rol requerido |
|-----------|--------------|
| **Listar / Ver** (`GET`) | Cualquier usuario autenticado |
| **Crear / Editar / Eliminar** (`POST/PUT/DELETE`) | `system-admin` |

### Idioma (i18n)

Todos los `GET` soportan traducciones. El idioma se resuelve así:

```
1. Query param ?lang=es          ← prioridad más alta
2. Header Accept-Language: es    ← fallback
3. Default: "es"                 ← si no se envía nada
```

Los endpoints de **listado** (`GET /types`, `GET /brands`, etc.) devuelven el DTO con el `name` traducido al idioma solicitado.
Los endpoints de **detalle** (`GET /types/:id`) devuelven el DTO con **todas las traducciones** disponibles.

---

## Endpoint Combinado

### GET /devices/metadata

Retorna **todos los catálogos en una sola llamada**. Ideal para cargar los formularios de dispositivos con un solo request.

**Caché**: 1 hora en Redis (`ec:device_metadata:all:{lang}`). Se invalida automáticamente en cada create/update/delete de cualquier catálogo.

**Query params**:

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `lang` | string | `es` | Idioma de las traducciones |

**Response** `200`:

```json
{
  "success": true,
  "data": {
    "deviceTypes": [
      { "id": 1, "code": "node", "name": "Nodo", "description": null, "icon": "node-icon", "isActive": true, "displayOrder": 0 }
    ],
    "brands": [
      { "id": 1, "code": "circutor", "name": "Circutor", "description": null, "logoUrl": "https://...", "websiteUrl": "https://circutor.com", "isActive": true, "displayOrder": 0 }
    ],
    "models": [
      { "id": 1, "code": "cvm_c10", "name": "CVM-C10", "description": null, "specs": { "phases": 3 }, "brandId": 1, "brandCode": "circutor", "isActive": true, "displayOrder": 0 }
    ],
    "servers": [
      { "id": 1, "code": "mqttssl_energycloud", "name": "MQTT SSL EnergyCloud", "description": null, "serverType": "mqtt", "host": "mqttssl.energycloud.tv", "port": 8883, "useSsl": true, "isActive": true, "displayOrder": 0 }
    ],
    "networks": [
      { "id": 1, "code": "ethernet", "name": "Ethernet", "description": null, "icon": "ethernet-icon", "isActive": true, "displayOrder": 0 }
    ],
    "licenses": [
      { "id": 1, "code": "ec_iot", "name": "EC IoT", "description": null, "icon": "iot-icon", "color": "#3B82F6", "isActive": true, "displayOrder": 0 }
    ],
    "validityPeriods": [
      { "id": 1, "code": "12_months", "name": "12 Meses", "description": null, "months": 12, "isActive": true, "displayOrder": 0 }
    ],
    "measurementTypes": [
      { "id": 1, "code": "electric_energy", "tablePrefix": "ee", "name": "Energía Eléctrica", "isActive": true }
    ],
    "variables": [
      { "id": 1, "code": "ee_active_energy", "measurementTypeId": 1, "columnName": "active_energy", "name": "Energía Activa", "description": null, "unit": "kWh", "chartType": "line", "axisName": null, "axisId": null, "axisMin": null, "axisFunction": null, "aggregationType": null, "displayOrder": 1, "showInBilling": true, "showInAnalysis": true, "isRealtime": false, "isDefault": true, "isActive": true }
    ]
  }
}
```

**Nota para frontend**: Este endpoint es la forma más eficiente de popular todos los selects de un formulario de dispositivo. Llamarlo una vez al cargar la vista y cachear en el state.

---

### POST /devices/metadata/invalidate-cache

Fuerza la invalidación del caché de metadata en Redis. Útil si se modificaron datos directamente en la DB.

**Permisos**: `system-admin`

**Body** (opcional):

```json
{
  "lang": "es"
}
```

Si se omite `lang`, invalida el caché de **todos los idiomas** (es + en).

**Response** `200`:

```json
{
  "success": true,
  "message": "Caché invalidado correctamente"
}
```

---

## Patrón CRUD Común

Los 7 catálogos comparten el mismo patrón de endpoints. A continuación se documenta el patrón base y después las particularidades de cada catálogo.

### Listar — GET /{recurso}

**Query params comunes**:

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `lang` | string | `es` | Idioma de traducciones |
| `include_inactive` | string | `false` | Si `"true"`, incluye registros desactivados |

**Response** `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "...",
      "name": "Nombre traducido",
      "description": "Descripción traducida o null",
      "isActive": true,
      "displayOrder": 0
    }
  ]
}
```

El array viene ordenado alfabéticamente por `name` (del idioma solicitado).
Solo devuelve registros activos por defecto. Pasar `?include_inactive=true` para ver todos.

### Detalle — GET /{recurso}/:id

Retorna un registro con **todas sus traducciones** (no solo el idioma solicitado).

**Response** `200`:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "...",
    "isActive": true,
    "displayOrder": 0,
    "translations": {
      "es": { "name": "Nombre en español", "description": "Descripción" },
      "en": { "name": "English name", "description": "Description" }
    }
  }
}
```

**Response** `404`:

```json
{
  "success": false,
  "error": "Tipo de dispositivo no encontrado"
}
```

### Crear — POST /{recurso}

**Body**:

```json
{
  "code": "mi_codigo_unico",
  "display_order": 0,
  "is_active": true,
  "translations": {
    "es": { "name": "Nombre ES", "description": "Descripción ES" },
    "en": { "name": "Name EN", "description": "Description EN" }
  }
}
```

- `code` es **único** por catálogo. Si ya existe, retorna `400`.
- `is_active` default `true` si no se envía.
- `display_order` default `0` si no se envía.
- `translations` es opcional pero recomendado. Si no se envían, el `name` en listados será el `code`.

**Response** `201`: Devuelve el registro creado con todas sus traducciones (mismo formato que el detalle).

**Response** `400` (código duplicado):

```json
{
  "success": false,
  "error": "Ya existe un tipo con ese código"
}
```

### Editar — PUT /{recurso}/:id

**Body** (parcial — solo enviar los campos que cambian):

```json
{
  "code": "nuevo_codigo",
  "is_active": false,
  "translations": {
    "es": { "name": "Nuevo nombre", "description": "Nueva descripción" }
  }
}
```

- Solo se actualizan los campos presentes en el body. Los campos omitidos **no cambian**.
- Las traducciones usan **upsert**: si el idioma ya existe se actualiza, si no existe se crea.

**Response** `200`: Registro actualizado con todas las traducciones.

**Response** `404`: Si el ID no existe.

### Eliminar — DELETE /{recurso}/:id

**Query params**:

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `hard` | string | `false` | Si `"true"`, elimina físicamente. Si `"false"`, soft-delete (solo marca `isActive: false`) |

**Comportamiento por defecto (soft delete)**: Solo cambia `is_active` a `false`. El registro sigue en la DB y se puede reactivar con un `PUT`.

**Hard delete** (`?hard=true`): Elimina el registro y sus traducciones de la DB. Usar con precaución — si hay dispositivos referenciando este catálogo, el FK fallará.

**Response** `200`:

```json
{
  "success": true,
  "message": "Tipo de dispositivo eliminado"
}
```

**Response** `404`: Si el ID no existe.

---

## Campos Específicos por Catálogo

### Device Types — `/devices/types`

Clasificación funcional del dispositivo.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `code` | string | Sí (unique) | Identificador: `node`, `gateway`, `sensor`, `controller`, `meter`, `ucm`, `lora_antenna`, `iot_device`, `edge_device` |
| `icon` | string | No | Nombre del icono para la UI |
| `display_order` | int | No (default 0) | Orden en selects |
| `is_active` | bool | No (default true) | Activo/inactivo |
| `translations` | object | No | `{ lang: { name, description } }` |

**DTO en listado**: `{ id, code, name, description, icon, isActive, displayOrder }`

---

### Device Brands — `/devices/brands`

Fabricantes de hardware.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `code` | string | Sí (unique) | Identificador: `circutor`, `schneider`, `siemens`, etc. |
| `logo_url` | string | No | URL del logo del fabricante |
| `website_url` | string | No | Sitio web oficial |
| `display_order` | int | No (default 0) | Orden en selects |
| `is_active` | bool | No (default true) | Activo/inactivo |
| `translations` | object | No | `{ lang: { name, description } }` |

**DTO en listado**: `{ id, code, name, description, logoUrl, websiteUrl, isActive, displayOrder }`

---

### Device Models — `/devices/models`

Modelos específicos. Cada modelo pertenece a una marca.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `code` | string | Sí (unique por marca) | Identificador: `cvm_c10`, `ion7400`, etc. |
| `device_brand_id` | int | **Sí** | ID de la marca (FK a `device_brands`) |
| `specs` | object (JSON) | No | Especificaciones técnicas (formato libre) |
| `display_order` | int | No (default 0) | Orden en selects |
| `is_active` | bool | No (default true) | Activo/inactivo |
| `translations` | object | No | `{ lang: { name, description } }` |

**DTO en listado**: `{ id, code, name, description, specs, brandId, brandCode, isActive, displayOrder }`

**Query param adicional en listado**:

| Param | Tipo | Descripción |
|-------|------|-------------|
| `brand_id` | int | Filtrar modelos por marca. Ej: `GET /devices/models?brand_id=1` |

**Ejemplo de flujo frontend**: Al seleccionar una marca en el formulario, hacer `GET /devices/models?brand_id={selectedBrandId}` para cargar solo los modelos de esa marca.

---

### Device Servers — `/devices/servers`

Servidores MQTT/brokers a los que se conectan los dispositivos.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `code` | string | Sí (unique) | Identificador: `mqttssl_energycloud`, `ec_mqtt_cluster`, etc. |
| `server_type` | string | No (default `"mqtt"`) | Tipo de servidor: `mqtt`, `http`, etc. |
| `host` | string | No | Hostname: `mqttssl.energycloud.tv` |
| `port` | int | No | Puerto: `8883`, `1883`, etc. |
| `use_ssl` | bool | No (default false) | Si usa SSL/TLS |
| `display_order` | int | No (default 0) | Orden en selects |
| `is_active` | bool | No (default true) | Activo/inactivo |
| `translations` | object | No | `{ lang: { name, description } }` |

**DTO en listado**: `{ id, code, name, description, serverType, host, port, useSsl, isActive, displayOrder }`

---

### Device Networks — `/devices/networks`

Tipo de conectividad de red del dispositivo.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `code` | string | Sí (unique) | Identificador: `ethernet`, `wifi`, `4g`, `lora`, `modem_4g`, etc. |
| `icon` | string | No | Nombre del icono para la UI |
| `display_order` | int | No (default 0) | Orden en selects |
| `is_active` | bool | No (default true) | Activo/inactivo |
| `translations` | object | No | `{ lang: { name, description } }` |

**DTO en listado**: `{ id, code, name, description, icon, isActive, displayOrder }`

---

### Device Licenses — `/devices/licenses`

Licencias de software asignables a dispositivos.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `code` | string | Sí (unique) | Identificador: `ec_iot`, `ec_automation`, `ec_billing`, `ec_ems`, `ec_pq`, `ec_bills`, `ec_analytics` |
| `icon` | string | No | Nombre del icono |
| `color` | string | No | Color hex para badges en la UI: `"#3B82F6"` |
| `display_order` | int | No (default 0) | Orden en selects |
| `is_active` | bool | No (default true) | Activo/inactivo |
| `translations` | object | No | `{ lang: { name, description } }` |

**DTO en listado**: `{ id, code, name, description, icon, color, isActive, displayOrder }`

---

### Device Validity Periods — `/devices/validity-periods`

Períodos de vigencia para licencias.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `code` | string | Sí (unique) | Identificador: `12_months`, `24_months`, etc. |
| `months` | int | No | Cantidad de meses del período (null = ilimitado) |
| `display_order` | int | No (default 0) | Orden en selects |
| `is_active` | bool | No (default true) | Activo/inactivo |
| `translations` | object | No | `{ lang: { name, description } }` |

**DTO en listado**: `{ id, code, name, description, months, isActive, displayOrder }`

---

## Resumen de Endpoints

| Método | Ruta | Permisos | Descripción |
|--------|------|----------|-------------|
| `GET` | `/devices/metadata` | Autenticado | Todo el metadata combinado (con caché) |
| `POST` | `/devices/metadata/invalidate-cache` | system-admin | Invalidar caché Redis |
| | | | |
| `GET` | `/devices/types` | Autenticado | Listar tipos |
| `GET` | `/devices/types/:id` | Autenticado | Detalle tipo (con todas las traducciones) |
| `POST` | `/devices/types` | system-admin | Crear tipo |
| `PUT` | `/devices/types/:id` | system-admin | Editar tipo |
| `DELETE` | `/devices/types/:id` | system-admin | Eliminar tipo |
| | | | |
| `GET` | `/devices/brands` | Autenticado | Listar marcas |
| `GET` | `/devices/brands/:id` | Autenticado | Detalle marca |
| `POST` | `/devices/brands` | system-admin | Crear marca |
| `PUT` | `/devices/brands/:id` | system-admin | Editar marca |
| `DELETE` | `/devices/brands/:id` | system-admin | Eliminar marca |
| | | | |
| `GET` | `/devices/models` | Autenticado | Listar modelos (`?brand_id=` para filtrar) |
| `GET` | `/devices/models/:id` | Autenticado | Detalle modelo |
| `POST` | `/devices/models` | system-admin | Crear modelo (`device_brand_id` requerido) |
| `PUT` | `/devices/models/:id` | system-admin | Editar modelo |
| `DELETE` | `/devices/models/:id` | system-admin | Eliminar modelo |
| | | | |
| `GET` | `/devices/servers` | Autenticado | Listar servidores |
| `GET` | `/devices/servers/:id` | Autenticado | Detalle servidor |
| `POST` | `/devices/servers` | system-admin | Crear servidor |
| `PUT` | `/devices/servers/:id` | system-admin | Editar servidor |
| `DELETE` | `/devices/servers/:id` | system-admin | Eliminar servidor |
| | | | |
| `GET` | `/devices/networks` | Autenticado | Listar redes |
| `GET` | `/devices/networks/:id` | Autenticado | Detalle red |
| `POST` | `/devices/networks` | system-admin | Crear red |
| `PUT` | `/devices/networks/:id` | system-admin | Editar red |
| `DELETE` | `/devices/networks/:id` | system-admin | Eliminar red |
| | | | |
| `GET` | `/devices/licenses` | Autenticado | Listar licencias |
| `GET` | `/devices/licenses/:id` | Autenticado | Detalle licencia |
| `POST` | `/devices/licenses` | system-admin | Crear licencia |
| `PUT` | `/devices/licenses/:id` | system-admin | Editar licencia |
| `DELETE` | `/devices/licenses/:id` | system-admin | Eliminar licencia |
| | | | |
| `GET` | `/devices/validity-periods` | Autenticado | Listar vigencias |
| `GET` | `/devices/validity-periods/:id` | Autenticado | Detalle vigencia |
| `POST` | `/devices/validity-periods` | system-admin | Crear vigencia |
| `PUT` | `/devices/validity-periods/:id` | system-admin | Editar vigencia |
| `DELETE` | `/devices/validity-periods/:id` | system-admin | Eliminar vigencia |

---

## Guía de Integración Frontend

### 1. Carga inicial del formulario de dispositivos

Al abrir el formulario de crear/editar dispositivo, hacer **una sola llamada**:

```
GET /api/v1/devices/metadata?lang=es
```

Con la respuesta, popular todos los selects:
- `data.deviceTypes` → Select "Tipo de dispositivo"
- `data.brands` → Select "Marca"
- `data.models` → Select "Modelo" (filtrar en frontend por `brandId` seleccionado, o usar endpoint individual)
- `data.servers` → Select "Servidor"
- `data.networks` → Select "Red"
- `data.licenses` → Select "Licencia"
- `data.validityPeriods` → Select "Vigencia"
- `data.measurementTypes` → Select "Tipo de medición" (para canales)

### 2. Filtrado dinámico Marca → Modelo

**Opción A** (recomendada si ya cargaste metadata): Filtrar `data.models` en el frontend:

```javascript
const filteredModels = metadata.models.filter(m => m.brandId === selectedBrandId);
```

**Opción B** (lazy loading): Cargar modelos por marca bajo demanda:

```
GET /api/v1/devices/models?brand_id=5&lang=es
```

### 3. Pantalla de administración de catálogos (system-admin)

Para la vista de CRUD de catálogos:

1. **Listar** con `?include_inactive=true` para que el admin vea también los desactivados
2. **Detalle** devuelve todas las traducciones — mostrar formulario con tabs por idioma (ES / EN)
3. **Crear/Editar** enviar `translations` como objeto con claves de idioma
4. **Eliminar** usar soft-delete por defecto. Solo usar `?hard=true` si el admin confirma eliminación permanente

### 4. Ejemplo completo: Crear una nueva marca

**Request**:

```
POST /api/v1/devices/brands
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "abb",
  "logo_url": "https://cdn.example.com/logos/abb.png",
  "website_url": "https://new.abb.com",
  "display_order": 5,
  "translations": {
    "es": { "name": "ABB", "description": "Fabricante suizo-sueco de equipos eléctricos" },
    "en": { "name": "ABB", "description": "Swiss-Swedish manufacturer of electrical equipment" }
  }
}
```

**Response** `201`:

```json
{
  "success": true,
  "data": {
    "id": 27,
    "code": "abb",
    "logoUrl": "https://cdn.example.com/logos/abb.png",
    "websiteUrl": "https://new.abb.com",
    "isActive": true,
    "displayOrder": 5,
    "translations": {
      "es": { "name": "ABB", "description": "Fabricante suizo-sueco de equipos eléctricos" },
      "en": { "name": "ABB", "description": "Swiss-Swedish manufacturer of electrical equipment" }
    }
  }
}
```

### 5. Ejemplo: Editar traducciones de un tipo

**Request**:

```
PUT /api/v1/devices/types/3
Authorization: Bearer {token}
Content-Type: application/json

{
  "translations": {
    "en": { "name": "Gateway", "description": "Network bridge device" }
  }
}
```

Solo actualiza la traducción EN del tipo con ID 3. No toca la traducción ES ni ningún otro campo.

### 6. Ejemplo: Soft-delete vs Hard-delete

```
DELETE /api/v1/devices/brands/5           → Marca 5 queda con isActive: false
DELETE /api/v1/devices/brands/5?hard=true → Marca 5 se elimina de la DB
```

---

## Códigos de Error

| Código | Cuándo | Body |
|--------|--------|------|
| `200` | Operación exitosa (list, get, update, delete) | `{ success: true, data/message }` |
| `201` | Registro creado | `{ success: true, data }` |
| `400` | ID inválido o código duplicado | `{ success: false, error: "..." }` |
| `401` | No autenticado | — |
| `403` | Sin permisos (no es system-admin) | — |
| `404` | Registro no encontrado | `{ success: false, error: "... no encontrado" }` |
| `500` | Error interno | `{ success: false, error: "Error interno del servidor" }` |

---

## Notas Técnicas

- **IDs son enteros auto-incrementales** (no UUIDs). En estos catálogos sí se usan IDs numéricos directamente porque son datos de referencia, no entidades con public_code.
- **Caché Redis**: El `GET /devices/metadata` cachea por 1 hora. Cualquier create/update/delete de cualquier catálogo invalida automáticamente el caché de todos los idiomas.
- **Invalidación automática**: No hace falta llamar manualmente a `invalidate-cache` después de un CRUD — cada operación CUD ya invalida el caché. El endpoint manual es para casos donde se editó data directamente en la DB.
- **Traducciones upsert**: En el PUT, las traducciones hacen upsert — si el idioma ya existe se actualiza, si no existe se crea. Las traducciones de idiomas no enviados en el PUT **no se borran**.
- **Ordenamiento**: Los listados vienen ordenados por `name` (de la traducción del idioma solicitado), ASC. Dentro del endpoint combinado `/metadata`, cada array también viene ordenado.
- **Campos condicionales en el DTO**: Los campos que son `null` o no aplican a un catálogo **no aparecen** en el DTO de listado. Por ejemplo, `logoUrl` solo aparece en brands, `months` solo en validity periods, `host/port/useSsl` solo en servers. El DTO de detalle (GET por ID) siempre incluye todos los campos del catálogo.
- **Body del request usa snake_case**: Los campos en el body del POST/PUT se envían en snake_case (`display_order`, `is_active`, `logo_url`, `device_brand_id`, `use_ssl`). Las responses devuelven camelCase (`displayOrder`, `isActive`, `logoUrl`, `deviceBrandId`, `useSsl`).
