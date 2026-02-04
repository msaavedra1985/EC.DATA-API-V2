# Device Metadata API

Catálogos de datos para formularios de dispositivos. Endpoint optimizado para cargar toda la metadata de una sola vez.

## Endpoints

### GET /api/v1/devices/metadata

Obtiene todos los catálogos de dispositivos en un idioma específico.

**Autenticación:** Requerida (Bearer token)

#### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `lang` | string | `es` | Código de idioma (es, en). Si no se proporciona, usa Accept-Language header |

#### Response

```json
{
  "success": true,
  "data": {
    "device_types": [
      { "id": 1, "code": "node", "name": "Nodo", "icon": "cpu" },
      { "id": 2, "code": "ucm", "name": "UCM", "icon": "server" }
    ],
    "brands": [
      { "id": 1, "code": "energycloud", "name": "EnergyCloud" },
      { "id": 2, "code": "schneider", "name": "Schneider Electric" }
    ],
    "models": [
      { "id": 1, "code": "ECS", "name": "ECS", "brand_id": 1, "brand_code": "energycloud" },
      { "id": 4, "code": "Dirris A20", "name": "Dirris A20", "brand_id": 2, "brand_code": "socomec" }
    ],
    "servers": [
      { "id": 1, "code": "mqttssl.energycloud.tv", "name": "mqttssl.energycloud.tv", "server_type": "mqttssl", "use_ssl": true }
    ],
    "networks": [
      { "id": 1, "code": "modem_4g", "name": "Modem 4G", "icon": "signal" },
      { "id": 2, "code": "ethernet", "name": "Ethernet", "icon": "ethernet-port" }
    ],
    "licenses": [
      { "id": 1, "code": "ec_iot", "name": "EC.IoT", "color": "#3B82F6" },
      { "id": 2, "code": "ec_automation", "name": "EC.Automation", "color": "#10B981" }
    ],
    "validity_periods": [
      { "id": 1, "code": "12_months", "name": "12 meses", "months": 12 },
      { "id": 4, "code": "enterprise", "name": "Enterprise", "months": null }
    ]
  }
}
```

#### Notas de Implementación

- **Caché Redis:** 1 hora TTL por idioma
- **Traducción:** Cada entidad tiene tabla de traducciones separada
- **IDs Seriales:** No se usan UUIDs ni public_codes (datos públicos de catálogo)

---

### POST /api/v1/devices/metadata/invalidate-cache

Invalida el caché de metadata.

**Autenticación:** Requerida (Admin)

#### Request Body

```json
{
  "lang": "es"  // Opcional. Si es null/omitido, invalida todos los idiomas
}
```

#### Response

```json
{
  "success": true,
  "message": "Caché invalidado correctamente"
}
```

---

## Catálogos Disponibles

| Catálogo | Descripción | Campos |
|----------|-------------|--------|
| `device_types` | Tipos de dispositivo | id, code, name, icon |
| `brands` | Marcas | id, code, name, logo_url, website_url |
| `models` | Modelos (por marca) | id, code, name, brand_id, brand_code, specs |
| `servers` | Servidores MQTT/FTP | id, code, name, server_type, host, port, use_ssl |
| `networks` | Tipos de red | id, code, name, icon |
| `licenses` | Licencias | id, code, name, color |
| `validity_periods` | Períodos de vigencia | id, code, name, months |

## Uso en Frontend

```typescript
// Cargar metadata al iniciar formulario de dispositivo
const { data } = await api.get('/devices/metadata', {
  headers: { 'Accept-Language': 'es' }
});

// Usar en selects
const brandOptions = data.brands.map(b => ({ value: b.id, label: b.name }));
const modelOptions = data.models
  .filter(m => m.brand_id === selectedBrandId)
  .map(m => ({ value: m.id, label: m.name }));
```
