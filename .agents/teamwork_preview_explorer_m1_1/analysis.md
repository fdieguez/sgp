# Análisis Detallado de Código Backend - SGP (Tareas 1, 2 y 3a)

**Fecha:** 31 de Julio de 2026  
**Autor:** Explorador 1 (Backend)  
**Directorio de trabajo:** `c:\Users\fran\dev\projects\SGP\.agents\teamwork_preview_explorer_m1_1`

---

## 1. Análisis de `EmailService.java` (Tarea 1)

### Ubicación del código
- **Archivo:** `code/backend/src/main/java/com/sgp/backend/service/EmailService.java`
- **Firma del método:** `@Async public void sendSubsidioApprovedEmail(String resolutorEmail, Long subsidioId)` (Líneas 33-101)

### Firma y Estructura Actual
```java
@Async
public void sendSubsidioApprovedEmail(String resolutorEmail, Long subsidioId) {
    System.out.println("📧 Iniciando proceso de envío de correo electrónico para el Subsidio #" + subsidioId);
    try {
        Solicitud solicitud = solicitudRepository.findById(subsidioId)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));
        ...
        // Acceso a relaciones Lazy:
        String beneficiario = solicitud.getPerson() != null ? solicitud.getPerson().getName() : "Sin Beneficiario";
        ...
        if (solicitud.getAdjuntos() != null && !solicitud.getAdjuntos().isEmpty()) {
            for (DocumentoAdjunto adjunto : solicitud.getAdjuntos()) {
                ...
            }
        }
        ...
    } catch (Exception e) { ... }
}
```

### Impacto de agregar `@Transactional(readOnly = true)`
1. **Comportamiento Asíncrono e Hilos Independientes:**
   El método está anotado con `@Async`, lo que provoca que Spring lo ejecute en un hilo separado del pool de tareas (TaskExecutor). Al ejecutarse en un hilo distinto al hilo solicitante del HTTP Request, el método no hereda el contexto transaccional ni la sesión de Hibernate del hilo original.

2. **Problema de Carga Diferida (Lazy Loading):**
   La entidad `Solicitud` contiene colecciones con carga perezosa (`@OneToMany`), como `adjuntos` (`List<DocumentoAdjunto>`). Sin un contexto transaccional activo en el hilo asíncrono, la llamada `solicitudRepository.findById(subsidioId)` abre y cierra una sesión de Persistence Context en el momento del `findById`. Posteriormente, cuando se accede a `solicitud.getAdjuntos()` (línea 78), Hibernate intenta inicializar la colección pero la sesión ya se encuentra cerrada, provocando una excepción de tipo `LazyInitializationException`.

3. **Efecto de `@Transactional(readOnly = true)`:**
   - **Sesión de Hibernate Activa:** Garantiza que se mantenga abierta una transacción de solo lectura y una sesión de Hibernate durante toda la ejecución del método asíncrono en su propio hilo.
   - **Navegación Segura de Colecciones:** Permite la inicialización bajo demanda (Lazy Loading) de `solicitud.getAdjuntos()` y de la entidad relacionada `solicitud.getPerson()`.
   - **Optimización de Rendimiento:** La opción `readOnly = true` le indica al proveedor JPA/Hibernate y al driver JDBC que no se realizarán modificaciones de persistencia (desactiva el dirty checking de entidades y optimiza los recursos de BD).

---

## 2. Análisis de `SolicitudService.java` - Método `aprobarAsignacion` (Tarea 2)

### Ubicación del código
- **Archivo:** `code/backend/src/main/java/com/sgp/backend/service/SolicitudService.java`
- **Método:** `aprobarAsignacion` (Líneas 618-674)

### Estado Actual del Chequeo de Tipo
En el código actual:
```java
// Línea 627:
if ("AGENDA".equalsIgnoreCase(solicitud.getType())) { ... }

// Línea 635-638: Obtiene la asignación específica del resolutor
SolicitudResolutorAssignment assignment = solicitud.getResolutorAssignments().stream()
        .filter(a -> a.getResolutor().getId().equals(resolutor.getId()) && !a.getApproved())
        .findFirst()
        .orElseThrow(() -> new RuntimeException("Asignación pendiente no encontrada para este resolutor"));

...
// Líneas 652 y 671:
if ("AGENDA".equalsIgnoreCase(saved.getType())) {
    ...
} else if ("SUBSIDIO".equalsIgnoreCase(saved.getType())) {
    emailService.sendSubsidioApprovedEmail(resolutor.getEmail(), saved.getId());
}
```

### Inconsistencia Detectada
- **Evaluación sobre la Solicitud General (`saved.getType()`):** Actualmente se evalúa el campo `type` de la entidad general `Solicitud` (`solicitud.getType()`), en lugar del campo `tipoResolucion` de la asignación individual `assignment.getTipoResolucion()`.
- **Estructura Multi-Resolutor:** En el modelo actual de SGP, una solicitud puede poseer múltiples resolutores asignados mediante la entidad `SolicitudResolutorAssignment`. Cada `SolicitudResolutorAssignment` almacena su propio tipo de resolución en el atributo `tipoResolucion` (ej: `"SUBSIDIO"`, `"AGENDA"`, `"MATERIALES"`, etc.).
- **Consecuencia de la Inconsistencia:** Si la solicitud tiene varias asignaciones o si el tipo general de la solicitud difiere del tipo de resolución específico del resolutor que está aprobando, el chequeo actual fallará o ejecutará acciones incorrectas. Por ejemplo:
  - Si una solicitud tiene `solicitud.getType()` diferente de `"SUBSIDIO"`, pero la asignación de este resolutor es de tipo `"SUBSIDIO"`, no se enviará el correo de notificación.
  - Si `solicitud.getType()` es `"SUBSIDIO"`, pero este resolutor aprueba una asignación de otro tipo, se intentaría enviar el correo de subsidio incorrectamente.

### Propuesta de Corrección
Se debe verificar el tipo de resolución a partir de `assignment.getTipoResolucion()`.

**Fragmento de código corregido sugerido:**
```java
// Modificar la verificación post-guardado en aprobarAsignacion:
String tipoResolucion = assignment.getTipoResolucion();

if ("AGENDA".equalsIgnoreCase(tipoResolucion)) {
    if (calendarData != null && "true".equals(calendarData.get("createEvent"))) {
        String calendarId = calendarData.get("calendarId");
        if (calendarId == null || calendarId.trim().isEmpty()) {
            if (saved.getSheetsConfig() != null && saved.getSheetsConfig().getCalendarId() != null && !saved.getSheetsConfig().getCalendarId().trim().isEmpty()) {
                calendarId = saved.getSheetsConfig().getCalendarId();
            }
        }
        if (calendarId == null || calendarId.trim().isEmpty()) {
            calendarId = emailResolutor;
        }
        String title = calendarData.get("title");
        String description = calendarData.get("description");
        String location = calendarData.get("location");
        String date = calendarData.get("date");
        String time = calendarData.get("time");
        
        googleCalendarService.createEvent(calendarId, title, description, location, date, time, saved.getId());
    }
} else if ("SUBSIDIO".equalsIgnoreCase(tipoResolucion)) {
    emailService.sendSubsidioApprovedEmail(resolutor.getEmail(), saved.getId());
}
```

---

## 3. Análisis de `SolicitudService.java` - Método `ponerEnConsideracion` (Tarea 3a)

### Ubicación del código
- **Archivo:** `code/backend/src/main/java/com/sgp/backend/service/SolicitudService.java`
- **Método actual:** `ponerEnConsideracion(Long id)` (Líneas 679-689)

### Estado Actual del Método
```java
@org.springframework.transaction.annotation.Transactional
public Solicitud ponerEnConsideracion(Long id) {
    Solicitud solicitud = solicitudRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));

    solicitud.setStatus("consideracion");
    Solicitud saved = solicitudRepository.save(solicitud);

    logAssignmentChange(saved, null, "PUESTA EN CONSIDERACIÓN");
    return saved;
}
```

### Análisis de Requerimientos y Componentes
1. **Obtención del Usuario Autenticado:**
   - En el ecosistema de Spring Security configurado en SGP, la autenticación actual se recupera desde el contexto de seguridad mediante:
     `Authentication auth = SecurityContextHolder.getContext().getAuthentication();`
   - El email del usuario autenticado se obtiene con `auth.getName()`.
   - Luego, se busca el objeto `User` en la base de datos a través de `userRepository.findByEmail(email)`.

2. **Verificación de Rol "RESOLUTOR":**
   - El rol del usuario está disponible mediante `user.getRole()`.
   - La comprobación del rol se efectúa ignorando mayúsculas: `"RESOLUTOR".equalsIgnoreCase(user.getRole())`.

3. **Verificación de la Competencia "SUBSIDIO" en Formatos Dinámicos / Tipos de Resolución:**
   - En el modelo de dominio (`User.java`), las competencias o formatos dinámicos asociados a un resolutor se representan mediante la relación `@ManyToMany Set<TipoResolucion> tiposResolucion`.
   - Cada objeto `TipoResolucion` posee la propiedad `tipo` (ej: `"SUBSIDIO"`, `"AGENDA"`).
   - Para verificar si el resolutor posee la competencia `"SUBSIDIO"`:
     ```java
     boolean tieneCompetenciaSubsidio = user.getTiposResolucion() != null && user.getTiposResolucion().stream()
             .anyMatch(tr -> tr.getTipo() != null && tr.getTipo().toUpperCase().contains("SUBSIDIO"));
     ```

4. **Manejo de Excepciones de Negocio:**
   - Si el usuario no está autenticado: lanzar `ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado")`.
   - Si el usuario posee rol `"RESOLUTOR"` pero carece de la competencia `"SUBSIDIO"` en sus formatos dinámicos: lanzar `ResponseStatusException(HttpStatus.FORBIDDEN, "El resolutor no posee la competencia 'SUBSIDIO' requerida para poner la solicitud en consideración")`.
   - Si la solicitud no existe: lanzar `ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada con ID: " + id)`.

### Propuesta Exacta de Implementación
```java
@org.springframework.transaction.annotation.Transactional
public Solicitud ponerEnConsideracion(Long id) {
    // 1. Obtener contexto de seguridad y usuario autenticado
    org.springframework.security.core.Authentication auth = 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();

    if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
        throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
    }

    String email = auth.getName();
    User currentUser = userRepository.findByEmail(email)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Usuario autenticado no encontrado: " + email));

    // 2. Si el usuario es RESOLUTOR, verificar si posee la competencia SUBSIDIO en sus tiposResolucion
    if ("RESOLUTOR".equalsIgnoreCase(currentUser.getRole())) {
        boolean tieneSubsidio = currentUser.getTiposResolucion() != null && currentUser.getTiposResolucion().stream()
                .anyMatch(tr -> tr.getTipo() != null && tr.getTipo().toUpperCase().contains("SUBSIDIO"));

        if (!tieneSubsidio) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, 
                    "El resolutor no posee la competencia 'SUBSIDIO' necesaria para poner la solicitud en consideración.");
        }
    }

    // 3. Buscar y actualizar el estado de la solicitud
    Solicitud solicitud = solicitudRepository.findById(id)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "Solicitud no encontrada con ID: " + id));

    solicitud.setStatus("consideracion");
    Solicitud saved = solicitudRepository.save(solicitud);

    // 4. Registrar en el historial indicando el usuario responsable de la acción
    logAssignmentChange(saved, currentUser, "PUESTA EN CONSIDERACIÓN POR " + currentUser.getName());
    return saved;
}
```
