#!/bin/bash

# SGP Deployment Helper Script
# Uso: ./deploy.sh [comando]

set -e

echo "🚀 SGP Deployment Helper"
echo "========================"
echo ""

case "$1" in
  "build")
    echo "📦 Construyendo imágenes Docker..."
    docker-compose build
    echo "✅ Build completado"
    ;;
    
  "start")
    echo "▶️  Iniciando servicios..."
    docker-compose up -d
    echo "✅ Servicios iniciados"
    echo ""
    echo "Ver logs: ./deploy.sh logs"
    ;;
    
  "stop")
    echo "⏹️  Deteniendo servicios..."
    docker-compose down
    echo "✅ Servicios detenidos"
    ;;
    
  "restart")
    echo "🔄 Reiniciando servicios..."
    docker-compose restart
    echo "✅ Servicios reiniciados"
    ;;
    
  "logs")
    echo "📋 Mostrando logs (Ctrl+C para salir)..."
    docker-compose logs -f
    ;;
    
  "status")
    echo "📊 Estado de los servicios:"
    docker-compose ps
    ;;
    
  "update")
    echo "🔄 Actualizando aplicación..."
    git pull
    docker-compose down
    docker-compose build
    docker-compose up -d
    echo "✅ Actualización completa"
    ;;
    
  "clean")
    echo "⚠️  ADVERTENCIA: Esto eliminará TODOS los datos"
    read -p "¿Estás seguro? (yes/no): " confirm
    if [ "$confirm" == "yes" ]; then
      docker-compose down -v
      echo "✅ Limpieza completa"
    else
      echo "❌ Cancelado"
    fi
    ;;
    
  *)
    echo "Comandos disponibles:"
    echo "  build    - Construir imágenes Docker"
    echo "  start    - Iniciar servicios"
    echo "  stop     - Detener servicios"
    echo "  restart  - Reiniciar servicios"
    echo "  logs     - Ver logs en tiempo real"
    echo "  status   - Ver estado de contenedores"
    echo "  update   - Actualizar desde Git y reiniciar"
    echo "  clean    - Eliminar todo (¡CUIDADO!)"
    echo ""
    echo "Ejemplo: ./deploy.sh start"
    ;;
esac
