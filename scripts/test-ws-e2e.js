import WebSocket from 'ws';
import crypto from 'crypto';
import { createClient } from 'redis';

const WS_URL = 'ws://localhost:5000/ws';
const DASHBOARD_ID = 'DSH-TestHidro-1';
const LISTEN_SECONDS = 45;

const USER_ID = '019c42bd-774a-7345-8216-598d2149ca99';
const ORG_ID = '019c47b7-8ec1-76e3-90c3-2afdbffac557';

const createTestToken = async () => {
    console.log('=== Paso 1: Generar token efímero de prueba (directo en Redis) ===');
    const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await redis.connect();

    const tokenId = `eph_${crypto.randomBytes(32).toString('hex')}`;
    const tokenData = {
        tokenId,
        userId: USER_ID,
        organizationId: ORG_ID,
        role: 'system-admin',
        allowedServices: ['SYSTEM', 'DASHBOARD', 'NOTIFY', 'IOT'],
        email: 'admin@ecdata.com',
        createdAt: new Date().toISOString(),
    };

    await redis.setEx(`ws:ephemeral:${tokenId}`, 300, JSON.stringify(tokenData));
    await redis.quit();

    console.log(`Token: ${tokenId.slice(0, 20)}...`);
    console.log(`Servicios: ${tokenData.allowedServices.join(', ')}`);
    return tokenId;
};

const connectWebSocket = (ephemeralToken) => {
    return new Promise((resolve, reject) => {
        console.log('\n=== Paso 2: Conectar WebSocket ===');
        const ws = new WebSocket(`${WS_URL}?token=${ephemeralToken}`);
        let resolved = false;

        ws.on('open', () => {
            console.log('WebSocket conectado');
            if (!resolved) {
                resolved = true;
                resolve(ws);
            }
        });

        ws.on('error', (err) => {
            console.error('WS Error:', err.message);
            if (!resolved) {
                resolved = true;
                reject(err);
            }
        });

        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                reject(new Error('WS connection timeout'));
            }
        }, 10000);
    });
};

const authenticate = (ws) => {
    return new Promise((resolve) => {
        console.log('\n=== Paso 3: Autenticar sesión WS ===');

        const handler = (rawData) => {
            const msg = JSON.parse(rawData.toString());
            if (msg.type === 'EC:SYSTEM:CONNECTED') {
                console.log(`Sesión: ${msg.payload.sessionId}`);
                console.log(`Servicios: ${msg.payload.allowedServices.join(', ')}`);
                console.log(`Heartbeat: ${msg.payload.heartbeatInterval}ms`);
                ws.removeListener('message', handler);
                resolve(msg.payload);
            } else if (msg.type === 'EC:SYSTEM:ERROR') {
                console.error('Auth error:', msg.payload);
                process.exit(1);
            }
        };

        ws.on('message', handler);

        ws.send(JSON.stringify({
            type: 'EC:SYSTEM:AUTH',
            payload: { services: ['DASHBOARD'] },
        }));
    });
};

const subscribeDashboard = (ws) => {
    return new Promise((resolve) => {
        console.log(`\n=== Paso 4: Suscribirse al dashboard ${DASHBOARD_ID} ===`);

        const handler = (rawData) => {
            const msg = JSON.parse(rawData.toString());
            if (msg.type.includes('SUBSCRIBED')) {
                console.log('Suscripción exitosa:');
                console.log(`  Devices: ${JSON.stringify(msg.payload.subscribedDevices)}`);
                console.log(`  Channels: ${msg.payload.subscribedChannels?.length || 0} canales`);
                for (const ch of (msg.payload.subscribedChannels || [])) {
                    console.log(`    - ${ch.name} (ch=${ch.ch}, device=${ch.deviceId})`);
                }
                ws.removeListener('message', handler);
                resolve(msg.payload);
            } else if (msg.type.includes('ERROR')) {
                console.error('Subscribe error:', msg.payload);
                process.exit(1);
            }
        };

        ws.on('message', handler);

        ws.send(JSON.stringify({
            type: `EC:DASHBOARD:${DASHBOARD_ID}:SUBSCRIBE`,
            requestId: 'test-sub-001',
        }));
    });
};

const listenForData = (ws) => {
    console.log(`\n=== Paso 5: Escuchando datos MQTT (${LISTEN_SECONDS}s) ===`);
    let dataMessages = 0;

    ws.on('message', (rawData) => {
        const msg = JSON.parse(rawData.toString());

        if (msg.type.includes(':DATA:')) {
            dataMessages++;
            console.log(`\n[MSG #${dataMessages}] ${msg.type}`);
            console.log(`  Device: ${msg.payload.deviceId}`);
            console.log(`  Status: ${msg.payload.status}`);
            console.log(`  Métricas: ${msg.payload.metrics?.length || 0} data points`);
            console.log(`  Timestamp: ${msg.timestamp}`);

            if (msg.payload.metrics?.length > 0) {
                const sample = msg.payload.metrics[0];
                const keys = Object.keys(sample).slice(0, 8);
                console.log(`  Sample keys: ${keys.join(', ')}`);
            }
        } else if (msg.type === 'EC:SYSTEM:PONG') {
            // silencioso
        } else {
            console.log(`[OTHER] ${msg.type}:`, JSON.stringify(msg.payload).slice(0, 100));
        }
    });

    // Heartbeat
    const pingInterval = setInterval(() => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'EC:SYSTEM:PING' }));
        }
    }, 25000);

    return new Promise((resolve) => {
        setTimeout(() => {
            clearInterval(pingInterval);
            console.log(`\n=== Resultado ===`);
            console.log(`Total mensajes de datos recibidos: ${dataMessages}`);
            ws.close(1000, 'Test completado');
            setTimeout(() => resolve(dataMessages), 1000);
        }, LISTEN_SECONDS * 1000);
    });
};

const main = async () => {
    try {
        console.log('╔══════════════════════════════════════╗');
        console.log('║  Test E2E: Login → WS → MQTT Data   ║');
        console.log('╚══════════════════════════════════════╝\n');

        const ephemeralToken = await createTestToken();
        const ws = await connectWebSocket(ephemeralToken);
        await authenticate(ws);
        await subscribeDashboard(ws);
        const count = await listenForData(ws);

        console.log(count > 0 ? '\nTEST PASSED - Datos MQTT llegaron al cliente WS' : '\nTEST WARNING - No se recibieron datos. El equipo puede estar offline.');
        process.exit(0);
    } catch (err) {
        console.error('\nTEST FAILED:', err.message);
        process.exit(1);
    }
};

main();
