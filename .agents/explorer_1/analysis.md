# Análisis Detallado del Requisito R1: Cálculo, Persistencia y Exportación del Monto de Subsidio en Backend

## 1. Resumen Ejecutivo
El presente análisis documenta la investigación realizada en la base de código backend de **SGP** (`c:\Users\fran\dev\projects\SGP\code\backend`) para dar cumplimiento al **Requisito R1**. 
El objetivo principal es identificar cómo se crea y actualiza una `Solicitud`, cómo se estructuran las asignaciones de resolutores (`assignments` / `SolicitudResolutorAssignment`) y su propiedad `tipoResolucion` ("SUBSIDIO"), cómo extraer el valor numérico `"Monto"` del detalle JSON dinámico, dónde debe establecerse `solicitud.setAmount(...)` antes de persistir, y cómo se exporta e importa dicho monto en `SyncService.java` hacia/desde Google Sheets.

---

## 2. Mapa de Archivos e Indicadores de Código Extraídos

| Componente | Ruta Relativa | Ubicación Absoluta | Líneas Clave |
|---|---|---|---|
| **Entidad Solicitud** | `src/main/java/com/sgp/backend/entity/Solicitud.java` | `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\entity\Solicitud.java` | 24 (`amount`), 74-75 (`assignments`), 89-91 (`resolutorAssignments`) |
| **Entidad SolicitudResolutorAssignment** | `src/main/java/com/sgp/backend/entity/SolicitudResolutorAssignment.java` | `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\entity\SolicitudResolutorAssignment.java` | 37-38 (`tipoResolucion`), 43-44 (`detalle` JSON TEXT) |
| **DTO ResolutorAssignmentDTO** | `src/main/java/com/sgp/backend/dto/ResolutorAssignmentDTO.java` | `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\dto\ResolutorAssignmentDTO.java` | 19 (`resolutorEmail`), 22 (`tipoResolucion`), 25 (`detalle`) |
| **DTO SolicitudUpdateDTO** | `src/main/java/com/sgp/backend/dto/SolicitudUpdateDTO.java` | `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\dto\SolicitudUpdateDTO.java` | 52 (`amount`), 66 (`assignments`) |
| **Servicio SolicitudService** | `src/main/java/com/sgp/backend/service/SolicitudService.java` | `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\service\SolicitudService.java` | 222-313 (`createSolicitud`), 316-456 (`updateSolicitud`), 480-501 (`processAssignments`) |
| **Servicio SyncService** | `src/main/java/com/sgp/backend/service/SyncService.java` | `c:\Users\fran\dev\projects\SGP\code\backend\src\main\java\com\sgp\backend\service\SyncService.java` | 242-264 (`processRows`), 562 (`exportarPlanillaSalida`), 754-763 (`importarPlanillaSalida`), 1002-1018 (`getSubsidioDetalle`) |
| **Pruebas de Backend** | `src/test/java/com/sgp/backend/SolicitudWorkflowTest.java` | `c:\Users\fran\dev\projects\SGP\code\backend\src\test\java\com\sgp\backend\SolicitudWorkflowTest.java` | Pruebas de integración del flujo de solicitudes |

---

## 3. Análisis Técnico de Componentes para Requisito R1

### 3.1. Creación y Actualización de Solicitudes en `SolicitudService.java`

#### Creación (`createSolicitud`)
- **Ubicación:** `SolicitudService.java` (Líneas 222 a 313).
- **Proceso:**
  1. Resuelve/persiste la entidad `Person` (beneficiario).
  2. Resuelve/persiste la entidad `Location` (Ciudad/Barrio).
  3. Establece valores por defecto (`status = "pendiente"`, `entryDate = hoy`, `createdBy = usuario autenticado`).
  4. Guarda la entidad `Solicitud` inicial: `Solicitud saved = solicitudRepository.save(solicitud);` (Línea 298).
  5. Procesa la lista de asignaciones enviadas desde el frontend: `processAssignments(saved, solicitud.getAssignments());` (Línea 301).
  6. Genera registros en `AsignacionHistorial`.

#### Actualización (`updateSolicitud`)
- **Ubicación:** `SolicitudService.java` (Líneas 316 a 456).
- **Proceso:**
  1. Busca la solicitud existente por `id`.
  2. Actualiza beneficiario, localidad y campos primitivos (`description`, `status`, `origin`, `zone`, etc.).
  3. Actualiza el monto explícito en caso de venir en el DTO:
     ```java
     // Líneas 399-401
     if (dto.getAmount() != null) {
         existing.setAmount(dto.getAmount());
     }
     ```
  4. Persiste la solicitud: `Solicitud saved = solicitudRepository.save(existing);` (Línea 432).
  5. Sincroniza asignaciones de resolutores: `processAssignments(saved, dto.getAssignments());` (Línea 436).

---

### 3.2. Representación de Asignaciones y `tipoResolucion` ("SUBSIDIO")

En el modelo de datos backend, una `Solicitud` puede tener múltiples resolutores asignados mediante la colección:
```java
@OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, orphanRemoval = true)
private List<SolicitudResolutorAssignment> resolutorAssignments;
```

Cuando el frontend o cliente envía datos de asignación, utiliza el campo `@Transient List<ResolutorAssignmentDTO> assignments`, donde cada DTO posee:
- `resolutorEmail`: correo del resolutor asignado.
- `tipoResolucion`: cadena de texto (ej. `"SUBSIDIO"`, `"MATERIALES"`, `"AGENDA"`).
- `detalle`: cadena libre o JSON serializado que contiene los atributos dinámicos ingresados para esa resolución (ej. `{"Monto": 25000, "Tipo de pedido": "Subsidio económico"}`).

La entidad persistida `SolicitudResolutorAssignment` guarda el detalle en una columna SQL de tipo `TEXT` (`detalle`).

---

### 3.3. Extracción de `"Monto"` del JSON de Detalle

En la base de código existente, `SyncService.java` utiliza `ObjectMapper` de Jackson para deserializar la propiedad `detalle` de tipo `SUBSIDIO`:
```java
// SyncService.java (Líneas 1002-1018)
private Map<String, Object> getSubsidioDetalle(Solicitud solicitud) {
    if (solicitud.getResolutorAssignments() != null) {
        for (SolicitudResolutorAssignment assignment : solicitud.getResolutorAssignments()) {
            if ("SUBSIDIO".equalsIgnoreCase(assignment.getTipoResolucion())) {
                String detalleJson = assignment.getDetalle();
                if (detalleJson != null && !detalleJson.trim().isEmpty()) {
                    try {
                        return objectMapper.readValue(detalleJson, new TypeReference<Map<String, Object>>() {});
                    } catch (Exception e) {
                        log.error("Error al parsear detalle", e);
                    }
                }
            }
        }
    }
    return new HashMap<>();
}
```

Para extraer el valor numérico del campo `"Monto"` (o `"monto"` / `"Monto en dinero"`) y asignarlo a `solicitud.setAmount(...)`, se debe implementar una lógica de extracción y parseo seguro de números:
```java
public static BigDecimal extractMontoFromDetalleJson(String detalleJson, ObjectMapper mapper) {
    if (detalleJson == null || detalleJson.trim().isEmpty()) return null;
    try {
        Map<String, Object> map = mapper.readValue(detalleJson, new TypeReference<Map<String, Object>>() {});
        Object montoObj = map.get("Monto");
        if (montoObj == null) montoObj = map.get("monto");
        if (montoObj == null) montoObj = map.get("Monto en dinero");
        
        if (montoObj instanceof Number) {
            return new BigDecimal(montoObj.toString());
        } else if (montoObj instanceof String) {
            String clean = ((String) montoObj).replace("$", "").replace(".", "").replace(",", ".").trim();
            if (!clean.isEmpty()) {
                return new BigDecimal(clean);
            }
        }
    } catch (Exception e) {
        // Manejar o registrar error de deserialización
    }
    return null;
}
```

---

### 3.4. Punto Exacto de Inserción para `solicitud.setAmount(...)`

El lugar idóneo y centralizado para invocar `solicitud.setAmount(...)` antes de finalizar la transacción de creación o actualización de la solicitud es dentro de `processAssignments(...)` en `SolicitudService.java` (Líneas 480 a 501).

#### Fragmento del código actual (`SolicitudService.java`):
```java
private void processAssignments(Solicitud solicitud, List<ResolutorAssignmentDTO> dtos) {
    if (dtos == null) return;
    
    // Clear existing assignments if any (Sync logic)
    solicitud.getResolutorAssignments().clear();
    
    boolean montoActualizado = false;
    for (ResolutorAssignmentDTO dto : dtos) {
        if (dto.getResolutorEmail() == null || dto.getTipoResolucion() == null) continue;
        
        User resolutor = userRepository.findByEmail(dto.getResolutorEmail()).orElse(null);
        if (resolutor != null) {
            SolicitudResolutorAssignment assignment = SolicitudResolutorAssignment.builder()
                    .solicitud(solicitud)
                    .resolutor(resolutor)
                    .tipoResolucion(dto.getTipoResolucion())
                    .detalle(dto.getDetalle())
                    .build();
            solicitud.getResolutorAssignments().add(assignment);

            // Propuesta Requisito R1: Extracción del monto para tipo SUBSIDIO
            if ("SUBSIDIO".equalsIgnoreCase(dto.getTipoResolucion()) && dto.getDetalle() != null) {
                BigDecimal montoExtraido = extractMontoFromDetalleJson(dto.getDetalle());
                if (montoExtraido != null) {
                    solicitud.setAmount(montoExtraido);
                    solicitud.setType("SUBSIDIO");
                    montoActualizado = true;
                }
            }
        }
    }
    solicitudRepository.save(solicitud);
}
```

Al incluir esta extracción dentro de `processAssignments(...)`, se garantiza que tanto `createSolicitud` como `updateSolicitud` sincronicen automáticamente el monto en la entidad `Solicitud` sin duplicar código.

---

### 3.5. Exportación e Importación de `amount` en `SyncService.java`

`SyncService.java` interactúa con la entidad `Solicitud` y Google Sheets de las siguientes maneras:

1. **Exportación a Planilla de Salida (`exportarPlanillaSalida`)**:
   - **Línea 562:**
     `setRowVal(rowValues, columnMapping, "monto_solicitado", s.getAmount() != null ? s.getAmount().toString() : "0");`
   - Si `solicitud.getAmount()` está seteado, exporta su valor directamente a la columna `"Monto en dinero"` / `"monto_solicitado"` de Google Sheets.

2. **Importación desde Planilla de Salida (`importarPlanillaSalida`)**:
   - **Líneas 754-763:**
     ```java
     if (columnMapping.containsKey("monto_solicitado")) {
         String montoStr = getValue(row, columnMapping.get("monto_solicitado"));
         BigDecimal amountFromSheet = parseAmount(montoStr);
         BigDecimal currentAmount = solicitud.getAmount() != null ? solicitud.getAmount() : BigDecimal.ZERO;
         if (amountFromSheet != null && amountFromSheet.compareTo(currentAmount) != 0) {
             solicitud.setAmount(amountFromSheet);
             logAssignmentChange(solicitud, null, "Monto actualizado desde planilla externa a: " + amountFromSheet);
             isModified = true;
         }
     }
     ```

3. **Sincronización Híbrida Inicial desde Google Sheets (`processRows`)**:
   - **Líneas 242-263:**
     ```java
     BigDecimal amount = parseAmount(montoStr);
     boolean isSubsidio = amount != null && amount.compareTo(BigDecimal.ZERO) > 0;
     
     Solicitud newSolicitud = Solicitud.builder()
             .type(isSubsidio ? "SUBSIDIO" : "PEDIDO")
             .amount(isSubsidio ? amount : null)
             ...
             .build();
     ```

---

## 4. Pruebas Unitarias e Integración Backend

### Entorno de Pruebas
- **Herramienta de construcción:** Apache Maven (`mvn`).
- **Framework de Testing:** JUnit 5 (`org.junit.jupiter`) con Spring Boot Test (`@SpringBootTest`) y base de datos H2 en memoria / archivo local.
- **Ubicación de Tests:** `code/backend/src/test/java/com/sgp/backend`
  - `SolicitudWorkflowTest.java`: Prueba el flujo completo de creación, asignación de responsable, asignación de resolutores y aprobación de solicitudes.
  - `VerifyLocationsTest.java`: Prueba la carga e integridad de localidades.

### Comandos de Ejecución de Pruebas
Para ejecutar las pruebas del backend desde la consola (PowerShell / CMD), se debe navegar a la carpeta del backend y ejecutar:

```powershell
cd c:\Users\fran\dev\projects\SGP\code\backend
mvn test
```

Para ejecutar una clase de prueba específica:
```powershell
mvn test -Dtest=SolicitudWorkflowTest
```

**Resultado de la verificación:** Se ejecutó `mvn test` exitosamente con 3 tests ejecutados, 0 fallos, 0 errores (BUILD SUCCESS).
