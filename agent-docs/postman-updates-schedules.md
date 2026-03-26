# Actualización Postman Collection - Schedules Module

> **Fecha**: 2026-03-12
> **Módulo**: Schedules
> **Archivo**: `exports/EC.DATA API.postman_collection.json`

## Nuevos Endpoints a Agregar

### 1. GET /api/v1/schedules (actualizar)
**Cambio**: Agregar query parameter `include`

```
Query Params:
- limit: 20
- offset: 0
- include: validities (opcional)
```

**Response sin include**:
```json
{
  "ok": true,
  "data": [
    {
      "id": "SCH-4X9-R2T",
      "name": "Horario Comercial",
      "description": "Base para facturación",
      "validitiesCount": 3,
      "exceptionsCount": 5,
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-03-10T14:30:00Z"
    }
  ],
  "meta": { "total": 1, "limit": 20, "offset": 0 }
}
```

### 2. GET /api/v1/schedules/:id/validities
**Nuevo endpoint**

```
Method: GET
URL: {{baseUrl}}/api/v1/schedules/{{scheduleId}}/validities
Headers:
  Authorization: Bearer {{token}}
  activeOrgCode: {{orgCode}}
```

**Response**:
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
        { "id": 1, "name": "Turno Mañana" },
        { "id": 2, "name": "Turno Tarde" }
      ]
    }
  ]
}
```

### 3. GET /api/v1/schedules/:id/validities/:validityId/ranges
**Nuevo endpoint**

```
Method: GET
URL: {{baseUrl}}/api/v1/schedules/{{scheduleId}}/validities/{{validityId}}/ranges
Headers:
  Authorization: Bearer {{token}}
  activeOrgCode: {{orgCode}}
```

**Response**:
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
  }
}
```

### 4. PATCH /api/v1/schedules/:id/validities/:validityId
**Nuevo endpoint**

```
Method: PATCH
URL: {{baseUrl}}/api/v1/schedules/{{scheduleId}}/validities/{{validityId}}
Headers:
  Authorization: Bearer {{token}}
  activeOrgCode: {{orgCode}}
  Content-Type: application/json
```

**Body**:
```json
{
  "validFrom": "2026-02-01",
  "validTo": "2026-12-31"
}
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "validFrom": "2026-02-01",
    "validTo": "2026-12-31",
    "rangesCount": 10,
    "weekCoveragePercent": 45.83
  }
}
```

### 5. PUT /api/v1/schedules/:id/validities/:validityId/ranges
**Nuevo endpoint**

```
Method: PUT
URL: {{baseUrl}}/api/v1/schedules/{{scheduleId}}/validities/{{validityId}}/ranges
Headers:
  Authorization: Bearer {{token}}
  activeOrgCode: {{orgCode}}
  Content-Type: application/json
```

**Body**:
```json
{
  "timeProfiles": [
    {
      "name": "Turno Mañana",
      "grid": {
        "1": [{ "from": "08:00", "to": "13:00" }],
        "2": [{ "from": "08:00", "to": "13:00" }],
        "3": [{ "from": "08:00", "to": "13:00" }],
        "4": [{ "from": "08:00", "to": "13:00" }],
        "5": [{ "from": "08:00", "to": "13:00" }]
      }
    },
    {
      "name": "Turno Tarde",
      "grid": {
        "1": [{ "from": "14:00", "to": "18:00" }],
        "2": [{ "from": "14:00", "to": "18:00" }]
      }
    }
  ]
}
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "validityId": 1,
    "rangesCount": 7,
    "weekCoveragePercent": 29.17,
    "changes": {
      "created": 2,
      "updated": 0,
      "deleted": 3
    }
  }
}
```

## Variables de Postman Necesarias

Asegurarse de tener estas variables en el environment:
- `baseUrl`: URL base de la API (ej: http://localhost:3000)
- `token`: JWT token de autenticación
- `orgCode`: Código de la organización activa
- `scheduleId`: Public code del schedule (ej: SCH-4X9-R2T)
- `validityId`: ID numérico de la validity (ej: 1)

## Estructura de Carpetas Sugerida

```
EC.DATA API
└── Schedules
    ├── Create Schedule (POST)
    ├── List Schedules - Basic (GET)
    ├── List Schedules - With Validities (GET ?include=validities)
    ├── Get Schedule (GET /:id)
    ├── Delete Schedule (DELETE /:id)
    ├── Validities
    │   ├── List Validities (GET /:id/validities)
    │   ├── Get Validity Ranges (GET /:id/validities/:validityId/ranges)
    │   ├── Update Validity Dates (PATCH /:id/validities/:validityId)
    │   └── Update Validity Ranges (PUT /:id/validities/:validityId/ranges)
```

## Tests Sugeridos para Postman

Agregar estos tests en los scripts de cada request:

```javascript
// Test común para todos los endpoints
pm.test("Status code is 200 or 201", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

pm.test("Response has ok property", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('ok');
    pm.expect(jsonData.ok).to.be.true;
});

// Para endpoints con métricas
pm.test("Response includes metrics", function () {
    var jsonData = pm.response.json();
    if (jsonData.data.rangesCount !== undefined) {
        pm.expect(jsonData.data.rangesCount).to.be.a('number');
        pm.expect(jsonData.data.weekCoveragePercent).to.be.a('number');
        pm.expect(jsonData.data.weekCoveragePercent).to.be.within(0, 100);
    }
});

// Para PUT ranges (guardar validityId para otros requests)
pm.test("Save validityId", function () {
    var jsonData = pm.response.json();
    pm.environment.set("validityId", jsonData.data.validityId);
});
```

## Notas de Implementación

1. **Autenticación**: Todos los endpoints requieren Bearer token
2. **Roles**: POST, PATCH, PUT, DELETE requieren `org-admin` o `system-admin`
3. **Métricas**: Se calculan automáticamente, no se pueden modificar directamente
4. **Validaciones**: Los endpoints de edición validan reglas de negocio (Regla A y B)
5. **Transacciones**: Las operaciones de escritura son atómicas
6. **Audit Log**: Todas las operaciones CUD se registran en audit log

## Errores Comunes

- **422**: Violación de reglas de negocio (solapamiento)
- **404**: Schedule o validity no encontrada
- **403**: Rol insuficiente
- **401**: No autenticado o token inválido
