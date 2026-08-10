#!/bin/bash
# SGP Database Reset Helper
# Este script ejecuta el volcado y reinicio de la base de datos MySQL en producción.

echo "🚀 SGP Database Reset Helper"
echo "========================"
echo "⚠️  ADVERTENCIA: Esto borrará permanentemente todas las solicitudes y beneficiarios."
read -p "¿Estás seguro de reiniciar la base de datos? (yes/no): " confirm

if [ "$confirm" == "yes" ]; then
    echo "🔄 Reseteando base de datos SGP..."
    
    # Credenciales por defecto (pueden ser sobrescritas por variables de entorno)
    DB_USER=${DB_USER:-sgp_user}
    DB_PASSWORD=${DB_PASSWORD:-changeme}
    DB_NAME=${DB_NAME:-sgp_db}
    DB_HOST=${DB_HOST:-127.0.0.1}

    # Ruta al archivo SQL
    SQL_PATH="$(dirname "$0")/reiniciar_db.sql"

    # Método 1: Intentar ejecutar localmente con la CLI de mysql
    if command -v mysql &> /dev/null; then
        echo "💻 Ejecutando comando local mysql..."
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SQL_PATH"
        echo "✅ Base de datos reseteada con éxito (MySQL local)."
    
    # Método 2: Intentar ejecutar dentro de un contenedor Docker
    elif command -v docker &> /dev/null; then
        # Buscar un contenedor que corra mysql o mariadb
        CONTAINER_ID=$(docker ps --filter "name=mysql" --filter "name=db" --filter "name=mariadb" -q | head -n 1)
        if [ -n "$CONTAINER_ID" ]; then
            echo "🐳 Contenedor de base de datos detectado (ID: $CONTAINER_ID). Ejecutando dentro de Docker..."
            docker exec -i "$CONTAINER_ID" mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SQL_PATH"
            echo "✅ Base de datos reseteada con éxito (Docker)."
        else
            echo "❌ No se encontró la CLI de mysql ni ningún contenedor de base de datos Docker activo."
            echo "Por favor, corre el script SQL manualmente en tu base de datos utilizando el archivo:"
            echo "   $SQL_PATH"
        fi
    else
        echo "❌ No se encontró comando mysql ni docker en el sistema."
        echo "Por favor, corre el script SQL manualmente utilizando el archivo:"
        echo "   $SQL_PATH"
    fi
else
    echo "❌ Operación cancelada."
fi
