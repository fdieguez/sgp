# Guía de Obtención de Logs de Producción (VPS)

Este documento detalla los pasos y comandos necesarios para conectarse al servidor VPS de producción y descargar o consultar los logs de los contenedores Docker (`sgp-backend`, `sgp-frontend`/Nginx, etc.) para tareas de diagnóstico y auditoría.

---

## 1. Datos de Conexión al Servidor

* **Proveedor:** DonWeb VPS
* **IP del Servidor:** `149.50.128.168`
* **Puerto SSH:** `5287`
* **Usuario:** `root` (o el usuario de administración configurado)

### Comando de Conexión SSH:
```bash
ssh -p 5287 root@149.50.128.168
```

---

## 2. Contenedores en Producción

Para listar los contenedores en ejecución y verificar sus nombres e IDs:
```bash
docker ps
```

Los contenedores principales del sistema son:
* `sgp-backend`: API Spring Boot (puerto interno 8080)
* `sgp-frontend`: Servidor Web Nginx (puertos 80 y 443 con SSL)
* `sgp-db` / `mysql`: Base de datos MySQL / MariaDB (si aplica)

---

## 3. Comandos para Consultar Logs en Vivo

### A. Ver logs en tiempo real (seguimiento en vivo)
```bash
# Backend Spring Boot
docker logs -f --tail 200 sgp-backend

# Frontend / Nginx (peticiones HTTP y errores)
docker logs -f --tail 200 sgp-frontend
```

### B. Filtrar logs por rango de tiempo / horario
Docker soporta los parámetros `--since` y `--until` con marcas de tiempo ISO 8601 o relativas (UTC o con offset):

```bash
# Ejemplo: Logs entre las 12:13 y las 12:45 (Hora Argentina UTC-3 = 15:13 a 15:45 UTC)
docker logs --since "2026-10-02T15:13:00Z" --until "2026-10-02T15:45:00Z" sgp-backend

# Logs de los últimos 30 minutos
docker logs --since 30m sgp-backend
```

### C. Buscar errores específicos con grep
```bash
# Buscar excepciones y errores 500 en Backend
docker logs --tail 1000 sgp-backend | grep -E "ERROR|Exception|WARN" -C 3

# Buscar errores 4xx o 5xx en Nginx
docker logs --tail 1000 sgp-frontend | grep -E " 413 | 500 | 502 "
```

---

## 4. Exportar y Descargar Logs a tu Máquina Local

### Opción A: Guardar logs en un archivo en el servidor y descargarlos con SCP

1. **En el servidor VPS**, exportar los logs del contenedor a un archivo `.log`:
```bash
# Exportar Backend
docker logs --since "2026-10-02T15:13:00Z" --until "2026-10-02T15:45:00Z" sgp-backend > /root/sgp-backend-logs.log

# Exportar Frontend / Nginx
docker logs --since "2026-10-02T15:13:00Z" --until "2026-10-02T15:45:00Z" sgp-frontend > /root/sgp-frontend-logs.log
```

2. **En tu consola local (PowerShell / Terminal de tu PC)**, descargar el archivo mediante SCP:
```bash
scp -P 5287 root@149.50.128.168:/root/sgp-backend-logs.log ./sgp-backend-logs.log
scp -P 5287 root@149.50.128.168:/root/sgp-frontend-logs.log ./sgp-frontend-logs.log
```

---

### Opción B: Descargar directamente en un solo comando desde tu máquina local

Puedes ejecutar el comando remoto y redirigir la salida directamente a tu disco local:

```powershell
# En PowerShell de tu máquina local:
ssh -p 5287 root@149.50.128.168 "docker logs --since '2026-10-02T15:13:00Z' --until '2026-10-02T15:45:00Z' sgp-backend" > backend-logs.txt
ssh -p 5287 root@149.50.128.168 "docker logs --since '2026-10-02T15:13:00Z' --until '2026-10-02T15:45:00Z' sgp-frontend" > frontend-logs.txt
```

---

## 5. Ubicación de Archivos de Logs Internos de Nginx (SSL y Accesos)

Si necesitas inspeccionar directamente los archivos de log de Nginx dentro del contenedor:
```bash
# Entrar al contenedor Nginx
docker exec -it sgp-frontend sh

# Ver logs de error
cat /var/log/nginx/error.log

# Ver logs de acceso
cat /var/log/nginx/access.log
```

---
*Documentado para soporte y mantenimiento de SGP - Octubre 2026*
