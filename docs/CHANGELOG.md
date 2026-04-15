# Registro de Avances - SGP

> **Propósito**: Este archivo registra todos los cambios, mejoras y decisiones técnicas del proyecto SGP para facilitar la continuidad entre sesiones de desarrollo.

**Versión Actual**: `0.3.3` (Silos de Roles y Flujo de Resolución)

---

## 📅 Abril 2026

### 15/04/2026
- **⭐️ Versión 0.4.1** (Formularios Dinámicos Nivel 2 y ABM de Configuración Central):
    - **Nuevo Hub de Configuración**:
        - Se reemplazó el antiguo acceso genérico a "Usuarios" por un módulo robusto de **"Configuración"** (`SettingsPage.jsx`).
        - Posee un diseño moderno de navegación por pestañas (Tabs): Usuarios/Responsables, Catálogo de Atributos, y Tipos de Resolución.
    - **Arquitectura de Formularios Relacionales**:
        - Retiradas las clases antiguas rígidas (`ResolutorConfig`).
        - Implementado nuevo esquema de base de datos (`TipoResolucion`, `AtributoResolucion`, `TipoResolucionAtributo`) que permite a los administradores crear plantillas de formularios de manera tipo "Lego".
        - Los administradores ahora pueden agregar campos globales al catálogo (ej. "Monto", "CBU", "DNI") y luego "prenderlos" o "apagarlos" dentro de los diferentes Tipos de Resolución, dictando además su orden de visualización y si son obligatorios (`requerido`).
    - **Frontend Modal Inteligente**:
        - `SolicitudModal.jsx` fue recodificado para soportar y parsear las asignaciones dinámicas. Si un Responsable selecciona derivar al Tipo "Subsidio", el frontend lee la configuración y renderiza automáticamente en pantalla inputs nativos de HTML adaptados al `tipo_dato` que fijó el Admin.
    - **Despliegue y Scripts Locales**:
        - Revisión cruzada de borrados lógicos para toda la historia estadística (`activo: boolean`).
        - Validado y preparado el script de despliegue a producción `setup_mysql_prod.sh` (Configuración de MySQL silenciosa local, purga de anonimatos, bind-address y habilitación de Túnel Seguro SSH).
        - Implementación nativa de un Selector de Tema (Modo Claro/Oscuro dinámicos y estilizados con sombras refinadas) integrado de raíz en el `Navbar`.

### 10/04/2026
- **⭐️ Versión 0.4.0** (Asignaciones Múltiples de Resolutores):
    - **Estructura Dinámica**:
        - Ahora una misma solicitud puede derivarse simultáneamente a múltiples áreas/resolutores integrando la información.
        - Creada entidad `SolicitudResolutorAssignment` para alojar asignaciones iterativas y persistidas como detalles (`OneToMany`).
    - **Filtrado Avanzado JPA**:
        - `SolicitudService` y `DashboardService` refactorizados usando `Subquery` para roles `RESOLUTOR`, garantizando que puedan visualizar correctamente todo su backlog global cruzando ambas tablas.
    - **Frontend UI Mejorado**:
        - Nueva área visual en `SolicitudModal.jsx` para instanciar asignaciones dinámicas.

### 06/04/2026
- **⭐️ Versión 0.3.3** (Refinamiento Extremo de Roles y Flujo de Resolución):
    - **Reestructuración de Privilegios**:
        - **OPERADOR**: Ahora confinado estrictamente a su silo operativo. Solo visualiza y edita solicitudes en donde su propia firma matriz (`createdBy`) conste. La Interfaz web desestima (oculta) automáticamente la caja de "Sugerir Resolutor".
        - **DISTRIBUIDOR**: Habilitado como el hub receptor universal. Ve todas las solicitudes (creadas por cualquier Operador) con la principal utilidad de asignarles un Responsable final.
    - **Independencia Responsable / Resolutor**:
        - Modificado el enrutador en el backend. Derivar a un `Resolutor` ya no sobrescribe ni expulsa al `Responsable` de su titularidad en la Solicitud. Permite derivación múltiple manteniendo la atadura de control original (`resolutor_asignado_id` vs `responsable_id`).
    - **Checkbox de Emisión Resolutiva**:
        - Añadido mecanismo front-end visualizado como un "Checkbox Verde de Aprobación", estrictamente condicionado para usuarios con Rol RESOLUTOR. Marca orgánicamente hitos de validación (`resolutionApproved: true`).
    - **Manejo de Restricciones BD e Inyección Base (Fix)**:
        - Rectificada la ingeniería del `DataInitializer.java`. Subsanada una potencial cascada de bloqueos `ConstraintViolationException` purgando primero historiales referenciados antes de resetear las tablas padres de Responsables.
        - Sembrada la base de datos con solo dos Responsables duros para pruebas cliente: `jperez@sgp.com` (Juan Perez) y `pgrillo@sgp.com` (Pepe Grillo).

## 📅 Marzo 2026

### 20/03/2026
- **⭐️ Versión 0.3.2** (Gestión Geográfica & Mejoras de Estabilidad):
    - **Dataset de Localidades Automático**:
        - Integración de padrón completo de localidades y barrios de Santa Fe (`santa_fe_locations_dataset.txt`).
        - Programado el `DataInitializer.java` para poblar automáticamente la base de datos de producción con miles de registros (Provincias, Ciudades, Barrios) en el primer inicio del sistema, respetando relaciones jerárquicas.
    - **Mejora Interfaz de Ubicaciones (React)**:
        - Reemplazados los campos de texto libre de `Localidad` y `Barrio` en `SolicitudModal` por selectores predictivos nativos (`<datalist>`).
        - Añadida lógica en cascada: el listado de Barrios disponibles se filtra instantáneamente y con exclusividad según la Ciudad previamente seleccionada.
        - Apagado el historial invasivo del navegador web en campos clave usando `autoComplete="off"` y saneada la búsqueda aplicando `.trim().toLowerCase()`.
        - Actualizada la tarjeta de detalles (`SolicitudDetailModal`) para que combine inteligentemente "Nombre De Ciudad - B° Nombre Del Barrio" si detecta un entorno de vecindario.
    - **Gestión Automática de Zona**:
        - Implementado el autocompletado en cascada en la asignación de reclamos. Al seleccionar a un usuario "Responsable", su "Eje/Zona" se inyecta y se bloquea directamente en el formulario en modo sólo-lectura (`readonly`, `cursor-not-allowed`).
    - **Fixes Críticos del Backend**:
        - **JPA Error**: Solucionado el error `NonUniqueResultException` o `IncorrectResultSizeDataAccessException` que colapsaba la app al crear solicitudes. Refactorizado el `LocationRepository` (añadiendo métodos como `findFirstByNameAndType`) para saber discernir correctamente entre un departamento y una ciudad que comparten idéntico nombre (ej. "Santa Fe").
        - **Jackson Parsing**: Modificada la entidad `Location.java` cambiando sus decoradores por `@JsonIgnoreProperties("children")` y anulando el `@JsonBackReference` previo. Esto reparó el problema oculto que impedía que la base de datos retransmitiera la "Ciudad Padre" asociada a un "Barrio" hacia el cliente web, solucionando las vistas en las tablas y ediciones.
    - **Desarrollo y Ops Locales**:
        - Creados scripts en lote (batch files) seguros (`compilar_y_ejecutar.bat`, `iniciar_frontend.bat`) para habilitar entornos de prueba limpiamente evadiendo posibles políticas de restricción de PowerShell de Windows.
        - Arreglado bug en compilación de Producción de Vite purgado un archivo sin trackear (`Navbar.jsx`).

> **📝 NOTA PARA PROXIMA SESIÓN / NUEVO CHAT**:
> Frontend y Backend acaban de alcanzar un hito de estabilidad crítico en la geolocalización de las solicitudes. La versión está productiva. Se testeó toda la pipeline y el dataset (`santa_fe_locations_dataset.txt`) se carga dinámicamente.
> **Punto de Partida**: Evaluar las nuevas necesidades del sistema y testear la subida definitiva al VPS si fuera el caso de buscar publicar la app real.

### 09/03/2026
- **⭐️ Versión 0.3.1** (UI/UX & Accesibilidad):
    - **Mejoras Visuales & Filtros**:
        - Convertidas las tarjetas estadísticas (Pendientes, En Proceso, etc.) del Dashboard en botones interactivos que filtran directamente la tabla de solicitudes al hacerles clic.
        - Agregada etiqueta de Versión Global flotante (`v0.3.1`) persistente en todas las pantallas.
        - Solucionado el desborde visual (overflow) de texto en el modal de detalles (`SolicitudDetailModal`) cuando se introducían enlaces o textos muy largos sin espacios.
    - **Accesibilidad (Modo Daltónico)**:
        - Implementado `ThemeContext` global en React.
        - Creado un **Modo Daltónico** (Protanopía/Deuteranopía) que, al activarse, sobrescribe las variables CSS reemplazando los colores conflictivos (Verde de "Completado" por Azul, y Rojo de "Rechazado" por Naranja).
        - Añadido un interruptor en `ProjectSettingsPage` (Preferencias Visuales) para activar/desactivar el modo, el cual se persiste en el `localStorage` del navegador.

### 06/03/2026
- **⭐️ Versión 0.3.0**:
    - **Dashboard de Responsables**:
        - Implementado dashboard específico para usuarios Responsables (`/mis-solicitudes`).
        - **FIX CRÍTICO**: Solucionado el error de pantalla en blanco (React `ReferenceError` por componentes faltantes).
        - **FIX DE PERMISOS**: Controlado el acceso a `/api/config` en el frontend (`ProjectDetailsPage` y `DashboardPage`) para evitar errores `403 Forbidden` que colapsaban la app al ingresar usuarios sin rol `ADMIN`.
        - Agregados indicadores estadísticos superiores: Pendientes, En Proceso, Completados, Rechazados, y Total Subsidios Entregados (en $ ARS).
        - Nuevo buscador general por ID (Nº Orden), Nombre, DNI o Localidad.
        - **UI/UX y Filtrado**:
            - Traducción completa de estados y secciones al español (Pendiente, Completado, Panel, etc).
            - El Panel Principal (`DashboardPage`) ahora filtra sus estadísticas globales matemáticamente mediante JPA Specifications considerando únicamente la zona/perfil del Responsable logueado.
            - Eliminado el buscador duplicado en la vista de solicitudes para limpiar la interfaz.
            - Se muestra el nombre y rol del usuario logueado en la barra superior del Dashboard.
            - Ocultado filtro condicional "Por Responsable" en los gráficos para usuarios Responsables.
    - **Filtros Avanzados y Ordenamiento**:
        - Implementado selector de Rango de Fecha (Último mes, 6 meses, 1 año, 2 años, Personalizado).
        - Ordenamiento funcional en las columnas de tabla: Fecha Ingreso, Origen, Nombre/Institución, Localidad y Estado.
    - **Fixes de Fechas y Zona Horaria**:
        - Implementado método robusto `parseLocalDate` en el frontend para evitar el desfasaje de fechas (off-by-one) por la zona horaria UTC.
    - **Backend & Edición de Solicitudes**:
        - **FIX JPA**: Deshabilitada la edición del campo "Tipo" en el frontend para solicitudes existentes, previniendo errores de actualización polimórfica (Hibernate/JPA).
        - **FIX Backend**: Actualizado `SolicitudService` con método `PUT` para actualización completa, solucionando la validación y el reseteo de propiedades específicas de la clase subyacente (`Subsidio`), como monto y fechas.
        - **Seguridad**: `DataInitializer` asegura roles `USER` persistentes para usuarios de prueba.

> **📝 NOTA PARA PROXIMA SESIÓN / NUEVO CHAT**:
> El dashboard visual y el backend del Responsable están estables. La pantalla en blanco fue completamente subsanada (era un fallo en el fetching de configuraciones sin rol ADMIN, combinado con un componente no renderizado).
> **Siguiente Paso**: Pruebas funcionales del endpoint de listado de responsables, e inicio de mejoras o despliegue en caso de considerarlo completamente validado.

---

## 📅 Febrero 2026

### 06/02/2026
- **⭐️ Versión 0.2.0**:
    - Inicio de ciclo de estabilización y mejoras.
    - **FIX**: Corrección en edición de Solicitudes (error de mapeo de Responsable).
    - **UI**: Visualización de versión en el sistema.
    - **Mejora**: Campos completos en creación y detalle de solicitudes.
- **🛠️ Refactorización y Ampliación del Modelo de Datos**:
    - **Reestructuración de Entidades**:
        - Se implementó `Solicitud` como clase abstracta padre de `Pedido` y `Subsidio` con herencia `JOINED`.
        - Se añadieron nuevos campos a `Solicitud` para cumplir con nuevos requerimientos de seguimiento detallado:
            - `zone` (Zona/Eje), `contactDate`, `resolutionDate`, `observation` (TEXT), `firstContactControl` (Boolean).
            - `resolution` (Resultados breves) y `detail` (Detalle extendido), ambos TEXT.
        - **Fix en Entidad `Location`**:
            - Solucionada recursión infinita (`StackOverflowError`) en serialización JSON usando `@JsonManagedReference` y `@JsonBackReference` en la relación bidireccional padre-hijos.
    - **Frontend - Planilla (`ProjectDetailsPage`)**:
        - Reconstrucción total de la tabla para reflejar la estructura de 18 columnas solicitada por el usuario.
        - Nuevas columnas visibles: N° Orden, Fecha Ingreso, Mes (calculado), Origen, Nombre/Institución, Localidad/Barrio (con lógica de jerarquía), Teléfono, Solicitud (Descripción), ZONA/EJE, RESPONSABLE, Fechas (Contacto/Resolución), Resolución, Detalle, Observación, Monto, Control 1er C.
        - Mejoras visuales: Checkmarks para booleanos, manejo de textos largos con `title` tooltip, y formateo de monedas.
    - **Frontend - ABM (`SolicitudModal` y `SolicitudDetailModal`)**:
        - Formularios de creación y edición actualizados para permitir la carga y modificación de todos los nuevos campos.
        - Vista de detalle rediseñada con secciones organizadas: "Tiempos y Seguimiento", "Observaciones", "Gestión", etc.
    - **Validación**:
        - Backend compilado exitosamente y listo para producción.
        - Código sincronizado con repositorio remoto.
    - **Backend - Sincronización (`SyncService`)**:
        - Actualizado método `processRows` para mapear las nuevas columnas del Excel/Sheet:
            - `zone` (Col J / Index 9)
            - `contactDate` (Col M / Index 12)
            - `resolutionDate` (Col N / Index 13)
            - `resolution` (Col O / Index 14)
            - `detail` (Col P / Index 15)
            - `observation` (Col Q / Index 16)
            - `firstContactControl` (Col S / Index 18 - Parsing de "SI"/"YES"/"OK")
        - Lógica de parseo mejorada para fechas y booleanos.

> **📝 NOTA PARA PROXIMA SESIÓN / NUEVO CHAT**:
> El sistema se encuentra en un estado estable tras una refactorización mayor.
> 1. **Acción Requerida**: Es necesario BORRAR la base de datos local (archivos H2 en `./data`) y/o remota (Postgres) para que Hibernate recree el esquema con las nuevas tablas (`solicitud`, `pedido`, `subsidio`).
> 2. **Siguiente Paso**: Realizar una sincronización limpia desde el Dashboard para popular la nueva estructura.
> 3. **Objetivo**: Proceder al despliegue en VPS (Docker) para validación final.

## 📅 Enero 2026

### 28/01/2026
- **🐛 Fixes de Producción y UI**:
    - **🗂️ Database Migration**: Forzado reseteo de base de datos (`docker-compose down -v`) para aplicar cambios de esquema (nuevos campos de usuario).
    - **🔐 Roles y Permisos**:
        - Ocultado botón de "Eliminar Planilla" en el Dashboard para usuarios no administradores.
        - Verificado flujo de login con usuarios actualizados.
    - **📱 Datos & Sincronización**:
        - Aumentado límite de caracteres para el campo **Teléfono** de 50 a **200 caracteres** en `SyncService`, evitando truncamiento de datos múltiples.
        - Ajustado truncamiento defensivo para evitar errores SQL.

### 24/01/2026
- **👥 Gestión de Usuarios Mejorada**:
    - **Nuevos Campos**: Agregados `firstName`, `lastName` y `birthDate` a la entidad `User`.
    - **Seed Users**: Actualizado `DataInitializer` para crear automáticamente:
        - Admins: `francisco@sgp.com`, `juanmanuel@sgp.com`
        - Users: `user1@sgp.com`, `user2@sgp.com`
    - **Registro**: Endpoint de registro actualizado para aceptar los nuevos campos.
- **🎨 UI/UX Improvements**:
    - **Tooltips Inteligentes**: Mejorada la lógica de posicionamiento de popovers en tablas. Ahora las primeras 5 filas abren hacia abajo para evitar cortes con el header.

### 22/01/2026
- **🔒 Seguridad SSL en Proceso**:
    - ✅ Certificado Let's Encrypt generado exitosamente en VPS.
    - Próximo paso: Despliegue de Nginx y Docker con configuración HTTPS.

### 21/01/2026
- **🚀 Deployment Exitoso en Producción**:
    - Desplegado sistema en `http://solicitudes.ultrasoft.website`.
    - Configurado Nginx como Reverse Proxy para manejar rutas `/api` y eliminar problemas de CORS.
    - Ajustada configuración de `VITE_API_URL` para usar rutas relativas en producción.
    - Verificado login y navegación al Dashboard en entorno productivo.
    - Intentado configurar conexión SSH Tunnel para DB (pendiente revisión de acceso por bloqueo de IP).
    - **👮 Seguridad**:
        - Cambiada contraseña por defecto (admin) a una credencial robusta.
    - **🛠️ Backend Optimization**:
        - Reducida drásticamente la verbosidad de los logs para operaciones masivas (solo se loguean errores durante la sincronización).
    - **🗑️ Feature**:
        - Agregada opción para eliminar planillas desde el dashboard.

### 19/01/2026
- **✅ Commit y Preparación para Deployment**:
    - Subido código con todos los fixes de mapeo y validaciones al repositorio GitHub.
    - Commit: `2008440` - "fix: correct Google Sheets column mapping and increase Person.name limit to 1000 chars"
    - **Cambios incluidos**: 16 archivos modificados, 539 inserciones, 62 eliminaciones.
    - **Estado actual**: Código listo para deployment en producción.
- **🌐 Configuración DNS Completada**:
    - **Dominio elegido**: `solicitudes.ultrasoft.website`
    - Configurado registro DNS tipo A: `solicitudes` → `149.50.128.168`
    - DNS propagado exitosamente (verificado con nslookup)
    - Actualizado `.env.example` con la nueva URL: `http://solicitudes.ultrasoft.website/api`
    - Creada guía completa de deployment: `docs/DEPLOYMENT_GUIDE.md`
    - **Próxima fase**: Deployment en servidor VPS de DonWeb.
- **🔧 Infraestructura: Nginx Reverse Proxy**:
    - Implementado Reverse Proxy en Nginx (`nginx.conf`) para redirigir `/api` al backend.
    - Soluciona problemas de CORS permitiendo que el frontend haga peticiones al mismo dominio (`/api`).
    - Actualizado `.env.example` para usar URL relativa `VITE_API_URL=/api`.

### 17/01/2026
- **🔥 FIX: DataIntegrityViolationException por valores largos**:
    - Identificado error: Campo `name` en `Person` limitado a 255 chars, pero algunos nombres de instituciones tienen 298+ chars.
    - **Solución**:
        - Aumentado límite de `Person.name` de 255 a **1000 caracteres** para soportar descripciones largas de instituciones.
        - Agregado método `truncateString()` en `SyncService` para truncar defensivamente valores que excedan límites de BD.
        - Truncado automático: name (1000), phone (50), address (500).
    - Mejorado logging en `SyncService`:
        - `log.error()` ahora muestra **stack trace completo** en lugar de solo `getMessage()`.
        - Agregado `EntityManager.clear()` después de cada error para limpiar sesión de Hibernate y prevenir errores en cascada.
        - Logs detallados en todos los métodos helper (findOrCreateCity, findOrCreatePerson, etc.) para debugging.

### 16/01/2026
- **🔥 FIX CRÍTICO: Mapeo de Columnas en Sincronización**:
    - Identificado y corregido error grave en `SyncService.java`: el mapeo hardcodeado asumía estructura incorrecta de columnas.
    - **Problema**: Columna 0 se asumía como "Date" y columna 1 como "Person Name", pero en realidad:
        - Col 0: N° Orden
        - Col 1: Fecha de Ingreso
        - Col 4: Nombre / Institución
    - **Resultado**: Los datos se guardaban incorrectamente (fechas en el campo `name` de Person).
    - **Solución**: Reescrito método `processRows()` para mapear correctamente las 18+ columnas del sheet "SEGUIMIENTO":
        - Person: name (Col E), phone (Col H), address/barrio (Col G)
        - Location: localidad (Col F), barrio (Col G) - con jerarquía CITY → NEIGHBORHOOD
        - Order: entryDate (Col B), origin (Col D), description/solicitud (Col I), status/resolución (Col O)
    - Mejorado `parseDate()` con soporte real para formatos DD/MM/YYYY e ISO.
    - Agregado `LocationRepository` como dependencia en `SyncService`.
    - Los datos ahora se crean correctamente con todas las relaciones (Person → Location, Order → Person, Order → Location).

### 15/01/2026
- **Backend Logging & Debugging**:
    - Agregado logging detallado (SLF4J) en `SyncService.java` para trazar el proceso de sincronización.
- **Frontend Routing Fix**:
    - Corregida ruta `/projects/config/:configId` en `App.jsx` para coincidir con la navegación del Dashboard, solucionando la pantalla en blanco al ver detalles.
- **Persistencia de Sesión y Roles**:
    - Actualizado `AuthController` y `AuthResponse` para devolver el rol del usuario.
    - Actualizado `AuthContext` para persistir el usuario y rol en `localStorage`, resolviendo el error de "Acceso Denegado" al refrescar.
- **Acceso H2 & Documentación**:
    - Configurado `SecurityConfig` para permitir acceso público a `/h2-console` y deshabilitar frame options.
    - Actualizado `walkthrough.md` con guías paso a paso para conectar DB Local (H2 Web Console) y Remota (HeidiSQL + SSH Tunnel).

### 09/01/2026 (En Progreso)
- **Deployment en DonWeb VPS**: 
  - Backend/DB funcionando OK.
  - Frontend despliega pero falla al conectar con API (sigue apuntando a localhost).
  - **Problema Detectado**: `VITE_API_URL` no se inyecta correctamente en el build de Docker.
  - **Fixes Intentados**: 
    - Agregar `ARG VITE_API_URL` al Dockerfile (commit `1671c46`).
    - Configurar `args` en `docker-compose.yml`.
  - **Próximo Paso**: Verificar si hardcodear la URL en `docker-compose.yml` (`args`) o usar `environment` (aunque Vite requiere build-time env vars) soluciona el problema de reconstrucción.

### 08/01/2026
- **Configuración de Deployment Productivo** 🚀:
  - Creados `Dockerfile` para backend y frontend (multi-stage builds).
  - Creado `docker-compose.yml` con PostgreSQL + Backend + Frontend.
  - Agregado soporte para PostgreSQL en `pom.xml`.
  - Creada configuración de producción (`application-prod.properties`).
  - Creado archivo `.env.example` con variables de entorno.
  - Documentación completa en `docs/DEPLOYMENT.md`.
- **Gestión de Usuarios (CRUD Completo)**:
  - Backend: Creado `UserService.java` y `UserController.java` con endpoints protegidos (solo ADMIN).
  - Frontend: Creada página `UsersPage.jsx` con tabla, modal de creación/edición y eliminación.
  - Agregado botón "Usuarios" en el navbar del Dashboard.
  - Endpoints: GET /api/users, POST /api/users, PUT /api/users/{id}, DELETE /api/users/{id}.
- **Versionado**: Implementado SemVer. Versión actual: `0.1.0` (MVP Funcional).
- **Rows Per Page**: Agregada opción "10" al selector de filas por página (ahora: 10, 20, 50, 100).

### 07/01/2026
- **Popover Fix**: Corregido el problema de popovers cortados en las primeras filas.
  - Implementada lógica de posicionamiento dinámico (arriba/abajo según fila).
  - Agregado scroll interno para textos muy largos (`max-h-80 overflow-y-auto`).

### 06/01/2026
- **Localización**: Cambiado nombre de proyectos de "Project from..." a "Proyectos de..." en español.
- **Header Detection (CRÍTICO)**:
  - Implementado algoritmo "Row Hunting" que escanea las primeras 10 filas y selecciona la que tiene más datos como header.
  - Sanitización automática: columnas sin nombre se renombran a "Campo X".
  - Archivo modificado: `SyncService.java` (líneas 41-83).
- **Reporte de Estado**: Creado `project_status_report.md` para presentación ejecutiva.
- **Google Sheets API**: Confirmado que es GRATIS (0 costo), solo tiene límites de cuota (300 req/min).

### 31/12/2025
- **Filtros Avanzados**: Implementado panel de filtros multi-columna con soporte para fechas (filtrado por año).
- **Sync Loading Feedback**: Agregado cursor "wait" y ícono animado durante sincronización.

### 26/12/2025
- **Visualización de Datos**: Implementados gráficos dinámicos (BarChart) con auto-detección de columnas categóricas.
- **Cell Truncation**: Implementado componente `TruncatedCell` con popover hover para textos largos.
- **Date Sorting**: Corregido ordenamiento de fechas (soporte DD/MM/YYYY e ISO).

### 24/12/2025
- **Dashboard UI**: Refinada interfaz del Dashboard con diseño premium (gradientes, glassmorphism).
- **Project Details View**: Implementada vista detallada con búsqueda, paginación y ordenamiento.

### 22/12/2025
- **Persistencia Local**: Configurada base de datos H2 en modo archivo (`jdbc:h2:file:./data/sgp_db`).
- **Seguridad**: Implementado JWT authentication con Spring Security.
- **Google Sheets Integration**: Configurada Service Account y sincronización automática.

---

## 🏗️ Arquitectura Actual

### Backend (Java Spring Boot 3.2.1)
- **Base de Datos**: H2 (file-based) para desarrollo local.
- **Autenticación**: JWT con roles (ADMIN, USER).
- **Sincronización**: `SyncService.java` con header detection inteligente.
- **API Key**: Google Service Account (`credentials.json`).

### Frontend (React + Vite + Tailwind)
- **Componentes Clave**:
  - `DashboardPage.jsx`: Lista de proyectos con botón de sincronización.
  - `ProjectDetailsPage.jsx`: Vista detallada con tabla, filtros, gráficos y búsqueda.
  - `CreateConfigModal.jsx`: Modal para agregar nuevas planillas.
- **Estado**: Context API para autenticación (`AuthContext.jsx`).

---

## 🐛 Problemas Conocidos Resueltos

1. **H2 Database Lock**: Resuelto matando procesos zombie con `taskkill /PID <pid> /F`.
2. **Headers Incorrectos**: Resuelto con algoritmo de "Row Hunting" + sanitización.
3. **Popover Clipping**: Resuelto con posicionamiento dinámico y scroll interno.
4. **Date Sorting**: Resuelto con detección de tipo y parsing correcto.

---

## 📝 Próximos Pasos Sugeridos

- [x] Refactorización de Entidades (Solicitud/Pedido/Subsidio).
- [ ] **DESPLIEGUE EN PRODUCCIÓN (Prioridad Alta)**.
- [ ] Validación de la nueva estructura de datos en entorno real.
- [ ] Exportación de datos (Excel/PDF).
- [ ] Gestión de Usuarios (UI).

---

## 🔗 Archivos Clave para Revisar

- **Plan de Implementación**: `docs/implementation_plan.md`
- **Tareas Completadas**: `docs/task.md`
- **Reporte de Estado**: `.gemini/antigravity/brain/.../project_status_report.md`
- **Backend Core**: `code/backend/src/main/java/com/sgp/backend/service/SyncService.java`
- **Frontend Core**: `code/frontend/src/pages/ProjectDetailsPage.jsx`

---

**Última actualización**: 07/04/2026 07:25
