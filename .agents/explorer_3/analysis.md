# Informe de Exploración del Proyecto SGP

**Fecha:** 2026-07-31  
**Agente:** explorer_3  
**Ubicación del repositorio:** `c:\Users\fran\dev\projects\SGP`  
**Directorio de trabajo del agente:** `c:\Users\fran\dev\projects\SGP\.agents\explorer_3`

---

## 1. Resumen Ejecutivo

El proyecto **SGP (Sistema de Gestión de Proyectos / Solicitudes)** es una aplicación web desacoplada en arquitectura Backend-Frontend:
- **Backend:** Desarrollado en Java 17 con Spring Boot 3.2.1, Spring Data JPA, Spring Security (JWT) y soporte multibase (H2 en desarrollo local, MySQL en producción).
- **Frontend:** Desarrollado con React 19, Vite 7, Tailwind CSS y Axios para la comunicación con la API REST del backend.
- **Suite de Pruebas:**
  - Backend: Pruebas de integración y flujo de trabajo con JUnit 5, Spring Boot Test y base de datos H2 en memoria (`SolicitudWorkflowTest.java`, `VerifyLocationsTest.java`).
  - Frontend: Pruebas E2E y funcionales con Playwright (`@playwright/test`) en la carpeta `code/frontend/tests`.

---

## 2. Estructura General del Proyecto

La raíz del repositorio se ubica en `c:\Users\fran\dev\projects\SGP`. La estructura principal de carpetas es la siguiente:

```
c:\Users\fran\dev\projects\SGP\
├── .agents/                 # Metadatos, planes y reportes de agentes de IA
├── code/                    # Código fuente del proyecto
│   ├── backend/             # Proyecto Spring Boot (Maven)
│   ├── frontend/            # Proyecto React + Vite (npm)
│   ├── .env.example         # Variables de entorno de ejemplo
│   ├── docker-compose.yml   # Configuración de contenedores
│   ├── start-local.ps1      # Script PowerShell para iniciar ambos servicios en Windows
│   ├── start-local.bat      # Script Batch alternativo para iniciar entorno local
│   ├── start-frontend.bat   # Script auxiliar para lanzar el frontend
│   └── compilar_ejecutar_backend.bat # Script de compilación JAR de backend
├── devops/                  # Scripts de infraestructura y despliegue
├── docs/                    # Documentación técnica, CHANGELOG y guías de despliegue
├── pruebas/                 # Archivos de prueba y especificaciones funcionales manuales
└── scripts/                 # Scripts de inicialización de base de datos
```

---

## 3. Prerrequisitos del Entorno en Windows

De acuerdo a la configuración detectada en los scripts locales (`code/start-local.ps1`):

- **Java Development Kit (JDK):** Java 17 64-Bit (ej. `C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot\bin`)
- **Apache Maven:** Maven 3.x (ej. `C:\Users\fran\dev\maven\bin`)
- **Node.js & npm:** Node.js 18+ / 20+ (ej. `C:\Program Files\nodejs`)

Para asegurar la ejecución de comandos en PowerShell en Windows, se debe anteponer la configuración de la variable `PATH`:
```powershell
$javaPath = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot\bin"
$mavenPath = "C:\Users\fran\dev\maven\bin"
$nodePath = "C:\Program Files\nodejs"
$env:Path = "$javaPath;$mavenPath;$nodePath;" + $env:Path
```

---

## 4. Análisis del Backend (`code/backend`)

### 4.1 Archivo `pom.xml`
- **Group ID / Artifact ID:** `com.sgp:backend:0.1.0`
- **Java Version:** 17
- **Framework Principal:** Spring Boot `3.2.1`
- **Dependencias Clave:**
  - `spring-boot-starter-web` (API REST)
  - `spring-boot-starter-data-jpa` (Persistencia Hibernate/JPA)
  - `spring-boot-starter-security` & `jjwt-api` (Autenticación y Autorización JWT)
  - `h2` (Base de datos en memoria/archivo para desarrollo/tests)
  - `mysql-connector-j` (Conector para MySQL en producción)
  - `lombok` (Generación de código boiler-plate)
  - `google-api-services-sheets` & `google-api-services-calendar` (Integración con Google Services)
  - `spring-boot-starter-mail` (Notificaciones vía correo SMTP)
  - `spring-boot-starter-test` (JUnit 5, AssertJ, Mockito, Spring Test)

### 4.2 Perfiles de Configuración
- `application.properties`: Configura el nombre del sistema (`sgp-backend`), puerto `8080` y perfil activo predeterminado (`spring.profiles.active=dev`).
- `application-dev.properties`: Utiliza H2 (`jdbc:h2:file:./data/sgp_db`), consola H2 en `/h2-console`, `hibernate.ddl-auto=update` y servidor SMTP simulado en `localhost:3025`.
- `application-prod.properties`: Utiliza conexión MySQL a base de datos de producción (`jdbc:mysql://localhost:3306/sgp_db`).

---

## 5. Análisis del Frontend (`code/frontend`)

### 5.1 Archivo `package.json`
- **Nombre / Versión:** `frontend:0.2.0` (tipo `module`)
- **Dependencies:** `react` (19.2.0), `react-dom`, `react-router-dom` (7.11.0), `axios`, `lucide-react`, `react-hot-toast`, `recharts`.
- **devDependencies:** `vite` (7.2.4), `@vitejs/plugin-react-swc`, `tailwindcss` (3.4.17), `eslint` (9.39.1), `@playwright/test` (1.59.1).
- **Scripts:**
  - `npm run dev`: Inicia el servidor de desarrollo de Vite (por defecto en `http://localhost:5173`).
  - `npm run build`: Compila el bundle optimizado para producción en la carpeta `dist/`.
  - `npm run lint`: Ejecuta el linter ESLint sobre el proyecto.

### 5.2 Configuración de Pruebas E2E (`playwright.config.js`)
- **Directorio de Pruebas:** `./tests`
- **URL Base:** `http://localhost:5173` (configurable vía variable de entorno `BASE_URL`).
- **Navegador Predeterminado:** Chromium (Desktop Chrome).
- **Reporter:** Generador de reportes HTML.

---

## 6. Suite de Pruebas y Comandos Exactos

### 6.1 Comandos para Backend (Java / Maven)
Ubicación de trabajo: `code/backend`

1. **Ejecutar todos los tests unitarios y de integración del backend:**
   ```powershell
   cd code/backend
   mvn test
   ```
2. **Ejecutar un test específico (ejemplo: `SolicitudWorkflowTest`):**
   ```powershell
   cd code/backend
   mvn test -Dtest=SolicitudWorkflowTest
   ```
3. **Compilar y empaquetar omitiendo tests (para despliegue rápido):**
   ```powershell
   cd code/backend
   mvn clean package -DskipTests
   ```
4. **Ejecutar el servidor local de desarrollo:**
   ```powershell
   cd code/backend
   mvn spring-boot:run
   ```

### 6.2 Comandos para Frontend (React / Vite / Playwright)
Ubicación de trabajo: `code/frontend`

1. **Instalar dependencias:**
   ```powershell
   cd code/frontend
   npm install
   ```
2. **Ejecutar servidor de desarrollo local:**
   ```powershell
   cd code/frontend
   npm run dev
   ```
3. **Compilar para producción:**
   ```powershell
   cd code/frontend
   npm run build
   ```
4. **Ejecutar la suite completa de pruebas E2E con Playwright:**
   ```powershell
   cd code/frontend
   npx playwright test
   ```
5. **Ejecutar una prueba específica de Playwright:**
   ```powershell
   cd code/frontend
   npx playwright test tests/flujo_principal.spec.js
   ```
6. **Abrir interfaz gráfica interactiva de Playwright:**
   ```powershell
   cd code/frontend
   npx playwright test --ui
   ```

---

## 7. Análisis de `SolicitudService` y `SolicitudModal`

### 7.1 Backend: `SolicitudService.java`
Ubicación: `code/backend/src/main/java/com/sgp/backend/service/SolicitudService.java`

- **Responsabilidades Clave:**
  1. **Creación (`createSolicitud`):** Asocia la persona/beneficiario (buscando por nombre o creando una nueva `Person`), procesa la ubicación (`Location` en jerarquía Ciudad -> Barrio), establece valores predeterminados (estado `"pendiente"`, fecha de ingreso), guarda el creador (`createdBy`) según el contexto de seguridad y registra el evento en `AsignacionHistorial`.
  2. **Edición y Actualización (`updateSolicitud`):** Utiliza un DTO plano (`SolicitudUpdateDTO`) para evitar problemas de deserialización polimórfica en Jackson. Actualiza beneficiario, datos de ubicación (campos planos `locationName` y `barrio`), tipo sugerido de resolución, monto/fecha de entrega de subsidios y asignación de responsable por ID (`responsableId`). Si `responsableId == 0`, desasigna explícitamente el responsable. Recalcula de forma automática el estado (`updateSolicitudStatus`) y registra cambios en `AsignacionHistorial`.
  3. **Aprobación por Resolutor (`aprobarAsignacion`):** Marca la asignación específica del resolutor como aprobada (`approved = true`), registra observaciones, valida que la asistencia sea obligatoria si la solicitud es de tipo `AGENDA`, registra la auditoría y gatilla integraciones asíncronas externas (creación de evento en Google Calendar o envío de correo electrónico para subsidios).
  4. **Filtrado y Seguridad (`buildSpecification`):** Implementa especificaciones de Spring Data JPA con filtrado dinámico (estado, texto libre, responsable, ubicación, rango de fechas, origen) y filtrado de acceso según el rol del usuario (ADMIN/DISTRIBUIDOR ven todo; OPERADOR ve lo creado; RESPONSABLE ve lo asignado; RESOLUTOR ve las áreas/asignaciones que le competen).

### 7.2 Frontend: `SolicitudModal.jsx`
Ubicación: `code/frontend/src/components/SolicitudModal.jsx`

- **Responsabilidades Clave:**
  1. **Navegación por Pestañas (Tabs):**
     - `detalles`: Formulario principal de creación y edición.
     - `comentarios`: Sub-componente `TicketSeguimiento` para notas de seguimiento.
     - `historial`: Línea de tiempo con el historial de auditoría de asignaciones (`/api/solicitudes/:id/historial`).
     - `adjuntos`: Área de subida/descarga/eliminación de documentos adjuntos (`/api/solicitudes/:id/adjuntos`).
  2. **Construcción de Payloads y Normalización:**
     - En operaciones de edición (`PUT`), construye el payload mapeando exactamente la estructura de `SolicitudUpdateDTO` (`responsableId` numérico, `locationName` y `barrio` planos).
     - Maneja campos específicos según el tipo de solicitud (`PEDIDO`, `SUBSIDIO`, `AGENDA`).
  3. **Asignaciones Múltiples a Resolutores:**
     - Permite agregar y configurar resolutores dinámicamente según los tipos de resolución disponibles (`tiposResolucion`).
     - Renderiza formularios dinámicos según los atributos configurados para cada tipo de resolución, incluyendo campos para subida de archivos adjuntos por atributo.
  4. **Modal de Aprobación para Resolutores:**
     - Muestra un botón especial `Aprobar Resolución` cuando el usuario con rol `RESOLUTOR` tiene una asignación pendiente en el caso activo. Abre un diálogo de confirmación para capturar observaciones y configurar eventos de calendario si aplica.

### 7.3 Arnhem de Tests Existentes
1. **`SolicitudWorkflowTest.java` (Backend Unit/Integration Test):**
   - Prueba el flujo completo de vida de una solicitud: Operador crea -> Distribuidor asigna Responsable -> Responsable asigna Resolutores -> Resolutor 1 aprueba (estado permanece `"en resolucion"`) -> Resolutor 2 aprueba (estado transiciona a `"completadas"`).
   - Verifica también la integridad documental al actualizar datos.
2. **`TestHelperController.java` (Controlador de Ayuda para Pruebas E2E):**
   - Proporciona endpoints en `/api/test-helper/*` utilizados por las pruebas de Playwright para modificar filas en Google Sheets o purgar la base de datos manteniendo casos de prueba específicos.

---

## 8. Recomendaciones para Agentes Implementadores

1. **Respeta la Convención de Idioma:** Todos los comentarios en código, JSDoc/JavaDoc, explicaciones y nombres de commits de Git DEBEN estar obligatoriamente en **ESPAÑOL**.
2. **Mantén el DTO Plano en Modificaciones de Solicitud:** En el Backend, la actualización de `Solicitud` utiliza `SolicitudUpdateDTO` para evitar fallos de polimorfismo con Jackson. Al agregar campos a `Solicitud`, asegúrate de actualizar tanto la entidad como `SolicitudUpdateDTO` y la lógica correspondiente en `SolicitudService.updateSolicitud`.
3. **Atención a la Asignación de Responsable:** En `SolicitudUpdateDTO`, `responsableId = null` preserva el responsable actual, mientras que `responsableId = 0` indica una desasignación explícita.
4. **Validación de Roles en UI y Backend:** Asegúrate de probar cambios con diferentes roles (`OPERADOR`, `RESPONSABLE`, `RESOLUTOR`, `DISTRIBUIDOR`, `ADMINISTRADOR`) ya que la visibilidad de campos en `SolicitudModal.jsx` y las restricciones de consulta en `SolicitudService.buildSpecification` dependen directamente del rol activo.
5. **Verificación de Pruebas antes de Handoff:** Corre `mvn test` en `code/backend` y `npx playwright test` en `code/frontend` para garantizar la estabilidad antes de finalizar entregables.
