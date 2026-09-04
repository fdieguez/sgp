# Plan de Pruebas Playwright — Etapa 11: Estabilización Final Pre-Producción

**Rol:** Project Manager (PM)  
**Destinatario Técnico:** @Tester-sgp  
**Fecha:** Septiembre 2026  
**Idioma:** Español (Regla Global 1)  

---

## 🎯 Objetivo de las Pruebas
Verificar mediante pruebas automatizadas de regresión E2E (Playwright) y validación funcional que las tres correcciones críticas de la Etapa 11 operen con 100% de éxito en el entorno local antes de la salida a producción.

---

## 🧪 Casos de Prueba Detallados

### Caso de Prueba 1: Campos Completos de Agenda, Precarga y Validaciones
* **Objetivo:** Garantizar que el tipo de resolución `AGENDA` contenga todos los campos obligatorios, precargue la ubicación y gestione la condicionalidad de aporte.
* **Pasos de Ejecución:**
  1. Iniciar sesión con un usuario con permisos de edición (`admin@sgp.com` o `responsable`).
  2. Crear o abrir una solicitud existente con Localidad (ej. *"Santa Fe"*) y Barrio (ej. *"Centro"*).
  3. En la sección *Asignaciones Múltiples (Resolutores)*, agregar una nueva asignación y seleccionar el área **AGENDA**.
  4. **Verificación Visual:**
     * Comprobar que se desplieguen los campos requeridos: `Tipo de actividad`, `Organizada por nosotros?`, `Descripción/temario`, `Asistentes`, `Declaración de interés`, `Aporte?`, `Día`, `Hora`, `Lugar - Localidad`, `Lugar - Barrio`, `Responsable` y `Observación`.
     * Comprobar que `Lugar - Localidad` tenga precargado *"Santa Fe"* y `Lugar - Barrio` tenga precargado *"Centro"*.
     * Comprobar que el campo `Descripción/monto` esté inicialmente oculto o no exigido si `Aporte?` no es *"si"*.
  5. **Verificación Condicional:**
     * Cambiar el selector `Aporte?` a *"si"*.
     * Comprobar que el campo `Descripción/monto` se vuelva visible de inmediato.
  6. **Verificación de Validación Obligatoria:**
     * Dejar campos obligatorios vacíos e intentar guardar. Comprobar que el sistema impida el guardado y muestre un mensaje de validación claro.
  7. **Persistencia:**
     * Completar todos los campos con valores de prueba válidos y guardar la solicitud.
     * Reabrir la solicitud y validar que todos los valores del detalle de Agenda se hayan guardado y recuperado intactos.

---

### Caso de Prueba 2: Depuración de Tipos de Pedido en Subsidio
* **Objetivo:** Confirmar la eliminación definitiva de la opción *"Institucional indistinto"*.
* **Pasos de Ejecución:**
  1. Abrir cualquier solicitud en modo edición.
  2. En *Asignaciones Múltiples*, seleccionar o editar una asignación de tipo **SUBSIDIO**.
  3. Desplegar el selector del campo `Tipo de pedido`.
  4. **Aserción:**
     * Validar que existan las opciones: *"Personal"*, *"Institucional en dinero"* e *"Institucional en especie"*.
     * Validar explícitamente que la opción *"Institucional indistinto"* **NO** esté presente en el selector (`expect(page.locator('option', { hasText: 'Institucional indistinto' })).toHaveCount(0)`).

---

### Caso de Prueba 3: Ordenamiento Interactivo por N° Orden en la Tabla
* **Objetivo:** Verificar la ordenación ascendente y descendente por ID en la grilla principal.
* **Pasos de Ejecución:**
  1. Navegar a `/mis-solicitudes` o a la vista de proyectos.
  2. Localizar la cabecera de la tabla `N° Orden`.
  3. Verificar que la cabecera posea cursor interactivo (`cursor-pointer`).
  4. **Orden Ascendente:**
     * Hacer clic en `N° Orden`.
     * Validar que el primer registro de la tabla tenga un ID menor que los siguientes (orden ascendente `id,asc`) y que se renderice el icono indicador `<ArrowUp>`.
  5. **Orden Descendente:**
     * Hacer clic nuevamente en `N° Orden`.
     * Validar que la tabla se reordene de mayor a menor (orden descendente `id,desc`) y que se renderice el icono indicador `<ArrowDown>`.

---

### Caso de Prueba 4: Flujo Completo de Dictamen de Agenda
* **Objetivo:** Asegurar que el Resolutor de Agenda pueda dictaminar y aprobar solicitudes con los nuevos campos.
* **Pasos de Ejecución:**
  1. Cerrar sesión y autenticarse con el usuario Resolutor de Agenda (`mvgonza79@gmail.com` o el configurado).
  2. Abrir la solicitud creada en el Caso 1.
  3. Comprobar que los detalles cargados de la Agenda se visualicen correctamente en modo lectura.
  4. Hacer clic en *Aprobar*, seleccionar la asistencia obligatoria (*Con Asistencia* o *Sin Asistencia*) y confirmar con *Confirmar y Finalizar*.
  5. Validar que la resolución quede firmada exitosamente.

---

## 📊 Entregables Requeridos del Tester
1. Suite de pruebas automatizada de Playwright guardada en `code/frontend/tests/etapa11_validacion_final.spec.js` (o suite actualizada).
2. Capturas de pantalla de evidencias de cada caso en la carpeta `pruebas/pruebaEtapa11/`.
3. Reporte de ejecución con el 100% de tests aprobados (`passed`).
