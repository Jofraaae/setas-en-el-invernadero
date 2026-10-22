@echo off
REM Doble clic para jugar: instala, compila y abre el juego en http://localhost:8787
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js: https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 ( pause & exit /b 1 )
)
echo Compilando el juego...
call npm run build
if errorlevel 1 ( pause & exit /b 1 )
start "" http://localhost:8787
echo Servidor en marcha. Cierra esta ventana para pararlo.
call npm run server
pause
