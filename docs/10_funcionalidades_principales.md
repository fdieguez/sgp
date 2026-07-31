# 📄 Resumen de Funcionalidades Principales - Etapa 8 SGP

Este documento detalla las **10 innovaciones y funcionalidades principales de la Etapa 8** del Sistema de Gestión de Proyectos (SGP), diseñadas para agilizar la gestión, automatizar tareas de calendario y robustecer la auditoría.

---

### 1. 👥 Multi-Asignación de Resolutores por Solicitud
Permite asignar múltiples resolutores con diferentes tipos de resolución a una misma solicitud. Esto facilita la colaboración en casos complejos que involucran subsidios, agendas y firmas de forma concurrente.

### 2. 🗓️ Integración Inteligente con Google Calendar
Al aprobar una solicitud con resolución de tipo **AGENDA**, el sistema crea de forma automática e inmediata un evento en el Google Calendar configurado para la cuenta institucional.

### 3. 🔍 Registro del Evento en Observaciones
Una vez que el evento de la agenda es creado en Google Calendar, el backend guarda automáticamente la fecha y hora agendada en la columna de observaciones de la asignación para consultas futuras y auditoría rápida.

### 4. 🟢 Indicador Visual de Agendamiento
El modal de detalle de solicitudes muestra un banner verde distintivo (`✔️ Aprobado y Agendado`) junto con la fecha y hora exacta del evento, permitiendo a los operadores identificar instantáneamente las reuniones programadas.

### 5. 🔄 Flujo Avanzado de "Poner en Consideración"
Implementación de un flujo dedicado para solicitudes de **SUBSIDIO**. Administradores, Responsables y Resolutores pueden poner solicitudes en estado de evaluación ("en consideración") mediante un botón dedicado en la grilla de control.

### 6. 📥 Importación Dinámica de Subsidios
Herramienta ágil que permite la importación masiva de solicitudes de subsidio desde planillas externas, con mapeo inteligente de campos como montos, fechas de otorgamiento y datos de beneficiarios.

### 7. 📤 Exportación y Reportes Personalizados
Capacidad de exportar la grilla de solicitudes y subsidios a formatos estructurados, facilitando la rendición de cuentas, la generación de reportes comerciales y el análisis territorial.

### 8. 🛡️ Control de Accesos por Tipo de Resolución
Restricciones de seguridad a nivel de datos. Cada resolutor (ej: Resolutor de Agenda o de Subsidios) visualiza de forma exclusiva las solicitudes vinculadas a su especialidad, protegiendo la confidencialidad de la información.

### 9. 📋 Historial y Auditoría de Estados
Sección de historial detallado que registra cronológicamente los cambios de estado de cada asignación, quién los realizó y cuándo, garantizando una trazabilidad del 100% de la gestión.

### 10. ⚙️ Formatos Dinámicos Nivel 2
Se adaptaron las interfaces y formularios para soportar atributos variables de resolución (ej: montos de subsidio, tipos de asistencia o datos de reuniones) que cambian según el tipo de resolución asignado.
