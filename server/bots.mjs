/* ================================================================
   Bots de la sala: jugadores controlados por el servidor.

   Un bot es un jugador normal (vive en room.players con bot:true). Sus acciones
   pasan por room.handleMessage igual que las de un cliente, así que el motor les
   aplica exactamente las mismas reglas. Lo que "sabe" cada bot lo saca de lo que
   ve (la misma línea de visión que un jugador), de lo que oye en el chat y de lo
   que el juego le dice en privado; nunca mira los roles de los demás.

     BotManager  → reparte los avisos del motor y lleva el reloj de los cerebros
     Brain       → un cerebro por bot (botBrain.mjs): navegar, hacer misiones,
                   usar su rol, vigilar, acusar, defenderse y votar
   ================================================================ */

import { buildWalk, nearestWalkable } from './botNav.mjs';
import { pickBotName, roomEn, norm } from './botChat.mjs';
import { Brain } from './botBrain.mjs';

const MAX_ERRORS = 12;

// Elige el margen de pared más holgado con el que se llega a todo lo importante del mapa.
function chooseWalk(M, E) {
  const keys = [];
  for (const t of M.tasks) keys.push({ x: t.x, y: t.y, task: true });
  for (const v of M.vents) keys.push({ x: v.x, y: v.y });
  keys.push({ x: M.button.x, y: M.button.y }, { x: M.panel.x, y: M.panel.y });
  for (const r of M.rpts) keys.push({ x: r.x, y: r.y });
  const sp = M.spawn || M.button;
  for (const r of [22, 19, 17]) {
    const walk = buildWalk(M, E.gridHit, r);
    const s = nearestWalkable(walk, null, sp.x, sp.y, 12);
    if (!s) continue;
    const seen = new Uint8Array(walk.gw * walk.gh);
    const stack = [s[1] * walk.gw + s[0]];
    seen[stack[0]] = 1;
    while (stack.length) {
      const c = stack.pop(), cx = c % walk.gw, cy = (c / walk.gw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= walk.gw || ny >= walk.gh) continue;
        const ni = ny * walk.gw + nx;
        if (seen[ni] || !walk.cells[ni]) continue;
        seen[ni] = 1;
        stack.push(ni);
      }
    }
    let ok = true;
    for (const k of keys) {
      const n = nearestWalkable(walk, null, k.x, k.y, 10);
      if (!n || !seen[n[1] * walk.gw + n[0]]) { ok = false; break; }
      if (k.task && Math.hypot(n[0] * 20 + 10 - k.x, n[1] * 20 + 10 - k.y) > 75) { ok = false; break; }
    }
    if (ok) { walk.margin = r; return walk; }
  }
  const walk = buildWalk(M, E.gridHit, 17);
  walk.margin = 17;
  walk.partial = true;
  return walk;
}
const WALKS = new Map(); // mapa → rejilla de caminos (se calcula una vez por proceso)

const now0 = () => Date.now();

export class BotManager {
  constructor(room, env) {
    this.room = room;
    this.E = env;
    this.brains = new Map();
    this.conns = new Map();
    this.timers = new Set();
  }

  get M() { return this.room.m; }

  get walk() {
    const id = this.M.id;
    let w = WALKS.get(id);
    if (!w) { w = chooseWalk(this.M, this.E); WALKS.set(id, w); }
    return w;
  }

  brain(p) {
    let b = this.brains.get(p.id);
    if (!b) { b = new Brain(this, p.id); this.brains.set(p.id, b); }
    return b;
  }

  /* ---------- altas / bajas ---------- */

  // nombre al azar que nadie lleva ya
  newName() {
    return pickBotName([...this.room.players.values()].map((q) => q.name));
  }

  afterAdd(p) {
    this.brain(p);
    // un saludo suelto en la sala de espera, en el idioma de la sala
    const t = setTimeout(() => {
      this.timers.delete(t);
      try {
        const q = this.room.players.get(p.id);
        // solo saluda uno de vez en cuando: una sala llena de bots no debe parecer un coro
        if (!q || this.room.phase !== 'lobby' || Math.random() > 0.2 || now0() - (this.lastGreet || 0) < 45000) return;
        const s = this.say('greet');
        if (s && this.room.botSay(q, s, null)) this.lastGreet = now0();
      } catch (e) { /* un saludo menos */ }
    }, 1200 + Math.random() * 4000);
    if (t.unref) t.unref();
    this.timers.add(t);
  }

  forget(p) {
    this.brains.delete(p.id);
    this.conns.delete(p.id);
  }

  // tras restaurar una sala guardada: cada bot recupera su cerebro (sin memoria)
  sync() {
    for (const id of [...this.brains.keys()]) if (!this.room.players.get(id)?.bot) this.brains.delete(id);
    for (const p of this.room.players.values()) if (p.bot) this.brain(p);
  }

  clear() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.brains.clear();
    this.conns.clear();
  }

  say(kind, params) { return this.E.say(kind, params); }

  /* ---------- canal con el motor ---------- */

  connFor(p) {
    let c = this.conns.get(p.id);
    if (!c) {
      c = { id: p.connId, send: (msg) => this.onPrivate(p, msg) };
      this.conns.set(p.id, c);
    }
    return c;
  }

  send(p, msg) {
    try {
      const r = this.room.handleMessage(this.connFor(p), msg);
      if (r && r.catch) r.catch(() => {});
    } catch (e) { /* una orden fallida no tumba la sala */ }
  }

  onPrivate(p, msg) {
    const b = this.brains.get(p.id);
    if (b) { try { b.onPrivate(msg); } catch (e) { this.fail(b, e); } }
  }

  /* ---------- reloj ---------- */

  tick(now) {
    if (!this.brains.size) return;
    for (const b of this.brains.values()) {
      if (b.disabled) continue;
      const p = this.room.players.get(b.id);
      if (!p) continue;
      try { b.step(now); } catch (e) { this.fail(b, e); }
    }
  }

  fail(b, e) {
    b.errors = (b.errors || 0) + 1;
    if (b.errors <= 2) console.error('[bot]', b.id, (e && e.stack) || e);
    const n = b.errors;
    b.reset();
    b.errors = n;
    if (n > MAX_ERRORS) b.disabled = true;
  }

  /* ---------- avisos del motor ---------- */

  onStart() {
    const imps = [...this.room.players.values()].filter((q) => q.role === 'impostor').map((q) => q.id);
    for (const p of this.room.players.values()) {
      if (!p.bot) continue;
      const b = this.brain(p);
      b.reset();
      b.disabled = false;
      if (p.role === 'impostor') for (const id of imps) if (id !== p.id) b.mates.add(id);
    }
  }

  onBroadcast(msg) {
    if (!this.brains.size || !msg) return;
    const now = Date.now();
    if (msg.t === 'meeting') { this.room.botSayAt = 0; this.room.botSayN = 0; }
    for (const b of this.brains.values()) {
      if (b.disabled) continue;
      try {
        switch (msg.t) {
          case 'go': b.onGo(now); break;
          case 'meeting': b.onMeeting(msg, now); break;
          case 'result': b.onResult(msg, now); break;
          case 'resume': b.onResume(now); break;
          case 'end': b.reset(); break;
          default: break;
        }
      } catch (e) { this.fail(b, e); }
    }
    if (msg.t === 'chat' && msg.id && !this.room.players.get(msg.id)?.bot) this.onHumanChat(msg, now);
    else if (msg.t === 'saved') this.onSaved(msg, now);
    else if (msg.t === 'lchat' && msg.id && !this.room.players.get(msg.id)?.bot) this.onLobbyChat(msg, now);
  }

  // una persona saluda en la sala de espera: a veces un bot le contesta, sin prisa
  onLobbyChat(msg, now) {
    if (this.room.phase !== 'lobby' || !/\b(hola|holi|buenas|ey|hey|hi|hello|hola a todos)\b/.test(norm(msg.text))) return;
    if (now - (this.lastGreet || 0) < 8000 || Math.random() > 0.6) return;
    const bots = [...this.room.players.values()].filter((q) => q.bot);
    if (!bots.length) return;
    const q = bots[Math.floor(Math.random() * bots.length)];
    const t = setTimeout(() => {
      this.timers.delete(t);
      try {
        if (this.room.phase !== 'lobby' || !this.room.players.get(q.id)) return;
        const s = this.say('greetBack', { x: msg.name });
        if (s && this.room.botSay(q, s, null)) this.lastGreet = Date.now();
      } catch (e) { /* una respuesta menos */ }
    }, 1500 + Math.random() * 2500);
    if (t.unref) t.unref();
    this.timers.add(t);
  }

  onHumanChat(msg, now) {
    const names = [...this.room.players.values()].filter((q) => q.alive).map((q) => ({ id: q.id, name: q.name }));
    for (const b of this.brains.values()) {
      if (b.disabled) continue;
      try { b.hearText(msg.id, msg.text, names, now); } catch (e) { this.fail(b, e); }
    }
  }

  // un bot habla: los demás bots lo "oyen" sin tener que leer la frase
  onChatStruct(from, struct, now = Date.now()) {
    if (!struct) return;
    for (const b of this.brains.values()) {
      if (b.disabled || b.id === from.id) continue;
      try { b.hearStruct(from.id, struct, now); } catch (e) { this.fail(b, e); }
    }
  }

  // ---- testigos: solo los ve quien tenía a la vista al que actúa
  witnesses(actor, now, ids) {
    const out = [];
    const closed = this.room.closedDoors(now);
    for (const q of this.room.players.values()) {
      if (!q.bot || q === actor || !q.alive || q.inVent || (ids && ids.includes(q.id))) continue;
      if (this.canSee(q, actor, now, closed)) out.push(q);
    }
    return out;
  }

  onKill(killer, victim, now) {
    const closed = this.room.closedDoors(now);
    const seenBy = []; // cualquiera que lo viera, persona o bot: para el impostor cuentan todos
    for (const q of this.room.players.values()) {
      if (q === killer || q === victim || !q.alive || q.inVent || q.role === 'impostor') continue;
      if (this.canSee(q, killer, now, closed) || this.canSee(q, { x: victim.x, y: victim.y }, now, closed)) seenBy.push(q);
    }
    for (const q of seenBy) {
      if (!q.bot) continue;
      const b = this.brains.get(q.id);
      if (b && !b.disabled) { try { b.witnessKill(killer, victim, now); } catch (e) { this.fail(b, e); } }
    }
    const kb = this.brains.get(killer.id);
    if (kb && !kb.disabled) { try { kb.afterKill(victim, now, seenBy.length); } catch (e) { this.fail(kb, e); } }
  }

  onVent(p, entering, now) {
    const closed = this.room.closedDoors(now);
    for (const q of this.room.players.values()) {
      if (!q.bot || q === p || !q.alive || q.inVent || q.role === 'impostor') continue;
      if (this.canSee(q, p, now, closed)) {
        const b = this.brains.get(q.id);
        if (b && !b.disabled) { try { b.witnessVent(p, entering, now); } catch (e) { this.fail(b, e); } }
      }
    }
  }

  onSaved(msg, now) {
    const killer = this.room.players.get(msg.by);
    if (!killer) return;
    const closed = this.room.closedDoors(now);
    for (const q of this.room.players.values()) {
      if (!q.bot || q === killer || !q.alive || q.inVent || q.role === 'impostor') continue;
      if (this.canSee(q, { x: msg.x, y: msg.y }, now, closed) || this.canSee(q, killer, now, closed)) {
        const b = this.brains.get(q.id);
        if (b && !b.disabled) { try { b.witnessAttack(killer, msg.id, now); } catch (e) { this.fail(b, e); } }
      }
    }
  }

  /* ---------- ayudas compartidas por los cerebros ---------- */

  closed(now) { return this.room.closedDoors(now); }

  doorSig(now) {
    const c = this.room.closedDoors(now);
    return c.length ? c.map((d) => d.id).join(',') : '';
  }

  // alcance de vista de un jugador ahora mismo (apagón: los tripulantes casi no ven)
  sightOf(q, now) {
    const R = this.room, E = this.E;
    if (!q.alive) return 0;
    const base = Math.round(420 * R.settings.vision / 100);
    if (R.dark && q.role === 'crew') return Math.round(base * E.DARK_VISION);
    return Math.round(E.SIGHT_BASE * R.settings.vision / 100);
  }

  // ¿ve `a` el punto/jugador `b`? (b puede ser {x, y})
  canSee(a, b, now, closed) {
    const sr = this.sightOf(a, now);
    if (!sr) return false;
    return this.E.sees(this.M, a, b, sr, closed || this.room.closedDoors(now));
  }

  // quién ve a un punto: tripulantes vivos (bots o personas) con la vista libre hasta él
  exposed(pos, ignore, now) {
    const out = [];
    const closed = this.room.closedDoors(now);
    for (const q of this.room.players.values()) {
      if (!q.alive || q.role === 'impostor' || q.inVent || (ignore && ignore.includes(q.id))) continue;
      if (this.canSee(q, pos, now, closed)) out.push(q);
    }
    return out;
  }

  // quién se ve en pantalla: el transformado se dibuja como su objetivo
  shownId(q, now) {
    return q.shiftTo && now >= q.shiftAt && now < q.shiftUntil ? q.shiftTo : q.id;
  }

  roomIdx(x, y) {
    const fl = this.M.floors;
    let best = -1, ba = Infinity;
    for (let i = 0; i < fl.length; i++) {
      const R = fl[i];
      if (!R[5]) continue;
      if (x >= R[0] && x <= R[0] + R[2] && y >= R[1] && y <= R[1] + R[3]) {
        const a = R[2] * R[3];
        if (a < ba) { ba = a; best = i; }
      }
    }
    if (best >= 0) return best;
    let bd = 220;
    for (let i = 0; i < fl.length; i++) {
      const R = fl[i];
      if (!R[5]) continue;
      const cx = Math.max(R[0], Math.min(x, R[0] + R[2])), cy = Math.max(R[1], Math.min(y, R[1] + R[3]));
      const d = Math.hypot(x - cx, y - cy);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  roomName(x, y) {
    const i = this.roomIdx(x, y);
    if (i < 0) return { es: 'un pasillo', en: 'a corridor' };
    const n = this.M.floors[i][5];
    return { es: n, en: roomEn(n) };
  }
}
