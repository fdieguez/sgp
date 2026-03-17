# Funcionalidades - Etapa 1 y Sugerencias Etapa 2

A continuación, se detalla el plan basado en el documento `Sistema de Gestión - Requerimientos .md`, incorporando lo desarrollado y proyectando las próximas fases (Estilo Jira).

## 🚀 Etapa 1 (Actual - Sprint de Estabilización)

### Objetivos y Tareas Completadas / En Curso (J1)
- **Pedidos y Subsidios Core**: [Completado] ABM de solicitudes abstractas uniendo Pedidos y Subsidios en una misma tabla (herencia). 
- **Gestión de Roles**: [Completado] Diferenciación estricta entre Administrador y Responsable. Vistas particionadas.
- **Filtros por Origen/Zona/Estado/Barrio**: [Completado] Buscador multinivel y filtros analíticos mediante JPA Specifications.
- **Flujo de Asignación y Control**: [En Curso - *Hoy*] Resolver visibilidad de la jerarquía de Locaciones (Ciudad/Barrio) en formas manuales, permitiendo al Admin auditar todo y al Responsable re-asignar cargas (derivaciones entre áreas).

---

## 🔮 Etapa 2 (Próximo Sprint - Gestión Avanzada y Agenda)

Basado en tus requerimientos y las dinámicas habituales de gestión pública/proyectos, sugiero las siguientes **Características (Epics)** para Jira:

### Epic 1: Módulo de Agenda y Eventos
- **Task**: Crear entidad `Event` o relacionar [Solicitud](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/main/java/com/sgp/backend/entity/Solicitud.java#12-77) con una tabla de `Timeline`.
- **Feature**: Vista de Calendario (mensual/semanal) donde se mapean automáticamente los pedidos que requieran intervención presencial.
- **Feature**: Declaraciones de Interés. Las solicitudes con orígenes y resoluciones tipo "Declaratoria" alertarán en el panel para fijar fecha de entrega.

### Epic 2: Módulo de Gestiones Gubernamentales y Origen
- **Task**: Ampliar la tipificación de [Solicitud](file:///c:/Users/fran/dev/projects/SGP/code/backend/src/main/java/com/sgp/backend/entity/Solicitud.java#12-77) (añadir subtipos `GestionGobierno` y `ProyectoLegislativo`).
- **Feature**: Agregar metadatos de clasificación específicos: Provincia, Ministerio, Programa (para Gestiones).
- **Feature**: Flujo de conversión. Botón "Convertir a..." para evolucionar un simple pedido de Instagram en un Proyecto de Acción consolidado con múltiples hitos.

### Epic 3: Reportes, Comunicación e Informes Avanzados
- **Task**: Generación de reportes PDF y Excel directamente desde el Dashboard (ej. "Descargar Informe Mensual de la Zona Centro").
- **Feature**: Mapa de Calor (Geolocalización). Si integramos coordenadas a los Barrios, generar un mapa visual (react-leaflet) de densidad de pedidos por Localidad departamental.
- **Feature**: Tracking público de la solicitud. Un código único que se le da al solicitante para consultar en la web en qué estado se encuentra su trámite.

---

## 🛠️ Guía Técnica: Conexión a Base de Datos en Docker con HeidiSQL

La base de datos actual está en un contenedor Docker, por lo general usando la versión de red aislada del servidor VPS. 

**Pasos para conectarse en local hacia Producción**:
1. Abri **HeidiSQL**.
2. Crear una nueva conexión y en tipo de red (Network Type) seleccioná: `MariaDB/MySQL (SSH tunnel)` (si usas Postgres es `PostgreSQL (SSH tunnel)`).
3. **Pestaña Settings *(Ajustes Base de Datos)***:
   - **Hostname**: `127.0.0.1` (o `localhost` porque lo harás dentro del túnel)
   - **User**: _el usuario del postgres de docker_ (ej: `postgres` o `sgp_user`)
   - **Password**: _la clave del postgres_ (ej: la de tu archivo `.env`)
   - **Port**: `5432`
4. **Pestaña SSH tunnel**:
   - **Plink.exe**: Necesitas descargar u ubicar el ejecutable `plink.exe` (suele venir con Putty).
   - **SSH Host**: La IP de tu servidor DonWeb (ej: `149.50.128.168`)
   - **SSH Port**: `22` (o el puerto que maneje SSH en tu servidor)
   - **Username**: `root` o el usuario inicial de red.
   - **Password**: tu contraseña root (o configurar la llave privada).
   - **Local port**: Un puerto al azar tipo `3307` o dejalo vacío.
5. Dale a "Abrir". HeidiSQL creará remotamente la sesión SSH, emulará que el PostgreSQL de Docker está en tu computadora y te dejará entrar y explorar tablas a fondo visualmente.
