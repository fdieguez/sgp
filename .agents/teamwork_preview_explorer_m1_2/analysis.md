# Análisis Técnico Frontend: Restricción de Visibilidad y Opción "Poner en Consideración" (Tareas 3b y 3c)

**Proyecto:** SGP (Sistema de Gestión de Pedidos y Subsidios)  
**Módulo:** Frontend (React.js)  
**Archivos Analizados:**  
1. `code/frontend/src/pages/ProjectDetailsPage.jsx`  
2. `code/frontend/src/components/SolicitudModal.jsx`  
3. `code/frontend/src/context/AuthContext.jsx`  

---

## 1. Resumen Ejecutivo

El objetivo de este análisis es evaluar los componentes React involucrados en las **Tareas 3b y 3c del Plan de Cambios**:
- **Tarea 3b:** Restringir la visibilidad del botón de acción **"Poner en Consideración"** en la grilla de solicitudes (`ProjectDetailsPage.jsx`), permitiendo que únicamente los usuarios autorizados (Administrador, Responsable o Resolutor de Subsidio) puedan visualizarlo y ejecutar la acción.
- **Tarea 3c:** Restringir la opción `<option value="consideracion">Consideración</option>` dentro del menú desplegable de selección de estado en el modal de edición/creación (`SolicitudModal.jsx`), de modo que solo aparezca disponible para usuarios autorizados (Administrador, Responsable o Resolutor de Subsidio).

---

## 2. Determinación de Roles y Permisos en el Frontend

### 2.1 Contexto de Autenticación (`AuthContext.jsx`)
El estado global del usuario logueado se administra a través del hook `useAuth()` proveniente de `AuthContext.jsx`. El objeto `user` retornado posee la siguiente estructura relevante:
- `user.role`: String que indica el rol principal del usuario. Los valores posibles observados en la aplicación son:
  - `'ADMINISTRADOR'` (o `'ADMIN'`)
  - `'RESPONSABLE'`
  - `'RESOLUTOR'`
  - `'OPERADOR'` / `'DISTRIBUIDOR'`
- `user.tiposResolucion`: Arreglo de objetos (o strings) que definen las áreas asignadas al Resolutor cuando `user.role === 'RESOLUTOR'`. Cada elemento tiene una propiedad `tipo` (por ejemplo, `{ id: 1, tipo: 'SUBSIDIO' }`).

### 2.2 Evaluación del rol `isResolutorSubsidio`
Un usuario es considerado **Resolutor de Subsidio** si y solo si su rol principal es `'RESOLUTOR'` y cuenta con el tipo de resolución `'SUBSIDIO'` asignado.
La expresión lógica utilizada en el proyecto (línea 116 de `ProjectDetailsPage.jsx`) es:
```javascript
const isResolutorSubsidio = user?.role === 'RESOLUTOR' && user?.tiposResolucion?.some(t => (t.tipo || t)?.toUpperCase() === 'SUBSIDIO');
```

### 2.3 Condición de Autorización Unificada (`isAuthorizedForConsideracion`)
Para determinar si un usuario logueado tiene permisos para realizar la acción "Poner en Consideración" o seleccionar el estado "Consideración", la condición lógica completa se define como:
```javascript
const isAuthorizedForConsideracion = 
    user?.role === 'ADMINISTRADOR' || 
    user?.role === 'ADMIN' || 
    user?.role === 'RESPONSABLE' || 
    isResolutorSubsidio;
```

---

## 3. Análisis de `ProjectDetailsPage.jsx` (Tarea 3b)

### 3.1 Estructura Actual de Renderizado en la Grilla
En `ProjectDetailsPage.jsx`, la tabla de solicitudes se renderiza iterando el arreglo `solicitudes`. Existen dos ramas de renderizado dentro del método `map`:

#### A. Rama A (`isResolutorSubsidio === true`, Líneas 963 - 1076)
- Se ejecuta cuando el usuario logueado es **Resolutor de Subsidio**.
- Columna de acciones (líneas 1060 - 1064):
  ```jsx
  {(s.status !== 'completadas' && s.status !== 'rechazada') && (
      <button 
          onClick={() => handleConsideracion(s.id)} 
          title="Poner en Consideración" 
          className="p-1.5 hover:bg-orange-600 bg-orange-900/30 rounded text-orange-400 hover:text-white transition-colors"
      >
          <ArrowUpDown className="h-4 w-4" />
      </button>
  )}
  ```
- **Evaluación:** Dado que esta rama solo es accesible si `isResolutorSubsidio` es `true`, el usuario ya está autorizado implícitamente por el control de la rama.

#### B. Rama B (`isResolutorSubsidio === false`, Líneas 1077 - 1138)
- Se ejecuta para el resto de usuarios (Administradores, Responsables, Operadores, etc.).
- Columna de acciones (líneas 1121 - 1125):
  ```jsx
  {s.type === 'SUBSIDIO' && s.status !== 'completadas' && s.status !== 'rechazada' && (
      <button 
          onClick={() => handleConsideracion(s.id)} 
          title="Poner en Consideración" 
          className="p-1.5 hover:bg-orange-600 bg-orange-900/30 rounded text-orange-400 hover:text-white transition-colors"
      >
          <ArrowUpDown className="h-4 w-4" />
      </button>
  )}
  ```
- **Hallazgo Crítico:** En la Rama B, **NO se valida el rol del usuario logueado**. Actualmente, cualquier usuario en la Rama B (incluyendo roles no autorizados como `OPERADOR`) ve el botón "Poner en Consideración" para solicitudes de tipo `SUBSIDIO`.

### 3.2 Propuesta de Modificación para `ProjectDetailsPage.jsx`
Para corregir el comportamiento en la Rama B y garantizar que únicamente Administradores, Responsables y Resolutores de Subsidio puedan ver el botón:

1. Definir la variable de autorización cerca de la línea 117:
   ```javascript
   const isAuthorizedForConsideracion = 
       user?.role === 'ADMINISTRADOR' || 
       user?.role === 'ADMIN' || 
       user?.role === 'RESPONSABLE' || 
       isResolutorSubsidio;
   ```

2. Actualizar el renderizado del botón en la Rama B (línea 1121):
   ```jsx
   {isAuthorizedForConsideracion && s.type === 'SUBSIDIO' && s.status !== 'completadas' && s.status !== 'rechazada' && (
       <button 
           onClick={() => handleConsideracion(s.id)} 
           title="Poner en Consideración" 
           className="p-1.5 hover:bg-orange-600 bg-orange-900/30 rounded text-orange-400 hover:text-white transition-colors"
       >
           <ArrowUpDown className="h-4 w-4" />
       </button>
   )}
   ```
   *(Alternativamente, en la Rama B se puede usar `(user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN' || user?.role === 'RESPONSABLE')`, dado que `isResolutorSubsidio` es false en esa rama)*.

---

## 4. Análisis de `SolicitudModal.jsx` (Tarea 3c)

### 4.1 Estructura Actual de Roles y Menú Desplegable
En `SolicitudModal.jsx`:
- Líneas 9-12:
  ```javascript
  const { user } = useAuth();
  const isResponsable = user?.role === 'RESPONSABLE' || user?.role === 'RESOLUTOR';
  const canSuggestResolutor = user?.role === 'RESPONSABLE';
  const isResolutor = user?.role === 'RESOLUTOR';
  ```
  *Nota:* Actualmente el componente no tiene calculada la variable `isResolutorSubsidio` ni una verificación explícita de Administrador para los estados del selector.

- Renderizado del menú desplegable (select) de estados (líneas 560 - 572, en particular línea 570):
  ```jsx
  {!!formData.id && (
      <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
          <select
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
              <option value="pendiente">Pendiente</option>
              <option value="en proceso">Asignadas</option>
              <option value="en resolucion">En Resolución</option>
              <option value="completadas">Resueltas</option>
              <option value="rechazada">Rechazado</option>
              <option value="consideracion">Consideración</option>
          </select>
      </div>
  )}
  ```
- **Hallazgo Crítico:** La opción `<option value="consideracion">Consideración</option>` (línea 570) se renderiza incondicionalmente para cualquier usuario que abra el modal en modo edición (`!!formData.id`), sin importar si es Administrador, Responsable, Resolutor de Subsidio u Operador.

### 4.2 Propuesta de Modificación para `SolicitudModal.jsx`

1. Añadir el cálculo de permisos en la cabecera del componente (cerca de la línea 13):
   ```javascript
   const isResolutorSubsidio = user?.role === 'RESOLUTOR' && user?.tiposResolucion?.some(t => (t.tipo || t)?.toUpperCase() === 'SUBSIDIO');
   const canPonerConsideracion = 
       user?.role === 'ADMINISTRADOR' || 
       user?.role === 'ADMIN' || 
       user?.role === 'RESPONSABLE' || 
       isResolutorSubsidio;
   ```

2. Condicionar la opción en el selector de estados (línea 570):
   ```jsx
   {(canPonerConsideracion || formData.status === 'consideracion') && (
       <option value="consideracion">Consideración</option>
   )}
   ```
   *Nota de diseño:* Incluir `|| formData.status === 'consideracion'` garantiza que si una solicitud ya se encuentra en el estado "Consideración" y es abierta por un usuario con un rol no autorizado, el control `<select>` mantenga la opción seleccionada correctamente en lugar de forzar un cambio de estado desincronizado en la UI.

---

## 5. Tabla Comparativa de Comportamiento Esperado vs. Actual

| Componente | Elemento UI | Rol del Usuario | Comportamiento Actual | Comportamiento Esperado (Propuesto) |
|---|---|---|---|---|
| `ProjectDetailsPage.jsx` | Botón "Poner en Consideración" | Administrador / Responsable | Visible (Rama B) | Visible |
| `ProjectDetailsPage.jsx` | Botón "Poner en Consideración" | Resolutor de Subsidio | Visible (Rama A) | Visible |
| `ProjectDetailsPage.jsx` | Botón "Poner en Consideración" | Operador / Otro | **Visible** (Rama B, Fallo) | **Oculto** |
| `SolicitudModal.jsx` | Opción `<option value="consideracion">` | Administrador / Responsable | Visible | Visible |
| `SolicitudModal.jsx` | Opción `<option value="consideracion">` | Resolutor de Subsidio | Visible | Visible |
| `SolicitudModal.jsx` | Opción `<option value="consideracion">` | Operador / Otro | **Visible** (Fallo) | **Oculto** (salvo que `status === 'consideracion'`) |

---

## 6. Método de Verificación

1. **Inspección de Código:**
   - Verificar la adición de `isAuthorizedForConsideracion` en `ProjectDetailsPage.jsx` y su aplicación en la línea 1121.
   - Verificar la adición de `canPonerConsideracion` e `isResolutorSubsidio` en `SolicitudModal.jsx` y su aplicación en la línea 570.
2. **Verificación de Pruebas Automáticas / Playwright:**
   - Ejecutar la suite de pruebas E2E `npx playwright test tests/etapa_8_funcional.spec.js` o `tests/validacion_manual_etapa8.spec.js`.
