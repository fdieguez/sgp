#!/bin/bash
# ==============================================================================
# SGP - Script Automatizado de Despliegue y Actualización en Producción
# Entorno: VPS Ubuntu (/root/deploy/sgp/sgp/code)
# ==============================================================================

set -e

DEPLOY_DIR="/root/deploy/sgp/sgp/code"
BACKUP_DIR="/root/backups"
DB_NAME="sgp_db"
DB_USER="sgp_user"
DATE=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/sgp_prod_pre_update_${DATE}.sql"

echo "======================================================================="
echo "🚀 SGP - INICIANDO DESPLIEGUE EN PRODUCCIÓN"
echo "Fecha y hora: $(date)"
echo "======================================================================="

# ------------------------------------------------------------------------------
# PASO 1: BACKUP COMPLETO DE MYSQL
# ------------------------------------------------------------------------------
echo ""
echo "📦 [1/5] Realizando backup de la base de datos ${DB_NAME}..."
mkdir -p "$BACKUP_DIR"

if command -v mysqldump &> /dev/null; then
    echo "💾 Ejecutando mysqldump en el host..."
    # Intenta sin contraseña o usando .my.cnf / credenciales del sistema
    if ! mysqldump --no-tablespaces --single-transaction --quick --routines --triggers -h 127.0.0.1 -u "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
        echo "⚠️  Solicitando o extrayendo contraseña de MySQL desde .env..."
        DB_PASS=$(grep -E "^DB_PASSWORD=" "${DEPLOY_DIR}/.env" 2>/dev/null | cut -d '=' -f2- || true)
        if [ -n "$DB_PASS" ]; then
            mysqldump --no-tablespaces --single-transaction --quick --routines --triggers -h 127.0.0.1 -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE"
        else
            mysqldump --no-tablespaces --single-transaction --quick --routines --triggers "$DB_NAME" > "$BACKUP_FILE"
        fi
    fi
else
    echo "🐳 Ejecutando mysqldump dentro del contenedor MySQL..."
    docker exec -i sgp_db mysqldump --no-tablespaces --single-transaction --quick --routines --triggers -u "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
fi

gzip -f "$BACKUP_FILE"
if gzip -t "${BACKUP_FILE}.gz"; then
    echo "✅ Backup completado e íntegro: ${BACKUP_FILE}.gz ($(ls -lh "${BACKUP_FILE}.gz" | awk '{print $5}'))"
else
    echo "❌ Error crítico: El archivo de respaldo no es válido."
    exit 1
fi

# ------------------------------------------------------------------------------
# PASO 2: ACTUALIZACIÓN DE CÓDIGO (GIT PULL)
# ------------------------------------------------------------------------------
echo ""
echo "📥 [2/5] Actualizando código desde repositorio Git (main)..."
cd "$DEPLOY_DIR"
git checkout main
git pull origin main
echo "✅ Código actualizado a la última versión: $(git log -n 1 --oneline)"

# ------------------------------------------------------------------------------
# PASO 3: VERIFICACIÓN DE VARIABLES Y BLINDAJE DE PROPIEDADES
# ------------------------------------------------------------------------------
echo ""
echo "🔒 [3/5] Verificando protección contra sobreescritura de usuarios..."
if grep -q "sgp.seed.overwrite-users=false" backend/src/main/resources/application-prod.properties; then
    echo "✅ application-prod.properties: sgp.seed.overwrite-users=false confirmado."
else
    echo "⚠️  Asegurando sgp.seed.overwrite-users=false en application-prod.properties..."
    echo "sgp.seed.overwrite-users=false" >> backend/src/main/resources/application-prod.properties
fi

if ! grep -q "SGP_SEED_OVERWRITE_USERS" .env; then
    echo "SGP_SEED_OVERWRITE_USERS=false" >> .env
    echo "✅ Variable SGP_SEED_OVERWRITE_USERS=false añadida al .env."
fi

# ------------------------------------------------------------------------------
# PASO 4: APLICACIÓN DEL SCRIPT SQL DE USUARIOS Y RESOLUTORES
# ------------------------------------------------------------------------------
echo ""
echo "👥 [4/5] Aplicando script de actualización de nómina y resolutores (update_users.sql)..."
SQL_SCRIPT="${DEPLOY_DIR}/update_users.sql"
if [ ! -f "$SQL_SCRIPT" ]; then
    SQL_SCRIPT="${DEPLOY_DIR}/backend/src/main/resources/db/update_users_nomina_2026.sql"
fi

echo "Ejecutando script SQL: $SQL_SCRIPT..."
DB_PASS=$(grep -E "^DB_PASSWORD=" "${DEPLOY_DIR}/.env" 2>/dev/null | cut -d '=' -f2- || true)

if [ -n "$DB_PASS" ]; then
    mysql --default-character-set=utf8mb4 -h 127.0.0.1 -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_SCRIPT"
    echo "🔍 Verificando estado en base de datos:"
    mysql -h 127.0.0.1 -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
    SELECT COUNT(*) AS total_usuarios_activos FROM users WHERE activo = true;
    SELECT role, COUNT(*) AS cantidad FROM users GROUP BY role;
    SELECT u.email, tr.tipo FROM user_tipo_resolucion utr JOIN users u ON utr.user_id = u.id JOIN tipo_resolucion tr ON utr.tipo_resolucion_id = tr.id;
    "
else
    mysql --default-character-set=utf8mb4 -h 127.0.0.1 -u "$DB_USER" "$DB_NAME" < "$SQL_SCRIPT"
    mysql -h 127.0.0.1 -u "$DB_USER" "$DB_NAME" -e "
    SELECT COUNT(*) AS total_usuarios_activos FROM users WHERE activo = true;
    SELECT role, COUNT(*) AS cantidad FROM users GROUP BY role;
    "
fi
echo "✅ Script SQL aplicado con éxito."

# ------------------------------------------------------------------------------
# PASO 5: RECONSTRUCCIÓN Y REINICIO DE CONTENEDORES (DOCKER COMPOSE)
# ------------------------------------------------------------------------------
echo ""
echo "🐳 [5/5] Reconstruyendo y levantando contenedores Docker..."
docker compose build --no-cache backend frontend
docker compose down
docker compose up -d

echo "⏱️  Esperando 10 segundos para inicialización de servicios..."
sleep 10
docker compose ps

# ------------------------------------------------------------------------------
# SMOKE TESTS POST-DESPLIEGUE
# ------------------------------------------------------------------------------
echo ""
echo "🩺 Verificando Smoke Tests..."
echo "1. Verificando disponibilidad de Manual en PDF..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://solicitudes.ultrasoft.website/Manual_de_Usuario_SGP.pdf || true)
echo "HTTP Status Manual PDF: $HTTP_CODE"

echo "2. Logs recientes del backend:"
docker compose logs --tail=30 backend

echo "======================================================================="
echo "🎉 ¡DESPLIEGUE EN PRODUCCIÓN FINALIZADO EXITOSAMENTE!"
echo "======================================================================="
