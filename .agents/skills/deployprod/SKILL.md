---
name: deployprod
description: >-
  Despliega automáticamente en producción (VPS DonWeb) los últimos cambios de la rama main.
  Realiza un backup preventivo de MySQL, descarga los respaldos previos al directorio local db_bkp/,
  conserva solo el último backup en el VPS, inyecta la pantalla de mantenimiento en caliente,
  actualiza el repositorio con git reset --hard origin/main, reconstruye los contenedores
  con Docker Compose y verifica que la plataforma quede operativa (HTTP 200).
---

# Procedimiento de Despliegue en Producción (/deployprod)

Este skill define el protocolo estricto y desatendido para realizar un pase a producción del proyecto **SGP (Sistema de Gestión Política)** ante el comando `/deployprod` o cuando el usuario solicite actualizar producción.

---

## 📌 Contexto de Infraestructura y Credenciales

1. **Entorno Local:**
   - Ruta base: `c:\Users\fran\dev\projects\SGP`
   - Carpeta de almacenamiento de respaldos: `./db_bkp/`

2. **Servidor de Producción (VPS DonWeb):**
   - **IP:** `149.50.128.168`
   - **Puerto SSH:** `5287`
   - **Usuario SSH:** `root`
   - **Clave SSH:** `1.2.3.Fnd.2026`
   - **Ruta del repositorio en el VPS:** `/root/deploy/sgp/sgp/`
   - **Ruta de Docker Compose:** `/root/deploy/sgp/sgp/code`
   - **Base de Datos MySQL (Host nativo):** Puerto `3306`, DB: `sgp_db`, Usuario: `sgp_admin`, Clave: `P10xmK2vL9qRnW5z`
   - **Dominio Público:** `https://solicitudes.ultrasoft.website`

---

## 🛠️ Protocolo de Ejecución Paso a Paso

### Paso 1: Generar Copia de Seguridad Preventiva de la Base de Datos
Ejecutar por SSH en el VPS:
```bash
plink -ssh -P 5287 -pw 1.2.3.Fnd.2026 -batch root@149.50.128.168 'TS=$(date +"%Y-%m-%d_%H%M%S"); mysqldump -u sgp_admin -pP10xmK2vL9qRnW5z --no-tablespaces --single-transaction --quick --routines --triggers sgp_db | gzip > "/root/backups/sgp_prod_pre_update_${TS}.sql.gz" && ls -lh /root/backups/'
```

### Paso 2: Descargar Backups a Local y Mantener Solo el Último en el VPS
1. Descargar todos los backups presentes en `/root/backups/` hacia la carpeta local `db_bkp/` usando `pscp`:
   ```powershell
   pscp -P 5287 -pw 1.2.3.Fnd.2026 -batch root@149.50.128.168:/root/backups/* C:\Users\fran\dev\projects\SGP\db_bkp\
   ```
2. En el VPS, eliminar los respaldos anteriores dejando **exclusivamente el último archivo generado** en `/root/backups/`.

### Paso 3: Inyectar Pantalla de Mantenimiento en Caliente
1. Verificar que `/tmp/maintenance.html` exista en el VPS. Si no existe, crearlo con una plantilla institucional en español.
2. Inyectarlo directamente en el contenedor de Nginx en ejecución:
   ```bash
   plink -ssh -P 5287 -pw 1.2.3.Fnd.2026 -batch root@149.50.128.168 "docker cp /tmp/maintenance.html sgp-frontend:/usr/share/nginx/html/index.html"
   ```

### Paso 4: Actualizar Código del Repositorio
Asegurar que no haya bloqueos en `nginx.conf` y actualizar a la punta de `origin/main`:
```bash
plink -ssh -P 5287 -pw 1.2.3.Fnd.2026 -batch root@149.50.128.168 "cd /root/deploy/sgp/sgp && git fetch origin main && git checkout origin/main -- code/frontend/nginx.conf && git reset --hard origin/main && git log -n 1 --oneline"
```

### Paso 5: Reconstruir y Levantar Contenedores
Ejecutar la reconstrucción en `/root/deploy/sgp/sgp/code`:
```bash
plink -ssh -P 5287 -pw 1.2.3.Fnd.2026 -batch root@149.50.128.168 "cd /root/deploy/sgp/sgp/code && docker compose up -d --build"
```
*(Nota: Si se ejecuta en segundo plano, esperar a la notificación de finalización).*

### Paso 6: Limpieza y Verificación Operativa
1. Purgar imágenes huérfanas:
   ```bash
   plink -ssh -P 5287 -pw 1.2.3.Fnd.2026 -batch root@149.50.128.168 "docker image prune -f"
   ```
2. Verificar que los contenedores `sgp-backend` y `sgp-frontend` estén `Up` y que los logs del backend confirmen `DataInitializer finalizado exitosamente` respetando `sgp.seed.overwrite-users=false`.
3. Validar respuesta HTTP 200 en el dominio público:
   ```bash
   plink -ssh -P 5287 -pw 1.2.3.Fnd.2026 -batch root@149.50.128.168 "curl -ILs https://solicitudes.ultrasoft.website | head -n 20"
   ```
4. Confirmar que la cantidad de solicitudes en la base de datos (`SELECT count(*) FROM solicitudes`) y usuarios (`SELECT count(*) FROM users`) se mantenga íntegra.

### Paso 7: Notificar al Usuario
Entregar un informe resumido con el commit desplegado, el estado del backup, la integridad de los datos y la confirmación de disponibilidad del sistema.
