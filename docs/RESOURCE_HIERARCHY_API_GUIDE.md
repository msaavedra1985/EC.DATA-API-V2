# 🌲 Resource Hierarchy API - Guía para Frontend

Guía completa de uso de la API de Resource Hierarchy (Jerarquía de Recursos) para el equipo de frontend.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Conceptos Clave](#conceptos-clave)
- [Autenticación y Permisos](#autenticación-y-permisos)
- [Identificadores](#identificadores)
- [Endpoints CRUD](#endpoints-crud)
- [Operaciones de Árbol](#operaciones-de-árbol)
- [Jerarquía Vacía - Crear Nodos Raíz](#jerarquía-vacía---crear-nodos-raíz)
- [Control de Acceso](#control-de-acceso)
- [Manejo de Errores](#manejo-de-errores)
- [Ejemplos de Uso (React/Next.js)](#ejemplos-de-uso-reactnextjs)

---

## 🌲 Descripción General

El módulo **Resource Hierarchy** permite organizar recursos (carpetas, sites, canales) en una estructura de árbol jerárquica dentro de cada organización. Usa PostgreSQL `ltree` para consultas eficientes de ancestros y descendientes.

### Características Principales

- **Tipos de nodo:** `folder`, `site`, `channel` (extensible)
- **Profundidad ilimitada:** Sin límite de niveles de anidación
- **Herencia de permisos:** Los permisos fluyen de padres a hijos
- **Soft delete con cascade:** Al eliminar un nodo, se eliminan todos sus descendientes
- **Árbol por organización:** Cada organización tiene su propia jerarquía independiente

---

## 🧠 Conceptos Clave

### Tipos de Nodo

| Tipo | Descripción | Puede tener hijos |
|------|-------------|-------------------|
| `folder` | Carpeta organizativa | ✅ Sí |
| `site` | Referencia a un Site físico | ✅ Sí |
| `channel` | Referencia a un Canal de dispositivo | ❌ No (hoja) |

### Estructura del Árbol

```
📁 Región Norte (folder)
├── 📁 Zona A (folder)
│   ├── 🏢 Hotel Lima (site)
│   │   ├── 📡 Sensor Lobby (channel)
│   │   └── 📡 Sensor Piscina (channel)
│   └── 🏢 Hotel Cusco (site)
└── 📁 Zona B (folder)
    └── 🏢 Hotel Arequipa (site)
```

### Path (ltree)

Cada nodo tiene un `path` calculado automáticamente que representa su ubicación en el árbol:

```
root.abc123.def456.ghi789
```

Esto permite consultas ultrarrápidas como:
- "Dame todos los descendientes de este nodo"
- "Dame todos los ancestros hasta la raíz"

---

## 🔐 Autenticación y Permisos

Todos los endpoints requieren autenticación mediante Bearer token JWT:

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

### Organización Implícita

**Los endpoints usan automáticamente la organización activa del usuario.** No es necesario enviar `organization_id` en cada request.

- **Usuarios normales:** Siempre trabajan con su organización activa
- **System-admins:** Pueden pasar `organization_id` opcionalmente para ver/crear en otra organización

```javascript
// ✅ Para usuarios normales - no necesita organization_id
const response = await api.get('/resource-hierarchy/nodes');
// Automáticamente usa la organización activa del usuario

// ✅ Para system-admin que quiere ver otra org
const response = await api.get('/resource-hierarchy/nodes?organization_id=ORG-xxx');
```

### Permisos por Rol

| Rol | Ver Nodos | Crear | Actualizar | Eliminar | Mover |
|-----|-----------|-------|------------|----------|-------|
| **system-admin** | ✅ Todos | ✅ | ✅ | ✅ | ✅ |
| **org-admin** | ✅ Su org | ✅ | ✅ | ✅ | ✅ |
| **org-manager** | ✅ Su org | ✅ | ✅ | ❌ | ❌ |
| **user/viewer** | ✅ Su org | ❌ | ❌ | ❌ | ❌ |

### Permisos por Nodo (Granulares)

Además de los roles globales, se pueden asignar permisos específicos por nodo:

| Permiso | Descripción |
|---------|-------------|
| `view` | Ver el nodo y sus descendientes |
| `edit` | Editar el nodo y sus descendientes |
| `admin` | Control total sobre el nodo y descendientes |

---

## 🔑 Identificadores

**⚠️ IMPORTANTE:** La API usa `public_code` para identificar nodos, **NO UUID**.

```javascript
// ✅ CORRECTO
const nodeId = "RH-a1b2c3d4e5-7"; // public_code

// ❌ INCORRECTO  
const nodeId = "123e4567-e89b-12d3-a456-426614174000"; // UUID (solo interno)
```

### Formato de Public Codes

| Entidad | Prefijo | Ejemplo |
|---------|---------|---------|
| Resource Hierarchy Node | `RH-` | `RH-a1b2c3d4e5-7` |
| Organization | `ORG-` | `ORG-yOM9ewfqOeWa-4` |
| Site | `SITE-` | `SITE-61D4Vc4Oo9R-4` |
| Channel | `CH-` | `CH-x9y8z7w6v5-2` |

---

## 📊 Endpoints CRUD

### Base URL

```
/api/v1/resource-hierarchy
```

---

### 1. POST /nodes

Crea un nuevo nodo en la jerarquía.

**Request Body:**
```json
{
  "parent_id": "RH-a1b2c3d4e5-7",
  "name": "Zona Centro",
  "node_type": "folder",
  "description": "Carpeta para hoteles de la zona centro",
  "metadata": {
    "color": "#3498db",
    "icon": "building"
  }
}
```

**Campos:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `organization_id` | string | ❌ | Public code de la organización (opcional, usa la org activa si no se especifica) |
| `name` | string | ✅ | Nombre del nodo (máx 255 chars) |
| `node_type` | string | ✅ | `folder`, `site`, o `channel` |
| `parent_id` | string | ❌ | Public code del nodo padre (null = raíz) |
| `reference_id` | string | ❌ | Public code del recurso referenciado (para site/channel) |
| `description` | string | ❌ | Descripción del nodo |
| `metadata` | object | ❌ | Datos adicionales (JSON libre) |
| `display_order` | number | ❌ | Orden de visualización (0 = primero) |

**Response (201 Created):**
```json
{
  "ok": true,
  "data": {
    "id": "RH-x1y2z3w4v5-3",
    "organization_id": "ORG-yOM9ewfqOeWa-4",
    "parent_id": "RH-a1b2c3d4e5-7",
    "name": "Zona Centro",
    "node_type": "folder",
    "description": "Carpeta para hoteles de la zona centro",
    "reference_id": null,
    "depth": 2,
    "metadata": {
      "color": "#3498db",
      "icon": "building"
    },
    "display_order": 0,
    "is_active": true,
    "created_at": "2025-12-26T15:30:00.000Z",
    "updated_at": "2025-12-26T15:30:00.000Z"
  }
}
```

---

### 2. GET /nodes

Lista nodos con filtros y paginación.

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `organization_id` | string | org activa | Opcional - usa la org activa del usuario |
| `parent_id` | string | - | Filtrar por nodo padre |
| `node_type` | string | - | Filtrar por tipo: `folder`, `site`, `channel` |
| `search` | string | - | Buscar en nombre y descripción |
| `is_active` | boolean | `true` | Filtrar por estado activo |
| `limit` | number | 20 | Cantidad de resultados (máx 100) |
| `offset` | number | 0 | Desplazamiento para paginación |
| `sort_by` | string | `display_order` | Campo de ordenamiento |
| `sort_order` | string | `asc` | `asc` o `desc` |

**Ejemplo:**
```
GET /api/v1/resource-hierarchy/nodes?node_type=folder&limit=10
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RH-a1b2c3d4e5-7",
      "name": "Región Norte",
      "node_type": "folder",
      "depth": 1,
      "children_count": 3
    }
  ],
  "meta": {
    "total": 15,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

---

### 3. GET /nodes/:id

Obtiene un nodo específico por su public_code.

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "RH-a1b2c3d4e5-7",
    "organization_id": "ORG-yOM9ewfqOeWa-4",
    "parent_id": null,
    "name": "Región Norte",
    "node_type": "folder",
    "description": "Hoteles de la región norte del país",
    "reference_id": null,
    "depth": 1,
    "metadata": {},
    "display_order": 1,
    "is_active": true,
    "created_at": "2025-12-20T10:00:00.000Z",
    "updated_at": "2025-12-26T15:30:00.000Z"
  }
}
```

---

### 4. PUT /nodes/:id

Actualiza un nodo existente.

**Request Body:**
```json
{
  "name": "Región Norte - Actualizado",
  "description": "Nueva descripción",
  "metadata": {
    "color": "#e74c3c"
  },
  "display_order": 5
}
```

**Campos actualizables:**
- `name`
- `description`
- `metadata`
- `display_order`
- `is_active`

**⚠️ IMPORTANTE:** No se puede cambiar `node_type`, `organization_id`, ni `parent_id` con PUT. Para mover un nodo, usa `PATCH /nodes/:id/move`.

---

### 5. DELETE /nodes/:id

Elimina un nodo (soft delete).

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `cascade` | boolean | `true` | Si eliminar también los descendientes |

**Ejemplo:**
```
DELETE /api/v1/resource-hierarchy/nodes/RH-a1b2c3d4e5-7?cascade=true
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "deleted_count": 5,
    "message": "Nodo y 4 descendientes eliminados correctamente"
  }
}
```

**⚠️ Sin cascade:** Si `cascade=false` y el nodo tiene hijos, retorna error 400.

---

## 🌳 Operaciones de Árbol

### 6. PATCH /nodes/:id/move

Mueve un nodo a un nuevo padre.

**Request Body:**
```json
{
  "new_parent_id": "RH-x1y2z3w4v5-3"
}
```

Para mover a la raíz, envía `new_parent_id: null`.

**Validaciones:**
- No se puede mover un nodo a sí mismo
- No se puede mover un nodo a uno de sus descendientes (evita ciclos)
- El nuevo padre debe pertenecer a la misma organización

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "RH-a1b2c3d4e5-7",
    "parent_id": "RH-x1y2z3w4v5-3",
    "depth": 3,
    "message": "Nodo movido correctamente"
  }
}
```

---

### 7. GET /nodes/:id/children

Obtiene los hijos directos de un nodo.

**Response (200 OK):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RH-child1-xxx-1",
      "name": "Zona A",
      "node_type": "folder",
      "depth": 2,
      "children_count": 2
    },
    {
      "id": "RH-child2-xxx-2",
      "name": "Zona B", 
      "node_type": "folder",
      "depth": 2,
      "children_count": 1
    }
  ]
}
```

---

### 8. GET /nodes/:id/descendants

Obtiene TODOS los descendientes de un nodo (hijos, nietos, etc.).

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `max_depth` | number | - | Limitar profundidad de búsqueda |
| `node_type` | string | - | Filtrar por tipo de nodo |

**Ejemplo:**
```
GET /api/v1/resource-hierarchy/nodes/RH-xxx/descendants?max_depth=2&node_type=site
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RH-desc1-xxx-1",
      "name": "Hotel Lima",
      "node_type": "site",
      "depth": 3,
      "parent_id": "RH-zona-xxx-2"
    },
    {
      "id": "RH-desc2-xxx-3",
      "name": "Hotel Cusco",
      "node_type": "site", 
      "depth": 3,
      "parent_id": "RH-zona-xxx-2"
    }
  ],
  "meta": {
    "total": 2
  }
}
```

---

### 9. GET /nodes/:id/ancestors

Obtiene todos los ancestros de un nodo (breadcrumb hasta la raíz).

**Response (200 OK):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RH-root-xxx-1",
      "name": "Región Norte",
      "node_type": "folder",
      "depth": 1
    },
    {
      "id": "RH-zona-xxx-2",
      "name": "Zona A",
      "node_type": "folder",
      "depth": 2
    }
  ]
}
```

**Uso típico:** Construir breadcrumbs de navegación.

```jsx
// Breadcrumb component
const Breadcrumb = ({ ancestors }) => (
  <nav>
    {ancestors.map((node, i) => (
      <span key={node.id}>
        <Link href={`/hierarchy/${node.id}`}>{node.name}</Link>
        {i < ancestors.length - 1 && ' / '}
      </span>
    ))}
  </nav>
);
```

---

### 10. GET /tree

Obtiene el árbol completo estructurado (con hijos anidados).

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `organization_id` | string | org activa | Opcional - usa la org activa del usuario |
| `max_depth` | number | - | Limitar profundidad |

**Response (200 OK):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RH-root1-xxx-1",
      "name": "Región Norte",
      "node_type": "folder",
      "depth": 1,
      "children": [
        {
          "id": "RH-zona-xxx-2",
          "name": "Zona A",
          "node_type": "folder",
          "depth": 2,
          "children": [
            {
              "id": "RH-hotel-xxx-3",
              "name": "Hotel Lima",
              "node_type": "site",
              "depth": 3,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

**⚠️ CUIDADO:** Este endpoint puede ser pesado si hay muchos nodos. Usa `max_depth` para limitar.

---

### 11. GET /roots

Obtiene solo los nodos raíz (sin padre).

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `organization_id` | string | Opcional - usa la org activa del usuario |

**Response (200 OK):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "RH-root1-xxx-1",
      "name": "Región Norte",
      "node_type": "folder",
      "children_count": 5
    },
    {
      "id": "RH-root2-xxx-2",
      "name": "Región Sur",
      "node_type": "folder",
      "children_count": 3
    }
  ]
}
```

---

## 📂 Jerarquía Vacía - Crear Nodos Raíz

### Comportamiento cuando no existen nodos

Cuando una organización no tiene nodos en su jerarquía, los endpoints `GET /roots` y `GET /tree` devuelven un array vacío:

```json
{
  "ok": true,
  "data": []
}
```

### Implementación en el Frontend

El frontend debe detectar esta situación y mostrar una interfaz para crear el primer nodo raíz:

```tsx
// HierarchyPage.tsx
const HierarchyPage = () => {
  const { data, isLoading } = useQuery(['roots'], fetchRoots);
  
  if (isLoading) return <Skeleton />;
  
  // Jerarquía vacía - mostrar UI para crear primer nodo
  if (data?.data?.length === 0) {
    return <EmptyHierarchyPrompt onCreateRoot={handleCreateRoot} />;
  }
  
  return <HierarchyTree nodes={data.data} />;
};

// Componente para jerarquía vacía
const EmptyHierarchyPrompt = ({ onCreateRoot }) => (
  <div className="empty-hierarchy">
    <FolderPlusIcon />
    <h3>Tu organización no tiene una jerarquía definida</h3>
    <p>Crea tu primer nodo para comenzar a organizar tus recursos.</p>
    <Button onClick={onCreateRoot}>
      Crear nodo raíz
    </Button>
  </div>
);
```

### Crear un Nodo Raíz

Para crear un nodo en la raíz de la organización, el `parent_id` debe ser `null`:

```tsx
// Crear nodo raíz (sin padre)
const createRootNode = async (name: string, nodeType: 'folder' | 'site') => {
  const response = await fetch('/api/v1/resource-hierarchy/nodes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      parent_id: null,        // null = nodo raíz
      node_type: nodeType,
      name: name,
      display_order: 0        // Orden del nodo (0 = primero)
    })
  });
  return response.json();
};
```

### Orden de los Nodos

El campo `display_order` controla el orden de visualización de los nodos dentro de su nivel:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `display_order` | integer | Orden numérico (0 = primero, valores mayores aparecen después) |

**Ejemplo de ordenamiento:**
```json
// Nodos ordenados por display_order
[
  { "name": "Región Norte", "display_order": 0 },
  { "name": "Región Centro", "display_order": 1 },
  { "name": "Región Sur", "display_order": 2 }
]
```

### Flujo Completo: Primera Configuración

```tsx
// Ejemplo completo de configuración inicial
const SetupHierarchy = () => {
  const [step, setStep] = useState<'empty' | 'creating' | 'done'>('empty');
  
  const handleCreateFirstNode = async () => {
    setStep('creating');
    
    // Crear carpeta raíz principal
    await createRootNode('Mi Organización', 'folder');
    
    setStep('done');
    // Refrescar la vista
    queryClient.invalidateQueries(['roots']);
  };
  
  return (
    <div>
      {step === 'empty' && (
        <EmptyHierarchyPrompt onCreateRoot={handleCreateFirstNode} />
      )}
      {step === 'creating' && <Spinner />}
      {step === 'done' && <SuccessMessage />}
    </div>
  );
};
```

### Resumen de Reglas

| Situación | parent_id | Resultado |
|-----------|-----------|-----------|
| Crear nodo raíz | `null` | Nodo aparece en la raíz de la organización |
| Crear nodo hijo | `"RH-xxx-xxx"` | Nodo aparece como hijo del nodo especificado |
| Ordenar nodos | - | Usar `display_order` (0, 1, 2, ...) |

---

## 🔒 Control de Acceso

### 12. POST /access

Otorga acceso a un usuario sobre un nodo.

**Request Body:**
```json
{
  "node_id": "RH-a1b2c3d4e5-7",
  "user_id": "USR-x1y2z3w4v5-3",
  "permission_level": "edit"
}
```

**Niveles de permiso:**
- `view` - Solo lectura
- `edit` - Lectura y escritura
- `admin` - Control total (incluye gestión de accesos)

**Response (201 Created):**
```json
{
  "ok": true,
  "data": {
    "node_id": "RH-a1b2c3d4e5-7",
    "user_id": "USR-x1y2z3w4v5-3",
    "permission_level": "edit",
    "granted_at": "2025-12-26T16:00:00.000Z"
  }
}
```

---

### 13. DELETE /access

Revoca acceso de un usuario sobre un nodo.

**Request Body:**
```json
{
  "node_id": "RH-a1b2c3d4e5-7",
  "user_id": "USR-x1y2z3w4v5-3"
}
```

---

### 14. GET /access/check

Verifica si un usuario tiene acceso a un nodo.

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `node_id` | string | Public code del nodo |
| `user_id` | string | Public code del usuario |
| `permission` | string | Permiso a verificar (`view`, `edit`, `admin`) |

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "has_access": true,
    "permission_level": "edit",
    "inherited_from": "RH-parent-xxx-1"
  }
}
```

**Nota:** El acceso puede ser heredado de un nodo ancestro.

---

## ⚠️ Manejo de Errores

### Códigos de Error Comunes

| Código | Error | Descripción |
|--------|-------|-------------|
| 400 | `INVALID_NODE_TYPE` | Tipo de nodo no válido |
| 400 | `INVALID_PARENT` | El padre no existe o pertenece a otra organización |
| 400 | `CIRCULAR_REFERENCE` | Intento de mover nodo a su propio descendiente |
| 400 | `HAS_CHILDREN` | No se puede eliminar sin cascade si tiene hijos |
| 403 | `FORBIDDEN` | Sin permisos para esta operación |
| 404 | `NODE_NOT_FOUND` | Nodo no encontrado |

### Formato de Error

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_PARENT",
    "message": "El nodo padre no existe o pertenece a otra organización",
    "details": {
      "parent_id": "RH-invalid-xxx-1"
    }
  }
}
```

---

## 💻 Ejemplos de Uso (React/Next.js)

### Hook para Gestión del Árbol

```typescript
// hooks/useResourceHierarchy.ts
import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface HierarchyNode {
  id: string;
  name: string;
  node_type: 'folder' | 'site' | 'channel';
  depth: number;
  children?: HierarchyNode[];
  children_count?: number;
}

export const useResourceHierarchy = (organizationId: string) => {
  const [tree, setTree] = useState<HierarchyNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar árbol completo
  const loadTree = useCallback(async (maxDepth?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        organization_id: organizationId,
        ...(maxDepth && { max_depth: String(maxDepth) })
      });
      
      const response = await api.get(`/resource-hierarchy/tree?${params}`);
      setTree(response.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Cargar solo raíces (lazy loading)
  const loadRoots = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/resource-hierarchy/roots?organization_id=${organizationId}`
      );
      setTree(response.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Cargar hijos de un nodo (lazy loading)
  const loadChildren = useCallback(async (nodeId: string) => {
    const response = await api.get(
      `/resource-hierarchy/nodes/${nodeId}/children`
    );
    return response.data.data;
  }, []);

  // Crear nodo
  const createNode = useCallback(async (data: {
    name: string;
    node_type: string;
    parent_id?: string;
    description?: string;
    metadata?: object;
  }) => {
    const response = await api.post('/resource-hierarchy/nodes', {
      organization_id: organizationId,
      ...data
    });
    return response.data.data;
  }, [organizationId]);

  // Mover nodo
  const moveNode = useCallback(async (nodeId: string, newParentId: string | null) => {
    const response = await api.patch(
      `/resource-hierarchy/nodes/${nodeId}/move`,
      { new_parent_id: newParentId }
    );
    return response.data.data;
  }, []);

  // Eliminar nodo
  const deleteNode = useCallback(async (nodeId: string, cascade = true) => {
    const response = await api.delete(
      `/resource-hierarchy/nodes/${nodeId}?cascade=${cascade}`
    );
    return response.data.data;
  }, []);

  return {
    tree,
    loading,
    error,
    loadTree,
    loadRoots,
    loadChildren,
    createNode,
    moveNode,
    deleteNode
  };
};
```

### Componente de Árbol con Lazy Loading

```tsx
// components/HierarchyTree.tsx
import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, MapPin, Radio } from 'lucide-react';

const nodeIcons = {
  folder: Folder,
  site: MapPin,
  channel: Radio
};

interface TreeNodeProps {
  node: HierarchyNode;
  onLoadChildren: (id: string) => Promise<HierarchyNode[]>;
  onSelect: (node: HierarchyNode) => void;
}

export const TreeNode = ({ node, onLoadChildren, onSelect }: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<HierarchyNode[]>([]);
  const [loading, setLoading] = useState(false);

  const Icon = nodeIcons[node.node_type];
  const hasChildren = node.children_count && node.children_count > 0;

  const handleExpand = async () => {
    if (!expanded && hasChildren && children.length === 0) {
      setLoading(true);
      const loadedChildren = await onLoadChildren(node.id);
      setChildren(loadedChildren);
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  return (
    <div className="select-none">
      <div 
        className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer"
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); handleExpand(); }}>
            {loading ? (
              <span className="animate-spin">⏳</span>
            ) : expanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Icon size={16} className="text-gray-600" />
        <span>{node.name}</span>
      </div>
      
      {expanded && children.length > 0 && (
        <div className="ml-6">
          {children.map(child => (
            <TreeNode 
              key={child.id} 
              node={child} 
              onLoadChildren={onLoadChildren}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

### Breadcrumb con Ancestros

```tsx
// components/HierarchyBreadcrumb.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { api } from '@/lib/api';

interface BreadcrumbProps {
  nodeId: string;
}

export const HierarchyBreadcrumb = ({ nodeId }: BreadcrumbProps) => {
  const [ancestors, setAncestors] = useState([]);

  useEffect(() => {
    const loadAncestors = async () => {
      const response = await api.get(
        `/resource-hierarchy/nodes/${nodeId}/ancestors`
      );
      setAncestors(response.data.data);
    };
    loadAncestors();
  }, [nodeId]);

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600">
      <Link href="/hierarchy" className="hover:text-blue-600">
        <Home size={16} />
      </Link>
      
      {ancestors.map((node, i) => (
        <span key={node.id} className="flex items-center gap-2">
          <ChevronRight size={14} />
          <Link 
            href={`/hierarchy/${node.id}`}
            className="hover:text-blue-600"
          >
            {node.name}
          </Link>
        </span>
      ))}
    </nav>
  );
};
```

### Drag and Drop para Mover Nodos

```tsx
// components/DraggableNode.tsx
import { useDrag, useDrop } from 'react-dnd';

interface DraggableNodeProps {
  node: HierarchyNode;
  onMove: (nodeId: string, newParentId: string) => Promise<void>;
}

export const DraggableNode = ({ node, onMove }: DraggableNodeProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'HIERARCHY_NODE',
    item: { id: node.id, type: node.node_type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'HIERARCHY_NODE',
    canDrop: (item) => {
      // Solo folders pueden recibir hijos
      // No se puede soltar sobre sí mismo
      return node.node_type === 'folder' && item.id !== node.id;
    },
    drop: async (item) => {
      await onMove(item.id, node.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  return (
    <div
      ref={(el) => drag(drop(el))}
      className={`
        p-2 rounded border
        ${isDragging ? 'opacity-50' : ''}
        ${isOver && canDrop ? 'bg-blue-100 border-blue-400' : ''}
        ${isOver && !canDrop ? 'bg-red-100 border-red-400' : ''}
      `}
    >
      {node.name}
    </div>
  );
};
```

---

## 🔄 Flujos Comunes

### Crear Estructura Inicial

```typescript
// Crear carpeta raíz
const region = await createNode({
  name: 'Región Norte',
  node_type: 'folder'
});

// Crear subcarpeta
const zona = await createNode({
  name: 'Zona A',
  node_type: 'folder',
  parent_id: region.id
});

// Agregar site existente a la jerarquía
const hotelNode = await createNode({
  name: 'Hotel Lima',
  node_type: 'site',
  parent_id: zona.id,
  reference_id: 'SITE-61D4Vc4Oo9R-4' // public_code del site real
});
```

### Reorganizar Estructura

```typescript
// Mover hotel a otra zona
await moveNode('RH-hotel-xxx-1', 'RH-zona-sur-xxx-2');

// Mover a raíz
await moveNode('RH-hotel-xxx-1', null);
```

### Eliminar Rama Completa

```typescript
// Eliminar zona y todo su contenido
await deleteNode('RH-zona-xxx-1', true); // cascade=true
```

---

## 📝 Notas Importantes

1. **Rendimiento:** Para árboles grandes, usa lazy loading con `loadRoots` + `loadChildren` en lugar de cargar todo con `loadTree`.

2. **Caché:** Los resultados de ancestros y árbol pueden cachearse en el cliente, pero recuerda invalidar al mover/eliminar nodos.

3. **Permisos heredados:** Un usuario con permiso `admin` en un nodo padre tiene automáticamente `admin` en todos los descendientes.

4. **Referencias:** Cuando creas un nodo tipo `site` o `channel`, el `reference_id` debe apuntar a un recurso real existente.

5. **Organización única:** Todos los nodos de una rama deben pertenecer a la misma organización. No se puede mover un nodo a otra organización.

---

## ⚡ Optimizaciones de Rendimiento

### Cache Redis (Backend)

El backend implementa cache Redis para todas las operaciones de lectura:
- **Nodos individuales:** 10 minutos TTL
- **Hijos/Listados:** 5 minutos TTL  
- **Árbol/Ancestros:** 5-10 minutos TTL

El cache se invalida automáticamente en operaciones CUD (Create/Update/Delete/Move).

### Límite de Profundidad en `getTree()`

Para evitar cargar árboles muy grandes, el endpoint `/tree` tiene un límite de profundidad por defecto:

```javascript
// Por defecto: 3 niveles de profundidad
const tree = await api.get('/resource-hierarchy/tree');

// Especificar profundidad (1-50)
const tree = await api.get('/resource-hierarchy/tree?max_depth=5');

// Sin límite (usar con precaución)
const tree = await api.get('/resource-hierarchy/tree?max_depth=50');
```

### Flag `include_counts` 

Para optimizar consultas cuando no necesitas saber si los nodos tienen hijos:

```javascript
// Por defecto: incluye has_children y children_count
const children = await api.get('/resource-hierarchy/nodes/RES-xxx/children');

// Sin conteo (más rápido para grandes volúmenes)
const children = await api.get('/resource-hierarchy/nodes/RES-xxx/children?include_counts=false');
```

**Cuándo usar `include_counts=false`:**
- Listados donde no muestras iconos de expandir
- Exportaciones de datos
- Operaciones batch internas

### Endpoint Batch

Obtén múltiples nodos en una sola llamada (máximo 100):

```javascript
// POST /api/v1/resource-hierarchy/nodes/batch
const response = await api.post('/resource-hierarchy/nodes/batch', {
  ids: ['RES-abc123-1', 'RES-def456-2', 'RES-ghi789-3'],
  include_counts: true
});

// Respuesta
{
  "ok": true,
  "data": [
    { "id": "RES-abc123-1", "name": "Hotel Lima", ... },
    { "id": "RES-def456-2", "name": "Hotel Cusco", ... }
    // RES-ghi789-3 no encontrado, no aparece
  ],
  "meta": {
    "requested": 3,
    "found": 2
  }
}
```

**Casos de uso:**
- Cargar breadcrumbs (múltiples ancestros)
- Detalles de selección múltiple
- Sincronización de favoritos
- Validación de referencias

### Recomendaciones de Carga

| Escenario | Estrategia Recomendada |
|-----------|------------------------|
| Vista inicial | `GET /roots` (solo raíces) |
| Expandir nodo | `GET /nodes/:id/children` |
| Árbol pequeño (<100 nodos) | `GET /tree?max_depth=3` |
| Árbol grande | Lazy loading con `children` |
| Breadcrumbs | `GET /nodes/:id/ancestors` o batch |
| Búsqueda global | `GET /nodes?search=texto` |
| Selección múltiple | `POST /nodes/batch`|
