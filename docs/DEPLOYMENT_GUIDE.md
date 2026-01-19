# 🚀 Deployment en Producción - solicitudes.ultrasoft.website

## 📋 Información de Deployment

- **Dominio**: `solicitudes.ultrasoft.website`
- **Servidor**: DonWeb VPS (Cloud Server)
- **IP**: `149.50.128.168`
- **DNS**: ✅ Configurado y propagado
- **Sistema Operativo**: Ubuntu (probablemente)

---

## ✅ Pre-requisitos Completados

- [x] DNS configurado y propagando (`solicitudes.ultrasoft.website` → `149.50.128.168`)
- [x] Código actualizado en GitHub con todos los fixes
- [x] Variables de entorno actualizadas (`.env.example`)

---

## 🔧 PASO 1: Conectarse al Servidor

```bash
# Conectarse vía SSH
ssh root@149.50.128.168
```

**Si es la primera vez**, te pedirá aceptar la huella digital del servidor (escribe `yes`).

---

## 🔧 PASO 2: Preparar el Servidor (Solo la primera vez)

### 2.1 Actualizar el sistema
```bash
apt update && apt upgrade -y
```

### 2.2 Instalar Docker y Docker Compose
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verificar instalación
docker --version
docker-compose --version
```

### 2.3 Configurar firewall
```bash
# Permitir HTTP y HTTPS
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp  # SSH
ufw enable
ufw status
```

---

## 🔧 PASO 3: Clonar el Proyecto

```bash
# Ir al directorio home
cd ~

# Clonar el repositorio
git clone https://github.com/fdieguez/sgp.git

# Entrar al directorio
cd sgp/code
```

---

## 🔧 PASO 4: Configurar Variables de Entorno

### 4.1 Crear archivo .env
```bash
# Copiar el ejemplo
cp .env.example .env

# Editar el archivo
nano .env
```

### 4.2 Configurar las variables

**Contenido del archivo `.env`**:
```bash
# Database
POSTGRES_DB=sgp_db
POSTGRES_USER=sgp_user
POSTGRES_PASSWORD=Ultrasoft2026_SecureDB!

# JWT Secret (generar uno aleatorio)
JWT_SECRET=A7x9Kp2Lm4Nq8Rt5Vw3Yz6Bc1De0Fg9Hj8Kl7Mn6Op5Qr4St3Uv2Wx1Yz0

# API URL para producción
VITE_API_URL=http://solicitudes.ultrasoft.website/api
```

**Guardar**: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4.3 Generar JWT Secret seguro (opcional, más seguro)
```bash
# Generar un secret aleatorio
openssl rand -base64 64 | tr -d '\n'

# Copiar el resultado y pegarlo en JWT_SECRET del .env
```

---

## 🔧 PASO 5: Subir Google Service Account Credentials

El archivo `credentials.json` debe estar en `backend/src/main/resources/`.

**Opción A: Copiar desde tu PC al servidor**
```bash
# En tu PC (PowerShell), desde el directorio del proyecto
scp code/backend/src/main/resources/credentials.json root@149.50.128.168:~/sgp/code/backend/src/main/resources/
```

**Opción B: Crear el archivo directamente en el servidor**
```bash
# En el servidor SSH
nano ~/sgp/code/backend/src/main/resources/credentials.json

# Pegar el contenido del JSON
# Guardar: Ctrl+O, Enter, Ctrl+X
```

---

## 🔧 PASO 6: Build y Deploy con Docker Compose

```bash
# Asegurarse de estar en el directorio correcto
cd ~/sgp/code

# Build de las imágenes (primera vez o después de cambios)
docker-compose build --no-cache

# Levantar los servicios
docker-compose up -d

# Ver los logs
docker-compose logs -f
```

**Para detener los logs**: `Ctrl+C`

---

## 🔧 PASO 7: Verificar que todo funciona

### 7.1 Verificar contenedores
```bash
docker ps
```

Deberías ver 3 contenedores corriendo:
- `sgp-postgres`
- `sgp-backend`
- `sgp-frontend`

### 7.2 Verificar logs
```bash
# Backend
docker-compose logs backend | tail -50

# Frontend
docker-compose logs frontend | tail -20

# Database
docker-compose logs postgres | tail -20
```

### 7.3 Probar el acceso

**Desde tu navegador**:
1. Abrir: `http://solicitudes.ultrasoft.website`
2. Deberías ver la pantalla de Login del SGP

**Si funciona**: ¡DEPLOYMENT EXITOSO! 🎉

---

## 🐛 Troubleshooting

### Problema: "502 Bad Gateway" en el navegador

**Causa**: El backend no está levantado o hay un error.

**Solución**:
```bash
# Ver logs del backend
docker-compose logs backend

# Reiniciar el backend
docker-compose restart backend
```

### Problema: "Connection refused" o no carga nada

**Causa**: Puerto 80 bloqueado o contenedor frontend no corriendo.

**Solución**:
```bash
# Verificar que el contenedor frontend esté corriendo
docker ps | grep frontend

# Verificar firewall
ufw status

# Reiniciar frontend
docker-compose restart frontend
```

### Problema: Backend no puede conectarse a la base de datos

**Causa**: PostgreSQL no terminó de inicializar.

**Solución**:
```bash
# Ver logs de postgres
docker-compose logs postgres

# Reiniciar todo el stack
docker-compose down
docker-compose up -d
```

### Problema: Error "VITE_API_URL is undefined"

**Causa**: La variable de entorno no se inyectó en el build.

**Solución**:
```bash
# Rebuild del frontend con --no-cache
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

---

## 🔄 Actualizar el Sistema (Deploy de nuevos cambios)

Cuando hagas cambios en el código:

```bash
# 1. Conectarse al servidor
ssh root@149.50.128.168

# 2. Ir al directorio del proyecto
cd ~/sgp/code

# 3. Pull de los últimos cambios
git pull origin main

# 4. Rebuild y restart
docker-compose build
docker-compose down
docker-compose up -d

# 5. Ver logs
docker-compose logs -f
```

---

## 📊 Comandos Útiles

```bash
# Ver todos los contenedores
docker ps -a

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend

# Reiniciar un servicio
docker-compose restart backend

# Detener todo
docker-compose down

# Detener y eliminar volúmenes (⚠️ BORRA LA BASE DE DATOS)
docker-compose down -v

# Ver uso de recursos
docker stats
```

---

## 📝 Checklist de Deployment

- [ ] DNS configurado (`solicitudes.ultrasoft.website` → `149.50.128.168`)
- [ ] Conectado al servidor vía SSH
- [ ] Docker y Docker Compose instalados
- [ ] Firewall configurado (puertos 80, 443, 22)
- [ ] Repositorio clonado
- [ ] Archivo `.env` creado y configurado
- [ ] `credentials.json` subido al servidor
- [ ] Docker Compose build ejecutado
- [ ] Contenedores levantados (`docker-compose up -d`)
- [ ] Verificado que los 3 contenedores están corriendo
- [ ] Acceso web funcionando (`http://solicitudes.ultrasoft.website`)
- [ ] Login funcional y sincronización Google Sheets OK

---

## 🔒 Próximo Paso: HTTPS con Let's Encrypt

Una vez que el sitio funcione en HTTP, configurar SSL:

```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx -y

# Obtener certificado
certbot --nginx -d solicitudes.ultrasoft.website

# Seguir las instrucciones (ingresar email, aceptar términos)
```

Certbot configurará automáticamente:
- Redirecciónde HTTP a HTTPS
- Renovación automática del certificado

---

**Fecha**: 19/01/2026
**Dominio**: solicitudes.ultrasoft.website
**Estado**: Listo para deployment
