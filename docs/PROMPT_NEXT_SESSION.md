# Contexto para Nueva Sesión de Chat - Proyecto SGP

## 📌 Estado Actual del Proyecto (09/01/2026)

El proyecto es un sistema de gestión (**SGP**) con Backend (Spring Boot 3) y Frontend (React + Vite).

### ✅ Lo que Funciona
1. **Funcionalidad Local**: Todo OK (Login, Dashboard, Sync con Google Sheets, Gráficos, Users CRUD).
2. **Infraestructura**:
   - `docker-compose.yml` creado y subido.
   - `Dockerfile` para Backend (Maven) y Frontend (Node/Nginx) creados.
   - Script `deploy.sh`.
3. **Servidor (DonWeb VPS)**:
   - Docker y Docker Compose instalados.
   - Contenedores `postgres` y `backend` corriendo correctamente.
   - Backend responde en `http://149.50.128.168:8080/api/auth/login`.

### ❌ El Problema Crítico (Deployment Frontend)
El frontend de React se construye y despliega en el puerto 80, **PERO**:
- Al intentar loguearse, el navegador hace POST a `http://localhost:8080/api/auth/login`.
- Error: `ERR_CONNECTION_REFUSED`.
- **Diagnóstico**: La variable de entorno `VITE_API_URL` (que debería ser `http://149.50.128.168:8080`) **NO se está "quemando"** en el código JS durante el build de Docker, a pesar de usar `ARG` en el Dockerfile y `args` en docker-compose.

---

## 🛠️ Archivos Clave Afectados

1.  **`code/frontend/Dockerfile`**:
    ```dockerfile
    # Accept build argument
    ARG VITE_API_URL
    ENV VITE_API_URL=$VITE_API_URL
    # ... RUN npm run build
    ```
    *(Ya fue modificado en el último commit para incluir ARG)*.

2.  **`code/docker-compose.yml`**:
    ```yaml
    frontend:
      build:
        context: ./frontend
        args:
          VITE_API_URL: "http://149.50.128.168:8080" # Se intentó hardcodear
    ```

---

## 🎯 Tu Primera Tarea

Tu objetivo inmediato es **hacer que el Frontend productivo apunte a la IP pública**.

### Pasos Sugeridos:
1.  **Verificar el código en el servidor**: Pedir al usuario que verifique con `cat` si el `frontend/Dockerfile` y `docker-compose.yml` en su VPS tienen realmente los cambios (especialmente los `ARG`).
2.  **Prueba de Build Limpio**: El usuario reportó que `docker-compose build --no-cache frontend` no solucionó el problema.
    - **Hipótesis A**: El `docker-compose.yml` en el servidor no se actualizó (el usuario editó con nano, verificar si guardó bien).
    - **Hipótesis B**: Vite es "quirky" con variables de entorno en Docker. Podría requerir definir la variable en línea con el comando build (`RUN VITE_API_URL=... npm run build`).
3.  **Solución Alternativa (Runtime Config)**: Si el build-time falla consistentemente, implementar un archivo `config.js` (`window.ENV = { API_URL: "..." }`) que se inyecte en runtime con un script de inicio en Nginx, para no depender del build time.

### Credenciales (Server DonWeb)
- **IP**: `149.50.128.168`
- **Acceso**: El usuario tiene acceso vía SSH (PuTTY/Terminal) y panel Web.

---

**¡Suerte! El backend y la base de datos ya están listos. Solo falta conectar el cable del frontend.** 🔌
