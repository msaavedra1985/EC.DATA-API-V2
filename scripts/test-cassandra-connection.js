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
        
        // UUID de prueba del primer dispositivo
        const testUuid = '41eb0f66-575c-4f40-833e-fd9b6384606c'; // HL - Westin - Azotea Nodo 1
        console.log(`   Buscando datos para equipo: ${testUuid}`);
        
        // Consultar últimos 10 registros de la última semana
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const query = `
            SELECT fecha_hora, ch, kwh, kw, kvarh, kvar, kvah, kva, fp, hz, 
                   v1n, v2n, v3n, i1, i2, i3
            FROM sensores."1m_t_datos"
            WHERE equipo = ?
            AND fecha_hora >= ?
            LIMIT 10
            ALLOW FILTERING
        `;
        
        try {
            const result = await execute(query, [testUuid, oneWeekAgo]);
            
            if (result.rows.length === 0) {
                console.log(colors.yellow('   ⚠️  No se encontraron datos en la última semana'));
                console.log('   Probando con rango más amplio (último mes)...');
                
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                
                const result2 = await execute(query, [testUuid, oneMonthAgo]);
                
                if (result2.rows.length === 0) {
                    console.log(colors.yellow('   ⚠️  No hay datos del último mes'));
                    
                    // Intentar sin filtro de fecha
                    console.log('   Intentando sin filtro de fecha...');
                    const queryNoDate = `
                        SELECT fecha_hora, ch, kwh, kw
                        FROM sensores."1m_t_datos"
                        WHERE equipo = ?
                        LIMIT 5
                        ALLOW FILTERING
                    `;
                    const result3 = await execute(queryNoDate, [testUuid]);
                    
                    if (result3.rows.length > 0) {
                        console.log(colors.green(`   ✅ Encontrados ${result3.rows.length} registros históricos`));
                        console.log('   Primeros registros:');
                        result3.rows.forEach((row, i) => {
                            console.log(`   ${i+1}. ${row.fecha_hora} | CH${row.ch} | kWh: ${row.kwh}`);
                        });
                    } else {
                        console.log(colors.red('   ❌ No se encontraron datos para este equipo'));
                    }
                } else {
                    console.log(colors.green(`   ✅ Encontrados ${result2.rows.length} registros del último mes`));
                }
            } else {
                console.log(colors.green(`   ✅ Encontrados ${result.rows.length} registros`));
                console.log('\n   Muestra de datos:');
                result.rows.slice(0, 5).forEach((row, i) => {
                    console.log(`   ${i+1}. ${row.fecha_hora} | CH${row.ch} | kWh: ${row.kwh} | kW: ${row.kw}`);
                });
            }
        } catch (queryError) {
            console.log(colors.red(`   ❌ Error en consulta: ${queryError.message}`));
            
            // Mostrar tablas alternativas
            console.log('\n   Probando con otras resoluciones...');
            const altTables = ['15m_t_datos', '60m_t_datos', 'daily_t_datos'];
            for (const table of altTables) {
                try {
                    const altQuery = `SELECT COUNT(*) as total FROM sensores."${table}" LIMIT 1`;
                    await execute(altQuery);
                    console.log(colors.green(`   ✅ Tabla ${table} accesible`));
                } catch (e) {
                    console.log(colors.red(`   ❌ Tabla ${table}: ${e.message}`));
                }
            }
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
