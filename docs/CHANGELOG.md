# Registro de Avances - SGP

> **Propósito**: Este archivo registra todos los cambios, mejoras y decisiones técnicas del proyecto SGP para facilitar la continuidad entre sesiones de desarrollo.

**Versión Actual**: `0.1.0` (MVP Funcional)

---

## 📅 Enero 2026

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

**Última actualización**: 08/01/2026 18:03
