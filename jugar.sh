#!/usr/bin/env bash
# Para jugar: instala, compila y sirve el juego en http://localhost:8787
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Necesitas instalar Node.js: https://nodejs.org"; exit 1; }
[ -d node_modules ] || npm install
npm run build
URL="http://localhost:${PORT:-8787}"
(sleep 2; (xdg-open "$URL" || open "$URL") >/dev/null 2>&1 || true) &
echo "Servidor en marcha en $URL (Ctrl+C para parar)"
exec npm run server
