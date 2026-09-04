# Plan de Trabajo — Ampliación de Campos en Declaración de Interés (Etapa 11)

**Rol:** Project Manager (PM)  
**Destinatario Técnico:** @dev-sgp  
**Fecha:** Septiembre 2026  
**Idioma:** Español (Regla Global 1)  

---

## 🎯 Objetivo General
Incorporar el catálogo integral de atributos dinámicos y sus comportamientos en el frontend para el tipo de resolución **`DECLARACION DE INTERES`**, siguiendo el mismo estándar y robustez aplicados al módulo de `AGENDA`.

---

## 📋 Tareas de Implementación

### Tarea 1: Backend (`DataInitializer.java` y BD)
En el método `seedTiposYAtributos`:
1. Definir/obtener los siguientes 13 atributos mediante `obtenerOCrearAtributo`:
   * `Nombre completo del evento`: Tipo `TEXT`, orden: 1, `requerido = true`.
   * `Actividad`: Tipo `TEXT`, orden: 2, `requerido = true`.
   * `Institución a declarar`: Tipo `TEXT`, orden: 3, `requerido = true`.
   * `Tipo`: Tipo `SELECT`, opciones: `cultural,educativo,científico,deportivo,social,otro`, orden: 4, `requerido = true`.
   * `Descripción`: Tipo `TEXTAREA`, orden: 5, `requerido = true`.
   * `Localidad`: Tipo `SELECT`, orden: 6, `requerido = true`.
   * `Fecha`: Tipo `DATE`, orden: 7, `requerido = true`.
   * `Hora`: Tipo `TIME`, orden: 8, `requerido = false` (Opcional).
   * `Dirección`: Tipo `TEXT`, orden: 9, `requerido = true`.
   * `Fundamentos`: Tipo `TEXTAREA`, orden: 10, `requerido = true`.
   * `Flyer/nota`: Tipo `FILE`, orden: 11, `requerido = false` (Opcional).
   * `Observaciones`: Tipo `TEXTAREA`, orden: 12, `requerido = false` (Opcional).
   * `Responsable`: Tipo `TEXT`, orden: 13, `requerido = true`.

2. Actualizar la configuración del tipo `DECLARACION DE INTERES` mediante `upsertTipoResolucion`:
   ```java
   upsertTipoResolucion("DECLARACION DE INTERES", resolutorDefault, List.of(
       new AtributoConfig(attrNombreEvento, true, 1),
       new AtributoConfig(attrActividad, true, 2),
       new AtributoConfig(attrInstitucionDeclarar, true, 3),
       new AtributoConfig(attrTipoDeclaracion, true, 4),
       new AtributoConfig(attrDescripcion, true, 5),
       new AtributoConfig(attrLocalidadDec, true, 6),
       new AtributoConfig(attrFechaDec, true, 7),
       new AtributoConfig(attrHoraDec, false, 8),
       new AtributoConfig(attrDireccionDec, true, 9),
       new AtributoConfig(attrFundamentosDec, true, 10),
       new AtributoConfig(attrFlyerNota, false, 11),
       new AtributoConfig(attrObservacionesDec, false, 12),
       new AtributoConfig(attrResponsableDec, true, 13)
   ));
   ```

---

### Tarea 2: Frontend (`SolicitudModal.jsx`)

1. **Precarga Automática:**
   * Al agregar o renderizar una asignación de tipo `DECLARACION DE INTERES` (o `DECLARACIÓN DE INTERÉS`), si el campo `Localidad` no tiene valor en `currentData`, precargarlo con `formData.locationName`.

2. **Desplegable de Localidades:**
   * Para el campo `Localidad` dentro de `DECLARACION DE INTERES`, renderizar un `<select>` interactivo poblado con `availableCities` (similar a como se implementó para Agenda).

3. **Formatos de Entrada Adecuados:**
   * Campo `Fecha`: input `type="date"`.
   * Campo `Hora`: input `type="time"`.
   * Campo `Flyer/nota`: componente de subida de archivo tipo `FILE` (soporte para JPG y PDF) con vista previa/enlace de descarga.

4. **Validación Estricta en `handleSubmit`:**
   * Al guardar, si existe una asignación de tipo `DECLARACION DE INTERES`, validar que los 10 campos obligatorios no estén vacíos:
     * `Nombre completo del evento`
     * `Actividad`
     * `Institución a declarar`
     * `Tipo`
     * `Descripción`
     * `Localidad`
     * `Fecha`
     * `Dirección`
     * `Fundamentos`
     * `Responsable`
   * Los campos `Hora`, `Observaciones` y `Flyer/nota` deben ser opcionales (permitir guardar si están vacíos).
   * Emitir toast informativo si falta algún campo obligatorio.

---

## 🛠️ Criterios de Aceptación
1. Al asignar `DECLARACION DE INTERES`, se despliegan los 13 campos en el orden especificado.
2. El campo `Localidad` aparece precargado con la localidad de la solicitud y permite cambiarla con la lista desplegable oficial.
3. El campo `Tipo` ofrece las 6 opciones requeridas (*cultural, educativo, científico, deportivo, social, otro*).
4. El campo `Flyer/nota` permite adjuntar archivos PDF o JPG.
5. El sistema bloquea el guardado si falta algún campo obligatorio, pero permite guardar sin error si `Hora`, `Observaciones` o `Flyer/nota` están vacíos.
