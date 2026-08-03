# Informe de Verificación Empírica del Backend (Challenger 1 - M3.1)

## 1. Observation (Observación)

### 1.1 Ejecución del Comando de Pruebas
Comando ejecutado en `c:\Users\fran\dev\projects\SGP\code\backend`:
```bash
mvn test
```

Resultados globales de la ejecución:
- **Total de pruebas ejecutadas**: 12
- **Pruebas exitosas (Pass)**: 10
- **Fallos (Failures)**: 0
- **Errores (Errors)**: 2
- **Resultado final**: `BUILD FAILURE` (exit code: 1)

### 1.2 Detalle de Pruebas por Clase

| Clase de Test | Pruebas Ejecutadas | Pasadas | Errores | Estado |
|---|---|---|---|---|
| `VerifyLocationsTest` | 1 | 1 | 0 | PASÓ |
| `SolicitudWorkflowTest` | 3 | 3 | 0 | PASÓ |
| `SolicitudR1EmpiricalTest` | 6 | 6 | 0 | PASÓ |
| `SolicitudM21Test` | 2 | 0 | 2 | ERROR |

### 1.3 Error Verbatim Registrado
En la ejecución de `SolicitudM21Test.java`:
```text
[ERROR] Errors: 
[ERROR]   SolicitudM21Test.setUp:78 » DataIntegrityViolation could not execute statement [La columna "PERSON_ID" no permite valores nulos (NULL)
NULL not allowed for column "PERSON_ID"; SQL statement:
insert into solicitudes (amount,asistencia,contact_date,created_by_id,description,detail,entry_date,first_contact_control,google_event_id,grant_date,location_id,observation,origin,person_id,por_donde,resolution,resolution_approved,resolution_date,resolutor_asignado_id,responsable_id,sheets_config_id,status,suggested_resolution_type,type,zone,id) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,default) [23502-224]]
```

### 1.4 Verificación de Base de Datos H2 en Memoria
Inspección directa de los archivos de propiedades de test:
- Archivo `c:\Users\fran\dev\projects\SGP\code\backend\src\test\resources\application.properties`:
  ```properties
  spring.datasource.url=jdbc:h2:mem:sgp_testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
  spring.datasource.driverClassName=org.h2.Driver
  ```
- Archivo `c:\Users\fran\dev\projects\SGP\code\backend\src\test\resources\application-dev.properties`:
  ```properties
  spring.datasource.url=jdbc:h2:mem:sgp_testdb_dev;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
  spring.datasource.driverClassName=org.h2.Driver
  ```
Ambos archivos confirman el uso exclusivo de base de datos H2 en memoria (`jdbc:h2:mem:...`), garantizando que no se generen bloqueos de archivo durante la ejecución de pruebas.

---

## 2. Logic Chain (Cadena Lógica)

1. **Definición de Entidad**: En `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\entity\Solicitud.java` (línea 101), la relación `person` está anotada con `@ManyToOne(optional = false)`. Esto exige que toda instancia persistida de `Solicitud` contenga un valor no nulo en la columna `person_id`.
2. **Método setUp de Test**: En `c:\Users\fran\dev\projects\SGP\code\backend\src\test\java\com\sgp\backend\SolicitudM21Test.java` (líneas 77-82), la solicitud de prueba se instanció usando el patrón builder sin asignar una persona:
   ```java
   solicitudPrueba = solicitudRepository.save(Solicitud.builder()
           .type("SUBSIDIO")
           .status("pendiente")
           .entryDate(java.time.LocalDate.now())
           .description("Solicitud de prueba M2_1")
           .build());
   ```
3. **Fallo de Inserción SQL**: Durante el método `@BeforeEach setUp()`, al invocar `solicitudRepository.save(...)`, Hibernate genera una sentencia `INSERT` con `person_id = NULL`. La base de datos H2 en memoria rechaza la inserción por la restricción `NOT NULL`, lanzando `DataIntegrityViolationException`.
4. **Impacto en Suite**: Como el error ocurre en el `@BeforeEach`, las dos pruebas de la clase (`testPonerEnConsideracionResolutorSinCompetenciaLanzaForbidden` y `testPonerEnConsideracionResolutorConCompetenciaExitoso`) abortan antes de ejecutar sus aserciones.
5. **Comprobación de Pruebas Restantes**:
   - `SolicitudWorkflowTest` crea explícitamente un objeto `Person` (`personRepository.save(...)`) y lo asigna a cada solicitud antes de guardarla.
   - `SolicitudR1EmpiricalTest` crea explícitamente un objeto `Person` y lo asigna en `createBaseSolicitud(...)`.
   - Por esta razón, 9 pruebas de workflow/R1 y 1 prueba de localidades pasaron sin inconvenientes.

---

## 3. Caveats (Salvedades)

- Conforme a las restricciones de rol (review-only / Challenger), no se realizaron modificaciones al código fuente de la suite de pruebas ni del modelo de datos para arreglar `SolicitudM21Test.java`.
- Se requiere que el equipo de implementación/desarrollo agregue la creación y asignación de un objeto `Person` persistido dentro del `@BeforeEach setUp()` de `SolicitudM21Test.java` para resolver los 2 errores de prueba.

---

## 4. Conclusion (Conclusión)

1. **Base de Datos H2**: VERIFICADO EXITOSAMENTE. La suite utiliza `jdbc:h2:mem:...` en `src/test/resources/application.properties` y `application-dev.properties`, evitando bloqueos de archivos en disco.
2. **Resultados de la Suite**:
   - `SolicitudWorkflowTest.java`: 3/3 PASADOS.
   - `SolicitudR1EmpiricalTest.java`: 6/6 PASADOS.
   - `VerifyLocationsTest.java`: 1/1 PASADO.
   - `SolicitudM21Test.java`: 0/2 PASADOS (2 ERRORES por `DataIntegrityViolationException` debido a `person_id` NULL).
3. **Dictamen Final**: La verificación empírica RECHAZA la afirmación de que *todas* las pruebas pasan exitosamente. La suite falla debido a un error de configuración de fixture en `SolicitudM21Test.java`.

---

## 5. Verification Method (Método de Verificación Independiente)

Para reproducir independientemente el resultado:
1. Abrir una terminal en el directorio `code/backend/`:
   ```bash
   cd c:\Users\fran\dev\projects\SGP\code\backend
   ```
2. Ejecutar la suite de pruebas Maven:
   ```bash
   mvn test
   ```
3. Inspeccionar el reporte generado en `target/surefire-reports/com.sgp.backend.SolicitudM21Test.txt` para confirmar los 2 errores por `NULL not allowed for column "PERSON_ID"`.
4. Condición de Invalidation: El fallo quedará invalidado tan pronto como se asigne un objeto `Person` persistido a `solicitudPrueba` en `SolicitudM21Test.setUp()`, momento en el cual `mvn test` devolverá `BUILD SUCCESS` (12/12 pruebas pasadas).
