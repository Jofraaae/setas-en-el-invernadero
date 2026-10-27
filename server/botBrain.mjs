/* ================================================================
   Cerebro de un bot. Cada tick:
     perceive → memoria  (lo que ve, con la misma línea de visión que un jugador)
     think    → elige una meta (misión, reportar, sabotaje, cazar…) cada ~120 ms
     act      → camina hacia la meta por la rejilla (A*), igual que un cliente
   En las reuniones habla (es/en), acusa con lo que ha visto, se defiende y vota.
   ================================================================ */

import { findPath } from './botNav.mjs';
import { parseChat } from './botChat.mjs';

const rnd = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const GAME_MS = { hold: 4500, dose: 5000, timing: 4200, spots: 5500, memory: 5000, seq: 4500, code: 4500, pipe: 6000, sort: 5500, match: 5000, order: 4500 };
const BASE_SUSP = 0.12;

export class Brain {
  constructor(mgr, id) {
    this.mgr = mgr;
    this.id = id;
    this.errors = 0;
    this.disabled = false;
    this.mates = new Set();
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
    if (ri >= 0) this.where = { idx: ri, name: { ...mgr.roomName(p.x, p.y), idx: ri }, t: now };
    if (!p.alive) return;
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
    this.after = { t: now, until: now + 7500, x: victim.x, y: victim.y, wit, doors: false, shift: false, spec: false, vent: false, flee: null };
    this.lastKillAt = now;
    this.goal = null;
    this.path = null;
    this.nextThink = 0;
  }

  onGo(now) {
    this.nextThink = now + rnd(200, 1500);
    this.nextSab = now + rnd(20000, 40000);
  }

  onResume(now) {
    this.mem.bodies.clear();
    this.mem.seen.clear();
    this.hold = now + rnd(300, 1200);
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
    if (R.dark) { const g = this.panelGoal(now); if (g) return g; }
    const g4 = this.buttonGoal(now); if (g4) return g4;
    const g5 = this.roleGoal(now); if (g5) return g5;
    return this.taskGoal(now) || this.roamGoal(now);
  }

  decideGhost(now) {
    const p = this.p, R = this.mgr.room;
    if (p.role === 'impostor') { this.sabotageLogic(now); return this.mk('stay', 'stay', p.x, p.y, 0); }
    if (p.angel && now >= (p.guardReadyAt || 0)) {
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
    return this.mk('panel', 'panel', pn.x, pn.y, 50, () => {
      this.startWork('panel', rnd(2500, 4000), () => { this.send({ t: 'fix' }); this.goal = null; });
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
    const ms = (GAME_MS[t.game] || 4500) * rnd(1.4, 2.2); // un minijuego de verdad lleva su rato
    this.startWork('task', ms, () => {
      this.send({ t: 'task', id }); // el impostor también "hace" la suya: así parece uno más
      this.goal = null;
      this.nextThink = 0;
    });
  }

  roamGoal(now) {
    if (this.goal && this.goal.kind === 'roam' && this.goal.valid(now)) return this.goal;
    const p = this.p, M = this.mgr.M;
    const pts = M.tasks.map((t) => ({ x: t.x, y: t.y }));
    pts.push({ x: M.button.x, y: M.button.y });
    const far = pts.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) > 250);
    const q = far.length ? far[Math.floor(Math.random() * far.length)] : pts[0];
    const key = 'roam:' + Math.round(q.x) + ':' + Math.round(q.y);
    const idle = p.role === 'impostor' && p.alive && now >= p.killReadyAt ? [700, 2000] : [1500, 6000];
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

  huntGoal(now) {
    const mgr = this.mgr, R = mgr.room, p = this.p, E = mgr.E;
    if (now < p.killReadyAt - 3500) return null;
    const cands = [];
    for (const q of R.players.values()) {
      if (!q.alive || q.role === 'impostor' || q.inVent) continue;
      let pos = null;
      if (this.vis.some((o) => o.q === q)) pos = { x: q.x, y: q.y };
      else { const s = this.mem.seen.get(q.id); if (s && now - s.t < 4000) pos = { x: s.x, y: s.y }; }
      if (!pos) continue;
      const wit = mgr.exposed(pos, [q.id, p.id], now).length;
      cands.push({ q, pos, d: Math.hypot(pos.x - p.x, pos.y - p.y), wit });
    }
    if (!cands.length) {
      // nadie a la vista: se va a buscar donde suele haber gente
      return now >= p.killReadyAt ? this.roamGoal(now) : null;
    }
    cands.sort((a, b) => (a.wit * 600 + a.d) - (b.wit * 600 + b.d));
    const c = cands[0];
    const invis = (p.invisUntil || 0) > now;
    if (now >= p.killReadyAt && !invis && c.d <= E.KILL_RANGE - 12 && c.wit === 0) {
      // nadie puede ver ni al asesino ni a la víctima: ahora
      if (mgr.exposed({ x: p.x, y: p.y }, [c.q.id, p.id], now).length === 0) {
        this.send({ t: 'kill' });
        return null;
      }
    }
    if (c.wit > 0) {
      // hay testigos: no se acerca. Con tiempo, apaga las luces para quedarse a solas con alguien
      if (now >= p.killReadyAt && !R.dark && !R.reactor && now >= R.sabLockAt && chance(0.006)) this.send({ t: 'sabotage' });
      return null;
    }
    if (now < p.killReadyAt - 800) return null; // todavía no: sigue a lo suyo
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

  sabotageLogic(now) {
    const p = this.p, R = this.mgr.room;
    if (now < this.nextSab || R.dark || R.reactor || R.frozen(p, now)) return;
    this.nextSab = now + rnd(5000, 10000);
    const crew = [...R.players.values()].filter((q) => q.alive && q.role === 'crew').length;
    const killSoon = p.alive && p.killReadyAt - now < 9000;
    if (now >= R.sabLockAt && chance(0.3) && (killSoon || !p.alive)) { this.send({ t: 'sabotage' }); this.nextSab = now + 25000; return; }
    if (now >= R.rtLockAt && crew >= 3 && chance(0.15)) { this.send({ t: 'reactor' }); this.nextSab = now + 30000; }
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
    const m = {
      t0: now, reason: msg.reason, bodyName: msg.bodyName, caller: msg.caller,
      discussUntil: now + (msg.discussMs || 0), voteUntil: msg.endsAt || now + (msg.ms || 40000),
      nextSpeak: now + rnd(1800, 4500), spoken: 0, queue: [], voteAt: 0, voted: false, reacts: 0,
      players: msg.players || [], bodyRoom: null,
    };
    if (msg.caller === p.id && msg.reason === 'body') m.bodyRoom = this.lastReport ? this.lastReport.room : (this.where && this.where.name);
    this.meet = m;
    this.mem.said = new Set();
    this.mem.acc = new Map();
    for (const q of m.players) if (!q.alive) this.mem.dead.add(q.id);
    this.bodyRoomIdx = null;
    for (const b of this.mem.bodies.values()) { b.reported = true; if (b.ridx >= 0) this.bodyRoomIdx = b.ridx; }
    this.silentUnsaid = this.silent;
  }

  onResult(msg, now) {
    const m = this.meet;
    this.meet = null;
    const ej = msg.ejected;
    if (ej) {
      this.mem.dead.add(ej.id);
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
    const p = this.p, m = this.meet;
    if (!m || !p.alive) return;
    if (now >= m.nextSpeak && m.spoken < 5) {
      const s = m.queue.shift() || this.nextStatement(now);
      if (s && this.mgr.room.botSay(p, s.texts, s.struct)) m.spoken++;
      m.nextSpeak = now + rnd(2600, 6500);
    }
    if (!m.voted) {
      if (!m.voteAt && now >= m.discussUntil) m.voteAt = now + Math.min(rnd(900, 7000), Math.max(500, m.voteUntil - now - 2500));
      if (m.voteAt && now >= m.voteAt) this.castVote(now);
    }
  }

  queueSay(s, soon) {
    const m = this.meet;
    if (!m || !s || m.queue.length > 2) return;
    m.queue.push(s);
    if (soon) m.nextSpeak = Math.min(m.nextSpeak, Date.now() + rnd(900, 2200));
  }

  pairOf(kind, params, struct) {
    const texts = this.mgr.say(kind, params);
    return texts ? { texts, struct: struct || null } : null;
  }

  S(k) { if (this.mem.said.has(k)) return false; this.mem.said.add(k); return true; }

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
    const kill = mem.events.find((e) => e.type === 'kill');
    if (kill) {
      if (this.S('wk')) return this.pairOf('witnessKill', { x: this.nameOf(kill.who), v: this.nameOf(kill.victim), room: kill.room }, { kind: 'witness', target: kill.who });
      if (this.S('wk2')) return this.pairOf('witnessKill2', { x: this.nameOf(kill.who) }, { kind: 'witness', target: kill.who });
    }
    const att = mem.events.find((e) => e.type === 'attack');
    if (att && this.S('att')) return this.pairOf('witnessAttack', { x: this.nameOf(att.who), v: this.nameOf(att.victim), room: att.room }, { kind: 'witness', target: att.who });
    const vent = mem.events.find((e) => e.type === 'vent');
    if (vent && this.S('vent')) return this.pairOf(vent.engineerSelf ? 'witnessVentSure' : 'witnessVent', { x: this.nameOf(vent.who), room: vent.room }, { kind: 'witness', target: vent.who, soft: !vent.sure });
    const dbl = mem.events.find((e) => e.type === 'double');
    if (dbl && this.S('dbl')) return this.pairOf('doubleSeen', { x: this.nameOf(dbl.who), room: dbl.room }, { kind: 'suspect', target: dbl.who });
    if (this.det && this.S('det')) {
      return this.pairOf(this.det.impostor ? 'detImp' : 'detClean', { x: this.nameOf(this.det.id) }, this.det.impostor ? { kind: 'witness', target: this.det.id } : { kind: 'clear', target: this.det.id });
    }
    if (this.silent && this.S('sil')) return this.pairOf('sciInfo', { x: this.nameOf(this.silent.id) }, null);
    if (this.trk && this.S('trk') && mem.seen.get(this.trkTarget())) {
      const s = mem.seen.get(this.trkTarget());
      return this.pairOf('trackInfo', { x: this.nameOf(this.trkTarget()), room: this.mgr.roomName(s.x, s.y) }, null);
    }
    if (m.reason === 'body' && m.caller === p.id && this.S('found')) return this.pairOf('bodyFound', { v: m.bodyName || '?', room: m.bodyRoom || this.myRoom() }, { kind: 'body', ridx: this.bodyRoomIdx });
    if (m.reason === 'button' && m.caller === p.id && this.S('btn')) return this.pairOf('buttonNone', {}, null);
    if (this.S('alibi')) {
      const rs = this.recentSeen(now);
      const room = this.myRoom();
      if (rs.length >= 2) return this.pairOf('alibiSeen2', { room: rs[0].room, a: rs[0].name, b: rs[1].name }, { kind: 'alibi', ridx: rs[0].room.idx, seen: [rs[0].id, rs[1].id] });
      if (rs.length === 1) return this.pairOf('alibiSeen1', { room: rs[0].room, a: rs[0].name }, { kind: 'alibi', ridx: rs[0].room.idx, seen: [rs[0].id] });
      return this.pairOf('alibi', { room }, { kind: 'alibi', ridx: room.idx });
    }
    const top = this.topSuspect(false);
    if (top && top.s >= 0.3 && this.S('sus:' + top.id)) {
      const b = [...mem.bodies.values()].find((x) => x.near.includes(top.id));
      if (b) return this.pairOf('nearBody', { x: this.nameOf(top.id), v: m.bodyName || '?', room: b.room }, { kind: 'suspect', target: top.id });
      return this.pairOf('suspect', { x: this.nameOf(top.id) }, { kind: 'echo', target: top.id });
    }
    if (top && top.s >= 0.4 && this.S('vc')) return this.pairOf('voteCall', { x: this.nameOf(top.id) }, null);
    if (this.S('none')) return this.pairOf('noInfo', {}, null);
    return null;
  }

  trkTarget() { const p = this.p; return p.trackerTarget || (this.trk && [...this.mgr.room.players.values()].find((q) => q.name === this.trk.name)?.id); }

  nextImpStatement(now) {
    const p = this.p, m = this.meet;
    if (m.reason === 'button' && m.caller === p.id && this.S('btn')) return this.pairOf('buttonNone', {}, null);
    if (m.reason === 'body' && m.caller === p.id && this.S('found')) return this.pairOf('bodyFound', { v: m.bodyName || '?', room: m.bodyRoom || this.myRoom() }, { kind: 'body', ridx: this.bodyRoomIdx });
    if (this.S('alibi')) { const fr = this.fakeRoom(); return this.pairOf('alibi', { room: fr }, { kind: 'alibi', ridx: fr.idx }); }
    const frame = this.frameTarget();
    if (frame && chance(0.6) && this.S('lie')) {
      const s = this.mem.seen.get(frame);
      const room = s ? this.mgr.roomName(s.x, s.y) : this.fakeRoom();
      return this.pairOf('lieSaw', { x: this.nameOf(frame), room }, { kind: 'suspect', target: frame });
    }
    for (const [id, n] of this.mem.acc) {
      if (this.mates.has(id) && n >= 1 && chance(0.4) && this.S('dm' + id)) return this.pairOf('defendMate', { x: this.nameOf(id) }, { kind: 'clear', target: id });
    }
    if (frame && this.S('vc')) return this.pairOf('voteCall', { x: this.nameOf(frame) }, null);
    if (this.S('none')) return this.pairOf('noInfo', {}, null);
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
    if (st.kind === 'alibi') {
      // quien dice haber estado en la sala del cuerpo (o haber visto allí a alguien) queda un poco más señalado
      if (p.role !== 'impostor' && this.bodyRoomIdx != null && st.ridx === this.bodyRoomIdx) {
        this.addSusp(fromId, 0.08);
        for (const id of st.seen || []) this.addSusp(id, 0.04);
      }
      return;
    }
    if (st.kind === 'clear') { if (p.role !== 'impostor') this.addSusp(st.target, -0.15); return; }
    if (st.kind !== 'witness' && st.kind !== 'suspect' && st.kind !== 'echo') return;
    this.mem.acc.set(st.target, (this.mem.acc.get(st.target) || 0) + 1);
    if (st.target === this.id) { this.respondAccusation(fromId, st, now); return; }
    if (st.kind === 'echo') return; // repetir una sospecha no es una prueba nueva
    if (p.role === 'impostor') {
      if (this.mates.has(st.target) && chance(0.5)) this.queueSay(this.pairOf('askWhy', { x: this.nameOf(fromId) }, null), false);
      return;
    }
    const base = st.kind === 'witness' ? (st.soft ? 0.3 : 0.42) : 0.07; // lo de oídas pesa poco: lo que cuenta es lo visto
    this.addSusp(st.target, base * (1 - this.susp(fromId)));
    if (m.reacts < 2) {
      if (st.kind === 'witness' && chance(0.22) && this.susp(st.target) < 0.5) { m.reacts++; this.queueSay(this.pairOf('askWhy', { x: this.nameOf(fromId) }, null), false); }
      else if (this.susp(st.target) >= 0.4 && chance(0.35)) { m.reacts++; this.queueSay(this.pairOf('agree', { x: this.nameOf(st.target) }, null), false); }
    }
  }

  // lo que escribe una persona: se lee con palabras clave
  hearText(fromId, text, names, now) {
    const p = this.p, m = this.meet;
    if (!m || !p || !p.alive || fromId === this.id) return;
    const r = parseChat(text, names);
    if (!r.mentioned.length) return;
    if (r.mentioned.includes(this.id)) {
      if (r.accuse) { this.respondAccusation(fromId, { kind: r.strong ? 'witness' : 'suspect', target: this.id }, now); return; }
      if (r.question && m.reacts < 3) { m.reacts++; this.queueSay(this.alibiReply(now), true); }
      return;
    }
    if (r.accuse && p.role !== 'impostor') {
      for (const id of r.mentioned) {
        this.mem.acc.set(id, (this.mem.acc.get(id) || 0) + 1);
        this.addSusp(id, (r.strong ? 0.18 : 0.07) * (1 - this.susp(fromId)));
      }
    } else if (r.accuse) {
      for (const id of r.mentioned) this.mem.acc.set(id, (this.mem.acc.get(id) || 0) + 1);
    }
  }

  alibiReply(now) {
    const p = this.p;
    if (p.role === 'impostor') return this.pairOf('alibi', { room: this.fakeRoom() }, { kind: 'alibi' });
    return this.pairOf('alibi', { room: this.myRoom() }, { kind: 'alibi' });
  }

  respondAccusation(fromId, st, now) {
    const p = this.p, m = this.meet;
    if (!m || m.reacts >= 4) return;
    m.reacts++;
    const room = p.role === 'impostor' ? this.fakeRoom() : this.myRoom();
    this.queueSay(this.pairOf('defend', { room }, { kind: 'alibi' }), true);
    // quien me acusa puede haber sido visto por mí: se lo digo; si no, le pido pruebas
    const rs = this.recentSeen(now);
    if (p.role !== 'impostor' && rs.length && chance(0.5)) this.queueSay(this.pairOf('defendSeen', { room, a: rs[0].name }, null), false);
    else if (chance(0.6)) this.queueSay(this.pairOf('counter', { x: this.nameOf(fromId) }, { kind: 'suspect', target: fromId }), false);
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
