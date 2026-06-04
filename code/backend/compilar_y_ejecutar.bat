@echo off
echo =======================================
echo Compilando y Generando Archivo (JAR/WAR)...
echo =======================================
call mvn clean package -DskipTests

IF %ERRORLEVEL% NEQ 0 (
  echo.
  echo ❌ Error en la compilacion del Backend.
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo ✅ Compilacion exitosa. 
echo El archivo autoejecutable se encuentra en: target/backend-0.1.0.jar
echo.
echo =======================================
echo Iniciando Servidor Spring Boot Local...
echo =======================================
java -Dfile.encoding=UTF-8 -jar target\backend-0.1.0.jar

pause
