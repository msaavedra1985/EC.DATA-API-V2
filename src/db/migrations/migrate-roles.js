/**
 * Script de migración: De role ENUM a role_id FK
 * Migra datos existentes de users.role (ENUM) a users.role_id (UUID FK)
 * 
 * Pasos:
 * 1. Crear tabla roles si no existe
 * 2. Sembrar roles
 * 3. Agregar columna role_id a users
 * 4. Mapear datos: admin→system-admin, manager→org-manager, user→user
 * 5. Eliminar columna role antigua
 */

import sequelize from '../sql/sequelize.js';
import { dbLogger } from '../../utils/logger.js';
import { seedRoles } from '../seeders/roles.seeder.js';

const migrate = async () => {
    const transaction = await sequelize.transaction();
    
    try {
        dbLogger.info('🔄 Iniciando migración de role ENUM a role_id FK...');

        // Paso 1: Crear tabla roles si no existe
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id UUID PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            )
        `, { transaction });
        dbLogger.info('✅ Tabla roles creada/verificada');

        // Paso 2: Sembrar roles si no existen
        const rolesResult = await seedRoles();
        dbLogger.info(`✅ ${rolesResult.rolesCreated} roles creados, ${rolesResult.rolesSkipped} ya existían`);

        // Paso 3: Obtener IDs de roles para mapping
        const [roles] = await sequelize.query(`
            SELECT id, name FROM roles WHERE name IN ('system-admin', 'org-manager', 'user')
        `, { transaction });

        const roleMap = {};
        roles.forEach(r => {
            roleMap[r.name] = r.id;
        });

        dbLogger.info('✅ Roles mapeados:', roleMap);

        // Paso 4: Agregar columna role_id si no existe
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'role_id'
                ) THEN
                    ALTER TABLE users ADD COLUMN role_id UUID;
                END IF;
            END $$;
        `, { transaction });
        dbLogger.info('✅ Columna role_id agregada/verificada');

        // Paso 5: Migrar datos de role a role_id
        await sequelize.query(`
            UPDATE users
            SET role_id = CASE
                WHEN role = 'admin' THEN :systemAdminId::uuid
                WHEN role = 'manager' THEN :orgManagerId::uuid
                WHEN role = 'user' THEN :userId::uuid
                ELSE :userId::uuid
            END
            WHERE role_id IS NULL
        `, {
            replacements: {
                systemAdminId: roleMap['system-admin'],
                orgManagerId: roleMap['org-manager'],
                userId: roleMap['user']
            },
            transaction
        });
        dbLogger.info('✅ Datos migrados de role a role_id');

        // Paso 6: Hacer role_id NOT NULL
        await sequelize.query(`
            ALTER TABLE users ALTER COLUMN role_id SET NOT NULL
        `, { transaction });
        dbLogger.info('✅ role_id configurado como NOT NULL');

        // Paso 7: Agregar FK constraint
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'users_role_id_fk'
                ) THEN
                    ALTER TABLE users 
                    ADD CONSTRAINT users_role_id_fk 
                    FOREIGN KEY (role_id) REFERENCES roles(id) 
                    ON UPDATE CASCADE ON DELETE RESTRICT;
                END IF;
            END $$;
        `, { transaction });
        dbLogger.info('✅ Foreign key constraint agregada');

        // Paso 8: Eliminar columna role antigua
        await sequelize.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'role'
                ) THEN
                    ALTER TABLE users DROP COLUMN role;
                END IF;
            END $$;
        `, { transaction });
        dbLogger.info('✅ Columna role (ENUM) eliminada');

        // Paso 9: Crear índice en role_id
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS users_role_id_idx ON users(role_id)
        `, { transaction });
        dbLogger.info('✅ Índice users_role_id_idx creado');

        await transaction.commit();
        dbLogger.info('🎉 Migración completada exitosamente');
        
        return true;
    } catch (error) {
        await transaction.rollback();
        dbLogger.error(error, '❌ Error en migración');
        throw error;
    }
};

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    migrate()
        .then(() => {
            dbLogger.info('✅ Script de migración finalizado');
            process.exit(0);
        })
        .catch((error) => {
            dbLogger.error(error, '❌ Error ejecutando migración');
            process.exit(1);
        });
}

export default migrate;
