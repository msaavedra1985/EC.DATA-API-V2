# Data Analyzer API Contract v1.1

> **Version**: 1.1  
> **Last Updated**: 2026-04-01  
> **Status**: Active

## Overview

The Data Analyzer API provides endpoints for the frontend analyzer component to retrieve telemetry data by channel, variable catalogs, and schedule plot-bands.

---

## E1 — Channel Data

### `GET /api/v1/telemetry/channels/:channelId/data`

Retrieves historical telemetry data for a channel in the analyzer format.

**Auth**: Bearer JWT (authenticated user)

**Path Params**:
| Param | Type | Description |
|-------|------|-------------|
| `channelId` | string | Public code of the channel (CHN-XXX-XXX) |

**Query Params**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string (YYYY-MM-DD) | Yes | Start date (local to device timezone) |
| `to` | string (YYYY-MM-DD) | Yes | End date (local to device timezone) |
| `resolution` | string | No | `raw`, `1m`, `15m`, `60m`, `daily`. Default: `1m` |
| `tz` | string (IANA) | No | Override timezone for filtering. Defaults to device timezone |
| `variables[]` | number[] | No | Filter specific variable IDs |
| `excludeDays[]` | number[] | No | Days of week to exclude (0=Sun, 6=Sat) |
| `timeRanges[]` | string[] | No | Hour ranges to include, format `HH:mm-HH:mm` (e.g. `08:00-18:00`) |

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "metadata": {
      "uuid": "device-cassandra-uuid",
      "channelId": "CHN-XXX-XXX",
      "channelName": "Canal Principal",
      "deviceName": "Medidor Principal",
      "timezone": "America/Lima",
      "resolution": "60m",
      "totalRecords": 720,
      "period": {
        "from": "2026-03-01",
        "to": "2026-03-31"
      }
    },
    "variables": {
      "1": {
        "id": 1,
        "name": "Energía Activa",
        "unit": "Wh",
        "column": "e",
        "chartType": "column",
        "aggregationType": "sum",
        "decimalPlaces": 2,
        "unitScaling": {
          "threshold": 100000,
          "scaledUnit": "kWh",
          "factor": 0.001,
          "scaledDecimalPlaces": 3
        }
      },
      "2": {
        "id": 2,
        "name": "Potencia Activa",
        "unit": "W",
        "column": "p",
        "chartType": "spline",
        "aggregationType": "avg",
        "decimalPlaces": 1
      }
    },
    "data": [
      {
        "ts": "2026-03-01T00:00:00-05:00",
        "values": {
          "1": 1234.56,
          "2": 850.3
        }
      },
      {
        "ts": "2026-03-01T01:00:00-05:00",
        "values": {
          "2": 820.1
        }
      }
    ]
  }
}
```

**Notes**:
- `metadata.channelId` is the `publicCode` of the channel (e.g. `CHN-XXX-XXX`)
- `metadata.period.from/to` are `YYYY-MM-DD` strings, not ISO timestamps
- `metadata.timezone` reflects the effective timezone used (device timezone if `tz` not passed)
- Timestamps in `data[].ts` are ISO 8601 with timezone offset (e.g. `2026-03-24T08:00:00-03:00`), not UTC
- If a value is `null`, the field is **absent** from the `values` object (not explicit `null`)
- `unitScaling` is optional — only present if configured on the variable
- `nullFillPolicy` and `thresholds` are handled by the frontend

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Missing or invalid query params |
| 404 | NOT_FOUND | Channel not found |
| 500 | INTERNAL_ERROR | Server error |

---

## E2 — Variables Catalog

### `GET /api/v1/telemetry/channels/:channelId/variables`

Lists active variables for a channel with all configuration fields.

**Auth**: Bearer JWT (authenticated user)

**Path Params**:
| Param | Type | Description |
|-------|------|-------------|
| `channelId` | string | Public code of the channel (CHN-XXX-XXX) |

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "channelId": "CHN-XXX-XXX",
    "variables": [
      {
        "id": 1,
        "name": "Energía Activa",
        "unit": "Wh",
        "column": "e",
        "chartType": "column",
        "aggregationType": "sum",
        "decimalPlaces": 2,
        "unitScaling": {
          "threshold": 100000,
          "scaledUnit": "kWh",
          "factor": 0.001,
          "scaledDecimalPlaces": 3
        }
      },
      {
        "id": 2,
        "name": "Potencia Activa",
        "unit": "W",
        "column": "p",
        "chartType": "spline",
        "aggregationType": "avg",
        "decimalPlaces": 1
      }
    ]
  }
}
```

**Notes**:
- Only active variables (`is_active = true` on both `variables` and `channel_variables`) are returned
- `unitScaling` is optional — only present if configured on the variable
- Variables are ordered by `display_order ASC NULLS LAST, id ASC`

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 404 | NOT_FOUND | Channel not found |
| 500 | INTERNAL_ERROR | Server error |

---

## E6 — Schedule for Analyzer

### `GET /api/v1/schedules/:scheduleId/analyzer`

Returns a schedule in simplified format for the frontend analyzer (plot-bands / time ranges).

**Auth**: Bearer JWT (authenticated user)

**Path Params**:
| Param | Type | Description |
|-------|------|-------------|
| `scheduleId` | string | Public code of the schedule (SCH-XXX-XXX) |

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "id": "SCH-4X9-R2T",
    "name": "Horario Comercial",
    "description": "Lunes a Viernes 8-18h",
    "isActive": true,
    "ranges": [
      {
        "id": 101,
        "name": "Turno Mañana",
        "color": null,
        "days": [1, 2, 3, 4, 5],
        "from": "08:00",
        "to": "18:00"
      }
    ]
  }
}
```

**Notes**:
- Uses the validity that is **active on today's date** (where `validFrom <= today <= validTo`, with null bounds meaning no limit)
- If multiple validities qualify (edge case), the most recent `validFrom` wins
- `ranges` is a flat list of all time ranges across all time profiles of the active validity
- Each range aggregates all days for that specific `from/to` combination and time profile name
- `isActive` is `true` when the schedule exists and has an active validity; `false` otherwise (no matching validity)
- `color` is always `null` (reserved for future use)

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 404 | NOT_FOUND | Schedule not found |
| 500 | INTERNAL_ERROR | Server error |

---

## unitScaling Schema

The `unitScaling` object present on variables when configured:

```json
{
  "threshold": 100000,
  "scaledUnit": "kWh",
  "factor": 0.001,
  "scaledDecimalPlaces": 3
}
```

| Field | Type | Description |
|-------|------|-------------|
| `threshold` | number | When accumulated value exceeds this, apply scaling |
| `scaledUnit` | string | Display unit after scaling (e.g. `kWh`, `MWh`) |
| `factor` | number | Multiplication factor to convert to scaled unit |
| `scaledDecimalPlaces` | number | Decimal places to use when displaying scaled value |

Stored as JSONB in `variables.unit_scaling` column.

---

## Out of Scope (v1.1)

- Comparison endpoint (separate task)
- Annotations endpoint (separate task)
- Weather/climate data (pending architecture)
- `sistema` parameter (logic TBD)
- `nullFillPolicy` and `thresholds` (handled by frontend)
- File attachments (no blob storage)
