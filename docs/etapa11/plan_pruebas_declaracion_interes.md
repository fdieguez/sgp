# Plan de Pruebas Playwright — Declaración de Interés (Etapa 11)

**Rol:** Project Manager (PM)  
**Destinatario Técnico:** @Tester-sgp  
**Fecha:** Septiembre 2026  
**Idioma:** Español (Regla Global 1)  

---

## 🎯 Objetivo de las Pruebas
Verificar mediante pruebas automatizadas E2E (Playwright) que los 13 nuevos campos del tipo de resolución **`DECLARACION DE INTERES`**, la precarga de localidades, la subida de adjuntos (Flyer/nota), las validaciones de obligatoriedad (y opcionales) y el dictamen del resolutor funcionen al 100% en el entorno local.

---

## 🧪 Casos de Prueba Detallados

### Caso de Prueba 1: Despliegue de los 13 Campos, Precarga y Opciones
* **Objetivo:** Comprobar la visualización estructurada de los 13 campos y la precarga automática de localidad.
* **Pasos:**
  1. Iniciar sesión como `admin@sgp.com` o usuario responsable.
  2. Abrir o crear una solicitud que posea Localidad (ej: *"Santo Tomé"*).
  3. En *Asignaciones Múltiples*, agregar el área **`DECLARACION DE INTERES`**.
  4. **Aserciones Visuales:**
     * Verificar que se listen los 13 campos en orden:
       1. `Nombre completo del evento`
       2. `Actividad`
       3. `Institución a declarar`
       4. `Tipo`
       5. `Descripción`
       6. `Localidad`
       7. `Fecha`
       8. `Hora`
       9. `Dirección`
       10. `Fundamentos`
       11. `Flyer/nota`
       12. `Observaciones`
       13. `Responsable`
     * Validar que `Localidad` aparezca precargada automáticamente con *"Santo Tomé"* y permita seleccionar otras opciones.
     * Validar que el selector `Tipo` contenga las 6 opciones: *cultural, educativo, científico, deportivo, social, otro*.
     * Validar que `Fecha` sea `type="date"`, `Hora` sea `type="time"` y `Flyer/nota` sea un cargador de archivos (`type="file"`).

---

### Caso de Prueba 2: Validación de Obligatoriedad y Flexibilidad de Opcionales
* **Objetivo:** Comprobar que los 10 campos requeridos bloqueen el guardado si están vacíos, y que los 3 opcionales (`Hora`, `Observaciones`, `Flyer/nota`) permitan guardar sin problemas.
* **Pasos:**
  1. Dejar campos obligatorios vacíos y presionar *Guardar Cambios*.
  2. **Aserción:** El sistema debe emitir un toast de advertencia y bloquear la petición.
  3. Completar únicamente los 10 campos obligatorios (dejando intencionalmente vacíos `Hora`, `Observaciones` y `Flyer/nota`).
  4. Presionar *Guardar Cambios*.
  5. **Aserción:** El guardado debe ser exitoso (`HTTP 200`).
  6. Reabrir la solicitud y validar que los 10 datos completados se hayan persistido fielmente.

---

### Caso de Prueba 3: Carga de Adjunto (Flyer/nota) y Dictamen del Resolutor
* **Objetivo:** Verificar la subida y visualización de archivos adjuntos (PDF/JPG) y la firma del resolutor de Declaración de Interés.
* **Pasos:**
  1. Reabrir la solicitud y adjuntar un archivo de prueba en `Flyer/nota` (ej: un PDF o JPG simulado), completando también `Hora` y `Observaciones`.
  2. Guardar y verificar que el enlace del archivo se visualice correctamente en la tarjeta de asignación.
  3. Cerrar sesión e iniciar sesión como el Resolutor de Declaración de Interés (`ealfaro.51@gmail.com`).
  4. Abrir la solicitud, validar que los 13 campos se lean correctamente en modo lectura con el enlace al Flyer/nota.
  5. Hacer clic en *Aprobar*, registrar comentarios y confirmar la resolución.
  6. **Aserción:** La asignación debe quedar con estado de resolución aprobada.
