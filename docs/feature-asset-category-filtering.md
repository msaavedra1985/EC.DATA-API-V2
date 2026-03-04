# Feature: Filtrado de Árbol de Recursos por Categoría de Activos

## Resumen Ejecutivo

Se implementó un sistema de **tags jerárquicos** (Asset Categories) para clasificar nodos del árbol de recursos, permitiendo filtrar y visualizar solo las ramas relevantes según el tipo de activo.

---

## 1. Asset Categories (Categorías de Activos)

### Descripción
Sistema de etiquetas jerárquicas para clasificar canales y sensores. Por ejemplo: HVAC > Climatización > Aire Acondicionado.

### Características
- **Estructura jerárquica**: Las categorías pueden tener subcategorías (árbol de tags)
- **Path ltree**: Usa PostgreSQL ltree para consultas eficientes de ancestros/descendientes
- **Multi-idioma**: Soporta traducciones (es/en)
- **Iconos personalizables**: Cada categoría puede tener su propio icono

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/asset-categories` | Listar todas las categorías |
| GET | `/api/v1/asset-categories/tree` | Obtener árbol completo de categorías |
| GET | `/api/v1/asset-categories/:id` | Obtener una categoría específica |
| POST | `/api/v1/asset-categories` | Crear nueva categoría |
| PUT | `/api/v1/asset-categories/:id` | Actualizar categoría |
| DELETE | `/api/v1/asset-categories/:id` | Eliminar categoría (soft delete) |

### Ejemplo de Estructura
```
Equipamiento Hotelero
├── HVAC
│   ├── Climatización
│   │   ├── Aire Acondicionado
│   │   └── Calefacción
│   └── Ventilación
├── Energía
│   ├── Consumo Eléctrico
│   └── Energía Solar
└── Agua
    ├── Consumo de Agua
    └── Aguas Residuales
```

---

## 2. Asignación de Categorías a Nodos del Árbol

### Descripción
Cada nodo del árbol de recursos (`resource_hierarchy`) puede tener un `asset_category_id` asignado, típicamente usado en nodos de tipo "channel".

### Cambio de Diseño
- **Antes**: El `asset_category_id` estaba en la tabla `channels`
- **Ahora**: El `asset_category_id` está en la tabla `resource_hierarchy`

### Beneficio
Permite filtrar el árbol completo mostrando solo las ramas que contienen sensores de cierto tipo, independientemente de la profundidad.

---

## 3. Filtrado del Árbol por Categoría

### Descripción
Endpoint que devuelve un árbol "podado" mostrando únicamente las ramas que contienen nodos con el tag especificado.

### Endpoint
```
GET /api/v1/resource-hierarchy/tree/filter
```

### Parámetros

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | integer | Sí | ID de la categoría a filtrar |
| `include_subcategories` | boolean | No (default: true) | Incluir subcategorías del tag |
| `organization_id` | string | No | Código público de la organización |

### Algoritmo
1. Encuentra todos los nodos que tienen el `asset_category_id` (y subcategorías si aplica)
2. Obtiene todos los ancestros de esos nodos usando paths ltree
3. Construye un árbol podado con solo esas ramas
4. Marca cada nodo con `matches_filter: true/false`

### Ejemplo de Request
```http
GET /api/v1/resource-hierarchy/tree/filter?category_id=5&include_subcategories=true
Authorization: Bearer {token}
```

### Ejemplo de Response
```json
{
  "ok": true,
  "data": [
    {
      "id": "RES-A1B2C3",
      "name": "Hotel Libertador Lima",
      "node_type": "folder",
      "matches_filter": false,
      "children_count": 2,
      "children": [
        {
          "id": "RES-D4E5F6",
          "name": "Lobby Principal",
          "node_type": "folder",
          "matches_filter": false,
          "children_count": 1,
          "children": [
            {
              "id": "RES-G7H8I9",
              "name": "AC Split Lobby",
              "node_type": "channel",
              "matches_filter": true,
              "asset_category": {
                "id": 5,
                "name": "Aire Acondicionado",
                "icon": "snowflake"
              },
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

### Comportamiento
- `matches_filter: true` → El nodo tiene directamente el tag asignado
- `matches_filter: false` → El nodo solo aparece porque tiene descendientes con el tag
- `children_count` → Cuenta solo hijos que cumplen el filtro

---

## 4. Verificación de Descendientes (Lazy Loading)

### Descripción
Endpoint para verificar si un nodo tiene descendientes con cierta categoría, útil para lazy loading del árbol.

### Endpoint
```
GET /api/v1/resource-hierarchy/nodes/:id/has-category-descendants
```

### Parámetros

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | integer | Sí | ID de la categoría a buscar |
| `include_subcategories` | boolean | No (default: true) | Incluir subcategorías |

### Ejemplo de Request
```http
GET /api/v1/resource-hierarchy/nodes/RES-A1B2C3/has-category-descendants?category_id=5
Authorization: Bearer {token}
```

### Ejemplo de Response
```json
{
  "ok": true,
  "has_descendants": true
}
```

### Caso de Uso
Antes de expandir un nodo en la UI, verificar si al abrirlo habrá canales relevantes. Esto permite:
- Mostrar/ocultar indicador de "expandible"
- Optimizar carga de datos
- Mejorar UX al no abrir carpetas vacías

---

## 5. Consideraciones Técnicas

### Performance
- **Índices ltree**: Las consultas usan operadores `<@` y `@>` de PostgreSQL ltree
- **Índice en asset_category_id**: Agregado para búsquedas rápidas
- **Query única**: El árbol filtrado se construye con una sola query SQL

### Seguridad
- Filtrado por `organization_id` para multi-tenancy
- Solo se retornan `public_codes`, nunca UUIDs internos
- Validación de permisos via JWT

### Migración
- Archivo: `20260128150000-move-asset-category-to-resource-hierarchy.cjs`
- Cambios: 
  - Agrega columna `asset_category_id` a `resource_hierarchy`
  - Crea índice para búsquedas
  - Mantiene FK con `asset_categories`

---

## 6. Integración con Frontend (Next.js)

### Flujo Recomendado

1. **Cargar categorías disponibles**
   ```javascript
   const categories = await api.get('/asset-categories/tree');
   ```

2. **Usuario selecciona categoría en filtro**
   ```javascript
   const filteredTree = await api.get(`/resource-hierarchy/tree/filter?category_id=${selectedId}`);
   ```

3. **Lazy loading al expandir nodos**
   ```javascript
   const hasChildren = await api.get(`/resource-hierarchy/nodes/${nodeId}/has-category-descendants?category_id=${selectedId}`);
   ```

### Ejemplo de Componente
```jsx
function AssetTree({ categoryId }) {
  const { data: tree } = useSWR(
    `/api/v1/resource-hierarchy/tree/filter?category_id=${categoryId}`
  );
  
  return (
    <TreeView data={tree}>
      {(node) => (
        <TreeNode 
          key={node.id}
          highlighted={node.matches_filter}
          icon={node.asset_category?.icon}
        />
      )}
    </TreeView>
  );
}
```

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/modules/resource-hierarchy/repository.js` | Nuevas funciones `getFilteredTree`, `hasDescendantsWithCategory` |
| `src/modules/resource-hierarchy/services.js` | Servicios de filtrado |
| `src/modules/resource-hierarchy/routes.js` | Nuevos endpoints |
| `src/modules/resource-hierarchy/dtos/index.js` | Schemas de validación Zod |
| `src/modules/resource-hierarchy/models/ResourceHierarchy.js` | Relación con AssetCategory |
| `agent-docs/endpoints/asset-categories.md` | Documentación actualizada |
