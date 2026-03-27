#!/bin/bash
# =============================================================================
# production-setup.sh
#
# Script de setup inicial de producción.
# Ejecutar UNA VEZ cuando se levanta el sistema desde cero en producción,
# o cuando se necesita garantizar que la BD está completamente configurada.
#
# Es idempotente: puede ejecutarse múltiples veces sin romper nada.
#
# Comportamiento:
#   - BD vacía (nueva instalación): ejecuta todas las migraciones desde baseline.
#   - BD con schema existente (sin SequelizeMeta): marca baseline y aplica el resto.
#   - BD ya configurada: no hace cambios destructivos.
#
# Uso:
#   DATABASE_URL=<url> NODE_ENV=production bash scripts/production-setup.sh
# =============================================================================

set -e

echo "[production-setup] Iniciando setup de producción..."

# -----------------------------------------------------------------------------
# 1. Verificar variables de entorno requeridas
# -----------------------------------------------------------------------------
if [ -z "$DATABASE_URL" ]; then
  echo "[production-setup] ERROR: La variable de entorno DATABASE_URL no está definida."
  echo "[production-setup]        Ejemplo: DATABASE_URL=postgresql://user:pass@host:5432/dbname"
  exit 1
fi

echo "[production-setup] Variable DATABASE_URL: OK"

# -----------------------------------------------------------------------------
# 2. Instalar dependencias de Node
# -----------------------------------------------------------------------------
echo "[production-setup] Instalando dependencias..."
npm install --prefer-offline

# -----------------------------------------------------------------------------
# 3. Habilitar extensiones de PostgreSQL requeridas
# -----------------------------------------------------------------------------
echo "[production-setup] Habilitando extensiones de PostgreSQL (ltree, uuid-ossp, pgcrypto)..."
node -e "
const { Sequelize } = require('sequelize');
const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.DATABASE_SSL !== 'false' ? { require: true, rejectUnauthorized: false } : false
  },
  logging: false
});

seq.query(\`
  CREATE EXTENSION IF NOT EXISTS ltree;
  CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
\`)
  .then(() => {
    console.log('[production-setup] Extensiones habilitadas: ltree, uuid-ossp, pgcrypto');
    seq.close();
  })
  .catch(e => {
    console.error('[production-setup] ERROR al habilitar extensiones:', e.message);
    seq.close();
    process.exit(1);
  });
"

# -----------------------------------------------------------------------------
# 4. Marcar el baseline migration como ejecutado SOLO si el schema ya existe.
#
#    Lógica:
#      - Si la tabla 'organizations' existe => el schema fue creado por medios
#        externos (ej. dump restore). Se marca baseline para que Sequelize no
#        intente recrear las tablas y solo aplique migraciones posteriores.
#      - Si la tabla 'organizations' NO existe => la BD está vacía. No se marca
#        nada; las migraciones arrancan desde baseline y crean todo desde cero.
# -----------------------------------------------------------------------------
echo "[production-setup] Verificando si el schema ya existe en la BD..."
node -e "
const { Sequelize } = require('sequelize');
const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.DATABASE_SSL !== 'false' ? { require: true, rejectUnauthorized: false } : false
  },
  logging: false
});

seq.query(\`
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) AS schema_exists;
\`, { type: 'SELECT' })
  .then(([result]) => {
    const schemaExists = result.schema_exists === true || result.schema_exists === 't' || result.schema_exists === 'true';

    if (!schemaExists) {
      console.log('[production-setup] BD vacía detectada: las migraciones crearán el schema desde cero.');
      seq.close();
      return;
    }

    console.log('[production-setup] Schema existente detectado: marcando baseline migration para evitar conflictos...');
    return seq.query(\`
      CREATE TABLE IF NOT EXISTS \"SequelizeMeta\" (
        name VARCHAR(255) NOT NULL,
        CONSTRAINT \"SequelizeMeta_pkey\" PRIMARY KEY (name)
      );
    \`)
      .then(() => seq.query(\`
        INSERT INTO \"SequelizeMeta\" (name)
        VALUES ('20260320100000-baseline-schema.cjs')
        ON CONFLICT (name) DO NOTHING;
      \`))
      .then(() => {
        console.log('[production-setup] Baseline migration marcado correctamente.');
        seq.close();
      });
  })
  .catch(e => {
    console.error('[production-setup] ERROR al verificar schema existente:', e.message);
    seq.close();
    process.exit(1);
  });
"

# -----------------------------------------------------------------------------
# 5. Ejecutar todas las migraciones pendientes en orden
# -----------------------------------------------------------------------------
echo "[production-setup] Ejecutando migraciones de base de datos..."
NODE_ENV=${NODE_ENV:-production} npm run db:migrate

echo ""
echo "[production-setup] Setup de producción completado exitosamente."
echo "[production-setup] La base de datos está configurada con:"
echo "[production-setup]   - Extensiones: ltree, uuid-ossp, pgcrypto"
echo "[production-setup]   - Todas las migraciones aplicadas"
