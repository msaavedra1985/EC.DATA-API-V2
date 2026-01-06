# EC.DATA API - Documentación Técnica

Bienvenido a la documentación de flujos de EC.DATA API. Esta guía explica cómo funcionan las principales características del sistema de forma clara y accesible.

---

## Inicio Rápido

Si es tu primera vez leyendo esta documentación:

1. **[Glosario](./glosario.md)** - Empezá por acá si encontrás términos técnicos desconocidos
2. **[Autenticación](./flujos/01-autenticacion.md)** - Cómo funciona el login y los tokens
3. Luego explorá los flujos que necesites según tu rol

---

## Índice de Documentos

### Referencia General

| Documento | Descripción |
|-----------|-------------|
| [Glosario](./glosario.md) | Términos técnicos explicados en lenguaje simple |

### Flujos del Sistema

| # | Documento | Descripción | Para quién |
|---|-----------|-------------|------------|
| 1 | [Autenticación](./flujos/01-autenticacion.md) | Login, tokens, refresh, rate limiting, seguridad | Todos |
| 2 | [Resource Hierarchy](./flujos/02-resource-hierarchy.md) | Organización de carpetas, sitios y canales | Operadores, Devs |
| 3 | [Telemetría](./flujos/03-telemetria.md) | Consulta de datos de sensores desde Cassandra | Analistas, Devs |
| 4 | [Organizaciones](./flujos/04-organizaciones.md) | Sistema multi-tenant, roles, permisos | Admins, Devs |
| 5 | [API Keys](./flujos/05-api-keys.md) | Integración con sistemas externos (M2M) | Devs, Integradores |

---

## Guía por Rol

### Desarrolladores Frontend
1. [Autenticación](./flujos/01-autenticacion.md) - Implementar login y manejo de tokens
2. [Resource Hierarchy](./flujos/02-resource-hierarchy.md) - Mostrar árbol de recursos
3. [Organizaciones](./flujos/04-organizaciones.md) - Switch de organización

### Desarrolladores Backend / Integradores
1. [API Keys](./flujos/05-api-keys.md) - Conectar sistemas externos
2. [Telemetría](./flujos/03-telemetria.md) - Consumir datos de sensores
3. [Glosario](./glosario.md) - Referencia de términos

### Administradores
1. [Organizaciones](./flujos/04-organizaciones.md) - Gestión de usuarios y permisos
2. [API Keys](./flujos/05-api-keys.md) - Crear credenciales para integraciones
3. [Autenticación](./flujos/01-autenticacion.md) - Entender la seguridad

---

## Convenciones de Esta Documentación

### Diagramas

Los diagramas usan formato **Mermaid** y se renderizan automáticamente en:
- GitHub / GitLab
- Notion
- VS Code (con extensión)
- [mermaid.live](https://mermaid.live) (para exportar PNG/SVG)

### Iconos

| Icono | Significado |
|-------|-------------|
| ✅ | Éxito / Permitido |
| ❌ | Error / Bloqueado |
| ⚠️ | Advertencia / Precaución |
| 📁 | Carpeta |
| 📍 | Sitio / Ubicación |
| 📡 | Canal |
| 🏢 | Organización |
| 👤 | Usuario |
| 🔑 | API Key |

### Referencias Cruzadas

Cuando veas **(→ Glosario)** significa que ese término está explicado en el [Glosario](./glosario.md).

### Ejemplos de Código

Los ejemplos de request/response usan JSON y son representativos. Los valores reales variarán según tu instalación.

---

## Documentación Complementaria

| Recurso | Ubicación | Descripción |
|---------|-----------|-------------|
| Swagger / OpenAPI | `/docs` (en la API) | Documentación interactiva de endpoints |
| DBML Schema | `database.dbml.txt` | Diagrama de base de datos |
| replit.md | `replit.md` | Estándares de desarrollo |

---

## Mantener Actualizada

Esta documentación debe actualizarse cuando:

1. **Se agrega una feature nueva** - Crear documento en `flujos/`
2. **Se modifica un flujo existente** - Actualizar diagrama y pasos
3. **Se agregan términos técnicos nuevos** - Agregar al glosario
4. **Cambian códigos de error** - Actualizar tablas de errores

### Checklist de Nueva Feature

- [ ] Crear documento en `docs/flujos/XX-nombre.md`
- [ ] Agregar al índice en este README
- [ ] Agregar términos nuevos al glosario
- [ ] Actualizar `database.dbml.txt` si hay cambios de schema
- [ ] Actualizar Swagger con anotaciones `@swagger`

---

## Contribuir

Para sugerir mejoras a esta documentación:
1. Identificar qué falta o está desactualizado
2. Proponer cambios con contexto claro
3. Mantener el estilo simple y accesible

---

*Última actualización: Enero 2026*
