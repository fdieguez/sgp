# Plan de Pruebas: Pool Territorial y Autoasignación de Solicitudes (Etapa 2)

> **Módulo:** Asignación y Distribución Territorial de Solicitudes  
> **Versión:** SGP 1.1.0-RC (Etapa 2)  
> **Fecha:** Septiembre 2026  
> **Destinatario:** Tester / Equipo de QA  

---

## 🎯 1. Objetivo de las Pruebas
Validar funcionalmente y de forma integral el nuevo circuito de asignación territorial y autoasignación ("Pool de Zona") en el Sistema de Gestión Política (SGP), asegurando que:
1. El usuario **Distribuidor** o **Administrador** pueda asignar una solicitud a una Zona Territorial sin necesidad de designar un Responsable específico.
2. Todos los usuarios con rol **Responsable** asignados a esa misma zona territorial puedan visualizar la solicitud disponible en su bandeja de entrada.
3. Los usuarios **Responsables** de otras zonas geográficas **no** tengan visibilidad de solicitudes que no corresponden a su jurisdicción territorial.
4. Cualquier **Responsable** de la zona correspondiente pueda autoasignarse la solicitud ("Tomar Solicitud") tanto desde la grilla principal como desde el modal de detalle.
5. Al tomar la solicitud, el sistema actualice el estado automáticamente a **"Asignadas"** (`en proceso`), la adjudique al usuario autenticado, la remueva del pool de los demás colegas de la zona y registre el movimiento en el historial de auditoría como `AUTOASIGNADO`.
6. Se garantice el control de concurrencia: si dos usuarios intentan tomar la misma solicitud simultáneamente, sólo uno lo logra y el otro es notificado de forma prolija con un mensaje de conflicto (`HTTP 409 Conflict`).

---

## 👥 2. Usuarios y Perfiles de Prueba Sugeridos

Para realizar las pruebas en entorno local (`http://localhost:5173`):

| Rol | Correo Electrónico | Contraseña | Zona Asignada |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@sgp.com` | `SGP_Admin_#2026_Prod_Secure_!` | Todas |
| **Distribuidor** | `fy.vildoza@gmail.com` | Contraseña asignada local | Todas |
| **Responsable 1 (Norte)** | `adflucha@gmail.com` | Contraseña asignada local | `NORTE` |
| **Responsable 2 (Norte)** | `carinacdevard@gmail.com` | Contraseña asignada local | `NORTE` |
| **Responsable 3 (Sur)** | `diegopiedrabuena74@gmail.com` | Contraseña asignada local | `SUR` |

---

## 📋 3. Matriz de Casos de Prueba (Manuales y E2E)

### Caso TC-POOL-01: Creación / Distribución de Solicitud con Zona en Pool
* **Objetivo:** Comprobar que una solicitud puede guardarse con Zona pero sin Responsable.
* **Precondiciones:** Sesión iniciada como Distribuidor o Administrador.
* **Pasos:**
  1. Ir a `/mis-solicitudes` y hacer clic en **"Nueva Solicitud"** (o abrir una existente en estado Pendiente).
  2. Completar los datos obligatorios del solicitante y la descripción.
  3. En el campo **"Zona Territorial"**, seleccionar `NORTE`.
  4. En el campo **"Responsable"**, verificar que figure la opción `-- Sin Asignar (Pool de Zona) --` y dejarla seleccionada.
  5. Hacer clic en **"Guardar Solicitud"**.
* **Resultado Esperado:**
  * Notificación toast de éxito.
  * La solicitud aparece en la grilla con estado **"Pendiente"**.
  * En la columna *RESPONSABLE* se visualiza el badge destacado `Pool: NORTE`.

---

### Caso TC-POOL-02: Visibilidad en Bandeja para Responsable de la Misma Zona
* **Objetivo:** Verificar que un Responsable de la zona NORTE visualice la solicitud en su pool.
* **Precondiciones:** Existencia de una solicitud en `Pool: NORTE`.
* **Pasos:**
  1. Iniciar sesión como `Responsable 1 (Norte)` (`adflucha@gmail.com`).
  2. Navegar a `/mis-solicitudes`.
  3. Localizar la solicitud creada en el TC-POOL-01.
* **Resultado Esperado:**
  * La solicitud es visible en la grilla principal.
  * Se exhibe el badge `Pool: NORTE`.
  * En la columna de acciones rápidas a la derecha, se muestra el botón verde **"Tomar Solicitud"** con icono de usuario y verificación.

---

### Caso TC-POOL-03: Aislamiento Territorial (Responsable de Otra Zona)
* **Objetivo:** Verificar que un Responsable de zona SUR **no** visualice solicitudes del pool NORTE.
* **Precondiciones:** Solicitud existente en `Pool: NORTE`.
* **Pasos:**
  1. Iniciar sesión como `Responsable 3 (Sur)` (`diegopiedrabuena74@gmail.com`).
  2. Navegar a `/mis-solicitudes`.
  3. Buscar por el identificador o nombre del solicitante creado en el TC-POOL-01.
* **Resultado Esperado:**
  * La solicitud **no** aparece en la lista ni en los resultados de búsqueda.
  * Queda garantizado el aislamiento y privacidad de trabajo territorial.

---

### Caso TC-POOL-04: Autoasignación desde Grilla Principal ("Tomar Solicitud")
* **Objetivo:** Validar la acción de tomar solicitud desde el botón de la fila.
* **Precondiciones:** Sesión iniciada como `Responsable 1 (Norte)`.
* **Pasos:**
  1. En la fila de la solicitud en `Pool: NORTE`, hacer clic en el botón verde **"Tomar Solicitud"**.
  2. Confirmar el cuadro de diálogo emergente del navegador.
* **Resultado Esperado:**
  * Mensaje toast: *"¡Solicitud #X asignada a tu bandeja con éxito!"*.
  * La fila se actualiza reactivamente:
    * El responsable pasa a ser el nombre del usuario autenticado.
    * El estado pasa a **"Asignadas"** (`en proceso`).
    * El botón "Tomar" desaparece de la fila.

---

### Caso TC-POOL-05: Autoasignación desde el Modal de Detalle
* **Objetivo:** Validar que el botón "Tomar esta Solicitud" también funcione dentro del modal.
* **Precondiciones:** Crear una segunda solicitud en `Pool: NORTE`. Sesión como `Responsable 2 (Norte)`.
* **Pasos:**
  1. Hacer clic en el icono de edición/ver detalle de la solicitud en pool.
  2. En el pie del modal, verificar la presencia del botón verde destacado **"Tomar Solicitud"**.
  3. Hacer clic en **"Tomar Solicitud"**.
* **Resultado Esperado:**
  * Toast de confirmación.
  * El modal se cierra y la grilla se actualiza con la solicitud adjudicada a `Responsable 2 (Norte)`.

---

### Caso TC-POOL-06: Verificación de Historial de Auditoría
* **Objetivo:** Comprobar la trazabilidad del evento de autoasignación.
* **Precondiciones:** Solicitud tomada en TC-04 o TC-05.
* **Pasos:**
  1. Abrir la solicitud y navegar a la pestaña **"Historial"**.
  2. Inspeccionar los registros de eventos.
* **Resultado Esperado:**
  * Figura un evento con tipo de acción `AUTOASIGNADO` (o `ASSIGNED`).
  * Figura el usuario que realizó la acción y la marca de tiempo exacta.

---

### Caso TC-POOL-07: Concurrencia y Bloqueo de Duplicidad
* **Objetivo:** Comprobar que no es posible tomar una solicitud que ya fue tomada.
* **Precondiciones:** Solicitud ya tomada por el Responsable 1.
* **Pasos:**
  1. Desde otra sesión o mediante llamado manual al API (`POST /api/solicitudes/{id}/tomar`), intentar adjudicar la misma solicitud a otro usuario.
* **Resultado Esperado:**
  * El backend responde con `HTTP 409 Conflict` y el mensaje: *"La solicitud ya fue tomada por otro responsable"*.
  * No se produce corrupción ni sobreescritura accidental.

---

## 🤖 4. Ejecución Automatizada E2E

Para ejecutar la batería automatizada de regresión y pool territorial:

```bash
# En code/frontend
npx playwright test tests/etapa12_pool_responsables_zona.spec.js --reporter=list
```
