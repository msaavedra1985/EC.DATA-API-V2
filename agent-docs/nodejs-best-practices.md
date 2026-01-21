Mejores Prácticas de NodeJS
1. Estructura del Proyecto
1.1 Estructura tu solución en componentes
Resumen: Divide el código en componentes aislados con su propia carpeta. Evita el monolito con cientos de dependencias. Impacto: Facilita el mantenimiento, evita que cambios en una parte rompan componentes no relacionados y permite escalar unidades de negocio por separado.

1.2 Aplicar capas para componentes
Resumen: Cada componente debe tener capas separadas: web (Express), lógica de negocio y acceso a datos. No pases objetos req o res de Express a las capas internas. Impacto: Permite acceder a la lógica desde otros puntos (CRON jobs, colas de mensajes, pruebas unitarias) sin depender de HTTP.

1.3 Envuelve las utilidades comunes como paquetes de NPM
Resumen: Utilidades transversales (loggers, cifrado) deben ser paquetes privados internos o compartidos. Impacto: Evita duplicidad de código y la "reinvención de la rueda" en cada microservicio.

1.4 Separar 'servidor' y 'aplicación' de Express
Resumen: Separa la declaración del API (app.js) de la configuración de red y servidor (WWW). Impacto: Permite realizar pruebas del API sin realizar llamadas HTTP reales, acelerando los tests y facilitando informes de cobertura.

1.5 Configuración jerárquica y consciente del entorno
Resumen: Usa variables de entorno para secretos. Emplea librerías como config, nconf o convict para manejar jerarquías según el entorno (dev, prod). Impacto: Evita fugas de secretos en el código y facilita la labor de DevOps.

2. Manejo de Errores
2.1 Usa Async-Await o Promesas
Resumen: Evita el "callback hell". Usa async-await para una sintaxis similar a try-catch. Impacto: Código más legible y mantenible; evita errores no capturados por anidación excesiva.

2.2 Usa solo el objeto Error nativo
Resumen: Lanza siempre instancias de Error o clases que hereden de él. Evita lanzar strings o tipos personalizados planos. Impacto: Mantiene el stacktrace completo y asegura uniformidad en la captura de excepciones.

2.3 Distinguir errores operacionales vs del programador
Resumen: Los errores operacionales (entrada inválida, fallo de red) se manejan. Los errores del programador (bugs, undefined) requieren reiniciar el proceso. Impacto: Evita estados inconsistentes en la aplicación tras fallos desconocidos.

2.4 Manejar los errores centralmente
Resumen: Usa un objeto dedicado para registrar errores y notificar administradores. Centraliza el flujo desde middlewares de Express, cron jobs y tests. Impacto: Elimina duplicidad de lógica de logs y asegura que todos los errores se traten igual.

2.5 Documentar errores del API (Swagger/GraphQL)
Resumen: Especifica qué errores puede devolver cada endpoint para que el cliente sepa cómo reaccionar. Impacto: Mejora la experiencia del desarrollador (DX) y evita fallos inesperados en el cliente.

2.6 Cerrar el proceso elegantemente tras errores desconocidos
Resumen: Ante una excepción no controlada, reinicia el proceso usando un gestor como PM2 o Docker. Impacto: Previene comportamientos erráticos por objetos en estado defectuoso.

2.7 Usa un logger maduro
Resumen: Olvida console.log. Usa librerías como Pino o Winston. Impacto: Permite filtrar niveles (info, error), exportar a servicios externos y realizar búsquedas eficientes.

2.8 Captura rechazos de promesas no controladas
Resumen: Registra el evento process.unhandledRejection. Impacto: Evita que errores asíncronos pasen desapercibidos y dejen la app en un estado incierto.

2.9 Falla rápidamente y valida argumentos
Resumen: Usa librerías como ajv o Joi para validar entradas en el API. Impacto: Previene errores lógicos complejos que ocurren más adelante en el flujo por datos corruptos.

2.10 Retornar await para stacktraces completos
Resumen: Usa return await dentro de funciones async cuando devuelvas una promesa. Impacto: Permite que la función aparezca en el stacktrace si la promesa falla, facilitando el debugging.

3. Estilo de Código
3.1 Utilizar ESLint y Prettier
Resumen: Automatiza la corrección de estilo y la detección de anti-patrones. Impacto: Ahorra tiempo en revisiones de código y mantiene la base de código consistente.

3.2 Convenciones de nomenclatura
lowerCamelCase: Variables, funciones y constantes.

UpperCamelCase: Clases.

Impacto: Distinción clara entre instancias y constructores.

3.3 Const antes que Let, evita Var
Resumen: Usa const por defecto. Usa let solo si la variable será reasignada. Impacto: Reduce la mutabilidad accidental y mejora la legibilidad.

3.4 Importa módulos al inicio
Resumen: Las importaciones deben estar fuera de las funciones y al principio del archivo. Impacto: Identificación rápida de dependencias y prevención de bloqueos síncronos en tiempo de ejecución.

3.5 Operador ===
Resumen: Usa siempre igualdad estricta. Impacto: Evita conversiones de tipo inesperadas (ej. 0 == '' es true).

4. Calidad y Pruebas
4.1 Prioriza pruebas de API/Componente
Resumen: Si el tiempo es limitado, prioriza tests de integración que cubran endpoints completos. Impacto: Proporciona mayor cobertura de negocio con menos esfuerzo que tests unitarios aislados.

4.2 Estructura AAA (Arrange, Act, Assert)
Resumen: Divide cada test en tres secciones: Organizar datos, Actuar sobre la unidad y Afirmar resultados. Impacto: Mejora drásticamente la lectura y comprensión de las pruebas.

4.3 Evita datos globales en tests
Resumen: Cada test debe generar sus propios datos en la base de datos para evitar interferencias entre pruebas concurrentes.

4.4 Verificación de dependencias vulnerables
Resumen: Ejecuta npm audit o usa Snyk en el CI/CD. Impacto: Previene la inclusión de vulnerabilidades conocidas a través de paquetes de terceros.

5. Prácticas de Producción
5.1 Delegar tareas pesadas a un Proxy Inverso
Resumen: Usa Nginx o servicios de nube para Gzip, SSL y servir archivos estáticos. Impacto: Libera el hilo único de Node para procesar lógica de negocio dinámica.

5.2 Utilizar todos los núcleos de la CPU
Resumen: Usa el módulo Cluster, PM2 o replicación en Kubernetes. Impacto: Maximiza el uso del hardware; Node por defecto solo usa un núcleo.

5.3 NODE_ENV=production
Resumen: Asegúrate de que esta variable esté configurada en producción. Impacto: Muchas librerías optimizan el rendimiento (ej. cache de templates en Express) cuando detectan este valor.

5.4 Instalación limpia con npm ci
Resumen: Usa npm ci en lugar de npm install en entornos de CI/CD. Impacto: Garantiza que las versiones instaladas coincidan exactamente con el package-lock.json.

6. Seguridad
6.1 Limitar solicitudes (Rate Limiting)
Resumen: Implementa límites de velocidad para prevenir ataques de fuerza bruta o DoS usando express-rate-limit o a nivel de infraestructura.

6.2 Prevenir Inyección de Consultas
Resumen: Usa ORM/ODM (Sequelize, Mongoose, Knex) y consultas parametrizadas. Nunca concatenes strings de entrada de usuario en queries.

6.3 Ajustar encabezados HTTP con Helmet
Resumen: Usa el middleware helmet para configurar cabeceras de seguridad (XSS, Clickjacking).

6.4 No ejecutar como usuario root
Resumen: En Docker, crea un usuario sin privilegios para correr la aplicación. Impacto: Si un atacante compromete la app, no tendrá control total sobre el contenedor o el host.

6.5 Evitar RegEx maliciosos (ReDoS)
Resumen: Valida las expresiones regulares y evita aquellas que causen backtracking catastrófico. Usa safe-regex.

7. Prácticas de Docker
7.1 Compilaciones de múltiples etapas (Multi-stage)
Resumen: Usa una etapa para compilar/instalar dependencias y otra limpia para el runtime.

Dockerfile

FROM node:14 AS build
WORKDIR /app
COPY . .
RUN npm ci

FROM node:slim
WORKDIR /app
COPY --from=build /app .
USER node
CMD ["node", "server.js"]
7.2 Iniciar con node, no con npm start
Resumen: Usa CMD ["node", "app.js"]. Impacto: npm no pasa señales de terminación (SIGTERM) correctamente, lo que puede impedir cierres limpios (graceful shutdown).

7.3 Límites de memoria de V8
Resumen: Configura --max-old-space-size para que sea ligeramente menor al límite de memoria del contenedor Docker. Impacto: Evita que el recolector de basura (GC) se active demasiado tarde, causando fallos de "Out of Memory".