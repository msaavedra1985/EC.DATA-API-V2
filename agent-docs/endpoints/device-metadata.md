# Device Metadata API

Catálogos de datos para formularios de dispositivos. Incluye endpoint optimizado para cargar toda la metadata de una sola vez, más CRUDs individuales para administración.

## Endpoints Principales

### GET /api/v1/devices/metadata

Obtiene todos los catálogos de dispositivos en un idioma específico. Optimizado para cargar formularios.

**Autenticación:** Requerida (Bearer token)

#### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `lang` | string | `es` | Código de idioma (es, en) |

#### Response

```json
{
  "success": true,
  "data": {
    "device_types": [...],
    "brands": [...],
    "models": [...],
    "servers": [...],
    "networks": [...],
    "licenses": [...],
    "validity_periods": [...]
  }
}
```

---

## CRUDs Individuales

Todos los CRUDs siguen el mismo patrón. Lectura requiere autenticación, escritura requiere rol `system-admin`.

### Device Types
- `GET /devices/types` - Listar tipos
- `GET /devices/types/:id` - Obtener tipo por ID
- `POST /devices/types` - Crear tipo (admin)
- `PUT /devices/types/:id` - Actualizar tipo (admin)
- `DELETE /devices/types/:id` - Eliminar tipo (admin)

### Device Brands
- `GET /devices/brands` - Listar marcas
- `GET /devices/brands/:id` - Obtener marca por ID
- `POST /devices/brands` - Crear marca (admin)
- `PUT /devices/brands/:id` - Actualizar marca (admin)
- `DELETE /devices/brands/:id` - Eliminar marca (admin)

### Device Models
- `GET /devices/models` - Listar modelos
- `GET /devices/models/:id` - Obtener modelo por ID
- `POST /devices/models` - Crear modelo (admin)
- `PUT /devices/models/:id` - Actualizar modelo (admin)
- `DELETE /devices/models/:id` - Eliminar modelo (admin)

**Query especial:** `?brand_id=X` para filtrar modelos por marca.

### Device Servers
- `GET /devices/servers` - Listar servidores
- `GET /devices/servers/:id` - Obtener servidor por ID
- `POST /devices/servers` - Crear servidor (admin)
- `PUT /devices/servers/:id` - Actualizar servidor (admin)
- `DELETE /devices/servers/:id` - Eliminar servidor (admin)

### Device Networks
- `GET /devices/networks` - Listar redes
- `GET /devices/networks/:id` - Obtener red por ID
- `POST /devices/networks` - Crear red (admin)
- `PUT /devices/networks/:id` - Actualizar red (admin)
- `DELETE /devices/networks/:id` - Eliminar red (admin)

### Device Licenses
- `GET /devices/licenses` - Listar licencias
- `GET /devices/licenses/:id` - Obtener licencia por ID
- `POST /devices/licenses` - Crear licencia (admin)
- `PUT /devices/licenses/:id` - Actualizar licencia (admin)
- `DELETE /devices/licenses/:id` - Eliminar licencia (admin)

### Device Validity Periods
- `GET /devices/validity-periods` - Listar períodos
- `GET /devices/validity-periods/:id` - Obtener período por ID
- `POST /devices/validity-periods` - Crear período (admin)
- `PUT /devices/validity-periods/:id` - Actualizar período (admin)
- `DELETE /devices/validity-periods/:id` - Eliminar período (admin)

---

## Query Parameters Comunes

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `lang` | string | `es` | Código de idioma para nombres |
| `include_inactive` | string | `false` | Incluir registros inactivos (`true`/`false`) |

---

## Request Body (Create/Update)

```json
{
  "code": "new_item",
  "icon": "icon-name",
  "display_order": 10,
  "is_active": true,
  "translations": {
    "es": {
      "name": "Nombre en español",
      "description": "Descripción opcional"
    },
    "en": {
      "name": "Name in English",
      "description": "Optional description"
    }
  }
}
```

### Campos específicos por catálogo

| Catálogo | Campos adicionales |
|----------|-------------------|
| brands | `logo_url`, `website_url` |
| models | `device_brand_id` (requerido), `specs` (JSON) |
| servers | `server_type`, `host`, `port`, `use_ssl` |
| licenses | `color` (hex) |
| validity_periods | `months` (null = ilimitado) |

---

## Response (GET por ID con traducciones)

```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "node",
    "icon": "cpu",
    "is_active": true,
    "display_order": 1,
    "translations": {
      "es": { "name": "Nodo", "description": null },
      "en": { "name": "Node", "description": null }
    }
  }
}
```

---

## Delete

- Por defecto: soft delete (`is_active = false`)
- Hard delete: `DELETE /devices/types/1?hard=true`

---

## Notas de Implementación

- **Caché Redis:** GET /metadata cacheado 1 hora por idioma
- **Invalidación automática:** Cada CUD invalida el caché de metadata
- **IDs Seriales:** No se usan UUIDs (datos públicos de catálogo)
- **Permisos:** Lectura = autenticado, Escritura = system-admin
