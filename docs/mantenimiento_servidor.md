# Mantenimiento y Diagnóstico del Servidor de Producción

Este documento detalla el diagnóstico de ocupación de almacenamiento y memoria del servidor VPS productivo, los comandos ejecutados para resolver la ocupación crítica y las instrucciones para realizar mantenimiento autónomo en el futuro.

---

## 1. Información del Diagnóstico (19 de Agosto de 2026)

*   **Servidor:** DonWeb VPS (`149.50.128.168` - Puerto SSH: `5287`)
*   **Estado de Memoria RAM (Inicial y Final):**
    *   **Total:** 3.8 GiB
    *   **En uso:** ~1.7 GiB (Estable y saludable)
    *   **Disponible:** ~1.9 GiB
    *   *Comando de diagnóstico:* `free -h`

*   **Estado del Disco (Antes de la intervención):**
    *   **Total:** 25 GB
    *   **Usado:** 23 GB (**93% de ocupación crítica**)
    *   **Disponible:** 1.9 GB
    *   *Comando de diagnóstico:* `df -h`

*   **Identificación del Problema:**
    Al ejecutar `du -h --max-depth=1 /` se identificó que el directorio `/var/lib/docker/` consumía más de 17 GB. El comando `docker system df` arrojó que existían **3.32 GB de imágenes en desuso (dangling/unused)**, **656 MB de volúmenes sin utilizar** y **2.93 GB de cache de compilación de Docker (build cache)**.

---

## 2. Acciones Realizadas para Liberar Espacio

Para solucionar la ocupación crítica de disco sin afectar a los servicios activos (`sgp-frontend`, `sgp-backend` y `megabares-app`), se siguieron los siguientes pasos:

1.  **Verificación de contenedores activos:**
    Se ejecutó `docker ps -a` para garantizar que no existían contenedores detenidos temporalmente con datos importantes. Solo se encontraban corriendo las 3 aplicaciones productivas indicadas.
2.  **Limpieza profunda de Docker:**
    Se ejecutó el comando de purga del daemon de Docker:
    ```bash
    docker system prune -a --volumes -f
    ```
    Este comando elimina de forma segura:
    *   Todos los contenedores detenidos.
    *   Todas las redes Docker creadas que no estén en uso.
    *   Todos los volúmenes locales no asociados a contenedores activos (liberando 656 MB).
    *   Todas las imágenes de Docker que no estén en uso (liberando más de 3.3 GB).
    *   Toda la caché generada en el build de imágenes (liberando 2.9 GB).

---

## 3. Resultados Obtenidos

*   **Espacio recuperado:** **7.407 GB** de almacenamiento.
*   **Estado del Disco (Después de la intervención):**
    *   **Usado:** 9.2 GB (**Reducido a 38% de ocupación**)
    *   **Disponible:** 16 GB libres y listos para su uso.

---

## 4. Guía de Comandos para Mantenimiento Futuro

Si el sistema vuelve a reportar alertas de poco espacio en disco, puedes conectarte vía SSH al servidor y ejecutar de forma manual los siguientes comandos en orden:

### Paso A: Revisar el espacio libre general
```bash
df -h
```

### Paso B: Consultar qué consume el almacenamiento de Docker
```bash
docker system df
```

### Paso C: Ejecutar la limpieza de recursos huérfanos y caché
```bash
docker system prune -a --volumes -f
```
*(Nota: Este comando es completamente seguro para ejecutar en caliente. No detiene ni borra los contenedores que se encuentren activos en ese momento).*

### Paso D: Monitorear el consumo de memoria RAM
```bash
free -h
```
y para ver el uso detallado de memoria por contenedor:
```bash
docker stats --no-stream
```

---
*Documentado por Antigravity - DevOps SGP - 19 de Agosto de 2026*
