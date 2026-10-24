/* El dibujo de la aldea de Micelaria: caminos, plaza de la Asamblea con su tarima, tejados de
   seta que rodean cada casa, orillas del arroyo, puente, vado y el adorno de cada sala por
   dentro. Solo pinta: la geometría sale de server/mapMicelaria.mjs, la misma que usa el motor,
   así que lo que se ve y lo que se pisa no pueden separarse. */

import { MICELARIA_ART as ART } from '../../../server/mapMicelaria.mjs';
import { blob, blade, dome, rr } from './micelariaArt';

const TAU = Math.PI * 2;
const { OUTDOORS, RIVER, POND, DOOR_DEFS, PATHS, CAPTIONS, WATERS, PLAZA } = ART;
const inWater = (x, y, m = 0) => WATERS.some((w) => inPoly(w, x, y) || (m && polyDist(w, x, y) < m));

/* ---------------- utilidades de geometría ---------------- */

export function inPoly(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}
function polyDist(pts, x, y) {
  let d = 1e9;
  for (let i = 0; i < pts.length; i++) d = Math.min(d, segDist(x, y, pts[i], pts[(i + 1) % pts.length]));
  return d;
}
const polyPath = (c, pts) => { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); };

// recorre el borde de un contorno cerrado cada `step` px dando punto, tangente y normal hacia dentro
function walk(pts, step, cb) {
  let carry = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    if (!len) continue;
    const tx = dx / len, ty = dy / len;
    let nx = -ty, ny = tx;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (!inPoly(pts, mx + nx * 4, my + ny * 4)) { nx = -nx; ny = -ny; }
    for (let d = step - carry; d < len; d += step) cb(a[0] + tx * d, a[1] + ty * d, tx, ty, nx, ny);
    carry = (carry + len) % step;
  }
}
// línea abierta suavizada (cada punto medio es un nodo de la curva)
function curve(c, pts) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  const l = pts[pts.length - 1];
  c.lineTo(l[0], l[1]);
}
const flr = (floors, k) => floors.find((f) => f[7] && f[7].key === k);
const roomsOf = (floors) => floors.filter((f) => f[7] && f[7].room);

/* ---------------- árboles (los usan el bosque de fondo y el objeto «tree») ---------------- */

const TREE_PAL = [
  ['#173620', '#245530', '#38793e', '#5aa653'],
  ['#1a3b2b', '#285a42', '#3d8059', '#66aa7e'],
  ['#1f3d1f', '#31602b', '#4d8a39', '#7ab34c'],
  ['#3a2a18', '#7a3f1d', '#b8662a', '#e3a04c'], // otoño
];
export function treeSprite(c, x, y, R, pal, seed = 1) {
  const k = (n) => Math.sin(seed * 12.9898 + n * 78.233) * 0.5 + 0.5;
  c.fillStyle = 'rgba(4,12,8,.34)';
  c.beginPath(); c.ellipse(x + R * 0.12, y + R * 0.46, R * 0.95, R * 0.55, 0, 0, TAU); c.fill();
  const lobes = [[-0.36, 0.1, 0.7], [0.36, 0.06, 0.66], [0, -0.3, 0.68], [0.02, 0.34, 0.6]];
  c.fillStyle = pal[0];
  for (const [dx, dy, s] of lobes) { c.beginPath(); c.arc(x + dx * R, y + dy * R, s * R, 0, TAU); c.fill(); }
  c.fillStyle = pal[1];
  for (const [dx, dy, s] of lobes) { c.beginPath(); c.arc(x + dx * R * 0.9, y + dy * R * 0.9 - R * 0.06, s * R * 0.78, 0, TAU); c.fill(); }
  c.fillStyle = pal[2];
  for (const [dx, dy, s] of lobes.slice(0, 3)) { c.beginPath(); c.arc(x + dx * R * 0.8 - R * 0.05, y + dy * R * 0.8 - R * 0.16, s * R * 0.5, 0, TAU); c.fill(); }
  c.fillStyle = pal[3];
  c.globalAlpha = 0.5;
  c.beginPath(); c.arc(x - R * 0.2, y - R * 0.42, R * 0.26, 0, TAU); c.fill();
  c.globalAlpha = 1;
  // hojas sueltas y alguna seta colgada
  c.fillStyle = 'rgba(0,0,0,.14)';
  for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(x + (k(i) - 0.5) * R * 1.3, y + (k(i + 9) - 0.3) * R * 0.9, 2 + k(i + 3) * 3, 0, TAU); c.fill(); }
  if (k(40) > 0.7) {
    c.fillStyle = '#d9573f'; dome(c, x + R * 0.32, y + R * 0.1, 7, 6); c.fill();
    c.fillStyle = 'rgba(255,244,222,.9)'; c.beginPath(); c.arc(x + R * 0.3, y + R * 0.05, 1.6, 0, TAU); c.fill();
  }
}

/* ---------------- el bosque que rodea la aldea ---------------- */

function deepForest(c, r, floors) {
  const rooms = roomsOf(floors).map((f) => f[7].poly);
  for (let i = 0; i < 900; i++) {
    const x = r() * 4400, y = r() * 2800, R = 26 + r() * 22;
    if (inPoly(OUTDOORS, x, y) || polyDist(OUTDOORS, x, y) < 36) continue;
    if (inWater(x, y, R + 30)) continue;
    if (rooms.some((p) => inPoly(p, x, y) || polyDist(p, x, y) < R + 70)) continue;
    treeSprite(c, x, y, R, i % 9 === 0 ? TREE_PAL[3] : TREE_PAL[i % 3], i * 1.7);
  }
}

/* ---------------- pradera: flores, piedras y matas, solo en el exterior ---------------- */

function meadow(c, r, floors) {
  const rooms = roomsOf(floors).map((f) => f[7].poly);
  const ok = (x, y, m = 0) => inPoly(OUTDOORS, x, y) && !inWater(x, y, m) && !rooms.some((p) => inPoly(p, x, y) || polyDist(p, x, y) < m);
  // manchas grandes de tonos distintos: claros, sombras de árbol, trébol
  for (let i = 0; i < 150; i++) {
    const x = 200 + r() * 4000, y = 200 + r() * 2400;
    if (!ok(x, y, 20)) continue;
    c.fillStyle = i % 3 === 0 ? 'rgba(30,70,38,.22)' : i % 3 === 1 ? 'rgba(150,190,96,.14)' : 'rgba(88,140,70,.2)';
    blob(c, x, y, 70 + r() * 150, 10, i * 2.3, 0.7); c.fill();
  }
  // matas altas
  for (let i = 0; i < 380; i++) {
    const x = 200 + r() * 4000, y = 200 + r() * 2400;
    if (!ok(x, y, 30)) continue;
    for (let k = 0; k < 5; k++) blade(c, x + (r() - 0.5) * 26, y + (r() - 0.5) * 16, 5 + r() * 8, r() > 0.5);
  }
  // flores y tréboles en corros
  const cols = ['#f3e8b0', '#e8a6d0', '#b4e0ff', '#ffd27a', '#ffffff'];
  for (let i = 0; i < 90; i++) {
    const x = 220 + r() * 3960, y = 240 + r() * 2320;
    if (!ok(x, y, 40)) continue;
    const col = cols[Math.floor(r() * cols.length)];
    for (let k = 0; k < 9; k++) {
      const px = x + (r() - 0.5) * 70, py = y + (r() - 0.5) * 50;
      c.fillStyle = 'rgba(40,90,44,.7)'; c.fillRect(px - 0.8, py, 1.6, 6);
      c.fillStyle = col; c.beginPath(); c.arc(px, py, 2.4 + r() * 1.6, 0, TAU); c.fill();
      c.fillStyle = '#f6c84a'; c.beginPath(); c.arc(px, py, 1, 0, TAU); c.fill();
    }
  }
  // piedras sueltas
  for (let i = 0; i < 160; i++) {
    const x = 200 + r() * 4000, y = 200 + r() * 2400;
    if (!ok(x, y, 36)) continue;
    const R = 5 + r() * 9;
    c.fillStyle = 'rgba(0,0,0,.22)'; blob(c, x + 2, y + 3, R, 7, i, 0.7); c.fill();
    c.fillStyle = r() > 0.5 ? '#8a8f84' : '#767c72'; blob(c, x, y, R, 7, i, 0.72); c.fill();
    c.fillStyle = 'rgba(255,255,255,.2)'; blob(c, x - R * 0.2, y - R * 0.3, R * 0.5, 6, i, 0.7); c.fill();
  }
  // corros de setas
  for (let i = 0; i < 26; i++) {
    const x = 260 + r() * 3880, y = 280 + r() * 2240;
    if (!ok(x, y, 90)) continue;
    const R = 26 + r() * 14;
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU + i;
      const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R * 0.8;
      c.fillStyle = '#e8dcbf'; c.fillRect(px - 1.4, py, 2.8, 7);
      c.fillStyle = ['#c9573f', '#d9a15a', '#a86b9c'][k % 3]; dome(c, px, py, 6.5, 5.5); c.fill();
    }
  }
}

/* ---------------- caminos de lajas ---------------- */

function paths(c, r, floors) {
  c.save();
  // los caminos no pisan plazas, edificios ni agua: se cortan en sus bordes
  c.beginPath();
  c.rect(0, 0, 4400, 2800);
  c.arc(PLAZA.x, PLAZA.y, 336, 0, TAU);
  for (const f of roomsOf(floors)) f[7].poly.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
  c.clip('evenodd');
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const p of PATHS) {
    for (const [w, col] of [[112, 'rgba(34,24,10,.2)'], [96, '#7d6846'], [84, '#a38c64'], [68, '#b39b71']]) {
      c.strokeStyle = col; c.lineWidth = w; curve(c, p); c.stroke();
    }
  }
  // lajas y guijarros sobre el camino
  for (const p of PATHS) {
    for (let i = 0; i + 1 < p.length; i++) {
      const a = p[i], b = p[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
      for (let d = 0; d < len; d += 20 + r() * 16) {
        const off = (r() - 0.5) * 70;
        const x = a[0] + ((b[0] - a[0]) * d) / len + nx * off, y = a[1] + ((b[1] - a[1]) * d) / len + ny * off;
        const R = 5 + r() * 8;
        c.fillStyle = 'rgba(40,28,12,.2)'; blob(c, x + 1, y + 2, R, 7, d, 0.7); c.fill();
        c.fillStyle = ['#c1aa80', '#b49c72', '#cdb88e', '#9e8962'][Math.floor(r() * 4)];
        blob(c, x, y, R, 7, d + 1, 0.72); c.fill();
        c.fillStyle = 'rgba(255,250,225,.2)'; blob(c, x - R * 0.25, y - R * 0.3, R * 0.5, 6, d, 0.7); c.fill();
      }
    }
  }
  // hierba que invade los bordes
  for (const p of PATHS) {
    for (let i = 0; i + 1 < p.length; i++) {
      const a = p[i], b = p[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
      for (let d = 0; d < len; d += 14 + r() * 12) {
        const side = r() > 0.5 ? 1 : -1, off = side * (40 + r() * 8);
        blade(c, a[0] + ((b[0] - a[0]) * d) / len + nx * off, a[1] + ((b[1] - a[1]) * d) / len + ny * off, 4 + r() * 6, r() > 0.5);
      }
    }
  }
  c.restore();
}

/* ---------------- la plaza de la Asamblea y su tarima ---------------- */

function plaza(c, r) {
  const { x, y } = PLAZA;
  // resplandor cálido alrededor de la tarima
  let g = c.createRadialGradient(x, y, 40, x, y, 330);
  g.addColorStop(0, 'rgba(255,214,140,.30)'); g.addColorStop(1, 'rgba(255,214,140,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, 330, 0, TAU); c.fill();
  // corona de losetas en cuña
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    c.fillStyle = i % 2 ? '#b19a6c' : '#c2ab7c';
    c.beginPath(); c.arc(x, y, 318, a0, a1); c.arc(x, y, 238, a1, a0, true); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(70,52,28,.35)'; c.lineWidth = 2; c.stroke();
  }
  // bordillo exterior
  for (const [rad, w, col] of [[336, 16, '#5f5238'], [336, 11, '#9a8860'], [334, 4, 'rgba(255,245,215,.35)']]) {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.stroke();
  }
  c.strokeStyle = 'rgba(60,44,22,.55)'; c.lineWidth = 3;
  c.beginPath(); c.arc(x, y, 238, 0, TAU); c.stroke();
  // ocho radios dorados que llevan al centro
  c.strokeStyle = '#d9b25a'; c.lineWidth = 7; c.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + TAU / 16;
    c.beginPath(); c.moveTo(x + Math.cos(a) * 140, y + Math.sin(a) * 140); c.lineTo(x + Math.cos(a) * 236, y + Math.sin(a) * 236); c.stroke();
  }
  c.strokeStyle = 'rgba(255,240,190,.5)'; c.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + TAU / 16;
    c.beginPath(); c.moveTo(x + Math.cos(a) * 140, y + Math.sin(a) * 140); c.lineTo(x + Math.cos(a) * 236, y + Math.sin(a) * 236); c.stroke();
  }
  c.lineCap = 'butt';
  // setas de mosaico entre los radios
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, px = x + Math.cos(a) * 190, py = y + Math.sin(a) * 190;
    c.save(); c.translate(px, py); c.rotate(a + Math.PI / 2);
    c.fillStyle = '#efe3c3'; rr(c, -5, 0, 10, 20, 3); c.fill();
    c.fillStyle = i % 2 ? '#c9573f' : '#a8302c'; dome(c, 0, 2, 20, 17); c.fill();
    c.fillStyle = 'rgba(255,244,222,.9)';
    c.beginPath(); c.arc(-6, -6, 2.8, 0, TAU); c.arc(5, -9, 2.2, 0, TAU); c.arc(8, -1, 2, 0, TAU); c.fill();
    c.restore();
  }
  // tarima: tres escalones de piedra
  c.fillStyle = 'rgba(0,0,0,.32)'; c.beginPath(); c.ellipse(x + 5, y + 10, 128, 120, 0, 0, TAU); c.fill();
  for (const [rad, col, hi] of [[122, '#6f6a5c', '#8d8878'], [108, '#8d8878', '#b0aa98'], [94, '#a29c88', '#c9c3ae']]) {
    c.fillStyle = col; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill();
    c.strokeStyle = hi; c.lineWidth = 3; c.beginPath(); c.arc(x, y - 1, rad - 1.5, Math.PI * 1.05, Math.PI * 1.9); c.stroke();
    c.strokeStyle = 'rgba(30,26,18,.5)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.stroke();
  }
  // disco central: la seta de las reuniones sobre un anillo rojo
  c.fillStyle = '#8c2a28'; c.beginPath(); c.arc(x, y, 80, 0, TAU); c.fill();
  c.fillStyle = '#c33f36'; c.beginPath(); c.arc(x, y, 72, 0, TAU); c.fill();
  c.fillStyle = '#e8dcbf'; c.beginPath(); c.arc(x, y, 62, 0, TAU); c.fill();
  c.fillStyle = '#d9cba8'; c.beginPath(); c.arc(x, y, 54, 0, TAU); c.fill();
  c.fillStyle = '#a8302c';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 67, y + Math.sin(a) * 67, 4.4, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,244,222,.95)';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + 0.26; c.beginPath(); c.arc(x + Math.cos(a) * 77, y + Math.sin(a) * 77, 2.4, 0, TAU); c.fill(); }
  // la leyenda, grabada en el primer escalón
  c.save();
  c.font = '800 15px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const txt = 'ASAMBLEA · ASAMBLEA · ASAMBLEA · ';
  const rad = 101;
  c.fillStyle = 'rgba(40,34,22,.7)';
  for (let i = 0; i < txt.length; i++) {
    const a = (i / txt.length) * TAU - Math.PI / 2;
    c.save(); c.translate(x + Math.cos(a) * rad, y + Math.sin(a) * rad); c.rotate(a + Math.PI / 2);
    c.fillText(txt[i], 0, 0); c.restore();
  }
  c.restore();
}

/* ---------------- adornos por sala ---------------- */

function rugRound(c, x, y, R, base, band) {
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.arc(x + 4, y + 6, R, 0, TAU); c.fill();
  c.fillStyle = base; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
  c.strokeStyle = band; c.lineWidth = 9; c.beginPath(); c.arc(x, y, R - 14, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(255,240,210,.55)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, R - 30, 0, TAU); c.stroke();
  c.fillStyle = band;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; c.save(); c.translate(x + Math.cos(a) * (R - 14), y + Math.sin(a) * (R - 14)); c.rotate(a + Math.PI / 4); c.fillRect(-5, -5, 10, 10); c.restore(); }
  c.fillStyle = 'rgba(255,240,210,.5)'; c.beginPath(); c.arc(x, y, R * 0.3, 0, TAU); c.fill();
  c.fillStyle = base; c.beginPath(); c.arc(x, y, R * 0.22, 0, TAU); c.fill();
}
function rugRect(c, cx, cy, w, h, base, band) {
  c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, cx - w / 2 + 4, cy - h / 2 + 6, w, h, 14); c.fill();
  c.fillStyle = base; rr(c, cx - w / 2, cy - h / 2, w, h, 14); c.fill();
  c.strokeStyle = band; c.lineWidth = 7; rr(c, cx - w / 2 + 12, cy - h / 2 + 12, w - 24, h - 24, 8); c.stroke();
  c.strokeStyle = 'rgba(255,240,210,.5)'; c.lineWidth = 2; rr(c, cx - w / 2 + 24, cy - h / 2 + 24, w - 48, h - 48, 5); c.stroke();
  c.fillStyle = band;
  for (let i = 0; i < 6; i++) { c.save(); c.translate(cx - w / 2 + w * (0.12 + i * 0.152), cy); c.rotate(Math.PI / 4); c.fillRect(-6, -6, 12, 12); c.restore(); }
}
function crystal(c, x, y, s, col) {
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x + 2, y + s * 0.5, s * 0.7, s * 0.22, 0, 0, TAU); c.fill();
  const g = c.createRadialGradient(x, y - s * 0.4, 1, x, y - s * 0.4, s * 2);
  g.addColorStop(0, col + '55'); g.addColorStop(1, col + '00');
  c.fillStyle = g; c.beginPath(); c.arc(x, y - s * 0.4, s * 2, 0, TAU); c.fill();
  for (const [dx, k] of [[-s * 0.45, 0.7], [0, 1], [s * 0.42, 0.6]]) {
    c.fillStyle = col; c.beginPath(); c.moveTo(x + dx - s * 0.2, y); c.lineTo(x + dx, y - s * k); c.lineTo(x + dx + s * 0.2, y); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(x + dx - s * 0.2, y); c.lineTo(x + dx, y - s * k); c.lineTo(x + dx - s * 0.02, y); c.closePath(); c.fill();
  }
}
function pallet(c, x, y, w, h) {
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + 3, y + 5, w, h);
  for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#8e6c42' : '#9d7a4c'; c.fillRect(x, y + i * (h / 5), w, h / 5 - 2); }
  c.fillStyle = 'rgba(40,24,10,.35)'; c.fillRect(x + 12, y, 10, h); c.fillRect(x + w - 22, y, 10, h);
}

function interiors(c, floors, r) {
  let f;
  if ((f = flr(floors, 'casaSeta'))) rugRound(c, 905, 885, 150, '#8c3a34', '#d9a95a');
  if ((f = flr(floors, 'casaTe'))) rugRect(c, 2265, 640, 320, 150, '#46508c', '#e0c27a');
  if ((f = flr(floors, 'taller'))) { // serrín y virutas
    for (let i = 0; i < 160; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(236,206,150,.28)' : 'rgba(150,110,60,.22)';
      c.beginPath(); c.ellipse(380 + r() * 600, 1420 + r() * 220, 3 + r() * 9, 1.6 + r() * 4, r() * TAU, 0, TAU); c.fill();
    }
    for (let i = 0; i < 60; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(236,206,150,.28)' : 'rgba(150,110,60,.22)';
      c.beginPath(); c.ellipse(560 + r() * 240, 1690 + r() * 220, 3 + r() * 8, 1.6 + r() * 4, r() * TAU, 0, TAU); c.fill();
    }
  }
  if ((f = flr(floors, 'molino'))) { // polvo de harina y la muela en el suelo
    const x = 2640, y = 1200;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x + 3, y + 6, 84, 78, 0, 0, TAU); c.fill();
    c.fillStyle = '#8f8a7c'; c.beginPath(); c.arc(x, y, 78, 0, TAU); c.fill();
    c.fillStyle = '#a8a393'; c.beginPath(); c.arc(x, y, 68, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(60,56,48,.3)'; c.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; c.beginPath(); c.moveTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); c.lineTo(x + Math.cos(a) * 66, y + Math.sin(a) * 66); c.stroke(); }
    c.fillStyle = '#6f6a5e'; c.beginPath(); c.arc(x, y, 13, 0, TAU); c.fill();
    c.fillStyle = 'rgba(245,238,215,.3)';
    for (let i = 0; i < 40; i++) { c.beginPath(); c.ellipse(2520 + r() * 340, 1090 + r() * 300, 8 + r() * 14, 5 + r() * 7, r() * 3, 0, TAU); c.fill(); }
  }
  if ((f = flr(floors, 'almacen'))) {
    pallet(c, 1940, 2185, 110, 100); pallet(c, 1690, 2190, 120, 86); pallet(c, 2430, 2370, 150, 90);
  }
  if ((f = flr(floors, 'observatorio'))) { // mapa del cielo grabado en el suelo
    const x = 1300, y = 1850;
    c.strokeStyle = 'rgba(232,200,120,.55)'; c.lineWidth = 3;
    for (const R of [180, 138, 96]) { c.beginPath(); c.arc(x, y, R, 0, TAU); c.stroke(); }
    c.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.beginPath(); c.moveTo(x + Math.cos(a) * 96, y + Math.sin(a) * 96); c.lineTo(x + Math.cos(a) * 180, y + Math.sin(a) * 180); c.stroke(); }
    c.fillStyle = 'rgba(232,200,120,.6)';
    c.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU - Math.PI / 2, R = i % 2 ? 24 : 62; c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); }
    c.closePath(); c.fill();
  }
  if ((f = flr(floors, 'estacion'))) { // raíces luminosas que acaban en el corazón
    const x = 3750, y = 1000;
    c.strokeStyle = 'rgba(120,240,225,.35)'; c.lineWidth = 3;
    for (const R of [270, 200]) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); } c.closePath(); c.stroke(); }
    c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6, sx = x + Math.cos(a) * 270, sy = y + Math.sin(a) * 270;
      for (const [w, col] of [[16, 'rgba(60,200,190,.10)'], [6, 'rgba(120,240,225,.35)'], [2.2, 'rgba(210,255,248,.7)']]) {
        c.strokeStyle = col; c.lineWidth = w;
        c.beginPath(); c.moveTo(sx, sy); c.bezierCurveTo(sx + (x - sx) * 0.2, sy + (y - sy) * 0.8, sx + (x - sx) * 0.8, sy + (y - sy) * 0.2, x, y); c.stroke();
      }
    }
    c.lineCap = 'butt';
    const g = c.createRadialGradient(x, y, 10, x, y, 200);
    g.addColorStop(0, 'rgba(120,255,235,.35)'); g.addColorStop(1, 'rgba(120,255,235,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 200, 0, TAU); c.fill();
  }
  if ((f = flr(floors, 'cueva'))) {
    for (const [x, y, s, col] of [[3480, 1900, 34, '#52e3d2'], [3920, 1820, 30, '#a07df0'], [3470, 2200, 28, '#a07df0'], [3950, 2090, 32, '#52e3d2'], [3690, 1780, 24, '#52e3d2'], [3630, 2120, 26, '#a07df0']]) crystal(c, x, y, s, col);
  }
}

/* ---------------- ambientes del exterior ---------------- */

function zones(c, r) {
  // pantano: barro oscuro y charcos
  for (const [x, y, R] of [[400, 470, 150], [690, 400, 115], [520, 600, 110], [790, 500, 80]]) {
    c.fillStyle = 'rgba(46,38,22,.5)'; blob(c, x, y, R, 12, x, 0.72); c.fill();
    c.fillStyle = 'rgba(70,92,56,.35)'; blob(c, x + 6, y - 4, R * 0.7, 10, y, 0.7); c.fill();
  }
  // claro de las luciérnagas: corro de piedras y flores
  const cx = 2500, cy = 1800;
  c.fillStyle = 'rgba(214,236,150,.14)'; c.beginPath(); c.arc(cx, cy, 190, 0, TAU); c.fill();
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU;
    c.fillStyle = 'rgba(0,0,0,.22)'; blob(c, cx + Math.cos(a) * 170 + 2, cy + Math.sin(a) * 140 + 3, 13, 7, i * 1.3, 0.8); c.fill();
    c.fillStyle = i % 2 ? '#8b8f84' : '#a2a698'; blob(c, cx + Math.cos(a) * 170, cy + Math.sin(a) * 140, 12, 7, i * 1.3, 0.8); c.fill();
    c.fillStyle = ['#f3e8b0', '#e2b2d6', '#b4e0ff'][i % 3];
    c.beginPath(); c.arc(cx + Math.cos(a + 0.14) * 120, cy + Math.sin(a + 0.14) * 100, 3.2, 0, TAU); c.fill();
  }
  // cascada: piedras mojadas a la orilla
  for (let i = 0; i < 30; i++) {
    const x = 2900 + r() * 200, y = 340 + r() * 480, R = 8 + r() * 14;
    if (inWater(x, y, 20)) continue;
    c.fillStyle = 'rgba(20,40,44,.4)'; blob(c, x + 2, y + 3, R, 7, i, 0.7); c.fill();
    c.fillStyle = r() > 0.5 ? '#5f6a66' : '#6f7a75'; blob(c, x, y, R, 7, i, 0.72); c.fill();
    c.fillStyle = 'rgba(160,220,225,.25)'; blob(c, x - R * 0.2, y - R * 0.3, R * 0.5, 6, i, 0.7); c.fill();
  }
  // hojarasca del bosque del oeste
  for (let i = 0; i < 200; i++) {
    const x = 250 + r() * 420, y = 800 + r() * 560;
    if (!inPoly(OUTDOORS, x, y)) continue;
    c.fillStyle = ['rgba(168,63,54,.35)', 'rgba(217,161,90,.32)', 'rgba(123,75,143,.28)'][i % 3];
    c.beginPath(); c.ellipse(x, y, 4 + r() * 4, 2 + r() * 2, r() * TAU, 0, TAU); c.fill();
  }
}

function captions(c) {
  c.font = '700 26px system-ui'; c.textAlign = 'center';
  for (const t of CAPTIONS) {
    const tw = c.measureText(t.name).width;
    c.fillStyle = 'rgba(20,38,20,.4)'; rr(c, t.x - tw / 2 - 16, t.y - 23, tw + 32, 32, 8); c.fill();
    c.fillStyle = 'rgba(255,250,228,.7)'; c.fillText(t.name, t.x, t.y);
  }
}

/* ---------------- decorados del suelo (debajo de objetos y muros) ---------------- */

export function villageDecor(c, floors, r) {
  deepForest(c, r, floors);
  meadow(c, r, floors);
  zones(c, r);
  paths(c, r, floors);
  plaza(c, r);
  interiors(c, floors, r);
  captions(c);
}

/* ---------------- tejados de seta y orillas (encima de todo lo estático) ---------------- */

const CAPS = {
  capRed: { dark: '#5e1618', mid: '#a82a2a', light: '#cf4638', hi: '#e8694d', spot: '#fff4de' },
  capViolet: { dark: '#2f1a55', mid: '#583493', light: '#7b52b8', hi: '#9a72d4', spot: '#f4eaff' },
  capOrange: { dark: '#6b2c0c', mid: '#b4561a', light: '#d4752c', hi: '#ef9a4a', spot: '#fff0cc' },
  capBlue: { dark: '#16254f', mid: '#2b4a8c', light: '#4670b8', hi: '#6e96dc', spot: '#eaf3ff' },
};

function doorBlocks(room) {
  return DOOR_DEFS.filter((d) => d.key === room).map((d) => ({ cx: d.box[0] + d.box[2] / 2, cy: d.box[1] + d.box[3] / 2 }));
}

// el anillo del tejado: los 40 px de muro de cada casa pintados como el sombrero de una seta
function capRing(c, f, r) {
  const o = f[7], pal = CAPS[o.wall], pts = o.poly;
  // sombra que el tejado echa sobre la hierba
  c.save();
  c.lineJoin = 'round';
  for (const [w, a] of [[64, 0.1], [44, 0.12]]) { c.strokeStyle = `rgba(0,0,0,${a})`; c.lineWidth = w; polyPath(c, pts); c.stroke(); }
  c.restore();
  c.save();
  polyPath(c, pts); c.clip();
  c.lineJoin = 'round';
  for (const [w, col] of [[118, pal.dark], [108, pal.mid], [82, pal.light], [46, pal.hi]]) { c.strokeStyle = col; c.lineWidth = w; polyPath(c, pts); c.stroke(); }
  c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 5; polyPath(c, pts); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 3; polyPath(c, pts); c.stroke();
  // láminas bajo el sombrero, hacia el interior
  c.strokeStyle = 'rgba(255,225,200,.18)'; c.lineWidth = 1.6;
  walk(pts, 9, (x, y, tx, ty, nx, ny) => { c.beginPath(); c.moveTo(x + nx * 34, y + ny * 34); c.lineTo(x + nx * 48, y + ny * 48); c.stroke(); });
  c.restore();
  // lunares (o estrellitas en el observatorio), con hueco ante las puertas
  const gates = doorBlocks(o.key);
  const stars = o.wall === 'capBlue';
  walk(pts, stars ? 38 : 56, (x, y, tx, ty, nx, ny) => {
    if (gates.some((g) => Math.hypot(g.cx - x, g.cy - y) < 90)) return;
    const d = 14 + r() * 14, px = x + nx * d, py = y + ny * d;
    if (stars) {
      c.fillStyle = pal.spot; c.globalAlpha = 0.85;
      c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, R = i % 2 ? 2 : 5.5; c.lineTo(px + Math.cos(a) * R, py + Math.sin(a) * R); } c.closePath(); c.fill();
      c.globalAlpha = 1;
      return;
    }
    const R = 6 + r() * 5, ang = Math.atan2(ty, tx);
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(px + 1.5, py + 2, R * 1.2, R * 0.85, ang, 0, TAU); c.fill();
    c.fillStyle = pal.spot; c.beginPath(); c.ellipse(px, py, R * 1.2, R * 0.85, ang, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(px - R * 0.3, py - R * 0.3, R * 0.5, R * 0.3, ang, 0, TAU); c.fill();
  });
}

// el hueco de cada puerta: entarimado, jambas de madera y un dintel
function doorFrames(c) {
  for (const d of DOOR_DEFS) {
    const [x, y, w, h] = d.floor;
    const [bx, by, bw, bh] = d.box;
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    for (let k = 0; k < (d.side === 'W' || d.side === 'E' ? h / 20 : w / 20); k++) {
      c.fillStyle = k % 2 ? '#9c7748' : '#a98350';
      if (d.side === 'W' || d.side === 'E') c.fillRect(x, y + k * 20, w, 19); else c.fillRect(x + k * 20, y, 19, h);
    }
    c.restore();
    // jambas: dos postes a los lados del hueco
    c.fillStyle = '#4b331a';
    const post = (px, py, pw, ph) => { c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(px + 2, py + 3, pw, ph); c.fillStyle = '#5a3f22'; c.fillRect(px, py, pw, ph); c.fillStyle = 'rgba(255,230,180,.25)'; c.fillRect(px, py, pw, 3); };
    if (d.side === 'W' || d.side === 'E') { post(bx - 2, by - 12, bw + 4, 14); post(bx - 2, by + bh - 2, bw + 4, 14); }
    else { post(bx - 12, by - 2, 14, bh + 4); post(bx + bw - 2, by - 2, 14, bh + 4); }
  }
}

function banks(c, r, floors) {
  // el puente y el vado quedan limpios: se corta el dibujo de las orillas en esas dos franjas
  c.save();
  const cut = ['puente', 'vado'].map((k) => flr(floors, k)).filter(Boolean);
  c.beginPath();
  c.rect(0, 0, 4400, 2800);
  for (const f of cut) c.rect(f[0], f[1], f[2], f[3]);
  c.clip('evenodd');
  for (const pts of WATERS) {
    // orilla de barro y espuma
    c.save();
    c.lineJoin = 'round';
    polyPath(c, pts); c.clip();
    c.strokeStyle = 'rgba(190,240,240,.22)'; c.lineWidth = 34; polyPath(c, pts); c.stroke();
    c.strokeStyle = 'rgba(210,250,250,.3)'; c.lineWidth = 12; polyPath(c, pts); c.stroke();
    c.restore();
    c.save();
    c.strokeStyle = 'rgba(60,44,24,.5)'; c.lineWidth = 12; c.lineJoin = 'round'; polyPath(c, pts); c.stroke();
    c.strokeStyle = 'rgba(120,98,60,.6)'; c.lineWidth = 6; polyPath(c, pts); c.stroke();
    c.restore();
    walk(pts, 22, (x, y, tx, ty, nx, ny) => {
      const out = -1; // hacia fuera del agua
      const px = x + nx * out * (4 + r() * 6), py = y + ny * out * (4 + r() * 6);
      const R = 7 + r() * 8;
      c.fillStyle = 'rgba(0,0,0,.25)'; blob(c, px + 2, py + 3, R, 7, x, 0.7); c.fill();
      c.fillStyle = r() > 0.5 ? '#7f8579' : '#6f766b'; blob(c, px, py, R, 7, x, 0.75); c.fill();
      c.fillStyle = 'rgba(255,255,255,.18)'; blob(c, px - 2, py - 2, R * 0.45, 5, x, 0.7); c.fill();
      if (r() > 0.6) { // juncos con su espiga
        c.strokeStyle = 'rgba(96,160,86,.9)'; c.lineWidth = 2;
        for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(px + nx * out * 6, py + ny * out * 6 + k * 2); c.quadraticCurveTo(px + nx * out * (16 + k * 3), py + ny * out * (16 + k * 3) - 8, px + nx * out * (22 + k * 3), py + ny * out * (22 + k * 3) - 20 - k * 3); c.stroke(); }
        c.fillStyle = '#6d4a2a'; c.beginPath(); c.ellipse(px + nx * out * 24, py + ny * out * 24 - 22, 2.6, 6, 0.2, 0, TAU); c.fill();
      }
    });
  }
  // nenúfares
  for (let i = 0; i < 26; i++) {
    const pts = i < 4 ? POND : RIVER;
    const p = pts[Math.floor(r() * pts.length)], q = pts[Math.floor(r() * pts.length)];
    const t = 0.35 + r() * 0.3, x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
    if (!inPoly(pts, x, y) || polyDist(pts, x, y) < 26) continue;
    c.fillStyle = '#3f9a5c'; c.beginPath(); c.arc(x, y, 13, 0.3, TAU - 0.2); c.lineTo(x, y); c.fill();
    c.fillStyle = '#f2b6d4'; c.beginPath(); c.arc(x + 2, y - 1, 3.4, 0, TAU); c.fill();
  }
  c.restore();
}

// cabecera del arroyo: la roca de la que cae la cascada, y la salida por el sur
function headwaters(c, r) {
  const x0 = 3300;
  c.fillStyle = 'rgba(0,0,0,.3)'; blob(c, x0 + 4, 120, 250, 14, 2.2, 0.38); c.fill();
  for (let i = 0; i < 16; i++) {
    const x = x0 - 220 + i * 28 + r() * 10, y = 70 + r() * 60, R = 34 + r() * 26;
    c.fillStyle = r() > 0.5 ? '#585f58' : '#4b524c'; blob(c, x, y, R, 9, i, 0.78); c.fill();
    c.fillStyle = 'rgba(255,255,255,.14)'; blob(c, x - R * 0.2, y - R * 0.3, R * 0.5, 7, i, 0.7); c.fill();
  }
  // la caída de agua: chorros claros que bajan hasta el arroyo
  for (let i = 0; i < 9; i++) {
    const x = x0 - 62 + i * 15 + (r() - 0.5) * 6;
    const g = c.createLinearGradient(0, 60, 0, 190);
    g.addColorStop(0, 'rgba(220,250,252,.9)'); g.addColorStop(1, 'rgba(120,200,210,.35)');
    c.strokeStyle = g; c.lineWidth = 7 + r() * 4;
    c.beginPath(); c.moveTo(x, 66); c.lineTo(x + (r() - 0.5) * 8, 190); c.stroke();
  }
  const g2 = c.createRadialGradient(x0, 196, 6, x0, 196, 90);
  g2.addColorStop(0, 'rgba(235,252,252,.7)'); g2.addColorStop(1, 'rgba(235,252,252,0)');
  c.fillStyle = g2; c.beginPath(); c.arc(x0, 196, 90, 0, TAU); c.fill();
}

export function villageOverlay(c, floors, obst, r) {
  banks(c, r, floors);
  headwaters(c, r);
  for (const f of roomsOf(floors)) if (CAPS[f[7].wall]) capRing(c, f, r);
  doorFrames(c);
  // puente: barandillas de madera con cuerda, por encima del agua
  const br = flr(floors, 'puente');
  if (br) {
    for (const ry of [br[1] - 3, br[1] + br[3] - 3]) {
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(br[0], ry + 6, br[2], 8);
      c.fillStyle = '#5a4026'; c.fillRect(br[0], ry, br[2], 7);
      c.fillStyle = 'rgba(255,230,180,.25)'; c.fillRect(br[0], ry, br[2], 2);
      for (let px = br[0] + 8; px < br[0] + br[2]; px += 40) {
        c.fillStyle = '#3c2a16'; c.beginPath(); c.arc(px, ry + 3, 6, 0, TAU); c.fill();
        c.fillStyle = '#7a5a34'; c.beginPath(); c.arc(px - 1, ry + 2, 4.4, 0, TAU); c.fill();
      }
    }
  }
  // el vado: piedras para cruzar
  const fd = flr(floors, 'vado');
  if (fd) {
    for (let px = fd[0] + 22; px < fd[0] + fd[2] - 10; px += 46) {
      for (const dy of [-34, 6, 44]) {
        const x = px + (dy % 2 ? 10 : -4), y = fd[1] + fd[3] / 2 + dy;
        c.fillStyle = 'rgba(0,0,0,.28)'; blob(c, x + 2, y + 4, 14, 8, x, 0.7); c.fill();
        c.fillStyle = '#8f9488'; blob(c, x, y, 13, 8, x * 0.1, 0.72); c.fill();
        c.fillStyle = 'rgba(255,255,255,.2)'; blob(c, x - 3, y - 3, 6, 6, x, 0.7); c.fill();
      }
    }
  }
}
