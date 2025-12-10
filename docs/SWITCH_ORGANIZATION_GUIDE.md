# 🔄 Cambio de Organización - Guía para Frontend

Documentación del endpoint `POST /api/v1/auth/switch-org` para el equipo de frontend.

---

## 📋 Descripción General

El endpoint de cambio de organización permite a un usuario autenticado cambiar su **organización activa** dentro de una sesión. Esto afecta qué datos puede ver y gestionar en los endpoints de recursos (Sites, Devices, Channels, Files).

### Comportamiento Clave

- **Solo puede cambiar a organizaciones a las que tiene acceso** (directo o por herencia jerárquica)
- **Genera nuevos tokens JWT** con la nueva organización activa
- **No afecta la sesión de refresh token** - el usuario sigue logueado

---

## 🔗 Endpoint

```
POST /api/v1/auth/switch-org
```

### Headers Requeridos

```javascript
{
  'Authorization': 'Bearer <access_token>',
  'Content-Type': 'application/json'
}
```

### Body

```json
{
  "organization_id": "ORG-yOM9ewfqOeWa-4"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `organization_id` | string | Sí | Public code de la organización destino (formato `ORG-XXXXX-X`) |

---

## ✅ Respuesta Exitosa (200)

```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "USR-abc123xyz-1",
      "email": "usuario@empresa.com",
      "first_name": "Juan",
      "last_name": "Pérez",
      "role": "org-admin",
      "active_organization": {
        "id": "ORG-yOM9ewfqOeWa-4",
        "name": "ACME Corp",
        "role_in_org": "org-admin"
      },
      "accessible_organizations": [
        {
          "id": "ORG-yOM9ewfqOeWa-4",
          "name": "ACME Corp",
          "role_in_org": "org-admin"
        },
        {
          "id": "ORG-childOrg123-2",
          "name": "ACME Sucursal Norte",
          "role_in_org": "org-manager"
        }
      ]
    }
  },
  "meta": {
    "timestamp": "2025-12-10T14:30:00.000Z",
    "locale": "es"
  }
}
```

### Campos Importantes de la Respuesta

| Campo | Descripción |
|-------|-------------|
| `accessToken` | **Nuevo token JWT** con la organización activa actualizada. Debe reemplazar el token anterior. |
| `user.active_organization` | Organización actualmente activa para el usuario |
| `user.active_organization.role_in_org` | Rol del usuario **dentro** de esa organización específica |
| `user.accessible_organizations` | Lista de todas las organizaciones a las que el usuario puede cambiar |

---

## ❌ Respuestas de Error

### 400 - Validación Fallida

Cuando el `organization_id` tiene formato inválido o está vacío:

```json
{
  "ok": false,
  "error": {
    "message": "Error de validación",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "organization_id",
        "message": "El ID de organización es requerido"
      }
    ]
  }
}
```

### 401 - No Autenticado

Cuando no se envía token o el token es inválido/expirado:

```json
{
  "ok": false,
  "error": {
    "message": "Token de acceso requerido",
    "code": "UNAUTHORIZED"
  }
}
```

### 404 - Organización No Encontrada ⚠️ NUEVO

**Este es un cambio reciente.** Ahora retorna 404 cuando:
- La organización no existe
- La organización fue eliminada (soft-deleted / `is_active = false`)

```json
{
  "ok": false,
  "error": {
    "message": "Organización no encontrada",
    "code": "ORGANIZATION_NOT_FOUND"
  }
}
```

**¿Por qué 404 en lugar de 403?**  
Por seguridad. Si retornáramos 403 para organizaciones que existen pero el usuario no puede acceder, un atacante podría enumerar qué organizaciones existen en el sistema. Con 404, no pueden distinguir entre "no existe" y "fue eliminada".

### 403 - Sin Permiso de Acceso

Cuando la organización existe y está activa, pero el usuario no tiene permiso para acceder:

```json
{
  "ok": false,
  "error": {
    "message": "No tienes acceso a esta organización",
    "code": "ORGANIZATION_ACCESS_DENIED"
  }
}
```

---

## 🔄 Flujo de Implementación Frontend

### 1. Selector de Organización

```jsx
// Componente de selector de organización
const OrganizationSwitcher = () => {
  const { user, setAccessToken, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSwitch = async (organizationId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/switch-org', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ organization_id: organizationId })
      });

      const data = await response.json();

      if (!response.ok) {
        // Manejar errores específicos
        switch (response.status) {
          case 404:
            setError('La organización no existe o fue eliminada');
            // Opcional: refrescar lista de organizaciones
            await refreshUserOrganizations();
            break;
          case 403:
            setError('No tienes permiso para acceder a esta organización');
            break;
          case 401:
            // Token expirado, redirigir a login
            redirectToLogin();
            break;
          default:
            setError('Error al cambiar de organización');
        }
        return;
      }

      // Éxito: actualizar token y datos del usuario
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
      
      // Opcional: notificar al usuario
      showNotification(`Cambiaste a ${data.data.user.active_organization.name}`);
      
      // Opcional: recargar datos de la página actual
      refreshCurrentPageData();

    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select
      value={user.active_organization.id}
      onChange={(e) => handleSwitch(e.target.value)}
      disabled={loading}
    >
      {user.accessible_organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name} ({org.role_in_org})
        </option>
      ))}
    </Select>
  );
};
```

### 2. Manejo de Error 404 (Organización Eliminada)

```jsx
// Cuando una organización es eliminada mientras el usuario está en sesión
const handleOrganizationNotFound = async () => {
  // 1. Mostrar mensaje al usuario
  showWarning('La organización seleccionada ya no está disponible');
  
  // 2. Refrescar la lista de organizaciones del usuario
  const updatedUser = await fetchCurrentUser();
  
  // 3. Si el usuario tiene otras organizaciones, cambiar automáticamente
  if (updatedUser.accessible_organizations.length > 0) {
    const firstAvailable = updatedUser.accessible_organizations[0];
    await switchOrganization(firstAvailable.id);
  } else {
    // Usuario sin organizaciones - mostrar estado vacío o logout
    showError('No tienes organizaciones asignadas');
  }
};
```

### 3. Actualizar Token Después del Cambio

```javascript
// Importante: Actualizar el token en todas las solicitudes posteriores
const switchOrganization = async (organizationId) => {
  const response = await api.post('/auth/switch-org', {
    organization_id: organizationId
  });
  
  if (response.ok) {
    // CRÍTICO: Guardar el nuevo token
    localStorage.setItem('accessToken', response.data.accessToken);
    
    // Actualizar el estado global del usuario
    store.dispatch(setUser(response.data.user));
    
    // Los endpoints de recursos ahora filtrarán por la nueva organización activa
  }
};
```

---

## 📊 Tabla de Códigos de Error

| Código HTTP | Código Error | Causa | Acción Frontend |
|-------------|--------------|-------|-----------------|
| 200 | - | Cambio exitoso | Actualizar token y user |
| 400 | VALIDATION_ERROR | ID inválido/vacío | Mostrar error de validación |
| 401 | UNAUTHORIZED | Token inválido/expirado | Redirigir a login |
| 403 | ORGANIZATION_ACCESS_DENIED | Sin permiso | Mostrar mensaje, no reintentar |
| 404 | ORGANIZATION_NOT_FOUND | No existe o eliminada | Refrescar lista de orgs |

---

## 🔐 Notas de Seguridad

1. **El nuevo token debe usarse inmediatamente** - El token anterior sigue siendo válido pero tiene la organización anterior como activa

2. **Validación automática en endpoints de recursos** - Después de cambiar de organización, los endpoints como Sites, Devices, Channels y Files automáticamente filtran por la nueva organización activa

3. **El 404 es intencional para seguridad** - No revela información sobre la existencia de organizaciones

4. **Jerarquía de organizaciones** - Un `org-admin` puede cambiar a organizaciones hijas/descendientes, un usuario normal solo a organizaciones donde está asignado directamente

---

## 🧪 Casos de Prueba Sugeridos

```javascript
// Test 1: Cambio exitoso
test('should switch organization successfully', async () => {
  const result = await switchOrg('ORG-validOrg-1');
  expect(result.ok).toBe(true);
  expect(result.data.accessToken).toBeDefined();
});

// Test 2: Organización inexistente (nuevo comportamiento)
test('should return 404 for non-existent organization', async () => {
  const result = await switchOrg('ORG-noexiste-1');
  expect(result.status).toBe(404);
  expect(result.error.code).toBe('ORGANIZATION_NOT_FOUND');
});

// Test 3: Organización eliminada (nuevo comportamiento)
test('should return 404 for deleted organization', async () => {
  const result = await switchOrg('ORG-eliminada-1');
  expect(result.status).toBe(404);
});

// Test 4: Sin permiso de acceso
test('should return 403 for organization without access', async () => {
  const result = await switchOrg('ORG-sinacceso-1');
  expect(result.status).toBe(403);
  expect(result.error.code).toBe('ORGANIZATION_ACCESS_DENIED');
});
```

---

## 📝 Resumen de Cambios Recientes (Diciembre 2025)

| Antes | Ahora |
|-------|-------|
| 403 para org inexistente | **404** para org inexistente |
| 403 para org eliminada | **404** para org eliminada |
| 403 para sin acceso | 403 para sin acceso (sin cambio) |

**Motivo del cambio:** Prevenir enumeración de organizaciones existentes por seguridad.

---

## 💬 Preguntas Frecuentes

**¿Debo invalidar el token anterior después de cambiar?**  
No es necesario. El token anterior sigue siendo válido pero tiene la organización anterior como contexto. Simplemente deja de usarlo.

**¿Qué pasa si el usuario intenta acceder a un recurso de otra organización después de cambiar?**  
Recibirá un error 403 (sin acceso) o 404 (no encontrado) dependiendo del recurso.

**¿La lista de `accessible_organizations` puede cambiar durante la sesión?**  
Sí. Si un administrador agrega/quita al usuario de organizaciones, la lista se actualiza en el próximo login o refresh token.

**¿Cómo sé si debo refrescar la lista de organizaciones?**  
Después de recibir un 404 en switch-org, es buena práctica refrescar los datos del usuario para obtener la lista actualizada.
