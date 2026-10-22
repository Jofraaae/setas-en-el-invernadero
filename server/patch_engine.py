import re

p = 'server/engine.mjs'
src = open(p).read()

# --- 1) header: remove base44 import ---
hdr_old = "import { Actor } from 'base44:runtime/actors';\n"
assert hdr_old in src, 'hdr'
src = src.replace(hdr_old, "", 1)

# --- 2) class declaration + constructor + lifecycle API ---
cls_old = "export default class GameRoom extends Actor {"
cls_new = """/* ================================================================
   Runtime propio (sin Base44): el servidor (server/index.js) crea una
   sala por codigo y le pasa un entorno `rt` con:
     rt.storage         -> { get(key), put(key, value) }  persistencia
     rt.registry        -> anuncio de salas para el listado del menu
                           { update(code,row), remove(code), list() }
     rt.getConnections()-> [{ id, send(msg) }] conexiones WebSocket abiertas
     rt.closeConn(id)   -> corta una conexion (kick/ban)
     rt.schedule/cancelSchedule -> latidos diferidos (setTimeout)
   El protocolo de mensajes es identico al del actor original.
   ================================================================ */

class GameRoom {
  constructor(code, rt = {}) {
    this.code = code || null;
    this.rt = rt;
    if (!rt.storage) {
      const mem = new Map();
      rt.storage = {
        async get(k) { return mem.get(k) ?? null; },
        async put(k, v) { mem.set(k, JSON.parse(JSON.stringify(v))); },
      };
    }
    if (!rt.registry) {
      const rooms = new Map();
      rt.registry = {
        update(code, row) { rooms.set(code, { ...row, updated_at: Date.now() }); },
        remove(code) { rooms.delete(code); },
        list() { return [...rooms.values()]; },
      };
    }
    if (!rt.getConnections) rt.getConnections = () => [];
    if (!rt.closeConn) rt.closeConn = () => {};
    if (!rt.schedule) rt.schedule = (key, at) => setTimeout(() => this.handleWake(key), Math.max(0, at - Date.now()));
    if (!rt.cancelSchedule) rt.cancelSchedule = () => {};
  }

  /* ---------- API del ciclo de vida que usa el servidor ---------- */

  onOpen(conn) { return this.handleConnect(conn); }

  onClose(conn) { return this.handleClose(conn); }

  onMessage(conn, msg) { return this.handleMessage(conn, msg); }
"""
assert cls_old in src, 'cls'
src = src.replace(cls_old, cls_new, 1)

# --- 3) onCreate / onJoin: check global registry for occupied codes ---
old_create = """    if (this.players.size > 0) return conn.send({ t: 'error', msg: 'Ese código ya está ocupado. Generando otro…' });"""
new_create = """    // el registro global dice si otra sala viva tiene ese código
    const other = this.rt.registry.list().find((r) => r.code === code && r.status !== 'gone');
    if (other || this.players.size > 0) return conn.send({ t: 'error', msg: 'Ese código ya está ocupado. Generando otro…' });"""
assert old_create in src, 'create'
src = src.replace(old_create, new_create, 1)

# --- 4) save(): serialize Maps/Sets which JSON.stringify would drop ---
old_save_head = "  async save() {\n    this.savedAt = Date.now();\n    await this.storage.put('st', {"
new_save_head = """  async save() {
    this.savedAt = Date.now();
    await this.rt.storage.put('st', {"""
assert old_save_head in src, 'savehead'
src = src.replace(old_save_head, new_save_head, 1)

old_save_fields = """      lastResult: this.lastResult, lastEnd: this.lastEnd, lobbyChat: this.lobbyChat, banned: [...this.banned], doorAt: [...this.doorAt], doorReady: [...this.doorReady],"""
new_save_fields = """      lastResult: this.lastResult, lastEnd: this.lastEnd, lobbyChat: this.lobbyChat, banned: [...this.banned], doorAt: [...this.doorAt], doorReady: [...this.doorReady], savedAt: this.savedAt,"""
assert old_save_fields in src, 'savefields'
src = src.replace(old_save_fields, new_save_fields, 1)

# --- 5) restore(): also restore savedAt ---
old_restore = "  restore(s) {\n    this.code = s.code || null;"
new_restore = "  restore(s) {\n    this.savedAt = s.savedAt || 0;\n    this.code = s.code || null;"
assert old_restore in src, 'restore'
src = src.replace(old_restore, new_restore, 1)

# --- 6) hydrate(): storage via rt; connections via rt ---
old_hyd = """  async hydrate() {
    const s = await this.storage.get('st');
    if (s) this.restore(s);
    const live = new Map(this.getConnections().map((c) => [c.id, c]));"""
new_hyd = """  async hydrate() {
    const s = await this.rt.storage.get('st');
    if (s) this.restore(s);
    const live = new Map(this.rt.getConnections().map((c) => [c.id, c]));"""
assert old_hyd in src, 'hydrate'
src = src.replace(old_hyd, new_hyd, 1)

# --- 7) syncRoom(): replace Base44 entity CRUD with local registry ---
start = src.index("  async syncRoom() {")
end = src.index("  armRoomSync() {")
new_sync = """  async syncRoom() {
    if (this.syncing) return; // ya hay una escritura en marcha: se reutiliza la siguiente pasada
    this.syncing = true;
    const code = this.code;
    this.roomSyncedAt = Date.now(); // se marca antes de escribir: evita ráfagas de llamadas
    try {
      if (!code) return;
      if (this.players.size === 0 || this.phase === 'ended') {
        this.rt.registry.remove(code);
        return;
      }
      this.rt.registry.update(code, {
        code,
        player_count: this.players.size,
        max_players: MAX_PLAYERS,
        min_players: MIN_PLAYERS,
        status: this.phase === 'lobby' ? 'lobby' : 'playing',
      });
      this.syncErr = null;
    } catch (e) {
      // el listado es informativo: un fallo aquí nunca debe tumbar la partida
      this.syncErr = String((e && e.message) || e);
    } finally {
      this.syncing = false;
    }
  }

"""
src = src[:start] + new_sync + src[end:]

# --- 8) armRoomSync / schedule / cancelSchedule / getConnections / broadcast / sendTo ---
old_arm = """  armRoomSync() {
    try {
      this.schedule('room', Date.now() + ROOM_SYNC_MS);
    } catch (e) {
      // sin latido: el anuncio se refresca igual cada vez que cambia algo
    }
  }"""
new_arm = """  armRoomSync() {
    try {
      this.rt.schedule('room', Date.now() + ROOM_SYNC_MS);
    } catch (e) {
      // sin latido: el anuncio se refresca igual cada vez que cambia algo
    }
  }

  /* ---------- envío a las conexiones WebSocket ---------- */

  getConnections() { return this.rt.getConnections(); }

  broadcast(msg) {
    for (const c of this.getConnections()) {
      try { c.send(msg); } catch (e) { /* conexión cerrada a media tanda */ }
    }
  }"""
assert old_arm in src, 'arm'
src = src.replace(old_arm, new_arm, 1)

old_watch = "  armWatch() { this.schedule('watch', Date.now() + WATCH_MS); }"
new_watch = "  armWatch() { this.rt.schedule('watch', Date.now() + WATCH_MS); }"
assert old_watch in src, 'watch'
src = src.replace(old_watch, new_watch, 1)

old_reset_sched = "    try { this.cancelSchedule('room'); } catch (e) { /* no había latido pendiente */ }"
new_reset_sched = "    try { this.rt.cancelSchedule('room'); } catch (e) { /* no había latido pendiente */ }"
assert old_reset_sched in src, 'resched'
src = src.replace(old_reset_sched, new_reset_sched, 1)

# --- 9) kick: close the connection after notifying ---
old_kick = """        if (mode === 'ban') this.banned.add(target.connId);
        this.sendTo(target, { t: 'kicked', ban: mode === 'ban' });
        this.removePlayer(target, mode);"""
new_kick = """        if (mode === 'ban') this.banned.add(target.connId);
        this.sendTo(target, { t: 'kicked', ban: mode === 'ban' });
        this.rt.closeConn(target.connId); // sin cortar el socket, el expulsado seguiría jugando
        this.removePlayer(target, mode);"""
assert old_kick in src, 'kick'
src = src.replace(old_kick, new_kick, 1)

# --- 10) quit: tell the server to drop the socket too ---
old_quit = """      case 'quit': {
        this.removePlayer(p);
        return this.save();
      }"""
new_quit = """      case 'quit': {
        this.removePlayer(p);
        this.rt.closeConn(conn.id); // el cliente ya pidió salir: se suelta el socket
        return this.save();
      }"""
assert old_quit in src, 'quit'
src = src.replace(old_quit, new_quit, 1)

# --- 11) export + room info helper for the HTTP listing ---
assert src.rstrip().endswith('}'), 'tail'
src = src.rstrip() + """

/* Ficha de la sala para el listado del menú (solo lectura: la autoridad sigue
   siendo la propia sala, que decide la admisión en onJoin). */
export function roomInfo(room) {
  return {
    code: room.code,
    players: room.players.size,
    max_players: MAX_PLAYERS,
    min_players: MIN_PLAYERS,
    status: room.phase === 'lobby' ? 'lobby' : (room.phase === 'ended' ? 'ended' : 'playing'),
  };
}

export { MIN_PLAYERS, MAX_PLAYERS, CODE_RE };
export default GameRoom;
"""

open(p, 'w').write(src)
print('patched ok')
