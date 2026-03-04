# Seeder de Devices y Channels

## Descripción

Script completo para poblar la base de datos con devices (dispositivos IoT/Edge) y channels (canales de comunicación) con datos realistas que cumplen con la arquitectura del proyecto.

## Características

### ✅ Devices Creados

- **Cantidad**: 5-10 devices por organización
- **Tipos**: sensor, gateway, controller, edge
- **Status**: active (80%), inactive (10%), maintenance (10%)
- **Datos realistas**:
  - Firmware versions: v2.1.0, v3.0.1, v1.9.2, etc.
  - Serial numbers únicos: SN-{tipo}-{random}
  - IP addresses: 192.168.1.x o 10.0.0.x
  - MAC addresses válidos: formato estándar
  - Location hints descriptivos
  - Asignación aleatoria a sites (70% con site, 30% sin site)
  - last_seen_at: fechas recientes (últimos 7 días)

### ✅ Channels Creados

- **Cantidad**: 2-5 channels por device
- **Tipos**: mqtt, http, websocket, coap
- **Protocols**: mqtt, https, wss, coaps
- **Direction**: inbound (30%), outbound (30%), bidirectional (40%)
- **Status**: active (85%), inactive (10%), error (5%)
- **Configuraciones realistas**:
  - MQTT: topic, qos, retain
  - HTTP: method, headers, timeout
  - WebSocket: reconnect, ping_interval
  - CoAP: confirmable, observe
- **Priority**: distribución normal alrededor de 5 (rango 1-10)
- **last_sync_at**: fechas recientes (últimos 3 días)

### ✅ Sistema Triple Identificador

Cada device y channel utiliza:
- **UUID v7**: clave primaria time-ordered
- **human_id**: ID incremental global
- **public_code**: ID opaco público (ej: DEV-xyz123-4, CHN-abc456-7)

### ✅ Audit Logs

Se genera un audit log para cada operación CREATE con:
- entity_type: 'device' o 'channel'
- action: 'create'
- performed_by: usuario admin
- changes: datos del registro creado
- metadata: información contextual

## Uso

### Ejecución Individual

```bash
node src/db/seeders/seed-devices-channels.js
```

### Ejecución con todos los seeders

```bash
node src/db/seeders/run.js
```

## Dependencias

El seeder requiere que existan previamente:
- ✅ Organizaciones (seeders de organizations)
- ✅ Sites (seeders de sites)
- ✅ Usuario admin (seeders de users)

## Orden de Ejecución Recomendado

1. Roles
2. Countries
3. Organizations
4. Users
5. Sites
6. **Devices y Channels** ← Este seeder

## Output Ejemplo

```
🔄 Iniciando seeder de Devices y Channels...

👤 Usuario admin encontrado: admin@ecdata.com

📊 Encontradas 4 organizaciones activas
📍 Encontrados 15 sites activos

================================================================================
Organización: EC.DATA (ORG-abc123-1)
Sites disponibles: 5
================================================================================

📱 Creando 8 devices para: EC.DATA (ORG-abc123-1)
  ✅ Device: Temperature Sensor 1 (DEV-xyz789-2) - sensor - active [Site: HQ Santiago]
  ✅ Device: Gateway Main (DEV-klm456-3) - gateway - active
  ...

📡 Creando channels para los devices de EC.DATA...

  Device: Temperature Sensor 1 (DEV-xyz789-2)
    ✅ Channel: MQTT Data Stream 1 (CHN-qwe123-4) - mqtt/mqtt - bidirectional - active
    ✅ Channel: HTTP API 2 (CHN-asd456-5) - http/https - outbound - active
    ...

================================================================================
📊 ESTADÍSTICAS FINALES
================================================================================
✅ Total de devices creados: 33
✅ Total de channels creados: 113
📈 Promedio de channels por device: 3.42
================================================================================

✅ Seeder de Devices y Channels completado exitosamente
```

## Verificación

Verificar datos creados:

```bash
node -e "
import sequelize from './src/db/sql/sequelize.js';
import './src/db/models.js';
import Device from './src/modules/devices/models/Device.js';
import Channel from './src/modules/channels/models/Channel.js';

await sequelize.authenticate();
const devicesCount = await Device.count();
const channelsCount = await Channel.count();

console.log('Devices en DB:', devicesCount);
console.log('Channels en DB:', channelsCount);
process.exit(0);
"
```

## Notas Importantes

- ⚠️ El script NO borra datos existentes, solo agrega nuevos
- ⚠️ Verifica la existencia de organizaciones antes de crear devices
- ⚠️ Si ya existen devices, el seeder se saltará automáticamente
- ✅ Usa transacciones implícitas de Sequelize para garantizar consistencia
- ✅ Manejo robusto de errores - los fallos individuales no detienen el proceso
- ✅ Todos los comentarios en el código están en español

## Estructura del Código

```
seed-devices-channels.js
├── deviceGenerators          # Funciones para generar datos de devices
│   ├── types                 # Tipos de dispositivos
│   ├── getRandomStatus       # Status aleatorio con distribución
│   ├── firmwareVersions      # Versiones de firmware
│   ├── generateSerialNumber  # Generador de serial numbers
│   ├── generateIpAddress     # Generador de IPs
│   ├── generateMacAddress    # Generador de MACs
│   └── getDeviceName         # Nombres según tipo
│
├── channelGenerators         # Funciones para generar datos de channels
│   ├── channelConfigs        # Configs por tipo (mqtt, http, ws, coap)
│   ├── getRandomDirection    # Direction con distribución
│   ├── getRandomStatus       # Status con distribución
│   └── getRandomPriority     # Priority con distribución normal
│
├── createDevicesForOrganization()  # Crear devices de una org
├── createChannelsForDevice()       # Crear channels de un device
└── seedDevicesAndChannels()        # Función principal
```

## Correcciones Aplicadas

Durante el desarrollo se corrigió:
- ✅ Helper `auditLog.js`: generación explícita de UUID v7 para audit logs
- ✅ Integración en `run.js`: seeder agregado al flujo de ejecución completo
