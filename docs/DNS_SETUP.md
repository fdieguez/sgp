# Guía de Configuración DNS - SGP

## 📋 Información del Servidor

- **Proveedor**: DonWeb
- **Tipo**: Cloud Server
- **IP Pública**: `149.50.128.168`
- **Hostname**: `vps-4644619-x.dattaweb.com`
- **ID Servicio**: #4644619

---

## 🌐 Paso 1: Acceder al Panel de DNS de DonWeb

1. **Ingresar al Panel de DonWeb**:
   - Ve a: https://clientes.donweb.com/
   - Inicia sesión con tus credenciales

2. **Navegar a la zona DNS**:
   - Busca tu dominio en la lista de servicios
   - Haz clic en "Administrar" o "Gestionar DNS"
   - Deberías ver una opción como "Zona DNS" o "DNS Management"

---

## 🔧 Paso 2: Configurar Registros DNS

Necesitas crear/modificar los siguientes registros DNS:

### Registros A (IPv4)

| Tipo | Nombre/Host     | Valor/Destino      | TTL   | Descripción                    |
|------|----------------|-------------------|-------|--------------------------------|
| A    | `@`            | `149.50.128.168`  | 3600  | Apunta el dominio raíz         |
| A    | `www`          | `149.50.128.168`  | 3600  | Apunta www.tudominio           |

**Explicación**:
- `@` → representa el dominio raíz (ej: `tudominio.com`)
- `www` → subdominio www (ej: `www.tudominio.com`)
- TTL = 3600 segundos (1 hora)

### (Opcional) Registros CNAME para subdominios

Si en el futuro quieres crear subdominios adicionales:

| Tipo  | Nombre/Host | Valor/Destino                | TTL  | Descripción              |
|-------|------------|------------------------------|------|--------------------------|
| CNAME | `api`      | `vps-4644619-x.dattaweb.com` | 3600 | Subdominio para la API   |
| CNAME | `admin`    | `vps-4644619-x.dattaweb.com` | 3600 | Subdominio para admin    |

**NOTA**: Por ahora **NO es necesario** crear estos subdominios. La aplicación funcionará perfectamente solo con el dominio principal.

---

## ⏱️ Paso 3: Esperar Propagación DNS

Después de guardar los cambios:

1. **Tiempo de propagación**: 
   - Mínimo: 5-15 minutos
   - Máximo: 24-48 horas
   - Típico (DonWeb): 1-4 horas

2. **Verificar propagación**:
   ```bash
   # En Windows PowerShell:
   nslookup tudominio.com
   
   # Debería mostrar:
   # Nombre:    tudominio.com
   # Address:   149.50.128.168
   ```

---

## 🧪 Paso 4: Probar el Acceso

Una vez propagado el DNS:

1. **Abrir navegador** y visitar:
   - `http://tudominio.com`
   - `http://www.tudominio.com`

2. **Deberías ver**:
   - La pantalla de Login del SGP
   - Si ves un error de nginx o "502 Bad Gateway", significa que el DNS está bien pero hay un problema con el deployment

---

## 🔒 Paso 5 (Futuro): Configurar HTTPS con Let's Encrypt

**IMPORTANTE**: Por ahora el sitio funcionará en **HTTP** (sin candado verde).

Para configurar HTTPS en el futuro:

1. Conectarse al servidor:
   ```bash
   ssh root@149.50.128.168
   ```

2. Instalar Certbot:
   ```bash
   apt update
   apt install certbot python3-certbot-nginx -y
   ```

3. Obtener certificado SSL:
   ```bash
   certbot --nginx -d tudominio.com -d www.tudominio.com
   ```

4. Seguir las instrucciones de Certbot (te pedirá un email)

5. Certbot configurará automáticamente:
   - Redirección de HTTP → HTTPS
   - Renovación automática del certificado

---

## 🐛 Troubleshooting

### Problema: DNS no resuelve después de 24 horas

**Solución**:
1. Verificar que guardaste los cambios en el panel de DonWeb
2. Verificar que no hay registros DNS conflictivos (eliminar registros antiguos si existen)
3. Limpiar caché DNS local:
   ```powershell
   ipconfig /flushdns
   ```

### Problema: Veo "502 Bad Gateway"

**Solución**:
- El DNS está bien configurado
- El problema está en el servidor (contenedores Docker no están corriendo)
- Conectarse vía SSH y verificar:
  ```bash
  docker ps
  docker-compose logs
  ```

### Problema: Veo "ERR_CONNECTION_TIMED_OUT"

**Solución**:
- Verificar que el firewall del servidor permite conexiones en puerto 80
- En el servidor:
  ```bash
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw reload
  ```

---

## 📝 Checklist de Configuración

- [ ] Acceder al panel de DonWeb
- [ ] Crear registro A para `@` → `149.50.128.168`
- [ ] Crear registro A para `www` → `149.50.128.168`
- [ ] Guardar cambios
- [ ] Esperar propagación DNS (1-4 horas)
- [ ] Verificar con `nslookup tudominio.com`
- [ ] Abrir `http://tudominio.com` en el navegador
- [ ] (Futuro) Configurar HTTPS con Let's Encrypt

---

## 🔗 Enlaces Útiles

- **Panel DonWeb**: https://clientes.donweb.com/
- **Verificador DNS**: https://dnschecker.org/
- **Guía Docker Deployment**: `docs/DEPLOYMENT.md`
- **Walkthrough Deployment**: `.gemini/antigravity/brain/.../walkthrough.md`

---

**Fecha**: 19/01/2026
**Estado**: Pendiente configuración DNS
