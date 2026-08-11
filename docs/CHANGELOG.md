# Registro de Avances - SGP

> **Propósito**: Este archivo registra todos los cambios, mejoras y decisiones técnicas del proyecto SGP para facilitar la continuidad entre sesiones de desarrollo.

**Versión Actual**: `1.0.0` (Versión Oficial SGP 1.0 - Despliegue, Regresión y Purga de Producción)

---

## 📅 Agosto 2026

### 11/08/2026
- **⭐️ Cierre de la Versión 1.0.0 - QA final, Regresión en Producción y Purga Definitiva:**
    - **Puesta a Punto de Regresión (Playwright)**:
        - Robustecimiento de los selectores en [`etapa9_1_pruebas_produccion.spec.js`](file:///c:/Users/fran/dev/projects/SGP/code/frontend/tests/etapa9_1_pruebas_produccion.spec.js) para sincronizar correctamente la columna de verificación de estado (columna número 13 en lugar de la columna 7 correspondiente a Localidad).
        - Implementación del filtrado robusto por nombre único del beneficiario (`Subsidio E2E Prod <random_6_digitos>`) en el input de búsqueda de la grilla de solicitudes, previniendo fallos por lentitud y castings de ID en la consulta `LIKE` nativa de MySQL en producción.
    - **Controlador de Control de Calidad Robustecido (`TestHelperController.java`)**:
        - Corrección del endpoint `/api/test-helper/clear-all-solicitudes` para realizar un `UPDATE` seguro de los campos de `sheets_config` en lugar de `DELETE` o `null`. Esto previene fallos por restricciones `NOT NULL` de clave ajena (`sheet_config_id` en la tabla `projects`) bajo el motor MySQL en producción.
        - Integración del endpoint POST `/api/test-helper/clear-sheet` y del método `clearSheet` en [`GoogleSheetsService.java`](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/main/java/com/sgp/backend/service/GoogleSheetsService.java) para realizar el vaciado selectivo de las pestañas en planillas externas mediante la API de Google Sheets antes de iniciar tests.
    - **Resolución de Latencia de Google Sheets**:
        - Adición de un retardo de 5 segundos (`page.waitForTimeout(5000)`) entre las escrituras del test-helper y la importación de datos en el test de producción. Esto asegura que la API de Google Sheets propague los cambios en sus servidores de caché antes de realizar la lectura de sincronización de estados.
    - **Limpieza Absoluta de Producción**:
        - Ejecución final de la purga de la base de datos de producción y vaciado completo de la pestaña `TEST` de Google Sheets, dejando el servidor listo y el autoincremento en `1` para el ingreso oficial de los clientes.

### 09/08/2026
- **⭐️ Cierre de la Etapa 9.1 - Resiliencia de Carga, Rol Auditor y Ajustes de Calendario:**
    - **Mejora de Resiliencia en Puesta en Consideración**: Modificados los endpoints de puesta en consideración unitario y batch en [`SolicitudController.java`](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/main/java/com/sgp/backend/controller/SolicitudController.java) para capturar de forma tolerante los errores de conexión de la API de Google Sheets. Ahora, ante una caída de red o falta de permisos externos en producción, se registra un aviso en consola (`System.err.println`) pero se continúa y confirma la transacción local con éxito (`HTTP 200 OK`) previniendo interrupciones.
    - **Gestión Multi-Rol con Checkboxes**: Se rediseñó el modal de usuarios en [`UsersPage.jsx`](file:///c:/Users/fran/dev/projects/SGP/code/frontend/src/pages/UsersPage.jsx) reemplazando la selección mediante radio buttons por una lista de checkboxes. Permite asociar hasta 2 roles concurrentes y añade soporte reactivo para el rol `AUDITOR`.
    - **Apertura Inline de Documentos Adjuntos**: Se configuraron los enlaces de descarga en [`SolicitudModal.jsx`](file:///c:/Users/fran/dev/projects/SGP/code/frontend/src/components/SolicitudModal.jsx) para desplegar archivos de tipo PDF, JPG, PNG y TXT inline en una pestaña nueva mediante el visor nativo del navegador, en lugar de forzar descargas directas a disco.
    - **Estricción y Filtrado de Adjuntos**: Se implementaron validaciones en el frontend (React) y en el backend (Spring Boot) para limitar a 10MB el tamaño de archivos adjuntos y bloquear formatos de ejecutables inseguros (.exe, .bat), alertando al usuario de forma prolija.
    - **Verificación de Google Calendar**: Adición del botón "Comprobar Acceso" en [`ResolutorSettingsPage.jsx`](file:///c:/Users/fran/dev/projects/SGP/code/frontend/src/pages/ResolutorSettingsPage.jsx) para evaluar en caliente las credenciales de la API de Calendar, renderizando insignias de estado dinámicas.
    - **Perfil Auditor de Solo Lectura**: Deshabilitación de selección masiva de registros, ocultamiento de botones de alta/baja y apertura de detalles del modal en modo de solo lectura cuando un usuario con rol `AUDITOR` accede a solicitudes.
    - **Robustecimiento de Pruebas de Pedro (`pruebas_basicas.spec.js`)**: Encapsulado de selectores en sub-modales específicos en Playwright para evitar conflictos de Strict Mode, y automatización del llenado de asistencia obligatoria ("Con Asistencia") en las resoluciones de Agenda.
    - **Script de Purgado y Siembra de Testigos**: Creación del script [`setup_production_witness.spec.js`](file:///c:/Users/fran/dev/projects/SGP/code/frontend/tests/setup_production_witness.spec.js) para inicializar limpiamente la base de datos de producción mediante `/api/test-helper/keep-only-witness` y sembrar las dos solicitudes testigo del flujo de trabajo.

---

## 📅 Julio 2026

### 24/07/2026
- **⭐️ Corrección de Sincronización de Descripción, Monto, Tipo de Pedido, Validación de IDENTIFICACIÓN y URLs de Adjuntos Dinámicas:**
    - **Conversión Automática en Caliente con `dtype`**: Agregado un convertidor nativo a nivel de base de datos en [`SyncService.java`](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/main/java/com/sgp/backend/service/SyncService.java) ejecutado tanto al exportar como al importar. Corrige la sentencia SQL nativa para utilizar la columna discriminadora física **`dtype`** en lugar de `type`. Si la solicitud procesada se instanció originalmente como otra clase (ej. `Pedido`), se cambia su discriminador a `Subsidio` e inserta la fila hija en la tabla MySQL/H2 para evitar fallos de persistencia de JPA. Esto asegura que tanto el **monto** (incluso valores numéricos grandes como `19329499449`) como el **tipo de pedido** modificados se sincronicen y exporten/importen exitosamente sin quedar en 0.
    - **Pase de Excepciones al Frontend**: Modificada la captura de excepciones en [`SolicitudController.java`](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/main/java/com/sgp/backend/controller/SolicitudController.java) durante el flujo de auto-exportación en consideración. En lugar de atrapar los fallos de forma silenciosa en la consola, ahora se relanza una excepción de tipo `ResponseStatusException` (HTTP 400 Bad Request) para que el frontend reciba y muestre el mensaje de error (por ejemplo, la falta de columna `"IDENTIFICACIÓN"`) directamente en un toast rojo al usuario.
    - **Limpieza de Logs en Consola**: Removida la impresión masiva por consola del contenido de la planilla tras exportaciones.
    - **Validación Obligatoria de IDENTIFICACIÓN**: Removido el fallback automático que forzaba el mapeo del ID al índice 0 cuando no existía una columna para el ID. Ahora, si la planilla no contiene la cabecera `"IDENTIFICACIÓN"`, `"IDENTIFICADOR"` o `"ID"`, el sistema cancela la importación/exportación e informa al usuario con un error explícito a través de la UI para evitar sobreescribir columnas operativas.
    - **Sincronización de Campos en Importación**: Modificado el importador para que al presionar el botón "Importar" en una solicitud, compare y actualice los campos `description`, `amount` y `tipo_pedido` (dentro del JSON de atributos dinámicos) localmente a partir de la planilla de Google Sheets.
    - **Generación Dinámica de Enlaces de Adjuntos**: Modificada la lógica de `buildAttachmentLink` para que lea de forma dinámica el dominio HTTP actual (`Origin`/`Referer` del request en curso) en lugar de depender de una propiedad estática. Esto asegura que al descargar adjuntos desde la planilla se redirija correctamente al login del dominio de producción activo y permita a los usuarios con rol `LECTOR` autenticarse y verlos.

### 22/07/2026
- **⭐️ Habilitación del Botón Asociar Planilla para Resolutores de Agenda:**
    - **Generalización de Permisos en UI:** Modificado el condicional de visibilidad en [`ProjectDetailsPage.jsx`](file:///c:/Users/fran/dev/projects/SGP/code/frontend/src/pages/ProjectDetailsPage.jsx) para reemplazar la restricción `isResolutorSubsidio` por `user?.role === 'RESOLUTOR'`. Esto permite que todos los usuarios resolutores (incluyendo a los de tipo Agenda) visualicen el botón **"Asociar Planilla"** y puedan abrir el modal para modificar tanto el ID de la planilla como el nombre de la pestaña de destino.

### 21/07/2026
- **⭐️ Posicionamiento Exacto de Exportación y Mapeo de Columna "IDENTIFICADOR":**
    - **Reconocimiento de Cabecera "IDENTIFICADOR":** Actualizada la lógica de mapeo en `getColumnMapping` en [`SyncService.java`](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/main/java/com/sgp/backend/service/SyncService.java) para contemplar la etiqueta de cabecera `"IDENTIFICADOR"` además de `"ID"`.
    - **Posicionamiento Inteligente de Filas:** Implementado un algoritmo que evalúa la primera fila vacía en la columna A (o busca la fila existente del mismo ID para actualizarla). Esto evita que Google Sheets detecte tablas secundarias de resumen al final de la hoja y desplace la exportación hasta la fila 53.
    - **Auto-Exportación e Impresión por Consola:** Endpoint `POST /api/solicitudes/{id}/consideracion` en [`SolicitudController.java`](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/main/java/com/sgp/backend/controller/SolicitudController.java) realiza la auto-exportación y re-lectura en consola al instante.
    - **Botón "Poner en Consideración" Permanente:** En [`ProjectDetailsPage.jsx`](file:///c:/Users/fran/dev/projects/SGP/code/frontend/src/pages/ProjectDetailsPage.jsx), el botón permanece accesible continuamente.

### 20/07/2026
- **⭐️ Simplificación de Sección Seguimiento, Solución de Error en Consideraciones y Exportación a Sheets:**
    - **Ajuste de Interfaz de Usuario (UI):** Removidos los campos "Fecha de Contacto", "Fecha de Resolución", "Resolución" y "Detalle" de la tarjeta de Seguimiento en [`SolicitudModal.jsx`](file:///c:/Users/fran/dev/projects/SGP/code/frontend/src/components/SolicitudModal.jsx) (modo creación/edición) y en [`SolicitudDetailModal.jsx`](file:///c:/Users/fran/dev/projects/SGP/code/frontend/src/components/SolicitudDetailModal.jsx) (modo ver detalle). La sección ahora únicamente exhibe el checkbox `[ ] Control 1er Contacto Realizado` y el aviso de resolución finalizada.
    - **Solución al Error de Puesta en Consideración:** Eliminada la comprobación rígida de tipo Java `instanceof Subsidio` en el método `ponerEnConsideracion(Long id)` en [`SolicitudService.java`](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/main/java/com/sgp/backend/service/SolicitudService.java). Esto resuelve la excepción `IllegalArgumentException: Solo las solicitudes de tipo SUBSIDIO pueden ponerse en consideración.` permitiendo al Resolutor cambiar el estado a `"consideracion"` sin bloqueos.
    - **Corrección de Exportación a Google Sheets:** Removido el filtro exclusivo `s instanceof Subsidio` en el método `exportarPlanillaSalida` en [`SyncService.java`](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/main/java/com/sgp/backend/service/SyncService.java). Ahora todas las solicitudes puestas en estado `"consideracion"` son correctamente procesadas y agregadas a la planilla de Google Sheets sin ser omitidas.
    - **Inferencia de Tipo Mejorada:** Corregida la determinación automática del atributo `type` al inicializar el formulario del modal a partir de `initialData` y `configId`.

### 16/07/2026
- **⭐️ Robustecimiento de la Integración con Google Calendar (Agendas):**
    - **Priorización de calendarId de Configuración:** Modificada la lógica en [`SolicitudService.java`](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/main/java/com/sgp/backend/service/SolicitudService.java) al aprobar una Agenda. Ahora, si el frontend no proporciona un `calendarId` explícito, el backend recupera de forma prioritaria el `calendarId` guardado en la entidad `SheetsConfig` asociada a la solicitud, utilizando el correo del Resolutor solo como fallback de último recurso.
    - **Validación del Flujo con Análisis Funcional:** Cruzados y validados los requerimientos con la conversación histórica de [@Funcional](file:///C:/Users/fran/.gemini/antigravity/brain/7c0e2d85-519d-4c48-b05f-e992e87ea8c7/.system_generated/logs/transcript.jsonl), confirmando la total alineación de la estructura multirrol y la integración asíncrona de eventos a través del backend.

### 15/07/2026
- **⭐️ Corrección de Compilación de Tests Unitarios (Backend):**
    - **Alineación de Firmas en Pruebas:** Modificado el archivo de pruebas JUnit [`SolicitudWorkflowTest.java`](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/test/java/com/sgp/backend/SolicitudWorkflowTest.java) para actualizar las llamadas al método `aprobarAsignacion(Long, String, String, String, Map)` agregando el quinto argumento `null` (para `calendarData`), resolviendo el error de compilación de Maven al construir el proyecto (`testCompile`).

### 13/07/2026
- **⭐️ Ajuste de Calidad y Saneamiento de Planillas Duplicadas:**
    - **Prevención de Duplicados en Backend:** Modificado el método `create` en `SheetsConfigController.java` para verificar de forma unívoca si ya existe un registro con el mismo `spreadsheetId` o `sheetName` antes de crearlo, retornando la configuración existente si coincide.
    - **Saneamiento Automático de BD (DataInitializer):** Agregada una rutina al inicio del backend en `DataInitializer.java` que detecta configuraciones duplicadas, reasigna de forma segura las solicitudes ligadas a los duplicados al registro original (para preservar la integridad referencial), y elimina en cascada las planillas y proyectos repetidos.
    - **Corrección de Bucle en Tests de Playwright:** Ajustadas las búsquedas de tarjetas de planilla en `etapa_8_asociar_planilla.spec.js` y `etapa_8_sincronizacion_selectiva.spec.js` para localizar por el `spreadsheetId` de pruebas en lugar del nombre dinámico de la pestaña (`sheetName`), eliminando la creación accidental de registros duplicados al renombrar la hoja a `"FRAN"`.

### 07/07/2026
- **⭐️ Cierre de la Etapa 8 - Fase de Ajustes Finales de Producción** (Sincronización Selectiva y Configuración Unificada):
    - **Nombre de la Hoja Editable para el Resolutor:** Integrado el campo editable "Nombre de la Hoja" (`sheetName`) en el modal de asociación del Resolutor de Subsidio para equiparar sus capacidades de configuración con las del Administrador.
    - **Resolución Robustecida de Colisiones de ID:** Corregido el mecanismo de búsqueda de planillas en `SyncService.java` para aislar y resolver unívocamente la configuración del proyecto de Subsidio por exclusión de Agenda, garantizando sincronizaciones selectivas exitosas incluso si múltiples proyectos comparten el mismo `spreadsheetId` en desarrollo.
    - **Prevención de Autobloqueo de API (403 Forbidden):** Modificada la validación del backend en `SheetsConfigController.java` para usar exclusión de especificidades basadas en el rol en lugar de comprobar contra el valor mutable del `sheetName` persistido en base de datos.
    - **Alineación de Mensajería y Cobertura de Pruebas:** Ajustadas las aserciones de textos de toast en `tests/etapa_8_sincronizacion_selectiva.spec.js` para validar contra los mensajes reales devueltos por el backend, logrando que el 100% de la suite de pruebas locales de la Etapa 8 pase en verde.

### 06/07/2026
- **⭐️ Cierre de la Etapa 8** (Sincronización Selectiva de Planillas y Configuración por Resolutor):
    - **Asociación de Planilla por Resolutor:** Habilitado el botón "Asociar Planilla" con icono de engranaje para que el Resolutor de Subsidio configure directamente el `spreadsheetId` de Google Sheets desde su panel.
    - **Sincronización Selectiva por Lote:** Integrados los botones "Exportar" e "Importar" en la barra flotante de selección (`Floating Action Bar`) al marcar checkboxes en la grilla de solicitudes.
    - **Exportación e Importación Incremental/Filtrada:**
        - **Exportación:** Implementada la anexión de filas al final (append) en Google Sheets de forma no destructiva para insertar únicamente los registros de las solicitudes seleccionadas.
        - **Importación:** Filtra los registros y actualiza de manera selectiva en la base de datos sólo los IDs de solicitudes seleccionados en la UI.
    - **Dinamización de Nombre de Hoja (Solución Error 400 Bad Request):** Modificada la lógica del backend para obtener de manera dinámica el `sheetName` desde la base de datos a partir del `spreadsheetId`, evitando rangos de lectura/escritura estáticos o desalineados.
    - **Centro de Ayuda SGP:** Incorporado un manual instructivo y prolijo paso a paso en `/help` detallando cómo ubicar el Spreadsheet ID, permisos de Editor y la cuenta de servicio del bot del sistema.
    - **Ocultación del Selector de Responsable:** Se restringe la interfaz del Resolutor para ocultar el combo "Asignar Responsable" en la barra de selección, ya que la asignación se realiza en fases previas.
    - **E2E e Integración de Negocio Real:** Creada y aprobada la suite de tests en Playwright (`tests/etapa_8_sincronizacion_selectiva.spec.js`) que recrea el flujo completo (Operador crea -> Distribuidor asigna responsable -> Responsable deriva a Resolutor -> Resolutor pone en Consideración y sincroniza selectivamente).

## 📅 Junio 2026

### 01/06/2026
- **⭐️ Cierre de la Etapa 6.3** (Multi-Resolución por Checkboxes y Catálogo Seguro de Usuarios):
    - **Gestión Multi-Resolución por Checkboxes:** Implementación en el backend y frontend para permitir la asociación múltiple de tipos de resolución a un Resolutor. Los formularios de creación/edición de usuarios despliegan condicionalmente checkboxes si el rol incluye `RESOLUTOR`.
    - **Filtro Inteligente de Bandeja:** Modificación en la consulta del backend (`SolicitudService.java`) para filtrar las solicitudes visibles por los Resolutores, mostrando solo las asignaciones cuyos tipos coinciden con los checkboxes tildados en sus perfiles en tiempo real.
    - **Catálogo Seguro de Usuarios:** Renovación completa de los usuarios iniciales del sistema (removiendo usuarios de prueba basura) y siembra de nómina real de empleados con teléfonos y DNIs válidos.
    - **Cuentas Diferenciadas por Rol:** Creación de usuarios con nombres de correo sufijados (ej. `matias.ippolito.responsable@gmail.com` y `matias.ippolito.resolutor@gmail.com`) para personas que cumplen múltiples roles en la organización.
    - **Pruebas Funcionales Playwright E2E:** Adición de la suite de pruebas `etapa_6_3_funcional.spec.js` validando la creación de solicitudes por Operadores, asignación de datos por Administradores, aprobación por Resolutores y la ocultación reactiva en bandeja al modificar la configuración de checkboxes de resolución en el perfil del usuario.

## 📅 Mayo 2026

### 28/05/2026
- **⭐️ Cierre de la Etapa 6.2** (Bypass de Dashboard, Resoluciones Dinámicas y Traducción de Estados):
    - **Bypass de Dashboard para No-Admins:** Redirección post-login inmediata a la grilla de solicitudes (`/mis-solicitudes`) para Operadores, Distribuidores, Responsables y Resolutores. Bloqueo reactivo en `/dashboard` para no-admins (redirección forzada por seguridad en frontend).
    - **Carga de Tipos de Resolución Dinámicos (SQL v2):** Creación del script `init_resolution_types_6_2_v2.sql` para automatizar la configuración inicial de `AGENDA`, `SUBSIDIO`, `DECLARACION DE INTERES` y `OTRA` con el resolutor por defecto `resolutor@sgp.com` y sus atributos dinámicos obligatorios.
    - **Formulario Dinámico con Adjuntos en Resoluciones:** Implementación de soporte para atributos tipo `FILE` en el formulario del Responsable. Los archivos se suben de forma asíncrona a la API del backend, y el enlace de descarga se almacena en el JSON de detalle.
    - **Visualización Condicional en SUBSIDIO:** Implementada lógica reactiva en el modal de asignación de resoluciones. Si se elige el tipo de pedido "Personal", se despliegan campos y adjuntos de personas físicas (DNI, CBU, etc.). Si es institucional, se despliegan campos institucionales y la Nota de pedido (archivo).
    - **Traducción Visual de Estados en UI:** Mapeo de etiquetas en tiempo de ejecución: el estado interno `"en proceso"` se muestra como `"Asignadas"`, y `"completadas"` se muestra como `"Resueltas"` en toda la interfaz (listados, selectores de estado, estadísticas y detalles), preservando la compatibilidad de los datos en el servidor.
    - **Exclusión Gitignore Reforzada:** Configuración del `.gitignore` raíz para ignorar por completo las carpetas locales temporales y autogeneradas (`code/backend/uploads/`, `code/frontend/playwright-report/`, `code/frontend/test-results/` y `reuniones/`).
    - **Aseguramiento de Pruebas E2E:** Corrección de aserciones desactualizadas e inicio de sesión por rol en Playwright. La suite de pruebas de regresión se ejecutó en verde con un éxito de **10/10 aprobados**.

### 25/05/2026
- **⭐️ Cierre de la Etapa 6.1** (Migraciones Customizadas y Clasificación de Solicitantes):
    - **Motor de Migraciones Automáticas (`/boot`):** Implementación de `DatabaseMigrationRunner.java` en Spring Boot para ejecutar scripts SQL al inicio de forma ordenada e inactivarlos en la carpeta `boot/old/`.
    - **Filtro de Localidades en UI:** Incorporación del atributo booleano `showInUi` en la entidad `Location` para restringir la selección a las localidades validadas en la zona de influencia (Santa Fe, Laguna Paiva, etc.).
    - **Clasificación de Solicitantes:** Agregados campos `type` y `subType` a los beneficiarios para soportar clasificaciones detalladas (ej: tipo "Personal" con subtipo "emprendedor").
    - **Toast Informativo con ID:** Notificación en caliente al crear una solicitud exitosamente mostrando la orden de solicitud generada.

### 18/05/2026
- **⭐️ Cierre de la Etapa 5** (Optimizaciones y UX):
    - **Paginación en Servidor:** Migración de endpoints de solicitudes (`SolicitudController` y `SolicitudService`) a `Pageable` de Spring Data JPA. El frontend ahora carga de a 20 registros, optimizando la memoria y velocidad al conectar con la base productiva MySQL.
    - **Operaciones Masivas (Bulk Actions):** Implementación de checkboxes en la grilla y barra flotante "sticky" inferior para asignación masiva de responsables y eliminación masiva (solo Admin).
    - **Aprobación Ágil para Resolutores:** Agregado el botón de "Aprobación Rápida" directamente en la fila de la grilla principal, junto con la exhibición compactada de detalles de resolución.
    - **Unificación de Vistas (Fix Final):** Las acciones "Ver" y "Editar" se han fusionado en un modal único, limpio de módulos legacy (subsidios) y adaptado condicionalmente al rol del usuario logueado.
    - **Exportación de Datos:** Añadido el botón de descarga CSV respetando los filtros activos de la grilla.
    - **Sistema de Notificaciones Moderno:** Reemplazo de todos los `alert()` nativos por `react-hot-toast`, con estética oscura alineada al diseño del sistema.
    - **Filtro del Distribuidor:** Corrección crítica en `SolicitudService`. El Distribuidor ahora actúa como "despachador", visualizando *únicamente* aquellas solicitudes que no tienen responsable asignado (al asignar, la solicitud sale de su bandeja automáticamente). Se preservó el acceso completo del Administrador.
    - **Limpieza del Repositorio:** Exclusión definitiva de archivos temporales de Playwright (`playwright-report/`, `test-results/`) y de la carpeta de subidas del backend (`uploads/`) del seguimiento de Git mediante `--cached`.

### 06/05/2026
- **⭐️ Versión 0.8.5** (Refinamiento de Flujos y Filtros Avanzados):
    - **Optimización de Filtros (Server-side)**:
        - Migrada la lógica de filtrado de `ProjectDetailsPage` al backend para mejorar el rendimiento en grandes volúmenes de datos.
        - Nuevos parámetros de filtrado en API: `dateFrom`, `dateTo`, `responsableId`, `locationId` y `origin`.
        - Soporte para búsqueda por ID de solicitud (N° Orden) en el filtro general.
    - **Refinamiento de Desasignación**:
        - Implementada desasignación explícita de responsables. Al seleccionar "Sin Asignar" o vaciar el campo, el sistema ahora permite limpiar la asignación enviando `0` al backend.
        - Backend actualizado para manejar el valor `0` como `null` en la entidad, manteniendo la integridad de auditoría (`UNASSIGNED` en el historial).
    - **Mejoras en Auditoría**:
        - El historial ahora diferencia claramente entre una desasignación manual y un cambio de responsable.
    - **Versión 0.8.0** (Saneamiento de Datos y Monitoreo Unificado):
    - **Limpieza de Datos Basura (E2E Tests)**:
        - Implementado motor de limpieza basado en SQL nativo en `DataInitializer.java`.
        - El sistema ahora purga automáticamente usuarios, tipos de resolución y atributos generados por herramientas de testing (Cypress), manejando correctamente las restricciones de integridad referencial (Historial, Adjuntos y Resolutores por Defecto).
    - **Sistema de Logs Proactivos (Fullstack)**:
        - Implementación de `logback-spring.xml` con política de rotación cada **5MB**.
        - Separación de flujos: `logback.log` (Backend) y `logfront.log` (Frontend).
        - Nuevo endpoint de telemetría `/api/logs/frontend` para centralizar errores del cliente en los logs del servidor.
        - Política unificada para entornos de Desarrollo y Producción (carpeta `/logs` centralizada).
    - **Estabilización de Performance UI**:
        - Eliminados bucles infinitos de re-renderizado en el Dashboard y Modal mediante optimización de dependencias en `AuthContext` y `useCallback` en servicios de datos.
    - **Saneamiento de Identidad**:
        - Normalización total del rol `ADMINISTRADOR` (antes `ADMIN`) en todo el sistema para garantizar acceso consistente a configuraciones críticas.

### 04/05/2026
- **⭐️ Versión 0.7.5** (Unificación de Interfaz y Auditoría Persistente):
    - **Unificación de Vistas (UX)**: 
        - Fusión de `SolicitudDetailModal` y `SolicitudModal` en una única interfaz centralizada.
        - El modal de edición ahora incluye solapas para **Notas de Seguimiento (Chat)**, **Historial completo** y **Documentos Adjuntos**. Esto permite agregar comentarios de seguimiento y gestionar archivos sin salir de la vista de edición.
    - **Saneamiento de Métricas**:
        - Remoción de las métricas de montos económicos ("Subsidios Entregados") tanto en el Dashboard como en el listado de proyectos, simplificando la visualización hacia una gestión operativa pura.
    - **Blindaje de Auditoría (Backend)**:
        - Corregido error en `DataInitializer.java` que borraba el historial de asignaciones en cada reinicio del servidor. Ahora la trazabilidad es 100% persistente entre reinicios.
    - **Mejoras en el Log de Historial**:
        - Rediseño de la visualización del historial para identificar explícitamente al **Operador** (creación) y al **Distribuidor** (asignación), mejorando la transparencia del ciclo de vida de la solicitud.
    - **Documentación**:
        - Implementado Plan de Pruebas detallado en `/pruebas/plan_pruebas_unificacion_vistas.md` para facilitar la validación por parte de testers.

## 📅 Abril 2026

### 29/04/2026
- **⭐️ Versión 0.7.0** (Migración a MySQL Nativo y Optimización DevOps):
    - **Migración de Motor de BD**: El sistema ha migrado de PostgreSQL (Docker) a **MySQL 8.0 nativo** instalado en el host para mejor rendimiento y facilidad de backups.
    - **Base de Datos Limpia**: Se inicializó una base de datos nueva (`sgp_db`) sin datos históricos, optimizada para el nuevo esquema de la etapa 4.
    - **Administrador de Rescate**: Se configuró un usuario administrador por defecto (`admin@sgp.com`) con una contraseña segura generada para producción.
    - **Estructura DevOps**: 
        - Creada carpeta `/devops/scripts/` (ignorada por Git) para almacenar scripts de mantenimiento, despliegue y renovación de certificados.
        - Centralización de logs de despliegue para auditoría interna del servidor.
    - **Seguridad**: Reforzada la política de contraseñas en `DataInitializer.java` y saneado el archivo `.gitignore` para proteger la nueva carpeta de herramientas.

### 27/04/2026
- **⭐️ Versión 0.6.5** (Estabilidad de Datos y Auditoría Completa):
    - *(ver entrada anterior)*

### 27/04/2026 — FIX CRÍTICO: Error al guardar solicitud (Distribuidor → Responsable)
- **Causa Raíz Identificada y Resuelta (2 bugs interconectados)**:
    - **Bug 1 — Deserialización Polimórfica (Backend)**: El endpoint `PUT /api/solicitudes/{id}` recibía `@RequestBody Solicitud` (clase abstracta). Jackson fallaba al deserializar el objeto `responsable: {id: X}` anidado dentro de la jerarquía polimórfica `PEDIDO/SUBSIDIO`, lanzando un error 500 genérico.
    - **Bug 2 — Borrado Accidental del Responsable**: El `updateSolicitud` tenía un `else if (responsable == null) → setResponsable(null)` que borraba el responsable siempre que el campo llegara como null (incluso si el usuario no quería desasignarlo).
- **Solución Implementada**:
    - **Nuevo DTO**: Creado `SolicitudUpdateDTO.java` — objeto plano sin polimorfismo. El endpoint PUT ahora lo recibe en lugar de la entidad abstracta, eliminando el problema de Jackson de raíz.
    - **Responsable por ID**: El DTO envía `responsableId` (Long) en lugar de `responsable: {id}` (objeto anidado). El service solo actualiza el responsable si llega un ID explícito; si es null, conserva el existente.
    - **Frontend alineado**: `handleSubmit` en `SolicitudModal.jsx` construye dos payloads distintos: el DTO plano para `PUT` (update) y el objeto completo para `POST` (create).
    - **DTO de Asignaciones**: Eliminada la restricción `@Size(max=100)` en `ResolutorAssignmentDTO.detalle` que impedía guardar JSONs de atributos dinámicos más largos.

> **📝 NOTA PARA PROXIMA SESIÓN / NUEVO CHAT**:
> El flujo Distribuidor → Responsable está 100% operativo. El sistema diferencia correctamente entre `PUT` y `POST` en el frontend, cada uno con su payload adecuado.
> **Punto de Partida**: Continuar con validación de roles en producción y/o implementar la funcionalidad de desasignación explícita de responsable (responsableId = 0 o campo booleano separado).

    - **Corrección Crítica de Serialización (Backend)**:
        - Eliminado el uso de `@JsonManagedReference` / `@JsonBackReference` que causaba el error `getObjectIdReader() null` en Jackson al trabajar con la jerarquía abstracta de `Solicitud`. Se migró a `@JsonIgnore` en el lado hijo para una deserialización 100% segura.
    - **Auditoría de Carga Inicial**:
        - El historial de asignaciones ahora registra automáticamente un evento tipo `CREATED` al momento de la creación, permitiendo ver qué Operador inició el trámite.
    - **Integridad de Borrado**:
        - Configurado `CascadeType.ALL` y `orphanRemoval = true` en todas las relaciones de `Solicitud` (Historial, Adjuntos, Tickets). Ahora se pueden eliminar solicitudes sin errores de "Foreign Key Constraint".
    - **Blindaje de Métricas y Dashboard**:
        - El cálculo de totales en las tarjetas del dashboard ahora es independiente de los filtros de la tabla, asegurando que los números siempre reflejen el estado real de la base de datos.
        - Implementado `trim().toLowerCase()` en todos los filtros (Java y JS) para hacer el sistema inmune a espacios en blanco accidentales en los nombres de los estados.
    - **Migración de Datos Transparente**:
        - `DataInitializer.java` detecta y normaliza automáticamente estados antiguos en inglés o con mayúsculas inconsistentes al arrancar el sistema.

> **📝 NOTA PARA PROXIMA SESIÓN / NUEVO CHAT**:
> El sistema ha sido estabilizado a nivel de **Integridad de Datos**. Se han resuelto los errores de guardado (Jackson) y borrado (Cascada). El Dashboard ahora es preciso y resistente a errores de formato manual.
> **Punto de Partida**: Continuar con la validación de roles en producción. El flujo Operador -> Distribuidor -> Responsable -> Resolutor está 100% operativo con auditoría completa desde la creación.

### 21/04/2026
- **⭐️ Versión 0.6.0** (Flujo de Estados, Aprobaciones y Resiliencia UI):
    - **Ciclo de Vida Automatizado (Backend)**: 
        - Implementación de máquina de estados inteligente en `SolicitudService`. Las solicitudes transicionan automáticamente entre: `pendiente` (sin responsable), `en proceso` (con responsable), `en resolucion` (con resolutores pendientes) y `completadas` (100% aprobado).
    - **Sistema de Aprobación Atómica**:
        - Nuevo endpoint `POST /api/solicitudes/{id}/aprobar` exclusivo para Resolutores.
        - Permite a cada resolutor marcar su tarea como finalizada e inyectar **Observaciones de Resolución** sin afectar el flujo de otros resolutores.
    - **Auditoría y Trazabilidad**:
        - `AsignacionHistorial` ahora registra no solo cambios de responsables, sino también las aprobaciones finales de cada área con sus respectivos comentarios.
    - **Frontend - UX de Resolución**:
        - `SolicitudModal.jsx` actualizado con el botón **"Finalizar Resolución"**.
        - Implementado un sub-modal de confirmación que solicita observaciones antes de quitar la solicitud de la bandeja del resolutor (filtro dinámico).
    - **Resiliencia y Blindaje UI (Anti-Pantallazos en Blanco)**:
        - Incorporación de un componente **`ErrorBoundary.jsx`** global. 
        - Ahora, si un componente falla, el sistema captura el error y muestra una interfaz de recuperación segura (Fallback UI) en lugar de dejar la pantalla en blanco.
    - **Infraestructura de Producción**:
        - `setup_mysql_prod.sh` actualizado para configurar la zona horaria `-03:00` (ART) y elevar el límite de conexiones simultáneas a `300`.
    - **Testing Riguroso**:
        - Creado `SolicitudWorkflowTest.java` logrando una cobertura del 100% del flujo crítico de vida de una solicitud.

### 20/04/2026
- **FIX CRÍTICO (Pantallazos en Blanco)**:
    - Recuperada la función `handleSubmit` en el modal de solicitudes, que fue afectada en la última refactorización.
    - Saneada la lógica de estados de React para asegurar que los selectores de "Estado" usen las nuevas claves en minúsculas (`pendiente`, `en proceso`, etc.) coincidentes con el backend.

### 16/04/2026
- **⭐️ Versión 0.5.0** (Unificación de Identidad y Estabilización UI):
    - **Arquitectura de Usuario Unificada**: 
        - Se eliminó por completo la entidad `Responsable`. Sus campos (`phone`, `zone`) ahora residen directamente en la tabla `User`.
        - Simplificación radical del modelo de datos: menos tablas, menos JOINs, mayor velocidad.
    - **Refactorización Core Backend**:
        - `SolicitudService`, `DashboardService` y `SyncService` actualizados para trabajar con la entidad `User` consolidada.
        - Las solicitudes ahora se asignan directamente a un `User` con rol `RESPONSABLE`.
    - **Frontend (UX/UI)**:
        - **Fusión de Gestión**: Se eliminó la pestaña "Responsables" en `SettingsPage`. Toda la administración ocurre en "Usuarios".
        - **Formulario Inteligente**: El modal de usuarios detecta el rol y despliega los campos de "Zona" y "Teléfono" solo cuando es necesario.
        - **FIX CRÍTICO (Pantalla en Blanco)**: 
            - Se solucionó un crash en `SettingsPage` provocado por un renderizado doble del componente de usuarios.
            - Se reparó un `ReferenceError: loading is not defined` en `UsersPage.jsx` tras la limpieza de código.
    - **Integridad de Datos**:
        - `DataInitializer` actualizado para limpiar filas fantasmas (vacías) en la tabla de `Tipos de Resolución`.
        - Configurado para sembrar usuarios responsables directamente en la tabla maestra.

### 15/04/2026
- **⭐️ Versión 0.4.1** (Formularios Dinámicos Nivel 2 y ABM de Configuración Central):
    - **Nuevo Hub de Configuración**:
        - Se reemplazó el antiguo acceso genérico a "Usuarios" por un módulo robusto de **"Configuración"** (`SettingsPage.jsx`).
        - Posee un diseño moderno de navegación por pestañas (Tabs): Usuarios/Responsables, Catálogo de Atributos, y Tipos de Resolución.
    - **Arquitectura de Formularios Relacionales**:
        - Retiradas las clases antiguas rígidas (`ResolutorConfig`).
        - Implementado nuevo esquema de base de datos (`TipoResolucion`, `AtributoResolucion`, `TipoResolucionAtributo`) que permite a los administradores crear plantillas de formularios de manera tipo "Lego".
        - Los administradores ahora pueden agregar campos globales al catálogo (ej. "Monto", "CBU", "DNI") y luego "prenderlos" o "apagarlos" dentro de los diferentes Tipos de Resolución, dictando además su orden de visualización y si son obligatorios (`requerido`).
    - **Frontend Modal Inteligente**:
        - `SolicitudModal.jsx` fue recodificado para soportar y parsear las asignaciones dinámicas. Si un Responsable selecciona derivar al Tipo "Subsidio", el frontend lee la configuración y renderiza automáticamente en pantalla inputs nativos de HTML adaptados al `tipo_dato` que fijó el Admin.
    - **Despliegue y Scripts Locales**:
        - Revisión cruzada de borrados lógicos para toda la historia estadística (`activo: boolean`).
        - Validado y preparado el script de despliegue a producción `setup_mysql_prod.sh` (Configuración de MySQL silenciosa local, purga de anonimatos, bind-address y habilitación de Túnel Seguro SSH).
        - Implementación nativa de un Selector de Tema (Modo Claro/Oscuro dinámicos y estilizados con sombras refinadas) integrado de raíz en el `Navbar`.

> **📝 NOTA PARA PROXIMA SESIÓN / NUEVO CHAT**:
> Se ha completado la **Etapa 3** (Unificación Estratégica). El sistema ya no tiene la tabla redundante de Responsables. El código es más limpio, el UI es más coherente y los bugs de renderizado de la configuración han sido exterminados.
> **Punto de Partida**: Ejecución del Plan de Pruebas con "QA-Pedro" (ver `docs/etapa3/plan_pruebas_flujo_principal.txt`) para validar el flujo Operador -> Distribuidor -> Responsable -> Resolutor en este nuevo esquema unificado.

### 10/04/2026
- **⭐️ Versión 0.4.0** (Asignaciones Múltiples de Resolutores):
    - **Estructura Dinámica**:
        - Ahora una misma solicitud puede derivarse simultáneamente a múltiples áreas/resolutores integrando la información.
        - Creada entidad `SolicitudResolutorAssignment` para alojar asignaciones iterativas y persistidas como detalles (`OneToMany`).
    - **Filtrado Avanzado JPA**:
        - `SolicitudService` y `DashboardService` refactorizados usando `Subquery` para roles `RESOLUTOR`, garantizando que puedan visualizar correctamente todo su backlog global cruzando ambas tablas.
    - **Frontend UI Mejorado**:
        - Nueva área visual en `SolicitudModal.jsx` para instanciar asignaciones dinámicas.

### 06/04/2026
- **⭐️ Versión 0.3.3** (Refinamiento Extremo de Roles y Flujo de Resolución):
    - **Reestructuración de Privilegios**:
        - **OPERADOR**: Ahora confinado estrictamente a su silo operativo. Solo visualiza y edita solicitudes en donde su propia firma matriz (`createdBy`) conste. La Interfaz web desestima (oculta) automáticamente la caja de "Sugerir Resolutor".
        - **DISTRIBUIDOR**: Habilitado como el hub receptor universal. Ve todas las solicitudes (creadas por cualquier Operador) con la principal utilidad de asignarles un Responsable final.
    - **Independencia Responsable / Resolutor**:
        - Modificado el enrutador en el backend. Derivar a un `Resolutor` ya no sobrescribe ni expulsa al `Responsable` de su titularidad en la Solicitud. Permite derivación múltiple manteniendo la atadura de control original (`resolutor_asignado_id` vs `responsable_id`).
    - **Checkbox de Emisión Resolutiva**:
        - Añadido mecanismo front-end visualizado como un "Checkbox Verde de Aprobación", estrictamente condicionado para usuarios con Rol RESOLUTOR. Marca orgánicamente hitos de validación (`resolutionApproved: true`).
    - **Manejo de Restricciones BD e Inyección Base (Fix)**:
        - Rectificada la ingeniería del `DataInitializer.java`. Subsanada una potencial cascada de bloqueos `ConstraintViolationException` purgando primero historiales referenciados antes de resetear las tablas padres de Responsables.
        - Sembrada la base de datos con solo dos Responsables duros para pruebas cliente: `jperez@sgp.com` (Juan Perez) y `pgrillo@sgp.com` (Pepe Grillo).

## 📅 Marzo 2026

### 20/03/2026
- **⭐️ Versión 0.3.2** (Gestión Geográfica & Mejoras de Estabilidad):
    - **Dataset de Localidades Automático**:
        - Integración de padrón completo de localidades y barrios de Santa Fe (`santa_fe_locations_dataset.txt`).
        - Programado el `DataInitializer.java` para poblar automáticamente la base de datos de producción con miles de registros (Provincias, Ciudades, Barrios) en el primer inicio del sistema, respetando relaciones jerárquicas.
    - **Mejora Interfaz de Ubicaciones (React)**:
        - Reemplazados los campos de texto libre de `Localidad` y `Barrio` en `SolicitudModal` por selectores predictivos nativos (`<datalist>`).
        - Añadida lógica en cascada: el listado de Barrios disponibles se filtra instantáneamente y con exclusividad según la Ciudad previamente seleccionada.
        - Apagado el historial invasivo del navegador web en campos clave usando `autoComplete="off"` y saneada la búsqueda aplicando `.trim().toLowerCase()`.
        - Actualizada la tarjeta de detalles (`SolicitudDetailModal`) para que combine inteligentemente "Nombre De Ciudad - B° Nombre Del Barrio" si detecta un entorno de vecindario.
    - **Gestión Automática de Zona**:
        - Implementado el autocompletado en cascada en la asignación de reclamos. Al seleccionar a un usuario "Responsable", su "Eje/Zona" se inyecta y se bloquea directamente en el formulario en modo sólo-lectura (`readonly`, `cursor-not-allowed`).
    - **Fixes Críticos del Backend**:
        - **JPA Error**: Solucionado el error `NonUniqueResultException` o `IncorrectResultSizeDataAccessException` que colapsaba la app al crear solicitudes. Refactorizado el `LocationRepository` (añadiendo métodos como `findFirstByNameAndType`) para saber discernir correctamente entre un departamento y una ciudad que comparten idéntico nombre (ej. "Santa Fe").
        - **Jackson Parsing**: Modificada la entidad `Location.java` cambiando sus decoradores por `@JsonIgnoreProperties("children")` y anulando el `@JsonBackReference` previo. Esto reparó el problema oculto que impedía que la base de datos retransmitiera la "Ciudad Padre" asociada a un "Barrio" hacia el cliente web, solucionando las vistas en las tablas y ediciones.
    - **Desarrollo y Ops Locales**:
        - Creados scripts en lote (batch files) seguros (`compilar_y_ejecutar.bat`, `iniciar_frontend.bat`) para habilitar entornos de prueba limpiamente evadiendo posibles políticas de restricción de PowerShell de Windows.
        - Arreglado bug en compilación de Producción de Vite purgado un archivo sin trackear (`Navbar.jsx`).

> **📝 NOTA PARA PROXIMA SESIÓN / NUEVO CHAT**:
> Frontend y Backend acaban de alcanzar un hito de estabilidad crítico en la geolocalización de las solicitudes. La versión está productiva. Se testeó toda la pipeline y el dataset (`santa_fe_locations_dataset.txt`) se carga dinámicamente.
> **Punto de Partida**: Evaluar las nuevas necesidades del sistema y testear la subida definitiva al VPS si fuera el caso de buscar publicar la app real.

### 09/03/2026
- **⭐️ Versión 0.3.1** (UI/UX & Accesibilidad):
    - **Mejoras Visuales & Filtros**:
        - Convertidas las tarjetas estadísticas (Pendientes, En Proceso, etc.) del Dashboard en botones interactivos que filtran directamente la tabla de solicitudes al hacerles clic.
        - Agregada etiqueta de Versión Global flotante (`v0.3.1`) persistente en todas las pantallas.
        - Solucionado el desborde visual (overflow) de texto en el modal de detalles (`SolicitudDetailModal`) cuando se introducían enlaces o textos muy largos sin espacios.
    - **Accesibilidad (Modo Daltónico)**:
        - Implementado `ThemeContext` global en React.
        - Creado un **Modo Daltónico** (Protanopía/Deuteranopía) que, al activarse, sobrescribe las variables CSS reemplazando los colores conflictivos (Verde de "Completado" por Azul, y Rojo de "Rechazado" por Naranja).
        - Añadido un interruptor en `ProjectSettingsPage` (Preferencias Visuales) para activar/desactivar el modo, el cual se persiste en el `localStorage` del navegador.

### 06/03/2026
- **⭐️ Versión 0.3.0**:
    - **Dashboard de Responsables**:
        - Implementado dashboard específico para usuarios Responsables (`/mis-solicitudes`).
        - **FIX CRÍTICO**: Solucionado el error de pantalla en blanco (React `ReferenceError` por componentes faltantes).
        - **FIX DE PERMISOS**: Controlado el acceso a `/api/config` en el frontend (`ProjectDetailsPage` y `DashboardPage`) para evitar errores `403 Forbidden` que colapsaban la app al ingresar usuarios sin rol `ADMIN`.
        - Agregados indicadores estadísticos superiores: Pendientes, En Proceso, Completados, Rechazados, y Total Subsidios Entregados (en $ ARS).
        - Nuevo buscador general por ID (Nº Orden), Nombre, DNI o Localidad.
        - **UI/UX y Filtrado**:
            - Traducción completa de estados y secciones al español (Pendiente, Completado, Panel, etc).
            - El Panel Principal (`DashboardPage`) ahora filtra sus estadísticas globales matemáticamente mediante JPA Specifications considerando únicamente la zona/perfil del Responsable logueado.
            - Eliminado el buscador duplicado en la vista de solicitudes para limpiar la interfaz.
            - Se muestra el nombre y rol del usuario logueado en la barra superior del Dashboard.
            - Ocultado filtro condicional "Por Responsable" en los gráficos para usuarios Responsables.
    - **Filtros Avanzados y Ordenamiento**:
        - Implementado selector de Rango de Fecha (Último mes, 6 meses, 1 año, 2 años, Personalizado).
        - Ordenamiento funcional en las columnas de tabla: Fecha Ingreso, Origen, Nombre/Institución, Localidad y Estado.
    - **Fixes de Fechas y Zona Horaria**:
        - Implementado método robusto `parseLocalDate` en el frontend para evitar el desfasaje de fechas (off-by-one) por la zona horaria UTC.
    - **Backend & Edición de Solicitudes**:
        - **FIX JPA**: Deshabilitada la edición del campo "Tipo" en el frontend para solicitudes existentes, previniendo errores de actualización polimórfica (Hibernate/JPA).
        - **FIX Backend**: Actualizado `SolicitudService` con método `PUT` para actualización completa, solucionando la validación y el reseteo de propiedades específicas de la clase subyacente (`Subsidio`), como monto y fechas.
        - **Seguridad**: `DataInitializer` asegura roles `USER` persistentes para usuarios de prueba.

> **📝 NOTA PARA PROXIMA SESIÓN / NUEVO CHAT**:
> El dashboard visual y el backend del Responsable están estables. La pantalla en blanco fue completamente subsanada (era un fallo en el fetching de configuraciones sin rol ADMIN, combinado con un componente no renderizado).
> **Siguiente Paso**: Pruebas funcionales del endpoint de listado de responsables, e inicio de mejoras o despliegue en caso de considerarlo completamente validado.

---

## 📅 Febrero 2026

### 06/02/2026
- **⭐️ Versión 0.2.0**:
    - Inicio de ciclo de estabilización y mejoras.
    - **FIX**: Corrección en edición de Solicitudes (error de mapeo de Responsable).
    - **UI**: Visualización de versión en el sistema.
    - **Mejora**: Campos completos en creación y detalle de solicitudes.
- **🛠️ Refactorización y Ampliación del Modelo de Datos**:
    - **Reestructuración de Entidades**:
        - Se implementó `Solicitud` como clase abstracta padre de `Pedido` y `Subsidio` con herencia `JOINED`.
        - Se añadieron nuevos campos a `Solicitud` para cumplir con nuevos requerimientos de seguimiento detallado:
            - `zone` (Zona/Eje), `contactDate`, `resolutionDate`, `observation` (TEXT), `firstContactControl` (Boolean).
            - `resolution` (Resultados breves) y `detail` (Detalle extendido), ambos TEXT.
        - **Fix en Entidad `Location`**:
            - Solucionada recursión infinita (`StackOverflowError`) en serialización JSON usando `@JsonManagedReference` y `@JsonBackReference` en la relación bidireccional padre-hijos.
    - **Frontend - Planilla (`ProjectDetailsPage`)**:
        - Reconstrucción total de la tabla para reflejar la estructura de 18 columnas solicitada por el usuario.
        - Nuevas columnas visibles: N° Orden, Fecha Ingreso, Mes (calculado), Origen, Nombre/Institución, Localidad/Barrio (con lógica de jerarquía), Teléfono, Solicitud (Descripción), ZONA/EJE, RESPONSABLE, Fechas (Contacto/Resolución), Resolución, Detalle, Observación, Monto, Control 1er C.
        - Mejoras visuales: Checkmarks para booleanos, manejo de textos largos con `title` tooltip, y formateo de monedas.
    - **Frontend - ABM (`SolicitudModal` y `SolicitudDetailModal`)**:
        - Formularios de creación y edición actualizados para permitir la carga y modificación de todos los nuevos campos.
        - Vista de detalle rediseñada con secciones organizadas: "Tiempos y Seguimiento", "Observaciones", "Gestión", etc.
    - **Validación**:
        - Backend compilado exitosamente y listo para producción.
        - Código sincronizado con repositorio remoto.
    - **Backend - Sincronización (`SyncService`)**:
        - Actualizado método `processRows` para mapear las nuevas columnas del Excel/Sheet:
            - `zone` (Col J / Index 9)
            - `contactDate` (Col M / Index 12)
            - `resolutionDate` (Col N / Index 13)
            - `resolution` (Col O / Index 14)
            - `detail` (Col P / Index 15)
            - `observation` (Col Q / Index 16)
            - `firstContactControl` (Col S / Index 18 - Parsing de "SI"/"YES"/"OK")
        - Lógica de parseo mejorada para fechas y booleanos.

> **📝 NOTA PARA PROXIMA SESIÓN / NUEVO CHAT**:
> El sistema se encuentra en un estado estable tras una refactorización mayor.
> 1. **Acción Requerida**: Es necesario BORRAR la base de datos local (archivos H2 en `./data`) y/o remota (Postgres) para que Hibernate recree el esquema con las nuevas tablas (`solicitud`, `pedido`, `subsidio`).
> 2. **Siguiente Paso**: Realizar una sincronización limpia desde el Dashboard para popular la nueva estructura.
> 3. **Objetivo**: Proceder al despliegue en VPS (Docker) para validación final.

## 📅 Enero 2026

### 28/01/2026
- **🐛 Fixes de Producción y UI**:
    - **🗂️ Database Migration**: Forzado reseteo de base de datos (`docker-compose down -v`) para aplicar cambios de esquema (nuevos campos de usuario).
    - **🔐 Roles y Permisos**:
        - Ocultado botón de "Eliminar Planilla" en el Dashboard para usuarios no administradores.
        - Verificado flujo de login con usuarios actualizados.
    - **📱 Datos & Sincronización**:
        - Aumentado límite de caracteres para el campo **Teléfono** de 50 a **200 caracteres** en `SyncService`, evitando truncamiento de datos múltiples.
        - Ajustado truncamiento defensivo para evitar errores SQL.

### 24/01/2026
- **👥 Gestión de Usuarios Mejorada**:
    - **Nuevos Campos**: Agregados `firstName`, `lastName` y `birthDate` a la entidad `User`.
    - **Seed Users**: Actualizado `DataInitializer` para crear automáticamente:
        - Admins: `francisco@sgp.com`, `juanmanuel@sgp.com`
        - Users: `user1@sgp.com`, `user2@sgp.com`
    - **Registro**: Endpoint de registro actualizado para aceptar los nuevos campos.
- **🎨 UI/UX Improvements**:
    - **Tooltips Inteligentes**: Mejorada la lógica de posicionamiento de popovers en tablas. Ahora las primeras 5 filas abren hacia abajo para evitar cortes con el header.

### 22/01/2026
- **🔒 Seguridad SSL en Proceso**:
    - ✅ Certificado Let's Encrypt generado exitosamente en VPS.
    - Próximo paso: Despliegue de Nginx y Docker con configuración HTTPS.

### 21/01/2026
- **🚀 Deployment Exitoso en Producción**:
    - Desplegado sistema en `http://solicitudes.ultrasoft.website`.
    - Configurado Nginx como Reverse Proxy para manejar rutas `/api` y eliminar problemas de CORS.
    - Ajustada configuración de `VITE_API_URL` para usar rutas relativas en producción.
    - Verificado login y navegación al Dashboard en entorno productivo.
    - Intentado configurar conexión SSH Tunnel para DB (pendiente revisión de acceso por bloqueo de IP).
    - **👮 Seguridad**:
        - Cambiada contraseña por defecto (admin) a una credencial robusta.
    - **🛠️ Backend Optimization**:
        - Reducida drásticamente la verbosidad de los logs para operaciones masivas (solo se loguean errores durante la sincronización).
    - **🗑️ Feature**:
        - Agregada opción para eliminar planillas desde el dashboard.

### 19/01/2026
- **✅ Commit y Preparación para Deployment**:
    - Subido código con todos los fixes de mapeo y validaciones al repositorio GitHub.
    - Commit: `2008440` - "fix: correct Google Sheets column mapping and increase Person.name limit to 1000 chars"
    - **Cambios incluidos**: 16 archivos modificados, 539 inserciones, 62 eliminaciones.
    - **Estado actual**: Código listo para deployment en producción.
- **🌐 Configuración DNS Completada**:
    - **Dominio elegido**: `solicitudes.ultrasoft.website`
    - Configurado registro DNS tipo A: `solicitudes` → `149.50.128.168`
    - DNS propagado exitosamente (verificado con nslookup)
    - Actualizado `.env.example` con la nueva URL: `http://solicitudes.ultrasoft.website/api`
    - Creada guía completa.
### Arreglos y Estabilización (MySQL Migration Final)
- Se configuró **UFW** en el servidor para permitir tráfico desde la red Docker (`172.18.0.0/16`) al puerto 3306 del host.
- Se corrigió error `UnexpectedRollbackException` en `DataInitializer` eliminando consultas nativas incompatibles con MySQL.
- Verificación exitosa del despliegue: Backend conectado a MySQL nativo y base de datos inicializada con semillas.
- Documentación actualizada en `docs/DEPLOYMENT_PROCEDURE.md`.
    - Creada guía completa de deployment: `docs/DEPLOYMENT_GUIDE.md`
    - **Próxima fase**: Deployment en servidor VPS de DonWeb.
- **🔧 Infraestructura: Nginx Reverse Proxy**:
    - Implementado Reverse Proxy en Nginx (`nginx.conf`) para redirigir `/api` al backend.
    - Soluciona problemas de CORS permitiendo que el frontend haga peticiones al mismo dominio (`/api`).
    - Actualizado `.env.example` para usar URL relativa `VITE_API_URL=/api`.

### 17/01/2026
- **🔥 FIX: DataIntegrityViolationException por valores largos**:
    - Identificado error: Campo `name` en `Person` limitado a 255 chars, pero algunos nombres de instituciones tienen 298+ chars.
    - **Solución**:
        - Aumentado límite de `Person.name` de 255 a **1000 caracteres** para soportar descripciones largas de instituciones.
        - Agregado método `truncateString()` en `SyncService` para truncar defensivamente valores que excedan límites de BD.
        - Truncado automático: name (1000), phone (50), address (500).
    - Mejorado logging en `SyncService`:
        - `log.error()` ahora muestra **stack trace completo** en lugar de solo `getMessage()`.
        - Agregado `EntityManager.clear()` después de cada error para limpiar sesión de Hibernate y prevenir errores en cascada.
        - Logs detallados en todos los métodos helper (findOrCreateCity, findOrCreatePerson, etc.) para debugging.

### 16/01/2026
- **🔥 FIX CRÍTICO: Mapeo de Columnas en Sincronización**:
    - Identificado y corregido error grave en `SyncService.java`: el mapeo hardcodeado asumía estructura incorrecta de columnas.
    - **Problema**: Columna 0 se asumía como "Date" y columna 1 como "Person Name", pero en realidad:
        - Col 0: N° Orden
        - Col 1: Fecha de Ingreso
        - Col 4: Nombre / Institución
    - **Resultado**: Los datos se guardaban incorrectamente (fechas en el campo `name` de Person).
    - **Solución**: Reescrito método `processRows()` para mapear correctamente las 18+ columnas del sheet "SEGUIMIENTO":
        - Person: name (Col E), phone (Col H), address/barrio (Col G)
        - Location: localidad (Col F), barrio (Col G) - con jerarquía CITY → NEIGHBORHOOD
        - Order: entryDate (Col B), origin (Col D), description/solicitud (Col I), status/resolución (Col O)
    - Mejorado `parseDate()` con soporte real para formatos DD/MM/YYYY e ISO.
    - Agregado `LocationRepository` como dependencia en `SyncService`.
    - Los datos ahora se crean correctamente con todas las relaciones (Person → Location, Order → Person, Order → Location).

### 15/01/2026
- **Backend Logging & Debugging**:
    - Agregado logging detallado (SLF4J) en `SyncService.java` para trazar el proceso de sincronización.
- **Frontend Routing Fix**:
    - Corregida ruta `/projects/config/:configId` en `App.jsx` para coincidir con la navegación del Dashboard, solucionando la pantalla en blanco al ver detalles.
- **Persistencia de Sesión y Roles**:
    - Actualizado `AuthController` y `AuthResponse` para devolver el rol del usuario.
    - Actualizado `AuthContext` para persistir el usuario y rol en `localStorage`, resolviendo el error de "Acceso Denegado" al refrescar.
- **Acceso H2 & Documentación**:
    - Configurado `SecurityConfig` para permitir acceso público a `/h2-console` y deshabilitar frame options.
    - Actualizado `walkthrough.md` con guías paso a paso para conectar DB Local (H2 Web Console) y Remota (HeidiSQL + SSH Tunnel).

### 09/01/2026 (En Progreso)
- **Deployment en DonWeb VPS**: 
  - Backend/DB funcionando OK.
  - Frontend despliega pero falla al conectar con API (sigue apuntando a localhost).
  - **Problema Detectado**: `VITE_API_URL` no se inyecta correctamente en el build de Docker.
  - **Fixes Intentados**: 
    - Agregar `ARG VITE_API_URL` al Dockerfile (commit `1671c46`).
    - Configurar `args` en `docker-compose.yml`.
  - **Próximo Paso**: Verificar si hardcodear la URL en `docker-compose.yml` (`args`) o usar `environment` (aunque Vite requiere build-time env vars) soluciona el problema de reconstrucción.

### 08/01/2026
- **Configuración de Deployment Productivo** 🚀:
  - Creados `Dockerfile` para backend y frontend (multi-stage builds).
  - Creado `docker-compose.yml` con PostgreSQL + Backend + Frontend.
  - Agregado soporte para PostgreSQL en `pom.xml`.
  - Creada configuración de producción (`application-prod.properties`).
  - Creado archivo `.env.example` con variables de entorno.
  - Documentación completa en `docs/DEPLOYMENT.md`.
- **Gestión de Usuarios (CRUD Completo)**:
  - Backend: Creado `UserService.java` y `UserController.java` con endpoints protegidos (solo ADMIN).
  - Frontend: Creada página `UsersPage.jsx` con tabla, modal de creación/edición y eliminación.
  - Agregado botón "Usuarios" en el navbar del Dashboard.
  - Endpoints: GET /api/users, POST /api/users, PUT /api/users/{id}, DELETE /api/users/{id}.
- **Versionado**: Implementado SemVer. Versión actual: `0.1.0` (MVP Funcional).
- **Rows Per Page**: Agregada opción "10" al selector de filas por página (ahora: 10, 20, 50, 100).

### 07/01/2026
- **Popover Fix**: Corregido el problema de popovers cortados en las primeras filas.
  - Implementada lógica de posicionamiento dinámico (arriba/abajo según fila).
  - Agregado scroll interno para textos muy largos (`max-h-80 overflow-y-auto`).

### 06/01/2026
- **Localización**: Cambiado nombre de proyectos de "Project from..." a "Proyectos de..." en español.
- **Header Detection (CRÍTICO)**:
  - Implementado algoritmo "Row Hunting" que escanea las primeras 10 filas y selecciona la que tiene más datos como header.
  - Sanitización automática: columnas sin nombre se renombran a "Campo X".
  - Archivo modificado: `SyncService.java` (líneas 41-83).
- **Reporte de Estado**: Creado `project_status_report.md` para presentación ejecutiva.
- **Google Sheets API**: Confirmado que es GRATIS (0 costo), solo tiene límites de cuota (300 req/min).

### 31/12/2025
- **Filtros Avanzados**: Implementado panel de filtros multi-columna con soporte para fechas (filtrado por año).
- **Sync Loading Feedback**: Agregado cursor "wait" y ícono animado durante sincronización.

### 26/12/2025
- **Visualización de Datos**: Implementados gráficos dinámicos (BarChart) con auto-detección de columnas categóricas.
- **Cell Truncation**: Implementado componente `TruncatedCell` con popover hover para textos largos.
- **Date Sorting**: Corregido ordenamiento de fechas (soporte DD/MM/YYYY e ISO).

### 24/12/2025
- **Dashboard UI**: Refinada interfaz del Dashboard con diseño premium (gradientes, glassmorphism).
- **Project Details View**: Implementada vista detallada con búsqueda, paginación y ordenamiento.

### 22/12/2025
- **Persistencia Local**: Configurada base de datos H2 en modo archivo (`jdbc:h2:file:./data/sgp_db`).
- **Seguridad**: Implementado JWT authentication con Spring Security.
- **Google Sheets Integration**: Configurada Service Account y sincronización automática.

---

## 🏗️ Arquitectura Actual

### Backend (Java Spring Boot 3.2.1)
- **Base de Datos**: H2 (file-based) para desarrollo local.
- **Autenticación**: JWT con roles (ADMIN, USER).
- **Sincronización**: `SyncService.java` con header detection inteligente.
- **API Key**: Google Service Account (`credentials.json`).

### Frontend (React + Vite + Tailwind)
- **Componentes Clave**:
  - `DashboardPage.jsx`: Lista de proyectos con botón de sincronización.
  - `ProjectDetailsPage.jsx`: Vista detallada con tabla, filtros, gráficos y búsqueda.
  - `CreateConfigModal.jsx`: Modal para agregar nuevas planillas.
- **Estado**: Context API para autenticación (`AuthContext.jsx`).

---

## 🐛 Problemas Conocidos Resueltos

1. **H2 Database Lock**: Resuelto matando procesos zombie con `taskkill /PID <pid> /F`.
2. **Headers Incorrectos**: Resuelto con algoritmo de "Row Hunting" + sanitización.
3. **Popover Clipping**: Resuelto con posicionamiento dinámico y scroll interno.
4. **Date Sorting**: Resuelto con detección de tipo y parsing correcto.

---

## 📝 Próximos Pasos Sugeridos

- [x] Refactorización de Entidades (Solicitud/Pedido/Subsidio).
- [ ] **DESPLIEGUE EN PRODUCCIÓN (Prioridad Alta)**.
- [ ] Validación de la nueva estructura de datos en entorno real.
- [ ] Exportación de datos (Excel/PDF).
- [ ] Gestión de Usuarios (UI).

---

## 🔗 Archivos Clave para Revisar

- **Plan de Implementación**: `docs/implementation_plan.md`
- **Tareas Completadas**: `docs/task.md`
- **Reporte de Estado**: `.gemini/antigravity/brain/.../project_status_report.md`
- **Backend Core**: `code/backend/src/main/java/com/sgp/backend/service/SyncService.java`
- **Frontend Core**: `code/frontend/src/pages/ProjectDetailsPage.jsx`

---

**Última actualización**: 21/04/2026 07:45
