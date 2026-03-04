import WebSocket from 'ws';
import crypto from 'crypto';
import { createClient } from 'redis';

const WS_URL = 'ws://localhost:5000/ws';
const DEVICE_UUID = process.argv[2] || '948ca6a5-3a00-4591-a409-1115ce1fc686';
const LISTEN_SECONDS = parseInt(process.argv[3] || '60', 10);

const USER_ID = '019c42bd-774a-7345-8216-598d2149ca99';
const ORG_ID = '019c47b7-8ec1-76e3-90c3-2afdbffac557';

const createTestToken = async () => {
    console.log('=== Paso 1: Generar token efímero ===');
    const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await redis.connect();

    const tokenId = `eph_${crypto.randomBytes(32).toString('hex')}`;
    const tokenData = {
        tokenId,
        userId: USER_ID,
        organizationId: ORG_ID,
        role: 'system-admin',
        allowedServices: ['SYSTEM', 'DEV'],
        email: 'admin@ecdata.com',
        createdAt: new Date().toISOString(),
    };

    await redis.setEx(`ws:ephemeral:${tokenId}`, 300, JSON.stringify(tokenData));
    await redis.quit();

    console.log(`Token: ${tokenId.slice(0, 20)}...`);
    return tokenId;
};

const connectAndAuth = (token) => {
    return new Promise((resolve, reject) => {
        console.log('\n=== Paso 2: Conectar y autenticar WS ===');
        const ws = new WebSocket(`${WS_URL}?token=${token}`);

        ws.on('open', () => {
            console.log('WS conectado');
            ws.send(JSON.stringify({
                type: 'EC:SYSTEM:AUTH',
                payload: { services: ['DEV'] },
            }));
        });

        ws.on('message', (rawData) => {
            const msg = JSON.parse(rawData.toString());
            if (msg.type === 'EC:SYSTEM:CONNECTED') {
                console.log(`Sesión: ${msg.payload.sessionId}`);
                console.log(`Servicios: ${msg.payload.allowedServices.join(', ')}`);
                resolve(ws);
            } else if (msg.type === 'EC:SYSTEM:ERROR') {
                reject(new Error(`Auth error: ${msg.payload.message}`));
            }
        });

        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
};

const subscribeDevice = (ws) => {
    return new Promise((resolve, reject) => {
        console.log(`\n=== Paso 3: Suscribir al device ${DEVICE_UUID} ===`);

        const handler = (rawData) => {
            const msg = JSON.parse(rawData.toString());
            if (msg.type === 'EC:DEV:MQTT:SUBSCRIBED') {
                console.log('Suscripción exitosa:');
                console.log(`  Device UUID: ${msg.payload.deviceUuid}`);
                console.log(`  Brokers:`);
                for (const b of msg.payload.brokers) {
                    console.log(`    - Broker ${b.index}: ${b.connected ? 'conectado' : 'desconectado'}`);
                }
                ws.removeListener('message', handler);
                resolve(msg.payload);
            } else if (msg.type.includes('ERROR')) {
                console.error('Subscribe error:', msg.payload);
                reject(new Error(msg.payload.message));
            }
        };

        ws.on('message', handler);

        ws.send(JSON.stringify({
            type: 'EC:DEV:MQTT:SUBSCRIBE',
            payload: { deviceUuid: DEVICE_UUID },
            requestId: 'dev-test-001',
        }));
    });
};

const listenForData = (ws) => {
    console.log(`\n=== Paso 4: Escuchando data MQTT real (${LISTEN_SECONDS}s) ===`);
    console.log('Esperando mensajes del equipo...\n');
    let dataMessages = 0;

    ws.on('message', (rawData) => {
        const msg = JSON.parse(rawData.toString());

        if (msg.type === 'EC:DEV:MQTT:DATA') {
            dataMessages++;
            const data = msg.payload.data;
            const topic = msg.payload.topic;
            console.log(`[MSG #${dataMessages}] ${new Date().toISOString()}`);
            console.log(`  Topic: ${topic}`);
            console.log(`  Broker: ${msg.payload.brokerIndex}`);

            if (data.rtdata && Array.isArray(data.rtdata)) {
                console.log(`  Data points: ${data.rtdata.length}`);
                if (data.rtdata.length > 0) {
                    const sample = data.rtdata[0];
                    const keys = Object.keys(sample);
                    console.log(`  Sample keys: ${keys.slice(0, 10).join(', ')}`);
                    console.log(`  Sample: ${JSON.stringify(sample).slice(0, 200)}`);
                }
            } else {
                const keys = Object.keys(data);
                console.log(`  Keys: ${keys.slice(0, 10).join(', ')}`);
                console.log(`  Data: ${JSON.stringify(data).slice(0, 300)}`);
            }
            console.log('');
        } else if (msg.type === 'EC:SYSTEM:PONG') {
            // silencioso
        } else {
            console.log(`[OTHER] ${msg.type}`);
        }
    });

    const pingInterval = setInterval(() => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'EC:SYSTEM:PING' }));
        }
    }, 25000);

    return new Promise((resolve) => {
        setTimeout(() => {
            clearInterval(pingInterval);
            console.log(`=== Resultado ===`);
            console.log(`Total mensajes recibidos: ${dataMessages}`);
            ws.close(1000, 'Test completado');
            setTimeout(() => resolve(dataMessages), 1000);
        }, LISTEN_SECONDS * 1000);
    });
};

const main = async () => {
    try {
        console.log('╔══════════════════════════════════════════╗');
        console.log('║  Test EC:DEV:MQTT - Datos reales MQTT    ║');
        console.log('╚══════════════════════════════════════════╝');
        console.log(`Device UUID: ${DEVICE_UUID}`);
        console.log(`Tiempo de escucha: ${LISTEN_SECONDS}s\n`);

        const token = await createTestToken();
        const ws = await connectAndAuth(token);
        await subscribeDevice(ws);
        const count = await listenForData(ws);

        console.log(count > 0
            ? '\nTEST PASSED - Datos MQTT reales recibidos'
            : '\nTEST WARNING - No se recibieron datos. El equipo puede estar offline.');
        process.exit(0);
    } catch (err) {
        console.error('\nTEST FAILED:', err.message);
        process.exit(1);
    }
};

main();
