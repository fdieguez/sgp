# Análisis de Mecanismos de Prueba (Backend y Frontend) - Sistema SGP

**Agente:** Explorador 3 (Pruebas e Infraestructura)  
**Fecha:** 31 de Julio de 2026  
**Ubicación del reporte:** `c:\Users\fran\dev\projects\SGP\.agents\teamwork_preview_explorer_m1_3\analysis.md`  

---

## Resumen Ejecutivo

Este documento presenta el análisis técnico integral de los mecanismos de testing del sistema de Gestión de Proyectos (SGP), tanto para el backend (Spring Boot con Java 17 y JUnit 5 / Mockito) como para el frontend (Playwright E2E sobre React/Vite).

---

## 1. Pruebas Unitarias e Integración Backend (`mvn test`)

### 1.1 Ubicación y Estado Actual de los Tests Backend
Los tests automatizados del backend se localizan en `code/backend/src/test/java/com/sgp/backend/`.

Las clases de prueba existentes identificadas son:
1. **`SolicitudWorkflowTest.java`**:
   - **Enfoque**: Prueba de integración de Spring Boot (`@SpringBootTest`, `@Transactional`).
   - **Cobertura**: Valida el ciclo de vida completo de una solicitud (creación por Operador, asignación de Responsable por Distribuidor, asignación y aprobación de múltiples Resolutores hasta el estado `completadas`), integridad de los DTOs y la extracción de monto de subsidio.
2. **`SolicitudR1EmpiricalTest.java`**:
   - **Enfoque**: Prueba empírica para la Regla R1 (extracción de montos en asignaciones de tipo `SUBSIDIO`).
   - **Cobertura**: Evalúa casos de borde como montos enteros, decimales, strings con formato en pesos (`"$ 75.000,00"`), formato plano (`"75000.50"`), claves JSON alternativas (`"monto"`, `"Monto en dinero"`), JSONs malformados o nulos, y diferenciación entre tipos `SUBSIDIO` y `MATERIALES`.
3. **`VerifyLocationsTest.java`**:
   - **Enfoque**: Test puntual de repositorios para verificar la presencia de localidades y la bandera `showInUi`.

> **Hallazgo Crítico**: Actualmente **NO existen** clases de prueba unitaria ni de integración dedicadas para `EmailService` (ej: `EmailServiceTest`) ni para la funcionalidad específica de `SolicitudService.ponerEnConsideracion(Long id)`.

---

### 1.2 Ejecución de Tests y Diagnóstico de Infraestructura

#### Comando Estándar de Ejecución
- **Ejecutar suite completa**:
  ```bash
  cd code/backend
  mvn test
  ```
- **Ejecutar una clase específica**:
  ```bash
  mvn test -Dtest=SolicitudWorkflowTest
  ```

#### Diagnóstico del Fallo de Ejecución Observado
Al ejecutar `mvn test` con el backend en ejecución, los tests fallan arrojando la siguiente excepción:
```text
org.h2.jdbc.JdbcSQLNonTransientConnectionException: La base de datos puede que ya esté siendo utilizada: "C:/Users/fran/dev/projects/SGP/code/backend/data/sgp_db.mv.db". Soluciones Posibles: cierre todas las otras conexiones; use el modo server
```
- **Causa raíz**: Los tests actuales no cuentan con una configuración separada en `src/test/resources/application-test.properties`. Al ejecutarse, Spring Boot toma `application-dev.properties`, el cual intenta conectarse al archivo de base de datos H2 local persistido en disco (`jdbc:h2:file:./data/sgp_db`). Si el servidor de desarrollo está encendido, el archivo `.mv.db` se encuentra bloqueado exclusivamente.
- **Recomendación de Infraestructura**:
  1. Crear la carpeta `src/test/resources/` y el archivo `application-test.properties`.
  2. Configurar la base de datos de pruebas para utilizar H2 **en memoria**:
     ```properties
     spring.datasource.url=jdbc:h2:mem:sgp_test_db;DB_CLOSE_DELAY=-1;MODE=MySQL
     spring.datasource.driverClassName=org.h2.Driver
     spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
     ```
  3. Anotar las clases de prueba con `@ActiveProfiles("test")` para aislar completamente las pruebas de la base de datos persistida.

---

### 1.3 Análisis y Propuesta de Nuevos Tests

#### A. Restricción `ponerEnConsideracion` (`SolicitudService`)

- **Ubicación del código**: `SolicitudService.java` (línea 680).
- **Lógica del método**:
  ```java
  @Transactional
  public Solicitud ponerEnConsideracion(Long id) {
      Solicitud solicitud = solicitudRepository.findById(id)
              .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));
      solicitud.setStatus("consideracion");
      Solicitud saved = solicitudRepository.save(solicitud);
      logAssignmentChange(saved, null, "PUESTA EN CONSIDERACIÓN");
      return saved;
  }
  ```

- **Tests a Implementar**:
  1. **`testPonerEnConsideracion_Exito` (Integración)**:
     - *Dado* una solicitud persistida en estado `en proceso` o `en resolucion`.
     - *Cuando* se invoca `solicitudService.ponerEnConsideracion(id)`.
     - *Entonces* se verifica que el estado devuelto sea `"consideracion"` y que en `AssignmentHistoryRepository` se haya registrado una entrada con la acción `"PUESTA EN CONSIDERACIÓN"`.
  2. **`testPonerEnConsideracion_IdInexistente` (Unidad/Integración)**:
     - *Dado* un ID de solicitud inexistente (ej. `99999L`).
     - *Cuando* se invoca `solicitudService.ponerEnConsideracion(99999L)`.
     - *Entonces* se verifica que lance una excepción `RuntimeException` con el mensaje `"Solicitud no encontrada"`.
  3. **`testPonerEnConsideracion_IntegracionSync` (Integración)**:
     - Verificar que tras cambiar el estado a `"consideracion"`, la solicitud sea visible para la consulta de exportación a Google Sheets en `SyncService` (`filter(s -> "CONSIDERACION".equalsIgnoreCase(s.getStatus()))`).

#### B. Notificación `sendSubsidioApprovedEmail` (`EmailService` y `SolicitudService`)

- **Ubicación del código**:
  - Definicón: `EmailService.java` (línea 34).
  - Invocación: `SolicitudService.java` (línea 672, dentro de `aprobarAsignacion`).

- **Lógica del método**:
  - Método asíncrono `@Async`.
  - Construye cuerpo HTML con número de solicitud, beneficiario, descripción, monto y observaciones.
  - Carga físicamente archivos adjuntos vía `FileService.loadFileAsResource(filename)` y los adhiere al `MimeMessage`.
  - Envía el correo mediante `JavaMailSender.send(...)`.

- **Tests a Implementar**:
  1. **`EmailServiceTest.testSendSubsidioApprovedEmail_ConAdjuntosExitoso` (Unitario)**:
     - *Mocks*: `JavaMailSender`, `SolicitudRepository`, `FileService`.
     - *Verificación*: Confirmar que al invocar `sendSubsidioApprovedEmail(email, subsidioId)` se llame a `mailSender.createMimeMessage()`, se construya el asunto correcto `[SGP] Subsidio Aprobado - Solicitud #...` y se invoque `mailSender.send(...)`.
  2. **`EmailServiceTest.testSendSubsidioApprovedEmail_ArchivoNoEncontradoManejoResiliente` (Unitario)**:
     - Simular que un archivo adjunto no existe en disco (`resource.exists() == false`).
     - Verificar que el servicio atrape el aviso sin lanzar excepción fatal y proceda a enviar el correo con los adjuntos disponibles.
  3. **`SolicitudServiceTest.testAprobarAsignacion_DisparaEmailSoloParaSubsidio` (Integración con Mocks)**:
     - Usar `@MockBean EmailService emailService`.
     - Caso A: Aprobar asignación de solicitud tipo `"SUBSIDIO"`. Verificar que `Mockito.verify(emailService).sendSubsidioApprovedEmail(...)` sea llamado exactamente 1 vez.
     - Caso B: Aprobar asignación de solicitud tipo `"AGENDA"` o `"MATERIALES"`. Verificar `Mockito.verify(emailService, Mockito.never()).sendSubsidioApprovedEmail(...)`.

---

## 2. Pruebas End-to-End E2E (`Playwright`)

### 2.1 Ubicación y Archivos de Configuración
- **Spec Principal**: `code/frontend/tests/playwright_sgp.spec.js`
- **Configuración de Playwright**: `code/frontend/playwright.config.js`
- **Otros specs en la suite**: `flujo_e2e_robusto.spec.js`, `flujo_completo_con_archivos.spec.js`, `etapa_8_funcional.spec.js`, `validacion_manual_etapa8.spec.js`.

---

### 2.2 Estructura y Organización de `playwright_sgp.spec.js`

El archivo `playwright_sgp.spec.js` implementa la suite principal de validación E2E para el ciclo de vida completo de SGP.

#### A. Modelo de Ejecución y Configuración
- **Modo Serial**: `test.describe.configure({ mode: 'serial' })`. Exigido debido a la naturaleza secuencial del flujo de negocio (limpieza -> creación -> asignación -> aprobación -> exportación/importación).
- **Aislamiento de Datos**: Utiliza un ID dinámico aleatorio (`idUnico = Math.floor(Math.random() * 900000) + 100000`) para generar nombres y DNIs de beneficiarios únicos en cada corrida.
- **Gestión de Archivos Temporales (`beforeAll` / `afterAll`)**:
  - En `beforeAll`, crea físicamente 3 archivos dummy en `tests/assets/`: `dni_frente_<ID>.png`, `dni_dorso_<ID>.png` y `cbu_<ID>.pdf`.
  - En `afterAll`, realiza la limpieza eliminando dichos archivos temporales.

#### B. Desglose Secuencial de Pasos

| Paso | Descripción | Rol de Usuario | Acciones Principales |
|---|---|---|---|
| **Paso 1** | Limpieza de Base de Datos | Administrador (`admin@sgp.com`) | Navega a `/settings`, ingresa contraseña de confirmación, acepta el diálogo nativo y ejecuta la limpieza transaccional de BD. |
| **Paso 2** | Creación de Solicitud Simple | Operador (`celestesolari19@...`) | Crea una solicitud estándar tipo `Club` en localidad Santa Fe. |
| **Paso 3** | Creación de Solicitud Compleja | Operador (`celestesolari19@...`) | Crea solicitud de tipo `SUBSIDIO` por $180.000 para el beneficiario testigo. |
| **Paso 4** | Asignación de Responsable y Zona | Distribuidor (`matias.ippolito@...`) | Asigna la Zona Territorial `Norte` y asigna como responsable a Matías Ippolito. |
| **Paso 5** | Derivación, Asignaciones Múltiples y Adjuntos | Responsable (`matias.ippolito.responsable@...`) | Agrega resoluciones de tipo `SUBSIDIO` y `AGENDA`. Carga físicamente los 3 archivos adjuntos de soporte DNI y CBU. |
| **Paso 6** | Puesta en Consideración y Sync Google Sheets | Resolutor (`martinnocioni@...`) | Vincula la planilla externa Google Sheets (`1jPw9ni4BW...`), **hace clic en "Poner en Consideración"**, exporta a la planilla, simula cambios en la planilla externa vía helper API (`/api/test-helper/modify-solicitud-row`), importa los cambios a SGP (actualizando monto a $225.000), valida la UI y ejecuta la purga dejando sólo la solicitud testigo. |

---

### 2.3 Modo de Ejecución contra el Servidor Real SGP

#### Requisitos Previos de Ejecución
1. Servidor Backend SGP ejecutándose en `http://localhost:8080` (con endpoints de pruebas `/api/test-helper/*` activos).
2. Servidor Frontend Vite ejecutándose en `http://localhost:5173`.

#### Comandos para Ejecución
Desde el directorio `code/frontend/`:

- **Ejecución Headless (estándar CI/CD)**:
  ```bash
  npx playwright test tests/playwright_sgp.spec.js
  ```
- **Ejecución Headed (con navegador visible para depuración)**:
  ```bash
  npx playwright test tests/playwright_sgp.spec.js --headed
  ```
- **Ejecución con URL Base configurada externamente**:
  ```bash
  BASE_URL=http://localhost:5173 npx playwright test tests/playwright_sgp.spec.js
  ```
- **Visualización del reporte HTML**:
  ```bash
  npx playwright show-report
  ```

---

## 3. Matriz Resumen de Cobertura y Recomendaciones

| Componente | Estado Actual | Fortalezas | Brecha / Recomendación |
|---|---|---|---|
| **Backend - Solicitud Workflow** | Cobertura en `SolicitudWorkflowTest` | Prueba flujo end-to-end de asignación y cálculo de estados. | Falta aislamiento H2 en memoria (`application-test.properties`). |
| **Backend - Regla R1 Subsidios** | Cobertura exhaustiva en `SolicitudR1EmpiricalTest` | Gran variedad de casos de borde en parsing JSON y formatos de moneda. | N/A |
| **Backend - Poner en Consideración** | Sin tests dedicados | Funcionalidad simple y aislada en `SolicitudService`. | Crear `SolicitudServiceTest` con casos de éxito, error e historial. |
| **Backend - Email Notificación** | Sin tests dedicados | Notificación HTML asíncrona con adjuntos. | Crear `EmailServiceTest` mockeando `JavaMailSender` y `FileService`, y verificar el disparo en `SolicitudService`. |
| **Frontend - E2E Playwright** | Suite completa `playwright_sgp.spec.js` | Cubre los 6 pasos críticos de la aplicación, incluyendo subida de archivos reales y sync bidireccional con Google Sheets. | Asegurar que los servidores Backend y Frontend estén levantados en los puertos 8080 y 5173 antes de la corrida. |
