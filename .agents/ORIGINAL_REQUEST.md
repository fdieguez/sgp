# Original User Request

## Initial Request — 2026-07-31T08:52:23Z

Corregir errores del flujo de solicitudes multirrol en SGP, específicamente la sincronización del monto de subsidio en la grilla y la habilitación del flujo de Google Calendar para resolutores de tipo Agenda cuando la solicitud principal no es de tipo Agenda.

Working directory: c:\Users\fran\dev\projects\SGP
Integrity mode: development

## Requirements

### R1. Sincronización Automática del Monto de Subsidio en el Backend
- En el backend (`SolicitudService.java`), al guardar o actualizar una solicitud, se debe verificar si posee una asignación de resolutor con `tipoResolucion = "SUBSIDIO"`.
- Si existe dicha asignación, se debe leer la propiedad `"Monto"` de su JSON de detalle y copiar ese valor numérico al campo principal `amount` de la entidad `Solicitud` antes de persistir.
- Esto asegurará que tanto la grilla del frontend como la exportación a Google Sheets (`SyncService.java`) visualicen y exporten el monto correcto de la solicitud.

### R2. Habilitación del Flujo de Google Calendar para Resolutores de Agenda
- En el frontend (`SolicitudModal.jsx`), la propiedad `myAssignment` debe buscar la primera asignación pendiente del usuario logueado usando la condición `!a.approved` para permitir aprobaciones secuenciales de un mismo usuario:
  ```javascript
  const myAssignment = formData.assignments?.find(a => a.resolutorEmail === user?.email && !a.approved);
  ```
- En el sub-modal de confirmación de aprobación (líneas ~1325 y ~1355 de `SolicitudModal.jsx`), la visibilidad de los controles de asistencia obligatoria y creación de eventos en Google Calendar debe depender del tipo de resolución de la asignación activa (`myAssignment?.tipoResolucion === 'AGENDA'`) y no del tipo principal de la solicitud (`formData.type === 'AGENDA'`).
- En la llamada de envío de aprobación, el parámetro de asistencia debe enviarse de la siguiente manera:
  ```javascript
  asistencia: myAssignment?.tipoResolucion === 'AGENDA' ? asistencia : undefined,
  ```

## Acceptance Criteria

### Verificación de Regresión y Flujo
- Al asignar a un resolutor la tarea de `"SUBSIDIO"` y completar el formulario dinámico con un monto (ej: `75000`), el monto debe reflejarse en la columna "Monto" de la grilla del proyecto del SGP y exportarse correctamente a Google Sheets con dicho valor en lugar de `0`.
- Al ingresar como resolutor de `"AGENDA"` a aprobar una solicitud cuyo tipo principal no es Agenda (ej: es `"PEDIDO"`), debe mostrarse la casilla "Crear evento en Google Calendar" y el selector de asistencia en el sub-modal de aprobación.
- Al aprobar la última asignación de resolutor pendiente, el estado de la solicitud debe cambiar automáticamente a `"completadas"`.

## Follow-up — 2026-07-31T13:37:04Z

Implementar y verificar el plan de cambios detallado en el artifact c:\Users\fran\.gemini\antigravity\brain\8212d97d-e75f-4b22-8fff-58ee54c5278e\implementation_plan.md, el cual resuelve los siguientes requerimientos:

1. **LazyInitializationException en EmailService**:
   - En `EmailService.java`, marcar el método asíncrono `@Async public void sendSubsidioApprovedEmail(...)` con la anotación `@org.springframework.transaction.annotation.Transactional(readOnly = true)` para abrir una sesión de Hibernate en el hilo secundario y permitir el lazy-loading de los adjuntos (`solicitud.getAdjuntos()`).

2. **Google Calendar en Solicitudes Multirrol / Pedido**:
   - En `SolicitudService.java`, al final de `aprobarAsignacion`, corregir las condiciones de integraciones externas (líneas ~652 y ~671). Comparar contra `assignment.getTipoResolucion()` (tipo de resolución de la asignación aprobada) en lugar de `saved.getType()` (tipo principal de la solicitud).

3. **Restricción de 'Poner en consideración' para Resolutores de Agenda**:
   - En `SolicitudService.java` (`ponerEnConsideracion`), obtener el usuario autenticado y validar que si es del rol `"RESOLUTOR"`, tenga la competencia `"SUBSIDIO"` entre sus formatos dinámicos. Si no, lanzar una excepción de negocio.
   - En `ProjectDetailsPage.jsx` (líneas ~1061 y ~1122), mostrar el botón "Poner en Consideración" solo si el usuario logueado es Administrador, Responsable o un Resolutor de Subsidio (`isResolutorSubsidio === true`).
   - En `SolicitudModal.jsx` (línea ~570), renderizar la opción `<option value="consideracion">Consideración</option>` solo para usuarios autorizados (Administrador, Responsable o Resolutor de Subsidios).

Criterios de Aceptación:
- El backend debe compilar sin errores (`mvn compile`) y pasar las pruebas existentes (`mvn test`).
- La suite de pruebas de Playwright (`tests/playwright_sgp.spec.js`) debe ejecutarse y pasar satisfactoriamente contra el servidor real.
- Todas las notas y comentarios agregados al código deben escribirse en ESPAÑOL.

