#!/bin/bash
# SGP Database Backup Helper
# Este script realiza una copia de seguridad (backup) completa de la base de datos.
# Diseñado para ser ejecutado de forma manual o programarse en un Cron Job del sistema.

# Configuración de rutas y credenciales
BACKUP_DIR="/root/backups"
DB_USER=${DB_USER:-sgp_admin}
DB_PASSWORD=${DB_PASSWORD:-P10xmK2vL9qRnW5z}
DB_NAME=${DB_NAME:-sgp_db}
DB_HOST=${DB_HOST:-127.0.0.1}
KEEP_DAYS=30  # Período de retención en días para los backups antiguos

# Crear directorio de copias de seguridad si no existe
mkdir -p "$BACKUP_DIR"

# Nomenclatura del archivo con fecha y hora
DATE=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/sgp_backup_${DATE}.sql"

echo "🚀 Iniciando copia de seguridad de la base de datos SGP..."

# Ejecución del volcado de la base de datos (mysqldump)
# Se utiliza --no-tablespaces por compatibilidad de privilegios en el VPS
if command -v mysqldump &> /dev/null; then
    echo "💻 Ejecutando mysqldump en el host..."
    mysqldump --no-tablespaces -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_FILE"
else
    # Intentar ejecutar el volcado dentro de un contenedor Docker activo de base de datos
    CONTAINER_ID=$(docker ps --filter "name=mysql" --filter "name=db" --filter "name=mariadb" -q | head -n 1)
    if [ -n "$CONTAINER_ID" ]; then
        echo "🐳 Detectado contenedor Docker ($CONTAINER_ID). Ejecutando mysqldump dentro del contenedor..."
        docker exec -i "$CONTAINER_ID" mysqldump --no-tablespaces -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_FILE"
    else
        echo "❌ Error: No se encontró la herramienta 'mysqldump' instalada ni un contenedor de base de datos activo."
        exit 1
    fi
fi

# Verificación de integridad del archivo resultante
if [ -s "$BACKUP_FILE" ]; then
    echo "✅ Copia de seguridad generada correctamente."
    
    # Comprimir el archivo SQL con gzip para optimizar espacio en disco
    gzip -f "$BACKUP_FILE"
    echo "📦 Archivo de respaldo comprimido en: ${BACKUP_FILE}.gz"
    
    # Rotación automática de respaldos antiguos (eliminación después de KEEP_DAYS días)
    echo "🧹 Buscando y depurando respaldos con antigüedad mayor a $KEEP_DAYS días..."
    find "$BACKUP_DIR" -name "sgp_backup_*.sql.gz" -mtime +$KEEP_DAYS -exec rm -f {} \;
    echo "✅ Proceso de depuración de respaldos antiguos finalizado."
else
    echo "❌ Error crítico: La copia de seguridad no se generó o el archivo quedó vacío."
    rm -f "$BACKUP_FILE"
    exit 1
fi
