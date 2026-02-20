// Cliente MQTT centralizado para conexión a múltiples brokers IoT
// Maneja suscripción/desuscripción dinámica, deduplicación de mensajes y reconexión
import mqtt from 'mqtt';
import crypto from 'crypto';
import { config } from '../../../config/env.js';
import logger from '../../../utils/logger.js';

const DEDUP_TTL_MS = 5_000;
const DEDUP_CLEANUP_INTERVAL_MS = 10_000;

let brokerConnections = [];
let messageCallbacks = new Map();
let activeSubscriptions = new Map();
let deduplicationCache = new Map();
let cleanupTimer = null;
let isInitialized = false;

const generateDeduplicationKey = (topic, payload) => {
    const hash = crypto.createHash('md5')
        .update(topic)
        .update(payload)
        .digest('hex');
    return hash;
};

const isDuplicate = (topic, payload) => {
    const key = generateDeduplicationKey(topic, payload);
    const now = Date.now();

    if (deduplicationCache.has(key)) {
        const timestamp = deduplicationCache.get(key);
        if (now - timestamp < DEDUP_TTL_MS) {
            return true;
        }
    }

    deduplicationCache.set(key, now);
    return false;
};

const cleanupDeduplicationCache = () => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, timestamp] of deduplicationCache) {
        if (now - timestamp > DEDUP_TTL_MS) {
            deduplicationCache.delete(key);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        logger.debug({ cleaned, remaining: deduplicationCache.size }, 'MQTT dedup cache cleanup');
    }
};

const handleMessage = (brokerIndex, topic, message) => {
    try {
        const payload = message.toString();

        if (isDuplicate(topic, payload)) {
            return;
        }

        const topicParts = topic.split('/');
        const deviceUuid = topicParts[3];

        if (!deviceUuid) {
            logger.warn({ topic }, 'MQTT mensaje con topic inválido - sin deviceUuid');
            return;
        }

        for (const [callbackId, callback] of messageCallbacks) {
            try {
                callback({ topic, deviceUuid, payload, brokerIndex });
            } catch (callbackError) {
                logger.error({ err: callbackError, callbackId }, 'Error en callback de mensaje MQTT');
            }
        }
    } catch (error) {
        logger.error({ err: error, topic: topic.toString() }, 'Error procesando mensaje MQTT');
    }
};

const connectBroker = (brokerConfig, index) => {
    if (!brokerConfig.url) {
        logger.info({ index }, `MQTT Broker ${index + 1}: URL no configurada, saltando`);
        return null;
    }

    const clientId = `ecdata-api-${index}-${crypto.randomUUID().slice(0, 8)}`;

    const options = {
        clientId,
        username: brokerConfig.username || undefined,
        password: brokerConfig.password || undefined,
        rejectUnauthorized: false,
        clean: true,
        reconnectPeriod: 5_000,
        connectTimeout: 15_000,
        keepalive: 60,
    };

    logger.info({ index, url: brokerConfig.url, clientId }, `MQTT Broker ${index + 1}: Conectando...`);

    const client = mqtt.connect(brokerConfig.url, options);

    client.on('connect', () => {
        logger.info({ index, clientId }, `✅ MQTT Broker ${index + 1}: Conectado`);

        for (const [topic] of activeSubscriptions) {
            client.subscribe(topic, (err) => {
                if (err) {
                    logger.error({ err, topic, index }, `MQTT Broker ${index + 1}: Error re-suscribiendo`);
                }
            });
        }
    });

    client.on('message', (topic, message) => {
        handleMessage(index, topic, message);
    });

    client.on('error', (error) => {
        logger.error({ err: error, index }, `MQTT Broker ${index + 1}: Error de conexión`);
    });

    client.on('close', () => {
        logger.warn({ index }, `MQTT Broker ${index + 1}: Conexión cerrada`);
    });

    client.on('reconnect', () => {
        logger.debug({ index }, `MQTT Broker ${index + 1}: Reconectando...`);
    });

    client.on('offline', () => {
        logger.warn({ index }, `MQTT Broker ${index + 1}: Offline`);
    });

    return { client, index, config: brokerConfig };
};

export const initializeMqtt = () => {
    if (isInitialized) {
        logger.warn('MQTT ya inicializado, saltando');
        return;
    }

    const brokersConfig = config.mqtt.brokers;
    const configuredBrokers = brokersConfig.filter(b => b.url);

    if (configuredBrokers.length === 0) {
        logger.info('⏸️  MQTT: Ningún broker configurado, saltando inicialización');
        isInitialized = true;
        return;
    }

    logger.info({ count: configuredBrokers.length }, '🔌 MQTT: Inicializando conexiones a brokers');

    brokerConnections = brokersConfig
        .map((brokerConfig, index) => connectBroker(brokerConfig, index))
        .filter(Boolean);

    cleanupTimer = setInterval(cleanupDeduplicationCache, DEDUP_CLEANUP_INTERVAL_MS);

    isInitialized = true;
    logger.info({ connected: brokerConnections.length }, '✅ MQTT: Inicialización completada');
};

export const subscribeToDevice = (deviceUuid) => {
    const topicPattern = `${config.mqtt.topicPrefix}/+/+/${deviceUuid}/#`;

    if (activeSubscriptions.has(topicPattern)) {
        const count = activeSubscriptions.get(topicPattern);
        activeSubscriptions.set(topicPattern, count + 1);
        logger.debug({ deviceUuid, refCount: count + 1 }, 'MQTT: Incrementando ref count de suscripción');
        return;
    }

    activeSubscriptions.set(topicPattern, 1);

    for (const broker of brokerConnections) {
        broker.client.subscribe(topicPattern, (err) => {
            if (err) {
                logger.error({ err, deviceUuid, brokerIndex: broker.index }, 'MQTT: Error suscribiendo');
            } else {
                logger.debug({ deviceUuid, brokerIndex: broker.index }, 'MQTT: Suscrito a device');
            }
        });
    }
};

export const unsubscribeFromDevice = (deviceUuid) => {
    const topicPattern = `${config.mqtt.topicPrefix}/+/+/${deviceUuid}/#`;

    if (!activeSubscriptions.has(topicPattern)) {
        return;
    }

    const count = activeSubscriptions.get(topicPattern);
    if (count > 1) {
        activeSubscriptions.set(topicPattern, count - 1);
        logger.debug({ deviceUuid, refCount: count - 1 }, 'MQTT: Decrementando ref count de suscripción');
        return;
    }

    activeSubscriptions.delete(topicPattern);

    for (const broker of brokerConnections) {
        broker.client.unsubscribe(topicPattern, (err) => {
            if (err) {
                logger.error({ err, deviceUuid, brokerIndex: broker.index }, 'MQTT: Error desuscribiendo');
            } else {
                logger.debug({ deviceUuid, brokerIndex: broker.index }, 'MQTT: Desuscrito de device');
            }
        });
    }
};

export const onMessage = (callbackId, callback) => {
    messageCallbacks.set(callbackId, callback);
    return () => {
        messageCallbacks.delete(callbackId);
    };
};

export const removeMessageCallback = (callbackId) => {
    messageCallbacks.delete(callbackId);
};

export const getMqttStatus = () => {
    return {
        initialized: isInitialized,
        brokers: brokerConnections.map(b => ({
            index: b.index,
            connected: b.client.connected,
            reconnecting: b.client.reconnecting,
        })),
        activeSubscriptions: activeSubscriptions.size,
        deduplicationCacheSize: deduplicationCache.size,
        messageCallbacks: messageCallbacks.size,
    };
};

export const closeMqtt = async () => {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }

    messageCallbacks.clear();
    activeSubscriptions.clear();
    deduplicationCache.clear();

    const closePromises = brokerConnections.map((broker) => {
        return new Promise((resolve) => {
            broker.client.end(false, {}, () => {
                logger.info({ index: broker.index }, `MQTT Broker ${broker.index + 1}: Cerrado`);
                resolve();
            });
        });
    });

    await Promise.all(closePromises);
    brokerConnections = [];
    isInitialized = false;
    logger.info('MQTT: Todas las conexiones cerradas');
};
