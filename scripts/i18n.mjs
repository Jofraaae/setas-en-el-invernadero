#!/usr/bin/env node
/* Herramienta de traducciones.
     node scripts/i18n.mjs keys    → lista los textos de origen (español) que hay en src/
     node scripts/i18n.mjs check   → comprueba que cada idioma tiene todos los textos,
                                      sin sobrantes y con los mismos {huecos}.
   Los textos de origen son los literales de tr('…'), trMark('…') y trNodes('…') (incluida la
   lista de textos del servidor en src/lib/i18n/serverText.js). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const LOCALES = path.join(SRC, 'lib/i18n/locales');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (p !== LOCALES) walk(p, out); }
    else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

// Interpreta un literal de JS ('…', "…" o `…` sin ${}) tal como lo haría el motor.
function unescape(body) {
  return body.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, c) => {
    if (c[0] === 'u' && c.length === 5) return String.fromCharCode(parseInt(c.slice(1), 16));
    if (c[0] === 'x' && c.length === 3) return String.fromCharCode(parseInt(c.slice(1), 16));
    return { n: '\n', t: '\t', r: '\r' }[c] ?? c;
  });
}

export function collectKeys() {
  const keys = new Map(); // texto → archivos donde se usa
  const re = /\b(?:tr|trMark|trNodes)\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const file of walk(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(re)) {
      if (m[1] === '`' && m[2].includes('${')) continue;
      const k = unescape(m[2]);
      if (!keys.has(k)) keys.set(k, new Set());
      keys.get(k).add(path.relative(SRC, file));
    }
  }
  return keys;
}

const holes = (s) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort().join(',');

function langCodes() {
  const src = fs.readFileSync(path.join(SRC, 'lib/i18n/languages.js'), 'utf8');
  return [...src.matchAll(/\{ code: '([^']+)'/g)].map((m) => m[1]).filter((c) => c !== 'es');
}

const cmd = process.argv[2];
if (cmd === 'keys') {
  const keys = collectKeys();
  console.log(JSON.stringify([...keys].map(([key, files]) => ({ key, files: [...files] })), null, 1));
} else if (cmd === 'check') {
  const keys = collectKeys();
  let bad = 0;
  for (const code of langCodes()) {
    const f = path.join(LOCALES, `${code}.json`);
    if (!fs.existsSync(f)) { console.log(`✖ ${code}: falta el archivo`); bad++; continue; }
    let d;
    try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log(`✖ ${code}: JSON no válido (${e.message})`); bad++; continue; }
    const missing = [], broken = [], empty = [];
    for (const k of keys.keys()) {
      if (!(k in d)) { missing.push(k); continue; }
      if (typeof d[k] !== 'string' || !d[k].trim()) { empty.push(k); continue; }
      if (holes(d[k]) !== holes(k)) broken.push(k);
    }
    const extra = Object.keys(d).filter((k) => !keys.has(k));
    const ok = !missing.length && !broken.length && !empty.length && !extra.length;
    console.log(`${ok ? '✔' : '✖'} ${code}: ${keys.size - missing.length - empty.length}/${keys.size}` +
      (missing.length ? ` · faltan ${missing.length}` : '') + (empty.length ? ` · vacíos ${empty.length}` : '') +
      (broken.length ? ` · {huecos} distintos ${broken.length}` : '') + (extra.length ? ` · sobrantes ${extra.length}` : ''));
    if (!ok) {
      bad++;
      for (const k of missing.slice(0, 5)) console.log(`    falta: ${JSON.stringify(k)}`);
      for (const k of broken.slice(0, 5)) console.log(`    huecos: ${JSON.stringify(k)} → ${JSON.stringify(d[k])}`);
      for (const k of extra.slice(0, 5)) console.log(`    sobra: ${JSON.stringify(k)}`);
    }
  }
  process.exit(bad ? 1 : 0);
} else {
  console.log('Uso: node scripts/i18n.mjs keys | check');
}
