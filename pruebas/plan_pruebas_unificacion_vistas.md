# Plan de Pruebas: Unificación de Vistas y Limpieza de Métricas (Etapa 05)

Este plan de pruebas tiene como objetivo validar los cambios realizados para simplificar la interfaz del SGP, unificando las vistas de detalle/edición y removiendo métricas de montos económicos de las pantallas principales.

## 1. Verificación de Métricas (Stats)

### 1.1 Dashboard Principal
- **Objetivo:** Asegurar que la métrica de "Subsidios Entregados" ya no es visible.
- **Pasos:**
    1. Iniciar sesión con cualquier rol.
    2. Ir al Dashboard principal.
- **Resultado Esperado:** 
    - Deben aparecer 5 tarjetas (Total Solicitudes, Pendientes, En Resolución, Completados, Rechazados).
    - La tarjeta de "Subsidios Entregados" con el signo `$` NO debe aparecer.

### 1.2 Pantalla "Mis Solicitudes"
- **Objetivo:** Validar que los montos económicos se han removido de la vista de listado.
- **Pasos:**
    1. Entrar en un proyecto o en "Mis Solicitudes".
    2. Observar el panel superior de contadores (botones de colores).
    3. Observar la sección lateral (derecha) del gráfico.
- **Resultado Esperado:**
    - El contador de "Subsidios Entregados" en los botones superiores ya no existe.
    - La sección lateral que mostraba "Monto Total Subsidios" y "Promedio por Solicitud" ha sido eliminada.
    - El gráfico de distribución debe ocupar ahora todo el ancho de la sección de analítica.

---

## 2. Unificación de Vistas (Modal Unificado)

### 2.1 Acceso desde Iconos de Acción
- **Objetivo:** Validar que tanto "Ver" como "Editar" llevan a la misma interfaz.
- **Pasos:**
    1. En la tabla de solicitudes, hacer clic en el icono del **Ojo** (Ver Detalle).
    2. Cerrar y hacer clic en el icono del **Lápiz** (Editar).
- **Resultado Esperado:** Ambos iconos deben abrir el mismo modal con el sistema de pestañas (Tabs).

### 2.2 Funcionalidad de Pestañas en Solicitud Existente
- **Objetivo:** Comprobar que toda la información relevante es accesible desde una sola vista.
- **Pasos:**
    1. Abrir una solicitud existente.
    2. **Pestaña Formulario:** Modificar un campo (ej. Descripción) y verificar que se puede escribir.
    3. **Pestaña Notas Seguimiento:** Agregar un comentario nuevo ("Prueba de comentario unificado"). Verificar que se publica correctamente.
    4. **Pestaña Historial:** Verificar que se listan los cambios de estado o asignaciones previas.
    5. **Pestaña Adjuntos:** Subir un archivo de prueba. Verificar que aparece en la lista y se puede descargar.
- **Resultado Esperado:** Se puede navegar entre todas las pestañas sin que se pierdan los datos del formulario y sin necesidad de cerrar el modal.

### 2.3 Persistencia de Cambios
- **Objetivo:** Asegurar que el botón "Guardar" sigue funcionando correctamente en la vista unificada.
- **Pasos:**
    1. En la pestaña "Formulario / Detalles", cambiar el Estado a "En Proceso".
    2. Hacer clic en "Guardar Solicitud".
- **Resultado Esperado:** El modal se cierra, la tabla se actualiza y el cambio de estado persiste al volver a abrirla.

### 2.4 Comportamiento en Solicitud Nueva
- **Objetivo:** Validar que las pestañas de historial/seguimiento están protegidas en registros inexistentes.
- **Pasos:**
    1. Hacer clic en el botón "+ Nueva Solicitud".
- **Resultado Esperado:** 
    - Solo debe ser visible la pestaña "Formulario / Detalles". 
    - Las pestañas de Comentarios, Historial y Adjuntos NO deben aparecer (ya que no hay ID de solicitud aún).

---

## 3. Pruebas de Regresión Rápidas
- Verificar que al cambiar el tipo entre "Pedido" y "Subsidio", los campos específicos (Monto/Fecha Entrega) aparecen y desaparecen correctamente dentro de la pestaña de Formulario.
- Verificar que el buscador de la tabla principal sigue filtrando correctamente.
