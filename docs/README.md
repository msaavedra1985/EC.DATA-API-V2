# EC.DATA API - Flujos del Sistema

Documentación visual de los flujos principales del sistema con diagramas Mermaid.

> **Para documentación técnica de desarrollo**, consultar `agent-docs/`.

---

## Flujos Disponibles

| # | Documento | Descripción |
|---|-----------|-------------|
| 1 | [Autenticación](./flujos/01-autenticacion.md) | Login, tokens, refresh, rate limiting |
| 2 | [Resource Hierarchy](./flujos/02-resource-hierarchy.md) | Árbol de carpetas, sitios y canales |
| 3 | [Telemetría](./flujos/03-telemetria.md) | Consulta de datos de sensores (Cassandra) |
| 4 | [Organizaciones](./flujos/04-organizaciones.md) | Sistema multi-tenant, roles, permisos |
| 5 | [API Keys](./flujos/05-api-keys.md) | Integración M2M con sistemas externos |

---

## Cómo Visualizar Diagramas

Los diagramas usan formato **Mermaid** y se renderizan en:
- GitHub / GitLab (automático)
- VS Code (extensión Mermaid)
- [mermaid.live](https://mermaid.live) (exportar PNG/SVG)

---

## Documentación Técnica

| Recurso | Ubicación |
|---------|-----------|
| Reglas de código | `agent-docs/rules.md` |
| Endpoints API | `agent-docs/endpoints/` |
| Schema de DB | `agent-docs/database.dbml.txt` |
| Glosario | `agent-docs/glosario.md` |
