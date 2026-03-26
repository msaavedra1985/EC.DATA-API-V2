# Schedules Endpoints

> **Última actualización**: 2026-03-25
> 
> **IMPORTANTE**: Este archivo DEBE actualizarse cuando se modifique cualquier endpoint de schedules.

## Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/schedules` | Listar schedules | Sí |
| GET | `/api/v1/schedules/:id` | Obtener schedule completo | Sí |
| POST | `/api/v1/schedules` | Crear schedule | Sí (admin) |
| PATCH | `/api/v1/schedules/:id/validities/:validityId` | Actualizar vigencia (con opción de sucesora atómica) | Sí (admin) |

---

## GET /api/v1/schedules

**Propósito**: Listar schedules del usuario/organización

**Query Params**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| organization_id | string | - | Filtrar por organización (query param, user con org activa) |
| include | string | `validities-light` | Modo de carga: `validities-light` (lista), `validities` (con exceptions+timeProfiles ids), `full` (árbol completo con grid) |

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": [
    {
      "id": "SCH-ABC-123",
      "name": "Turno A",
      "description": "Turno matutino",
      "timeZone": "America/Buenos_Aires",
      "organization": { "id": "ORG-XXX", "name": "Org", "slug": "org" },
      "validities": [
        {
          "id": 1,
          "validFrom": "2026-01-01",
          "validTo": null,
          "rangesCount": 3,
          "weekCoveragePercent": 85.7,
          "exceptionsCount": 2
        }
      ]
    }
  ],
  "meta": { "total": 10, "timestamp": "2026-03-25T00:00:00.000Z", "locale": "es" }
}
```

---

## GET /api/v1/schedules/:id

**Propósito**: Obtener schedule completo con árbol de validities, timeProfiles, timeRanges, exceptions

**Respuesta exitosa** (200):
```json
{
  "ok": true,
  "data": {
    "id": "SCH-ABC-123",
    "name": "Turno A",
    "organization": { "id": "ORG-XXX", "name": "Org", "slug": "org" },
    "validities": [
      {
        "id": 1,
        "validFrom": "2026-01-01",
        "validTo": null,
        "rangesCount": 3,
        "weekCoveragePercent": 85.7,
        "exceptionsCount": 2,
        "timeProfiles": [
          {
            "id": 10,
            "name": "Turno Matutino",
            "grid": {
              "1": [{ "from": "08:00", "to": "12:00" }],
              "2": [{ "from": "08:00", "to": "12:00" }]
            }
          }
        ],
        "exceptions": [
          { "date": "2026-03-17", "name": "Feriado", "type": "closed", "repeatYearly": true }
        ]
      }
    ]
  },
  "meta": { "timestamp": "2026-03-25T00:00:00.000Z", "locale": "es" }
}
```

---

## POST /api/v1/schedules

**Propósito**: Crear nuevo schedule

**Body**:
```json
{
  "name": "Turno A",
  "description": "Turno matutino",
  "timeZone": "America/Buenos_Aires",
  "validities": [
    {
      "validFrom": "2026-01-01",
      "validTo": null,
      "timeProfiles": [
        {
          "name": "Turno Matutino",
          "grid": {
            "1": [{ "from": "08:00", "to": "12:00" }],
            "2": [{ "from": "08:00", "to": "12:00" }]
          }
        }
      ],
      "exceptions": [
        { "date": "2026-03-17", "name": "Feriado", "type": "closed", "repeatYearly": true }
      ]
    }
  ]
}
```

**Respuesta exitosa** (201): Schedule completo con árbol

---

## PATCH /api/v1/schedules/:id/validities/:validityId

**Propósito**: Actualizar vigencia existente + opcionalmente crear sucesora atómica

### Caso 1: Sin `nextValidity` (cambio simple)

**Body**:
```json
{
  "validFrom": "2026-01-01",
  "validTo": "2026-03-18"
}
```

**Respuesta** (200):
```json
{
  "ok": true,
  "data": {
    "id": 8,
    "validFrom": "2026-01-01",
    "validTo": "2026-03-18",
    "rangesCount": 2,
    "weekCoveragePercent": 75.5
  }
}
```

### Caso 2: Con `nextValidity` (cierre atómico + sucesora)

**Body**:
```json
{
  "validTo": "2026-06-30",
  "nextValidity": {
    "validFrom": "2026-07-01",
    "validTo": null,
    "timeProfiles": [
      {
        "name": "Turno Nuevo",
        "grid": { "1": [{ "from": "09:00", "to": "17:00" }] }
      }
    ],
    "exceptions": [
      { "date": "2026-07-09", "name": "Independencia", "type": "closed", "repeatYearly": true }
    ]
  }
}
```

**Respuesta** (200):
```json
{
  "ok": true,
  "data": {
    "closed": {
      "id": 8,
      "validFrom": "2026-01-01",
      "validTo": "2026-06-30",
      "rangesCount": 2,
      "weekCoveragePercent": 75.5
    },
    "created": {
      "id": 9,
      "validFrom": "2026-07-01",
      "validTo": null,
      "rangesCount": 3,
      "weekCoveragePercent": 85.7,
      "exceptionsCount": 1,
      "exceptions": [
        { "date": "2026-07-09", "name": "Independencia", "type": "closed", "repeatYearly": true }
      ],
      "timeProfiles": [
        {
          "id": 100,
          "name": "Turno Nuevo",
          "grid": { "1": [{ "from": "09:00", "to": "17:00" }] }
        }
      ]
    }
  }
}
```

### Validación

| Regla | Error | Condición |
|-------|-------|-----------|
| A | 422 VALIDITY_VALIDATION_ERROR | Vigencia actualizada solapa con otra existente |
| B | 422 VALIDITY_VALIDATION_ERROR | Rangos internos solapados en el mismo día (mismo timeProfile) |
| C | 400 VALIDATION_ERROR | `validTo` undefined cuando `nextValidity` presente |
| D | 400 VALIDATION_ERROR | `validTo` null cuando `nextValidity` presente |
| E | 422 VALIDITY_VALIDATION_ERROR | `nextValidity` solapa con vigencia existente |

**Notas**:
- Sin `nextValidity` → comportamiento original
- Con `nextValidity` → transacción atómica cierre+creación; rollback si falla
- Validación de `nextValidity` incluye la vigencia cerrada (con nuevo `validTo`)
