# Plan de Implementación y Despliegue a Producción (DevOps)

> **Feature:** Pool Territorial y Autoasignación de Solicitudes (Etapa 2)  
> **Rama Origen:** `feature/pool-responsables-zona`  
> **Rama Destino:** `main`  
> **Servidor VPS de Producción:** `149.50.128.168`  
> **Directorio en Servidor:** `/root/deploy/sgp/sgp/`  
> **Fecha:** Septiembre 2026  
> **Destinatario:** DevOps / Release Engineer / Administrador de Infraestructura  

---

## 📌 1. Resumen de Cambios Técnicos
La presente entrega incorpora la funcionalidad de **Pool Territorial de Solicitudes** permitiendo al usuario Distribuidor asignar solicitudes directamente a una Zona geográfica sin designar un Responsable específico, y a los usuarios Responsables de dicha zona autoasignarse las solicitudes pendientes ("Tomar Solicitud").

* **Backend (Spring Boot 3 / Java 17):**
  * `SolicitudService.java`: Ajuste en el predicado de especificación JPA (`buildSpecification`) para visibilizar solicitudes sin responsable asignado dentro de la misma zona territorial del usuario.
  * `SolicitudService.java`: Incorporación del método transaccional atómico `tomarSolicitud(Long id)` con validación de zona, control de concurrencia y auditoría `AUTOASIGNADO`.
  * `SolicitudController.java`: Exposición del nuevo endpoint `POST /api/solicitudes/{id}/tomar`.
  * `DashboardService.java`: Sincronización del conteo de métricas para usuarios con rol `RESPONSABLE`.
  * `SolicitudWorkflowTest.java`: Nuevas pruebas unitarias automatizadas con cobertura total del flujo.
* **Frontend (React 19 / Vite / Tailwind):**
  * `SolicitudModal.jsx`: Adición de la opción `-- Sin Asignar (Pool de Zona) --`, preservación de zona al guardar y botón interactivo "Tomar Solicitud".
  * `ProjectDetailsPage.jsx`: Badge visual `Pool: <ZONA>` en columnas de solicitudes no asignadas y botón de acción rápida con icono `UserCheck`.
  * `etapa12_pool_responsables_zona.spec.js`: Suite de pruebas E2E con Playwright.

---

## 🚀 2. Procedimiento de Fusión (Merge) y Actualización de Repositorio

> [!IMPORTANT]
> El DevOps o Release Engineer debe asegurar que la rama `main` esté completamente actualizada con los cambios aprobados antes de proceder al despliegue en el entorno de producción.

### Paso 2.1: Merge de la Rama Feature a Main (Entorno Local de Desarrollo)
Ejecutar los siguientes comandos en la terminal local:

```bash
# 1. Asegurar que estamos en la rama feature y todo el trabajo esté commiteado
git status

# 2. Cambiar a la rama main
git checkout main

# 3. Traer los últimos cambios remotos de main si los hubiera
git pull origin main

# 4. Fusionar la rama feature en main (con mensaje descriptivo en español)
git merge feature/pool-responsables-zona -m "feat(etapa2): incorporar pool territorial y autoasignacion de solicitudes"

# 5. Publicar la rama main actualizada en el repositorio remoto de GitHub
git push origin main
```

---

## 🛠️ 3. Despliegue en el Servidor VPS de Producción

### Paso 3.1: Conexión SSH al Servidor
```bash
ssh root@149.50.128.168
```

### Paso 3.2: Actualización del Repositorio en el Servidor
Navegar al directorio de despliegue oficial y sincronizar con la rama `main`:

```bash
cd /root/deploy/sgp/sgp/

# Descargar las referencias remotas y alinear con main limpio
git fetch origin main
git reset --hard origin/main
```

### Paso 3.3: Reconstrucción y Levantamiento de Contenedores Docker
Recompilar las imágenes y reiniciar los servicios:

```bash
# Construir imágenes de backend y frontend e iniciar contenedores en segundo plano
docker compose up -d --build

# Limpieza preventiva de imágenes intermedias en desuso
docker image prune -f
```

---

## 🩺 4. Verificación y Smoke Test Post-Despliegue

### Paso 4.1: Verificación de Estado de Contenedores
```bash
docker ps
```
*Verificar que tanto el contenedor del backend (Spring Boot) como el de frontend (Nginx) figuren en estado `Up (healthy)`.*

### Paso 4.2: Inspección de Logs en Vivo
```bash
# Monitoreo de logs del backend
docker compose logs -f --tail=100 backend
```
*Asegurar que Spring Boot haya iniciado en puerto 8080 con perfil `prod` sin excepciones.*

### Paso 4.3: Smoke Test Funcional en Producción
1. Ingresar mediante el navegador a la URL productiva (`https://...` o `http://149.50.128.168`).
2. Iniciar sesión como Distribuidor o Administrador.
3. Crear una solicitud de prueba asignándola a una Zona territorial y seleccionando `-- Sin Asignar (Pool de Zona) --`.
4. Verificar que en la grilla figure con el badge `Pool: <ZONA>`.
5. Iniciar sesión con un usuario Responsable de esa zona geográfica y comprobar que visualiza el botón **"Tomar"** y puede adjudicarse la solicitud con éxito.

---

## ⏪ 5. Plan de Rollback (Contingencia)
En caso de detectar anomalías críticas no tolerables durante los primeros minutos de producción:

```bash
cd /root/deploy/sgp/sgp/

# 1. Regresar al commit previo estable de producción
git reset --hard bc04b1f

# 2. Reconstruir los contenedores con la versión previa
docker compose up -d --build

# 3. Notificar al equipo de desarrollo
```
