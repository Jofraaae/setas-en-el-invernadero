# 🍄 Setas en el invernadero

Juego de deducción social multijugador (4–15 jugadores) sin dependencias externas:
frontend React + Vite y backend Node.js propio (`ws`) con el mismo motor de salas que
antes corría como actor de Base44.

## Cómo jugar en local

```bash
npm install
npm run dev        # levanta el servidor de juego (:8787) + Vite (:5173) con proxy
```

Abre http://localhost:5173 en varias pestañas/dispositivos, crea una sala y únete con su código.

## Jugar sin complicaciones

Doble clic en `jugar.bat` (Windows) o `./jugar.sh` (Mac/Linux), o bien `npm run play`.
Compila el juego y lo sirve todo en **http://localhost:8787**: ahí se abre directamente el menú
para poner tu nombre, crear una sala o unirte con un código.

> No abras `index.html` con doble clic: es la plantilla de Vite y necesita el servidor.
> Entra siempre por la URL `http://localhost:8787` (o `:5173` con `npm run dev`).

## Un solo archivo HTML

```bash
npm run html     # genera setas.html (JS, CSS y mapas incluidos)
npm run server   # el servidor de juego sigue haciendo falta
```

`setas.html` se abre con doble clic y muestra el menú; al estar abierto como archivo se conecta
solo a `http://localhost:8787`. Si el servidor vive en otra máquina, compila con
`VITE_GAME_SERVER=http://IP:8787 npm run html`. Un HTML solo no puede hospedar las salas
multijugador: el servidor Node es quien las gestiona.

## Producción

```bash
npm run build      # genera dist/
npm run server     # Node sirve dist/ + API + WebSocket en :8787 (variable PORT)
```

Todo (frontend y backend) se sirve entonces desde un único proceso; para jugar en red basta
con exponer ese puerto. El listado de salas vive en memoria (con anuncios que caducan a los
60 s) y las partidas se respaldan en `.saves/*.json`.

## Arquitectura

- `server/engine.mjs` — motor de la sala (roles, tareas, reuniones, sabotajes…). Extraído
  del antiguo actor `GameRoom`; ya no importa nada de Base44: recibe un entorno `rt`
  (storage, registro de salas, conexiones WS).
- `server/index.js` — HTTP (`/api/rooms`, `/api/health`, estática de `dist/`) + WebSocket
  `/ws?room=CODE&id=<connId>` con el mismo protocolo de mensajes (`{t:'create'|'join'|...}`).
- `src/lib/game/net.js` — sustituto del SDK: `connectRoom()` (WebSocket nativo con la misma
  interfaz que devolvía `base44.actors.GameRoom().connect()`) y `fetchRooms()/subscribeRooms()`.
- `vite.config.js` — alias `@` y proxy de `/api` y `/ws` hacia el servidor de juego.

Variables de entorno: `PORT` (servidor, por defecto 8787), `GAME_SERVER_URL` (proxy de Vite),
`VITE_GAME_SERVER` (cliente, si el backend vive en otro origen).
