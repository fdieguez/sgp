# Resumen de Correcciones y Mejoras — SGP v1.0
**Documento de Presentación al Cliente (Fase Pre-Producción)**
**Fecha:** Septiembre 2026  
**Idioma:** Español (Regla Global 1)  

---

### 1. Gestión Completa e Inteligente del Módulo de Agenda
* **13 Campos Oficiales de Registro (Exclusivos para Agenda):** Se incorporó el relevamiento integral específico para la actividad de **AGENDA** (aplicable única y exclusivamente al derivar solicitudes a los resolutores de esta área):
  * *Tipo de actividad:* Selector con 7 opciones predefinidas (*Reunión, Evento, Acto, Recorrido gestión, Recorrido territorial, Visita, Otro*).
  * *Organizada por nosotros?* (`si/no`).
  * *Descripción/Temario* (detalle expandido).
  * *Asistentes* (registro de concurrentes previstos).
  * *Declaración de interés* (`si/no`).
  * *Aporte?* (`si/no`).
  * *Descripción/Monto* (detalle de ayuda económica condicional).
  * *Día* (selector de fecha calendario).
  * *Hora* (selector de horario de inicio).
  * *Lugar - Localidad* (selector oficial con precarga automática de la solicitud).
  * *Lugar - Barrio* (selector oficial de barrios dependientes, con precarga automática).
  * *Responsable* (encargado asignado al evento).
  * *Observación* (estandarizado para notas aclaratorias).
* **Precarga Automática de Ubicación:** Al asignar un resolutor de Agenda, el sistema precarga automáticamente la Localidad y el Barrio del beneficiario mediante selectores desplegables oficiales.
* **Comportamiento Dinámico de Aporte:** El campo de detalle y monto del aporte sólo se solicita de forma condicional cuando se marca afirmativamente la necesidad de aporte económico (`Aporte? = si`).
* **Validación de Obligatoriedad:** Se garantiza que ninguna solicitud de agenda sea derivada o guardada con información incompleta, validando todos los campos antes de confirmar.

### 2. Gestión Completa del Módulo de Declaración de Interés
* **13 Campos Oficiales de Registro (Exclusivos para Declaración de Interés):** Se incorporó el formulario integral específico para las solicitudes de **DECLARACIÓN DE INTERÉS**:
  * *Nombre completo del evento:* Texto descriptivo obligatorio.
  * *Actividad:* Definición de la actividad principal obligatoria.
  * *Institución a declarar:* Nombre de la entidad o solicitante obligatorio.
  * *Tipo:* Menú desplegable obligatorio con 6 categorías (*cultural, educativo, científico, deportivo, social, otro*).
  * *Descripción:* Detalle general obligatorio.
  * *Localidad:* Selector desplegable de localidades oficiales con precarga automática obligatoria.
  * *Fecha:* Selector de fecha calendario obligatorio.
  * *Hora:* Selector de horario opcional.
  * *Dirección:* Domicilio físico del evento obligatorio.
  * *Fundamentos:* Justificación y consideraciones obligatorias.
  * *Flyer/nota:* Campo para adjuntar archivos en formato JPG o PDF opcional.
  * *Observaciones:* Notas adicionales opcionales.
  * *Responsable:* Agente encargado obligatorio.
* **Precarga Automática y Validación:** Se precarga la localidad automáticamente a partir de la solicitud y el sistema valida que los 10 campos obligatorios no queden vacíos antes de confirmar el guardado.

---

### 3. Depuración del Selector en Subsidios
* **Eliminación de Opción Obsoleta:** Se simplificó el selector de **Tipo de Pedido** eliminando definitivamente la opción ambigua (*Institucional indistinto*).
* **Modalidades Oficiales Vigentes:** El catálogo quedó fijado exclusivamente en las 3 opciones operativas válidas:
  1. **`Personal`** (asistencia individual para personas físicas).
  2. **`Institucional en dinero`** (aporte económico formal a entidades).
  3. **`Institucional en especie`** (entrega de insumos o equipamiento).

---

### 4. Ordenamiento Interactivo en Tabla Principal
* **Navegación Ágil por N° Orden:** Se habilitó la interactividad en la cabecera **`N° Orden`** de la grilla de solicitudes.
* **Alternancia con un Solo Clic:** Permite ordenar de menor a mayor (`id,asc`) y de mayor a menor (`id,desc`) de forma instantánea, incorporando indicadores visuales de flechas (`ArrowUp` y `ArrowDown`) para agilizar la búsqueda y control de expedientes.

---

### 5. Certificación de Calidad y Estabilidad (QA)
* **Validación Automatizada Playwright:** Se diseñaron y ejecutaron dos suites completas de pruebas de regresión End-to-End (`etapa11_validacion_final.spec.js` y `etapa11_declaracion_interes.spec.js`) cubriendo 7 escenarios críticos.
* **Tasa de Éxito del 100%:** Los 7 tests finalizaron aprobados:
  * Suite Agenda, Subsidios y Ordenamiento: 4/4 casos aprobados (30.6s).
  * Suite Declaración de Interés: 3/3 casos aprobados (23.3s), verificando el despliegue de los 13 campos, precarga de localidad, flexibilidad de los 3 campos opcionales y el dictamen y firma digital del Resolutor Eduardo Alfaro.
* **Respaldo con Evidencias:** Se generaron 12 capturas de pantalla de respaldo en alta resolución en el directorio `pruebas/pruebaEtapa11/` que acreditan visualmente el cumplimiento funcional y técnico del sistema.
