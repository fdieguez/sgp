# Plan de Trabajo — Etapa 11: Estabilización Final de Producción (Feedback Real)

**Rol:** Project Manager (PM)  
**Destinatario Técnico:** @dev-sgp  
**Fecha:** Septiembre 2026  
**Idioma:** Español (Regla Global 1)  

---

## 🎯 Objetivo General
Implementar las correcciones finales solicitadas por el usuario real para la salida oficial a producción del Sistema de Gestión de Proyectos (SGP v1.0). El alcance abarca la ampliación del catálogo y comportamiento de los campos de **Agenda**, la depuración del selector de **Subsidios** y la habilitación del ordenamiento por **N° Orden** en la tabla principal.

---

## 📋 Tareas de Implementación

### Tarea 1: Ampliación Integral de Campos de Agenda (Backend & Frontend)

#### 1.1. Backend (`DataInitializer.java` y BD)
En el método `seedTiposYAtributos`, redefinir la lista de atributos para el tipo de resolución **AGENDA** con los siguientes 13 campos (todos obligatorios en la lógica del negocio):

1. **`Tipo de actividad`**: Tipo `SELECT`, opciones: `Reunión,Evento,Acto,Recorrido gestión,Recorrido territorial,Visita,Otro`, orden: 1.
2. **`Organizada por nosotros?`**: Tipo `SELECT`, opciones: `si,no`, orden: 2.
3. **`Descripción/temario`**: Tipo `TEXTAREA`, orden: 3.
4. **`Asistentes`**: Tipo `TEXT`, orden: 4.
5. **`Declaración de interés`**: Tipo `SELECT`, opciones: `si,no`, orden: 5.
6. **`Aporte?`**: Tipo `SELECT`, opciones: `si,no`, orden: 6.
7. **`Descripción/monto`**: Tipo `TEXT`, orden: 7 (Condicional: sólo obligatorio si `Aporte?` es `si`).
8. **`Día`**: Tipo `DATE`, orden: 8.
9. **`Hora`**: Tipo `TIME` (o `TEXT` con formato HH:mm), orden: 9.
10. **`Lugar - Localidad`**: Tipo `SELECT`, orden: 10.
11. **`Lugar - Barrio`**: Tipo `SELECT`, orden: 11.
12. **`Responsable`**: Tipo `TEXT`, orden: 12.
13. **`Observación`**: Tipo `TEXTAREA`, orden: 13 (Asegurar que el nombre exacto sea `Observación`, reemplazando el antiguo `Observaciones` o `Detalle u Observaciones`).

*Nota Backend:* Asegurar que `upsertTipoResolucion("AGENDA", ...)` configure todos los atributos con `requerido = true` (excepto `Descripción/monto` que es condicional).

#### 1.2. Frontend (`SolicitudModal.jsx`)
En la sección de renderizado de atributos dinámicos de resolutores (`Asignaciones Múltiples`):
* **Precarga de Ubicación:** Al seleccionar o renderizar la asignación `AGENDA`, precargar automáticamente en el detalle:
  * `Lugar - Localidad` con el valor de la localidad de la solicitud (`formData.locationName`).
  * `Lugar - Barrio` con el barrio de la solicitud (`formData.barrio`).
* **Selects Dinámicos de Ubicación:** Para los campos `Lugar - Localidad` y `Lugar - Barrio`, renderizar desplegables enlazados a la lista de localidades disponibles (`availableCities`) y barrios correspondientes (`availableNeighborhoods`), permitiendo también su modificación manual.
* **Visibilidad Condicional de Aporte:** El campo `Descripción/monto` sólo debe mostrarse si `Aporte?` tiene seleccionado el valor `'si'`. Si se cambia a `'no'`, ocultar y vaciar el valor.
* **Inputs Específicos:**
  * `Día`: input `type="date"`.
  * `Hora`: input `type="time"`.
* **Validación en Guardado:** En `handleSubmit`, validar que si existe una asignación de tipo `AGENDA`, todos sus campos obligatorios estén completos antes de permitir el guardado, informando al usuario con mensajes claros vía toast.

---

### Tarea 2: Depuración de Tipos de Pedido en Subsidios

#### 2.1. Backend (`DataInitializer.java`)
* Modificar la creación/actualización del atributo `Tipo de pedido` para remover la opción `Institucional indistinto`.
* Opciones oficiales resultantes: `Personal,Institucional en dinero,Institucional en especie`.
* Asegurar que `obtenerOCrearAtributo` actualice el registro existente en la tabla `atributo_resolucion` de la base de datos.

#### 2.2. Frontend
* Verificar que en los desplegables de `SUBSIDIO` ya no figure la opción `Institucional indistinto`.

---

### Tarea 3: Ordenamiento Interactivo por N° Orden en la Tabla Principal

#### 3.1. Frontend (`ProjectDetailsPage.jsx`)
* Localizar la cabecera `<th>N° Orden</th>` en la grilla de solicitudes.
* Agregar el evento `onClick={() => handleSort('id')}`, clases de cursor pointer (`cursor-pointer hover:text-white transition-colors`) y los iconos indicadores de orden `<ArrowUp>` / `<ArrowDown>` según corresponda cuando `sortConfig.key === 'id'`.
* Verificar que al hacer clic en la cabecera se alterne entre orden ascendente (`id,asc`) y descendente (`id,desc`).

---

## 🛠️ Criterios de Aceptación
1. Al abrir una solicitud y agregar un resolutor con tipo **AGENDA**, se despliegan los 13 campos requeridos con sus selectores y formatos adecuados.
2. Localidad y Barrio de la Agenda aparecen precargados con los datos de la solicitud.
3. El campo `Descripción/monto` sólo se visualiza si `Aporte?` es `si`.
4. El formulario bloquea el guardado si falta completar algún campo obligatorio de la Agenda.
5. En **SUBSIDIO**, el selector de `Tipo de pedido` sólo muestra `Personal`, `Institucional en dinero` e `Institucional en especie`.
6. En la grilla general (`/mis-solicitudes` o proyectos), hacer clic en la cabecera `N° Orden` reordena las solicitudes de menor a mayor y de mayor a menor correctamente.
