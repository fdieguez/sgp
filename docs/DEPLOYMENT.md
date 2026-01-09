# 🚀 Guía de Despliegue - SGP en Producción (DonWeb VPS)

Esta guía te llevará paso a paso para desplegar **SGP** en tu servidor virtual de DonWeb y hacerlo accesible desde internet.

---

## 📋 Pre-requisitos en el Servidor

Tu servidor DonWeb debe tener:
- **Sistema Operativo**: Ubuntu 20.04+ o similar (Linux)
- **Acceso**: SSH con usuario root o sudo
- **RAM**: Mínimo 2GB recomendado
- **Puertos abiertos**: 80 (HTTP) y 8080 (API)

---

## 🔧 Paso 1: Conectarse al Servidor

Desde tu PC, conéctate via SSH (puedes usar PuTTY en Windows o terminal en Linux/Mac):

```bash
ssh usuario@TU_IP_PUBLICA
```

---

## 📦 Paso 2: Instalar Docker y Docker Compose

Ejecuta estos comandos en el servidor:

```bash
# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar tu usuario al grupo docker (para no usar sudo)
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker --version
docker-compose --version
```

**IMPORTANTE**: Cierra y vuelve a abrir la sesión SSH para que el grupo docker se aplique.

---

## 📂 Paso 3: Subir el Código al Servidor

### Opción A: Usando Git (Recomendado)

Si tu código está en GitHub/GitLab:

```bash
# Instalar git si no lo tienes
sudo apt install git -y

# Clonar el repositorio
git clone https://github.com/TU_USUARIO/SGP.git
cd SGP/code
```

### Opción B: Usando SCP/SFTP

Desde tu PC (Windows), usa WinSCP o el comando `scp`:

```bash
# Desde tu PC (en PowerShell o CMD)
scp -r C:\Users\fran\dev\projects\SGP\code usuario@TU_IP:/home/usuario/SGP/
```

---

## ⚙️ Paso 4: Configurar Variables de Entorno

En el servidor, dentro de la carpeta `code`:

```bash
cd ~/SGP/code

# Copiar el archivo de ejemplo
cp .env.example .env

# Editar con nano o vi
nano .env
```

**Contenido del archivo `.env` (DEBES MODIFICAR ESTOS VALORES):**

```env
# Database
POSTGRES_DB=sgp_db
POSTGRES_USER=sgp_admin
POSTGRES_PASSWORD=TuPasswordSuperSeguro2024!

# JWT Secret (genera uno aleatorio con: openssl rand -base64 64)
JWT_SECRET=tu-secret-generado-con-openssl-muy-largo-y-aleatorio

# API URL (tu IP pública)
VITE_API_URL=http://TU_IP_PUBLICA:8080
```

**Para generar un JWT_SECRET seguro:**
```bash
openssl rand -base64 64
```
Copia el resultado y pégalo en `.env`.

**Guardar y salir**: `Ctrl+X`, luego `Y`, luego `Enter`.

---

## 🔓 Paso 5: Configurar Firewall (Abrir Puertos)

```bash
# Instalar UFW (si no lo tienes)
sudo apt install ufw -y

# Permitir SSH (¡NO OLVIDAR ESTO!)
sudo ufw allow 22/tcp

# Permitir puertos de la aplicación
sudo ufw allow 80/tcp    # Frontend
sudo ufw allow 8080/tcp  # Backend API

# Activar firewall
sudo ufw enable
sudo ufw status
```

---

## 🚢 Paso 6: Construir y Ejecutar con Docker Compose

**IMPORTANTE**: Asegúrate de que el archivo `credentials.json` de Google Sheets esté en:
```
~/SGP/code/backend/src/main/resources/credentials.json
```

Ahora ejecuta:

```bash
cd ~/SGP/code

# Construir las imágenes (tarda 5-10 minutos la primera vez)
docker-compose build

# Iniciar los contenedores
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f
```

**Espera a que veas**:
```
sgp-backend  | Started SgpApplication in X.XXX seconds
```

---

## 🌐 Paso 7: Verificar que Funciona

1. **Backend API**: Abre en tu navegador:
   ```
   http://TU_IP_PUBLICA:8080/api/auth/login
   ```
   Deberías ver un error 401 o 403 (es correcto, significa que funciona).

2. **Frontend**: Abre:
   ```
   http://TU_IP_PUBLICA
   ```
   Deberías ver la pantalla de login de SGP.

---

## 👤 Paso 8: Crear el Primer Usuario ADMIN

Conéctate a la base de datos para crear un usuario manualmente:

```bash
# Entrar al contenedor de PostgreSQL
docker exec -it sgp-postgres psql -U sgp_admin -d sgp_db

# Crear usuario admin (cambia el email y password)
INSERT INTO users (email, password, role) 
VALUES ('admin@sgp.com', '$2a$10$EIXtXgvH3BkY7N7N7N7N7u7N7N7N7N7N7N7N7N7N7N7N7N7N7N7N', 'ADMIN');
```

**Problema**: La contraseña mostrada arriba es solo ejemplo. Para generar un hash BCrypt real:

```bash
# Opción 1: Usa un generador online
# Ve a: https://bcrypt-generator.com/
# Ingresa tu password y copia el hash

# Opción 2: Usa el endpoint de registro (temporal)
curl -X POST http://TU_IP_PUBLICA:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sgp.com","password":"admin123","role":"ADMIN"}'
```

**Salir de PostgreSQL**: `\q`

---

## 🎉 Paso 9: ¡Listo! Ingresa a la Aplicación

1. Abre tu navegador: `http://TU_IP_PUBLICA`
2. Login con: `admin@sgp.com` / `admin123` (o tu password)
3. ¡Ya estás en producción!

---

## 🔄 Actualizar la Aplicación (Deployments Futuros)

Cuando hagas cambios en el código:

```bash
cd ~/SGP/code

# Detener contenedores
docker-compose down

# Actualizar código (si usas git)
git pull

# Reconstruir y reiniciar
docker-compose build
docker-compose up -d
```

---

## 📊 Comandos Útiles

```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar un servicio
docker-compose restart backend

# Ver uso de recursos
docker stats

# Limpiar todo (¡CUIDADO! Borra datos)
docker-compose down -v
```

---

## 🛡️ Mejoras de Seguridad Futuras

1. **HTTPS con Let's Encrypt**: Instalar certificado SSL.
2. **Dominio**: Configurar un dominio (ej: `sgp.tuempresa.com`).
3. **Nginx Reverse Proxy**: Ocultar puerto 8080.
4. **Backups Automáticos**: De la base de datos PostgreSQL.

---

## ❓ Problemas Comunes

### Error: "Cannot connect to the Docker daemon"
```bash
sudo systemctl start docker
```

### Frontend muestra página en blanco
- Revisa que `VITE_API_URL` en `.env` tenga tu IP pública correcta.
- Limpia caché del navegador: `Ctrl+Shift+R`.

### Backend no inicia
```bash
# Ver logs detallados
docker logs sgp-backend

# Verificar que PostgreSQL esté corriendo
docker ps | grep postgres
```

### No puedo acceder desde internet
- Verifica que el firewall de DonWeb (panel de control) permita los puertos 80 y 8080.
- Verifica tu IP pública: `curl ifconfig.me`

---

**¡Felicitaciones!** Tu aplicación SGP está ahora en producción. 🎊
