@echo off
echo =======================================
echo Iniciando Servidor de Desarrollo React...
echo =======================================

:: Forzamos el uso de .cmd para evadir la politica de PowerShell (.ps1 bloqueados)
call npm.cmd run dev

pause
