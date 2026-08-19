#!/bin/bash
# SGP Database Sync Helper (Producción -> Local)
# Este script descarga un backup fresco de la base de datos del VPS de producción y lo restaura localmente.
# Todos los comentarios y flujos están en Español (Regla Global 1).

set -e

# Configuración por defecto del VPS de producción
DEFAULT_VPS_HOST="solicitudes.ultrasoft.website"
DEFAULT_VPS_USER="root"
DEFAULT_VPS_PORT="22"
TEMP_DIR="./tmp_backup"

echo "========================================================="
echo "🔄 SGP - Sincronizador de Datos de Producción a Local v1.0"
echo "========================================================="

# Solicitar parámetros de conexión
read -p "🖥️  Host/IP del VPS de Producción [$DEFAULT_VPS_HOST]: " VPS_HOST
VPS_HOST=${VPS_HOST:-$DEFAULT_VPS_HOST}

read -p "👤 Usuario SSH del VPS [$DEFAULT_VPS_USER]: " VPS_USER
VPS_USER=${VPS_USER:-$DEFAULT_VPS_USER}

read -p "🔌 Puerto SSH [$DEFAULT_VPS_PORT]: " VPS_PORT
VPS_PORT=${VPS_PORT:-$DEFAULT_VPS_PORT}

# Crear directorio temporal
mkdir -p "$TEMP_DIR"

# 1. Conectar al VPS y forzar un backup fresco
echo "🚀 1. Conectando al VPS y forzando copia de seguridad fresca..."
ssh -p "$VPS_PORT" "${VPS_USER}@${VPS_HOST}" "bash /root/backups/backup_db.sh"

# 2. Obtener el nombre del archivo de backup más reciente en el VPS
echo "🔍 2. Identificando el archivo de respaldo más reciente..."
REMOTE_FILE=$(ssh -p "$VPS_PORT" "${VPS_USER}@${VPS_HOST}" "ls -t /root/backups/sgp_backup_*.sql.gz | head -n 1")

if [ -z "$REMOTE_FILE" ]; then
    echo "❌ Error: No se encontró ningún archivo de respaldo en /root/backups/ en el VPS."
    exit 1
fi

FILE_NAME=$(basename "$REMOTE_FILE")
echo "📦 Respaldo detectado: $FILE_NAME"

# 3. Descargar el backup a local por SCP
echo "📥 3. Descargando archivo de respaldo a local..."
scp -P "$VPS_PORT" "${VPS_USER}@${VPS_HOST}:${REMOTE_FILE}" "$TEMP_DIR/$FILE_NAME"

# 4. Descomprimir el archivo
echo "🔓 4. Descomprimiendo el archivo SQL..."
gunzip -f "$TEMP_DIR/$FILE_NAME"
SQL_FILE="${TEMP_DIR}/${FILE_NAME%.gz}"

echo "📝 Archivo SQL listo en: $SQL_FILE"

# 5. Preguntar el método de restauración
echo ""
echo "========================================================="
echo "⚙️  MÉTODO DE RESTAURACIÓN LOCAL"
echo "========================================================="
echo "1) Restaurar en MySQL Local (Vía Docker - Recomendado para paridad total)"
echo "2) Restaurar en H2 Local (Embebida - Convierte el dialecto SQL automáticamente)"
read -p "Seleccione una opción (1 o 2): " RESTORE_OPTION

if [ "$RESTORE_OPTION" = "1" ]; then
    # Restaurar en MySQL Local
    echo "🐳 Verificando Docker en el sistema..."
    if ! command -v docker &> /dev/null; then
        echo "❌ Error: Docker no está instalado o no se encuentra en el PATH."
        exit 1
    fi

    # Verificar si el contenedor ya existe
    CONTAINER_NAME="sgp_mysql_dev"
    if [ "$(docker ps -a -q -f name=$CONTAINER_NAME)" ]; then
        echo "🐳 El contenedor '$CONTAINER_NAME' ya existe. Asegurando que esté encendido..."
        docker start "$CONTAINER_NAME"
    else
        echo "🐳 Creando contenedor Docker MySQL '$CONTAINER_NAME'..."
        docker run --name "$CONTAINER_NAME" \
            -p 3306:3306 \
            -e MYSQL_DATABASE=sgp_db \
            -e MYSQL_USER=sgp_admin \
            -e MYSQL_PASSWORD=password \
            -e MYSQL_ROOT_PASSWORD=root_password \
            -d mysql:8.0
        echo "⏱️  Esperando 15 segundos a que inicialice la base de datos MySQL..."
        sleep 15
    fi

    echo "🔄 Restaurando datos en el contenedor Docker MySQL..."
    docker exec -i "$CONTAINER_NAME" mysql -u sgp_admin -ppassword sgp_db < "$SQL_FILE"
    
    echo "========================================================="
    echo "🎉 ¡Sincronización en MySQL Docker Completada con Éxito!"
    echo "========================================================="
    echo "👉 Para apuntar tu entorno de desarrollo local a este MySQL, modifica"
    echo "   tu archivo 'application-dev.properties' con los siguientes campos:"
    echo "---------------------------------------------------------"
    echo "spring.datasource.url=jdbc:mysql://localhost:3306/sgp_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
    echo "spring.datasource.driverClassName=com.mysql.cj.jdbc.Driver"
    echo "spring.datasource.username=sgp_admin"
    echo "spring.datasource.password=password"
    echo "spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect"
    echo "========================================================="

elif [ "$RESTORE_OPTION" = "2" ]; then
    # Restaurar en H2 Local
    echo "🛠️  Convirtiendo dialecto MySQL a dialecto H2..."
    H2_SQL_FILE="./code/backend/boot/data-prod.sql"
    mkdir -p "./code/backend/boot"

    # Procesamiento y limpieza del dump de MySQL para compatibilidad con H2
    # - Remueve directivas de variables específicas de MySQL (/*!40101 ... */)
    # - Elimina sentencias LOCK TABLES / UNLOCK TABLES
    # - Remueve cláusulas de ENGINE, CHARSET y COLLATE de los CREATE TABLE
    # - Convierte backticks en comillas dobles o los remueve
    sed -E \
        -e 's/^[[:space:]]*\/\*![0-9]+.*\*\/;//g' \
        -e '/^LOCK TABLES/d' \
        -e '/^UNLOCK TABLES/d' \
        -e 's/ENGINE=[^;[:space:]]+//g' \
        -e 's/DEFAULT CHARSET=[^;[:space:]]+//g' \
        -e 's/COLLATE=[^;[:space:]]+//g' \
        -e 's/AUTO_INCREMENT=[0-9]+//g' \
        -e 's/character set [^;[:space:],\)]+//gi' \
        -e 's/collate [^;[:space:],\)]+//gi' \
        -e 's/`//g' \
        "$SQL_FILE" > "$H2_SQL_FILE"

    echo "💾 Script SQL de importación limpio generado en: $H2_SQL_FILE"
    echo "========================================================="
    echo "🎉 ¡Sincronización en H2 Local Preparada con Éxito!"
    echo "========================================================="
    echo "👉 El script SQL se ejecutará automáticamente en el próximo"
    echo "   arranque del backend de desarrollo Spring Boot mediante el"
    echo "   DatabaseMigrationRunner incorporado."
    echo "========================================================="

else
    echo "❌ Opción inválida. Cancelando operación."
    exit 1
fi

# Limpiar directorio temporal local
rm -rf "$TEMP_DIR"
echo "🧹 Archivos temporales locales eliminados."
