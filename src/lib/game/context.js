const NOTHING = { task: null, panel: false, btn: false, atBtn: false, body: false, target: false, vent: false, hold: null, meetBlocked: false, meetUsed: false };

export function contextOf(g) {
  const r = g.cfg.useRange;
  if (g.vent && g.vent.in) return NOTHING;
  // Un fantasma no habla, no vota y no ataca, pero sigue con sus misiones pendientes.
  if (!g.me.alive) {
    return {
      ...NOTHING,
      task: g.tasks.find((t) => !g.done.has(t.id) && Math.hypot(t.x - g.me.x, t.y - g.me.y) <= r),
    };
  }
  const c = {};
  c.task = g.tasks.find((t) => !g.done.has(t.id) && Math.hypot(t.x - g.me.x, t.y - g.me.y) <= r);
  // el impostor también puede arreglar las luces: le sirve para fingir que ayuda
  c.panel = g.st.dark && g.me.alive && Math.hypot(g.pnl.x - g.me.x, g.pnl.y - g.me.y) <= r;
  // con un sabotaje en marcha el botón no convoca reunión; reportar un cuerpo sí vale
  c.meetBlocked = !!(g.st.dark || g.st.rx);
  // cada jugador tiene una sola reunión por partida (con el botón o reportando un cuerpo)
  c.meetUsed = !!g.meetUsed;
  // al empezar o tras una reunión, el botón central tarda 20 s en poder pulsarse
  c.btnCd = Math.max(0, g.st.bcd || 0);
  c.atBtn = g.me.alive && Math.hypot(g.btn.x - g.me.x, g.btn.y - g.me.y) <= g.cfg.reportRange;
  c.btn = c.atBtn && !g.meetUsed && !c.meetBlocked && !c.btnCd;
  c.body = g.me.alive && g.bodies.some((b) => Math.hypot(b[1] - g.me.x, b[2] - g.me.y) <= g.cfg.reportRange);
  c.target = g.role === 'impostor' && g.me.alive && [...g.others].some(
    ([id, o]) => o.alive && !g.mates.includes(id) && Math.hypot(o.tx - g.me.x, o.ty - g.me.y) <= g.cfg.killRange,
  );
  // el Detective interroga una sola vez, con sus misiones hechas y alguien vivo al lado
  c.interro = !!g.detective && g.me.alive && !g.detectiveUsed && [...g.others].some(
    ([id, o]) => o.alive && Math.hypot(o.tx - g.me.x, o.ty - g.me.y) <= r,
  );
  // el Localizador marca al jugador vivo que tenga al lado, y solo cuando no hay otro activo
  c.track = !!g.tracker && g.me.alive && !g.st.trk && g.st.trkcd <= 0 && [...g.others].some(
    ([, o]) => o.alive && Math.hypot(o.tx - g.me.x, o.ty - g.me.y) <= g.cfg.trackRange,
  );
  c.vent = (g.role === 'impostor' || g.engineer) && g.me.alive && (g.vents || []).some(
    (v) => Math.hypot(v.x - g.me.x, v.y - g.me.y) <= r,
  );
  // consola del reactor: cualquier jugador vivo con el sabotaje en marcha (el impostor también)
  c.hold = null;
  if (g.st.rx && g.me.alive) {
    const pt = (g.rpts || []).find((q) => Math.hypot(q.x - g.me.x, q.y - g.me.y) <= r);
    if (pt) c.hold = { side: pt.side, name: pt.name, mine: g.st.rx[pt.side] === g.myId };
  }
  return c;
}