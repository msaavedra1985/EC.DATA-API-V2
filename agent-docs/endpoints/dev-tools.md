# EC:DEV - Herramientas de Desarrollo (WebSocket)

> **Última actualización**: 2026-02-20
> 
> **IMPORTANTE**: Servicio disponible SOLO en entorno `development`. No se registra en producción.

## Resumen

| Comando WS | Descripción |
|------------|-------------|
| `EC:DEV:MQTT:SUBSCRIBE` | Suscribirse a data MQTT real de un equipo por UUID |
| `EC:DEV:MQTT:UNSUBSCRIBE` | Desuscribirse de un equipo |
| `EC:DEV:MQTT:STATUS` | Estado de brokers MQTT y suscripciones activas |

## Requisitos

- **Entorno**: `development` (bloqueado en producción)
- **Rol**: `admin`, `superadmin` o `system-admin`
- **Servicio WS**: El token efímero debe incluir `DEV` en `allowedServices`

## Cómo obtener acceso al servicio DEV

Al solicitar el token efímero via `POST /api/v1/realtime/token`, incluir `DEV` en el array de servicios:

```json
POST /api/v1/realtime/token
{
  "services": ["SYSTEM", "DEV"]
}
```

Luego al autenticar la sesión WS:

```json
{
  "type": "EC:SYSTEM:AUTH",
  "payload": {
    "services": ["DEV"]
  }
}
```

---

## EC:DEV:MQTT:SUBSCRIBE

**Propósito**: Suscribirse a la data MQTT real de un equipo. El backend se suscribe al topic MQTT del device en todos los brokers configurados y reenvía los mensajes tal cual llegan.

**Mensaje de entrada**:
```json
{
  "type": "EC:DEV:MQTT:SUBSCRIBE",
  "payload": {
    "deviceUuid": "948ca6a5-3a00-4591-a409-1115ce1fc686"
  },
  "requestId": "opcional-id-correlacion"
}
```

**Payload**:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| deviceUuid | string (UUID) | Sí | UUID interno del equipo IoT |

**Respuesta exitosa**:
```json
{
  "type": "EC:DEV:MQTT:SUBSCRIBED",
  "payload": {
    "deviceUuid": "948ca6a5-3a00-4591-a409-1115ce1fc686",
    "message": "Subscribed to MQTT data for device ...",
    "brokers": [
      { "index": 0, "connected": true },
      { "index": 1, "connected": true },
      { "index": 2, "connected": true }
    ]
  },
  "timestamp": "2026-02-20T20:03:10.123Z",
  "requestId": "opcional-id-correlacion"
}
```

**Mensajes de datos (llegan automáticamente después de suscribirse)**:
```json
{
  "type": "EC:DEV:MQTT:DATA",
  "payload": {
    "deviceUuid": "948ca6a5-3a00-4591-a409-1115ce1fc686",
    "topic": "Solution/ACU/Sirenis/948ca6a5-3a00-4591-a409-1115ce1fc686",
    "brokerIndex": 2,
    "data": {
      "deviceId": "EHM20100942",
      "facilityId": "",
      "metrics": [
        {
          "name": "Phase A Line-to-Neutral Voltage",
          "uint": "V",
          "timestamp": "2026-02-20T15:03:15-0500",
          "value": "124.455"
        }
      ]
    },
    "raw": true
  },
  "timestamp": "2026-02-20T20:03:21.369Z"
}
```

**Errores posibles**:
| Código | Descripción |
|--------|-------------|
| INVALID_PAYLOAD | Falta `deviceUuid` en payload |
| INVALID_UUID | El `deviceUuid` no tiene formato UUID válido |
| ALREADY_SUBSCRIBED | Ya estás suscrito a este device |
| DEV_ONLY | Intentaste usar EC:DEV en producción |
| FORBIDDEN | Tu rol no tiene permisos (requiere admin+) |

---

## EC:DEV:MQTT:UNSUBSCRIBE

**Propósito**: Desuscribirse de un equipo previamente suscrito.

**Mensaje de entrada**:
```json
{
  "type": "EC:DEV:MQTT:UNSUBSCRIBE",
  "payload": {
    "deviceUuid": "948ca6a5-3a00-4591-a409-1115ce1fc686"
  },
  "requestId": "opcional"
}
```

**Respuesta exitosa**:
```json
{
  "type": "EC:DEV:MQTT:UNSUBSCRIBED",
  "payload": {
    "deviceUuid": "948ca6a5-3a00-4591-a409-1115ce1fc686",
    "message": "Unsubscribed from MQTT data for device ..."
  },
  "timestamp": "2026-02-20T20:05:00.123Z"
}
```

---

## EC:DEV:MQTT:STATUS

**Propósito**: Obtener estado actual de brokers MQTT y suscripciones DEV activas.

**Mensaje de entrada**:
```json
{
  "type": "EC:DEV:MQTT:STATUS"
}
```

**Respuesta**:
```json
{
  "type": "EC:DEV:MQTT:STATUS",
  "payload": {
    "mqtt": {
      "initialized": true,
      "brokers": [
        { "index": 0, "connected": true, "reconnecting": false },
        { "index": 1, "connected": true, "reconnecting": false },
        { "index": 2, "connected": true, "reconnecting": false }
      ],
      "activeSubscriptions": 1,
      "deduplicationCacheSize": 0,
      "messageCallbacks": 1
    },
    "devSubscriptions": [
      {
        "deviceUuid": "948ca6a5-3a00-4591-a409-1115ce1fc686",
        "sessionId": "sess_...",
        "subscribedAt": "2026-02-20T20:03:10.123Z"
      }
    ]
  },
  "timestamp": "2026-02-20T20:05:30.456Z"
}
```

---

## Flujo completo de prueba desde el frontend

### Paso 1: Obtener token efímero
```javascript
const tokenRes = await fetch('/api/v1/realtime/token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ services: ['SYSTEM', 'DEV'] })
});
const { data: { token } } = await tokenRes.json();
```

### Paso 2: Conectar WebSocket
```javascript
const ws = new WebSocket(`wss://${window.location.host}/ws?token=${token}`);
```

### Paso 3: Autenticar sesión
```javascript
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'EC:SYSTEM:AUTH',
    payload: { services: ['DEV'] }
  }));
};
```

### Paso 4: Suscribirse a un equipo
```javascript
// Esperar EC:SYSTEM:CONNECTED, luego:
ws.send(JSON.stringify({
  type: 'EC:DEV:MQTT:SUBSCRIBE',
  payload: { deviceUuid: '948ca6a5-3a00-4591-a409-1115ce1fc686' }
}));
```

### Paso 5: Escuchar datos
```javascript
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'EC:DEV:MQTT:DATA') {
    console.log('Data MQTT:', msg.payload.data);
    // msg.payload.data contiene la estructura real del equipo
  }
};
```

### Paso 6: Desuscribirse
```javascript
ws.send(JSON.stringify({
  type: 'EC:DEV:MQTT:UNSUBSCRIBE',
  payload: { deviceUuid: '948ca6a5-3a00-4591-a409-1115ce1fc686' }
}));
```

---

## Notas

- Los datos llegan tal cual los publica el equipo IoT (sin transformación)
- La frecuencia de datos depende del equipo (típicamente cada 10-15 segundos)
- Al cerrar la conexión WS, las suscripciones se limpian automáticamente
- Se soportan múltiples suscripciones simultáneas a diferentes devices
- Los datos se deduplicar entre brokers (si un equipo publica al mismo tiempo en 2 brokers, solo llega una vez)

## Archivos relacionados

| Archivo | Descripción |
|---------|-------------|
| `src/modules/realtime/handlers/devHandler.js` | Handler del servicio EC:DEV |
| `src/modules/realtime/wsServer.js` | Registro del servicio (solo en development) |
| `src/modules/realtime/mqtt/client.js` | Cliente MQTT compartido |
| `scripts/test-dev-mqtt.js` | Script de prueba E2E |
