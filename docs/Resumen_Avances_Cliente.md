# 📊 Resumen de Avances del Proyecto: Sistema de Gestión de Solicitudes (SGP)

Este documento detalla el progreso funcional y tecnológico consolidado desde el inicio del proyecto hasta su estabilización en la etapa actual. El orden cronológico refleja el desarrollo del sistema desde la base fundacional hasta las características más recientes de visualización e inclusión.

---

## 📌 Diciembre 2025: Base y Arquitectura Inicial
Durante esta etapa se establecieron los cimientos del sistema para garantizar el registro integral de la información y la experiencia del usuario.

*   **Fundación Tecnológica:** Configuración y persistencia inicial de la base de datos (H2) y establecimiento de medidas de seguridad con autenticación cifrada (JWT).
*   **Integración con Google Sheets:** Desarrollo del servicio de integración automática para obtener información actualizada desde planillas en vivo mediante la API de Google, sin costos ni cuotas excesivas.
*   **Diseño Premium y Visualización:** 
    *   Creación del Dashboard principal con diseño moderno, intuitivo e interactivo.
    *   Implementación de gráficos dinámicos con auto-detección de columnas categóricas, listos para visualizar estadística general.
*   **Gestión de Vista:** Incorporación de truncamiento automático de información extensa y un panel de filtros avanzados para navegar grandes volúmenes de datos cómodamente.

## 📌 Enero 2026: MVP Funcional, Identificación de Datos y Primer Despliegue (v0.1.0)
El sistema comenzó a tomar contacto con situaciones reales, sumando administración de usuarios y depuración de la trazabilidad.

*   **Identificación Inteligente de Contactos ("Row Hunting"):** Creación de un algoritmo para procesar adecuadamente cualquier reacomodamiento en las planillas (buscando encabezados y variables de forma automática y detectándolos).
*   **Depuración de Sincronización:** Resolución exitosa de incompatibilidades al ingerir gran cantidad de datos, asegurando que locaciones, barrios, origen, instituciones y nombres extralargos se guardaran sin pérdida de información (aumentando la capacidad a 1000 caracteres donde era necesario).
*   **Gestión Avanzada de Usuarios (ABM):** Consolidación total de la creación, baja y modificación de usuarios dentro del portal, diferenciando jerárquicamente a los "Administradores" (con todos los privilegios) de los "Usuarios/Responsables".
*   **Subida a la Nube (Producción):** 
    *   Despliegue exitoso del sistema en el servidor DonWeb bajo el dominio oficial `solicitudes.ultrasoft.website`.
    *   Resolución de bloqueos de red (CORS), optimización de tiempos de carga y aplicación de configuración de seguridad en la nube (Proxy Inverso Nginx).

## 📌 Febrero 2026: Reestructuración Integral del Modelo Cíclico (v0.2.0)
A este nivel, se dio el recambio técnico y visual más grande de cara a satisfacer detalladamente los requisitos (tipificación y ampliación de datos).

*   **Modelado Completo y Jerárquico de "Solicitudes":** Se fusionó la estructura para que los "Pedidos" y los "Subsidios" compartan reportes unificados pero con trazabilidad diferenciada, permitiendo ver todo en una misma área de trabajo con orden inquebrantable.
*   **Tablero de Control Extendido (18 Columnas):** Rediseño de la grilla de control dotándola de seguimiento profundo: 
    *   *Nuevos Campos y Punteros:* Zona/Eje, Fechas de Contacto Efectivo y Resolución, Observaciones enriquecidas.
    *   *Resultados y Auditoría:* Inclusión de campos "Resolución", "Detalle Expandido" y casilla de validación de "Control de 1er Contacto".
*   **Nuevos Formularios de Edición y Creación (ABM Completo):** Las vistas detalladas se dividieron en pestañas inteligentes (Tiempos y Seguimiento, Control, Gestión, Observaciones) simplificando la carga masiva y continua de registros. 
*   **Gestión de Locaciones:** Modificación y corrección de la jerarquía de las planillas para alojar Ciudades ligadas a Múltiples Barrios de forma consistente, evitando ciclos y colapsos.

## 📌 Marzo 2026: Sistema Estabilizado, Perfiles y Accesibilidad (v0.3.1 - Actual)
El proyecto alcanzó un grado de robustez que permite individualizar la experiencia por usuarios y mejorar la accesibilidad global.

*   **Dashboard Exclusivo de "Responsables":** 
    *   Creación de un panel segmentado donde cada usuario responsable (`/mis-solicitudes`) accede únicamente a lo que se le ha asignado o le corresponde a su Zona/Eje de trabajo.
    *   Cálculo y filtro de métricas particulares para el perfil en sesión, ocultando datos a los que no debería tener acceso o configuración del sistema, fortaleciendo la ciberseguridad a nivel pantalla.
*   **Análisis Dinámico e Interactivo:** 
    *   Las estadísticas y contadores globales (Pendiente, En Proceso, Completado, etc.) ahora funcionan como **Filtros Interactivos**; al hacer click en una estadística, toda la tabla de solicitudes se reduce dinámicamente según esa preferencia.
    *   Adición de filtros dinámicos por línea de tiempo (Rango personalizado: Último mes, 6 meses, Año, etc).
*   **UI/UX (Experiencia de Usuario e Integración):**
    *   Implementación de etiquetas visuales y traducción del proyecto casi por completo al español (Estados, Botones y Acciones).
    *   Mejora de diseño para prevenir fallos al ingresar textos de gestión sumamente largos o enlaces directos sin espaciamiento dentro del detalle de una solicitud.
*   **Inclusión Visual:** Agregado el revolucionario **Modo Daltónico** persitente. Un botón en las opciones reemplaza los patrones de colores (Ej: verde y rojo) por tonos de alto contraste azul y naranja, asegurando que todo el equipo logre interpretar semáforos de avance sin dificultad visual.

---

### 🚀 Próximas Implementaciones (Etapa 2 - En Agenda)
Una vez estabilizado el núcleo de Seguimiento de Solicitudes y Subsidios, los próximos pasos se orientan a:
1.  **Módulo de Agenda y Eventos:** Relación cruzada de solicitudes para crear flujos que terminen, por ejemplo, en una declaración de interés y a posteriori en una entrega pautada en calendario.
2.  **Reportes Ejecutivos:** Mapas de calor (Geolocalización por barrio y ciudad) y exportación directa de informes consolidados de gestión (PDF y Excel).
3.  **Módulo de Gestiones Gubernamentales:** Trazabilidad categorizada de pedidos escalados hacia otros Ministerios y Programas de la provincia.
