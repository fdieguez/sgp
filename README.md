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
El despliegue se realiza mediante Docker, pero la base de datos MySQL corre nativamente en el host por rendimiento.
1. Actualizar código: `git pull origin main`.
2. Ejecutar script de despliegue: `/devops/scripts/deploy_mysql_version.sh`.

---

## 🤖 Notas para Asistentes de IA (Contexto)
- **Base de Datos:** El sistema utiliza un `DataInitializer.java` que crea usuarios semilla y carga un dataset de miles de localidades de Santa Fe al iniciar con una DB vacía.
- **Atributos Dinámicos:** Los formularios de resolución no son rígidos; se configuran desde la UI de Admin y se renderizan dinámicamente en el frontend basados en el `TipoResolucion`.
- **Mantenimiento SSL:** Los scripts en `devops/scripts/` manejan la renovación del certificado Let's Encrypt deteniendo temporalmente el contenedor de Nginx para liberar el puerto 80.
- **Changelog:** Siempre consultar `docs/CHANGELOG.md` para entender en qué versión y etapa se encuentra el proyecto antes de sugerir cambios profundos.

---
*Ultima actualización: Abril 2026*
