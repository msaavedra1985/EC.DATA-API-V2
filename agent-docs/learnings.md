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
