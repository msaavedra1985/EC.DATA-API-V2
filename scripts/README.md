# 📦 Scripts de Producción - EC.DATA API

## 🚀 Despliegue de Datos Iniciales

### Orden de Ejecución (CRÍTICO)

El script `seed-production-data.sql` inserta los datos en el siguiente orden para evitar errores de foreign keys:

1. **Roles** → `system-admin`, `org-admin`, `org-manager`, `user`, `viewer`, `guest`, `demo`
2. **Organizations** → Jerarquía completa (EC.DATA root + organizaciones hijas)
3. **Users** → 9 usuarios con diferentes roles
4. **User_Organizations** → Relaciones many-to-many

### Ejecutar en Producción

```bash
# Opción 1: Desde línea de comandos
psql $DATABASE_URL -f scripts/seed-production-data.sql

# Opción 2: Usando la herramienta de Replit
# 1. Abrir el panel de Base de Datos
# 2. Ejecutar el contenido del archivo SQL
```

### ⚠️ Usuarios Creados

El script crea 9 usuarios con diferentes roles. **Por seguridad**, las contraseñas iniciales están hasheadas con bcrypt en el SQL.

**IMPORTANTE:** Después del primer despliegue:
1. Hacer login con cada usuario
2. Cambiar la contraseña inmediatamente
3. Habilitar 2FA para usuarios admin
4. Eliminar usuarios de demo/guest si no se necesitan

### 🏢 Jerarquía de Organizaciones Creada

```
EC.DATA (root)
├── ACME Corporation
│   └── ACME LATAM
├── Tech Solutions Argentina
│   └── Tech Solutions Dev Team
└── Global Enterprises S.A.
```

### 🔐 Generar Nuevos Hashes de Contraseñas

Si necesitas generar hashes para nuevas contraseñas:

```bash
node scripts/generate-password-hashes.js
```

Este script genera hashes bcrypt que puedes usar en el SQL.

### ✅ Verificar Inserción

Después de ejecutar el script, verificar que se crearon los registros:

```sql
SELECT COUNT(*) as total_roles FROM roles;
-- Debe devolver: 7

SELECT COUNT(*) as total_orgs FROM organizations;
-- Debe devolver: 6

SELECT COUNT(*) as total_users FROM users;
-- Debe devolver: 9

SELECT COUNT(*) as total_relations FROM user_organizations;
-- Debe devolver: 12
```

### 🛡️ Notas de Seguridad

1. **NO COMMITEAR** archivos con contraseñas en texto plano
2. **Rotar contraseñas** después del primer login
3. **Usar variables de entorno** para credenciales en producción
4. **Eliminar usuarios demo** si no se necesitan en producción
5. **Los hashes bcrypt** del script usan un costo de 10 (estándar de producción)

### 🔄 Rollback

Si necesitas revertir los cambios:

```sql
BEGIN;
DELETE FROM user_organizations;
DELETE FROM users;
DELETE FROM organizations WHERE slug != 'ecdata';
DELETE FROM roles WHERE name NOT IN ('system-admin', 'org-admin');
COMMIT;
```

⚠️ **CUIDADO:** Esto eliminará todos los datos insertados por el script.

---

## 📝 Archivos en este directorio

- `seed-production-data.sql` - Script principal de inserción de datos
- `generate-password-hashes.js` - Generador de hashes bcrypt
- `README.md` - Este archivo

---

## 🆘 Soporte

Si tienes problemas con el script de producción:

1. Verificar que la base de datos esté corriendo
2. Verificar que las tablas existan (ejecutar migraciones primero)
3. Revisar logs de PostgreSQL para errores específicos
4. Verificar que no haya conflictos de unique constraints (slug, email)
