#!/bin/bash

# ==========================================
# Script de Instalación Automatizada de MySQL
# Proyecto SGP - Despliegue de Producción
# ==========================================

# Variables provistas
ROOT_PASS="K&n4KrVUnE"
DB_NAME="sgp_db"
DB_USER="sgp_user"
DB_PASS="c&MK3"

echo "==================================================="
echo "Iniciando instalación y configuración de MySQL..."
echo "==================================================="

# 1. Actualizar repositorios e instalar MySQL sin intervención humana
echo "[1/5] Actualizando e instalando MySQL Server..."
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server

# 2. Asegurar la instalación seteando el root, limpiando usuarios y db test
echo "[2/5] Módulos de seguridad: Seteando claves de ROOT y depurando base default..."
# Cambiar la contraseña del usuario root local
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${ROOT_PASS}';"
# Borrar usuarios anónimos
sudo mysql -u root -p"${ROOT_PASS}" -e "DELETE FROM mysql.user WHERE User='';"
# Deshabilitar root remoto por seguridad (sólo local y túnel)
sudo mysql -u root -p"${ROOT_PASS}" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
# Borrar la base de datos temporal 'test'
sudo mysql -u root -p"${ROOT_PASS}" -e "DROP DATABASE IF EXISTS test;"
sudo mysql -u root -p"${ROOT_PASS}" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
# Aplicar permisos
sudo mysql -u root -p"${ROOT_PASS}" -e "FLUSH PRIVILEGES;"

# 3. Creación de datos para la aplicación
echo "[3/5] Construyendo la base de datos y usuario de SGP..."
sudo mysql -u root -p"${ROOT_PASS}" -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# El usuario '@'%' es necesario para que el contenedor de Docker pueda conectarse, no significa que esté en internet abierto, lo bloquea el firewall.
sudo mysql -u root -p"${ROOT_PASS}" -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -u root -p"${ROOT_PASS}" -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'%';"
sudo mysql -u root -p"${ROOT_PASS}" -e "FLUSH PRIVILEGES;"

# 4. Permitir bind address para conectar a la red Docker (Host -> Docker0)
echo "[4/5] Modificando bind-address para habilitar conexión transversal con Docker..."
sudo sed -i "s/^bind-address\s*=.*/bind-address = 0.0.0.0/" /etc/mysql/mysql.conf.d/mysqld.cnf
sudo sed -i "s/^mysqlx-bind-address\s*=.*/mysqlx-bind-address = 0.0.0.0/" /etc/mysql/mysql.conf.d/mysqld.cnf || true

# 5. Reinicio de base y refuerzo UFW (Firewall)
echo "[5/5] Reiniciando servicio de MySQL y validando Firewall (UFW)..."
sudo systemctl restart mysql

# Opcional (Aseguramos si el ufw está on, habilitar SSH y Docker)
if command -v ufw > /dev/null; then
    sudo ufw allow ssh > /dev/null
    sudo ufw allow in on docker0 to any port 3306 > /dev/null
    # Se ignora la exposición IP externa intencionalmente
fi

echo "======================================================================="
echo "✅ Instalación y Configuración EXITOSA"
echo "======================================================================="
echo ""
echo "💻 PARA CONECTARTE MEDIANTE TÚNEL SSH (HeidiSQL o Workbench):"
echo "   - Connection Type: TCP/IP over SSH (o MariaDB/MySQL SSH Tunnel)"
echo "   - Pestaña SSH:"
echo "         SSH Host: IP de tu Servidor Linux (VPS)"
echo "         SSH Port: 22"
echo "         User/Pass: Tu usuario Linux y contraseña del VPS"
echo "   - Pestaña Database/Config:"
echo "         Hostname (Local): 127.0.0.1"
echo "         Port: 3306"
echo "         User: ${DB_USER}"
echo "         Password: ${DB_PASS}"
echo "         Database: ${DB_NAME}"
echo "======================================================================="
