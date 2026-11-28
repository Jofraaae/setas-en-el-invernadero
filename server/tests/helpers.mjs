import GameRoom from '../engine.mjs';

/* Una sala del motor con conexiones falsas: cada conn guarda lo que el servidor le manda. */
const vivas = [];
/* Cierra todas las salas creadas (aunque una prueba falle a medias) para que no queden temporizadores vivos. */
export function cerrarTodas() { for (const r of vivas.splice(0)) { try { r.end(); } catch (e) { /* ya cerrada */ } } }

export function makeRoom(code = 'TEST') {
  const conns = [];
  const rt = {
    getConnections: () => conns,
    closeConn: (id) => { const i = conns.findIndex((c) => c.id === id); if (i >= 0) conns.splice(i, 1); },
    schedule: () => {},          // sin temporizadores colgando: el test termina solo
    cancelSchedule: () => {},
  };
  const room = new GameRoom(code, rt);
  const connect = (id) => {
    const c = { id, log: [], send(m) { this.log.push(m); } };
    conns.push(c);
    return c;
  };
  const drop = (c) => { const i = conns.indexOf(c); if (i >= 0) conns.splice(i, 1); return room.onClose(c); };
  const last = (c, t) => [...c.log].reverse().find((m) => m.t === t);
  const all = (c, t) => c.log.filter((m) => m.t === t);
  const h = { room, conns, connect, drop, last, all, end: () => room.reset(code) };
  vivas.push(h);
  return h;
}

/* Crea la sala con n humanos (ids aaaaaaaa-0, -1…) y devuelve sus conexiones y jugadores. */
export async function lobbyOf(n, code = 'TEST') {
  const h = makeRoom(code);
  const cs = [];
  for (let i = 0; i < n; i++) {
    const c = h.connect(`aaaaaaaa-${i}`);
    cs.push(c);
    if (i === 0) await h.room.onMessage(c, { t: 'create', code, name: `J${i}` });
    else await h.room.onMessage(c, { t: 'join', code, name: `J${i}` });
  }
  const ps = cs.map((c) => h.room.findByConn(c.id));
  return { ...h, cs, ps };
}

/* Arranca la partida y salta la pantalla de roles. */
export async function playing(n, code) {
  const l = await lobbyOf(n, code);
  await l.room.onMessage(l.cs[0], { t: 'start' });
  await l.room.beginPlay();
  return l;
}

/* Abre una reunión y salta la deliberación para poder votar. */
export function openVoting(l, caller = 0) {
  l.room.startMeeting(l.ps[caller], 'button', null);
  l.room.meeting.discussUntil = Date.now() - 1;
}
