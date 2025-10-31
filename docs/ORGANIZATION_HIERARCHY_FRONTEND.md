# Organization Hierarchy - Frontend Integration Guide

## Overview

El sistema de jerarquía de organizaciones permite estructurar organizaciones en un árbol ilimitado de niveles con permisos granulares basados en roles híbridos (roles globales + roles organizacionales).

## Conceptos Clave

### Estructura Jerárquica
- **Organización raíz**: EC.DATA (parent_id = null)
- **Jerarquía ilimitada**: Una organización puede tener N niveles de sub-organizaciones
- **Relación padre-hijo**: Cada organización tiene opcionalmente un `parent_id`

### Sistema de Roles Híbrido

#### Roles Globales (users.role_id)
Define el rol del usuario a nivel de sistema:
- `system-admin`: Acceso total al sistema
- `org-admin`: Admin de organizaciones
- `org-manager`: Manager de organizaciones
- `user`: Usuario estándar
- `viewer`: Solo lectura
- `guest`: Acceso limitado
- `demo`: Cuenta demo

#### Roles Organizacionales (user_organizations.role_in_org)
Define el rol del usuario dentro de una organización específica:
- `admin`: Administrador de la organización (ve org + descendientes)
- `member`: Miembro regular (solo ve esa organización)
- `viewer`: Solo lectura (solo ve esa organización)

### Lógica de Permisos

| Rol Global | role_in_org | Acceso |
|------------|-------------|---------|
| system-admin | - | Todas las organizaciones del sistema |
| org-admin | admin | Organización asignada + todos sus descendientes |
| org-admin | member | Solo la organización asignada |
| user | admin | Organización asignada + todos sus descendientes |
| user | member/viewer | Solo la organización asignada |

## API Endpoints

### 1. GET /api/v1/organizations/hierarchy
**Descripción**: Obtiene el árbol completo de organizaciones desde la raíz.

**Query Parameters**:
- `root_id` (opcional): Public code de la organización raíz (default: organización raíz del sistema)
- `active_only` (opcional): Filtrar solo organizaciones activas (default: true)

**Response**:
```json
{
  "ok": true,
  "data": {
    "id": "ORG-ABC123",
    "human_id": 1,
    "name": "EC.DATA",
    "slug": "ec-data",
    "parent_id": null,
    "is_active": true,
    "children": [
      {
        "id": "ORG-DEF456",
        "human_id": 2,
        "name": "ACME Corporation",
        "slug": "acme-corp",
        "parent_id": "ORG-ABC123",
        "is_active": true,
        "children": [...]
      }
    ]
  }
}
```

**Uso Recomendado**: 
- Cargar árbol completo pequeño (<100 nodos)
- Dashboard con vista general de estructura organizacional
- Visualizaciones de árbol completo

---

### 2. GET /api/v1/organizations/:id/subtree
**Descripción**: Obtiene el árbol desde una organización específica hacia abajo con lazy loading.

**Path Parameters**:
- `id`: Public code de la organización raíz del subárbol

**Query Parameters**:
- `levels` (opcional): Número de niveles a cargar (default: 2, max: 10)
- `active_only` (opcional): Filtrar solo organizaciones activas (default: true)

**Response**:
```json
{
  "ok": true,
  "data": {
    "id": "ORG-ABC123",
    "name": "ACME Corporation",
    "slug": "acme-corp",
    "hasChildren": true,
    "children": [
      {
        "id": "ORG-XYZ789",
        "name": "ACME North",
        "slug": "acme-north",
        "hasChildren": true,
        "children": [
          {
            "id": "ORG-QWE456",
            "name": "ACME North West",
            "slug": "acme-north-west",
            "hasChildren": false,
            "children": []
          }
        ]
      }
    ]
  }
}
```

**Uso Recomendado**:
- Lazy loading de grandes árboles
- Expandir nodos bajo demanda
- Optimizar carga inicial

**Campo Importante**: `hasChildren` indica si el nodo tiene más hijos no cargados.

---

### 3. GET /api/v1/organizations/:id/children
**Descripción**: Obtiene los hijos de una organización con lazy loading configurable.

**Path Parameters**:
- `id`: Public code de la organización padre

**Query Parameters**:
- `levels` (opcional): Número de niveles a cargar (default: 2, min: 1, max: 5)
- `active_only` (opcional): Filtrar solo organizaciones activas (default: true)

**Response**:
```json
{
  "ok": true,
  "data": [
    {
      "id": "ORG-ABC123",
      "name": "Org Child 1",
      "hasChildren": true,
      "children": [
        {
          "id": "ORG-DEF456",
          "name": "Org Grandchild 1",
          "hasChildren": false,
          "children": []
        }
      ]
    },
    {
      "id": "ORG-GHI789",
      "name": "Org Child 2",
      "hasChildren": false,
      "children": []
    }
  ]
}
```

**Uso Recomendado**:
- Renderizar hijos directos con 2 niveles de profundidad
- Navegación por niveles
- Tree views con expansión progresiva

---

### 4. GET /api/v1/organizations/:id/descendants
**Descripción**: Obtiene todos los descendientes de una organización en lista plana.

**Path Parameters**:
- `id`: Public code de la organización

**Response**:
```json
{
  "ok": true,
  "data": [
    {
      "id": "ORG-ABC123",
      "human_id": 2,
      "name": "Child Org",
      "slug": "child-org",
      "parent_id": "ORG-ROOT"
    },
    {
      "id": "ORG-DEF456",
      "human_id": 3,
      "name": "Grandchild Org",
      "slug": "grandchild-org",
      "parent_id": "ORG-ABC123"
    }
  ]
}
```

**Uso Recomendado**:
- Búsqueda de organizaciones descendientes
- Listas planas de organizaciones
- Filtros y reportes

---

## Patrones de Implementación

### 1. Tree View con Lazy Loading (Recomendado)

**Estrategia**: Cargar solo 2 niveles inicialmente, expandir bajo demanda.

```typescript
interface OrgNode {
  id: string;
  name: string;
  slug: string;
  hasChildren: boolean;
  children: OrgNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

// Estado inicial: cargar raíz + 2 niveles
const loadInitialTree = async () => {
  const response = await fetch('/api/v1/organizations/:rootId/subtree?levels=2');
  const { data } = await response.json();
  return data;
};

// Expandir nodo bajo demanda
const expandNode = async (nodeId: string) => {
  const response = await fetch(`/api/v1/organizations/${nodeId}/children?levels=2`);
  const { data } = await response.json();
  return data;
};
```

**Ventajas**:
- Carga rápida inicial
- Memoria eficiente
- Escalable a árboles grandes

---

### 2. Breadcrumb Navigation

**Estrategia**: Mostrar ruta completa desde raíz a nodo actual.

```typescript
// Usar endpoint GET /:id/path para obtener ancestros
const getBreadcrumbs = async (orgId: string) => {
  const response = await fetch(`/api/v1/organizations/${orgId}/path`);
  const { data } = await response.json();
  
  // data = [{ id, name, slug }, ...]
  return data.map(org => ({
    label: org.name,
    href: `/organizations/${org.id}`
  }));
};
```

---

### 3. Dropdown Selector (Árbol Completo)

**Estrategia**: Para árboles pequeños (<100 nodos), cargar todo y renderizar jerárquicamente.

```typescript
interface OrgOption {
  value: string;
  label: string;
  level: number;
  parent_id: string | null;
}

const flattenTree = (node: OrgNode, level = 0): OrgOption[] => {
  const options: OrgOption[] = [{
    value: node.id,
    label: '  '.repeat(level) + node.name, // Indentación visual
    level,
    parent_id: node.parent_id
  }];

  node.children?.forEach(child => {
    options.push(...flattenTree(child, level + 1));
  });

  return options;
};
```

---

### 4. Search + Filter

**Estrategia**: Buscar en lista plana, luego reconstruir contexto jerárquico.

```typescript
// 1. Obtener todas las organizaciones accesibles (flat)
const searchOrgs = async (query: string) => {
  const response = await fetch(
    `/api/v1/organizations?search=${query}&limit=50`
  );
  return response.json();
};

// 2. Para cada resultado, obtener su ruta (breadcrumb)
const enrichWithPath = async (orgs: Org[]) => {
  return Promise.all(
    orgs.map(async (org) => {
      const pathResponse = await fetch(`/api/v1/organizations/${org.id}/path`);
      const { data: path } = await pathResponse.json();
      return { ...org, path };
    })
  );
};
```

---

## Casos de Uso Comunes

### Caso 1: Selector de Organización para Usuarios

**Requisito**: Permitir al usuario seleccionar una organización de las que tiene acceso.

**Solución**:
```typescript
// 1. Obtener organizaciones accesibles del usuario (viene en session context)
const userOrgs = user.organization_memberships.map(m => ({
  id: m.organization.id,
  name: m.organization.name,
  role: m.role_in_org
}));

// 2. Renderizar dropdown simple (no jerárquico)
<Select>
  {userOrgs.map(org => (
    <option key={org.id} value={org.id}>
      {org.name} ({org.role})
    </option>
  ))}
</Select>
```

---

### Caso 2: Árbol Organizacional en Dashboard

**Requisito**: Mostrar estructura completa con navegación.

**Solución**:
```typescript
// 1. Cargar árbol con 2 niveles
const [tree, setTree] = useState<OrgNode | null>(null);

useEffect(() => {
  fetch('/api/v1/organizations/hierarchy?levels=2')
    .then(r => r.json())
    .then(({ data }) => setTree(data));
}, []);

// 2. Renderizar con expansión dinámica
const TreeNode = ({ node }: { node: OrgNode }) => {
  const [expanded, setExpanded] = useState(false);
  
  const handleExpand = async () => {
    if (!node.children.length && node.hasChildren) {
      // Cargar hijos bajo demanda
      const response = await fetch(`/api/v1/organizations/${node.id}/children?levels=1`);
      const { data } = await response.json();
      node.children = data;
    }
    setExpanded(!expanded);
  };

  return (
    <div>
      <button onClick={handleExpand}>
        {node.hasChildren && (expanded ? '▼' : '▶')}
        {node.name}
      </button>
      {expanded && node.children.map(child => (
        <TreeNode key={child.id} node={child} />
      ))}
    </div>
  );
};
```

---

### Caso 3: Mover Organización (Drag & Drop)

**Requisito**: Permitir reorganizar jerarquía mediante drag & drop.

**Solución**:
```typescript
const moveOrganization = async (orgId: string, newParentId: string) => {
  // Validar que no crea ciclo
  const response = await fetch(`/api/v1/organizations/${orgId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parent_id: newParentId })
  });

  if (!response.ok) {
    const { error } = await response.json();
    alert(error.message); // "Cannot move: would create cycle"
  }
};
```

---

## Estructura de Datos Completa

### Organization Object (Public API)

```typescript
interface Organization {
  // Identificadores
  id: string;                    // Public code (ORG-ABC123)
  human_id: number;              // ID secuencial humano-legible
  
  // Información básica
  name: string;                  // Nombre
  slug: string;                  // Slug único
  description?: string;          // Descripción
  
  // Jerarquía
  parent_id: string | null;      // ID de organización padre (null = raíz)
  hasChildren?: boolean;         // Flag para lazy loading
  children?: Organization[];     // Nodos hijos
  
  // Ubicación
  country_id: number;            // ID del país
  address?: string;              // Dirección física
  
  // Contacto
  email?: string;                // Email de contacto
  phone?: string;                // Teléfono
  website?: string;              // Sitio web
  
  // Fiscal
  tax_id?: string;               // RUT/NIF/VAT
  
  // Configuración
  config?: {                     // Configuración JSON
    timezone?: string;           // Zona horaria
    currency?: string;           // Moneda
    language?: string;           // Idioma
  };
  
  // Estado
  is_active: boolean;            // Activa/Inactiva
  
  // Medios
  logo_url?: string;             // URL del logo
  
  // Timestamps
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
}
```

---

## Manejo de Errores

### Errores Comunes

| Código | Mensaje | Descripción |
|--------|---------|-------------|
| `NOT_FOUND` | Organization not found | Organización no existe |
| `FORBIDDEN` | Insufficient permissions | Usuario sin permisos |
| `VALIDATION_ERROR` | Invalid input | Datos inválidos |
| `CYCLE_DETECTED` | Cannot move: would create cycle | Mover crearía ciclo |
| `UNAUTHORIZED` | Authentication required | No autenticado |

### Ejemplo de Manejo

```typescript
try {
  const response = await fetch('/api/v1/organizations/ORG-123/subtree');
  
  if (!response.ok) {
    const { error } = await response.json();
    
    switch (error.code) {
      case 'NOT_FOUND':
        showNotification('Organización no encontrada');
        break;
      case 'FORBIDDEN':
        showNotification('No tienes permisos para ver esta organización');
        break;
      default:
        showNotification('Error al cargar datos');
    }
  }
} catch (e) {
  showNotification('Error de conexión');
}
```

---

## Performance Tips

### 1. Lazy Loading
✅ **Hacer**: Cargar 2 niveles inicialmente, expandir bajo demanda
❌ **Evitar**: Cargar árbol completo con 100+ nodos

### 2. Caching
✅ **Hacer**: Cachear subárboles en memoria durante la sesión
❌ **Evitar**: Recargar el mismo subárbol múltiples veces

### 3. Paginación
✅ **Hacer**: Para listas planas, usar `limit` y `offset`
❌ **Evitar**: Cargar 1000+ organizaciones sin paginación

### 4. Debouncing
✅ **Hacer**: Debounce en búsquedas (300ms)
❌ **Evitar**: Búsqueda en cada keystroke sin debounce

---

## Bibliotecas Recomendadas

### React
- **react-arborist**: Tree view con virtualización
- **rc-tree**: Componente tree robusto
- **react-select**: Dropdowns con búsqueda

### Vue
- **vue-tree**: Tree component simple
- **element-plus Tree**: Componente enterprise-ready

### Vanilla JS
- **jstree**: jQuery tree plugin
- **fancytree**: Tree view moderno

---

## Checklist de Implementación

- [ ] Implementar lazy loading con 2 niveles por defecto
- [ ] Agregar indicador de carga mientras se expanden nodos
- [ ] Mostrar `hasChildren` flag visualmente (ícono expandible)
- [ ] Implementar manejo de errores para todos los endpoints
- [ ] Agregar breadcrumb navigation
- [ ] Cachear subárboles en memoria del cliente
- [ ] Implementar debounce en búsqueda (300ms)
- [ ] Mostrar rol del usuario en cada organización (role_in_org)
- [ ] Validar permisos antes de operaciones sensibles
- [ ] Agregar tooltips con información adicional

---

## FAQ

**P: ¿Cuántos niveles puedo cargar de una vez?**  
R: Máximo 10 niveles por request, pero recomendamos 2 para mejor performance.

**P: ¿Cómo sé si un usuario puede ver una organización?**  
R: El backend ya filtra automáticamente. Solo recibirás organizaciones accesibles.

**P: ¿Puedo crear organizaciones desde el frontend?**  
R: Sí, usa `POST /api/v1/organizations` (requiere permisos adecuados).

**P: ¿Cómo manejo organizaciones inactivas?**  
R: Usa `active_only=false` en query params. Por defecto solo se retornan activas.

**P: ¿El hasChildren flag es confiable?**  
R: Sí, indica si hay más nodos hijos no cargados. Úsalo para mostrar ícono de expansión.

---

## Soporte

Para dudas o issues:
- Backend: Revisar logs en `/logs/`
- Documentación API: `http://localhost:5000/docs`
- Contacto: dev@ecdata.com
