/* ================================================================
   Cerebro de un bot. Cada tick:
     perceive → memoria  (lo que ve, con la misma línea de visión que un jugador)
     think    → elige una meta (misión, reportar, sabotaje, cazar…) cada ~120 ms
     act      → camina hacia la meta por la rejilla (A*), igual que un cliente
   En las reuniones habla (es/en), acusa con lo que ha visto, se defiende y vota.
   ================================================================ */

import { findPath } from './botNav.mjs';
import { parseChat, pickStyle, stylize } from './botChat.mjs';

const rnd = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const GAME_MS = { hold: 4500, dose: 5000, timing: 4200, spots: 5500, memory: 5000, seq: 4500, code: 4500, pipe: 6000, sort: 5500, match: 5000, order: 4500, catch: 5500 };
const BASE_SUSP = 0.12;
// lo que se dice siempre, aunque ya se haya hablado mucho: pruebas directas y el motivo de la reunión
const PRIO = new Set(['witnessKill', 'witnessAttack', 'witnessVent', 'witnessVentSure', 'detImp', 'bodyFound', 'buttonNone']);

export class Brain {
  constructor(mgr, id) {
    this.mgr = mgr;
    this.id = id;
    this.errors = 0;
    this.disabled = false;
    this.mates = new Set();
    this.talk = rnd(0.5, 1.2); // lo parlanchín que es (cada bot, el suyo)
    this.style = pickStyle(); // su forma de escribir
    this.diligence = rnd(0.4, 0.85); // lo aplicado que es con las misiones: el resto del tiempo, da vueltas
    this.hostile = new Set(); // quien me ha acusado
    this.reset();
  }

  get p() { return this.mgr.room.players.get(this.id); }

  reset() {
    this.seq = 0;
    this.nextThink = 0;
    this.nextPerceive = 0;
    this.goal = null;
    this.goalAt = 0;
    this.path = null;
    this.wp = 0;
    this.pathKey = '';
    this.pathAt = 0;
    this.doorSigStr = '';
    this.noPathUntil = 0;
    this.work = null;
    this.stuck = { x: 0, y: 0, t: 0, n: 0 };
    this.last = { dx: 0, dy: 0, at: 0 };
    this.mem = {
      seen: new Map(), bodies: new Map(), events: [], susp: new Map(), said: new Set(),
      knownImp: new Set(), clear: new Set(), dead: new Set(), acc: new Map(),
    };
    this.bad = new Map();
    this.noise = new Map();
    this.vent = null;
    this.after = null;
    this.hold = 0;
    this.meet = null;
    this.nextSab = 0;
    this.wantButton = 0;
    this.vis = [];
    this.visBodies = [];
    this.where = null;
    this.sciUntil = 0;
    this.det = null;
    this.trk = null;
    this.silent = null;
    this.dblAt = new Map();
    this.hunting = 0;
    this.dutyCache = { t: 0, v: null };
    this.lastReport = null;
    this.lastKillAt = 0;
    this.hostile = new Set();
    this.lurk = null;
    this.roomLog = [];   // salas por las que he pasado esta ronda (para saber si me mienten)
    this.buddy = null;   // a quién acompaño un rato (con un crimen en el aire no se anda solo)
    this.nextBuddy = 0;
    this.avoid = null;   // a dónde voy para alejarme de un sospechoso
    this.nextAvoid = 0;
    this.wander = null;   // un rato dando vueltas en vez de hacer misiones
    this.darkAt = 0;      // desde cuándo hay apagón (para tardar en ir a reparar)
    this.darkDelay = 0;
    this.nextPause = 0;
    this.hist = new Map(); // tipo de frase -> nº de reunión en que la dije por última vez
    this.meetNo = 0;
  }

  /* ================= utilidades ================= */

  send(msg) { return this.mgr.send(this.p, msg); }

  nameOf(id) { const q = this.mgr.room.players.get(id); return q ? q.name : '?'; }

  susp(id) { return this.mem.susp.get(id) ?? BASE_SUSP; }

  addSusp(id, d) {
    if (id === this.id || this.mates.has(id) || this.mem.clear.has(id)) return;
    this.mem.susp.set(id, Math.max(0, Math.min(1, this.susp(id) + d)));
  }

  setSusp(id, v) {
    if (id === this.id || this.mates.has(id)) return;
    this.mem.susp.set(id, v);
  }

  resetStuck(now) {
    const p = this.p;
    this.stuck = { x: p.x, y: p.y, t: now, n: 0 };
  }

  setMove(dx, dy, now) {
    const l = Math.hypot(dx, dy);
    if (l > 0) { dx /= l; dy /= l; }
    const L = this.last;
    const same = Math.abs(dx - L.dx) < 0.1 && Math.abs(dy - L.dy) < 0.1;
    if (same && (!(dx || dy) || now - L.at < 350)) return;
    this.send({ t: 'input', seq: ++this.seq, dx, dy });
    L.dx = dx; L.dy = dy; L.at = now;
  }

  stop(now) { this.setMove(0, 0, now); }

  mk(kind, key, x, y, near, arrive, extra) {
    return { kind, key, x, y, near, arrive, ...(extra || {}) };
  }

  /* ================= bucle ================= */

  step(now) {
    const R = this.mgr.room, p = this.p;
    if (!p) return;
    if (R.phase === 'meeting') return this.meetStep(now);
    if (R.phase !== 'playing') return;
    if (R.frozen(p, now)) { this.last = { dx: 0, dy: 0, at: now }; this.resetStuck(now); return; }
    if (p.inVent) return this.ventStep(now);
    if (now >= this.nextPerceive) { this.perceive(now); this.nextPerceive = now + 150; }
    if (this.work) return this.workStep(now);
    if (now < this.hold) { this.stop(now); return; }
    if (now >= this.nextThink) { this.think(now); this.nextThink = now + 120; }
    this.act(now);
  }

  /* ================= percepción y memoria ================= */

  perceive(now) {
    const mgr = this.mgr, R = mgr.room, p = this.p, E = mgr.E, M = mgr.M;
    this.vis = [];
    this.visBodies = [];
    const ri = mgr.roomIdx(p.x, p.y);
    if (ri >= 0) {
      const prevIdx = this.where ? this.where.idx : -1;
      this.where = { idx: ri, name: { ...mgr.roomName(p.x, p.y), idx: ri }, t: now };
      if (ri !== prevIdx) {
        this.roomLog.push({ idx: ri, t: now });
        if (this.roomLog.length > 80) this.roomLog.shift();
        // al entrar en una sala a veces se para un instante a mirar
        if (p.alive && this.goal && !this.goal.urgent && chance(0.12)) this.hold = Math.max(this.hold, now + rnd(300, 1000));
      }
    }
    if (!p.alive) return;
    if ((p.blindUntil || 0) > now) return; // un Cegador le ha cegado: no ve a nadie
    const closed = R.closedDoors(now);
    const sr = mgr.sightOf(p, now);
    const count = new Map();
    for (const q of R.players.values()) {
      if (q === p || q.inVent || !q.alive) continue;
      if ((q.invisUntil || 0) > now && p.role !== 'impostor') continue;
      if (!E.sees(M, p, q, sr, closed)) continue;
      const shown = mgr.shownId(q, now);
      this.vis.push({ q, shown });
      count.set(shown, (count.get(shown) || 0) + 1);
      this.mem.seen.set(shown, { x: q.x, y: q.y, t: now, room: mgr.roomIdx(q.x, q.y) });
    }
    // un mismo jugador dos veces a la vez: hay un cambiaformas (un impostor no se delata a sí mismo)
    if (p.role !== 'impostor') {
      for (const [shown, n] of count) {
        if (n < 2 || shown === p.id || now - (this.dblAt.get(shown) || -1e9) < 90000) continue;
        this.dblAt.set(shown, now);
        const s = this.mem.seen.get(shown);
        this.addEvent({ type: 'double', who: shown, room: mgr.roomName(s.x, s.y), t: now });
        this.addSusp(shown, 0.1); // uno de los dos es el cambiaformas, pero no se sabe cuál
        if (chance(0.5)) this.wantButton = now + rnd(700, 2500);
      }
    }
    for (const b of R.bodies) if (E.sees(M, p, b, sr, closed)) { this.visBodies.push(b); this.noteBody(b, now); }
    // el localizador marca a alguien: se sabe dónde está aunque no se vea
    if (p.trackerTarget) {
      const tt = R.players.get(p.trackerTarget);
      if (tt && tt.alive) this.mem.seen.set(tt.id, { x: tt.x, y: tt.y, t: now, room: mgr.roomIdx(tt.x, tt.y), trk: true });
    }
  }

  noteBody(b, now) {
    const mgr = this.mgr, p = this.p;
    if (this.mem.bodies.has(b.id)) return;
    const near = [];
    for (const [id, s] of this.mem.seen) {
      if (id === b.id || id === p.id) continue;
      if (now - s.t < 14000 && Math.hypot(s.x - b.x, s.y - b.y) < 320) near.push(id);
    }
    this.mem.bodies.set(b.id, { id: b.id, x: b.x, y: b.y, t: now, room: mgr.roomName(b.x, b.y), ridx: mgr.roomIdx(b.x, b.y), near, reported: false });
    if (p.role !== 'impostor') {
      for (const id of near) this.addSusp(id, 0.28 / (1 + 0.45 * (near.length - 1)));
      this.hold = Math.max(this.hold, now + rnd(350, 1000)); // un momento de susto antes de moverse
    }
  }

  addEvent(e) {
    const dup = this.mem.events.find((o) => o.type === e.type && o.who === e.who && e.t - o.t < 10000);
    if (dup) return;
    e.fresh = true;
    this.mem.events.push(e);
    if (this.mem.events.length > 40) this.mem.events.shift();
  }

  // ---- avisos del motor
  witnessKill(killer, victim, now) {
    const shown = this.mgr.shownId(killer, now); // si iba transformado, se ve al que imita
    if (shown === this.id) return;
    this.addEvent({ type: 'kill', who: shown, victim: victim.id, room: this.mgr.roomName(killer.x, killer.y), t: now });
    this.setSusp(shown, 1);
    if (chance(0.8)) this.wantButton = now + rnd(600, 2400);
  }

  witnessVent(q, entering, now) {
    const R = this.mgr.room, p = this.p;
    const shown = this.mgr.shownId(q, now);
    if (shown === this.id) return;
    // solo el ingeniero y los impostores usan rejillas: si hay ingeniero en la partida, cabe la duda
    const sure = !!p.engineer || !R.settings.engineer;
    this.addEvent({ type: 'vent', who: shown, room: this.mgr.roomName(q.x, q.y), sure, engineerSelf: !!p.engineer, t: now });
    this.addSusp(shown, sure ? 0.85 : 0.65);
    if (this.susp(shown) < 0.8 && sure) this.setSusp(shown, 0.9);
    if (chance(sure ? 0.7 : 0.4)) this.wantButton = now + rnd(800, 3000);
  }

  witnessAttack(killer, victimId, now) {
    const shown = this.mgr.shownId(killer, now);
    if (shown === this.id) return;
    this.addEvent({ type: 'attack', who: shown, victim: victimId, room: this.mgr.roomName(killer.x, killer.y), t: now });
    this.setSusp(shown, 1);
    if (chance(0.7)) this.wantButton = now + rnd(600, 2200);
  }

  afterKill(victim, now, wit) {
    this.after = { t: now, until: now + 7500, x: victim.x, y: victim.y, wit, doors: false, shift: false, spec: false, vent: false, sab: false, flee: null };
    this.lastKillAt = now;
    this.goal = null;
    this.path = null;
    this.nextThink = 0;
  }

  onGo(now) {
    this.wander = chance(0.5) ? { until: now + rnd(3000, 12000) } : null; // al empezar, muchos se dan una vuelta primero
    this.nextThink = now + rnd(200, 1500);
    this.nextSab = now + rnd(20000, 40000);
  }

  onResume(now) {
    this.roomLog = this.where ? [{ idx: this.where.idx, t: now }] : [];
    this.buddy = null;
    this.avoid = null;
    this.mem.bodies.clear();
    this.mem.seen.clear();
    this.hold = now + rnd(300, 1200);
    this.wander = chance(0.35) ? { until: now + rnd(4000, 12000) } : null;
    this.goal = null;
    this.path = null;
    this.work = null;
    this.vent = null;
    this.after = null;
    this.meet = null;
    this.wantButton = 0;
    this.last = { dx: 0, dy: 0, at: now };
    this.nextThink = 0;
    this.nextSab = now + rnd(15000, 35000);
  }

  onPrivate(msg) {
    const now = Date.now();
    const R = this.mgr.room;
    switch (msg.t) {
      case 'vent':
        if (!msg.in) { this.vent = null; this.goal = null; this.path = null; this.hold = Math.max(this.hold, now + 300); this.nextThink = 0; }
        break;
      case 'interroReveal': {
        const q = [...R.players.values()].find((o) => o.name === msg.name && o.color === msg.color);
        if (!q) break;
        this.det = { id: q.id, impostor: !!msg.impostor, role: msg.role };
        if (msg.impostor) { this.mem.knownImp.add(q.id); this.setSusp(q.id, 1); } else { this.mem.clear.add(q.id); this.mem.susp.set(q.id, 0); }
        break;
      }
      case 'trackAck': this.trk = { name: msg.name, color: msg.color, t: now }; break;
      case 'died':
        this.after = null; this.goal = null; this.work = null; this.vent = null; this.path = null;
        this.last = { dx: 0, dy: 0, at: now };
        this.nextThink = 0;
        break;
      case 'vitals':
        if (msg.on) this.sciUntil = now + rnd(4500, 7500); else this.sciUntil = 0;
        break;
      default: break;
    }
  }

  /* ================= movimiento ================= */

  goTo(tx, ty, now, near) {
    const p = this.p, mgr = this.mgr;
    const d = Math.hypot(tx - p.x, ty - p.y);
    if (d <= near) { this.stop(now); this.stuck.n = 0; return 'arrived'; }
    if (!p.alive) { this.setMove(tx - p.x, ty - p.y, now); return 'moving'; } // los fantasmas atraviesan muros
    const key = Math.round(tx / 12) + ':' + Math.round(ty / 12);
    const sig = mgr.doorSig(now);
    const need = !this.path || sig !== this.doorSigStr || (key !== this.pathKey && now - this.pathAt > 350);
    if (need) {
      if (!this.path && key === this.pathKey && now < this.noPathUntil) return 'blocked';
      const r = findPath(mgr.walk, mgr.closed(now), p.x, p.y, tx, ty, mgr.E.boxHit);
      this.pathKey = key; this.pathAt = now; this.doorSigStr = sig; this.wp = 0;
      if (!r) { this.path = null; this.noPathUntil = now + 1200; return 'blocked'; }
      this.path = r;
      this.resetStuck(now);
    }
    const pts = this.path.pts;
    while (this.wp < pts.length) {
      const w = pts[this.wp];
      if (Math.hypot(w.x - p.x, w.y - p.y) < (this.wp === pts.length - 1 ? 10 : 22)) this.wp++; else break;
    }
    if (this.wp < pts.length) this.setMove(pts[this.wp].x - p.x, pts[this.wp].y - p.y, now);
    else this.setMove(tx - p.x, ty - p.y, now); // último tramo en línea recta hacia el destino
    // atascado: sin avanzar durante ~1 s → se rehace la ruta, y a la tercera se abandona la meta
    if (now - this.stuck.t >= 900) {
      const moved = Math.hypot(p.x - this.stuck.x, p.y - this.stuck.y);
      this.stuck.t = now; this.stuck.x = p.x; this.stuck.y = p.y;
      if (moved < 10) {
        this.stuck.n++;
        this.path = null;
        if (this.stuck.n >= 3) { this.stuck.n = 0; return 'blocked'; }
      } else this.stuck.n = 0;
    }
    return 'moving';
  }

  act(now) {
    const g = this.goal;
    if (!g || g.kind === 'stay') { this.stop(now); return; }
    if (g.follow) { const f = g.follow(); if (f) { g.x = f.x; g.y = f.y; } }
    // de camino a una misión o paseando, a veces se para un momento a mirar (nadie camina siempre sin parar)
    if ((g.kind === 'task' || g.kind === 'roam') && !g.urgent && now >= this.nextPause && chance(0.0015)) {
      this.nextPause = now + rnd(9000, 22000);
      this.startWork('idle', rnd(800, 3500), () => { this.nextThink = 0; this.resetStuck(Date.now()); });
      return;
    }
    const r = this.goTo(g.x, g.y, now, g.near ?? 14);
    if (r === 'arrived') {
      if (!g.arrived || (g.repeat && now - g.lastArr >= g.repeat)) {
        g.arrived = true; g.lastArr = now;
        if (g.arrive) g.arrive(now);
      }
    } else if (r === 'blocked') this.onBlocked(g, now);
  }

  onBlocked(g, now) {
    if (g.taskId != null) this.bad.set(g.taskId, now + (this.mgr.doorSig(now) ? 8000 : 40000));
    this.goal = null;
    this.path = null;
    this.nextThink = 0;
    this.hold = Math.max(this.hold, now + 250);
    if (g.kind === 'ventgo') this.vent = null;
  }

  /* ================= trabajo (minijuegos) ================= */

  startWork(kind, ms, onDone, extra) {
    const now = Date.now();
    this.stop(now);
    this.work = { kind, until: now + ms, onDone, ...(extra || {}) };
  }

  workStep(now) {
    const w = this.work, p = this.p, R = this.mgr.room;
    this.stop(now);
    if (now >= this.nextPerceive) { this.perceive(now); this.nextPerceive = now + 150; }
    let cancel = false;
    if (p.role === 'crew' && p.alive) {
      if (this.visBodies.some((b) => !this.mem.bodies.get(b.id)?.reported)) cancel = true;
      if (this.reactorDuty(now)) cancel = true;
    }
    if ((p.blindUntil || 0) > now) cancel = true; // cegado: ni ve ni puede seguir con su misión
    if (w.kind === 'panel' && !R.dark) cancel = true;
    if (w.kind === 'hold' && !R.reactor) cancel = true;
    if (cancel) { this.work = null; this.goal = null; this.nextThink = 0; return; }
    if (now >= w.until) { this.work = null; w.onDone(now); }
  }

  /* ================= decisión de metas ================= */

  think(now) {
    const p = this.p;
    this.abilities(now);
    let cand = null;
    if (this.vent) {
      cand = this.ventGoal(now);
      if (!cand) this.vent = null;
    }
    if (!cand) cand = !p.alive ? this.decideGhost(now) : p.role === 'impostor' ? this.decideImp(now) : this.decideCrew(now);
    if (this.goal && this.goal.valid && !this.goal.valid(now)) { this.goal = null; this.path = null; }
    if (!cand) { if (!this.goal) this.stop(now); return; }
    if (this.goal && this.goal.key === cand.key) { this.goal.x = cand.x; this.goal.y = cand.y; return; }
    if (!this.goal || cand.urgent || now - this.goalAt > 1400) {
      if (!cand.ventChecked && !this.vent && p.alive) this.maybeVent(cand, now);
      if (this.vent) { const vg = this.ventGoal(now); if (vg) cand = vg; }
      this.goal = cand;
      this.goalAt = now;
      this.path = null;
      this.resetStuck(now);
    }
  }

  /* ----- tripulación ----- */

  decideCrew(now) {
    const R = this.mgr.room;
    if (R.reactor) { const g = this.reactorGoal(now); if (g) return g; }
    const gb = this.bodyGoal(now); if (gb) return gb;
    if (R.dark) { const g = this.panelGoal(now); if (g) return g; } else this.darkAt = 0;
    const g4 = this.buttonGoal(now); if (g4) return g4;
    const g5 = this.roleGoal(now); if (g5) return g5;
    const g6 = this.socialGoal(now); if (g6) return g6;
    return this.taskGoal(now) || this.roamGoal(now);
  }

  /* Con un crimen en el aire ya no se anda solo por ahí: se aleja de un sospechoso si se queda a solas con él
     y a veces acompaña un rato a otro tripulante. Así los impostores lo tienen menos fácil. */
  socialGoal(now) {
    const p = this.p, R = this.mgr.room, M = this.mgr.M;
    if (!p.alive || p.role !== 'crew') return null;
    if (this.mem.dead.size === 0 && this.mem.bodies.size === 0) return null;
    const others = this.vis.filter((o) => o.q.alive);
    if (this.avoid && now < this.avoid.until) {
      return this.mk('avoid', 'avoid', this.avoid.x, this.avoid.y, 70, () => { this.avoid = null; this.goal = null; }, { valid: () => !!this.avoid });
    }
    this.avoid = null;
    if (others.length === 1 && now >= this.nextAvoid) {
      const o = others[0];
      if (this.susp(o.shown) >= 0.5 && !this.mem.clear.has(o.shown) && Math.hypot(o.q.x - p.x, o.q.y - p.y) < 450) {
        const pts = M.tasks.filter((t) => Math.hypot(t.x - o.q.x, t.y - o.q.y) > 700 && Math.hypot(t.x - p.x, t.y - p.y) < 1500);
        this.nextAvoid = now + rnd(15000, 30000);
        if (pts.length) {
          const t = pts[Math.floor(Math.random() * pts.length)];
          this.avoid = { x: t.x, y: t.y, until: now + rnd(9000, 16000) };
          return this.mk('avoid', 'avoid', t.x, t.y, 70, () => { this.avoid = null; this.goal = null; }, { valid: () => !!this.avoid });
        }
      }
    }
    if (this.buddy) {
      const q = R.players.get(this.buddy.id);
      if (!q || !q.alive || now > this.buddy.until || this.susp(this.buddy.id) >= 0.5) this.buddy = null;
      else {
        const seen = this.mem.seen.get(this.buddy.id);
        const live = () => (this.vis.some((o) => o.q === q) ? { x: q.x, y: q.y } : null);
        const pos = live() || (seen ? { x: seen.x, y: seen.y } : null);
        if (pos) return this.mk('buddy', 'buddy:' + this.buddy.id, pos.x, pos.y, 150, () => {}, { follow: live, valid: () => !!this.buddy });
        this.buddy = null;
      }
    }
    if (!others.length && now >= this.nextBuddy) {
      this.nextBuddy = now + rnd(20000, 40000);
      const cands = [...this.mem.seen].filter(([id, s]) => id !== this.id && now - s.t < 25000 && R.players.get(id)?.alive && !this.mem.dead.has(id) && this.susp(id) < 0.45);
      if (cands.length && chance(0.55)) {
        this.buddy = { id: cands[Math.floor(Math.random() * cands.length)][0], until: now + rnd(12000, 28000) };
        return this.socialGoal(now);
      }
    }
    return null;
  }

  decideGhost(now) {
    const p = this.p, R = this.mgr.room;
    if (p.role === 'impostor') {
      this.sabotageLogic(now);
      // el Cegador va a por un tripulante vivo cercano y le ciega (con calma: no lo hace siempre que puede)
      if (p.ghost === 'blinder' && now >= (p.blindReadyAt || 0) && now >= (this.nextBlind || 0)) {
        let best = null, bd = 1e9;
        for (const q of R.players.values()) {
          if (q === p || !q.alive || q.role !== 'crew' || (q.blindUntil || 0) > now) continue;
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < bd) { bd = d; best = q; }
        }
        if (!best || bd > 1400 || !chance(0.5)) { this.nextBlind = now + rnd(4000, 9000); }
        else {
          return this.mk('blind', 'blind:' + best.id, best.x, best.y, 70, () => { this.send({ t: 'blind' }); this.nextBlind = now + rnd(3000, 6000); this.goal = null; },
            { urgent: true, follow: () => (best.alive ? { x: best.x, y: best.y } : null), valid: () => best.alive && now >= 0 });
        }
      }
      return this.mk('stay', 'stay', p.x, p.y, 0);
    }
    // el Guardallaves abre una puerta cerrada por el impostor, tras unos segundos de "no sé qué pasa"
    if (p.ghost === 'keymaster' && now >= (p.keyReadyAt || 0)) {
      const shut = R.closedDoors(now);
      if (!shut.length) this.keySeenAt = 0;
      else {
        if (!this.keySeenAt) this.keySeenAt = now + rnd(1500, 4500);
        if (now >= this.keySeenAt) {
          const room = (shut[0].rooms || [])[0];
          this.keySeenAt = 0;
          if (room !== undefined) this.send({ t: 'unlock', room });
        }
      }
    }
    if (p.ghost === 'angel' && now >= (p.guardReadyAt || 0)) {
      let best = null, bs = 9;
      for (const q of R.players.values()) {
        if (q === p || !q.alive || this.mem.knownImp.has(q.id)) continue;
        const s = this.susp(q.id) + Math.hypot(q.x - p.x, q.y - p.y) / 6000;
        if (s < bs) { bs = s; best = q; }
      }
      if (best) {
        return this.mk('guard', 'guard:' + best.id, best.x, best.y, 70, () => { this.send({ t: 'guard' }); this.goal = null; },
          { urgent: true, follow: () => (best.alive ? { x: best.x, y: best.y } : null), valid: () => best.alive && now >= 0 });
      }
    }
    return this.taskGoal(now) || this.mk('stay', 'stay', p.x, p.y, 0);
  }

  reactorDuty(now) {
    const R = this.mgr.room, p = this.p, rx = R.reactor;
    if (!rx || !p.alive || p.role !== 'crew' || p.inVent) return null;
    if (now - this.dutyCache.t < 250) return this.dutyCache.v;
    const pts = this.mgr.M.rpts;
    const bots = [...R.players.values()].filter((q) => q.bot && q.alive && q.role === 'crew' && !q.inVent);
    const free = ['a', 'b'].filter((s) => !rx[s] || rx[s] === p.id);
    const pairs = [];
    for (const q of bots) for (const s of free) pairs.push({ q, s, d: Math.hypot(q.x - pts[s === 'a' ? 0 : 1].x, q.y - pts[s === 'a' ? 0 : 1].y) });
    pairs.sort((a, b) => a.d - b.d);
    // con poco tiempo, si una consola sigue libre responden dos bots por consola
    const rounds = rx.until - now < 18000 ? 2 : 1;
    const uq = new Set();
    let mine = null;
    for (let r = 0; r < rounds; r++) {
      const us = new Set();
      for (const pr of pairs) {
        if (uq.has(pr.q.id) || us.has(pr.s)) continue;
        uq.add(pr.q.id); us.add(pr.s);
        if (pr.q.id === p.id) mine = pr.s;
      }
    }
    this.dutyCache = { t: now, v: mine };
    return mine;
  }

  reactorGoal(now) {
    const R = this.mgr.room, p = this.p, rx = R.reactor;
    const side = this.reactorDuty(now);
    if (!side) return null;
    if (rx[side] === p.id) return this.mk('stay', 'stay', p.x, p.y, 0, null, { urgent: true });
    const pt = this.mgr.M.rpts[side === 'a' ? 0 : 1];
    return this.mk('hold', 'hold:' + side, pt.x, pt.y, 60, () => {
      if (R.reactor && R.reactor[side] !== p.id) this.send({ t: 'hold', side });
    }, { urgent: true, repeat: 700, valid: () => !!R.reactor });
  }

  panelGoal(now) {
    const R = this.mgr.room, p = this.p, pn = this.mgr.M.panel;
    const crew = [...R.players.values()].filter((q) => q.bot && q.alive && q.role === 'crew' && !q.inVent)
      .sort((a, b) => Math.hypot(a.x - pn.x, a.y - pn.y) - Math.hypot(b.x - pn.x, b.y - pn.y));
    if (!crew.slice(0, 2).some((q) => q.id === p.id)) return null;
    // no se reacciona al instante: primero se nota el apagón, se duda y se echa a andar hacia el cuadro
    if (!this.darkAt) { this.darkAt = now; this.darkDelay = rnd(4000, 13000); }
    if (now - this.darkAt < this.darkDelay && !(this.goal && this.goal.kind === 'panel')) return null;
    return this.mk('panel', 'panel', pn.x, pn.y, 50, () => {
      this.startWork('panel', rnd(4500, 8000), () => { this.send({ t: 'fix' }); this.goal = null; });
    }, { urgent: true, valid: () => R.dark });
  }

  bodyGoal(now) {
    const R = this.mgr.room, p = this.p;
    let best = null, bd = Infinity;
    for (const b of R.bodies) {
      const m = this.mem.bodies.get(b.id);
      if (!m || m.reported) continue;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) return null;
    return this.mk('report', 'report:' + best.id, best.x, best.y, this.mgr.E.REPORT_RANGE - 40, () => {
      const m = this.mem.bodies.get(best.id);
      this.lastReport = m || null;
      this.send({ t: 'report' });
    }, { urgent: true, repeat: 900, valid: () => R.bodies.some((b) => b.id === best.id) });
  }

  buttonGoal(now) {
    const R = this.mgr.room, p = this.p;
    if (!this.wantButton || now < this.wantButton) return null;
    if (p.meetUsed || now < (p.btnReadyAt || 0) || R.sabotageActive() || !this.mem.events.some((e) => e.fresh)) { if (p.meetUsed) this.wantButton = 0; return null; }
    const b = this.mgr.M.button;
    return this.mk('button', 'button', b.x, b.y, this.mgr.E.REPORT_RANGE - 40, () => { this.send({ t: 'button' }); this.wantButton = 0; this.goal = null; },
      { urgent: true, valid: () => !p.meetUsed });
  }

  roleGoal(now) {
    const R = this.mgr.room, p = this.p;
    // el detective interroga a alguien cuando ya ha terminado sus misiones
    if (p.detective && !p.detectiveUsed && p.done.length >= p.tasks.length) {
      let best = null, bs = -1;
      for (const [id, s] of this.mem.seen) {
        const q = R.players.get(id);
        if (!q || !q.alive || now - s.t > 25000 || this.mem.clear.has(id)) continue;
        const sc = this.susp(id) * 2 - Math.hypot(s.x - p.x, s.y - p.y) / 2500;
        if (sc > bs) { bs = sc; best = q; }
      }
      if (best) {
        const vis = () => { const v = this.vis.find((o) => o.q === best); return v ? { x: best.x, y: best.y } : null; };
        const s0 = this.mem.seen.get(best.id);
        return this.mk('det', 'det:' + best.id, s0.x, s0.y, this.mgr.E.INTERROG_RANGE - 30, () => this.send({ t: 'interrogate' }),
          { follow: vis, repeat: 1200, valid: () => !p.detectiveUsed });
      }
    }
    return null;
  }

  // habilidades que no llevan a ningún sitio: se usan sobre la marcha
  abilities(now) {
    const p = this.p, R = this.mgr.room, E = this.mgr.E;
    if (!p.alive) return;
    if (p.tracker && !p.trackerTarget && now >= (p.trackerReadyAt || 0)) {
      let best = null, bs = -1;
      for (const v of this.vis) {
        if (Math.hypot(v.q.x - p.x, v.q.y - p.y) > E.TRACK_RANGE - 15) continue;
        const sc = this.susp(v.shown) + Math.random() * 0.05;
        if (sc > bs) { bs = sc; best = v; }
      }
      if (best) this.send({ t: 'track' });
    }
    if (p.scientist) {
      if (p.sciOn) {
        if (now >= this.sciUntil) this.send({ t: 'vitalsOff' });
        else this.learnVitals();
      } else if (now >= (p.sciReadyAt || 0) && (p.sciLeft ?? 0) > 8000 && !this.work && chance(0.015)) {
        this.sciUntil = now + rnd(4500, 7500);
        this.send({ t: 'vitals' });
      }
    }
    void R;
  }

  // el panel del científico dice quién sigue vivo: un muerto sin cuerpo reportado es un crimen sin descubrir
  learnVitals() {
    const R = this.mgr.room;
    for (const q of R.players.values()) {
      if (q.alive || this.mem.dead.has(q.id) || q.id === this.id) continue;
      if (R.bodies.some((b) => b.id === q.id)) continue; // ese cuerpo existe: ya lo encontrará alguien
      this.mem.dead.add(q.id);
      this.silent = { id: q.id };
    }
  }

  taskGoal(now) {
    const p = this.p, M = this.mgr.M;
    if (this.goal && this.goal.kind === 'task' && this.goal.valid(now)) return this.goal;
    if (this.wander && now < this.wander.until) return null; // todavía dando vueltas
    this.wander = null;
    const rem = p.tasks.filter((id) => !p.done.includes(id) && !(this.bad.get(id) > now));
    if (!rem.length) return null;
    let best = null, bs = Infinity;
    for (const id of rem) {
      if (!this.noise.has(id)) this.noise.set(id, 0.8 + Math.random() * 0.45);
      const t = M.tasks[id];
      const s = Math.hypot(t.x - p.x, t.y - p.y) * this.noise.get(id);
      if (s < bs) { bs = s; best = id; }
    }
    const t = M.tasks[best];
    return this.mk('task', 'task:' + best, t.x, t.y, 55, () => this.startTask(best), { taskId: best, valid: () => !p.done.includes(best) });
  }

  startTask(id) {
    const p = this.p, M = this.mgr.M, now = Date.now();
    const t = M.tasks[id];
    if (Math.hypot(t.x - p.x, t.y - p.y) > this.mgr.E.USE_RANGE + 5) { this.bad.set(id, now + 30000); this.goal = null; return; }
    const ms = (GAME_MS[t.game] || 4500) * rnd(2.4, 4.2); // un minijuego de verdad lleva su rato
    // al llegar mira alrededor un momento antes de ponerse; al terminar, a veces se da una vuelta antes de la siguiente
    this.startWork('look', rnd(500, 2500), () => {
      this.startWork('task', ms, () => {
        this.send({ t: 'task', id }); // el impostor también "hace" la suya: así parece uno más
        this.goal = null;
        this.nextThink = 0;
        if (chance(1 - this.diligence)) this.wander = { until: Date.now() + rnd(8000, 25000) };
      });
    });
  }

  roamGoal(now) {
    if (this.goal && this.goal.kind === 'roam' && this.goal.valid(now)) return this.goal;
    const p = this.p, M = this.mgr.M, R = this.mgr.room;
    const pts = M.tasks.map((t) => ({ x: t.x, y: t.y }));
    pts.push({ x: M.button.x, y: M.button.y });
    let q = null;
    // a veces va a donde vio gente por última vez (como quien busca compañía); si no, a un punto cualquiera del mapa
    if (chance(0.3)) {
      const seen = [...this.mem.seen].filter(([id, s]) => id !== this.id && R.players.get(id)?.alive && Math.hypot(s.x - p.x, s.y - p.y) > 250);
      if (seen.length) { const [, s] = seen[Math.floor(Math.random() * seen.length)]; q = { x: s.x, y: s.y }; }
    }
    if (!q) {
      const far = pts.filter((o) => Math.hypot(o.x - p.x, o.y - p.y) > 250);
      q = far.length ? far[Math.floor(Math.random() * far.length)] : pts[0];
    }
    const key = 'roam:' + Math.round(q.x) + ':' + Math.round(q.y);
    const idle = p.role === 'impostor' && p.alive && now >= p.killReadyAt ? [700, 2000] : [1500, 7000];
    return this.mk('roam', key, q.x, q.y, 60, () => this.startWork('idle', rnd(idle[0], idle[1]), () => { this.goal = null; this.nextThink = 0; }), { valid: () => true });
  }

  /* ----- impostor ----- */

  decideImp(now) {
    const p = this.p, R = this.mgr.room;
    this.sabotageLogic(now);
    if (R.frozen(p, now)) return null;
    this.spectreLogic(now);
    if (this.after && now < this.after.until) { const g = this.escapeGoal(now); if (g) return g; } else this.after = null;
    const gb = this.impBodyGoal(now); if (gb) return gb;
    const gh = this.huntGoal(now); if (gh) return gh;
    return this.taskGoal(now) || this.roamGoal(now);
  }

  // tripulantes vivos (bots o personas) que hay cerca de un punto, vean o no: pueden llegar enseguida
  crewNear(pos, ignore, r) {
    let n = 0;
    for (const q of this.mgr.room.players.values()) {
      if (!q.alive || q.role === 'impostor' || q.inVent || (ignore && ignore.includes(q.id))) continue;
      if (Math.hypot(q.x - pos.x, q.y - pos.y) < r) n++;
    }
    return n;
  }

  huntGoal(now) {
    const mgr = this.mgr, R = mgr.room, p = this.p, E = mgr.E;
    const ready = now >= p.killReadyAt;
    if (now < p.killReadyAt - 3500) { this.strikeAt = 0; return null; }
    const cands = [];
    for (const q of R.players.values()) {
      if (!q.alive || q.role === 'impostor' || q.inVent) continue;
      let pos = null;
      if (this.vis.some((o) => o.q === q)) pos = { x: q.x, y: q.y };
      else { const s = this.mem.seen.get(q.id); if (s && now - s.t < 4000) pos = { x: s.x, y: s.y }; }
      if (!pos) continue;
      const wit = mgr.exposed(pos, [q.id, p.id], now).length;
      const near = this.crewNear(pos, [q.id, p.id], 380);
      const d = Math.hypot(pos.x - p.x, pos.y - p.y);
      // el mejor blanco es el que está solo: testigos y gente cerca pesan mucho más que unos pasos de distancia
      cands.push({ q, pos, d, wit, near, sc: wit * 900 + near * 160 + d - (this.hostile.has(q.id) ? 140 : 0) });
    }
    if (!cands.length) {
      this.strikeAt = 0;
      return ready ? this.roamGoal(now) : null; // nadie a la vista: se va a buscar donde suele haber gente
    }
    cands.sort((a, b) => a.sc - b.sc);
    const c = cands[0];
    const invis = (p.invisUntil || 0) > now;
    const crewLeft = [...R.players.values()].filter((q) => q.alive && q.role !== 'impostor').length;
    const impsLeft = [...R.players.values()].filter((q) => q.alive && q.role === 'impostor').length;
    const winning = crewLeft <= impsLeft * 2; // este golpe casi decide la partida: merece el riesgo
    if (ready && c.wit > 0 && c.near > 0 && !R.dark && !R.reactor && now >= R.sabLockAt && c.wit <= 3 && now - (this.lightsAt || 0) > 40000 && this.ensureSabPlan(now).kind !== 'reactor' && chance(0.012)) {
      // hay gente mirando: apaga las luces para quedarse a solas con alguien
      this.lightsAt = now;
      this.sendSab('sabotage', now);
    }
    if (ready && !invis && c.d <= E.KILL_RANGE - 12 && c.wit === 0
      && mgr.exposed({ x: p.x, y: p.y }, [c.q.id, p.id], now).length === 0
      && (c.near <= 1 || winning || R.dark)) {
      // nadie puede ver ni al asesino ni a la víctima, y no hay medio equipo a dos pasos: ataca, tras dudar un instante
      if (!this.strikeAt) this.strikeAt = now + rnd(300, 1500);
      if (now >= this.strikeAt) { this.strikeAt = 0; this.send({ t: 'kill' }); return null; }
    } else this.strikeAt = 0;
    if (!ready && now < p.killReadyAt - 800) return null; // todavía no: sigue a lo suyo
    if (c.wit > 0 || (c.near > 1 && !winning && !R.dark)) {
      // con gente alrededor no se acerca a matar: acompaña de lejos a un tripulante hasta que se quede solo (y no para siempre)
      if (!ready) return null;
      if (!this.lurk) this.lurk = { since: now, until: 0 };
      if (this.lurk.until && now < this.lurk.until) return null;
      if (this.lurk.until) this.lurk = { since: now, until: 0 };
      if (now - this.lurk.since > 25000) { this.lurk.until = now + 20000; return null; }
      return this.mk('shadow', 'shadow:' + c.q.id, c.pos.x, c.pos.y, 280, () => {}, {
        follow: () => { const o = this.vis.find((v) => v.q === c.q); return o ? { x: c.q.x, y: c.q.y } : null; },
        valid: () => c.q.alive && !c.q.inVent,
      });
    }
    this.hunting = now;
    return this.mk('hunt', 'hunt:' + c.q.id, c.pos.x, c.pos.y, E.KILL_RANGE - 28, () => {}, {
      follow: () => { const o = this.vis.find((v) => v.q === c.q); return o ? { x: c.q.x, y: c.q.y } : null; },
      valid: () => c.q.alive && !c.q.inVent,
    });
  }

  escapeGoal(now) {
    const mgr = this.mgr, R = mgr.room, p = this.p, a = this.after;
    if (!a.doors) this.doorsOnBody(a, now);
    const seen = mgr.exposed({ x: p.x, y: p.y }, [], now).length > 0;
    if (!a.shift && p.shifter) {
      a.shift = true;
      if (!seen && now >= (p.shiftReadyAt || 0) && !p.shiftTo) this.tryShift(now);
    }
    if (!a.spec && p.spectre) {
      a.spec = true;
      if (now >= (p.invisReadyAt || 0) && (seen || a.wit > 0 || chance(0.5))) this.send({ t: 'invis' });
    }
    if (!a.sab && now - a.t > 600) {
      a.sab = true;
      this.sabAfterKill(a, seen, now);
    }
    if (!a.vent) {
      a.vent = true;
      if (!seen && chance(0.65)) this.planVentEscape(a, now);
    }
    if (this.vent) return null; // en marcha: lo lleva ventGoal
    if (!a.flee) {
      const M = mgr.M;
      const far = M.tasks.filter((t) => Math.hypot(t.x - a.x, t.y - a.y) > 650);
      const t = far.length ? far[Math.floor(Math.random() * far.length)] : M.tasks[Math.floor(Math.random() * M.tasks.length)];
      a.flee = { x: t.x, y: t.y };
    }
    return this.mk('flee', 'flee', a.flee.x, a.flee.y, 70, () => { this.after = null; this.goal = null; }, { urgent: true, valid: () => !!this.after });
    void R;
  }

  /* Un sabotaje justo tras matar: si alguien lo vio, bloquea el botón de emergencia (con un sabotaje en marcha no se puede
     convocar reunión) y los obliga a repararlo; si nadie lo vio, desvía a la tripulación para que tarden en hallar el cuerpo. */
  sabAfterKill(a, seen, now) {
    const R = this.mgr.room, p = this.p;
    if (R.dark || R.reactor || R.frozen(p, now)) return;
    const crew = [...R.players.values()].filter((q) => q.alive && q.role !== 'impostor').length;
    const canR = now >= R.rtLockAt && crew >= 3, canL = now >= R.sabLockAt;
    const plan = this.ensureSabPlan(now).kind;
    // si el equipo esperaba el reactor y casi está listo, no se gasta el apagón ahora
    const waitReactor = plan === 'reactor' && !canR && crew >= 3;
    if (a.wit > 0 || seen) {
      if (chance(0.75)) {
        if (canR && (!canL || chance(0.6))) this.sendSab('reactor', now);
        else if (canL && !waitReactor) this.sendSab('sabotage', now);
      }
      return;
    }
    if (canR && crew >= 4 && chance(0.35)) this.sendSab('reactor', now);
    else if (canL && !waitReactor && chance(0.25)) this.sendSab('sabotage', now);
  }

  // al salir de la sala del cuerpo, a veces cierra sus puertas desde el mapa para retrasar que lo encuentren
  doorsOnBody(a, now) {
    const mgr = this.mgr, R = mgr.room, p = this.p;
    if (a.doorsRoll === undefined) a.doorsRoll = chance(0.55);
    if (!a.doorsRoll || R.sabotageActive()) { a.doors = true; return; }
    const room = mgr.roomIdx(a.x, a.y);
    if (room < 0 || !mgr.M.byRoom.get(room)) { a.doors = true; return; }
    if (now - a.t < 1000 || mgr.roomIdx(p.x, p.y) === room) return; // dentro de la sala no: se encerraría con el cuerpo
    a.doors = true;
    this.send({ t: 'doors', room });
  }

  tryShift(now) {
    const R = this.mgr.room, p = this.p;
    const opts = [...R.players.values()].filter((q) => q.alive && q.id !== p.id && q.role !== 'impostor');
    if (!opts.length) return;
    // se hace pasar por alguien que esté lejos de aquí: si hay testigos, culparán a otro
    opts.sort((x, y) => Math.hypot(y.x - p.x, y.y - p.y) - Math.hypot(x.x - p.x, x.y - p.y));
    const q = opts[Math.floor(Math.random() * Math.min(3, opts.length))];
    this.send({ t: 'shift', id: q.id });
  }

  spectreLogic(now) {
    const p = this.p;
    if (!p.spectre || (p.invisUntil || 0) > now || now < (p.invisReadyAt || 0)) return;
    // al acercarse a una víctima lejana se vuelve invisible para llegar sin ser visto
    if (now - this.hunting < 600 && this.goal && this.goal.kind === 'hunt') {
      const d = Math.hypot(this.goal.x - p.x, this.goal.y - p.y);
      if (d > 260 && now >= p.killReadyAt - 1500) this.send({ t: 'invis' });
    }
  }

  impBodyGoal(now) {
    const p = this.p, R = this.mgr.room;
    if (!this.visBodies.length) return null;
    const b = this.visBodies[0];
    const m = this.mem.bodies.get(b.id);
    if (!m || m.reported) return null;
    // si alguien lo está viendo con él, a veces "lo descubre" para no parecer culpable
    if (this.mgr.exposed({ x: p.x, y: p.y }, [], now).length && chance(0.012)) {
      return this.mk('report', 'report:' + b.id, b.x, b.y, this.mgr.E.REPORT_RANGE - 40, () => { this.lastReport = m; this.send({ t: 'report' }); },
        { urgent: true, repeat: 900, valid: () => R.bodies.some((o) => o.id === b.id) });
    }
    return null;
  }

  /* ¿Qué sabotaje toca? El apagón se recarga antes que el reactor (40 s frente a 60 s) y, sin planearlo, el bot
     usaba siempre el apagón en cuanto podía: el reactor no salía nunca. Ahora el equipo impostor decide de
     antemano cuál toca; si es el reactor y está a punto de recargarse, se espera a que esté listo. */
  ensureSabPlan(now) {
    const R = this.mgr.room, M = this.mgr.M, mgr = this.mgr;
    const crew = [...R.players.values()].filter((q) => q.alive && q.role === 'crew').length;
    if (!mgr.sabPlan || now - mgr.sabPlan.at > 150000) {
      mgr.sabPlan = { kind: crew >= 3 && M && M.rpts && M.rpts.length >= 2 && chance(0.6) ? 'reactor' : 'lights', at: now };
    }
    return mgr.sabPlan;
  }

  sabChoice(now) {
    const R = this.mgr.room, mgr = this.mgr;
    const crew = [...R.players.values()].filter((q) => q.alive && q.role === 'crew').length;
    this.ensureSabPlan(now);
    if (mgr.sabPlan.kind === 'reactor') {
      if (crew < 3) mgr.sabPlan = { kind: 'lights', at: now };
      else if (now >= R.rtLockAt) return 'reactor';
      else return null; // se espera a que el reactor se recargue (arreglar un apagón lo reinicia: no se gasta)
    }
    return now >= R.sabLockAt ? 'sabotage' : null;
  }

  sendSab(kind, now) {
    this.mgr.sabPlan = null; // tras cada sabotaje se vuelve a elegir
    this.send({ t: kind });
    this.nextSab = now + (kind === 'reactor' ? 30000 : 25000);
  }

  sabotageLogic(now) {
    const p = this.p, R = this.mgr.room;
    if (now < this.nextSab || R.dark || R.reactor || R.frozen(p, now)) return;
    this.nextSab = now + rnd(5000, 10000);
    const crew = [...R.players.values()].filter((q) => q.alive && q.role === 'crew').length;
    const killSoon = p.alive && p.killReadyAt - now < 9000;
    const kind = this.sabChoice(now);
    if (!kind) return;
    if (kind === 'sabotage') {
      if (chance(0.4) && (killSoon || !p.alive)) this.sendSab('sabotage', now);
      else if (chance(0.06)) this.sendSab('sabotage', now); // y de vez en cuando, porque sí: despista
      return;
    }
    // el reactor junta y reparte a la tripulación: si el golpe no está cerca, sirve para dispersarla y dejar a alguien solo
    if (crew >= 3 && chance(killSoon ? 0.3 : 0.55)) this.sendSab('reactor', now);
  }

  /* ----- rejillas ----- */

  canVent() { const p = this.p; return p.role === 'impostor' || !!p.engineer; }

  maybeVent(cand, now) {
    cand.ventChecked = true;
    const p = this.p, M = this.mgr.M;
    if (!this.canVent() || cand.kind === 'ventgo' || cand.kind === 'report' || cand.kind === 'hold' || cand.kind === 'panel' || cand.kind === 'guard') return;
    if ((p.invisUntil || 0) > now || now < (p.ventReadyAt || 0) || !chance(p.engineer ? 0.3 : 0.45)) return;
    this.planVentTrip(cand, now);
    void M;
  }

  planVentTrip(cand, now) {
    const p = this.p, M = this.mgr.M;
    let v1 = null, d1 = 330;
    for (const v of M.vents) { const d = Math.hypot(v.x - p.x, v.y - p.y); if (d < d1) { d1 = d; v1 = v; } }
    if (!v1) return;
    let v2 = null, d2 = Infinity;
    for (const v of M.vents) { if (v.net !== v1.net || v.id === v1.id) continue; const d = Math.hypot(v.x - cand.x, v.y - cand.y); if (d < d2) { d2 = d; v2 = v; } }
    if (!v2) return;
    const direct = Math.hypot(cand.x - p.x, cand.y - p.y) * 1.3;
    if (direct - (d1 * 1.3 + d2 * 1.3) < 700) return;
    this.vent = { stage: 'go', v1, v2, t0: now, since: now, tries: 0, lastTry: 0 };
  }

  planVentEscape(a, now) {
    const p = this.p, M = this.mgr.M;
    let v1 = null, d1 = 170;
    for (const v of M.vents) { const d = Math.hypot(v.x - p.x, v.y - p.y); if (d < d1) { d1 = d; v1 = v; } }
    if (!v1) return;
    const opts = M.vents.filter((v) => v.net === v1.net && v.id !== v1.id && Math.hypot(v.x - a.x, v.y - a.y) > 500);
    if (!opts.length) return;
    this.vent = { stage: 'go', v1, v2: opts[Math.floor(Math.random() * opts.length)], t0: now, since: now, tries: 0, lastTry: 0 };
  }

  ventGoal(now) {
    const v = this.vent, p = this.p;
    if (!v || now - v.t0 > 25000 || !this.canVent()) return null;
    if (v.stage === 'go') {
      return this.mk('ventgo', 'ventgo:' + v.v1.id, v.v1.x, v.v1.y, 38, () => { v.stage = 'enter'; v.since = Date.now(); }, { urgent: true, valid: () => !!this.vent });
    }
    if (v.stage === 'enter') {
      if (now - v.since > 7000 || v.tries > 3) return null;
      const seenBy = this.mgr.exposed({ x: p.x, y: p.y }, [], now).length;
      if (!seenBy && (p.invisUntil || 0) <= now && now - v.lastTry > 700) { v.tries++; v.lastTry = now; this.send({ t: 'vent' }); }
      return this.mk('stay', 'ventwait', p.x, p.y, 0, null, { urgent: true, valid: () => !!this.vent });
    }
    return null;
  }

  ventStep(now) {
    const v = this.vent, p = this.p;
    this.last = { dx: 0, dy: 0, at: now };
    if (!v) { if (now - (this.ventSince || (this.ventSince = now)) > 700) { this.ventSince = 0; this.send({ t: 'ventOut' }); } return; }
    switch (v.stage) {
      case 'go': case 'enter': v.stage = 'in'; v.at = now + rnd(500, 1100); break;
      case 'in':
        if (now >= v.at) {
          if (v.v2 && p.ventId !== v.v2.id) this.send({ t: 'ventTo', id: v.v2.id });
          v.stage = 'hop'; v.at = now + rnd(500, 1000);
        }
        break;
      case 'hop': if (now >= v.at) { v.stage = 'out'; v.since = now; } break;
      case 'out': {
        const seenBy = this.mgr.exposed({ x: p.x, y: p.y }, [], now).length;
        if (!seenBy || now - v.since > (p.engineer ? 8000 : 15000)) this.send({ t: 'ventOut' });
        break;
      }
      default: break;
    }
  }

  /* ================= reunión ================= */

  onMeeting(msg, now) {
    const p = this.p;
    this.work = null; this.goal = null; this.path = null; this.vent = null; this.after = null;
    this.last = { dx: 0, dy: 0, at: now };
    this.wantButton = 0;
    if (!p || !p.alive) { this.meet = null; return; }
    this.meetNo++;
    const m = {
      t0: now, reason: msg.reason, bodyName: msg.bodyName, caller: msg.caller,
      discussUntil: now + (msg.discussMs || 0), voteUntil: msg.endsAt || now + (msg.ms || 40000),
      nextSpeak: 0, spoken: 0, queue: [], voteAt: 0, voted: false, reacts: 0, quiet: false, max: 0,
      players: msg.players || [], bodyRoom: null,
    };
    // quien tiene pruebas o ha convocado habla antes y más; el resto espera, escucha y suele hablar poco
    const hard = this.mem.events.some((e) => e.type !== 'double') || !!(this.det && this.det.impostor);
    const caller = msg.caller === p.id;
    m.nextSpeak = now + (hard ? rnd(2500, 5500) : caller ? rnd(2500, 4500) : rnd(5000, 11000));
    m.max = hard ? 4 : Math.round(rnd(1, 2.6) * this.talk);
    if (!hard && !caller && p.role !== 'impostor' && chance(0.25)) m.max = 0;
    if (p.role === 'impostor') m.max = Math.max(1, m.max);
    if (msg.caller === p.id && msg.reason === 'body') m.bodyRoom = this.lastReport ? this.lastReport.room : (this.where && this.where.name);
    this.meet = m;
    this.mem.said = new Set();
    this.mem.acc = new Map();
    for (const q of m.players) if (!q.alive && !this.mem.dead.has(q.id)) this.forget(q.id);
    this.bodyRoomIdx = null;
    for (const b of this.mem.bodies.values()) { b.reported = true; if (b.ridx >= 0) this.bodyRoomIdx = b.ridx; }
    this.silentUnsaid = this.silent;
  }

  // un jugador expulsado o muerto ya no es noticia: nadie lo acusa, lo defiende ni lo cita en reuniones futuras
  forget(id) {
    this.mem.dead.add(id);
    this.mem.events = this.mem.events.filter((e) => e.who !== id); // lo que hizo quien ya no está deja de ser noticia
    this.mem.susp.delete(id);
    this.mem.acc.delete(id);
    this.hostile.delete(id);
    if (this.det && this.det.id === id) this.det = null;
    if (this.silent && this.silent.id === id) this.silent = null;
    if (this.frame === id) this.frame = null;
  }

  onResult(msg, now) {
    const m = this.meet;
    this.meet = null;
    const ej = msg.ejected;
    if (ej) {
      this.forget(ej.id);
      if (ej.wasImpostor) this.mem.knownImp.add(ej.id);
      for (const v of msg.votes || []) {
        if (v.from === this.id) continue;
        if (v.to === ej.id) this.addSusp(v.from, ej.wasImpostor ? -0.08 : 0.08);
      }
    }
    for (const e of this.mem.events) e.fresh = false;
    void m; void now;
  }

  meetStep(now) {
    const p = this.p, m = this.meet, R = this.mgr.room;
    if (!m || !p.alive) return;
    const head = m.queue[0];
    if (head) {
      if (now >= head.at) {
        const r = R.botSay(p, head.texts, head.struct);
        if (r === true) { m.queue.shift(); m.spoken++; m.nextSpeak = Math.max(m.nextSpeak, now + rnd(4000, 9000)); }
        else if (r === 'dup' || (head.tries = (head.tries || 0) + 1) > 8) m.queue.shift(); // repetida o imposible de colar: se descarta
        else head.at = now + rnd(600, 1800); // la sala pide un respiro entre mensajes de bots
      }
    } else if (!m.quiet && now >= m.nextSpeak) {
      const s = this.nextStatement(now);
      if (!s) m.nextSpeak = now + rnd(5000, 9000);
      else if (m.spoken >= m.max && !s.prio) m.quiet = true; // ya ha dicho lo suyo
      else { m.queue.push({ ...s, at: now }); m.nextSpeak = now + rnd(5000, 11000); }
    }
    if (!m.voted) {
      // la votación se abre para todos a la vez, pero cada bot se toma su tiempo: lee el chat, duda, y no vota el primero
      if (!m.voteAt && now >= m.discussUntil) m.voteAt = now + Math.min(rnd(5000, 24000), Math.max(500, m.voteUntil - now - 3000));
      if (m.voteAt && now >= m.voteAt) {
        if (m.queue.length && now < m.voteUntil - 4000) m.voteAt = now + 1500; // antes termina lo que iba a decir
        else this.castVote(now);
      }
    }
  }

  // una réplica: tarda en "leer y escribir" (delay en ms) y no se amontonan más de tres
  queueSay(s, delay) {
    const m = this.meet;
    if (!m || !s || m.queue.length > 2) return;
    const last = m.queue.length ? m.queue[m.queue.length - 1].at : 0;
    const len = (s.texts && s.texts.es ? s.texts.es.length : 40);
    m.queue.push({ ...s, at: Math.max(Date.now() + delay + len * 35, last + rnd(2200, 4000)) });
  }

  pairOf(kind, params, struct) {
    let texts = this.mgr.say(kind, params);
    if (texts) { this.hist.set(kind, this.meetNo); texts = { es: stylize(texts.es, this.style), en: stylize(texts.en, this.style) }; }
    return texts ? { texts, struct: struct || null, prio: PRIO.has(kind) } : null;
  }

  S(k) { if (this.mem.said.has(k)) return false; this.mem.said.add(k); return true; }

  // ¿he pasado por esa sala en esta ronda? (la actual cuenta)
  wasIn(ridx) {
    if (this.where && this.where.idx === ridx) return true;
    return this.roomLog.some((e) => e.idx === ridx);
  }

  roomObj(ridx) {
    const fl = this.mgr.M.floors[ridx];
    if (!fl) return this.myRoom();
    return { ...this.mgr.roomName(fl[0] + fl[2] / 2, fl[1] + fl[3] / 2), idx: ridx };
  }

  // ¿hace al menos `gap` reuniones que no digo una frase de este tipo? (para no repetirse de una reunión a otra)
  fresh(kind, gap = 2) { return this.meetNo - (this.hist.get(kind) ?? -99) >= gap; }

  // una prueba ya contada se repite solo de vez en cuando
  again(e) { if (!e.told) { e.told = 1; return true; } e.told++; return chance(0.25); }

  // quién he visto hace poco y dónde (para la coartada)
  recentSeen(now) {
    const out = [];
    for (const [id, s] of this.mem.seen) {
      const q = this.mgr.room.players.get(id);
      if (!q || id === this.id || now - s.t > 70000) continue;
      out.push({ id, name: q.name, t: s.t, room: { ...this.mgr.roomName(s.x, s.y), idx: s.room } });
    }
    return out.sort((a, b) => b.t - a.t);
  }

  myRoom() { return this.where ? this.where.name : { es: 'el invernadero', en: 'the greenhouse' }; }

  fakeRoom() {
    const p = this.p, M = this.mgr.M;
    const ids = p.tasks.length ? p.tasks : M.tasks.map((t) => t.id);
    const t = M.tasks[ids[Math.floor(Math.random() * ids.length)]];
    const idx = this.mgr.roomIdx(t.x, t.y);
    return { ...this.mgr.roomName(t.x, t.y), idx };
  }

  nextStatement(now) {
    const p = this.p, m = this.meet, mem = this.mem;
    if (p.role === 'impostor') return this.nextImpStatement(now);
    const live = (e) => !mem.dead.has(e.who);
    const kill = mem.events.find((e) => e.type === 'kill' && live(e));
    if (kill && (kill.told ? chance(0.25) : true)) {
      if (this.S('wk')) { kill.told = (kill.told || 0) + 1; return this.pairOf('witnessKill', { x: this.nameOf(kill.who), v: this.nameOf(kill.victim), room: kill.room }, { kind: 'witness', target: kill.who }); }
      if (chance(0.5) && this.fresh('witnessKill2', 1) && this.S('wk2')) return this.pairOf('witnessKill2', { x: this.nameOf(kill.who) }, { kind: 'witness', target: kill.who });
    }
    const att = mem.events.find((e) => e.type === 'attack' && live(e));
    if (att && this.S('att') && this.again(att)) return this.pairOf('witnessAttack', { x: this.nameOf(att.who), v: this.nameOf(att.victim), room: att.room }, { kind: 'witness', target: att.who });
    const vent = mem.events.find((e) => e.type === 'vent' && live(e));
    if (vent && this.S('vent') && this.again(vent)) return this.pairOf(vent.engineerSelf ? 'witnessVentSure' : 'witnessVent', { x: this.nameOf(vent.who), room: vent.room }, { kind: 'witness', target: vent.who, soft: !vent.sure });
    const dbl = mem.events.find((e) => e.type === 'double' && live(e));
    if (dbl && this.S('dbl') && this.again(dbl)) return this.pairOf('doubleSeen', { x: this.nameOf(dbl.who), room: dbl.room }, { kind: 'suspect', target: dbl.who });
    if (this.det && !mem.dead.has(this.det.id) && this.S('det') && this.again(this.det)) {
      return this.pairOf(this.det.impostor ? 'detImp' : 'detClean', { x: this.nameOf(this.det.id) }, this.det.impostor ? { kind: 'witness', target: this.det.id } : { kind: 'clear', target: this.det.id });
    }
    if (this.silent && !mem.dead.has(this.silent.id) && this.S('sil') && this.again(this.silent)) return this.pairOf('sciInfo', { x: this.nameOf(this.silent.id) }, null);
    const tt = this.trkTarget();
    if (this.trk && tt && !mem.dead.has(tt) && this.S('trk') && mem.seen.get(tt) && this.fresh('trackInfo', 2)) {
      const s = mem.seen.get(tt);
      return this.pairOf('trackInfo', { x: this.nameOf(tt), room: this.mgr.roomName(s.x, s.y) }, null);
    }
    if (m.reason === 'body' && m.caller === p.id && this.S('found')) return this.pairOf('bodyFound', { v: m.bodyName || '?', room: m.bodyRoom || this.myRoom() }, { kind: 'body', ridx: this.bodyRoomIdx });
    if (m.reason === 'button' && m.caller === p.id && this.S('btn')) return this.pairOf('buttonNone', {}, null);
    if (this.fresh('alibiSeen1', 2) && this.fresh('alibiSeen2', 2) && this.S('alibi')) {
      const rs = this.recentSeen(now).filter((x) => !mem.dead.has(x.id));
      if (!rs.length || chance(0.4)) return null; // una coartada genérica no aporta: solo si se vio a alguien
      if (rs.length >= 2) return this.pairOf('alibiSeen2', { room: rs[0].room, a: rs[0].name, b: rs[1].name }, { kind: 'alibi', ridx: rs[0].room.idx, seen: [rs[0].id, rs[1].id] });
      return this.pairOf('alibiSeen1', { room: rs[0].room, a: rs[0].name }, { kind: 'alibi', ridx: rs[0].room.idx, seen: [rs[0].id] });
    }
    const top = this.topSuspect(false);
    if (top && top.s >= 0.3 && this.fresh('suspect', 2) && this.fresh('nearBody', 2) && this.S('sus:' + top.id)) {
      const b = [...mem.bodies.values()].find((x) => x.near.includes(top.id));
      if (b) return this.pairOf('nearBody', { x: this.nameOf(top.id), v: m.bodyName || '?', room: b.room }, { kind: 'suspect', target: top.id });
      return this.pairOf('suspect', { x: this.nameOf(top.id) }, { kind: 'echo', target: top.id });
    }
    if (top && top.s >= 0.4 && chance(0.6) && this.fresh('voteCall', 2) && this.S('vc')) { m.pledge = top.id; return this.pairOf('voteCall', { x: this.nameOf(top.id) }, { kind: 'vote', target: top.id }); }
    return null;
  }

  trkTarget() { const p = this.p; return p.trackerTarget || (this.trk && [...this.mgr.room.players.values()].find((q) => q.name === this.trk.name)?.id); }

  nextImpStatement(now) {
    const p = this.p, m = this.meet;
    if (m.reason === 'button' && m.caller === p.id && this.S('btn')) return this.pairOf('buttonNone', {}, null);
    if (m.reason === 'body' && m.caller === p.id && this.S('found')) return this.pairOf('bodyFound', { v: m.bodyName || '?', room: m.bodyRoom || this.myRoom() }, { kind: 'body', ridx: this.bodyRoomIdx });
    if (this.fresh('alibi', 2) && this.S('alibi') && chance(0.5)) { const fr = this.fakeRoom(); return this.pairOf('alibi', { room: fr }, { kind: 'alibi', ridx: fr.idx }); }
    const frame = this.frameTarget();
    if (frame && chance(0.6) && this.fresh('lieSaw', 2) && this.S('lie')) {
      const s = this.mem.seen.get(frame);
      const room = s ? this.mgr.roomName(s.x, s.y) : this.fakeRoom();
      return this.pairOf('lieSaw', { x: this.nameOf(frame), room }, { kind: 'suspect', target: frame, ridx: s ? s.room : room.idx });
    }
    for (const [id, n] of this.mem.acc) {
      if (this.mates.has(id) && !this.mem.dead.has(id) && n >= 1 && chance(0.4) && this.fresh('defendMate', 2) && this.S('dm' + id)) return this.pairOf('defendMate', { x: this.nameOf(id) }, { kind: 'clear', target: id });
    }
    if (frame && chance(0.5) && this.fresh('voteCall', 2) && this.S('vc')) { m.pledge = frame; return this.pairOf('voteCall', { x: this.nameOf(frame) }, { kind: 'vote', target: frame }); }
    return null;
  }

  // a quién se señala siendo impostor: el más acusado por otros, o alguien visto cerca del cuerpo, o al azar
  frameTarget() {
    const m = this.meet;
    const alive = m.players.filter((q) => q.alive && q.id !== this.id && !this.mates.has(q.id));
    if (!alive.length) return null;
    if (this.frame && alive.some((q) => q.id === this.frame)) return this.frame;
    let best = null, bs = -1;
    for (const q of alive) {
      const sc = (this.mem.acc.get(q.id) || 0) * 2 + this.susp(q.id) + Math.random() * 0.3;
      if (sc > bs) { bs = sc; best = q.id; }
    }
    this.frame = best;
    return best;
  }

  topSuspect(includeMates) {
    const m = this.meet;
    let best = null, bs = 0;
    for (const q of (m ? m.players : [])) {
      if (!q.alive || q.id === this.id || this.mem.clear.has(q.id)) continue;
      if (!includeMates && this.mates.has(q.id)) continue;
      const s = this.susp(q.id);
      if (s > bs) { bs = s; best = q.id; }
    }
    return best ? { id: best, s: bs } : null;
  }

  /* ----- oír a los demás ----- */

  // lo que dice otro bot: ya viene entendido
  hearStruct(fromId, st, now) {
    const p = this.p, m = this.meet;
    if (!m || !p || !p.alive) return;
    if (st.kind === 'body') { if (st.ridx >= 0 && this.bodyRoomIdx == null) this.bodyRoomIdx = st.ridx; return; }
    // alguien dice haberme visto en una sala: yo sé si es verdad
    if (st.kind === 'alibi' && st.seen && st.seen.includes(this.id) && st.ridx >= 0 && m.reacts < 3) {
      m.reacts++;
      if (this.wasIn(st.ridx)) this.queueSay(this.pairOf('confirm', { x: this.nameOf(fromId), room: this.roomObj(st.ridx) }, null), rnd(2500, 5500));
      else {
        if (p.role !== 'impostor') this.addSusp(fromId, 0.35); // me nombra en un sitio donde no estuve: miente
        this.queueSay(this.pairOf('falseSeen', { x: this.nameOf(fromId), room: this.roomObj(st.ridx) }, p.role !== 'impostor' ? { kind: 'liar', target: fromId } : null), rnd(3000, 6500));
      }
    }
    if (st.kind === 'liar') {
      if (st.target !== this.id && p.role !== 'impostor' && !this.mem.dead.has(st.target)) this.addSusp(st.target, 0.2 * (1 - this.susp(fromId)));
      return;
    }
    if (st.kind === 'alibi') {
      // quien dice haber estado en la sala del cuerpo (o haber visto allí a alguien) queda un poco más señalado
      if (p.role !== 'impostor' && this.bodyRoomIdx != null && st.ridx === this.bodyRoomIdx) {
        this.addSusp(fromId, 0.08);
        for (const id of st.seen || []) this.addSusp(id, 0.04);
      }
      return;
    }
    if (st.kind === 'clear') { if (p.role !== 'impostor') this.addSusp(st.target, -0.15); return; }
    if (st.kind !== 'witness' && st.kind !== 'suspect' && st.kind !== 'echo' && st.kind !== 'vote') return;
    if (st.target !== this.id && this.mem.dead.has(st.target)) return; // ya está fuera: no se vuelve a hablar de él
    this.mem.acc.set(st.target, (this.mem.acc.get(st.target) || 0) + 1);
    if (st.target === this.id) { this.respondAccusation(fromId, st, now); return; }
    if (st.kind === 'echo') return; // repetir una sospecha no es una prueba nueva
    if (p.role === 'impostor') {
      if (this.mates.has(st.target) && chance(0.35)) this.queueSay(this.pairOf('askWhy', { x: this.nameOf(fromId) }, null), rnd(3500, 7000));
      return;
    }
    const base = st.kind === 'witness' ? (st.soft ? 0.3 : 0.42) : st.kind === 'vote' ? 0.05 : 0.07; // lo de oídas pesa poco: lo que cuenta es lo visto
    this.addSusp(st.target, base * (1 - this.susp(fromId)));
    if (m.reacts < 1 && !m.quiet) {
      if (st.kind === 'witness' && chance(0.15) && this.susp(st.target) < 0.5) { m.reacts++; this.queueSay(this.pairOf('askWhy', { x: this.nameOf(fromId) }, null), rnd(3500, 7000)); }
      else if (this.susp(st.target) >= 0.4 && chance(0.2)) { m.reacts++; this.queueSay(this.pairOf('agree', { x: this.nameOf(st.target) }, null), rnd(3500, 7000)); }
    }
  }

  // lo que escribe una persona: se lee con palabras clave y se decide, según lo que el bot sabe, si se la cree
  hearText(fromId, text, names, now) {
    const p = this.p, m = this.meet;
    if (!m || !p || !p.alive || fromId === this.id) return;
    const r = parseChat(text, names);
    // "yo no fui": se la cree un poco más quien no tenía motivos para sospechar de ella
    if (r.self && p.role !== 'impostor' && !this.proof(fromId) && this.susp(fromId) < 0.5) this.addSusp(fromId, -0.04);
    // "saltemos / no votemos a nadie"
    if (r.skip && !r.mentioned.length) { this.hearSkip(fromId, now); return; }
    // una explicación ("porque lo vi en la rejilla") a quien antes acusó o a quien le pedimos que se explicara
    const lc = m.lastCall && m.lastCall.get(fromId);
    if (lc && !lc.done && now - lc.at < 50000 && r.reason && (!r.mentioned.length || r.mentioned.includes(lc.tgt))) { this.considerExplain(fromId, lc, r, now); return; }
    if (!r.mentioned.length) return;
    // "votad a X" / "voto a X": a mí me están señalando, o me piden que vote a otro
    if (r.vote && r.voteTargets.length) {
      if (r.voteTargets.includes(this.id)) { this.respondAccusation(fromId, { kind: 'suspect', target: this.id }, now); return; }
      this.considerCall(fromId, r.voteTargets[0], r, now);
      return;
    }
    // "X es inocente / confío en X"
    if (r.clear && !r.accuse) {
      const tgt = r.mentioned.find((id) => id !== this.id);
      if (tgt) this.considerClear(fromId, tgt, now);
      return;
    }
    if (r.mentioned.includes(this.id)) {
      if (r.accuse) { this.respondAccusation(fromId, { kind: r.strong ? 'witness' : 'suspect', target: this.id }, now); return; }
      if (r.question && m.reacts < 3 && chance(0.8)) { m.reacts++; this.queueSay(this.alibiReply(now), rnd(3000, 6000)); }
      return;
    }
    if (r.accuse) {
      // acusa a otro ("X es impostor", "vi a X matar"): se la cree o no según el sentido que le encuentre
      this.considerCall(fromId, r.mentioned[0], r, now);
    }
  }

  /* ¿Cuánto me creo que `tgt` es sospechoso porque lo dice `fromId`? Pesa lo que yo mismo he visto y
     sospechado, no solo quién lo dice: si yo ya desconfiaba de él o estuvo junto al cuerpo, cuela; si lo vi
     trabajando o el que acusa me parece sospechoso, no. */
  credit(fromId, tgt, r, now) {
    if (this.mem.knownImp.has(fromId) || this.proof(fromId)) return 0; // sé que quien lo dice es impostor
    if (this.proof(tgt)) return 1;                                       // yo mismo lo sé
    let c = 0.4;
    c += (this.susp(tgt) - 0.12) * 1.1;   // si ya desconfiaba de él, me cuadra
    c -= (this.susp(fromId) - 0.12) * 0.9; // si desconfío de quien lo dice, me cuadra menos
    if (this.mem.clear.has(tgt)) c -= 0.4;
    if (this.recentSeen(now).some((o) => o.id === tgt && now - o.t < 25000)) c -= 0.12; // lo vi trabajando hace nada
    c += Math.min(0.2, (this.mem.acc.get(tgt) || 0) * 0.06); // varios lo señalan
    for (const b of this.mem.bodies.values()) if ((b.near || []).includes(tgt)) { c += 0.15; break; } // estaba junto al cuerpo
    if (r.reason) c += 0.12;                    // da una razón
    else if (r.strong) c += 0.12;
    else if (!r.accuse) c -= 0.1; // "votad a X" a secas, sin motivo
    return Math.max(0.08, Math.min(0.92, c));
  }

  // una persona acusa a `tgt` o pide votarle
  considerCall(fromId, tgt, r, now) {
    const p = this.p, m = this.meet;
    if (!m || tgt === this.id || this.mem.dead.has(tgt)) return;
    m.heard = m.heard || new Set();
    const key = tgt + ':' + fromId;
    if (m.heard.has(key) || m.heard.size >= 4) return; // cada petición se contesta una vez por reunión
    m.heard.add(key);
    this.mem.acc.set(tgt, (this.mem.acc.get(tgt) || 0) + 1);
    const x = this.nameOf(tgt), y = this.nameOf(fromId);
    // se apunta por si luego explica por qué ("porque lo vi...")
    m.lastCall = m.lastCall || new Map();
    const lc = { tgt, at: now, done: false, asked: false };
    m.lastCall.set(fromId, lc);
    if (p.role === 'impostor') {
      if (this.mates.has(tgt)) {
        // piden votar a mi compañero: lo defiendo y desconfío de quien lo pide
        this.hostile.add(fromId);
        if (m.reacts < 4 && chance(0.7)) { m.reacts++; this.queueSay(this.pairOf(chance(0.5) ? 'defendMate' : 'doubt', { x, y }, null), rnd(3500, 7000)); }
        return;
      }
      // a un inocente: me apunto casi siempre, así parece que ayudo y el voto se reparte
      if (chance(0.7)) this.followCall(tgt, fromId, r, 0.35);
      return;
    }
    if (chance(this.credit(fromId, tgt, r, now))) { lc.done = true; this.followCall(tgt, fromId, r, r.strong ? 0.3 : 0.22); }
    else if (!r.reason && this.askWhy(fromId, tgt, lc, now)) { /* ha pedido que se explique */ }
    else this.refuseCall(tgt, fromId, now);
  }

  // me lo creo: sube la sospecha, a veces me comprometo a votarle y lo digo
  followCall(tgt, fromId, r, bump, kind = 'follow') {
    const p = this.p, m = this.meet;
    this.addSusp(tgt, bump * (1 - this.susp(fromId)));
    // si me lo creo, normalmente me comprometo a votarle: más si me lo piden o dicen haberlo visto
    const commit = r.vote ? 0.9 : r.strong ? 0.8 : 0.6;
    if ((!m.pledge || chance(0.6)) && chance(commit)) m.pledge = tgt;
    if (m.reacts < 4 && chance(0.75)) {
      m.reacts++;
      this.queueSay(this.pairOf(kind, { x: this.nameOf(tgt), y: this.nameOf(fromId) }, { kind: 'vote', target: tgt }), rnd(2800, 6000));
    }
    void p;
  }

  /* Una persona acusa sin dar razones y no me convence: a veces (solo uno de los bots por acusación) le pido
     que se explique. Si luego lo hace y tiene sentido, me lo creo (considerExplain). */
  askWhy(fromId, tgt, lc, now) {
    const R = this.mgr.room, m = this.meet;
    const from = R.players.get(fromId);
    if (!from || from.bot || m.reacts >= 4) return false;
    const asked = this.mgr.askedWhy || (this.mgr.askedWhy = new Map());
    for (const [k, t] of asked) if (now - t > 45000) asked.delete(k);
    const key = fromId + ':' + tgt;
    if (asked.has(key) || !chance(0.65)) return false;
    asked.set(key, now);
    lc.asked = true;
    m.reacts++;
    this.queueSay(this.pairOf('askWhy', { x: this.nameOf(fromId), y: this.nameOf(tgt) }, null), rnd(2500, 5000));
    return true;
  }

  // la persona ha explicado por qué: si cuadra con lo que sé (y encima me lo había preguntado), me lo creo
  considerExplain(fromId, lc, r, now) {
    const p = this.p, m = this.meet, tgt = lc.tgt;
    lc.done = true;
    if (!m || tgt === this.id || this.mem.dead.has(tgt)) return;
    const x = this.nameOf(tgt), y = this.nameOf(fromId);
    const rr = { ...r, accuse: true, strong: true, vote: true };
    if (p.role === 'impostor') {
      if (this.mates.has(tgt)) return;
      if (chance(0.7)) this.followCall(tgt, fromId, rr, 0.3, 'explainOk');
      return;
    }
    let c = this.credit(fromId, tgt, rr, now) + 0.2; // dar una razón pesa mucho
    if (lc.asked) c += 0.1;                           // y más si me lo había preguntado yo
    if (this.susp(tgt) > 0.3) c += 0.1;               // cuadra con lo que yo ya sospechaba
    c = Math.max(0.1, Math.min(0.93, c));
    if (chance(c)) this.followCall(tgt, fromId, rr, 0.3, 'explainOk');
    else if (m.reacts < 4 && chance(0.6)) { m.reacts++; this.queueSay(this.pairOf('explainNo', { x, y }, null), rnd(3000, 6500)); }
  }

  // no me lo creo: no cambia mi voto y a veces lo digo
  refuseCall(tgt, fromId, now) {
    const m = this.meet;
    if (m.pledge === tgt) m.pledge = null;
    this.addSusp(tgt, -0.02);
    if (m.reacts < 4 && chance(0.65)) {
      m.reacts++;
      const seen = this.recentSeen(now).find((o) => o.id === tgt && now - o.t < 40000);
      const x = this.nameOf(tgt), y = this.nameOf(fromId);
      this.queueSay(seen && chance(0.6)
        ? this.pairOf('disagree', { x, room: seen.room }, null)
        : this.pairOf('doubt', { x, y }, null), rnd(3000, 6500));
    }
  }

  // "X es inocente": me lo creo según cuánto me fío de quien lo dice y de lo que yo sabía de X
  considerClear(fromId, tgt, now) {
    const p = this.p, m = this.meet;
    if (p.role === 'impostor' || !m || this.mem.dead.has(tgt)) return;
    if (this.proof(tgt) || this.mem.knownImp.has(fromId) || this.proof(fromId)) return;
    const c = Math.max(0.1, Math.min(0.85, 0.5 - (this.susp(fromId) - 0.12) * 0.9 - (this.susp(tgt) - 0.12) * 0.6));
    if (!chance(c)) return;
    this.addSusp(tgt, -0.14 * (1 - this.susp(fromId)));
    if (m.pledge === tgt && this.susp(tgt) < 0.4) m.pledge = null;
    if (m.reacts < 4 && chance(0.45)) { m.reacts++; this.queueSay(this.pairOf('trustClear', { x: this.nameOf(tgt), y: this.nameOf(fromId) }, { kind: 'clear', target: tgt }), rnd(3000, 6500)); }
  }

  // "saltemos": según lo convencido que esté yo de que hay un culpable claro
  hearSkip(fromId, now) {
    const p = this.p, m = this.meet;
    m.heard = m.heard || new Set();
    if (m.heard.has('skip:' + fromId)) return;
    m.heard.add('skip:' + fromId);
    const top = this.topSuspect(false);
    const y = this.nameOf(fromId);
    if (p.role === 'impostor') {
      if (chance(0.4)) m.skipWish = true;
      return;
    }
    const sure = top && (this.proof(top.id) || top.s >= 0.6);
    if (!sure && !this.mem.knownImp.size && chance(0.55 - this.susp(fromId) * 0.4)) {
      m.skipWish = true;
      if (m.pledge) m.pledge = null;
      if (m.reacts < 4 && chance(0.6)) { m.reacts++; this.queueSay(this.pairOf('skipFollow', { y }, null), rnd(3000, 6000)); }
    } else if (m.reacts < 4 && chance(0.4)) {
      m.reacts++;
      this.queueSay(this.pairOf('skipRefuse', { y }, null), rnd(3000, 6500));
    }
    void now;
  }

  alibiReply(now) {
    const p = this.p;
    if (p.role === 'impostor') return this.pairOf('alibi', { room: this.fakeRoom() }, { kind: 'alibi' });
    return this.pairOf('alibi', { room: this.myRoom() }, { kind: 'alibi' });
  }

  respondAccusation(fromId, st, now) {
    const p = this.p, m = this.meet;
    this.hostile.add(fromId); // quien me acusa queda como sospechoso para mí si soy impostor
    if (!m || m.reacts >= 3) return;
    m.reacts++;
    // primero hay que leerlo, pensar y escribir: nadie contesta al instante (y a veces ni contesta)
    if (!chance(p.role === 'impostor' ? 0.92 : 0.85)) return;
    // me sitúan en una sala por la que no he pasado: es una mentira comprobada
    if (st.ridx >= 0 && !this.wasIn(st.ridx)) {
      if (p.role !== 'impostor') this.addSusp(fromId, 0.4);
      this.queueSay(this.pairOf('falseSeen', { x: this.nameOf(fromId), room: this.roomObj(st.ridx) }, p.role !== 'impostor' ? { kind: 'liar', target: fromId } : null), rnd(3500, 7000));
      return;
    }
    const room = p.role === 'impostor' ? this.fakeRoom() : this.myRoom();
    const wait = st.kind === 'witness' ? rnd(4500, 8500) : rnd(3500, 7000); // una acusación grave se lee con más calma
    this.queueSay(this.pairOf('defend', { room }, { kind: 'alibi' }), wait);
    // quien me acusa puede haber sido visto por mí: se lo digo; si no, le pido pruebas
    const rs = this.recentSeen(now);
    if (p.role !== 'impostor' && rs.length && chance(0.4)) this.queueSay(this.pairOf('defendSeen', { room, a: rs[0].name }, null), 0);
    else if (chance(0.35)) this.queueSay(this.pairOf('counter', { x: this.nameOf(fromId) }, { kind: 'suspect', target: fromId }), 0);
  }

  /* ----- voto ----- */

  // prueba de primera mano de que alguien es impostor (lo visto o lo averiguado, nunca lo que dicen otros)
  proof(id) {
    if (this.mem.knownImp.has(id)) return true;
    return this.mem.events.some((e) => e.who === id && (e.type === 'kill' || e.type === 'attack' || (e.type === 'vent' && e.sure)));
  }


  castVote(now) {
    const p = this.p, m = this.meet, R = this.mgr.room;
    m.voted = true;
    const alive = m.players.filter((q) => q.alive && q.id !== p.id);
    let choice = 'skip';
    if (p.role === 'impostor') {
      const crew = alive.filter((q) => !this.mates.has(q.id));
      const need = Math.ceil((alive.length + 1) / 2);
      const doomed = [...this.mem.acc].find(([id, n]) => this.mates.has(id) && n >= need);
      if (doomed && chance(0.55)) choice = doomed[0]; // el compañero ya está perdido: votarle disimula
      else if (m.pledge && alive.some((q) => q.id === m.pledge)) choice = m.pledge; // lo que dije en el chat
      else if (m.skipWish) choice = 'skip';
      else {
        let best = null, bs = -1;
        for (const q of crew) {
          const sc = (this.mem.acc.get(q.id) || 0) + (q.id === this.frame ? 1.5 : 0) + Math.random() * 0.6;
          if (sc > bs) { bs = sc; best = q.id; }
        }
        if (best && bs >= 0.9) choice = best;
      }
    } else {
      const top = this.topSuspect(true);
      const thr = alive.length <= 3 ? 0.28 : 0.45;
      if (top && top.s >= thr) choice = top.id;
      if (m.skipWish && !(top && this.proof(top.id))) choice = 'skip'; // me convencieron de saltar y no tengo una prueba
      if (m.pledge && alive.some((q) => q.id === m.pledge) && !this.mem.clear.has(m.pledge) && (this.susp(m.pledge) >= 0.2 || chance(0.7))) choice = m.pledge; // cumple lo que dijo
      if (p.judge && !p.judgeUsed && top && this.proof(top.id)) {
        this.send({ t: 'judge', target: top.id }); // una prueba directa: el Juez sentencia
        return;
      }
    }
    this.lastVote = { choice, susp: alive.map((q) => q.id + ':' + this.susp(q.id).toFixed(2)).join(' '), acc: [...this.mem.acc].join(' ') };
    this.send({ t: 'vote', target: choice });
    void R; void now;
  }
}
