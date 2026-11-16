# Regla Obligatoria de Versionado, Base de Datos y Releases

Esta regla define el estándar obligatorio e inmutable para el versionado de la aplicación SGP, su base de datos y el registro de cada versión liberada:

1. **Incremento del último dígito (Patch) ante Fixes/Correcciones**:
   - Siempre que se realice un fix, corrección de errores, ajuste menor de interfaz, saneamiento de datos o parche funcional (cualquier cambio de tipo "fix"), es **OBLIGATORIO e INELUDIBLE** incrementar el último dígito de la versión (ej: `1.2.8` -> `1.2.9`).

2. **Fuentes de Versión de Aplicación a Actualizar en Simultaniedad**:
   - `code/frontend/src/config/version.js`: Actualizar la constante `APP_VERSION`.
   - `code/frontend/package.json`: Actualizar el campo `"version"`.

3. **Versionado Obligatorio de la Base de Datos (`config.db_version`)**:
   - La base de datos cuenta con la tabla `config` y la columna `db_version` (además de `descripcion` y `updated_at`).
   - Siempre que una versión incluya cambios de esquema, migraciones SQL o alteraciones estructurales de datos, se debe crear el script correspondiente en `docs/migrations/` e incrementar/registrar el nuevo valor en `config.db_version` (actualizando también el valor inicial en `DataInitializer.java` si aplica).
   - Si una versión patch no modifica la base de datos, `db_version` conserva su valor vigente.

4. **Archivo de Release en Formato `.ods` (`docs/release/`)**:
   - Por **CADA versión liberada** (Major, Minor o Patch) es **OBLIGATORIO** crear un archivo en formato LibreOffice Calc (`.ods`) dentro de la carpeta `docs/release/` con el nombre `v<VERSION>.ods` (ej: `docs/release/v1.2.9.ods`).
   - Cada archivo `.ods` debe contener obligatoriamente:
     - **Versión del Sistema**
     - **Versión de Base de Datos (`db_version`)**
     - **Fecha de Liberación**
     - **Detalle de cambios (Changelog):** Tipo, Módulo y Descripción.

5. **Momento de Aplicación**:
   - Tanto el incremento de versión, la actualización de `db_version` (si hubo cambios de BD) y la creación del archivo `docs/release/vX.Y.Z.ods` deben realizarse en el mismo ciclo de trabajo de la liberación, antes de delegar a pruebas y antes de desplegar en producción.
   - Ningún pase a producción puede efectuarse sin haber cumplido con estos puntos.
