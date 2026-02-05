# Learnings & Gotchas

> **CONSULTAR PRIMERO**: Antes de debuggear cualquier problema

## Cómo usar este archivo

1. **Antes de debuggear**, busca aquí si el problema ya fue resuelto
2. **Después de resolver** un bug no trivial, documéntalo aquí
3. Formato: Síntoma → Causa → Solución

---

## Autenticación

### Session context expira antes que el refresh token
**Fecha**: 2026-01-16
**Síntoma**: Frontend recibe 404 en `/auth/session-context` después de hacer refresh token
**Causa**: El TTL del session_context en Redis era 15 minutos, mientras que el refresh_token duraba 14-90 días
**Solución**: 
- Alinear TTL del session_context con el refresh_token (14 días normal, 90 días con remember_me)
- Regenerar session_context durante `refreshAccessToken`, no solo en login
- Preservar `remember_me` del token original usando `Boolean(storedToken.remember_me)`

**Archivos afectados**: `src/modules/auth/services.js`, `src/modules/auth/sessionContextCache.js`

---

## Template para nuevos entries

### [Título descriptivo del problema]
**Fecha**: YYYY-MM-DD
**Síntoma**: Qué observaste / qué error apareció
**Causa**: Por qué ocurrió
**Solución**: Cómo se arregló
**Archivos afectados**: Lista de archivos modificados

---

## Sequelize

### ORDER BY columna inexistente causa error 500
**Fecha**: 2026-02-05
**Síntoma**: `GET /devices/metadata` retornaba error 500 con queries SQL inválidos tipo `ORDER BY "DeviceType"."name" ASC`
**Causa**: Al intentar ordenar alfabéticamente, se usó `order: [['name', 'ASC']]` pero las tablas principales (device_types, device_brands, etc.) no tienen columna `name` - ese campo está en las tablas de traducciones
**Solución**: 
- Usar la sintaxis correcta de Sequelize para ordenar por campo de asociación:
- `order: [[{ model: DeviceTypeTranslation, as: 'translations' }, 'name', 'ASC']]`
- Esto genera el SQL correcto: `ORDER BY "translations"."name" ASC`
**Archivos afectados**: `src/modules/device-metadata/repository.js`

---

## Locations / Countries

### Repository usa findByPk pero PK no es iso_alpha2
**Fecha**: 2026-01-27
**Síntoma**: `findCountryByCode` fallaba porque usaba `findByPk(code)` pero PK de countries es `id` (integer), no `iso_alpha2`
**Causa**: Al migrar a natural keys, se usó `iso_alpha2` como FK en otras tablas pero la PK de `countries` sigue siendo `id` (autoincrement)
**Solución**: 
- Usar `findOne({ where: { iso_alpha2: code.toUpperCase() } })` en lugar de `findByPk(code)`
- El modelo usa `id` como PK pero relaciones usan `sourceKey: 'iso_alpha2'`
**Archivos afectados**: `src/modules/countries/repository.js`

### Seed de locations muy lento por inserciones individuales
**Fecha**: 2026-01-27
**Síntoma**: Script de seed timeout después de 3+ minutos, solo 1000 de ~5000 estados
**Causa**: El script hacía INSERT individual para cada estado + 2 traducciones
**Solución**: 
- Usar batch commits cada 500 estados para evitar transacción larga
- Considerar batch INSERT con múltiples VALUES para mejor performance
- Seed ejecutable en background: `nohup node data/seed/seed-locations.js &`
**Archivos afectados**: `data/seed/seed-locations.js`

---

## Rate Limiting

### Contador de intentos no se resetea después de login exitoso
**Fecha**: 2026-01-21
**Síntoma**: Usuario logueado exitosamente pero en siguiente intento (ej: re-login) recibe error de rate limit
**Causa**: El middleware de rate limit incrementaba contador antes de validar credenciales, pero no lo reseteaba en login exitoso
**Solución**: 
- Llamar `resetLoginCounters(email, ip)` después de login exitoso en el handler
- El reset elimina las keys de Redis: `login_attempts:email:{email}` y `login_attempts:ip:{ip}`
**Archivos afectados**: `src/modules/auth/index.js`, `src/middleware/loginRateLimit.js`

### Rate limit por IP afecta a usuarios legítimos en redes compartidas
**Fecha**: 2026-01-21
**Síntoma**: Múltiples usuarios en misma oficina (misma IP) se bloquean mutuamente
**Causa**: Rate limit solo por IP es muy agresivo en redes corporativas/NAT
**Solución**: 
- Usar rate limit combinado: IP + email (ambos deben exceder límite)
- Límites actuales: 5 intentos por email, 20 intentos por IP en ventana de 15 minutos
- Captcha se requiere después de 3 intentos fallidos (antes del bloqueo)
**Archivos afectados**: `src/middleware/loginRateLimit.js`

---

## Database

(Agregar problemas de DB aquí)

---

## Redis

(Agregar problemas de Redis aquí)

---

## Validación / DTOs

(Agregar problemas de validación aquí)

---

## Performance

(Agregar problemas de performance aquí)

---

## Deployment

(Agregar problemas de deployment aquí)
