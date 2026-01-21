# Guía de Configuración SSL (HTTPS) en DonWeb VPS

Para asegurar tu sistema SGP (`solicitudes.ultrasoft.website`) con HTTPS en un VPS de DonWeb, la mejor opción gratuita y estándar es usar **Let's Encrypt** con **Certbot**.

Dado que estamos usando **Docker** con Nginx, tenemos dos estrategias principales. Recomendamos la **Estrategia 1** por ser menos invasiva con los contenedores.

## Estrategia 1: Certbot en el Host (Recomendada)

En este enfoque, instalas Certbot directamente en el VPS (Ubuntu/Debian) y montamos los certificados generados dentro del contenedor de Nginx.

### Paso 1: Instalar Certbot en el VPS
Conéctate por SSH a tu servidor y ejecuta:

```bash
sudo apt-get update
sudo apt-get install certbot
```

### Paso 2: Obtener el Certificado
Como Nginx estará ocupando el puerto 80, tenemos dos opciones: detener Nginx momentáneamente o usar el modo "webroot". Lo más fácil para la primera vez es detener los contenedores:

```bash
# Detener contenedores si están corriendo
docker-compose down

# Generar certificado (reemplaza con tu email y dominio real)
sudo certbot certonly --standalone -d solicitudes.ultrasoft.website --email tu-email@ejemplo.com --agree-tos --no-eff-email
```

Si todo sale bien, los certificados se guardarán en:
`/etc/letsencrypt/live/solicitudes.ultrasoft.website/`
- `fullchain.pem` (Certificado público)
- `privkey.pem` (Clave privada)

### Paso 3: Configurar Nginx (`nginx.conf`)
Edita tu archivo `code/frontend/nginx.conf` para escuchar en el puerto 443 y usar los certificados.

**Nota**: Deberás tener dos bloques `server`, uno para HTTP (redirect) y otro para HTTPS.

```nginx
# Bloque HTTP - Redirecciona a HTTPS
server {
    listen 80;
    server_name solicitudes.ultrasoft.website;
    return 301 https://$host$request_uri;
}

# Bloque HTTPS
server {
    listen 443 ssl;
    server_name solicitudes.ultrasoft.website;

    ssl_certificate /etc/letsencrypt/live/solicitudes.ultrasoft.website/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/solicitudes.ultrasoft.website/privkey.pem;

    # ... resto de tu configuración (root, location /api, etc) ...
}
```

### Paso 4: Actualizar `docker-compose.yml`
Modifica el servicio `frontend` (o `nginx` si lo separaste) para montar la carpeta de certificados:

```yaml
services:
  frontend:
    # ...
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      # MONTAJE DE CERTIFICADOS MODO LECTURA
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

### Paso 5: Desplegar
```bash
docker-compose up -d --build
```
---

## Renovación Automática
Los certificados de Let's Encrypt duran 90 días. Para renovar automáticamente:

1. Crea un script en el VPS (ej: `renew_certs.sh`):
   ```bash
   #!/bin/bash
   certbot renew --quiet
   cd /ruta/a/tu/proyecto && docker-compose restart frontend
   ```
2. Agregalo al cron (`crontab -e`):
   ```
   0 3 1 * * /ruta/a/renew_certs.sh
   ```
   *(Esto ejecutará la renovación el día 1 de cada mes a las 3 AM)*.

---

## Opción Alternativa: Cloudflare (Más fácil)
Si configuras tus DNS para pasar a través del proxy de Cloudflare (la "nube naranja"):

1. En Cloudflare: SSL/TLS -> Set to "Flexible" o "Full".
2. En tu Servidor: No necesitas instalar Certbot ni abrir el puerto 443. Cloudflare maneja el SSL hacia el usuario y se conecta por HTTP (puerto 80) a tu servidor.
3. **Desventaja**: La conexión entre Cloudflare y tu servidor no está encriptada (en modo Flexible), pero es suficiente para tener el candadito verde de cara al usuario.
