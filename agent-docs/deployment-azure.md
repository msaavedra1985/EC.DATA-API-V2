# Guía de Deployment — Azure App Service

> **CONSULTAR**: Al hacer deploy en Azure (fresh o re-deploy)

---

## Flujos de Deployment

### Fresh Deploy — Base de datos vacía (primera vez)

Usar cuando la base de datos de destino está completamente vacía.

```bash
# 1. Crear todas las tablas desde modelos + registrar migraciones históricas
npm run db:setup

# 2. Poblar datos base obligatorios (roles, países, tipos de dispositivo, etc.)
npm run db:seed:core

# 3. Poblar datos iniciales de la organización
npm run db:seed

# 4. Arrancar la API
npm start
```

**Por qué `db:setup` y no `db:migrate`**: las primeras 41 migraciones asumen que las
tablas base ya existen (fueron creadas originalmente por `sequelize.sync()` en desarrollo).
En una DB vacía, `db:migrate` falla con `relation does not exist`. `db:setup` hace el sync
primero y luego registra las migraciones como "ya ejecutadas".

---

### Re-Deploy — Base de datos existente

Usar en cada actualización de la API cuando la DB ya tiene datos.

```bash
# 1. Aplicar migraciones nuevas (seguro si no hay migraciones pendientes)
npm run db:migrate

# 2. Arrancar la API
npm start
```

**Verificar migraciones antes de deployar**:
```bash
npm run db:migrate:status
# Todo debería estar "up". Si hay "down", son las nuevas.
```

---

## Configuración en Azure App Service

### Startup Command (re-deploys automáticos)

En Azure Portal → App Service → Configuration → General Settings → Startup Command:

```
npm run db:migrate && npm start
```

Esto aplica migraciones automáticamente en cada deploy. **No usar para fresh deploy** —
correr el flujo manual completo primero.

### Runtime

| Setting | Valor |
|---------|-------|
| Node.js version | 22 LTS |
| NODE_ENV | production |
| Platform | Linux |

### Health Check

Configurar en Azure Portal → App Service → Health Check:
- **Path**: `/api/v1/health`
- Azure monitorea este endpoint y reinicia la instancia si falla repetidamente.

---

## Variables de Entorno Requeridas

Configurar en Azure Portal → App Service → Configuration → Application Settings.

| Variable | Descripción | Obligatorio |
|----------|-------------|-------------|
| `DATABASE_URL` | Connection string PostgreSQL completo | Sí |
| `PGSSLMODE` | Debe ser `require` para Azure PostgreSQL | Sí |
| `JWT_SECRET` | Clave para firmar access tokens | Sí |
| `JWT_REFRESH_SECRET` | Clave para firmar refresh tokens | Sí |
| `REDIS_URL` | Connection string Redis | Sí |
| `CASSANDRA_HOST` | IP del servidor Cassandra | Sí |
| `CASSANDRA_USER` | Usuario Cassandra | Sí |
| `CASSANDRA_PASS` | Password Cassandra | Sí |
| `CASSANDRA_CONNECT_TIMEOUT` | Timeout de conexión en ms. Default: `8000`. Reducido de 30s para no bloquear el arranque | Recomendado |
| `AZURE_STORAGE_CONNECTION_STRING` | Para upload de archivos a Azure Blob Storage | Sí |
| `NODE_ENV` | Debe ser `production` | Sí |
| `PORT` | Azure lo setea automáticamente (no configurar manualmente) | No |

### Variables opcionales con defaults

| Variable | Default | Descripción |
|----------|---------|-------------|
| `CASSANDRA_CONNECT_TIMEOUT` | `8000` | Timeout de conexión Cassandra (ms) |
| `DATABASE_SSL` | `true` en producción | Forzar SSL. Setear `false` solo para debug local |

---

## Proceso para Habilitar Servicios Externos (Cassandra, etc.)

Cuando un servicio externo requiere whitelist de IPs:

1. Arrancar la API (`npm start`)
2. En los logs del startup buscar:
   ```
   🌐 Outbound IP: X.X.X.X
   ```
3. Agregar esa IP al firewall del servicio externo (por ejemplo, Cassandra puerto 9042)
4. También verificar en Azure Portal → App Service → Networking → Outbound addresses
   (puede haber múltiples IPs si el App Service escala horizontalmente)

**Importante**: La IP pública puede cambiar si Azure mueve el App Service a otro servidor
(durante scale events o migraciones de infraestructura). Si Cassandra deja de conectar
inesperadamente, verificar que la IP sigue siendo la misma.

---

## Gotchas Conocidos

Problemas reales encontrados durante el deploy. Ver también `agent-docs/learnings.md`.

### 1. `sequelize: not found`
**Síntoma**: `npm run db:migrate` falla con `sh: sequelize: not found`
**Causa**: `npx sequelize-cli` no puede resolver el binario local en Azure App Service
**Solución**: Los scripts en `package.json` ya usan `./node_modules/.bin/sequelize` con
flags explícitos. Si el error reaparece, verificar que `node_modules` está instalado
(`npm install`).

### 2. `Cannot find config/config.json`
**Síntoma**: sequelize-cli busca `/home/site/wwwroot/config/config.json`
**Causa**: `.sequelizerc` no es leído por el CLI en Azure — busca el default
**Solución**: Los scripts ya pasan `--config src/config/database.cjs` explícitamente.
No dependen de `.sequelizerc` para funcionar.

### 3. `relation "public.sites" does not exist`
**Síntoma**: Primera migración falla en DB vacía
**Causa**: Las migraciones asumen que las tablas base existen. En DB vacía no hay nada.
**Solución**: Usar `npm run db:setup` en lugar de `npm run db:migrate` para fresh deploy.

### 4. Startup tarda 30+ segundos (Cassandra)
**Síntoma**: La API tarda mucho en arrancar o el workflow timeout
**Causa**: Cassandra tiene un `connectTimeout` de 30s por defecto. Si no está disponible,
bloquea el arranque completo ese tiempo.
**Solución**: Setear `CASSANDRA_CONNECT_TIMEOUT=8000`. Ya es el default en el código
(`src/db/cassandra/client.js`), pero se puede sobreescribir por variable de entorno.

### 5. PostgreSQL SSL connection failure
**Síntoma**: Error de SSL al conectar a PostgreSQL en Azure
**Causa**: Azure PostgreSQL Flexible Server requiere SSL
**Solución**:
- Setear `PGSSLMODE=require` en Application Settings
- El código en `src/config/database.cjs` y `src/db/sql/sequelize.js` ya tienen
  `rejectUnauthorized: false` para aceptar los certificados de Azure

### 6. Cassandra no conecta (firewall)
**Síntoma**: `NoHostAvailableError: Connection timeout` para Cassandra en producción
**Causa**: El firewall de Cassandra no tiene la IP de salida de Azure habilitada
**Solución**: Ver el log `🌐 Outbound IP` al arrancar, agregar esa IP al firewall
del servidor Cassandra (puerto 9042). Ver sección "Proceso para Habilitar Servicios Externos".

### 7. Swagger no aparece en producción
**Síntoma**: `/docs` devuelve 404 en producción
**Causa**: Swagger está deshabilitado intencionalmente en `NODE_ENV=production` (seguridad)
**Solución**: Es el comportamiento correcto. Para debugging temporal, se puede exponer
cambiando temporalmente a `development`, pero no es recomendable.

---

### 8. `column "X" does not exist` durante db:setup
**Síntoma**: `db:setup` falla con `column "country_code" does not exist` u otro error similar de columna inexistente
**Causa**: La base de datos **no está completamente vacía** — tiene tablas de un intento previo (fallido o de un arranque anterior de la API con `sequelize.sync()`). Las tablas existen pero con esquema incompleto (les faltan columnas que las migraciones posteriores habrían agregado). `db:setup` es **exclusivamente para DBs completamente vacías**.
**Solución**: Limpiar todas las tablas y ENUMs, luego repetir `db:setup`:

```sql
-- Eliminar todas las tablas:
DO $$ DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Eliminar todos los ENUMs:
DO $$ DECLARE r RECORD;
BEGIN
    FOR r IN (
        SELECT t.typname FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE t.typtype = 'e' AND n.nspname = 'public'
    ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;
```

Luego: `npm run db:setup`

**Nota**: A partir del fix de 2026-03-04, `setup-fresh-db.js` detecta esta situación automáticamente y muestra este SQL de limpieza en lugar del error críptico de Sequelize.

---

## Mejores Prácticas

Lo que hacen los equipos profesionales para deployments seguros y repetibles:

### Migraciones Seguras
- Siempre escribir migraciones **backward-compatible**: agregar columnas con default o
  nullable, nunca eliminar columnas de golpe
- Si hay que eliminar una columna: primero deprecar (release 1), luego eliminar (release 2)
- Probar migraciones en un entorno de staging antes de producción
- Nunca usar `db:migrate:undo:all` en producción
- Hacer backup de la DB antes de migraciones destructivas

### Antes de Cada Deploy
```bash
# Verificar estado de migraciones
npm run db:migrate:status

# Si hay migraciones pendientes, probarlas en staging primero
```

### Deployment Slots (Azure)
Azure App Service soporta "slots" (staging/producción) que permiten:
1. Deployar a staging
2. Verificar que funciona
3. Hacer "swap" a producción en segundos (sin downtime)
4. Si algo falla, hacer swap de vuelta (rollback instantáneo)

Es la forma recomendada de hacer deploys en producción cuando la app crece.

### CI/CD con GitHub Actions (referencia futura)
Cuando el equipo crezca, automatizar con un workflow que:
1. Corre tests (`npm test`)
2. Deploya a staging
3. Corre smoke tests contra staging
4. Hace swap a producción o espera aprobación manual

```yaml
# Ejemplo básico (.github/workflows/deploy.yml)
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - uses: azure/webapps-deploy@v2
        with:
          app-name: ec-data-api
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

### Monitoreo Post-Deploy
Después de cada deploy, verificar:
- Health check: `GET /api/v1/health` → debe responder 200
- Logs del arranque: buscar `✅ All services initialized successfully`
- Conexiones: PostgreSQL, Redis, Cassandra (si aplica)
- Un endpoint crítico con una llamada real (ej: login)
