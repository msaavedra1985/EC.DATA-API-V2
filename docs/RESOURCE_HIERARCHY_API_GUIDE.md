# 🌲 Resource Hierarchy API - Guía para Frontend

Guía completa de uso de la API de Resource Hierarchy (Jerarquía de Recursos) para el equipo de frontend.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Conceptos Clave](#conceptos-clave)
- [Patrones de Carga del Árbol](#patrones-de-carga-del-árbol) ⭐ **LEER PRIMERO**
- [Autenticación y Permisos](#autenticación-y-permisos)
- [Identificadores](#identificadores)
- [Endpoints CRUD](#endpoints-crud)
- [Operaciones de Árbol](#operaciones-de-árbol)
- [Jerarquía Vacía - Crear Nodos Raíz](#jerarquía-vacía---crear-nodos-raíz)
- [Control de Acceso](#control-de-acceso)
- [Manejo de Errores](#manejo-de-errores)
- [Ejemplos de Uso (React/Next.js)](#ejemplos-de-uso-reactnextjs)
- [Optimizaciones de Rendimiento](#optimizaciones-de-rendimiento)
- [Integración con Sites y Channels](#integración-con-sites-y-channels) ⭐ **NUEVO**

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

| Tipo | Descripción | Puede tener hijos | Puede moverse a raíz |
|------|-------------|-------------------|----------------------|
| `folder` | Carpeta organizativa | ✅ Cualquier tipo | ✅ Sí |
| `site` | Referencia a un Site físico | ⚠️ Solo channels | ❌ No |
| `channel` | Referencia a un Canal de dispositivo | ❌ No (hoja) | ❌ No |

> **⚠️ Restricciones importantes:**
> - Los **channels** son nodos hoja - no pueden tener hijos
> - Los **sites** solo pueden contener **channels** como hijos
> - Solo los **folders** pueden moverse a la raíz del árbol

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

## 🎯 Patrones de Carga del Árbol

Esta sección es **fundamental** para elegir correctamente cómo cargar el árbol según el caso de uso.

### Resumen de Endpoints de Lectura

| Endpoint | Qué retorna | Cuándo usar |
|----------|-------------|-------------|
| `GET /roots` | Solo nodos raíz (nivel 0) | Carga inicial para lazy loading |
| `GET /nodes/:id/children` | Hijos directos de un nodo | Cuando usuario expande un nodo |
| `GET /tree` | Árbol completo o limitado por `max_depth` | Selectores rápidos, vistas compactas |
| `GET /nodes/:id/ancestors` | Ancestros hasta la raíz | Breadcrumbs |
| `POST /nodes/batch` | Múltiples nodos por IDs | Cargar varios nodos específicos |

---

### Patrón 1: Lazy Loading (Recomendado para Gestión)

**Usar para:** Administrador de jerarquía, interfaces de CRUD, árboles grandes

```
Carga Inicial: GET /roots
     ↓
Usuario expande nodo: GET /nodes/:id/children
     ↓
Usuario expande otro: GET /nodes/:id/children
     ...
```

**Flujo:**

```javascript
// 1. Carga inicial - solo raíces
const { data: roots } = await api.get('/resource-hierarchy/roots');
// Cada nodo tiene: { id, name, node_type, has_children, children_count, ... }

// 2. Cuando el usuario hace clic en expandir (si has_children === true)
const { data: children } = await api.get(`/resource-hierarchy/nodes/${nodeId}/children`);

// 3. Renderizar hijos y repetir el proceso
```

**Ejemplo de respuesta de `/roots`:**

```json
{
  "ok": true,
  "data": [
    {
      "id": "RH-abc123-1",
      "name": "Región Norte",
      "node_type": "folder",
      "has_children": true,
      "children_count": 3,
      "depth": 0
    },
    {
      "id": "RH-def456-2",
      "name": "Región Sur",
      "node_type": "folder",
      "has_children": true,
      "children_count": 2,
      "depth": 0
    }
  ]
}
```

**Ventajas:**
- ✅ Carga mínima inicial (solo raíces)
- ✅ El usuario controla qué expandir
- ✅ Escala bien con árboles de cualquier tamaño
- ✅ Menor consumo de memoria en frontend
- ✅ Ideal para operaciones CRUD (crear, mover, eliminar)

**Cuándo usar:**
- Pantalla de administración de jerarquía
- Cuando el usuario puede crear/editar/mover nodos
- Árboles con más de 50-100 nodos
- Árboles con profundidad desconocida o variable

---

### Patrón 2: Carga Completa con Límite (Para Selectores)

**Usar para:** Selectores en formularios, filtros de dashboard, vistas de solo lectura

```
Carga única: GET /tree?max_depth=2
     ↓
Árbol completo en memoria (hasta 2 niveles)
```

**Flujo:**

```javascript
// Cargar árbol con máximo 2 niveles de profundidad
const { data: tree } = await api.get('/resource-hierarchy/tree?max_depth=2');
// Retorna: nivel 0 (raíces) + nivel 1 (hijos de raíces) + nivel 2 (nietos)

// El árbol viene estructurado con children anidados
```

**Ejemplo de respuesta de `/tree?max_depth=2`:**

```json
{
  "ok": true,
  "data": [
    {
      "id": "RH-abc123-1",
      "name": "Región Norte",
      "node_type": "folder",
      "has_children": true,
      "children_count": 2,
      "children": [
        {
          "id": "RH-zona1-3",
          "name": "Zona A",
          "node_type": "folder",
          "has_children": true,
          "children_count": 3,
          "children": [
            {
              "id": "RH-hotel1-5",
              "name": "Hotel Lima",
              "node_type": "site",
              "has_children": true,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

**Importante sobre `max_depth`:**
- `max_depth=1` → Retorna nivel 0 + nivel 1 (raíces y sus hijos directos)
- `max_depth=2` → Retorna nivel 0 + nivel 1 + nivel 2 (3 niveles)
- `max_depth=3` → Es el **default** si no se especifica
- Máximo permitido: 50

**Ventajas:**
- ✅ Una sola llamada a la API
- ✅ Árbol listo para renderizar inmediatamente
- ✅ Ideal para selectores tipo dropdown/tree-select

**Cuándo usar:**
- Selector de ubicación en formularios
- Filtros de dashboard
- Vistas compactas de resumen
- Árboles pequeños/medianos (menos de 100 nodos)
- Cuando conoces la profundidad máxima necesaria

---

### Patrón 3: Breadcrumbs

**Usar para:** Mostrar la ruta desde la raíz hasta un nodo específico

```javascript
// Obtener ancestros de un nodo (desde raíz hasta el padre del nodo)
const { data: ancestors } = await api.get(`/resource-hierarchy/nodes/${nodeId}/ancestors`);

// Respuesta ordenada: [raíz, nivel1, nivel2, ..., padre_inmediato]
```

**Alternativa con batch (si ya tienes los IDs):**

```javascript
// Si ya conoces los IDs de los ancestros
const { data: nodes } = await api.post('/resource-hierarchy/nodes/batch', {
  ids: ['RH-root-1', 'RH-parent-2', 'RH-current-3']
});
```

---

### Tabla de Decisión

| Escenario | Endpoint Recomendado | Razón |
|-----------|---------------------|-------|
| Administrador de jerarquía (CRUD) | `/roots` + `/children` | Precisión, lazy loading |
| Selector "Elegir ubicación" | `/tree?max_depth=2` | Carga rápida, vista compacta |
| Filtro por zona en dashboard | `/tree?max_depth=3` | Vista completa para filtrar |
| Breadcrumbs | `/ancestors` | Ruta directa al nodo |
| Cargar nodos favoritos | `/nodes/batch` | Múltiples IDs específicos |
| Exportar estructura | `/tree?max_depth=50` | Árbol completo |
| Buscar nodos por nombre | `/nodes?search=texto` | Búsqueda global |

---

### Propiedad `has_children`

Todos los endpoints de lectura incluyen por defecto:

```json
{
  "id": "RH-xxx",
  "name": "Mi Nodo",
  "has_children": true,
  "children_count": 5
}
```

- `has_children: true` → El nodo tiene hijos, mostrar icono de expandir
- `has_children: false` → El nodo es hoja, no mostrar icono de expandir
- `children_count` → Número exacto de hijos directos

**Nota:** Si no necesitas el conteo exacto, puedes usar `include_counts=false` para mejor rendimiento:

```javascript
// Más rápido, pero sin has_children ni children_count
const { data } = await api.get('/resource-hierarchy/nodes/RH-xxx/children?include_counts=false');
```

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
| `cascade` | boolean | `false` | Si eliminar también los descendientes |

#### Flujo de Eliminación con Confirmación

El endpoint implementa un flujo de confirmación en dos pasos para proteger contra eliminaciones accidentales:

```
Paso 1: DELETE /nodes/:id (sin cascade)
  ↓
Si tiene hijos → 409 Conflict con lista de affected_nodes
  ↓
Frontend muestra modal de confirmación con los nodos afectados
  ↓
Paso 2: DELETE /nodes/:id?cascade=true
  ↓
200 OK con deleted_nodes
```

#### Caso 1: Nodo SIN hijos

```
DELETE /api/v1/resource-hierarchy/nodes/RH-a1b2c3d4e5-7
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "deleted_count": 1,
    "message": "Nodo eliminado correctamente"
  }
}
```

#### Caso 2: Nodo CON hijos (sin cascade) → Error 409

```
DELETE /api/v1/resource-hierarchy/nodes/RH-a1b2c3d4e5-7
```

**Response (409 Conflict):**
```json
{
  "ok": false,
  "error": {
    "code": "HAS_CHILDREN",
    "message": "El nodo tiene hijos. Use cascade=true para eliminar todo el subárbol",
    "affected_nodes": [
      { "id": "RH-a1b2c3d4e5-7", "name": "Zona Norte", "node_type": "folder" },
      { "id": "RH-child1-xxx-1", "name": "Hotel Lima", "node_type": "site" },
      { "id": "RH-child2-xxx-2", "name": "Sensor Lobby", "node_type": "channel" },
      { "id": "RH-child3-xxx-3", "name": "Sensor Piscina", "node_type": "channel" }
    ]
  }
}
```

#### Caso 3: Nodo CON hijos + cascade=true → Eliminar todo

```
DELETE /api/v1/resource-hierarchy/nodes/RH-a1b2c3d4e5-7?cascade=true
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "deleted_count": 4,
    "deleted_nodes": [
      { "id": "RH-a1b2c3d4e5-7", "name": "Zona Norte", "node_type": "folder" },
      { "id": "RH-child1-xxx-1", "name": "Hotel Lima", "node_type": "site" },
      { "id": "RH-child2-xxx-2", "name": "Sensor Lobby", "node_type": "channel" },
      { "id": "RH-child3-xxx-3", "name": "Sensor Piscina", "node_type": "channel" }
    ],
    "message": "Nodo y 3 descendientes eliminados correctamente"
  }
}
```

#### Ejemplo de Implementación en Frontend

```tsx
// Función para eliminar nodo con confirmación
const handleDeleteNode = async (nodeId: string) => {
  try {
    // Paso 1: Intentar eliminar sin cascade
    await api.delete(`/resource-hierarchy/nodes/${nodeId}`);
    toast.success('Nodo eliminado correctamente');
    refreshTree();
  } catch (error) {
    if (error.response?.status === 409 && error.response?.data?.error?.code === 'HAS_CHILDREN') {
      // Paso 2: Mostrar modal de confirmación con nodos afectados
      const affectedNodes = error.response.data.error.affected_nodes;
      
      const confirmed = await showConfirmModal({
        title: '¿Eliminar nodo y todos sus descendientes?',
        message: `Se eliminarán ${affectedNodes.length} nodos:`,
        items: affectedNodes.map(n => `${n.node_type}: ${n.name}`),
        confirmText: 'Eliminar todo',
        variant: 'destructive'
      });
      
      if (confirmed) {
        // Paso 3: Eliminar con cascade
        await api.delete(`/resource-hierarchy/nodes/${nodeId}?cascade=true`);
        toast.success('Nodo y descendientes eliminados');
        refreshTree();
      }
    } else {
      toast.error('Error al eliminar nodo');
    }
  }
};
```

---

## 🌳 Operaciones de Árbol

### 6. PATCH /nodes/:id/move

Mueve un nodo a un nuevo padre y/o cambia su orden de visualización.

**Request Body:**
```json
{
  "new_parent_id": "RH-x1y2z3w4v5-3",
  "display_order": 2
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `new_parent_id` | string \| null | ✅ Sí | Public code del nuevo padre, o `null` para mover a la raíz |
| `display_order` | integer | ❌ No | Nuevo orden entre hermanos (0 = primero) |

Para mover a la raíz, envía `new_parent_id: null` (solo permitido para folders).

> **💡 Caso de uso:** Cuando el usuario arrastra un nodo a otro padre, naturalmente quiere especificar en qué posición quedará entre los hermanos. Este endpoint permite hacer ambas cosas en un solo paso.

**Validaciones y Guards:**

| Validación | Código de Error | Descripción |
|------------|-----------------|-------------|
| Auto-referencia | `SELF_REFERENCE` | No se puede mover un nodo a sí mismo |
| Ciclos | `CYCLE_DETECTED` | No se puede mover a un descendiente propio |
| Cross-org | `CROSS_ORG_MOVE_NOT_ALLOWED` | Origen y destino deben ser de la misma organización |
| Permisos origen | `INSUFFICIENT_SOURCE_PERMISSIONS` | Requiere permiso `edit` en el nodo a mover |
| Permisos destino | `INSUFFICIENT_DESTINATION_PERMISSIONS` | Requiere permiso `edit` en el destino |
| Tipo a raíz | `INVALID_MOVE_TO_ROOT` | Solo folders pueden moverse a la raíz |
| Tipo padre inválido | `INVALID_PARENT_TYPE` | Channels no pueden tener hijos; sites solo aceptan channels |

**Response exitosa (200 OK):**
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

**Response de error (400 Bad Request):**
```json
{
  "ok": false,
  "error": {
    "code": "CYCLE_DETECTED",
    "message": "No se puede mover un nodo a uno de sus descendientes"
  }
}
```

**Response de error (403 Forbidden):**
```json
{
  "ok": false,
  "error": {
    "code": "INSUFFICIENT_DESTINATION_PERMISSIONS",
    "message": "No tienes permisos para mover nodos a esta ubicación"
  }
}
```

#### Ejemplo de Manejo de Errores en Frontend

```tsx
/**
 * Mueve un nodo a un nuevo padre y opcionalmente cambia su orden
 * @param nodeId - Public code del nodo a mover
 * @param newParentId - Public code del destino (null para raíz)
 * @param displayOrder - Posición entre hermanos (opcional)
 */
const handleMoveNode = async (
  nodeId: string, 
  newParentId: string | null,
  displayOrder?: number
) => {
  try {
    await api.patch(`/resource-hierarchy/nodes/${nodeId}/move`, { 
      new_parent_id: newParentId,
      display_order: displayOrder // Opcional: posición entre hermanos
    });
    toast.success('Nodo movido correctamente');
    refreshTree();
  } catch (error) {
    const errorCode = error.response?.data?.error?.code;
    
    const errorMessages: Record<string, string> = {
      'SELF_REFERENCE': 'No puedes mover un nodo a sí mismo',
      'CYCLE_DETECTED': 'No puedes mover un nodo dentro de sus propios hijos',
      'CROSS_ORG_MOVE_NOT_ALLOWED': 'No puedes mover nodos entre organizaciones',
      'INSUFFICIENT_SOURCE_PERMISSIONS': 'No tienes permisos para mover este nodo',
      'INSUFFICIENT_DESTINATION_PERMISSIONS': 'No tienes permisos en la ubicación de destino',
      'INVALID_MOVE_TO_ROOT': 'Solo las carpetas pueden estar en la raíz',
      'INVALID_PARENT_TYPE': 'Este tipo de nodo no puede ir dentro del destino seleccionado'
    };
    
    toast.error(errorMessages[errorCode] || 'Error al mover el nodo');
  }
};
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

| Código HTTP | Error Code | Descripción |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Datos de entrada inválidos |
| 400 | `INVALID_NODE_TYPE` | Tipo de nodo no válido |
| 400 | `INVALID_PARENT` | El padre no existe o pertenece a otra organización |
| 400 | `INVALID_PARENT_TYPE` | El tipo de padre no acepta este tipo de hijo |
| 400 | `INVALID_MOVE_TO_ROOT` | Solo folders pueden moverse a la raíz |
| 400 | `SELF_REFERENCE` | Intento de mover nodo a sí mismo |
| 400 | `CYCLE_DETECTED` | Intento de mover nodo a su propio descendiente |
| 400 | `CROSS_ORG_MOVE_NOT_ALLOWED` | Intento de mover entre organizaciones |
| 403 | `FORBIDDEN` | Sin permisos para esta operación |
| 403 | `INSUFFICIENT_SOURCE_PERMISSIONS` | Sin permiso `edit` en el nodo origen |
| 403 | `INSUFFICIENT_DESTINATION_PERMISSIONS` | Sin permiso `edit` en el destino |
| 404 | `NODE_NOT_FOUND` | Nodo no encontrado |
| 404 | `PARENT_NOT_FOUND` | Nodo padre no encontrado |
| 409 | `HAS_CHILDREN` | Nodo tiene hijos, usar `cascade=true` para eliminar |

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
  siblingIndex: number; // Posición actual entre hermanos
  onMove: (nodeId: string, newParentId: string, displayOrder?: number) => Promise<void>;
}

export const DraggableNode = ({ node, siblingIndex, onMove }: DraggableNodeProps) => {
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
      // Validar restricciones de tipos
      if (item.id === node.id) return false; // No sobre sí mismo
      if (node.node_type === 'channel') return false; // Channels no aceptan hijos
      if (node.node_type === 'site' && item.type !== 'channel') return false; // Sites solo aceptan channels
      return true;
    },
    drop: async (item, monitor) => {
      // Calcular display_order basado en posición del drop
      const dropPosition = siblingIndex; // Posición donde se soltó
      await onMove(item.id, node.id, dropPosition);
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

---

## 🔗 Integración con Sites y Channels

### Parámetro `not_in_hierarchy`

Cuando el usuario quiere agregar un site o channel existente a la jerarquía, necesitas mostrar solo los que **aún no están vinculados**. Usa el parámetro `not_in_hierarchy=true` en los endpoints de Sites y Channels:

```javascript
// Obtener sites que NO están en la jerarquía (disponibles para agregar)
const availableSites = await api.get('/sites?not_in_hierarchy=true');

// Obtener channels que NO están en la jerarquía
const availableChannels = await api.get('/channels?not_in_hierarchy=true');
```

**Comportamiento:**
- `not_in_hierarchy=true` → Solo recursos SIN nodo en la jerarquía
- `not_in_hierarchy=false` o sin parámetro → Todos los recursos (comportamiento normal)

**Caso de uso típico: Modal "Agregar recurso existente"**

```tsx
// Modal para agregar un site existente a la jerarquía
const AddExistingSiteModal = ({ parentNodeId, onAdd }) => {
  const [sites, setSites] = useState([]);
  
  useEffect(() => {
    // Cargar solo sites que no están en la jerarquía
    const loadAvailableSites = async () => {
      const response = await api.get('/sites?not_in_hierarchy=true');
      setSites(response.data.data);
    };
    loadAvailableSites();
  }, []);
  
  const handleSelect = async (site) => {
    // Crear nodo en la jerarquía referenciando el site existente
    await api.post('/resource-hierarchy/nodes', {
      name: site.name,
      node_type: 'site',
      parent_id: parentNodeId,
      reference_id: site.id  // Public code del site
    });
    onAdd();
  };
  
  if (sites.length === 0) {
    return <p>Todos los sites ya están en la jerarquía</p>;
  }
  
  return (
    <ul>
      {sites.map(site => (
        <li key={site.id} onClick={() => handleSelect(site)}>
          {site.name}
        </li>
      ))}
    </ul>
  );
};
```

### Campo `reference_id`

Cuando creas un nodo de tipo `site` o `channel`, puedes vincularlo a un recurso existente mediante `reference_id`:

```json
{
  "name": "Hotel Lima",
  "node_type": "site",
  "parent_id": "RH-zona-xxx-1",
  "reference_id": "SITE-61D4Vc4Oo9R-4"
}
```

**Reglas:**
- `reference_id` es el **public_code** del site o channel
- Un site/channel solo puede estar vinculado a **un nodo** en la jerarquía
- Si intentas crear otro nodo con el mismo `reference_id`, recibirás error 409

---

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
| Agregar site existente | `GET /sites?not_in_hierarchy=true` |
| Agregar channel existente | `GET /channels?not_in_hierarchy=true` |
