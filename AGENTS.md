# Instrucciones para agentes

- Este proyecto NO usa Base44. El backend es Node.js puro (`server/index.js` + `ws`) y el
  motor de juego está en `server/engine.mjs`.
- Desarrollo: `npm run dev` (servidor de juego + Vite con proxy `/api` y `/ws`).
- No reintroducir dependencias `@base44/*` ni llamadas a APIs hosted.
- El protocolo de mensajes del WebSocket debe seguir siendo `{ t: '...' }` con las mismas
  semánticas que documenta `src/pages/Home.jsx` al consumir `connectRoom()`.
