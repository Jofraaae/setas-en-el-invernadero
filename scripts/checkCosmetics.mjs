#!/usr/bin/env node
/* Comprueba que el catálogo del cliente (src/lib/game/cosmetics.js) y la lista blanca del servidor
   (server/cosmetics.mjs) tienen exactamente los mismos accesorios, que cada uno tiene nombre y
   dibujo, y que se dibujan sin errores. Uso: node scripts/checkCosmetics.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOK_SLOTS as SERVER, cleanLook as srvClean } from '../server/cosmetics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'src/lib/game/cosmetics.js'), 'utf8')
  .replace(/import \{ trMark \} from '@\/lib\/i18n';/, 'const trMark = (s) => s;');
const tmp = path.join(ROOT, 'node_modules/.cache');
fs.mkdirSync(tmp, { recursive: true });
const file = path.join(tmp, 'cosmetics.check.mjs');
fs.writeFileSync(file, src);
const C = await import(file + '?' + Date.now());
fs.rmSync(file);

let bad = 0;
const fail = (m) => { bad++; console.log('✖', m); };
for (const slot of C.LOOK_SLOTS) {
  const cli = C.CATEGORIES.find((c) => c.id === slot).items.map((i) => i.id);
  const srv = SERVER[slot] || [];
  for (const id of cli) if (!srv.includes(id)) fail(`${slot}/${id}: está en el cliente pero no en el servidor`);
  for (const id of srv) if (!cli.includes(id)) fail(`${slot}/${id}: está en el servidor pero no en el cliente`);
  if (new Set(cli).size !== cli.length) fail(`${slot}: ids repetidos`);
  if (cli.length < 1) fail(`${slot}: categoría vacía`);
}
for (const slot of Object.keys(SERVER)) if (!C.LOOK_SLOTS.includes(slot)) fail(`${slot}: categoría solo en el servidor`);

// dibujo: un contexto falso que acepta cualquier llamada
const calls = { n: 0 };
const ctx = new Proxy({}, { get: (_, k) => (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : (...a) => { calls.n++; }), set: () => true });
for (const cat of C.CATEGORIES.filter((c) => c.items)) {
  for (const it of cat.items) {
    if (!it.name) fail(`${cat.id}/${it.id}: sin nombre`);
    const before = calls.n;
    for (const layer of ['back', 'suit', 'pre', 'top', 'face', 'post']) {
      try { C.drawLookLayer(ctx, { [cat.id]: it.id }, layer, 1.3); } catch (e) { fail(`${cat.id}/${it.id}: ${e.message}`); }
    }
    if (calls.n === before) fail(`${cat.id}/${it.id}: no dibuja nada`);
  }
}
// el cliente y el servidor limpian igual
const probe = { hat: 'witch', face: 'nope', back: 'cape', extra: 'x', suit: 5 };
if (JSON.stringify(C.cleanLook(probe)) !== JSON.stringify(srvClean(probe))) fail('cleanLook difiere entre cliente y servidor');

const total = C.CATEGORIES.reduce((n, c) => n + (c.items ? c.items.length : 0), 0);
console.log(bad ? `✖ ${bad} problema(s)` : `✔ ${total} accesorios en ${C.LOOK_SLOTS.length} categorías, cliente y servidor coinciden`);
process.exit(bad ? 1 : 0);
