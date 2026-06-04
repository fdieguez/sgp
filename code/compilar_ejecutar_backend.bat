@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
set "MAVEN_HOME=C:\Users\fran\dev\maven"
set "NODE_HOME=C:\Program Files\nodejs"
set "PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%NODE_HOME%;%PATH%"

cd backend
call compilar_y_ejecutar.bat
