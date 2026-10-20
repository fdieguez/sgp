# Regla Obligatoria de Versionado (SemVer Patch en Fixes)

Esta regla define el estándar obligatorio e inmutable para el versionado de la aplicación SGP:

1. **Incremento del último dígito (Patch) ante Fixes/Correcciones**:
   - Siempre que se realice un fix, corrección de errores, ajuste menor de interfaz, saneamiento de datos o parche funcional (cualquier cambio de tipo "fix"), es **OBLIGATORIO e INELUDIBLE** incrementar el último dígito de la versión (ej: `1.1.1` -> `1.1.2` -> `1.1.3`).

2. **Fuentes de Versión a Actualizar en Simultaniedad**:
   - `code/frontend/src/config/version.js`: Actualizar la constante `APP_VERSION`.
   - `code/frontend/package.json`: Actualizar el campo `"version"`.

3. **Momento de Aplicación**:
   - El incremento de versión debe realizarse en el mismo ciclo de trabajo del fix, antes de delegar a pruebas Playwright y antes de desplegar en producción.
   - Ningún pase a producción con fixes puede efectuarse sin haber subido el dígito de la versión correspondiente.
