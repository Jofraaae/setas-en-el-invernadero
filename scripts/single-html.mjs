/* Convierte el build de Vite (dist/) en UN solo archivo HTML: setas.html
   - Mete dentro el JS y el CSS.
   - Convierte a data URI las miniaturas de /maps/*.svg (y el icono de la pestaña).
   Sin dependencias: solo Node. Uso:  npm run html
   El HTML se puede abrir con doble clic; para jugar hay que tener el servidor
   en marcha (npm run server). Desde file:// se conecta a http://localhost:8787. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.join(ROOT, 'dist');
const PUBLIC = process.env.PUBLIC_DIR ? path.resolve(process.env.PUBLIC_DIR) : path.join(ROOT, 'public');
const OUT = process.env.OUT_FILE ? path.resolve(process.env.OUT_FILE) : path.join(ROOT, 'setas.html');

const indexFile = path.join(DIST, 'index.html');
if (!fs.existsSync(indexFile)) {
  console.error('No existe dist/index.html. Ejecuta primero `npm run build` (o usa `npm run html`).');
  process.exit(1);
}

const readAsset = (ref) => {
  const clean = ref.split(/[?#]/)[0].replace(/^\.?\//, '');
  const file = path.join(DIST, clean);
  if (!file.startsWith(DIST) || !fs.existsSync(file)) throw new Error(`Falta el archivo ${ref} en dist/`);
  return fs.readFileSync(file, 'utf8');
};

let html = fs.readFileSync(indexFile, 'utf8');

// CSS: <link rel="stylesheet" href="..."> -> <style>
html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, (tag) => {
  const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
  if (!href || /^https?:/i.test(href)) return tag;
  return `<style>\n${readAsset(href)}\n</style>`;
});

// precargas de módulos: ya no hacen falta
html = html.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>\s*/gi, '');

// JS: <script src="..."></script> -> <script> inline (sin cerrar el tag por accidente)
html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (tag, src) => {
  if (/^https?:/i.test(src)) return tag;
  const isModule = /type=["']module["']/i.test(tag);
  const code = readAsset(src).replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
  return `<script${isModule ? ' type="module"' : ''}>\n${code}\n</script>`;
});

// Archivos de public/ referenciados con ruta absoluta (/maps/x.svg): data URI.
const MIME = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
const publicFiles = [];
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (MIME[path.extname(full).toLowerCase()]) publicFiles.push(full);
  }
})(PUBLIC);

let inlined = 0;
for (const file of publicFiles) {
  const urlPath = '/' + path.relative(PUBLIC, file).split(path.sep).join('/');
  const uri = `data:${MIME[path.extname(file).toLowerCase()]};base64,${fs.readFileSync(file).toString('base64')}`;
  const before = html;
  html = html.split(urlPath).join(uri); // split/join: sin problemas con "$" ni regex
  if (html !== before) inlined += 1;
}

// Aviso si quedó algo que cargar por red local (se rompería con file://)
const leftovers = [...html.matchAll(/(?:src|href)=["'](\/[^"'][^"']*)["']/gi)].map((m) => m[1]);
if (leftovers.length) console.warn('Aviso: quedan rutas absolutas sin incluir:', leftovers.join(', '));

fs.writeFileSync(OUT, html);
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`✔ ${path.relative(process.cwd(), OUT) || OUT} (${kb} KB) · ${inlined} recurso(s) de public/ incluidos`);
console.log('  Ábrelo con doble clic y arranca el servidor con: npm run server  (http://localhost:8787)');
