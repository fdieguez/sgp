# SGP - Sistema de Gestión de Proyectos y Solicitudes

Este proyecto es una plataforma integral diseñada para la gestión, seguimiento y resolución de solicitudes de ciudadanos o instituciones. Permite coordinar el flujo de trabajo entre múltiples roles operativos y decisores, integrando datos de Google Sheets y ofreciendo un dashboard de métricas en tiempo real.

## 🚀 Tecnologías Principales

### Backend
- **Lenguaje/Framework:** Java 17 con Spring Boot 3.2.1.
- **Base de Datos:** MySQL 8.0 (Producción Nativo) / H2 (Desarrollo).
- **Seguridad:** Spring Security con JWT (JSON Web Tokens).
- **Integraciones:** Google Sheets API para sincronización de datos.
- **Persistencia:** Spring Data JPA con Hibernate.

### Frontend
- **Framework:** React 19 con Vite.
- **Estilos:** Tailwind CSS (Diseño moderno, responsive y modo oscuro).
- **Gráficos:** Recharts para visualización de métricas en el Dashboard.
- **Iconografía:** Lucide React.
- **Navegación:** React Router 7.

### Infraestructura (DevOps)
- **Despliegue:** Docker Compose (Frontend, Backend, Nginx).
- **Servidor Web:** Nginx como Reverse Proxy y terminación SSL (HTTPS).
- **Certificados:** Let's Encrypt (Certbot).

---

## 📂 Estructura del Proyecto

- `code/backend/`: Código fuente de la API Spring Boot.
- `code/frontend/`: Aplicación React (SPA).
- `docs/`: Documentación técnica, manuales y el `CHANGELOG.md` detallado.
- `devops/scripts/`: Scripts de mantenimiento (SSL, backups, despliegue).
- `private/`: Carpeta (ignorada) para configuración sensible y guías de acceso.

---

## 🔐 Roles y Flujo de Trabajo

El sistema implementa un Control de Acceso Basado en Roles (RBAC) estricto:

1.  **OPERADOR:** Crea solicitudes y realiza el seguimiento inicial. Solo ve lo que él mismo crea.
2.  **DISTRIBUIDOR:** Actúa como hub central. Recibe todas las solicitudes y las asigna a un Responsable.
3.  **RESPONSABLE:** Gestiona las solicitudes de su zona/eje asignado. Puede sugerir una resolución o derivar a áreas resolutoras.
4.  **RESOLUTOR:** Aprueba o rechaza resoluciones finales, inyectando observaciones técnicas.
5.  **ADMINISTRADOR:** Gestión total de usuarios, catálogo de atributos dinámicos y tipos de resolución.

---

## 🛠️ Configuración y Despliegue

### Requisitos Previos
- Docker y Docker Compose.
- Java 17 y Maven (para desarrollo local).
- Node.js y npm (para desarrollo local).
- Archivo `credentials.json` de Google Cloud Service Account en la raíz.

### Despliegue en Producción
El despliegue se gestiona con Docker Compose para los servicios de frontend y backend, mientras que la base de datos MySQL 8 corre nativamente en el host por cuestiones de rendimiento.

#### 1. Copias de Seguridad (Backups)
*   **Comando de backup manual:**
    Se realiza con `mysqldump` utilizando `--no-tablespaces` debido a restricciones de privilegios:
    ```bash
    mysqldump --no-tablespaces -u sgp_admin -pP10xmK2vL9qRnW5z sgp_db > /root/backup_antes_etapa6_$(date +%F).sql
    ```
*   **Ubicación:** Los respaldos se almacenan en el directorio del usuario root (`/root/`).
*   **Backup Etapa 6:** El respaldo antes de aplicar los cambios definitivos de la Etapa 6 quedó guardado en el servidor en la ruta: `/root/backup_antes_etapa6_2026_05_27.sql`.

#### 2. Actualización del Sistema desde Git (Pull)
Para actualizar el código en el servidor de producción preservando las configuraciones personalizadas del servidor web local (como el proxy de `megabares-app` en `nginx.conf`) y aplicar los cambios con Docker Compose, siga estos pasos:

1.  **Resguardar cambios locales (Nginx):**
    ```bash
    cd /root/deploy/sgp/sgp
    git stash
    ```
2.  **Bajar el código actualizado:**
    ```bash
    git pull origin main
    ```
3.  **Restaurar los cambios locales resguardados:**
    ```bash
    git stash pop
    ```
4.  **Reconstruir imágenes y levantar servicios:**
    ```bash
    cd code
    docker compose down
    docker compose up -d --build
    ```
    *Nota:* El contenedor frontend utiliza la red externa `web-gateway` para intercomunicarse con el servicio `megabares-app`. Esta red debe estar activa en el servidor y declarada en `docker-compose.yml` para evitar crasheos en el inicio de Nginx.


---

## 🤖 Notas para Asistentes de IA (Contexto)
- **Base de Datos:** El sistema utiliza un `DataInitializer.java` que crea usuarios semilla y carga un dataset de miles de localidades de Santa Fe al iniciar con una DB vacía.
- **Atributos Dinámicos:** Los formularios de resolución no son rígidos; se configuran desde la UI de Admin y se renderizan dinámicamente en el frontend basados en el `TipoResolucion`.
- **Mantenimiento SSL:** Los scripts en `devops/scripts/` manejan la renovación del certificado Let's Encrypt deteniendo temporalmente el contenedor de Nginx para liberar el puerto 80.
- **Changelog:** Siempre consultar `docs/CHANGELOG.md` para entender en qué versión y etapa se encuentra el proyecto antes de sugerir cambios profundos.

---
*Ultima actualización: Mayo 2026*

