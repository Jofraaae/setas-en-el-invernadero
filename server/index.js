/* ================================================================
   Servidor de "Among Shrooms" sin Base44.
   Node + ws: HTTP (listado de salas y estática del build) y WebSocket
   (/ws?room=XXXX&id=<connId>) con el mismo protocolo de mensajes que
   usaba el actor GameRoom de Base44.

     npm run dev    -> vite (frontend) + este servidor (backend)
     node server/index.js  -> solo backend (o frontend compilado en dist/)
   ================================================================ */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import GameRoom, { CODE_RE } from './engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8787);
const DIST = path.join(ROOT, 'dist');
const SAVE_DIR = path.join(ROOT, '.saves');

/* ---------- persistencia en memoria (+ disco, para sobrevivir reinicios) ---------- */

const store = new Map(); // code -> { get, put } por sala

// Al arrancar se borran los guardados viejos: si el servidor se cae o se reinicia, las salas
// abandonadas se quedarían en disco para siempre y sus códigos figurarían como ocupados.
// Los recientes se conservan, así una partida en curso sobrevive a un reinicio rápido.
const SAVE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
try {
  for (const name of fs.readdirSync(SAVE_DIR)) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(SAVE_DIR, name);
    if (Date.now() - fs.statSync(file).mtimeMs > SAVE_MAX_AGE_MS) fs.unlinkSync(file);
  }
} catch (e) { /* aún no existe .saves: nada que limpiar */ }

function makeStorage(code) {
  const file = path.join(SAVE_DIR, `${code}.json`);
  return {
    async get() {
      if (store.has(code)) return store.get(code);
      try {
        const s = JSON.parse(fs.readFileSync(file, 'utf8'));
        store.set(code, s);
        return s;
      } catch (e) {
        return null;
      }
    },
    async put(_k, v) {
      const copy = JSON.parse(JSON.stringify(v));
      store.set(code, copy);
      try {
        fs.mkdirSync(SAVE_DIR, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(copy));
      } catch (e) { /* el disco es un extra: la partida vive en memoria */ }
    },
  };
}

/* ---------- salas ---------- */

const rooms = new Map(); // code -> GameRoom
const connsByRoom = new Map(); // code -> Map(connId -> conn)

function registryFor(code) {
  return {
    update(c, row) { roomAnnounce.set(c, { ...row, updated_at: Date.now() }); },
    remove(c) { roomAnnounce.delete(c); },
    list() { return [...roomAnnounce.values()]; },
  };
}

// anuncio de salas (equivalente a la entidad Room de Base44): en memoria,
// con caducidad para que no queden filas fantasma si el proceso muere.
const roomAnnounce = new Map();
const ANNOUNCE_TTL_MS = 60000;

function liveAnnouncements() {
  const now = Date.now();
  for (const [code, row] of roomAnnounce) {
    if (now - row.updated_at > ANNOUNCE_TTL_MS) roomAnnounce.delete(code);
  }
  return [...roomAnnounce.values()];
}

function getRoom(code) {
  let room = rooms.get(code);
  if (!room) {
    const rt = {
      storage: makeStorage(code),
      registry: registryFor(code),
      getConnections: () => [...(connsByRoom.get(code)?.values() || [])],
      closeConn: (connId) => {
        const c = connsByRoom.get(code)?.get(connId);
        if (c) { try { c.raw.close(4000, 'kick'); } catch (e) { /* ya cerrada */ } }
      },
      schedule: (key, at) => setTimeout(() => room.handleWake(key), Math.max(0, at - Date.now())),
      cancelSchedule: () => {},
    };
    room = new GameRoom(code, rt);
    rooms.set(code, room);
    connsByRoom.set(code, new Map());
    room.hydrate();
  }
  return room;
}

// una sala vacía y sin conexiones se retira (el motor ya se resetea solo)
setInterval(() => {
  for (const [code, room] of rooms) {
    if (room.players.size === 0 && (connsByRoom.get(code)?.size || 0) === 0) {
      rooms.delete(code);
      connsByRoom.delete(code);
      roomAnnounce.delete(code);
      store.delete(code);
      try { fs.unlinkSync(path.join(SAVE_DIR, `${code}.json`)); } catch (e) { /* sin archivo */ }
    }
  }
}, 30000).unref();

/* ---------- HTTP: listado de salas + estática ---------- */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.map': 'application/json',
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function serveStatic(req, res, urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/') p = '/index.html';
  const full = path.normalize(path.join(DIST, p));
  if (!full.startsWith(DIST)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(full, (err, data) => {
    if (err) {
      // SPA: cualquier ruta desconocida devuelve index.html
      fs.readFile(path.join(DIST, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(404); return res.end('Not found. Ejecuta `npm run build` o usa `npm run dev`.'); }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(idx);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const u = req.url || '/';
  if (u.startsWith('/api/rooms')) {
    const rows = liveAnnouncements().map((r) => ({
      id: r.code, code: r.code, player_count: r.player_count, min_players: r.min_players,
      max_players: r.max_players, status: r.status, created_at: new Date(r.updated_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    }));
    return sendJson(res, 200, { items: rows, total: rows.length });
  }
  if (u.startsWith('/api/health')) return sendJson(res, 200, { ok: true, rooms: rooms.size });
  if (fs.existsSync(DIST)) return serveStatic(req, res, u);
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Backend de Among Shrooms. El frontend se sirve con `npm run dev` (Vite) o tras `npm run build`.');
});

/* ---------- WebSocket: la misma API de mensajes que el actor ---------- */

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const q = new URL(req.url, 'http://localhost').searchParams;
  const code = String(q.get('room') || '').toUpperCase().trim();
  const connId = String(q.get('id') || '');
  if (!CODE_RE.test(code) || !connId) {
    ws.close(4004, 'bad request');
    return;
  }
  const room = getRoom(code);
  const conns = connsByRoom.get(code);
  // si revive una conexión con el mismo id, la anterior se descuelga
  const prev = conns.get(connId);
  if (prev) { try { prev.raw.terminate(); } catch (e) { /* ya muerta */ } }

  const conn = {
    id: connId,
    raw: ws,
    send(msg) {
      if (ws.readyState === 1) {
        try { ws.send(JSON.stringify(msg)); } catch (e) { /* envío perdido */ }
      }
    },
  };
  conns.set(connId, conn);
  room.onOpen(conn);

  ws.on('message', (buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString('utf8')); } catch (e) { return; }
    room.onMessage(conn, msg);
  });
  ws.on('close', () => {
    if (conns.get(connId) === conn) {
      conns.delete(connId);
      room.onClose(conn);
    }
  });
  ws.on('error', () => { /* el cierre se encarga de la limpieza */ });
});

// "ws" reenvía los errores del servidor HTTP: sin oyente en wss lanzaría una excepción
wss.on('error', () => { /* se informa en server.on('error') */ });
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`✖ El puerto ${PORT} ya está en uso (¿hay otra copia del juego abierta?).`);
    console.error(`  Ciérrala, o usa otro puerto:  PORT=${PORT + 1} npm run server`);
  } else {
    console.error('✖ Error del servidor:', e.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`🍄 Servidor de "Among Shrooms" escuchando en http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws · Listado: http://localhost:${PORT}/api/rooms`);
});
