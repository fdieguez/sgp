# 🚀 Guía de Despliegue e Infraestructura de Producción - SGP

Esta guía documenta los pasos de administración, actualización de código y renovación de certificados de seguridad para el **Sistema de Gestión de Proyectos (SGP)** en el servidor de producción.

---

## 📋 Detalles de Infraestructura

- **Dominio**: `solicitudes.ultrasoft.website`
- **IP del Servidor**: `149.50.128.168`
- **Puerto SSH**: `5287`
- **Usuario SSH**: `root`
- **Ubicación del Código**: `/root/deploy/sgp/sgp/code`
- **Base de Datos**: MySQL corriendo localmente en el host del VPS (Puerto `3306`)
  - **Base de datos**: `sgp_db`
  - **Usuario**: `sgp_admin`
  - **Contraseña**: `P10xmK2vL9qRnW5z`

---

## 🔄 Procedimiento de Actualización y Despliegue Rápido (Deploy)

Cuando se suban nuevos cambios a la rama principal (`main`) en GitHub y necesiten aplicarse en producción, ejecute el siguiente bloque de comandos:

### 1. Conectarse al Servidor
Inicie sesión por terminal mediante SSH usando el puerto específico:
```bash
ssh -p 5287 root@149.50.128.168
```

### 2. Sincronizar el Código e Iniciar Recompilación
Una vez dentro del servidor, ejecute lo siguiente:
```bash
# Ir al directorio del código
cd /root/deploy/sgp/sgp/code

# Guardar temporalmente cualquier cambio local para evitar conflictos
git stash

# Descargar las últimas actualizaciones desde GitHub
git pull origin main

# Re-aplicar cambios guardados (si los hubiera)
git stash pop

# Detener los contenedores actuales
docker compose down

# Compilar de nuevo y levantar la aplicación en segundo plano
docker compose up -d --build
```

### 3. Verificar que los Servicios estén Corriendo
```bash
# Listar los contenedores activos
docker ps
```
Debe ver dos contenedores saludables:
- `sgp-backend` (Spring Boot corriendo en el puerto 8080)
- `sgp-frontend` (Nginx / React en los puertos 80 y 443)

Para ver el progreso de los logs en tiempo real:
```bash
docker compose logs -f backend
```

---

## 🔒 Configuración de Certificados SSL (HTTPS) con Certbot

El servidor utiliza **Let's Encrypt** para proveer HTTPS seguro. Nginx dentro del contenedor de Docker (`sgp-frontend`) lee los certificados directamente desde el host local en `/etc/letsencrypt` mediante un volumen en modo lectura.

### Renovación Manual de Certificados
Los certificados de Let's Encrypt expiran cada 90 días pero se renuevan solos. Si desea forzar la renovación manual o verificar su estado, realice los siguientes pasos directamente en el host del VPS:

1. Detener el contenedor de frontend temporalmente para liberar el puerto 80 si es necesario por Certbot (solo si usa modo standalone, en modo webroot/nginx no hace falta):
```bash
cd /root/deploy/sgp/sgp/code
docker compose stop frontend
```

2. Ejecutar la renovación con Certbot en el host:
```bash
certbot renew
```

3. Volver a iniciar el contenedor de frontend:
```bash
docker compose start frontend
```

4. Si los certificados se renovaron exitosamente, recargue la configuración del proxy de Nginx para aplicar el nuevo certificado:
```bash
docker exec sgp-frontend nginx -s reload
```

---

## 💾 Administración de la Base de Datos (MySQL)

Al estar instalada la base de datos de forma nativa en el sistema operativo del VPS, la administración se hace con el cliente local de MySQL.

### 1. Acceder a la Consola Interactiva
```bash
mysql -u sgp_admin -pP10xmK2vL9qRnW5z sgp_db
```

### 2. Generar un Respaldo de Seguridad (Backup)
```bash
mysqldump -u sgp_admin -pP10xmK2vL9qRnW5z sgp_db > /root/sgp_backup_$(date +%F).sql
```

### 3. Restaurar un Respaldo
```bash
mysql -u sgp_admin -pP10xmK2vL9qRnW5z sgp_db < /root/sgp_backup.sql
```

---

## 🛠️ Solución de Problemas Comunes (Troubleshooting)

### Error: Fallo de inyección de JavaMailSender al iniciar el backend
**Síntoma**: El backend falla al arrancar indicando que falta un bean de tipo `JavaMailSender`.
**Causa**: Falta la configuración de propiedades del correo electrónico en el archivo `application-prod.properties` para inicializar el bean de Spring Mail en producción.
**Solución**: Se agregaron valores dummy y variables por defecto al archivo de configuración. Asegúrese de que estén presentes en la ruta `/root/deploy/sgp/sgp/code/backend/src/main/resources/application-prod.properties`:
```properties
spring.mail.host=${SPRING_MAIL_HOST:localhost}
spring.mail.port=${SPRING_MAIL_PORT:25}
spring.mail.username=${SPRING_MAIL_USERNAME:}
spring.mail.password=${SPRING_MAIL_PASSWORD:}
```
