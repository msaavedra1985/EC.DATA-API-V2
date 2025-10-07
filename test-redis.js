// Script de prueba de conexión Redis
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const testRedisConnection = async () => {
    console.log('🔍 Probando conexión a Redis...\n');
    
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
        console.error('❌ REDIS_URL no está configurado en las variables de entorno');
        process.exit(1);
    }
    
    console.log('📋 REDIS_URL configurado:', redisUrl.replace(/:[^:@]+@/, ':****@')); // Ocultar password
    console.log('');
    
    try {
        const client = createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: false,
                connectTimeout: 10000, // 10 segundos
            }
        });
        
        // Eventos de depuración
        client.on('error', (err) => {
            console.error('❌ Error del cliente Redis:', err.message);
        });
        
        client.on('connect', () => {
            console.log('🔌 Conectando a Redis...');
        });
        
        client.on('ready', () => {
            console.log('✅ Cliente Redis listo');
        });
        
        console.log('🚀 Iniciando conexión...\n');
        await client.connect();
        
        // Prueba básica: PING
        console.log('📡 Ejecutando PING...');
        const pingResult = await client.ping();
        console.log('✅ PING response:', pingResult);
        
        // Prueba SET/GET
        console.log('\n📝 Probando SET...');
        await client.set('test:connection', 'Hello from EC.DATA API!', { EX: 60 });
        console.log('✅ SET exitoso');
        
        console.log('\n📖 Probando GET...');
        const value = await client.get('test:connection');
        console.log('✅ GET exitoso:', value);
        
        // Info del servidor
        console.log('\n📊 Información del servidor Redis:');
        const info = await client.info('server');
        const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
        const mode = info.match(/redis_mode:([^\r\n]+)/)?.[1];
        console.log('   - Versión:', version);
        console.log('   - Modo:', mode);
        
        // Limpiar
        await client.del('test:connection');
        console.log('\n🧹 Clave de prueba eliminada');
        
        await client.quit();
        console.log('\n✅ Conexión cerrada correctamente');
        console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! Redis está funcionando correctamente.\n');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ERROR DE CONEXIÓN:');
        console.error('   Tipo:', error.constructor.name);
        console.error('   Mensaje:', error.message);
        if (error.code) {
            console.error('   Código:', error.code);
        }
        if (error.cause) {
            console.error('   Causa:', error.cause);
        }
        console.error('\n📝 Stack trace completo:');
        console.error(error.stack);
        process.exit(1);
    }
};

testRedisConnection();
