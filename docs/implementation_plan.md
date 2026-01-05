# Análisis y Plan de Implementación - SGP (Sistema Gestión Proyectos)

Este documento detalla el análisis técnico y el plan de implementación para el sistema de gestión de proyectos basado en los requerimientos del archivo `detalle-de-proyecto.txt`.

## Objetivo
Construir una plataforma web unificada que centralice la información dispersa en múltiples Google Sheets, permitiendo control de acceso, normalización de datos y visualización mediante dashboards interactivos.

## Arquitectura Propuesta

Se propone una arquitectura moderna y escalable:

### 1. Frontend (Interfaz Web)
- **Tecnología**: React (Vite) + Tailwind CSS.
- **Justificación**: React ofrece la interactividad necesaria para dashboards dinámicos. Tailwind permite un diseño "premium" y rápido.
- **Componentes Clave**:
    - **Auth**: Login integrado.
    - **Dashboard**: Vista principal con KPIs.
    - **Admin Planillas**: Interfaz para agregar/quitar URLs de Google Sheets y configurar mapeos.
    - **Reportes**: Tablas dinámicas con filtros por rol.

### 2. Backend (API & Lógica)
- **Tecnología**: Java 17/21 con **Spring Boot 3**.
- **Justificación**: Elección del usuario (experiencia previa). Spring Boot ofrece un ecosistema maduro, inyección de dependencias robusta y excelente manejo de transacciones.
- **Módulos**:
    - **Spring Security**: Autenticación y manejo de roles (JWT).
    - **Spring Data JPA**: Interacción con PostgreSQL.
    - **Google API Client for Java**: Librería oficial para interactuar con Google Sheets.
    - **Scheduling**: `@Scheduled` de Spring para el motor de sincronización.
    - **Lombok**: Para reducir boilerplate code.

### 3. Base de Datos
- **Motor**: PostgreSQL.
- **Esquema Preliminar**:
    - `users` (id, email, password_hash, role)
    - `sheets_config` (id, url, frequency, last_sync)
    - `projects` (id, data_json, normalized_fields...)
    - `sync_logs` (id, status, error_message, timestamp)

## Análisis de Requerimientos y Desafíos Clave

### Integración con Google Sheets
- **Autenticación**: Se usará una **Service Account** de Google Cloud para el backend, simplificando el acceso "server-to-server" sin requerir login de cada usuario final en Google, a menos que el acceso deba ser personal.
- **Normalización**: El mayor desafío es que las planillas suelen tener formatos inconsistentes. El sistema debe permitir definir "mapas de columnas/celdas" para estandarizar la entrada.
- **Rate Limiting**: Google API tiene límites de cuota. El servicio de sincronización debe manejar "backoff" exponencial y colas de trabajo.

### Roles y Permisos
- El sistema debe abstraer los permisos de Google. Un usuario puede no tener acceso a la Sheet original, pero sí ver los datos procesados en el sistema si su rol ("Gerente", "Auditor") lo permite.

## Plan de Trabajo (Fases)

### Fase 1: Setup e Infraestructura
- Inicializar repositorio (Monorepo o separacion `frontend`/`backend`).
- Configurar Docker Compose para desarrollo local (DB + API + App).

### Fase 2: Backend Core & Google Sync
- Implementar conexión segura con Google Sheets.
- Crear modelo de datos en PostgreSQL.
- Desarrollar script de "lectura y normalización" inicial.

### Fase 3: API & Auth
- Endpoints de autenticación (Login).
- CRUD de usuarios y roles.
- Endpoints de lectura de datos para el dashboard.

### Fase 4: Frontend MVP
- Pantalla de Login.
- Dashboard con tablas de datos sincronizados.
- Visualización de estado de sincronización (Logs).

### Fase 5: Refinamiento
- Gráficos avanzados.
- Optimización de performance.
- Despliegue en VPS/Cloud.

## User Review Required
> [!IMPORTANT]
> **Stack Confirmado**: Backend Java (Spring Boot) + Frontend React.

> [!WARNING]
> **Consistencia de Datos**: Es vital analizar una planilla de ejemplo real para diseñar la estrategia de normalización en Java.

## Proposed Changes
Estructura de carpetas propuesta para `/code`:
#### [NEW] /code/backend
- Spring Boot application, entities, repository, services.
#### [NEW] /code/frontend
- React app (Vite), componentes de UI.
#### [NEW] /code/docker-compose.yml
- Orquestación de servicios locales.
