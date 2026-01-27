# Endpoints: Asset Categories (Tags Jerárquicos)

> **Módulo**: `src/modules/asset-categories/`
> **Base URL**: `/api/v1/asset-categories`

## Descripción

Sistema de categorías jerárquicas (tags) para clasificar canales. Soporta dos alcances:
- **organization**: Tags compartidos para toda la organización
- **user**: Tags personales de cada usuario

Usa Adjacency List (`parent_id`) + Materialized Path (`path`) para consultas eficientes.

## Modelo de Datos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Integer | ID de la categoría (auto-increment) |
| `name` | String(100) | Nombre de la categoría |
| `color` | String(7) | Color hex para UI (ej: #3B82F6) |
| `level` | Integer | Nivel de profundidad (1=raíz, 2, 3...) |
| `path` | String | Ruta materializada (ej: /1/5/12/) |
| `parent_id` | Integer | ID del padre (null = raíz) |
| `scope` | Enum | 'organization' o 'user' |
| `is_active` | Boolean | Estado de la categoría |

## Endpoints

### GET /api/v1/asset-categories

Obtener todas las categorías visibles para el usuario.

**Query Parameters:**
- `scope`: 'organization', 'user', 'all' (default: 'all')
- `parent_id`: Filtrar por padre
- `roots_only`: 'true' para solo raíces

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Aire Acondicionado",
      "color": "#3B82F6",
      "level": 1,
      "path": "/1/",
      "parent_id": null,
      "scope": "organization",
      "is_active": true,
      "parent": null
    }
  ]
}
```

### POST /api/v1/asset-categories/organization

Crear categoría de organización (solo admins).

**Request Body:**
```json
{
  "name": "Aire Acondicionado",
  "color": "#3B82F6",
  "parent_id": null
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Aire Acondicionado",
    "color": "#3B82F6",
    "level": 1,
    "path": "/1/",
    "parent_id": null,
    "scope": "organization",
    "is_active": true,
    "parent": null
  }
}
```

### POST /api/v1/asset-categories/user

Crear categoría personal del usuario.

**Request Body:**
```json
{
  "name": "Mis Favoritos",
  "color": "#10B981",
  "parent_id": null
}
```

### GET /api/v1/asset-categories/:id

Obtener categoría por ID.

### GET /api/v1/asset-categories/:id/tree

Obtener árbol jerárquico completo de una categoría.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "ancestors": [
      { "id": 1, "name": "Aire Acondicionado", "level": 1 }
    ],
    "current": {
      "id": 5,
      "name": "Split",
      "level": 2
    },
    "descendants": [
      { "id": 12, "name": "Samsung", "level": 3 }
    ],
    "breadcrumb": [
      { "id": 1, "name": "Aire Acondicionado" },
      { "id": 5, "name": "Split" }
    ]
  }
}
```

### PUT /api/v1/asset-categories/:id

Actualizar categoría.

**Request Body:**
```json
{
  "name": "Split Inverter",
  "color": "#22C55E",
  "parent_id": 1
}
```

### DELETE /api/v1/asset-categories/:id

Desactivar categoría (soft delete). También desactiva descendientes.

**Response 200:**
```json
{
  "success": true,
  "message": "Categoría desactivada exitosamente",
  "deactivated": 3
}
```

## Jerarquía de Ejemplo

```
Aire Acondicionado (id=1, level=1, path="/1/")
├── Split (id=5, level=2, path="/1/5/")
│   ├── Samsung (id=12, level=3, path="/1/5/12/")
│   └── LG (id=13, level=3, path="/1/5/13/")
└── Centralizado (id=6, level=2, path="/1/6/")
```

## Performance

- **Índices optimizados**: path, parent_id, scope+org_id, scope+user_id
- **Consultas de descendientes**: O(1) usando `WHERE path LIKE '/1/%'`
- **Consultas de ancestros**: O(n) parseando el path (n = nivel)

## Seed de Ejemplo

```bash
node data/seed/seed-asset-categories.js <organization_uuid>
```

## Integración con Channels

Un canal puede tener un `asset_category_id` asignado. Para filtrar canales por categoría incluyendo subcategorías:

```javascript
import { getCategoryAndDescendantIds } from './modules/asset-categories/services.js';

const categoryIds = await getCategoryAndDescendantIds(categoryId);
const channels = await Channel.findAll({
  where: { asset_category_id: { [Op.in]: categoryIds } }
});
```
