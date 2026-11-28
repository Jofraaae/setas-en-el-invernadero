import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

/* Arranca el servidor de verdad en un puerto libre y habla con él por WebSocket. */
let seq = 0;
async function arrancar(env = {}) {
  const port = 9100 + Math.floor(Math.random() * 500) + (seq++ % 7) * 500;
  const dir = mkdtempSync(join(tmpdir(), 'setas-'));
  const proc = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(port), SAVE_DIR: dir, RENDER: '', TRUST_PROXY_HOPS: '', ...env }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/api/health`); if (r.ok) break; } catch (e) { /* aún no */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return { port, stop: () => proc.kill('SIGKILL') };
}

function abrir(port, room, id, headers = {}) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?room=${room}&id=${encodeURIComponent(id)}`, { headers });
    const c = { ws, log: [], closed: null, id };
    ws.on('message', (b) => { try { c.log.push(JSON.parse(String(b))); } catch (e) { /* no JSON */ } });
    ws.on('close', (code) => { c.closed = code; });
    ws.on('error', () => {});
    ws.on('open', () => setTimeout(() => resolve(c), 150));
    ws.on('close', () => setTimeout(() => resolve(c), 0));
  });
}
const send = (c, o) => c.ws.send(JSON.stringify(o));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
/* Espera (hasta 6 s) a que se cumpla una condición, en vez de dormir un tiempo fijo. */
async function hasta(cond, ms = 6000) { const fin = Date.now() + ms; while (Date.now() < fin) { if (cond()) return true; await esperar(50); } return cond(); }
const uid = (n) => `usuario-${String(n).padStart(8, '0')}-xxxx`;

test('ids de conexión: se rechazan los inválidos y los que imitan a un bot', async () => {
  const s = await arrancar();
  try {
    for (const id of ['bot:ABCD:1', 'corto', 'x'.repeat(65), 'con espacios aaaa', 'a/b/c/d/e/f/g/h']) {
      const c = await abrir(s.port, 'ABCD', id);
      assert.equal(c.closed, 4004, `id ${id.slice(0, 12)}`);
    }
    const ok = await abrir(s.port, 'ABCD', uid(1));
    assert.equal(ok.closed, null);
    ok.ws.close();
  } finally { s.stop(); }
});

test('suplantación: no se puede manejar a un bot de la sala ni actuar como otro jugador', async () => {
  const s = await arrancar();
  try {
    const host = await abrir(s.port, 'BOTS', uid(1));
    send(host, { t: 'create', code: 'BOTS', name: 'Anfitrión' });
    await esperar(200);
    send(host, { t: 'addBot' }); send(host, { t: 'addBot' });
    await esperar(300);
    const intento = await abrir(s.port, 'BOTS', 'bot:BOTS:1');           // el id de un bot
    assert.equal(intento.closed, 4004);
    const intruso = await abrir(s.port, 'BOTS', uid(99));                 // un id cualquiera sin jugador
    send(intruso, { t: 'start' }); send(intruso, { t: 'settings', k: 'tasks', v: 1 });
    await esperar(300);
    assert.equal(host.log.some((m) => m.t === 'start'), false);           // el intruso no arranca la partida
    // nadie recibe los ids de conexión de los demás
    for (const m of host.log) assert.ok(!JSON.stringify(m).includes(uid(99)));
    for (const m of intruso.log) assert.ok(!JSON.stringify(m).includes(uid(1)));
    host.ws.close(); intruso.ws.close();
  } finally { s.stop(); }
});

test('12 conexiones en 3 salas a la vez: cada sala arranca con sus roles y no se mezclan', async () => {
  const s = await arrancar();
  try {
    const salas = ['SALA', 'SALB', 'SALC'];
    const todos = {};
    await Promise.all(salas.map(async (code, r) => {
      todos[code] = await Promise.all([0, 1, 2, 3].map((i) => abrir(s.port, code, uid(r * 10 + i))));
    }));
    for (const code of salas) {
      const [host, ...resto] = todos[code];
      send(host, { t: 'create', code, name: 'H' + code });
      await esperar(150);
      for (const [i, c] of resto.entries()) send(c, { t: 'join', code, name: `${code}-${i}` });
    }
    await esperar(500);
    for (const code of salas) {
      const lobby = [...todos[code][0].log].reverse().find((m) => m.t === 'lobby');
      assert.equal(lobby.players.length, 4, `${code} tiene 4 jugadores`);
      assert.ok(lobby.players.every((p) => p.name.startsWith(code) || p.name === 'H' + code), `${code} sin jugadores de otra sala`);
    }
    for (const code of salas) send(todos[code][0], { t: 'start' });
    await hasta(() => salas.every((code) => todos[code].every((c) => c.log.some((m) => m.t === 'start'))));
    for (const code of salas) {
      const starts = todos[code].map((c) => c.log.find((m) => m.t === 'start'));
      assert.ok(starts.every(Boolean), `${code}: los 4 reciben su rol`);
      assert.equal(starts.filter((m) => m.role === 'impostor').length, 1, `${code}: un impostor`);
    }
    for (const c of Object.values(todos).flat()) c.ws.close();
  } finally { s.stop(); }
});

test('reconexión real: mismo id vuelve a la partida con su rol; el socket viejo se cierra', async () => {
  const s = await arrancar();
  try {
    const cs = await Promise.all([0, 1, 2, 3].map((i) => abrir(s.port, 'RECO', uid(200 + i))));
    send(cs[0], { t: 'create', code: 'RECO', name: 'H' }); await esperar(150);
    for (let i = 1; i < 4; i++) send(cs[i], { t: 'join', code: 'RECO', name: 'J' + i });
    await esperar(300); send(cs[0], { t: 'start' });
    await hasta(() => cs.every((c) => c.log.some((m) => m.t === 'start')));
    const rol = cs[2].log.find((m) => m.t === 'start').role;
    cs[2].ws.terminate(); await esperar(300);                              // se cae la red
    const nuevo = await abrir(s.port, 'RECO', uid(202));
    await hasta(() => nuevo.log.some((m) => m.t === 'start'));
    const st = nuevo.log.find((m) => m.t === 'start');
    assert.ok(st, 'recibe el estado de la partida');
    assert.equal(st.role, rol);
    assert.equal(st.resync, true);
    // dos sockets con el mismo id: el anterior se cierra y solo manda el nuevo
    const otro = await abrir(s.port, 'RECO', uid(202)); await esperar(300);
    assert.notEqual(nuevo.closed, null);
    for (const c of cs) c.ws.close(); otro.ws.close();
  } finally { s.stop(); }
});

/* ---- tope por IP ---- */
async function rafaga(port, n, headersDe) {
  const cs = [];
  for (let i = 0; i < n; i++) cs.push(await abrir(port, 'IPXX', uid(1000 + i), headersDe(i)));
  return cs;
}

test('límite por IP sin proxy de confianza: x-forwarded-for inventado NO esquiva el tope', async () => {
  const s = await arrancar({ TRUST_PROXY_HOPS: '0' });
  try {
    const cs = await rafaga(s.port, 34, (i) => ({ 'x-forwarded-for': `10.1.1.${i}` }));
    assert.equal(cs.filter((c) => c.closed === 4029).length, 4);           // 30 admitidas, 4 rechazadas
    cs.forEach((c) => c.ws.close());
  } finally { s.stop(); }
});

test('límite por IP detrás de 1 proxy: se cuenta la IP que añadió el proxy, no la que inventa el cliente', async () => {
  const s = await arrancar({ TRUST_PROXY_HOPS: '1' });
  try {
    // el cliente miente en la primera entrada; el proxy añade la real al final: siempre la misma
    const mismo = await rafaga(s.port, 33, (i) => ({ 'x-forwarded-for': `1.2.3.${i}, 203.0.113.7` }));
    assert.equal(mismo.filter((c) => c.closed === 4029).length, 3);
    // otro cliente real (otra IP al final) no se ve afectado por el tope del primero
    const otro = await abrir(s.port, 'IPXX', uid(5000), { 'x-forwarded-for': '203.0.113.8' });
    assert.equal(otro.closed, null);
    mismo.forEach((c) => c.ws.close()); otro.ws.close();
  } finally { s.stop(); }
});

test('en Render (RENDER definido) el cliente es la penúltima entrada: dos jugadores tras el mismo proxy NO comparten tope', async () => {
  const s = await arrancar({ RENDER: 'true' });                            // sin TRUST_PROXY_HOPS: manda el valor por defecto de Render
  try {
    const a = await rafaga(s.port, 32, (i) => ({ 'x-forwarded-for': `9.9.9.${i}, 198.51.100.4, 10.0.0.9` }));
    assert.equal(a.filter((c) => c.closed === 4029).length, 2);            // el mismo cliente real: tope de 30
    const b = await abrir(s.port, 'IPXX', uid(6000), { 'x-forwarded-for': '198.51.100.5, 10.0.0.9' });   // otro cliente, mismo proxy
    assert.equal(b.closed, null);                                           // si se contara la IP del proxy, estaría rechazado
    a.forEach((c) => c.ws.close()); b.ws.close();
  } finally { s.stop(); }
});

test('el tope por IP se libera al cerrar: se puede volver a conectar', async () => {
  const s = await arrancar();
  try {
    const cs = await rafaga(s.port, 30, () => ({}));
    assert.equal(cs.every((c) => c.closed === null), true);
    const rechazada = await abrir(s.port, 'IPXX', uid(7000));
    assert.equal(rechazada.closed, 4029);
    cs.slice(0, 5).forEach((c) => c.ws.close()); await esperar(300);
    const otra = await abrir(s.port, 'IPXX', uid(7001));
    assert.equal(otra.closed, null);
    cs.forEach((c) => c.ws.close()); otra.ws.close();
  } finally { s.stop(); }
});
