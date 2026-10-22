/* ================================================================
   Sustituto del SDK de Base44 para "Setas en el invernadero".
   - connectRoom(): WebSocket contra server/index.js con la misma interfaz
     que devolvía base44.actors.GameRoom(code).connect(): send(msg),
     subscribe(fn) -> unsubscribe, y close().
   - fetchRooms()/dropRoom(): listado de salas por HTTP (equivalente a la
     entidad Room; el anuncio lo mantiene el propio motor de la sala).
   ================================================================ */

/* API_BASE: en dev/producción servido vale '' (mismo origen).
   Abierto con file:// (HTML de un solo archivo) cae a http://localhost:8787 */
function detectBase() {
  const env = import.meta.env.VITE_GAME_SERVER;
  if (env) return env;
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    return 'http://localhost:8787';
  }
  return '';
}
const API_BASE = detectBase();

export function wsUrl(room, connId) {
  const base = API_BASE || window.location.origin;
  const u = new URL('/ws', base.replace(/^http/, 'ws'));
  u.searchParams.set('room', room);
  u.searchParams.set('id', connId);
  return u.toString();
}

/* Devuelve una conexión con la forma que esperaba Home.jsx:
   { send(obj), subscribe(fn) -> unsub, close() } */
export function connectRoom(roomCode, { id }) {
  const ws = new WebSocket(wsUrl(roomCode, id));
  ws.binaryType = 'arraybuffer';
  const subs = new Set();
  const queue = []; // mensajes llegados antes de abrir: se entregan al conectar
  let closedByClient = false;

  ws.addEventListener('open', () => {
    while (queue.length) deliver(queue.shift());
  });
  ws.addEventListener('message', (ev) => {
    let msg = null;
    try {
      if (typeof ev.data === 'string') msg = JSON.parse(ev.data);
      else msg = JSON.parse(new TextDecoder().decode(ev.data));
    } catch (e) { /* mensaje basura: se ignora */ }
    if (screenReady()) deliver(msg);
    else queue.push(msg);
  });

  function deliver(msg) { for (const fn of [...subs]) { try { fn(msg); } catch (e) { console.error(e); } } }
  function screenReady() { return true; }

  return {
    get socket() { return ws; },
    get readyState() { return ws.readyState; },
    send(obj) {
      const s = JSON.stringify(obj);
      if (ws.readyState === WebSocket.OPEN) ws.send(s);
      else if (ws.readyState === WebSocket.CONNECTING) ws.addEventListener('open', () => { try { ws.send(s); } catch (e) { /* cerrada */ } }, { once: true });
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    close() {
      closedByClient = true;
      try { ws.close(1000, 'bye'); } catch (e) { /* ya cerrada */ }
      subs.clear();
    },
    get closedByUser() { return closedByClient; },
  };
}

/* ---------- listado de salas (antes: base44.entities.Room) ---------- */

export async function fetchRooms() {
  const res = await fetch(`${API_BASE}/api/rooms`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

// El anuncio lo escribe el motor de la sala en cada cambio; estas dos funciones
// se conservan por compatibilidad con el código del menú: announce ya no es
// necesario (no-op) y forget pide al servidor que retire la fila.
export async function announceRoom() { /* ahora lo hace el servidor */ }

export async function forgetRoom(code) {
  // sin endpoint de borrado directo: la fila caduca sola cuando la sala se vacía
  void code;
}

// 'suscripción' al listado: sondeo ligero cada 3 s (antes: realtime de Base44)
export function subscribeRooms(onChange, intervalMs = 3000) {
  let stopped = false;
  let lastJson = '';
  const poll = async () => {
    if (stopped) return;
    try {
      const items = await fetchRooms();
      const j = JSON.stringify(items);
      if (j !== lastJson) { lastJson = j; onChange(items); }
    } catch (e) /* el listado es informativo */ {}
  };
  poll();
  const h = setInterval(poll, intervalMs);
  return () => { stopped = true; clearInterval(h); };
}
