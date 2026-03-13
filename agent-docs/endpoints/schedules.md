# Módulo: Schedules (Motor de Horarios)

> **Última actualización**: 2026-03-12

Base URL: `/api/v1/schedules`

## Propósito

Motor de Horarios multi-vigencia para facturación y analítica pesada. Permite definir:
- **Vigencias** con fechas de inicio/fin (null = infinito) — sin solapamiento (Regla A)
- **TimeProfiles** por vigencia (ej: "Turno Mañana", "Turno Noche") con una grilla semanal
- **Excepciones** (festivos, cierres) con soporte a repetición anual
- **Métricas automáticas**: Contadores de vigencias, rangos y porcentaje de cobertura semanal

## Estructura del Payload (entrada y salida simétricas)

```json
{
  "name": "Horario Comercial",
  "description": "Base para facturación",
  "validities": [
    {
      "validFrom": null,
      "validTo": null,
      "exceptions": [
        {"date": "2000-01-01", "name": "Año Nuevo", "type": "closed", "repeatYearly": true}
      ],
      "timeProfiles": [
        {
          "name": "Turno Mañana",
          "grid": {
            "1": [{"from": "08:00", "to": "12:00"}, {"from": "13:00", "to": "18:00"}],
            "7": [{"from": "00:00", "to": "24:00"}]
          }
        }
      ]
    }
  ]
}
```

## Reglas de Negocio

| Regla | Descripción |
|-------|-------------|
| **A — Vigencias** | Los rangos de fechas de las vigencias NO pueden solaparse. null en validFrom = desde siempre. null en validTo = sin vencimiento. |
| **B — Rangos horarios** | Los rangos de hora dentro del mismo día (cruzando todos los timeProfiles de una validity) NO pueden pisarse. Se permite que uno termina donde otro empieza (ej: 12:00-fin / 12:00-inicio). |
| **24:00** | Es hora válida como fin de rango (equivale a 00:00 del día siguiente). |
| **dayOfWeek** | Sigue ISO 8601: 1=Lunes, 7=Domingo. |
| **publicCode** | Formato `SCH-XXX-XXX`. NUNCA exponer UUID interno. |

## Sistema de Métricas

El sistema calcula y mantiene automáticamente las siguientes métricas:

### A nivel Schedule
- **validitiesCount**: Contador total de vigencias del schedule

### A nivel Validity
- **rangesCount**: Contador total de rangos horarios de la vigencia
- **weekCoveragePercent**: Porcentaje de cobertura semanal (0.00-100.00%)
- **exceptionsCount**: Contador total de excepciones de la vigencia

### Cálculo de Cobertura Semanal
- **Base**: 10,080 minutos (7 días × 24 horas × 60 minutos)
- **Fórmula**: `(minutos_cubiertos / 10,080) × 100`
- **Precisión**: 2 decimales
- **Actualización**: Automática mediante hooks de Sequelize

### Actualización Automática
Las métricas se actualizan automáticamente cuando:
- Se crea/elimina una validity → actualiza `validitiesCount` del schedule
- Se crea/elimina una exception → actualiza `exceptionsCount` de la validity
- Se crea/actualiza/elimina un time range → recalcula `rangesCount` y `weekCoveragePercent` de la validity

## Errores 422 (SCHEDULE_VALIDATION_ERROR)

```json
{
  "ok": false,
  "error": {
    "code": "SCHEDULE_VALIDATION_ERROR",
    "message": "Validación de horario fallida",
    "details": ["Regla A: Las vigencias en posición 0 y 1 se solapan...", "..."]
  }
}
```

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/schedules` | Crear schedule completo |
| GET | `/api/v1/schedules` | Listar schedules (básico o con validities) |
| GET | `/api/v1/schedules/:id` | Obtener schedule completo |
| PATCH | `/api/v1/schedules/:id` | Editar nombre/descripción del schedule |
| DELETE | `/api/v1/schedules/:id` | Eliminar schedule (soft delete) |
| GET | `/api/v1/schedules/:id/validities` | Listar validities con métricas |
| POST | `/api/v1/schedules/:id/validities` | Agregar validity completa |
| GET | `/api/v1/schedules/:id/validities/:validityId/ranges` | Ver rangos de una validity |
| PATCH | `/api/v1/schedules/:id/validities/:validityId` | Editar validity (fechas) |
| PUT | `/api/v1/schedules/:id/validities/:validityId` | Update completo de validity (fechas + rangos, diff por ID) |
| DELETE | `/api/v1/schedules/:id/validities/:validityId` | Eliminar validity |
| PUT | `/api/v1/schedules/:id/validities/:validityId/ranges` | Actualizar rangos (batch, diff por clave) |
| PUT | `/api/v1/schedules/:id/validities/:validityId/exceptions` | Reemplazar excepciones de una validity (batch diff) |

---

## Endpoints

### POST /api/v1/schedules

Crear un schedule completo.

**Auth**: Bearer token con `activeOrgCode` resuelto (requiere org-admin o system-admin).

**Request Body**: `CreateScheduleRequest` (ver swagger/schedules.yaml)

**Response 201**:
```json
{
  "ok": true,
  "data": { /* ScheduleResponse */ },
  "meta": { "timestamp": "...", "locale": "..." }
}
```

**Response 422**: Solapamiento de vigencias o rangos horarios.

---

### GET /api/v1/schedules

Listar schedules de la organización activa.

**Auth**: Bearer token.

**Query Params**:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| limit | int | 20 | Máx 100 |
| offset | int | 0 | Offset para paginación |
| include | string | - | `validities` \| `full`. Nivel de detalle a incluir |

**Response 200 (sin include)**:
```json
{
  "ok": true,
  "data": [
    {
      "id": "SCH-4X9-R2T",
      "name": "Horario Comercial",
      "description": "Base para facturación",
      "validitiesCount": 3,
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-03-10T14:30:00Z"
    }
  ],
  "meta": { "total": 1, "limit": 20, "offset": 0, "timestamp": "..." }
}
```

**Response 200 (con ?include=validities)**:
```json
{
  "ok": true,
  "data": [
    {
      "id": "SCH-4X9-R2T",
      "name": "Horario Comercial",
      "validitiesCount": 3,
      "validities": [
        {
          "id": 1,
          "validFrom": "2026-01-01",
          "validTo": null,
          "rangesCount": 10,
          "weekCoveragePercent": 45.83,
          "exceptionsCount": 2
        }
      ]
    }
  ],
  "meta": { "total": 1, "limit": 20, "offset": 0 }
}
```

**Response 200 (con ?include=full)**:
```json
{
  "ok": true,
  "data": [
    {
      "id": "SCH-4X9-R2T",
      "name": "Horario Comercial",
      "validitiesCount": 3,
      "validities": [
        {
          "id": 1,
          "validFrom": "2026-01-01",
          "validTo": null,
          "rangesCount": 10,
          "weekCoveragePercent": 45.83,
          "exceptionsCount": 2,
          "exceptions": [
            {"date": "2026-01-01", "name": "Año Nuevo", "type": "closed", "repeatYearly": true}
          ],
          "timeProfiles": [
            {
              "id": 1,
              "name": "Turno Mañana",
              "grid": {
                "1": [{ "id": 101, "from": "08:00", "to": "12:00" }]
              }
            }
          ]
        }
      ]
    }
  ],
  "meta": { "total": 1, "limit": 20, "offset": 0 }
}
```

**Notas**:
- **Sin `include`** (default): Solo info básica (id, name, description, validitiesCount). Ideal para listados.
- **`?include=validities`**: Agrega validities con solo métricas (rangesCount, weekCoveragePercent, exceptionsCount). Sin exceptions[] ni timeProfiles[]. Ideal para vistas de resumen.
- **`?include=full`**: Árbol completo con exceptions, timeProfiles y grid de rangos (incluyendo IDs). Ideal para edición.
- Audit log: No (solo lectura)

---

### GET /api/v1/schedules/:id

Obtener un schedule por `publicCode` (ej: `SCH-4X9-R2T`).  
Soporta 3 niveles de granularidad mediante query param `?include=` para optimizar performance según el caso de uso.

**Auth**: Bearer token.

**Query Params**:
| Param | Valores | Descripción |
|-------|---------|-------------|
| `include` | `validities` \| `full` | Opcional. Nivel de detalle a incluir |

**Response 200 (sin include - default)**:
```json
{
  "ok": true,
  "data": {
    "id": "SCH-4X9-R2T",
    "name": "Horario Comercial",
    "description": "Lunes a Viernes",
    "validitiesCount": 3,
    "exceptionsCount": 5,
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-03-10T14:30:00Z"
  },
  "meta": { "timestamp": "...", "locale": "..." }
}
```

**Response 200 (con `?include=validities`)**:
```json
{
  "ok": true,
  "data": {
    "id": "SCH-4X9-R2T",
    "name": "Horario Comercial",
    "validitiesCount": 3,
    "exceptionsCount": 5,
    "exceptions": [
      { "date": "2026-01-01", "name": "Año Nuevo", "type": "closed", "repeatYearly": true }
    ],
    "validities": [
      {
        "id": 1,
        "validFrom": "2026-01-01",
        "validTo": null,
        "rangesCount": 10,
        "weekCoveragePercent": 45.83,
        "timeProfiles": [
          { "id": 1, "name": "Turno Mañana" },
          { "id": 2, "name": "Turno Tarde" }
        ]
      }
    ],
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-03-10T14:30:00Z"
  },
  "meta": { "timestamp": "...", "locale": "..." }
}
```

**Response 200 (con `?include=full`)**:
```json
{
  "ok": true,
  "data": {
    "id": "SCH-4X9-R2T",
    "name": "Horario Comercial",
    "validitiesCount": 3,
    "exceptionsCount": 5,
    "exceptions": [
      { "date": "2026-01-01", "name": "Año Nuevo", "type": "closed", "repeatYearly": true }
    ],
    "validities": [
      {
        "id": 1,
        "validFrom": "2026-01-01",
        "validTo": null,
        "rangesCount": 10,
        "weekCoveragePercent": 45.83,
        "timeProfiles": [
          {
            "id": 1,
            "name": "Turno Mañana",
            "grid": {
              "1": [{ "id": 101, "from": "08:00", "to": "12:00" }],
              "2": [{ "id": 102, "from": "08:00", "to": "12:00" }]
            }
          }
        ]
      }
    ],
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-03-10T14:30:00Z"
  },
  "meta": { "timestamp": "...", "locale": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND`

**Notas**:
- **Sin `include`** (default): Solo datos básicos del schedule + contadores. Ideal para listados.
- **`?include=validities`**: Agrega exceptions + validities con métricas y timeProfiles (solo id/name). Ideal para vistas de resumen.
- **`?include=full`**: Árbol completo con grid de rangos (incluyendo IDs de time_ranges). Ideal para edición completa.
- Audit log: No (solo lectura)

---

### DELETE /api/v1/schedules/:id

Soft delete de un schedule (paranoid). Las tablas hijo (exceptions, validities, timeProfiles, timeRanges) permanecen en la DB pero el schedule ya no aparece en listados ni GETs.

**Auth**: Bearer token (requiere org-admin o system-admin).

**Response 200**:
```json
{
  "ok": true,
  "data": { "deleted": true },
  "meta": { "timestamp": "...", "locale": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND`

---

### GET /api/v1/schedules/:id/validities

Listar todas las validities de un schedule con árbol completo (timeProfiles + rangos en formato grid).

**Auth**: Bearer token.

**Path Params**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del schedule (ej: `SCH-4X9-R2T`) |

**Response 200**:
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "validFrom": "2026-01-01",
      "validTo": "2026-06-30",
      "rangesCount": 10,
      "weekCoveragePercent": 45.83,
      "timeProfiles": [
        {
          "id": 1,
          "name": "Turno Mañana",
          "grid": {
            "1": [{ "id": 101, "from": "08:00", "to": "12:00" }],
            "2": [{ "id": 102, "from": "08:00", "to": "12:00" }]
          }
        },
        {
          "id": 2,
          "name": "Turno Tarde",
          "grid": {
            "1": [{ "id": 103, "from": "14:00", "to": "18:00" }]
          }
        }
      ]
    }
  ],
  "meta": { "timestamp": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND`

**Notas**:
- Incluye métricas (rangesCount, weekCoveragePercent) por validity
- TimeProfiles incluyen id, name y grid completo con rangos horarios
- Los rangos en el grid incluyen el `id` de cada time_range (útil para diff inteligente)
- Útil para obtener todo el árbol de una sola vez sin múltiples requests
- Audit log: No (solo lectura)

---

### GET /api/v1/schedules/:id/validities/:validityId/ranges

Obtener los rangos horarios completos de una validity específica.

**Auth**: Bearer token.

**Path Params**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del schedule |
| validityId | int | ID de la validity |

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "validityId": 1,
    "validFrom": "2026-01-01",
    "validTo": "2026-06-30",
    "rangesCount": 10,
    "weekCoveragePercent": 45.83,
    "timeProfiles": [
      {
        "name": "Turno Mañana",
        "grid": {
          "1": [{ "from": "08:00", "to": "12:00" }],
          "2": [{ "from": "08:00", "to": "12:00" }]
        }
      }
    ]
  },
  "meta": { "timestamp": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND` o `VALIDITY_NOT_FOUND`

**Notas**:
- Incluye grid completo de rangos horarios
- Incluye métricas actualizadas
- Audit log: No (solo lectura)

---

### PATCH /api/v1/schedules/:id/validities/:validityId

Actualizar las fechas de una validity (validFrom, validTo).

**Auth**: Bearer token (requiere org-admin o system-admin).

**Path Params**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del schedule |
| validityId | int | ID de la validity |

**Request Body**:
```json
{
  "validFrom": "2026-02-01",
  "validTo": "2026-12-31"
}
```

**Campos opcionales**: `validFrom`, `validTo` (al menos uno requerido)

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "validFrom": "2026-02-01",
    "validTo": "2026-12-31",
    "rangesCount": 10,
    "weekCoveragePercent": 45.83
  },
  "meta": { "timestamp": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND` o `VALIDITY_NOT_FOUND`

**Response 422**: Solapamiento con otras validities (Regla A)

**Notas**:
- Valida que no se solape con otras validities del schedule
- Audit log: Sí (UPDATE)
- Incluye métricas en response

---

### PUT /api/v1/schedules/:id/validities/:validityId/ranges

Actualizar los rangos horarios de una validity con detección inteligente de cambios.

**Auth**: Bearer token (requiere org-admin o system-admin).

**Path Params**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del schedule |
| validityId | int | ID de la validity |

**Request Body**:
```json
{
  "timeProfiles": [
    {
      "name": "Turno Mañana",
      "grid": {
        "1": [{ "from": "08:00", "to": "13:00" }],
        "2": [{ "from": "08:00", "to": "13:00" }]
      }
    }
  ]
}
```

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "validityId": 1,
    "rangesCount": 2,
    "weekCoveragePercent": 8.33,
    "changes": {
      "created": 0,
      "updated": 2,
      "deleted": 8
    }
  },
  "meta": { "timestamp": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND` o `VALIDITY_NOT_FOUND`

**Response 422**: Solapamiento de rangos en mismo día (Regla B)

**Notas**:
- Detección inteligente: compara rangos enviados vs existentes
- Detecta automáticamente qué crear/actualizar/eliminar
- Actualiza métricas automáticamente vía hooks
- Valida que rangos no se solapen en mismo día
- Audit log: Sí (UPDATE con stats de cambios)
- Operación atómica en transacción

---

## Modelo de Datos

```
schedules (UUID, public_code SCH-XXX-XXX, organization_id, name, description, validities_count, paranoid)
  └── schedule_validities (int PK, schedule_id, valid_from, valid_to, ranges_count, week_coverage_percent, exceptions_count)
      └── schedule_exceptions (int PK, validity_id, date, name, type, repeat_yearly)
      └── schedule_time_profiles (int PK, validity_id, name)
          └── schedule_time_ranges (int PK, time_profile_id, day_of_week, start_time, end_time)
```

**Columnas de métricas**:
- `schedules.validities_count`: INTEGER DEFAULT 0
- `schedule_validities.ranges_count`: INTEGER DEFAULT 0
- `schedule_validities.week_coverage_percent`: DECIMAL(5,2) DEFAULT 0.00
- `schedule_validities.exceptions_count`: INTEGER DEFAULT 0

---

### PATCH /api/v1/schedules/:id

Editar nombre y/o descripción de un schedule.

**Auth**: Bearer token (requiere org-admin o system-admin).

**Request Body** (al menos uno requerido):
```json
{
  "name": "Nuevo nombre",
  "description": "Nueva descripción"
}
```

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "id": "SCH-4X9-R2T",
    "name": "Nuevo nombre",
    "description": "Nueva descripción",
    "validitiesCount": 3,
    "exceptionsCount": 5,
    "updatedAt": "2026-03-12T15:00:00Z"
  },
  "meta": { "timestamp": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND`

**Notas**:
- Al menos uno de `name` o `description` es requerido
- Audit log: Sí (UPDATE)

---

### POST /api/v1/schedules/:id/validities

Agregar una nueva validity completa a un schedule existente.

**Auth**: Bearer token (requiere org-admin o system-admin).

**Request Body**: Mismo esquema que el array `validities` de creación:
```json
{
  "validFrom": "2026-07-01",
  "validTo": "2026-12-31",
  "timeProfiles": [
    {
      "name": "Turno Mañana",
      "grid": {
        "1": [{"from": "08:00", "to": "12:00"}]
      }
    }
  ]
}
```

**Response 201**:
```json
{
  "ok": true,
  "data": {
    "id": 4,
    "validFrom": "2026-07-01",
    "validTo": "2026-12-31",
    "rangesCount": 1,
    "weekCoveragePercent": 5.95,
    "timeProfiles": [
      { "id": 10, "name": "Turno Mañana", "grid": { "1": [{"from": "08:00", "to": "12:00"}] } }
    ]
  },
  "meta": { "timestamp": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND`

**Response 422**: Solapamiento con otras vigencias (Regla A) o rangos que se pisan (Regla B)

**Notas**:
- Valida Regla A (solapamiento de vigencias) y Regla B (solapamiento de rangos)
- Actualiza `validitiesCount` del schedule automáticamente
- Audit log: Sí (CREATE)

---

### PUT /api/v1/schedules/:id/validities/:validityId

Update completo de una validity: fechas + timeProfiles con detección inteligente de cambios por ID.

**Auth**: Bearer token (requiere org-admin o sistema-admin).

**Path Params**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del schedule |
| validityId | int | ID de la validity |

**Request Body** (similar al de creación, pero `timeProfiles` acepta `id` opcional):
```json
{
  "validFrom": "2026-01-01",
  "validTo": "2026-12-31",
  "timeProfiles": [
    {
      "id": 1,
      "name": "Turno Mañana (renombrado)",
      "grid": {
        "1": [{"from": "08:00", "to": "13:00"}]
      }
    },
    {
      "name": "Turno Nuevo",
      "grid": {
        "2": [{"from": "09:00", "to": "17:00"}]
      }
    }
  ]
}
```

**Lógica de diff por `id`**:
- `id` presente y encontrado → match por ID, actualiza `name` si cambió, sincroniza rangos
- Sin `id` → perfil nuevo (se crea)
- Perfil existente no referenciado por ningún `id` en el payload → se elimina (cascade a rangos)
- Rangos: diff por clave `dayOfWeek-startTime-endTime` (mismo que PUT /ranges)

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "validityId": 1,
    "validFrom": "2026-01-01",
    "validTo": "2026-12-31",
    "rangesCount": 2,
    "weekCoveragePercent": 10.42,
    "timeProfiles": [
      { "id": 1, "name": "Turno Mañana (renombrado)", "grid": { "1": [{"from": "08:00", "to": "13:00"}] } },
      { "id": 11, "name": "Turno Nuevo", "grid": { "2": [{"from": "09:00", "to": "17:00"}] } }
    ],
    "changes": {
      "profilesCreated": 1,
      "profilesDeleted": 0,
      "rangesCreated": 1,
      "rangesDeleted": 1
    }
  },
  "meta": { "timestamp": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND` o `VALIDITY_NOT_FOUND`

**Response 422**: Solapamiento de vigencias (Regla A) o rangos (Regla B)

**Notas**:
- Operación atómica en transacción
- Actualiza métricas automáticamente
- Audit log: Sí (UPDATE con stats de cambios)

---

### DELETE /api/v1/schedules/:id/validities/:validityId

Eliminar una validity (hard delete, cascade a timeProfiles y timeRanges).

**Auth**: Bearer token (requiere org-admin o system-admin).

**Response 200**:
```json
{
  "ok": true,
  "data": { "deleted": true },
  "meta": { "timestamp": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND` o `VALIDITY_NOT_FOUND`

**Notas**:
- Hard delete (no paranoid). TimeProfiles y TimeRanges se eliminan por CASCADE.
- Actualiza `validitiesCount` del schedule automáticamente vía hook
- Audit log: Sí (DELETE)

---

### PUT /api/v1/schedules/:id/validities/:validityId/exceptions

Reemplazar todas las excepciones de una validity con detección inteligente de cambios.

**Auth**: Bearer token (requiere org-admin o system-admin).

**Path Params**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| id | string | Public code del schedule (ej: `SCH-4X9-R2T`) |
| validityId | int | ID de la validity |

**Request Body**:
```json
{
  "exceptions": [
    {"date": "2026-01-01", "name": "Año Nuevo", "type": "closed", "repeatYearly": true},
    {"date": "2026-12-25", "name": "Navidad", "type": "closed", "repeatYearly": true}
  ]
}
```

**Lógica de diff por `date`**:
- `date` en payload no existe en DB → crear
- `date` en DB no está en payload → eliminar
- Misma `date` en ambos → comparar `name`/`type`/`repeatYearly` y actualizar si cambió
- Array vacío → elimina todas las excepciones de la validity

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "exceptionsCount": 2,
    "changes": {
      "created": 1,
      "updated": 0,
      "deleted": 3
    }
  },
  "meta": { "timestamp": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND` o `VALIDITY_NOT_FOUND`

**Notas**:
- Operación atómica en transacción
- Actualiza `exceptionsCount` de la validity automáticamente vía hook
- Las excepciones aplican solo durante el período de vigencia de esta validity
- Audit log: Sí (UPDATE con stats de cambios)

---

## Archivos clave

| Archivo | Descripción |
|---------|-------------|
| `src/modules/schedules/models/*.js` | 5 modelos Sequelize + asociaciones + hooks |
| `src/modules/schedules/dtos/index.js` | Schemas Zod de validación |
| `src/modules/schedules/helpers/validator.js` | Reglas A y B + validaciones de edición |
| `src/modules/schedules/helpers/mapper.js` | gridToRows / rowsToGrid / toScheduleDto |
| `src/modules/schedules/helpers/metrics.js` | Cálculo de métricas (cobertura semanal) |
| `src/modules/schedules/repository.js` | Acceso a DB + funciones para validities/ranges |
| `src/modules/schedules/services.js` | Lógica de negocio + audit log |
| `src/modules/schedules/routes.js` | Rutas Express (8 endpoints) |
| `src/docs/swagger/schedules.yaml` | Documentación OpenAPI |
| `src/db/migrations/20260311000000-create-schedules-tables.cjs` | Migración inicial |
| `src/db/migrations/20260312000000-add-metrics-to-schedules.cjs` | Migración métricas |
