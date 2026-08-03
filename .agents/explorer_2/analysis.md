# Análisis Frontend para el Requisito R2 — SolicitudModal.jsx y E2E Tests

## Resumen Ejecutivo
Se ha realizado un análisis exhaustivo del código frontend en `code/frontend/src/components/SolicitudModal.jsx` y la suite de pruebas E2E de Playwright en `code/frontend/tests/playwright_sgp.spec.js`. Se han identificado los puntos exactos de cálculo de asignación del usuario actual (`myAssignment`), los controles del submodal de confirmación de aprobación, la gestión de asistencia y Google Calendar, la construcción del payload de aprobación, y la configuración de construcción/pruebas.

---

## 1. Ubicación y Estructura del Código Frontend

* **Componente Principal de Edición y Aprobación**:
  `c:\Users\fran\dev\projects\SGP\code\frontend\src\components\SolicitudModal.jsx` (1445 líneas)
* **Otros Componentes Relacionados**:
  * `SolicitudDetailModal.jsx`: `code/frontend/src/components/SolicitudDetailModal.jsx` (Modal de solo lectura)
  * `TicketSeguimiento.jsx`: `code/frontend/src/components/TicketSeguimiento.jsx` (Notas de seguimiento)
  * `TiposResolucionABM.jsx`: `code/frontend/src/components/TiposResolucionABM.jsx` (Configuración de tipos de resolución)
* **Configuración del Cliente API**:
  `code/frontend/src/config/axios.js`
* **Configuración del Proyecto y Tests**:
  * `code/frontend/package.json`
  * `code/frontend/playwright.config.js`
  * `code/frontend/tests/playwright_sgp.spec.js`

---

## 2. Análisis Detallado del Requisito R2 en `SolicitudModal.jsx`

### A. Cálculo de `formData.assignments` y `myAssignment`

#### 1. Definición del Estado Inicial de `formData.assignments`
* **Ubicación**: Línea 26 y Línea 323.
* **Snippet Exacto**:
```javascript
// Línea 13-30
const [formData, setFormData] = useState({
    type: 'PEDIDO',
    description: '',
    status: 'pendiente',
    origin: 'MANUAL',
    entryDate: new Date().toISOString().split('T')[0],
    person: { name: '', phone: '' },
    locationName: '',
    barrio: '',
    responsableId: '',
    amount: '',
    grantDate: '',
    resolutionApproved: false,
    assignments: [], // <--- Inicialización como array vacío
    asistencia: '',
    porDonde: '',
    googleEventId: ''
});
```

#### 2. Mapeo e Inicialización desde `initialData`
* **Ubicación**: Líneas 281-293 en el `useEffect` que procesa `initialData`.
* **Snippet Exacto**:
```javascript
// Líneas 281-293
assignments: initialData.resolutorAssignments?.map(a => {
    let parsedDetalle = a.detalle || '';
    try {
        if (a.detalle && typeof a.detalle === 'string' && a.detalle.startsWith('{')) {
            parsedDetalle = JSON.parse(a.detalle);
        }
    } catch (e) {}
    return {
        resolutorEmail: a.resolutor?.email || '',
        tipoResolucion: a.tipoResolucion || '',
        detalle: parsedDetalle
    };
}) || []
```

#### 3. Hallazgo Crítico en la Mapeación de `assignments`
* **Observación**: Al transformar `initialData.resolutorAssignments`, el objeto resultante devuelto por la función de mapeo únicamente contiene tres propiedades: `{ resolutorEmail, tipoResolucion, detalle }`.
* **Problema Identificado**: Los campos `approved` (boolean) y `observaciones` (string) provenientes del backend NO son copiados hacia los elementos del arreglo `formData.assignments`. Por lo tanto, en cada objeto dentro de `formData.assignments`, la propiedad `approved` es `undefined`.

#### 4. Cálculo de `myAssignment` e `isPendingResolutor`
* **Ubicación**: Líneas 461-463.
* **Snippet Exacto**:
```javascript
// Líneas 461-463
const myAssignment = formData.assignments?.find(a => a.resolutorEmail === user?.email);
const isPendingResolutor = isResolutor && myAssignment && !myAssignment.approved;
const isApproveDisabled = loading || (formData.type === 'AGENDA' && !asistencia);
```
* **Consecuencia Lógica**:
  Dado que `a.approved` no se incluye al mapear `initialData.resolutorAssignments`, `myAssignment.approved` resulta siempre en `undefined`. Como `!undefined` evalúa a `true`, la expresión `!myAssignment.approved` es `true` para cualquier asignación existente, provocando que `isPendingResolutor` permanezca en `true` incluso cuando la asignación ya haya sido aprobada previamente en el backend.
  Asimismo, en las líneas 837-844:
```javascript
{isResolutor && myAssignment?.approved && (
    <div className="bg-emerald-900/40 p-4 rounded-xl border border-emerald-700/50 flex flex-col gap-1">
        <span className="text-sm font-bold text-emerald-400">✅ Resolución Finalizada</span>
        {myAssignment.observaciones && (
            <p className="text-xs text-emerald-200 italic">"{myAssignment.observaciones}"</p>
        )}
    </div>
)}
```
  Este bloque nunca se muestra adecuadamente porque `myAssignment.approved` es `undefined`.

---

### B. Sub-modal de Confirmación de Aprobación

* **Ubicación**: Líneas 1305-1440.
* **Condición de Despliegue**: `{showApproveConfirm && (` (línea 1306) activado por el botón "Aprobar Resolución" (líneas 1276-1284).

#### Estructura JSX y Componentes del Sub-modal:
1. **Encabezado y Mensaje**: Líneas 1308-1314. Muestra "¿Aprobar Resolución?" con una descripción del impacto.
2. **Campo de Observaciones**: Líneas 1315-1324. Textarea vinculado al estado `approveObservations` (`setApproveObservations(e.target.value)`).
3. **Controles de Asistencia (Solo para Tipo AGENDA)**: Líneas 1325-1353.
   * Se renderiza solo si `formData.type === 'AGENDA'`.
   * Selector por botones de radio (`name="asistencia"`):
     * Opción 1: `value="con asistencia"`, `checked={asistencia === 'con asistencia'}` (líneas 1329-1339).
     * Opción 2: `value="sin asistencia"`, `checked={asistencia === 'sin asistencia'}` (líneas 1341-1351).
   * Modifica el estado `asistencia` vía `setAsistencia(e.target.value)`.
4. **Controles de Integración con Google Calendar (Solo para Tipo AGENDA)**: Líneas 1355-1421.
   * Se renderiza solo si `formData.type === 'AGENDA'`.
   * Checkbox para activar la creación del evento (`createCalendarEvent`): líneas 1358-1367.
   * Formulario condicional de detalles del evento (líneas 1369-1419) que incluye:
     * `calendarTitle`: Input de texto para título (líneas 1372-1378).
     * `calendarDate`: Input de tipo fecha (líneas 1383-1389).
     * `calendarTime`: Input de tipo hora (líneas 1391-1397).
     * `calendarLocation`: Input de texto para ubicación (líneas 1401-1407).
     * `calendarDescription`: Textarea para descripción (líneas 1410-1416).
   * **Pre-poblado Automático**: En las líneas 432-448, un `useEffect` escucha `showApproveConfirm` y llena automáticamente estos campos utilizando datos de la solicitud (beneficiario, fecha de resolución, ubicación y descripción del caso).
5. **Botones de Acción**: Líneas 1423-1437.
   * Botón **Volver**: Líneas 1424-1429 (`onClick={() => setShowApproveConfirm(false)}`).
   * Botón **Confirmar y Finalizar**: Líneas 1430-1436 (`onClick={handleAprobar}`). Se habilita/deshabilita mediante `isApproveDisabled` (`loading || (formData.type === 'AGENDA' && !asistencia)`).

---

### C. Manejo de Asistencia y Google Calendar

#### Definición de Estados en `SolicitudModal.jsx`:
* `asistencia`: línea 39 (`const [asistencia, setAsistencia] = useState('');`).
* `createCalendarEvent`: línea 42 (`const [createCalendarEvent, setCreateCalendarEvent] = useState(false);`).
* `calendarTitle`: línea 43 (`const [calendarTitle, setCalendarTitle] = useState('');`).
* `calendarDate`: línea 44 (`const [calendarDate, setCalendarDate] = useState('');`).
* `calendarTime`: línea 45 (`const [calendarTime, setCalendarTime] = useState('');`).
* `calendarLocation`: línea 46 (`const [calendarLocation, setCalendarLocation] = useState('');`).
* `calendarDescription`: línea 47 (`const [calendarDescription, setCalendarDescription] = useState('');`).

#### Visualización de Solo Lectura de Asistencia en el Formulario Principal:
* **Ubicación**: Líneas 732-740.
```javascript
{formData.type === 'AGENDA' && formData.asistencia && (
    <div className="p-4 bg-indigo-950/40 border border-indigo-850 rounded-xl animate-in slide-in-from-top-2">
        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest block mb-1">Asistencia de la Agenda</span>
        <div className="text-sm font-bold text-white uppercase flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            {formData.asistencia}
        </div>
    </div>
)}
```

---

### D. Handler de Envío de Aprobación (`handleAprobar`)

* **Ubicación**: Líneas 407-430.
* **Snippet Exacto**:
```javascript
// Líneas 407-430
const handleAprobar = async () => {
    setLoading(true);
    try {
        await api.post(`/api/solicitudes/${formData.id}/aprobar`, { 
            observaciones: approveObservations,
            asistencia: formData.type === 'AGENDA' ? asistencia : undefined,
            createEvent: createCalendarEvent ? 'true' : 'false',
            title: calendarTitle,
            date: calendarDate,
            time: calendarTime,
            location: calendarLocation,
            description: calendarDescription
        });
        toast.success("Resolución aprobada");
        onSuccess();
        onClose();
    } catch (err) {
        console.error("Error approving assignment", err);
        toast.error("Error al finalizar la resolución");
    } finally {
        setLoading(false);
        setShowApproveConfirm(false);
    }
};
```
* **Construcción del Payload**:
  * `POST /api/solicitudes/${formData.id}/aprobar`
  * `observaciones`: Cadena de texto de `approveObservations`.
  * `asistencia`: Si `formData.type === 'AGENDA'`, envía la cadena elegida (`"con asistencia"` o `"sin asistencia"`). De lo contrario, envía `undefined`.
  * `createEvent`: Cadena `'true'` o `'false'`.
  * Parámetros de evento de Google Calendar (`title`, `date`, `time`, `location`, `description`).

---

## 3. Configuración del Entorno de Build y Pruebas Frontend

### Archivos de Configuración Detectados:
* `code/frontend/package.json`
* `code/frontend/playwright.config.js`
* `code/frontend/tests/playwright_sgp.spec.js`

### Comandos de Frontend (Ejecución desde `code/frontend`):
* **Servidor de Desarrollo**: `npm run dev`
* **Compilación (Build)**: `npm run build` (ejecuta `vite build`)
* **Linter de Código**: `npm run lint` (ejecuta `eslint .`)
* **Vista previa de Build**: `npm run preview` (ejecuta `vite preview`)
* **Ejecución de Pruebas E2E (Playwright)**: `npx playwright test`
  * Ejecutar suite específica: `npx playwright test tests/playwright_sgp.spec.js`
  * Ejecutar con navegador visible (headed): `npx playwright test --headed`

---

## 4. Conclusiones para la Implementación de R2

1. **Corrección de Mapeo en `useEffect`**: Se debe incluir `approved: a.approved || false` y `observaciones: a.observaciones || ''` dentro del `map` de `initialData.resolutorAssignments` (líneas 281-293). Esto resolverá el problema por el cual `myAssignment.approved` es `undefined` y permitirá desactivar correctamente la interfaz de aprobación para resolutores que ya completaron su trabajo.
2. **Conservación de la Lógica de Aprobación**: Los controles de asistencia (`asistencia`) y de evento de Google Calendar en el submodal están correctamente cableados hacia `handleAprobar` y envían los parámetros requeridos al endpoint `POST /api/solicitudes/{id}/aprobar`.
