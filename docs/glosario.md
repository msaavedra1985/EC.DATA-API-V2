# Glosario de Términos Técnicos

Este glosario explica términos técnicos usados en la documentación de EC.DATA API en lenguaje simple y accesible.

---

## A

### API (Application Programming Interface)
**Qué es:** Una "puerta de entrada" que permite a diferentes programas comunicarse entre sí.  
**Ejemplo práctico:** Cuando una app móvil muestra datos de tu cuenta, está pidiendo esa información a través de una API.

### API Key
**Qué es:** Una contraseña especial que identifica a un programa (no a una persona) cuando se conecta a la API.  
**Ejemplo práctico:** Un sistema externo que sincroniza datos automáticamente usa una API Key en lugar de usuario y contraseña.

### Access Token
**Qué es:** Un código temporal (como un pase de visitante) que demuestra que un usuario ya se autenticó.  
**Ejemplo práctico:** Después de hacer login, el sistema te da un access token que dura 15 minutos. Mientras sea válido, no necesitás volver a ingresar tu contraseña.

### Audit Log
**Qué es:** Un registro histórico de todas las acciones importantes realizadas en el sistema.  
**Ejemplo práctico:** Si alguien borra un canal, queda registrado quién lo hizo, cuándo, y desde qué dirección IP.

---

## B

### Backend
**Qué es:** La parte del sistema que funciona "detrás de escena" en los servidores. Procesa datos, guarda información y aplica las reglas de negocio.  
**Contraste:** El frontend es lo que el usuario ve y toca (la pantalla).

### Bearer Token
**Qué es:** Un tipo de credencial que se envía en cada petición para demostrar identidad. "Bearer" significa "portador" - quien lo tiene, puede usarlo.  
**Ejemplo práctico:** En cada llamada a la API, se incluye `Authorization: Bearer <tu_token>`.

---

## C

### Cache
**Qué es:** Una memoria temporal que guarda datos frecuentemente usados para no tener que buscarlos cada vez.  
**Ejemplo práctico:** Si consultás la lista de canales 10 veces por minuto, el sistema guarda el resultado en cache y responde más rápido.

### Cascade Delete
**Qué es:** Cuando borrar un elemento automáticamente borra todos los elementos que dependen de él.  
**Ejemplo práctico:** Si borrás una carpeta que contiene 5 canales, el cascade delete elimina la carpeta Y los 5 canales juntos.

### CRUD
**Qué es:** Las 4 operaciones básicas sobre datos: Create (crear), Read (leer), Update (actualizar), Delete (borrar).  
**Ejemplo práctico:** Un módulo de gestión de sitios permite hacer CRUD: agregar sitios nuevos, verlos, modificarlos y eliminarlos.

---

## D

### DTO (Data Transfer Object)
**Qué es:** Un formato estandarizado para enviar datos entre el servidor y los clientes.  
**Ejemplo práctico:** Cuando pedís información de un canal, el servidor no te envía todo lo que sabe internamente - te envía un DTO con solo los campos relevantes.

---

## E

### Endpoint
**Qué es:** Una dirección URL específica donde la API responde a un tipo de petición.  
**Ejemplo práctico:** `/api/v1/channels` es el endpoint para obtener la lista de canales.

---

## F

### Frontend
**Qué es:** La parte del sistema que el usuario ve e interactúa directamente (pantallas, botones, formularios).  
**Contraste:** El backend es la parte invisible que procesa todo.

---

## H

### Hash / Hashing
**Qué es:** Convertir un dato (como una contraseña) en un código irreversible. Es como una trituradora de papel: podés verificar que el papel original coincide, pero no podés reconstruirlo.  
**Ejemplo práctico:** Tu contraseña "MiClave123" se guarda como "a7f3b2c9..." - nadie puede ver la original.

### Hashids
**Qué es:** Un sistema para convertir números internos (como IDs de base de datos) en códigos cortos y legibles.  
**Ejemplo práctico:** El ID interno `12345` se convierte en `CHN-5LYJX-4`, que es más fácil de compartir y no revela información interna.

---

## J

### JWT (JSON Web Token)
**Qué es:** Un formato estándar para tokens de autenticación. Contiene información del usuario codificada y firmada.  
**Ejemplo práctico:** Tu access token es un JWT que contiene tu ID de usuario, tu rol, y cuándo expira.

---

## L

### Ltree
**Qué es:** Una extensión de PostgreSQL para manejar datos jerárquicos (como árboles de carpetas).  
**Ejemplo práctico:** Permite encontrar rápidamente "todos los canales dentro de esta carpeta y sus subcarpetas".

---

## M

### M2M (Machine to Machine)
**Qué es:** Comunicación directa entre sistemas automatizados, sin intervención humana.  
**Ejemplo práctico:** Un servidor externo que consulta datos de telemetría cada hora usando una API Key es comunicación M2M.

### Middleware
**Qué es:** Código que se ejecuta "en el medio" de cada petición, antes de procesarla.  
**Ejemplo práctico:** El middleware de autenticación verifica tu token antes de dejarte acceder a cualquier endpoint protegido.

### Multi-tenant
**Qué es:** Un sistema donde múltiples clientes (organizaciones) comparten la misma infraestructura pero sus datos están completamente separados.  
**Ejemplo práctico:** Hoteles Libertador y otro cliente usan la misma API, pero cada uno solo ve sus propios datos.

---

## O

### OAuth
**Qué es:** Un estándar para autorización que permite a apps acceder a recursos sin compartir contraseñas.  
**Ejemplo práctico:** "Iniciar sesión con Google" usa OAuth.

---

## P

### Payload
**Qué es:** Los datos que se envían en una petición o respuesta.  
**Ejemplo práctico:** Cuando creás un canal, el payload es el JSON con nombre, tipo, configuración, etc.

### PostgreSQL
**Qué es:** Una base de datos relacional muy potente y confiable, usada para almacenar datos estructurados.  
**Ejemplo práctico:** Usuarios, organizaciones, canales, sitios - todo se guarda en PostgreSQL.

### Public Code
**Qué es:** Un identificador externo seguro (como `CHN-5LYJX-4`) que se usa en lugar de IDs internos para evitar exponer información sensible.  
**Ejemplo práctico:** En la URL aparece `/channels/CHN-5LYJX-4` en lugar de `/channels/12345`.

---

## R

### Rate Limiting
**Qué es:** Limitar cuántas peticiones puede hacer un usuario en un período de tiempo para proteger el sistema.  
**Ejemplo práctico:** Si intentás hacer login más de 5 veces en 15 minutos, el sistema te bloquea temporalmente.

### Redis
**Qué es:** Una base de datos ultra-rápida que guarda datos en memoria. Se usa para cache y datos temporales.  
**Ejemplo práctico:** Tu sesión activa se guarda en Redis para acceso inmediato.

### Refresh Token
**Qué es:** Un token de larga duración que permite obtener nuevos access tokens sin volver a hacer login.  
**Ejemplo práctico:** Tu access token dura 15 minutos, pero el refresh token dura 7 días. Cuando el access token expira, usás el refresh token para obtener uno nuevo automáticamente.

### REST / RESTful
**Qué es:** Un estilo de diseño de APIs que usa URLs descriptivas y métodos HTTP estándar (GET, POST, PUT, DELETE).  
**Ejemplo práctico:** `GET /channels` obtiene canales, `POST /channels` crea uno nuevo, `DELETE /channels/123` lo elimina.

### RBAC (Role-Based Access Control)
**Qué es:** Un sistema donde los permisos se asignan según el rol del usuario, no individualmente.  
**Ejemplo práctico:** Todos los "operadores" pueden ver datos pero no borrar. Todos los "admins" pueden hacer todo.

---

## S

### Scope
**Qué es:** El alcance o límite de lo que un usuario o token puede hacer.  
**Ejemplo práctico:** Una API Key puede tener scope "read:channels" (solo leer canales) sin poder modificarlos.

### SAS URL (Shared Access Signature)
**Qué es:** Una URL temporal con permisos incorporados para acceder a un archivo en la nube.  
**Ejemplo práctico:** Para descargar un archivo privado, el sistema genera una SAS URL que funciona solo por 1 hora.

---

## T

### Token
**Qué es:** Un código que representa una autorización o identidad. Como una ficha de casino que representa dinero.  
**Tipos comunes:** Access token, refresh token, API key.

### Turnstile
**Qué es:** Un sistema de Cloudflare para verificar que el usuario es humano, sin captchas molestos.  
**Ejemplo práctico:** Al hacer login, Turnstile verifica invisiblemente que no sos un bot antes de procesar tu contraseña.

### TTL (Time To Live)
**Qué es:** El tiempo que un dato permanece válido en cache antes de considerarse "viejo".  
**Ejemplo práctico:** La lista de canales tiene TTL de 5 minutos - después de eso, se vuelve a consultar a la base de datos.

---

## U

### UUID (Universally Unique Identifier)
**Qué es:** Un identificador único de 36 caracteres (ej: `550e8400-e29b-41d4-a716-446655440000`) prácticamente imposible de repetir.  
**Nota:** EC.DATA usa UUIDv7, que incluye timestamp para ordenamiento.

---

## W

### Webhook
**Qué es:** Una notificación automática que el sistema envía a otra URL cuando ocurre un evento.  
**Ejemplo práctico:** Cuando se crea un nuevo canal, el sistema puede notificar automáticamente a otro servicio.

---

## Símbolos y Códigos

### Códigos de Estado HTTP
| Código | Significado | Cuándo aparece |
|--------|-------------|----------------|
| 200 | OK | Todo salió bien |
| 201 | Created | Se creó un recurso nuevo |
| 400 | Bad Request | Datos enviados incorrectos |
| 401 | Unauthorized | No estás autenticado |
| 403 | Forbidden | No tenés permisos |
| 404 | Not Found | El recurso no existe |
| 409 | Conflict | Hay un conflicto (ej: nombre duplicado) |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Server Error | Error interno del servidor |

---

## Referencias Cruzadas

Cuando veas un término marcado con **→** en la documentación, significa que está explicado en este glosario.
