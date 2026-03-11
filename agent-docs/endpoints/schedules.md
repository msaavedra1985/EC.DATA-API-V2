# Módulo: Schedules (Motor de Horarios)

Base URL: `/api/v1/schedules`

## Propósito

Motor de Horarios multi-vigencia para facturación y analítica pesada. Permite definir:
- **Vigencias** con fechas de inicio/fin (null = infinito) — sin solapamiento (Regla A)
- **TimeProfiles** por vigencia (ej: "Turno Mañana", "Turno Noche") con una grilla semanal
- **Excepciones** (festivos, cierres) con soporte a repetición anual

## Estructura del Payload (entrada y salida simétricas)

```json
{
  "name": "Horario Comercial",
  "description": "Base para facturación",
  "validities": [
    {
      "validFrom": null,
      "validTo": null,
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
  ],
  "exceptions": [
    {"date": "2000-01-01", "name": "Año Nuevo", "type": "closed", "repeatYearly": true}
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
| offset | int | 0 | |

**Response 200**:
```json
{
  "ok": true,
  "data": [/* array de ScheduleResponse */],
  "meta": { "total": 5, "limit": 20, "offset": 0, "timestamp": "..." }
}
```

---

### GET /api/v1/schedules/:id

Obtener un schedule por `publicCode` (ej: `SCH-4X9-R2T`).

**Auth**: Bearer token.

**Response 200**:
```json
{
  "ok": true,
  "data": { /* ScheduleResponse */ },
  "meta": { "timestamp": "...", "locale": "..." }
}
```

**Response 404**: `SCHEDULE_NOT_FOUND`

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

## Modelo de Datos

```
schedules (UUID, public_code SCH-XXX-XXX, organization_id, name, description, paranoid)
  └── schedule_exceptions (int PK, schedule_id, date, name, type, repeat_yearly)
  └── schedule_validities (int PK, schedule_id, valid_from, valid_to)
      └── schedule_time_profiles (int PK, validity_id, name)
          └── schedule_time_ranges (int PK, time_profile_id, day_of_week, start_time, end_time)
```

## Archivos clave

| Archivo | Descripción |
|---------|-------------|
| `src/modules/schedules/models/*.js` | 5 modelos Sequelize + asociaciones |
| `src/modules/schedules/dtos/index.js` | Schemas Zod de validación |
| `src/modules/schedules/helpers/validator.js` | Reglas A y B puras (sin DB) |
| `src/modules/schedules/helpers/mapper.js` | gridToRows / rowsToGrid / toScheduleDto |
| `src/modules/schedules/repository.js` | Acceso a DB |
| `src/modules/schedules/services.js` | Lógica de negocio + audit log |
| `src/modules/schedules/routes.js` | Rutas Express |
| `src/docs/swagger/schedules.yaml` | Documentación OpenAPI |
| `src/db/migrations/20260311000000-create-schedules-tables.cjs` | Migración |
