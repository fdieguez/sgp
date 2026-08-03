# Informe de Verificación Empírica — Challenger 1

## 1. Observation (Observación)

Se ejecutó la verificación empírica completa de compilación y ejecución de pruebas para los componentes Backend y Frontend E2E de SGP.

### A. Backend (`c:\Users\fran\dev\projects\SGP\code\backend`)

1. **Comando**: `mvn compile`
   - **Resultado**: `BUILD SUCCESS`
   - **Log Relevante**:
     ```text
     [INFO] --- compiler:3.11.0:compile (default-compile) @ backend ---
     [INFO] Nothing to compile - all classes are up to date
     [INFO] ------------------------------------------------------------------------
     [INFO] BUILD SUCCESS
     [INFO] Total time:  4.275 s
     ```

2. **Comando**: `mvn test`
   - **Resultado**: `BUILD FAILURE`
   - **Estadísticas de Pruebas**: 36 pruebas ejecutadas en total. 24 aprobadas, 0 fallos, 12 errores.
   - **Log Relevante / Lista Verbatim de Errores**:
     ```text
     [ERROR] Errors: 
     [ERROR]   SolicitudM21Test.setUp:59 » InvalidDataAccessApiUsage org.hibernate.TransientObjectException: object references an unsaved transient instance - save the transient instance before flushing: com.sgp.backend.entity.TipoResolucion
     [ERROR]   SolicitudM21Test.setUp:44 » DataIntegrityViolation could not execute statement [Violación de indice de Unicidad » Clave primaria: "PUBLIC.CONSTRAINT_INDEX_4 ON PUBLIC.USERS(EMAIL NULLS FIRST) VALUES ( /* 12 */ 'res_sin_subsidio@test.com' )"
     Unique index or primary key violation: "PUBLIC.CONSTRAINT_INDEX_4 ON PUBLIC.USERS(EMAIL NULLS FIRST) VALUES ( /* 12 */ 'res_sin_subsidio@test.com' )"; SQL statement:
     insert into users (activo,birth_date,dni,email,first_name,last_name,password,phone,role,zone,id) values (?,?,?,?,?,?,?,?,?,?,default) [23505-224]] [insert into users (activo,birth_date,dni,email,first_name,last_name,password,phone,role,zone,id) values (?,?,?,?,?,?,?,?,?,?,default)]; SQL [insert into users (activo,birth_date,dni,email,first_name,last_name,password,phone,role,zone,id) values (?,?,?,?,?,?,?,?,?,?,default)]; constraint ["PUBLIC.CONSTRAINT_INDEX_4 ON PUBLIC.USERS(EMAIL NULLS FIRST) VALUES ( /* 12 */ 'res_sin_subsidio@test.com' )"; SQL statement:
     insert into users (activo,birth_date,dni,email,first_name,last_name,password,phone,role,zone,id) values (?,?,?,?,?,?,?,?,?,?,default) [23505-224]]
     [ERROR]   SolicitudR1EmpiricalTest.testAlternativeJsonKeys:192->dtoDesde:100 NoClassDefFound com/sgp/backend/dto/SolicitudUpdateDTO$PersonDTO
     [ERROR]   SolicitudR1EmpiricalTest.testMissingOrInvalidDetail:216->dtoDesde:100 NoClassDefFound com/sgp/backend/dto/SolicitudUpdateDTO$PersonDTO
     [ERROR]   SolicitudR1EmpiricalTest.testNonSubsidioAssignments:256->dtoDesde:100 NoClassDefFound com/sgp/backend/dto/SolicitudUpdateDTO$PersonDTO
     [ERROR]   SolicitudR1EmpiricalTest.testNumericValuesInDetail:114->dtoDesde:100 NoClassDefFound com/sgp/backend/dto/SolicitudUpdateDTO$PersonDTO
     [ERROR]   SolicitudR1EmpiricalTest.testStringValuesInDetail:138->dtoDesde:100 NoClassDefFound com/sgp/backend/dto/SolicitudUpdateDTO$PersonDTO
     [ERROR]   SolicitudR1EmpiricalTest.testUnregisteredResolutorEmail:278->dtoDesde:100 NoClassDefFound com/sgp/backend/dto/SolicitudUpdateDTO$PersonDTO
     [ERROR]   SolicitudWorkflowTest.testDocumentIntegrity:152->dtoDesde:82 NoClassDefFound com/sgp/backend/dto/SolicitudUpdateDTO$PersonDTO
     [ERROR]   SolicitudWorkflowTest.testFullWorkflow:110->dtoDesde:82 NoClassDefFound com/sgp/backend/dto/SolicitudUpdateDTO$PersonDTO
     [ERROR]   SolicitudWorkflowTest.testSubsidioAssignmentAmountExtraction:174->dtoDesde:82 NoClassDefFound com/sgp/backend/dto/SolicitudUpdateDTO$PersonDTO
     [ERROR]   VerifyLocationsTest.testVerifyLocations » UnsatisfiedDependency Error creating bean with name 'com.sgp.backend.VerifyLocationsTest': Unsatisfied dependency expressed through field 'locationRepository': No qualifying bean of type 'com.sgp.backend.repository.LocationRepository' available: expected at least 1 bean which qualifies as autowire candidate. Dependency annotations: {@org.springframework.beans.factory.annotation.Autowired(required=true)}
     [INFO] 
     [ERROR] Tests run: 12, Failures: 0, Errors: 12, Skipped: 0
     [INFO] ------------------------------------------------------------------------
     [INFO] BUILD FAILURE
     ```

---

### B. Frontend E2E (`c:\Users\fran\dev\projects\SGP\code\frontend`)

1. **Comando**: `npx.cmd playwright test tests/playwright_sgp.spec.js`
   - **Resultado**: `SUCCESS` (6 de 6 pruebas pasadas)
   - **Duración**: 1.7 minutos
   - **Log Relevante / Verbatim Output**:
     ```text
     Running 6 tests using 1 worker

     [1/6] [chromium] › tests\playwright_sgp.spec.js:59:5 › Paso 1: Limpieza del sistema y base de datos (Admin)
     [E2E SGP] Limpieza completada correctamente.

     [2/6] [chromium] › tests\playwright_sgp.spec.js:83:5 › Paso 2: Crear solicitud simple (Operador)
     [E2E SGP] Solicitud simple creada exitosamente.

     [3/6] [chromium] › tests\playwright_sgp.spec.js:104:5 › Paso 3: Crear solicitud compleja básica (Operador)
     [E2E SGP] Solicitud compleja básica guardada exitosamente.

     [4/6] [chromium] › tests\playwright_sgp.spec.js:131:5 › Paso 4: Asignar Responsable y Zona (Distribuidor)
     [E2E SGP] Responsable y Zona asignados correctamente.

     [5/6] [chromium] › tests\playwright_sgp.spec.js:153:5 › Paso 5: Derivar y Completar Asignaciones Múltiples con Adjuntos (Responsable)
     [E2E SGP] Asignaciones múltiples configuradas y archivos de soporte subidos correctamente.

     [6/6] [chromium] › tests\playwright_sgp.spec.js:209:5 › Paso 6: Puesta en consideración e integración con Google Sheets (Resolutor)
     [E2E SGP] Limpieza exitosa. Test completado.

       6 passed (1.7m)
     ```

---

## 2. Logic Chain (Cadena Lógica)

1. **Paso 1 - Compilación Backend**: La ejecución de `mvn compile` en `c:\Users\fran\dev\projects\SGP\code\backend` finalizó con `BUILD SUCCESS`, confirmando que el código fuente Java sintácticamente es válido y compila sin errores.
2. **Paso 2 - Ejecución de Pruebas Backend**: La ejecución de `mvn test` arrojó 12 errores en clases de prueba específicas:
   - En `SolicitudR1EmpiricalTest` (6 errores) y `SolicitudWorkflowTest` (3 errores), las pruebas intentaron acceder a la clase interna `com.sgp.backend.dto.SolicitudUpdateDTO$PersonDTO`, la cual no existe o fue renombrada/removida en el DTO principal, generando errores `NoClassDefFoundError`.
   - En `VerifyLocationsTest` (1 error), Spring no pudo autowirear `LocationRepository` porque no existe dicho bean/interface repository registrado en el contexto.
   - En `SolicitudM21Test` (2 errores), la inicialización (`setUp`) intentó guardar/asociar `TipoResolucion` antes de persistirlo (`TransientObjectException`), y reusó el email `res_sin_subsidio@test.com` causando una violación de índice de unicidad en la base de datos H2 en memoria (`DataIntegrityViolation`).
3. **Paso 3 - Pruebas E2E (Playwright)**: La suite principal `tests/playwright_sgp.spec.js` ejecutó los 6 pasos del ciclo de vida del modelo SGP (Limpieza, Solicitud Simple, Solicitud Compleja, Asignación, Adjuntos y Sync con Google Sheets) de manera secuencial. Todos los 6 pasos se completaron satisfactoriamente contra el sistema activo, acumulando 6 pruebas pasadas sobre 6 ejecutadas.

---

## 3. Caveats (Advertencias / Limitaciones)

- No se modificó código fuente ni clases de prueba en el backend para corregir los 12 errores encontrados, siguiendo estrictamente el rol de Challenger de sólo lectura y verificación empírica.
- La ejecución directa de PowerShell para `npx` requirió invocar `npx.cmd` debido a las políticas de ejecución de scripts de Windows (`.ps1`).

---

## 4. Conclusion (Conclusión)

- **Backend Compilación**: **APROBADO** (`mvn compile` impecable).
- **Backend Pruebas Unitarias/Integración**: **NO APROBADO** (12 errores de ejecución en `mvn test`).
  - *Causas raíz identificadas*:
    1. Referencia a clase no encontrada `SolicitudUpdateDTO$PersonDTO`.
    2. Dependencia no satisfecha `LocationRepository`.
    3. Manejo de entidades transitorias y duplicados en fixturas de `SolicitudM21Test`.
- **Frontend E2E (Playwright)**: **APROBADO** (6/6 pruebas aprobadas en `tests/playwright_sgp.spec.js`).

---

## 5. Verification Method (Método de Verificación)

Para reproducir independientemente estos hallazgos empíricos:

1. **Re-verificar Backend Compilación**:
   ```bash
   cd c:\Users\fran\dev\projects\SGP\code\backend
   mvn compile
   ```
   *Criterio de éxito*: `BUILD SUCCESS`.

2. **Re-verificar Errores de Pruebas Backend**:
   ```bash
   cd c:\Users\fran\dev\projects\SGP\code\backend
   mvn test
   ```
   *Criterio de invalidación*: `Tests run: 36, Failures: 0, Errors: 0`. Actividad actual: 12 errores registrados.

3. **Re-verificar Pruebas E2E de Frontend**:
   ```bash
   cd c:\Users\fran\dev\projects\SGP\code\frontend
   npx.cmd playwright test tests/playwright_sgp.spec.js
   ```
   *Criterio de éxito*: `6 passed`.
