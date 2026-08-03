# Reporte de Handoff (explorer_1) — Análisis Backend Requisito R1

## 1. Observation (Observaciones Directas)

1. **Servicios y Entidades Clave Ubicados:**
   - `SolicitudService.java`: `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\service\SolicitudService.java`
   - `SyncService.java`: `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\service\SyncService.java`
   - `Solicitud.java`: `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\entity\Solicitud.java`
   - `SolicitudResolutorAssignment.java`: `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\entity\SolicitudResolutorAssignment.java`
   - `ResolutorAssignmentDTO.java`: `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\dto\ResolutorAssignmentDTO.java`
   - `SolicitudUpdateDTO.java`: `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\dto\SolicitudUpdateDTO.java`

2. **Creación y Actualización de Solicitudes:**
   - En `SolicitudService.java`:
     - `createSolicitud(Solicitud solicitud)` en líneas 222-313. Guarda la entidad con `solicitudRepository.save(solicitud)` (línea 298) y procesa asignaciones con `processAssignments(saved, solicitud.getAssignments())` (línea 301).
     - `updateSolicitud(Long id, SolicitudUpdateDTO dto)` en líneas 316-456. Actualiza campos primitivos y `amount` si no es nulo (líneas 399-401), guarda con `solicitudRepository.save(existing)` (línea 432) y llama a `processAssignments(saved, dto.getAssignments())` (línea 436).

3. **Asignaciones y `tipoResolucion` ("SUBSIDIO"):**
   - La entidad `Solicitud` incluye la colección persistida `@OneToMany List<SolicitudResolutorAssignment> resolutorAssignments` (líneas 89-91) y el campo efímero `@Transient List<ResolutorAssignmentDTO> assignments` (líneas 74-75).
   - `ResolutorAssignmentDTO` posee las propiedades `resolutorEmail` (String), `tipoResolucion` (String, ej: `"SUBSIDIO"`) y `detalle` (String JSON).
   - `SolicitudResolutorAssignment` guarda el detalle libre/JSON en la columna SQL `TEXT` (`detalle`, línea 44).

4. **Extracción del `"Monto"` del JSON `detalle` y Sincronización:**
   - En `SyncService.java` (líneas 1002-1018), `getSubsidioDetalle` parsea la propiedad `detalle` JSON de la asignación `SUBSIDIO` usando Jackson `ObjectMapper`.
   - Para asignar automáticamente `solicitud.setAmount(...)` antes de guardar, la extracción del atributo `"Monto"` (o `"monto"`) debe integrarse en `processAssignments(...)` de `SolicitudService.java` (líneas 480-501).

5. **Exportación e Importación en `SyncService.java`:**
   - En `exportarPlanillaSalida(...)` (línea 562), `s.getAmount()` se escribe en la columna `"Monto en dinero"` (`monto_solicitado`) de Google Sheets.
   - En `importarPlanillaSalida(...)` (línea 756-760), se lee la columna `monto_solicitado`, se parsea con `parseAmount(...)` y se actualiza `solicitud.setAmount(amountFromSheet)`.

6. **Ejecución de Pruebas Backend:**
   - El proyecto utiliza Maven (`pom.xml`).
   - Comando de compilación y ejecución de tests: `mvn test` (ejecutado desde `c:\Users\fran\dev\projects\SGP\code\backend`).
   - Verificación ejecutada: `mvn test` reportó `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, BUILD SUCCESS` (Tiempo transcurrido: 14.28s).

---

## 2. Logic Chain (Cadena Lógica)

1. **Paso 1:** Al examinar `SolicitudService.java`, se observó que la recepción de asignaciones desde el cliente web o la API REST ocurre mediante `ResolutorAssignmentDTO`.
2. **Paso 2:** Cada DTO de asignación contiene la propiedad `tipoResolucion` y la cadena JSON `detalle`. Cuando `tipoResolucion` es `"SUBSIDIO"`, el JSON `detalle` incluye pares clave-valor dinámicos como `"Monto": 15000`.
3. **Paso 3:** Dado que `createSolicitud` y `updateSolicitud` invocan ambos a `processAssignments(solicitud, assignments)`, añadir la lógica de deserialización de JSON para extraer el valor numérico de `"Monto"` en `processAssignments` asegura que `solicitud.setAmount(...)` se establezca adecuadamente y la entidad se persista actualizada.
4. **Paso 4:** En `SyncService.java`, la función `exportarPlanillaSalida` ya lee `s.getAmount()`. Por ende, al asegurar que `solicitud.setAmount(...)` se guarde en `SolicitudService`, la exportación a Google Sheets enviará el monto correcto a la columna correspondiente automáticamente.

---

## 3. Caveats (Advertencias y Supuestos)

- **Formato del JSON de detalle:** Los nombres de las claves en el JSON `detalle` enviado desde el frontend pueden variar entre `"Monto"`, `"monto"`, o `"Monto en dinero"`. La función de extracción debe comprobar estas tres variantes insensiblemente a mayúsculas/minúsculas.
- **Tipos de datos en JSON:** El valor de `"Monto"` puede ser enviado por el cliente como número (`15000`) o como texto (`"15000"` o `"$15.000,00"`). Se debe usar un parseador robusto como `parseAmount(...)` de `SyncService` para limpiar símbolos y separadores de miles/decimales.
- **Modo de Red Read-Only:** Como agente Explorer, no se han modificado archivos de código fuente en `code/backend/src`. La implementación de la solución corresponde al agente Implementer.

---

## 4. Conclusion (Conclusión)

El diseño del backend de SGP permite implementar el **Requisito R1** de forma limpia y centralizada en `SolicitudService.java` dentro del método `processAssignments`:
1. Parsear el campo `detalle` JSON cuando `tipoResolucion` sea `"SUBSIDIO"`.
2. Extraer la propiedad `"Monto"`, convertirla a `BigDecimal`.
3. Invocar `solicitud.setAmount(montoBD)` y `solicitud.setType("SUBSIDIO")`.
4. Persistir los cambios en `solicitudRepository.save(solicitud)`.

---

## 5. Verification Method (Método de Verificación)

Para verificar independientemente estos hallazgos e integrar la solución:

1. **Inspección de Archivos:**
   - Revisar `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\service\SolicitudService.java` (líneas 480-501).
   - Revisar `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\service\SyncService.java` (líneas 562 y 1002-1018).

2. **Ejecución de Comando de Pruebas:**
   ```powershell
   cd c:\Users\fran\dev\projects\SGP\code\backend
   mvn test
   ```

3. **Condición de Invalidación:**
   Si al ejecutar `mvn test` se reportan errores de compilación o fallos en `SolicitudWorkflowTest`, o si el campo `detalle` en `ResolutorAssignmentDTO` no incluye el atributo `"Monto"`, el mapa de integración deberá ajustarse.
