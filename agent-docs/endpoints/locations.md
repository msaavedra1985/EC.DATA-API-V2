# Locations Endpoints

> **Última actualización**: 2026-02-09
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de locations.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/locations/countries/:countryCode/states` | Listar estados de un país | No |
| GET | `/api/v1/locations/states/:stateCode/cities` | Listar ciudades de un estado | No |

---

## GET /api/v1/locations/countries/:countryCode/states

**Propósito**: Listar estados/provincias de un país (desde DB)

**Autenticación**: No requerida (datos de referencia públicos)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| countryCode | string | Código ISO alpha-2 (ej: `MX`, `AR`, `US`) |

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| lang | string | es | Idioma de traducciones (es, en) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "code": "MX-AGU",
      "state_code": "AGU",
      "country_code": "MX",
      "name": "Aguascalientes",
      "type": "state",
      "latitude": "21.88525620",
      "longitude": "-102.29156770"
    },
    {
      "code": "MX-BCN",
      "state_code": "BCN",
      "country_code": "MX",
      "name": "Baja California",
      "type": "state",
      "latitude": "30.03389230",
      "longitude": "-115.14251070"
    }
  ],
  "lang": "es"
}
```

**Notas**:
- Datos servidos desde DB (tabla `states` + `state_translations`)
- Cache Redis: `states:{countryCode}:{lang}` TTL 1 hora
- ~5,375 estados disponibles en 224 países
- Ordenados por nombre traducido (ASC)

---

## GET /api/v1/locations/states/:stateCode/cities

**Propósito**: Listar ciudades de un estado (desde archivos JSON locales)

**Autenticación**: No requerida (datos de referencia públicos)

**Path Parameters**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| stateCode | string | Código completo del estado (ej: `MX-AGU`, `AR-B`) |

**Query Parameters**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| lang | string | es | Idioma de traducciones (es, en) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "name": "Aguascalientes",
      "state_code": "MX-AGU",
      "latitude": "21.88333000",
      "longitude": "-102.30000000",
      "population": 3313,
      "timezone": "America/Mexico_City"
    }
  ],
  "lang": "es"
}
```

**Notas**:
- Datos servidos desde `data/geo/cities/{CC}.json` (NO desde DB)
- Cache Redis: `cities:{stateCode}:{lang}` TTL 1 hora
- 153,000+ ciudades disponibles en 218 países
- Si no existe archivo para el país, retorna array vacío
- Formato de stateCode: `{CC}-{STATE}` (ej: MX-AGU, AR-B, US-CA)

**Errores**:
| Status | Descripción |
|--------|-------------|
| 400 | Formato de stateCode inválido (debe contener "-") |
| 500 | Error interno |
