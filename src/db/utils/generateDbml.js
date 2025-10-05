/**
 * Utilidad para generar esquema DBML desde PostgreSQL
 * DBML (Database Markup Language) permite visualizar el esquema en dbdiagram.io
 */
import sequelize from '../sql/sequelize.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Mapeo de tipos PostgreSQL a tipos DBML
 */
const typeMapping = {
    'CHARACTER VARYING': 'varchar',
    'INTEGER': 'integer',
    'BIGINT': 'bigint',
    'SMALLINT': 'smallint',
    'BOOLEAN': 'boolean',
    'TEXT': 'text',
    'TIMESTAMP WITH TIME ZONE': 'timestamptz',
    'TIMESTAMP WITHOUT TIME ZONE': 'timestamp',
    'DATE': 'date',
    'UUID': 'uuid',
    'JSONB': 'jsonb',
    'JSON': 'json',
    'SERIAL': 'serial',
    'BIGSERIAL': 'bigserial',
    'NUMERIC': 'numeric',
    'DECIMAL': 'decimal',
    'REAL': 'real',
    'DOUBLE PRECISION': 'double'
};

/**
 * Obtener información de todas las tablas del esquema público
 */
const getTables = async () => {
    const [tables] = await sequelize.query(`
        SELECT 
            table_name,
            obj_description((table_schema||'.'||table_name)::regclass, 'pg_class') as table_comment
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `);
    return tables;
};

/**
 * Obtener columnas de una tabla con sus propiedades
 */
const getColumns = async (tableName) => {
    const [columns] = await sequelize.query(`
        SELECT 
            c.column_name,
            c.data_type,
            c.character_maximum_length,
            c.is_nullable,
            c.column_default,
            c.udt_name,
            pgd.description as column_comment
        FROM information_schema.columns c
        LEFT JOIN pg_catalog.pg_statio_all_tables st ON c.table_name = st.relname
        LEFT JOIN pg_catalog.pg_description pgd ON pgd.objoid = st.relid 
            AND pgd.objsubid = c.ordinal_position
        WHERE c.table_name = :tableName
        AND c.table_schema = 'public'
        ORDER BY c.ordinal_position;
    `, {
        replacements: { tableName }
    });
    return columns;
};

/**
 * Obtener constraints (PK, FK, UNIQUE) de una tabla
 */
const getConstraints = async (tableName) => {
    const [constraints] = await sequelize.query(`
        SELECT 
            tc.constraint_type,
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.table_name = :tableName
        AND tc.table_schema = 'public'
        ORDER BY tc.constraint_type, kcu.ordinal_position;
    `, {
        replacements: { tableName }
    });
    return constraints;
};

/**
 * Obtener índices de una tabla
 */
const getIndexes = async (tableName) => {
    const [indexes] = await sequelize.query(`
        SELECT
            i.relname as index_name,
            a.attname as column_name,
            ix.indisunique as is_unique,
            ix.indisprimary as is_primary
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = :tableName
        AND t.relkind = 'r'
        AND NOT ix.indisprimary
        ORDER BY i.relname, a.attnum;
    `, {
        replacements: { tableName }
    });
    return indexes;
};

/**
 * Convertir tipo PostgreSQL a tipo DBML
 */
const convertType = (column) => {
    const baseType = column.data_type.toUpperCase();
    const mappedType = typeMapping[baseType] || column.data_type.toLowerCase();
    
    // Agregar longitud para varchar
    if (mappedType === 'varchar' && column.character_maximum_length) {
        return `varchar(${column.character_maximum_length})`;
    }
    
    // Para tipos enum personalizados
    if (baseType === 'USER-DEFINED') {
        return column.udt_name;
    }
    
    return mappedType;
};

/**
 * Generar definición DBML de una tabla
 */
const generateTableDbml = async (tableName) => {
    const columns = await getColumns(tableName);
    const constraints = await getConstraints(tableName);
    const indexes = await getIndexes(tableName);
    
    let dbml = `Table ${tableName} {\n`;
    
    // Columnas
    for (const col of columns) {
        const type = convertType(col);
        const settings = [];
        
        // Primary Key
        const isPk = constraints.some(c => 
            c.constraint_type === 'PRIMARY KEY' && c.column_name === col.column_name
        );
        if (isPk) settings.push('pk');
        
        // Unique
        const isUnique = constraints.some(c => 
            c.constraint_type === 'UNIQUE' && c.column_name === col.column_name
        );
        if (isUnique && !isPk) settings.push('unique');
        
        // Not null
        if (col.is_nullable === 'NO') settings.push('not null');
        
        // Default value
        if (col.column_default) {
            let defaultVal = col.column_default;
            // Simplificar defaults comunes
            if (defaultVal.includes('nextval')) {
                settings.push('increment');
            } else if (defaultVal === 'true') {
                settings.push('default: true');
            } else if (defaultVal === 'false') {
                settings.push('default: false');
            } else if (defaultVal.includes('now()') || defaultVal.includes('CURRENT_TIMESTAMP')) {
                settings.push('default: `now()`');
            }
        }
        
        const settingsStr = settings.length > 0 ? ` [${settings.join(', ')}]` : '';
        const commentStr = col.column_comment ? ` // ${col.column_comment}` : '';
        
        dbml += `  ${col.column_name} ${type}${settingsStr}${commentStr}\n`;
    }
    
    // Índices (solo los que no son PK ni UNIQUE constraints)
    const customIndexes = indexes.filter(idx => !idx.is_unique && !idx.is_primary);
    if (customIndexes.length > 0) {
        dbml += '\n  Indexes {\n';
        const indexGroups = {};
        customIndexes.forEach(idx => {
            if (!indexGroups[idx.index_name]) {
                indexGroups[idx.index_name] = [];
            }
            indexGroups[idx.index_name].push(idx.column_name);
        });
        
        Object.entries(indexGroups).forEach(([name, cols]) => {
            dbml += `    (${cols.join(', ')}) [name: '${name}']\n`;
        });
        dbml += '  }\n';
    }
    
    dbml += '}\n';
    return dbml;
};

/**
 * Generar referencias (Foreign Keys) en formato DBML
 */
const generateReferences = async () => {
    const [fks] = await sequelize.query(`
        SELECT 
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.update_rule,
            rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name;
    `);
    
    let refs = '\n// Foreign Key References\n';
    fks.forEach(fk => {
        const updateRule = fk.update_rule !== 'NO ACTION' ? `, update: ${fk.update_rule.toLowerCase()}` : '';
        const deleteRule = fk.delete_rule !== 'NO ACTION' ? `, delete: ${fk.delete_rule.toLowerCase()}` : '';
        const rules = (updateRule || deleteRule) ? ` [${(updateRule + deleteRule).substring(2)}]` : '';
        
        refs += `Ref: ${fk.table_name}.${fk.column_name} > ${fk.foreign_table_name}.${fk.foreign_column_name}${rules}\n`;
    });
    
    return refs;
};

/**
 * Generar archivo DBML completo
 */
export const generateDbmlFile = async () => {
    try {
        console.log('📊 Generando esquema DBML desde PostgreSQL...\n');
        
        // Conectar a la base de datos
        await sequelize.authenticate();
        
        const tables = await getTables();
        console.log(`✅ Encontradas ${tables.length} tablas\n`);
        
        let dbmlContent = `// Database Schema - Generated on ${new Date().toISOString()}\n`;
        dbmlContent += `// Project: API EC ESM - Enterprise REST API\n`;
        dbmlContent += `// Use this file at https://dbdiagram.io to visualize the schema\n\n`;
        
        // Generar definición de cada tabla
        for (const table of tables) {
            console.log(`  📋 Procesando tabla: ${table.table_name}`);
            if (table.table_comment) {
                dbmlContent += `// ${table.table_comment}\n`;
            }
            dbmlContent += await generateTableDbml(table.table_name);
            dbmlContent += '\n';
        }
        
        // Generar referencias
        dbmlContent += await generateReferences();
        
        // Guardar archivo en la raíz del proyecto
        const outputPath = path.join(process.cwd(), 'database.dbml.txt');
        await fs.writeFile(outputPath, dbmlContent, 'utf-8');
        
        console.log(`\n✅ Archivo DBML generado exitosamente: database.dbml.txt`);
        console.log(`📍 Ubicación: ${outputPath}`);
        console.log('\n💡 Para visualizar:');
        console.log('   1. Visita https://dbdiagram.io');
        console.log('   2. Copia el contenido de database.dbml.txt');
        console.log('   3. Pégalo en el editor para ver el diagrama\n');
        
        await sequelize.close();
        return outputPath;
    } catch (error) {
        console.error('❌ Error generando DBML:', error);
        throw error;
    }
};

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    generateDbmlFile()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
