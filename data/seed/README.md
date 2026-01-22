# Seed Data

Archivos de datos de referencia para poblar la base de datos.

## Archivos

| Archivo | Descripción | Registros | Fuente |
|---------|-------------|-----------|--------|
| `countries-iso-3166.json` | Países ISO 3166-1 | 249 | [lukes/ISO-3166-Countries-with-Regional-Codes](https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes) |

## Estructura countries-iso-3166.json

```json
{
  "name": "Argentina",
  "alpha-2": "AR",
  "alpha-3": "ARG",
  "country-code": "032",
  "iso_3166-2": "ISO 3166-2:AR",
  "region": "Americas",
  "sub-region": "South America",
  "intermediate-region": "South America",
  "region-code": "019",
  "sub-region-code": "419",
  "intermediate-region-code": "005"
}
```

## Uso

Para insertar en la base de datos, crear un script de migración que lea el JSON y mapee a la tabla `countries`:

| JSON field | DB column |
|------------|-----------|
| `alpha-2` | `iso_alpha2` |
| `alpha-3` | `iso_alpha3` |
| `country-code` | `iso_numeric` |

> **Nota**: El JSON no incluye `phone_code`. Se debe agregar desde otra fuente si es necesario.
