# Guía de Setup en Producción

Esta guía cubre todos los pasos necesarios para levantar el sistema desde cero en producción.

---

## Variables de entorno requeridas

| Variable | Descripción | Requerida |
|---|---|---|
| `DATABASE_URL` | URL de conexión a PostgreSQL (`postgresql://user:pass@host:5432/dbname`) | Sí |
| `NODE_ENV` | Entorno de ejecución. Usar `production` | Sí |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | Sí |
| `JWT_REFRESH_SECRET` | Clave secreta para tokens de refresh | Sí |
| `PORT` | Puerto en el que escucha el servidor (default: `3000`) | No |
| `DATABASE_SSL` | Controla SSL para la BD. Poner `false` solo en desarrollo local | No |
| `LOG_LEVEL` | Nivel de logging (`info`, `debug`, `warn`, `error`) | No |

---

## Extensiones de PostgreSQL requeridas

El sistema utiliza las siguientes extensiones de PostgreSQL que deben estar habilitadas:

| Extensión | Uso |
|---|---|
| `ltree` | Jerarquía de recursos (árbol de sitios, carpetas, canales) |
| `uuid-ossp` | Generación de UUIDs con `uuid_generate_v4()` |
| `pgcrypto` | Generación de UUIDs con `gen_random_uuid()` |

> **Nota importante:** Si estas extensiones no están habilitadas, se producirán errores como `operator does not exist: text <@ ltree` al ejecutar consultas. El script de setup las habilita automáticamente.

---

## Pasos de setup en orden

### Opción A: Setup automatizado (recomendado)

Ejecutar el script de setup que realiza todos los pasos de forma idempotente:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname \
NODE_ENV=production \
bash scripts/production-setup.sh
```

El script realiza en orden:
1. Verifica que `DATABASE_URL` esté definido
2. Instala dependencias de Node.js
3. Habilita las extensiones de PostgreSQL (`ltree`, `uuid-ossp`, `pgcrypto`)
4. Detecta si la BD ya tiene el schema (tabla `organizations`):
   - **BD vacía (nueva instalación):** no marca nada; las migraciones crean todo desde baseline.
   - **BD con schema existente (ej. restaurado desde dump):** marca el baseline en `SequelizeMeta` para evitar conflictos, luego aplica solo las migraciones posteriores.
5. Ejecuta todas las migraciones pendientes con `npm run db:migrate`

### Opción B: Setup manual paso a paso

#### 1. Configurar variables de entorno

Crear el archivo `.env` en la raíz del proyecto (o configurarlas en el sistema):

```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NODE_ENV=production
JWT_SECRET=<clave-secreta-larga-y-aleatoria>
JWT_REFRESH_SECRET=<otra-clave-secreta-larga-y-aleatoria>
```

#### 2. Instalar dependencias

```bash
npm install
```

#### 3. Habilitar extensiones en PostgreSQL

Conectarse a la base de datos y ejecutar:

```sql
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Con `psql`:

```bash
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS ltree;"
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

#### 4. Marcar baseline migration (solo si la BD ya tiene el schema)

**Este paso solo aplica si la BD ya contiene tablas** (ej. se restauró desde un dump).
Si la BD está vacía (nueva instalación), **omitir este paso** — las migraciones crearán todo desde cero empezando por baseline.

Si la base de datos ya contiene el schema pero no tiene la tabla `SequelizeMeta`, ejecutar:

```sql
CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
  name VARCHAR(255) NOT NULL,
  CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name)
);

INSERT INTO "SequelizeMeta" (name)
VALUES ('20260320100000-baseline-schema.cjs')
ON CONFLICT (name) DO NOTHING;
```

#### 5. Ejecutar migraciones

```bash
NODE_ENV=production npm run db:migrate
```

#### 6. Iniciar la aplicación

```bash
NODE_ENV=production npm start
```

---

## Verificación post-setup

Confirmar que el setup fue exitoso:

```bash
# Verificar extensiones habilitadas
psql $DATABASE_URL -c "SELECT name, default_version FROM pg_available_extensions WHERE name IN ('ltree', 'uuid-ossp', 'pgcrypto');"

# Verificar migraciones ejecutadas
psql $DATABASE_URL -c "SELECT * FROM \"SequelizeMeta\" ORDER BY name;"

# Verificar tablas creadas
psql $DATABASE_URL -c "\dt"
```

---

## Re-ejecución y actualizaciones

El script `scripts/production-setup.sh` es **idempotente**: puede ejecutarse múltiples veces sin romper nada. Esto lo hace seguro para:

- Re-aplicar después de un merge o deploy
- Verificar el estado del entorno en cualquier momento
- Recuperarse de una instalación parcialmente fallida

---

## Troubleshooting

### Error: `operator does not exist: text <@ ltree`

La extensión `ltree` no está habilitada. Ejecutar:

```bash
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS ltree;"
```

O re-ejecutar el script de setup completo.

### Error: `relation "SequelizeMeta" already exists`

Este error no debería ocurrir ya que el script usa `CREATE TABLE IF NOT EXISTS`. Si aparece, verificar permisos del usuario de BD.

### Error: `already applied` en migraciones

Sequelize informa que las migraciones ya fueron aplicadas. Esto es normal y no requiere acción.

### Error: `DATABASE_URL` no definido

Asegurarse de exportar la variable antes de ejecutar el script:

```bash
export DATABASE_URL=postgresql://...
bash scripts/production-setup.sh
```

---

## Script de referencia

Ver [`scripts/production-setup.sh`](scripts/production-setup.sh) para el proceso automatizado completo.
