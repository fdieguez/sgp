# Plan de Pruebas y Certificación QA — Versión 1.1.0 (Playwright)

> **Módulo:** Personas (Fuzzy Search & Vista 360°), Notificaciones Livianas y Agenda (Google Calendar)  
> **Versión:** SGP 1.1.0  
> **Rama Oficial:** `feature/release-1.1.0`  
> **Destinatario:** Equipo de Aseguramiento de la Calidad (QA) / Desarrolladores  
> **Automatización:** Playwright Test Suite (`code/frontend/tests/version_1_1_0_qa.spec.js`)

---

## 🎯 1. Objetivo del Plan de Pruebas
Validar integralmente y certificar el correcto funcionamiento de los **7 Casos de Uso (CDUs)** incorporados en la **Versión 1.1.0** del Sistema de Gestión Política (SGP), garantizando que las nuevas capacidades operativas no hayan introducido regresiones en los flujos principales del sistema.

### Alcance de la Versión 1.1.0:
1. **📦 Módulo A (Personas):**
   - **CDU-06:** Autocompletado flexible (*Fuzzy search*) multi-columna con debounce de 300 ms.
   - **CDU-07:** Vista 360° e historial contextual del solicitante (badge con desglose de solicitudes).
   - **CDU-08:** Detección interactiva de colisión de DNI preexistente con alerta amigable.
   - **CDU-09:** Reutilización de autocompletado en campos dinámicos de formularios (Subsidios y Agenda).
2. **📧 Módulo B (Notificaciones):**
   - **CDU-10:** Envío automático liviano de correo al Responsable Territorial con enlace directo `?id={id}`.
3. **📅 Módulo C (Agenda & Google Calendar):**
   - **CDU-14:** Gestión CRUD de invitados frecuentes (Nombre y correo `@gmail.com`).
   - **CDU-15:** Selector dinámico de invitados en el modal de resolución con integración a Google Calendar API.

---

## 💻 2. Entorno y Precondiciones para QA

Para garantizar que las pruebas se ejecuten sin alterar el entorno local réplica de producción (`sgp_db`), se debe utilizar el esquema aislado de base de datos:

1. **Base de Datos:** `sgp_dev_v1_1` (MySQL 8, puerto local 3306).
2. **Backend (Spring Boot 3):**
   ```powershell
   cd code/backend
   mvn spring-boot:run -Dspring-boot.run.profiles=dev
   ```
   *Debe responder en `http://localhost:8080/api/health` o `/api/solicitudes`.*
3. **Frontend (Vite / React):**
   ```powershell
   cd code/frontend
   cmd.exe /c "npm run dev"
   ```
   *Debe responder en `http://localhost:5173`.*

---

## 👥 3. Usuarios y Credenciales de Prueba

| Rol | Correo Electrónico | Contraseña | Propósito |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@sgp.com` | `SGP_Admin_#2026_Prod_Secure_!` | Cobertura total de funciones y configuración |
| **Resolutor** | `resolutor@sgp.com` | `password123` | Gestión de Agenda y resolución de solicitudes |
| **Operador** | `celeste_solari19@hotmail.com` | `password123` | Carga de solicitudes y prueba de autocompletado |

---

## 📋 4. Matriz de Casos de Prueba (Detalle Paso a Paso)

---

### Caso TC-V1.1-01: Autocompletado Flexible con Debounce (CDU-06)
* **Objetivo:** Comprobar que el componente `PersonAutocomplete` filtre por nombre, apellido o DNI en tiempo real con tolerancia a mayúsculas/minúsculas y acentos.
* **Precondiciones:** Sesión iniciada como Administrador u Operador en `/mis-solicitudes`.
* **Pasos:**
  1. Hacer clic en el botón **"Nueva Solicitud"**.
  2. En el campo *"Nombre Completo / Institución"*, tipear al menos 2 caracteres (ej: `gonz` o `perez`).
  3. Esperar 300 ms.
  4. Observar la lista desplegable de sugerencias.
  5. Tipear un número de DNI existente para verificar búsqueda por documento.
* **Resultado Esperado:**
  - El listado desplegable muestra coincidencias formateadas como: `Nombre Completo — DNI: [número] — [Localidad]`.
  - Si no hay coincidencias, se muestra la opción destacada para dar de alta a la persona.
  - Al seleccionar una coincidencia, los campos DNI, Teléfono y Localidad se completan automáticamente.

---

### Caso TC-V1.1-02: Vista 360° e Historial de Solicitudes (CDU-07)
* **Objetivo:** Validar la presentación del resumen de antecedentes del solicitante.
* **Precondiciones:** Persona seleccionada que posea solicitudes registradas en la base de datos.
* **Pasos:**
  1. En el modal de nueva solicitud o edición, autocompletar una persona que tenga solicitudes previas.
  2. Observar la sección inferior al nombre del solicitante.
* **Resultado Esperado:**
  - Se visualiza un badge informativo con icono de historial:  
    `"X solicitudes registradas (Y Pendientes, Z Aprobadas)"`.
  - El recuento coincide con los registros históricos del backend.

---

### Caso TC-V1.1-03: Detección de Inconsistencia por DNI (CDU-08)
* **Objetivo:** Alertar visualmente si el operador ingresa un DNI preexistente pero con otro nombre.
* **Precondiciones:** Conocer un DNI ya cargado en el sistema (ej: DNI de Juan Pérez).
* **Pasos:**
  1. En el modal de nueva solicitud, escribir en el campo de Nombre: `Carlos Gómez`.
  2. En el campo DNI, ingresar el DNI de Juan Pérez.
  3. Quitar el foco del campo DNI (hacer clic afuera o presionar Tab).
* **Resultado Esperado:**
  - Se despliega una alerta amigable de advertencia:  
    *"El DNI ingresado ya pertenece a [Juan Pérez]. ¿Desea utilizar sus datos?"*.
  - Se exhibe el botón interactivo **"Usar datos registrados"**.
  - Al presionarlo, el formulario se actualiza instantáneamente con los datos oficiales de Juan Pérez.

---

### Caso TC-V1.1-04: Reutilización en Campos Dinámicos (CDU-09)
* **Objetivo:** Verificar que el autocompletado funcione en campos secundarios de formularios dinámicos.
* **Precondiciones:** Seleccionar un Tipo de Solicitud como *"Subsidio Institucional"* o *"Agenda"*.
* **Pasos:**
  1. Ir a los campos específicos de la planilla (ej: `Responsable 1: Nombre`, `Responsable 2: Nombre`).
  2. Escribir un término de búsqueda en el campo de texto.
  3. Seleccionar una persona de la lista de sugerencias.
* **Resultado Esperado:**
  - El componente autocompleta el nombre del responsable y rellena de forma sincronizada el campo adyacente `Responsable 1: DNI`.

---

### Caso TC-V1.1-05: Redirección y Apertura Directa por URL (CDU-10)
* **Objetivo:** Validar que el link provisto en el correo institucional abra el modal de la solicitud directamente.
* **Precondiciones:** Conocer el ID de una solicitud existente (ej: ID `1`).
* **Pasos:**
  1. Iniciar sesión en el sistema.
  2. Abrir en el navegador la URL directa: `http://localhost:5173/mis-solicitudes?id=1`.
* **Resultado Esperado:**
  - La aplicación carga la vista de solicitudes e inmediatamente levanta el modal de la solicitud `#1` con toda su información detallada.

---

### Caso TC-V1.1-06: Gestión de Invitados Frecuentes de Agenda (CDU-14)
* **Objetivo:** Crear, listar y eliminar contactos invitados frecuentes para eventos de Google Calendar.
* **Precondiciones:** Sesión con rol Administrador o Resolutor de Agenda.
* **Pasos:**
  1. Navegar a la configuración de Agenda (`/resolutor-settings` o pestaña de configuración).
  2. Localizar la sección **"Invitados Frecuentes de Agenda"**.
  3. Ingresar Nombre (ej: `Coordinación General`) y Correo Gmail (ej: `coordinacion.qa@gmail.com`).
  4. Presionar **"Agregar Invitado"**.
  5. Probar la eliminación de un invitado haciendo clic en el icono de papelera.
* **Resultado Esperado:**
  - El invitado se agrega a la lista visible y se persiste en la base de datos (`agenda_guests`).
  - Al recargar la página, el invitado permanece en el listado.
  - Al presionar eliminar, se remueve inmediatamente tras la confirmación.

---

### Caso TC-V1.1-07: Selección de Invitados al Crear Evento en Calendar (CDU-15)
* **Objetivo:** Permitir marcar invitados frecuentes que serán enviados a la API de Google Calendar al aprobar.
* **Precondiciones:** Existencia de invitados configurados y solicitud de Agenda en estado para resolver.
* **Pasos:**
  1. Abrir el modal de resolución de una solicitud de Agenda.
  2. Marcar el checkbox **"Crear evento en Google Calendar"**.
  3. Verificar la aparición del panel con la lista de invitados disponibles.
  4. Marcar uno o varios invitados mediante sus checkboxes.
  5. Completar los datos de fecha, hora y confirmar la aprobación.
* **Resultado Esperado:**
  - El backend recibe el arreglo `guestEmails` y los asocia a los `attendees` del evento en Google Calendar.
  - La solicitud queda aprobada y se visualiza el link al evento creado.

---

## 🚀 5. Guía de Ejecución Automatizada con Playwright

El proyecto cuenta con una suite E2E específica en [`code/frontend/tests/version_1_1_0_qa.spec.js`](file:///c:/Users/fran/dev/projects/SGP/code/frontend/tests/version_1_1_0_qa.spec.js).

### A. Ejecución Rápida en Terminal (Headless)
```powershell
cd code/frontend
npx playwright test tests/version_1_1_0_qa.spec.js --project=chromium
```

### B. Ejecución con Navegador Visible (Headed / Observación visual)
```powershell
cd code/frontend
npx playwright test tests/version_1_1_0_qa.spec.js --project=chromium --headed
```

### C. Ejecución Interactiva con UI Mode (Depuración paso a paso)
```powershell
cd code/frontend
npx playwright test tests/version_1_1_0_qa.spec.js --ui
```

### D. Visualización de Reportes HTML y Capturas
Al finalizar las pruebas, para revisar el reporte generado con capturas de pantalla y trazas:
```powershell
cd code/frontend
npx playwright show-report
```

---

## ✅ 6. Checklist de Aprobación para Pase a Producción

- [ ] Todos los tests unitarios e integrados de Spring Boot (`mvn test`) pasan en verde (18/18).
- [ ] La suite de Playwright (`version_1_1_0_qa.spec.js`) finaliza con 100% de éxito en Chromium.
- [ ] No se observan errores en la consola del navegador durante el flujo de autocompletado.
- [ ] Los scripts SQL de migración se ejecutaron en el entorno de pruebas sin advertencias.
- [ ] Verificación de retrocompatibilidad: la base original `sgp_db` se mantiene intacta.
- [ ] El equipo de QA emite el visto bueno para proceder al merge manual de `feature/release-1.1.0` hacia `main`.
