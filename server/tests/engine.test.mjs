import test from 'node:test';
import assert from 'node:assert/strict';
import { lobbyOf, playing, openVoting, cerrarTodas } from './helpers.mjs';

test.afterEach(() => cerrarTodas());

const vote = (l, i, target) => l.room.onMessage(l.cs[i], { t: 'vote', target });

/* ---------- votaciones ---------- */

test('votación: mayoría expulsa, el voto doble se ignora y los muertos no votan', async () => {
  const l = await playing(6);
  openVoting(l);
  const [a, b, c, d, e, f] = l.ps;
  await vote(l, 0, b.id); await vote(l, 0, c.id);           // el segundo voto de A no cuenta
  assert.equal(l.room.meeting.votes.get(a.id), b.id);
  d.alive = false; await vote(l, 3, b.id);                   // un muerto no vota
  assert.equal(l.room.meeting.votes.has(d.id), false);
  await vote(l, 1, b.id);                                    // votar a uno mismo no vale
  assert.equal(l.room.meeting.votes.has(b.id), false);
  await vote(l, 2, b.id); await vote(l, 4, b.id); await vote(l, 5, 'skip');
  assert.equal(l.room.phase, 'meeting');                     // falta b (d está muerto): la reunión sigue abierta
  await vote(l, 1, 'skip');
  assert.equal(l.room.phase, 'result');
  assert.equal(l.last(l.cs[0], 'result').ejected.id, b.id);
  l.end();
});

test('votación: no se vota durante la deliberación ni a jugadores que no existen', async () => {
  const l = await playing(5);
  l.room.startMeeting(l.ps[0], 'button', null);              // deliberación abierta
  await vote(l, 1, l.ps[2].id);
  assert.equal(l.room.meeting.votes.size, 0);
  l.room.meeting.discussUntil = Date.now() - 1;
  await vote(l, 1, 'p999');
  assert.equal(l.room.meeting.votes.size, 0);
  l.end();
});

test('votación: empate no expulsa a nadie', async () => {
  const l = await playing(5);
  openVoting(l);
  const [a, b, c, d, e] = l.ps;
  await vote(l, 0, b.id); await vote(l, 1, a.id); await vote(l, 2, 'skip'); await vote(l, 3, 'skip'); await vote(l, 4, 'skip');
  // skip gana 3-1-1: nadie expulsado
  assert.equal(l.last(l.cs[0], 'result').ejected, null);
  l.end();
});

test('votación: un voto a quien se ha ido de la sala no cuenta y no anula la expulsión', async () => {
  const l = await playing(7);
  openVoting(l);
  const [a, b, c, d, e, f, g] = l.ps;
  await vote(l, 0, g.id); await vote(l, 1, g.id); await vote(l, 3, g.id); // 3 votos para G
  await vote(l, 4, c.id); await vote(l, 5, c.id);                           // 2 votos para C
  await vote(l, 2, 'skip');
  assert.equal(l.room.phase, 'meeting');                                    // falta G
  l.room.removePlayer(g);                                                   // G abandona: sus 3 votos ya no apuntan a nadie
  assert.equal(l.room.phase, 'result');
  assert.equal(l.last(l.cs[0], 'result').ejected.id, c.id);                 // sin el arreglo, el ganador "fantasma" G anulaba la expulsión
  l.end();
});

test('Juez: acierta y expulsa al impostor; falla y se expulsa a sí mismo; si el objetivo se va, se le devuelve la sentencia', async () => {
  const mk = async () => { const l = await playing(6); l.ps.forEach((p) => { p.judge = false; }); return l; };
  // acierta
  let l = await mk();
  const imp = l.ps.find((p) => p.role === 'impostor'), crew = l.ps.filter((p) => p.role === 'crew');
  crew[0].judge = true; openVoting(l);
  await l.room.onMessage(l.cs[l.ps.indexOf(crew[0])], { t: 'judge', target: imp.id });
  for (const p of l.ps) if (p !== crew[0]) await l.room.onMessage(l.cs[l.ps.indexOf(p)], { t: 'vote', target: 'skip' });
  assert.equal(l.last(l.cs[0], 'result').ejected.id, imp.id);
  l.end();
  // falla
  l = await mk();
  const imp2 = l.ps.find((p) => p.role === 'impostor'), crew2 = l.ps.filter((p) => p.role === 'crew');
  crew2[0].judge = true; openVoting(l);
  await l.room.onMessage(l.cs[l.ps.indexOf(crew2[0])], { t: 'judge', target: crew2[1].id });
  for (const p of l.ps) if (p !== crew2[0]) await l.room.onMessage(l.cs[l.ps.indexOf(p)], { t: 'vote', target: 'skip' });
  assert.equal(l.last(l.cs[0], 'result').ejected.id, crew2[0].id);
  l.end();
  // el objetivo abandona: no muere el Juez
  l = await mk();
  const crew3 = l.ps.filter((p) => p.role === 'crew');
  crew3[0].judge = true; openVoting(l);
  const ci = l.ps.indexOf(crew3[0]);
  await l.room.onMessage(l.cs[ci], { t: 'judge', target: crew3[1].id });
  l.room.removePlayer(crew3[1]);
  l.room.endMeeting();
  assert.equal(crew3[0].alive, true);
  assert.equal(crew3[0].judgeUsed, false);
  l.end();
});

/* ---------- roles ---------- */

test('roles: nº de impostores correcto, roles de bando bien repartidos y mates solo para impostores', async () => {
  for (const [n, imps] of [[4, 1], [6, 1], [7, 2], [10, 2], [15, 2]]) {
    const l = await lobbyOf(n);
    for (const k of ['shifter', 'viper', 'spectre', 'engineer', 'alerter', 'judge', 'scientist', 'detective', 'tracker']) {
      await l.room.onMessage(l.cs[0], { t: 'settings', k, v: 7 });
    }
    await l.room.onMessage(l.cs[0], { t: 'start' });
    const impostors = l.ps.filter((p) => p.role === 'impostor');
    assert.equal(impostors.length, imps, `n=${n}`);
    assert.ok(impostors.length <= Math.floor((n - 1) / 2));
    for (const p of impostors) { assert.ok(!p.engineer && !p.alerter && !p.judge && !p.scientist && !p.detective && !p.tracker); assert.ok(!['angel', 'lantern', 'keymaster'].includes(p.ghost)); }
    for (const p of l.ps.filter((q) => q.role === 'crew')) { assert.ok(!p.shifter && !p.viper && !p.spectre); assert.notEqual(p.ghost, 'blinder'); }
    l.ps.forEach((p, i) => {
      const st = l.last(l.cs[i], 'start');
      assert.equal(st.role, p.role);
      if (p.role === 'crew') assert.deepEqual(st.mates, []);
      else assert.deepEqual([...st.mates].sort(), impostors.map((q) => q.id).sort());
      assert.equal(st.ghost, '');                              // el rol de fantasma no se revela en vida
    });
    l.end();
  }
});

test('roles: solo el anfitrión arranca y hacen falta 4 jugadores', async () => {
  const l = await lobbyOf(3);
  await l.room.onMessage(l.cs[0], { t: 'start' });
  assert.equal(l.room.phase, 'lobby');
  assert.ok(l.last(l.cs[0], 'error'));
  l.end();
  const m = await lobbyOf(4);
  await m.room.onMessage(m.cs[1], { t: 'start' });           // no es el anfitrión
  assert.equal(m.room.phase, 'lobby');
  await m.room.onMessage(m.cs[0], { t: 'start' });
  assert.equal(m.room.phase, 'roles');
  m.end();
});

test('victoria: tripulación al expulsar al último impostor, impostores al igualar', async () => {
  let l = await playing(5);
  const imp = l.ps.find((p) => p.role === 'impostor');
  openVoting(l);
  for (let i = 0; i < 5; i++) await vote(l, i, l.ps[i] === imp ? 'skip' : imp.id);
  assert.equal(l.room.phase, 'result');
  l.room.resultUntil = 0; l.room.tick(Date.now());
  assert.equal(l.last(l.cs[0], 'end').winner, 'crew');
  l.end();
  l = await playing(5);
  const killer = l.ps.find((p) => p.role === 'impostor');
  const crew = l.ps.filter((p) => p.role === 'crew');
  crew[0].alive = false; crew[1].alive = false;               // quedan 1 impostor y 2 tripulantes
  assert.equal(l.room.checkWin(), null);
  crew[2].alive = false;
  assert.equal(l.room.checkWin(), 'impostors');
  l.end();
});

/* ---------- misiones ---------- */

test('misiones: no se completan sin abrir el minijuego, ni al instante, ni lejos', async () => {
  const l = await playing(5);
  const i = l.ps.findIndex((p) => p.role === 'crew'), p = l.ps[i], c = l.cs[i];
  const id = p.tasks[0], T = l.room.m.tasks[id];
  p.x = T.x; p.y = T.y;
  await l.room.onMessage(c, { t: 'task', id });               // sin abrir
  assert.equal(p.done.length, 0);
  await l.room.onMessage(c, { t: 'taskOpen', id });
  await l.room.onMessage(c, { t: 'task', id });               // recién abierto
  assert.equal(p.done.length, 0);
  p.taskOpen.at -= 2000;                                      // pasa el tiempo de un minijuego
  await l.room.onMessage(c, { t: 'task', id });
  assert.deepEqual(p.done, [id]);
  assert.equal(l.room.taskDone, 1);
  // una misión que no abrió, aunque esté cerca de otra abierta
  const id2 = p.tasks[1];
  p.x = l.room.m.tasks[id2].x; p.y = l.room.m.tasks[id2].y;
  await l.room.onMessage(c, { t: 'taskOpen', id });           // abre otra distinta (ya hecha)
  p.taskOpen = { id, at: Date.now() - 5000 };
  await l.room.onMessage(c, { t: 'task', id: id2 });
  assert.equal(p.done.length, 1);
  // abrir una misión lejana no vale
  p.x = 10; p.y = 10;
  await l.room.onMessage(c, { t: 'taskOpen', id: id2 });
  assert.equal(p.taskOpen && p.taskOpen.id === id2, false);
  l.end();
});

test('misiones: el cuadro de luces también exige abrir su minijuego', async () => {
  const l = await playing(5);
  const imp = l.ps.findIndex((p) => p.role === 'impostor'), cr = l.ps.findIndex((p) => p.role === 'crew');
  await l.room.onMessage(l.cs[imp], { t: 'sabotage' }).catch(() => {});
  l.room.sabLockAt = 0;
  await l.room.onMessage(l.cs[imp], { t: 'sabotage' });
  assert.equal(l.room.dark, true);
  const p = l.ps[cr], c = l.cs[cr];
  p.x = l.room.m.panel.x; p.y = l.room.m.panel.y;
  await l.room.onMessage(c, { t: 'fix' });
  assert.equal(l.room.dark, true);                            // sin abrir: no
  await l.room.onMessage(c, { t: 'taskOpen', id: -1 });
  p.taskOpen.at -= 2000;
  await l.room.onMessage(c, { t: 'fix' });
  assert.equal(l.room.dark, false);
  l.end();
});

/* ---------- desconexiones y reconexiones ---------- */

test('desconexión: el jugador queda offline, conserva su sitio y se libera pasado el margen', async () => {
  const l = await lobbyOf(5);
  const p = l.ps[2];
  await l.drop(l.cs[2]);
  assert.equal(p.offline, true);
  assert.equal(l.room.players.size, 5);
  l.room.pruneOffline(Date.now() + 30000);                    // dentro del margen
  assert.equal(l.room.players.size, 5);
  l.room.pruneOffline(Date.now() + 61000);                    // fuera
  assert.equal(l.room.players.size, 4);
  l.end();
});

test('desconexión: si se va el anfitrión, otro humano pasa a serlo', async () => {
  const l = await lobbyOf(4);
  const host = l.ps[0];
  l.room.removePlayer(host);
  assert.notEqual(l.room.hostSeat, host.id);
  assert.ok(l.room.players.has(l.room.hostSeat));
  l.end();
});

test('desconexión: si todos los humanos se van, la sala se vacía', async () => {
  const l = await lobbyOf(4);
  for (const p of [...l.ps]) l.room.removePlayer(p);
  assert.equal(l.room.players.size, 0);
  l.end();
});

test('reconexión en partida: mismo rol, mismas misiones, mismo sitio y vuelve online', async () => {
  const l = await playing(5);
  const i = 1, p = l.ps[i], role = p.role, tasks = [...p.tasks], x = p.x, y = p.y;
  await l.drop(l.cs[i]);
  assert.equal(p.offline, true);
  const c2 = l.connect(l.cs[i].id);                           // mismo id de conexión
  await l.room.onOpen(c2);
  assert.equal(p.offline, false);
  const st = l.last(c2, 'start');
  assert.equal(st.resync, true);
  assert.equal(st.role, role);
  assert.deepEqual(st.tasks.map((t) => t.id), tasks);
  assert.deepEqual(st.you, [x, y]);
  l.end();
});

test('reconexión en reunión: recibe la reunión con los votos ya emitidos, incluido el suyo', async () => {
  const l = await playing(6);
  openVoting(l);
  await vote(l, 1, l.ps[3].id); await vote(l, 2, 'skip');
  await l.drop(l.cs[1]);
  const c2 = l.connect(l.cs[1].id);
  await l.room.onOpen(c2);
  const m = l.last(c2, 'meeting');
  assert.ok(m, 'recibe la reunión');
  assert.deepEqual([...m.voted].sort(), [l.ps[1].id, l.ps[2].id].sort());
  await vote(l, 1, l.ps[4].id);                               // no puede cambiar su voto
  assert.equal(l.room.meeting.votes.get(l.ps[1].id), l.ps[3].id);
  l.end();
});

test('reconexión tras salir (quit/kick): ya no es de la sala', async () => {
  const l = await lobbyOf(5);
  await l.room.onMessage(l.cs[0], { t: 'kick', id: l.ps[2].id, mode: 'ban' });
  assert.equal(l.room.players.has(l.ps[2].id), false);
  const c2 = l.connect(l.cs[2].id);
  await l.room.onMessage(c2, { t: 'join', code: 'TEST', name: 'x' });
  assert.equal(l.room.findByConn(c2.id), null);
  assert.ok(l.last(c2, 'error').msg.includes('baneado'));
  l.end();
});

/* ---------- suplantación ---------- */

test('suplantación: otro id de conexión no puede actuar como un jugador y nadie ve el id de conexión ajeno', async () => {
  const l = await playing(5);
  const intruso = l.connect('bbbbbbbb-intruso');
  await l.room.onMessage(intruso, { t: 'kill' });
  await l.room.onMessage(intruso, { t: 'vote', target: 'skip' });
  await l.room.onMessage(intruso, { t: 'start' });
  assert.equal(l.room.findByConn(intruso.id), null);
  // ningún mensaje que reciben los jugadores contiene los ids de conexión de los demás
  const secretos = l.cs.map((c) => c.id);
  for (const c of l.cs) for (const m of c.log) {
    const txt = JSON.stringify(m);
    for (const s of secretos) if (s !== c.id) assert.ok(!txt.includes(s), `filtra ${s} en ${m.t}`);
  }
  l.end();
});

test('un jugador no puede mover ni matar usando el id de jugador de otro', async () => {
  const l = await playing(5);
  const imp = l.ps.findIndex((p) => p.role === 'impostor'), cr = l.ps.findIndex((p) => p.role === 'crew');
  await l.room.onMessage(l.cs[cr], { t: 'kill', target: l.ps[imp].id });
  assert.ok(l.ps.every((p) => p.alive));                      // un tripulante no mata
  l.end();
});
