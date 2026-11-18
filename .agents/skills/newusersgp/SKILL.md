---
name: newusersgp
description: >-
  Da de alta un nuevo usuario oficial en SGP siguiendo el protocolo completo del proyecto:
  genera contraseña y hash BCrypt, actualiza DataInitializer.java (incluyendo keepEmails),
  update_users_nomina_2026.sql, usuarios_contrasenas_sgp.txt y usuarios_credenciales_envio.csv,
  crea el script SQL individual, inserta en producción y local, y envía el correo de credenciales
  con copia oculta a dieguezfrancisco@gmail.com.
---

# Procedimiento de Alta de Nuevo Usuario en SGP (`/newusersgp`)

Este skill define el protocolo completo y obligatorio para dar de alta un nuevo usuario oficial en el **SGP (Sistema de Gestión Política)**.

> [!CAUTION] REGLA INQUEBRANTABLE DE SEGURIDAD
> - **NO** modificar, actualizar ni resetear contraseñas de otros usuarios existentes en producción.
> - Mantener `sgp.seed.overwrite-users=false` intacto.
> - El archivo `usuarios_credenciales_envio.csv` y `usuarios_contrasenas_sgp.txt` contienen claves en texto plano y no deben subirse a repositorios públicos si están ignorados por `.gitignore`.

---

## 📌 Datos requeridos antes de comenzar

Confirmar o recopilar del usuario:
1. **Nombre y Apellido** (`first_name`, `last_name`)
2. **Email** (único, en minúsculas)
3. **DNI**
4. **Rol** (`RESPONSABLE`, `AUDITOR`, `OPERADOR`, `DISTRIBUIDOR`, `RESOLUTOR`, o combinación respetando `sgp.max.roles.per.user=2`)
5. **Zona / Eje** (`NULL` si es `AUDITOR` / `OPERADOR` / `ADMINISTRADOR`, o zona(s) separadas por coma, ej. `NORTE` o `OESTE, DEPORTIVO`)
6. **Teléfono** (usar `3420000000` si no se informa)

---

## 🛠️ Protocolo de Ejecución Paso a Paso

### Paso 1: Generar Contraseña Segura y Hash BCrypt
1. Definir la contraseña inicial siguiendo la convención del proyecto (ej. `<Nombre>_<RolCorto>_SGP_2026!`, sin caracteres ambiguos).
2. Generar el hash BCrypt (costo 10) usando `org.springframework.security.crypto.bcrypt.BCrypt` desde el `.jar` local de Maven (`~/.m2/repository/org/springframework/security/spring-security-crypto`):
   ```powershell
   $jar = Get-ChildItem "$env:USERPROFILE\.m2\repository\org\springframework\security\spring-security-crypto" -Recurse -Filter "*.jar" | Where-Object { $_.Name -notmatch "sources|javadoc" } | Select-Object -First 1 -ExpandProperty FullName
   @"
   System.out.println("HASH=" + org.springframework.security.crypto.bcrypt.BCrypt.hashpw("<PASSWORD>", org.springframework.security.crypto.bcrypt.BCrypt.gensalt(10)));
   /exit
   "@ | jshell --class-path "$jar" -
   ```

### Paso 2: Actualizar Código y Scripts del Repositorio
1. **`code/backend/src/main/java/com/sgp/backend/DataInitializer.java`:**
   - Agregar el email del nuevo usuario en la lista `keepEmails` (para proteger la cuenta ante un eventual arranque con `overwrite-users=true`).
   - Agregar `createUserIfNotFound(email, password, role, firstName, lastName, LocalDate.of(1990, 1, 1), phone, zone, dni);` en el bloque de siembra de usuarios.
2. **`code/backend/src/main/resources/db/update_users_nomina_2026.sql`:**
   - Agregar el registro numerado al final con `INSERT INTO users (...) VALUES (...) ON DUPLICATE KEY UPDATE ...` (usando el hash BCrypt generado, **sin** sobrescribir `password` en `ON DUPLICATE KEY UPDATE` para no pisar claves si ya existiera).
3. **`scripts/insert_<nombre>_<apellido>_2026.sql`:**
   - Crear el script SQL individual idempotente con `START TRANSACTION; INSERT INTO users ... ON DUPLICATE KEY UPDATE ...; COMMIT; SELECT ...`.

### Paso 3: Actualizar Archivos Locales de Nómina y Credenciales
1. **`usuarios_contrasenas_sgp.txt`:**
   - Agregar la fila numerada respetando el alineado de columnas de la tabla.
   - Incrementar el contador final `TOTAL: <N> CUENTAS OFICIALES REGISTRADAS EN PRODUCCIÓN`.
2. **`usuarios_credenciales_envio.csv`:**
   - Agregar la línea `"Nombre Apellido","email","password","ROL","ZONA","https://solicitudes.ultrasoft.website"` **sin dejar líneas en blanco**.
3. **`usuarios_credenciales_envio_nuevos_YYYYMMDD.csv`:**
   - Crear el CSV temporal/del día con el encabezado `nombre,email,password,rol,zona,url` y la fila del nuevo usuario (o los nuevos usuarios del lote).

### Paso 4: Insertar en Bases de Datos (Producción y Local)
1. **Producción (`sgp_prod_v1_2` en VPS DonWeb `149.50.128.168:5287`):**
   ```powershell
   Get-Content "scripts\insert_<nombre>_<apellido>_2026.sql" -Encoding UTF8 | plink -ssh -P 5287 -pw 1.2.3.Fnd.2026 -batch root@149.50.128.168 "mysql --default-character-set=utf8mb4 -u sgp_admin -pP10xmK2vL9qRnW5z sgp_prod_v1_2"
   ```
2. **Local (`sgp_dev_v1_2`):**
   ```powershell
   Get-Content "scripts\insert_<nombre>_<apellido>_2026.sql" -Raw -Encoding UTF8 | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --default-character-set=utf8mb4 -u sgp_admin -ppassword sgp_dev_v1_2
   ```
   *(Verificar que el `SELECT` final devuelva el usuario recién insertado con `activo = 1`).*

### Paso 5: Enviar Correo de Bienvenida con Copia Oculta
Ejecutar el script oficial usando `smtp_credentials.env` (que envía copia oculta automática a `dieguezfrancisco@gmail.com`):
```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\Enviar-Credenciales.ps1" -CsvPath "usuarios_credenciales_envio_nuevos_YYYYMMDD.csv" -Force
```
Confirmar `Total enviados: 1 | Fallidos: 0` (y registro en `scripts/registro_envios_credenciales.log`).

### Paso 6: Compilar, Subir al Repositorio y Notificar
1. Verificar compilación del backend:
   ```powershell
   cd code/backend; mvn compile -q
   ```
2. Commitear en español y subir a `origin/main`:
   - `DataInitializer.java`
   - `update_users_nomina_2026.sql`
   - `scripts/insert_<nombre>_<apellido>_2026.sql`
3. Entregar al usuario un resumen con:
   - ID asignado en producción, email, rol, zona y contraseña generada.
   - Confirmación de actualización de archivos (`usuarios_contrasenas_sgp.txt`, `usuarios_credenciales_envio.csv`, `DataInitializer.java`, SQL).
   - Confirmación del envío del correo con CCO a `dieguezfrancisco@gmail.com`.
   - Commit subido a `origin/main` (aclarando que al haberse insertado directo en BD, el usuario ya puede ingresar de inmediato sin necesidad de reiniciar contenedores).
