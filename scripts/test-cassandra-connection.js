// scripts/test-cassandra-connection.js
// Script de prueba para verificar conexión a Cassandra y explorar datos de Hoteles Libertador
// Ejecutar: node scripts/test-cassandra-connection.js

import 'dotenv/config';
import { 
    initCassandra, 
    execute, 
    listKeyspaces, 
    listTables, 
    describeTable,
    healthCheck,
    hasCredentials,
    closeCassandra
} from '../src/db/cassandra/client.js';

// Colores para output en consola
const colors = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// Separador visual
const separator = () => console.log('\n' + '='.repeat(60) + '\n');

const runTests = async () => {
    console.log(colors.bold('\n🔍 TEST DE CONEXIÓN A CASSANDRA - Hoteles Libertador\n'));
    
    // 1. Verificar credenciales
    separator();
    console.log(colors.cyan('1. Verificando credenciales...'));
    
    if (!hasCredentials()) {
        console.log(colors.red('❌ Credenciales no configuradas'));
        console.log('   Necesitas: CASSANDRA_HOST, CASSANDRA_USER, CASSANDRA_PASS');
        process.exit(1);
    }
    console.log(colors.green('✅ Credenciales encontradas'));
    console.log(`   Host: ${process.env.CASSANDRA_HOST}`);
    console.log(`   User: ${process.env.CASSANDRA_USER}`);
    
    // 2. Conectar a Cassandra
    separator();
    console.log(colors.cyan('2. Conectando a Cassandra...'));
    
    const connected = await initCassandra();
    if (!connected) {
        console.log(colors.red('❌ No se pudo conectar a Cassandra'));
        process.exit(1);
    }
    console.log(colors.green('✅ Conexión exitosa'));
    
    // 3. Health check
    separator();
    console.log(colors.cyan('3. Health check...'));
    const health = await healthCheck();
    console.log(`   Status: ${health.status}`);
    if (health.host) console.log(`   Host: ${health.host}:${health.port}`);
    
    // 4. Listar keyspaces
    separator();
    console.log(colors.cyan('4. Keyspaces disponibles:'));
    const keyspaces = await listKeyspaces();
    keyspaces.forEach(ks => {
        const highlight = ks === 'sensores' ? colors.yellow('← KEYSPACE DE TELEMETRÍA') : '';
        console.log(`   - ${ks} ${highlight}`);
    });
    
    // 5. Listar tablas del keyspace 'sensores'
    separator();
    console.log(colors.cyan('5. Tablas en keyspace "sensores":'));
    try {
        const tables = await listTables('sensores');
        tables.sort().forEach(table => {
            console.log(`   - ${table}`);
        });
        
        // 6. Describir tabla principal (1m_t_datos - datos cada 1 minuto)
        separator();
        console.log(colors.cyan('6. Estructura de tabla "1m_t_datos" (resolución 1 minuto):'));
        const columns = await describeTable('sensores', '1m_t_datos');
        columns.forEach(col => {
            const kindLabel = col.kind === 'partition_key' ? colors.yellow('[PK]') : 
                              col.kind === 'clustering' ? colors.cyan('[CK]') : '';
            console.log(`   ${col.name}: ${col.type} ${kindLabel}`);
        });
        
        // 7. Consultar datos de prueba
        separator();
        console.log(colors.cyan('7. Buscando datos de prueba de Hoteles Libertador...'));
        
        // UUID de prueba del primer dispositivo (legacy_uuid del device migrado)
        const testUuid = '41eb0f66-575c-4f40-833e-fd9b6384606c'; // HL - Westin - Azotea Nodo 1
        console.log(`   Buscando datos para uuid: ${testUuid}`);
        
        // La tabla usa: uuid (PK), year (PK), canal (PK), timestamp (CK)
        // Partition key compuesta requiere los 3 campos o ALLOW FILTERING
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;
        
        // Consulta con ALLOW FILTERING (necesario sin conocer el canal específico)
        const query = `
            SELECT uuid, canal, timestamp, e, p, v, i, pf, v1, v2, v3, i1, i2, i3
            FROM sensores."1m_t_datos"
            WHERE uuid = ? AND year = ?
            LIMIT 10
            ALLOW FILTERING
        `;
        
        try {
            console.log(`   Probando año ${currentYear}...`);
            let result = await execute(query, [testUuid, currentYear]);
            
            if (result.rows.length === 0) {
                console.log(colors.yellow(`   ⚠️  No hay datos en ${currentYear}, probando ${lastYear}...`));
                result = await execute(query, [testUuid, lastYear]);
            }
            
            if (result.rows.length === 0) {
                console.log(colors.yellow('   ⚠️  No hay datos recientes'));
                
                // Intentar obtener cualquier registro de este UUID
                console.log('   Buscando en cualquier año con ALLOW FILTERING...');
                const queryAny = `
                    SELECT uuid, year, canal, timestamp, e, p
                    FROM sensores."1m_t_datos"
                    WHERE uuid = ?
                    LIMIT 5
                    ALLOW FILTERING
                `;
                const resultAny = await execute(queryAny, [testUuid]);
                
                if (resultAny.rows.length > 0) {
                    console.log(colors.green(`   ✅ Encontrados ${resultAny.rows.length} registros históricos`));
                    console.log('   Datos encontrados:');
                    resultAny.rows.forEach((row, i) => {
                        console.log(`   ${i+1}. ${row.timestamp} | Año: ${row.year} | Canal: ${row.canal} | E: ${row.e} kWh | P: ${row.p} kW`);
                    });
                } else {
                    console.log(colors.red('   ❌ No se encontraron datos para este UUID'));
                    console.log('   Esto puede significar que el legacy_uuid no coincide');
                }
            } else {
                console.log(colors.green(`   ✅ Encontrados ${result.rows.length} registros`));
                console.log('\n   Muestra de datos:');
                result.rows.forEach((row, i) => {
                    console.log(`   ${i+1}. ${row.timestamp} | Canal: ${row.canal} | E: ${row.e} kWh | P: ${row.p} kW | V: ${row.v}V | PF: ${row.pf}`);
                });
            }
            
            // Probar también con tabla de 15 minutos
            separator();
            console.log(colors.cyan('8. Probando tabla de 15 minutos (15m_t_datos)...'));
            const query15m = `
                SELECT uuid, canal, timestamp, e, p, v, i
                FROM sensores."15m_t_datos"
                WHERE uuid = ? AND year = ?
                LIMIT 5
                ALLOW FILTERING
            `;
            const result15m = await execute(query15m, [testUuid, currentYear]);
            if (result15m.rows.length > 0) {
                console.log(colors.green(`   ✅ Encontrados ${result15m.rows.length} registros en 15m_t_datos`));
                result15m.rows.forEach((row, i) => {
                    console.log(`   ${i+1}. ${row.timestamp} | Canal: ${row.canal} | E: ${row.e} kWh`);
                });
            } else {
                console.log(colors.yellow('   ⚠️  Sin datos en 15m_t_datos para este año'));
            }
            
        } catch (queryError) {
            console.log(colors.red(`   ❌ Error en consulta: ${queryError.message}`));
        }
        
    } catch (error) {
        console.log(colors.red(`❌ Error: ${error.message}`));
    }
    
    // Cerrar conexión
    separator();
    console.log(colors.cyan('Cerrando conexión...'));
    await closeCassandra();
    console.log(colors.green('✅ Test completado'));
    
    process.exit(0);
};

// Ejecutar tests
runTests().catch(err => {
    console.error(colors.red(`Error fatal: ${err.message}`));
    process.exit(1);
});
