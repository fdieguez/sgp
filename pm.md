# 📋 Documento de Traspaso de Memoria entre Project Managers (PM Handover)
**Proyecto:** SGP — Sistema de Gestión Política (Módulo Gestión de Pedidos)  
**Fecha de Traspaso:** 18 de Septiembre de 2026  
**Rama Oficial:** `main` | **Último Commit en Producción:** `8de656e`  
**Estado General:** 🟢 Operativo, Estable y Desplegado en Producción

---

## 🏛️ 1. Identificación y Parámetros del Entorno

### 💻 Entorno Local
* **Ruta de Trabajo:** `c:\Users\fran\dev\projects\SGP`
* **Rama Git:** `main` (sincronizada con `origin/main` en GitHub: `https://github.com/fdieguez/sgp.git`).
* **Base de Datos Local:** MySQL 8.0 nativo en Windows (puerto `3306`, BD: `sgp_db`, user: `sgp_admin`).

### 🌐 Entorno de Producción (VPS)
* **IP VPS:** `149.50.128.168` | **Puerto SSH:** `5287` | **Usuario:** `root`
* **Dominio Público:** `https://solicitudes.ultrasoft.website` (Nginx con certificado SSL activo).
* **Ruta en VPS:** `/root/deploy/sgp/sgp/code`
* **Contenedores Docker Compose:**
  * `sgp-backend` (Spring Boot 3 en puerto 8080, conectado a MySQL 8 nativo del host en puerto 3306).
  * `sgp-frontend` (React compilado servido por Nginx en puertos 80 y 443).
  * `megabares-app` (Servicio independiente en red externa `web-gateway`).

---

## 🚀 2. Últimos Cambios Implementados y Verificados (Septiembre 2026)

### A. Reseteo de Índices en Limpieza de Base de Datos (`ID = 1`)
* **Archivo:** `code/backend/src/main/java/com/sgp/backend/service/MaintenanceService.java`
* **Comportamiento:** Al pulsar el botón de vaciado desde el panel de Administración (confirmando con `LIMPIAR` y contraseña), además de borrar en cascada las tablas transaccionales y archivos físicos, se ejecutan sentencias de reinicio de secuencias (`ALTER TABLE ... AUTO_INCREMENT = 1` en MySQL y fallback H2).
* **Resultado:** La siguiente solicitud que se cree en el sistema arranca con `ID = 1`. Tablas alcanzadas: `solicitudes`, `ticket_seguimiento`, `documento_adjunto`, `solicitud_resolutor_assignment`, `asignacion_historial`, `pedidos`, `subsidios`.

### B. Alta de Solicitud para el Rol Responsable
* **Archivos:**
  * `code/frontend/src/pages/ProjectDetailsPage.jsx`: Se añadió el rol `RESPONSABLE` a la condición que renderiza el botón `"Nueva Solicitud"`.
  * `code/frontend/src/components/SolicitudModal.jsx`: Cuando un Responsable abre el modal de alta, el sistema pre-vincula automáticamente su identificador (`responsableId = user.responsable?.id || user.id`) y su zona territorial asignada (`zone` y `selectedZone = user.responsable?.zone || user.zone`), permitiendo guardar la solicitud de forma directa y sin bloqueos de validación.
  * Backend: `POST /api/solicitudes` ya admite cualquier usuario autenticado en Spring Security.

### C. Nueva Identidad Visual y Pantalla de Bienvenida
* **Archivos:** `LoginPage.jsx`, `logo-sgp.svg`, `index.html`.
* **Detalle:** Denominación oficial institucional **"Sistema de Gestión Política"** (Módulo **"Gestión de Pedidos"**). Isotipo vectorial oficial y Dark Mode Tailwind (`bg-gray-900`/`bg-gray-800`).

### D. Seguridad en Git y Gestión Local de Credenciales
* **Regla Crítica:** En `.gitignore` están excluidos permanentemente `usuarios_contrasenas*.txt`, `update_users*.sql` y `videos_demo/`.
* **Nómina Oficial Local:** El archivo con los 33 usuarios, contraseñas y roles ordenados se encuentra guardado exclusivamente de forma local en:
  `c:\Users\fran\dev\projects\SGP\usuarios_contrasenas_sgp.txt`.

---

## 👥 3. Esquema de Roles y Cuentas Principales

En SGP, algunos usuarios cuentan con **roles combinados** (`RESPONSABLE,RESOLUTOR` o `RESPONSABLE,DISTRIBUIDOR`):
* **ADMINISTRADOR**: `admin@sgp.com` (Control y configuración general).
* **RESOLUTORES TEMÁTICOS EXCLUSIVOS**:
  * **Agenda:** Verónica González (`mveronicagonzalez79@gmail.com`).
  * **Subsidio:** Martín Nocioni (`martinnocioni@gmail.com`).
  * **Declaración de Interés:** Eduardo Alfaro (`ealfaro.51@gmail.com`).
  * **Resolutor Defecto:** `resolutor@sgp.com`.
* **OPERADORES (Mesa de Entrada):** Maria Celeste Solari (`celeste_solari19@hotmail.com`), Sabrina Schmidt (`sabrivschmidt@gmail.com`).
* **DISTRIBUIDORES TERRITORIALES:** Matías Ippólito (`matias.ippolito@gmail.com` - Norte), Maxi Caraffa (`caraffamaxi@gmail.com`), Florencia Vildoza (`fy.vildoza@gmail.com`).
* **RESPONSABLES:** 18 responsables territoriales distribuidos en zonas (Costa, Noroeste, Oeste, Suroeste, General).
* **AUDITORES:** Juan Manuel Dieguez (`juanm.dieguez@gmail.com`), `test.auditor@gmail.com`, `auditor.sheets@gmail.com`.

---

## 📌 4. Reglas Mandatorias del Proyecto

1. **IDIOMA EXCLUSIVO (ESPAÑOL):**
   Todos los comentarios dentro del código, explicaciones, documentación en línea (JSDoc, JavaDoc) y nombres de commits de Git DEBEN estar escritos obligatoriamente y de forma exclusiva en **ESPAÑOL**.
2. **CALIDAD Y PRINCIPIOS:**
   KISS (Mantenlo simple), DRY (No te repitas) y SOLID sin sobreingeniería.
3. **SEGURIDAD DE REPOSITORIO:**
   NUNCA comitear ni subir a GitHub archivos con contraseñas, dumps SQL con datos reales ni archivos `.env`.
4. **DESPLIEGUE EN PRODUCCIÓN:**
   Siempre compilar y verificar localmente antes (`mvn test-compile` y `npm run build`), comitear en español, pushear a `main` y en el VPS ejecutar `git fetch origin main && git reset --hard origin/main && cd code && docker compose up -d --build`.

---

## 💬 5. Prompt de Inicio para el Próximo Chat

Copia y pega el siguiente bloque en el nuevo chat para iniciar la sesión con todo el contexto cargado:

```markdown
Hola. Asumes el rol de Technical Lead y Project Manager del proyecto SGP (Sistema de Gestión Política).

Contexto del proyecto y estado actual:
1. RUTA LOCAL: c:\Users\fran\dev\projects\SGP (rama main, sincronizada con GitHub).
2. SERVIDOR PRODUCCIÓN: VPS IP 149.50.128.168 | Puerto SSH: 5287 | Usuario: root | Dominio: https://solicitudes.ultrasoft.website.
3. STACK: Spring Boot 3 (Java 17, Maven, MySQL 8), React (Vite, Tailwind CSS, Lucide React), Nginx y Docker Compose.
4. LÍNEA BASE ACTUAL (18/09/2026 - Commit 8de656e):
   - Mantenimiento: El vaciado de datos resetea AUTO_INCREMENT = 1 en todas las tablas transaccionales.
   - Rol Responsable: Ya cuenta con el botón "Nueva Solicitud" habilitado y con pre-asignación automática de su ID y Zona territorial.
   - Identidad Visual: "Sistema de Gestión Política" (Módulo "Gestión de Pedidos") con isotipo institucional vectorizado.
   - Credenciales: La nómina de 33 cuentas oficiales está guardada de forma local y protegida en usuarios_contrasenas_sgp.txt (ignorado en Git).
5. REGLAS MANDATORIAS:
   - Toda documentación, explicaciones, comentarios de código y commits de Git DEBEN ser en estricto ESPAÑOL.
   - NUNCA subir archivos de contraseñas ni credenciales a GitHub.
   - Priorizar simplicidad (KISS) y solidez operativa.

Por favor, confirma que comprendes este contexto técnico y quedo a la espera de indicarte la siguiente tarea a desarrollar.
```
