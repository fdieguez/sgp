# Registro de Avances - SGP

> **Propósito**: Este archivo registra todos los cambios, mejoras y decisiones técnicas del proyecto SGP para facilitar la continuidad entre sesiones de desarrollo.

**Versión Actual**: `0.1.0` (MVP Funcional)

---

## 📅 Enero 2026

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

- [ ] Gestión de Usuarios (UI para crear/editar/borrar usuarios).
- [ ] Exportación de datos (Excel/PDF).
- [ ] Despliegue en servidor productivo (Docker Compose).
- [ ] Roles avanzados (filtrado de filas por usuario).
- [ ] PWA para acceso móvil.

---

## 🔗 Archivos Clave para Revisar

- **Plan de Implementación**: `docs/implementation_plan.md`
- **Tareas Completadas**: `docs/task.md`
- **Reporte de Estado**: `.gemini/antigravity/brain/.../project_status_report.md`
- **Backend Core**: `code/backend/src/main/java/com/sgp/backend/service/SyncService.java`
- **Frontend Core**: `code/frontend/src/pages/ProjectDetailsPage.jsx`

---

**Última actualización**: 19/01/2026 07:42
