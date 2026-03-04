// Módulo Realtime - Punto de entrada
// Exporta funciones de inicialización y rutas REST para el sistema de WebSocket + MQTT
import realtimeRouter from './routes.js';
import { initializeMqtt, closeMqtt, getMqttStatus } from './mqtt/client.js';
import { initializeWebSocket, closeWebSocket, getWsStatus, broadcastToUser, broadcastToOrganization } from './wsServer.js';

export {
    realtimeRouter,
    initializeMqtt,
    closeMqtt,
    getMqttStatus,
    initializeWebSocket,
    closeWebSocket,
    getWsStatus,
    broadcastToUser,
    broadcastToOrganization,
};
