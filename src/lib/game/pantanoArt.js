/* El dibujo del Pantano Esporado: agua verdosa y turbia, muelles de madera mojada, árboles
   retorcidos y muertos, raíces gigantes, setas luminosas de todos los tamaños y colores, y una
   niebla que se desliza por encima. Usa el mismo sistema que Micelaria (Canvas 2D, vista cenital,
   suelos con textura, muros de arboleda y objetos dibujados dentro de su caja) y reutiliza sus
   piezas: aquí solo vive lo propio del pantano. Solo pinta: la geometría sale de
   server/mapPantano.mjs, la misma que usa el motor, así que lo que se ve y lo que se pisa no
   pueden separarse. */

import { PANTANO_ART as ART } from '../../../server/mapPantano.mjs';
import { blob, blade, dome, moss, rr } from './micelariaArt';
import { villageWallCell, villageWallTop, wallStyleAt } from './micelariaVillage';

const TAU = Math.PI * 2;
const { OUTDOORS, POND, WATERS, DOCKS, PATHS, CAMPO, MUERTOS, RAICES } = ART;

// generador determinista para los objetos (no reciben el de la sala): el mismo dibujo en cada partida
let SEED = 20261102;
const rnd = () => { SEED = (Math.imul(SEED, 1664525) + 1013904223) >>> 0; return SEED / 4294967296; };

const inPoly = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const onDock = (x, y) => DOCKS.some((d) => inPoly(d, x, y));
const inWater = (x, y) => WATERS.some((w) => inPoly(w, x, y));

const glow = (c, x, y, rad, rgb, a) => {
  const g = c.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, rad, 0, TAU);
  c.fill();
};

/* Pinta `draw` en una capa aparte, le borra los polígonos `holes` y la compone encima. Sirve para
   que los senderos no crucen el agua ni las salas, y la orilla no se dibuje sobre los muelles. */
function masked(c, draw, holes) {
  const cv = document.createElement('canvas');
  cv.width = c.canvas.width;
  cv.height = c.canvas.height;
  const t = cv.getContext('2d');
  draw(t);
  t.globalCompositeOperation = 'destination-out';
  t.fillStyle = '#000';
  for (const h of holes) {
    t.beginPath();
    h.forEach((q, i) => (i ? t.lineTo(q[0], q[1]) : t.moveTo(q[0], q[1])));
    t.closePath();
    t.fill();
  }
  c.drawImage(cv, 0, 0);
}
const roomPolys = (floors) => floors.filter((f) => f[7] && f[7].room && f[7].poly).map((f) => f[7].poly);

export const PANTANO_BG = '#0b1713';

/* ---------------- el pantano entero ---------------- */
/* Se pinta antes que las salas, sobre todo el mapa: fuera de los senderos hay fango, agua
   quieta y juncos, no vacío. */
export function pantanoGround(c, world, r) {
  const g = c.createLinearGradient(0, 0, world.w * 0.3, world.h);
  g.addColorStop(0, '#102520');
  g.addColorStop(0.5, '#0d1d19');
  g.addColorStop(1, '#0a1714');
  c.fillStyle = g;
  c.fillRect(0, 0, world.w, world.h);
  for (let i = 0; i < 260; i++) {
    c.fillStyle = i % 3 ? 'rgba(38,84,66,.16)' : 'rgba(6,14,12,.26)';
    blob(c, r() * world.w, r() * world.h, 70 + r() * 260, 10, i * 1.7, 0.7);
    c.fill();
  }
  // charcos de fondo con un brillo verdoso, para que el borde del mapa no sea un muro liso
  for (let i = 0; i < 90; i++) {
    const x = r() * world.w, y = r() * world.h;
    c.fillStyle = 'rgba(60,140,110,.12)';
    c.beginPath();
    c.ellipse(x, y, 20 + r() * 50, 8 + r() * 20, r() * TAU, 0, TAU);
    c.fill();
  }
}

/* ---------------- texturas de suelo ---------------- */

const patches = (c, x, y, w, h, r, n, cols, rx, ry) => {
  for (let i = 0; i < n; i++) {
    c.fillStyle = cols[Math.floor(r() * cols.length)];
    c.beginPath();
    c.ellipse(x + r() * w, y + r() * h, rx[0] + r() * rx[1], ry[0] + r() * ry[1], r() * TAU, 0, TAU);
    c.fill();
  }
};
const dots = (c, x, y, w, h, r, n, rgb, size = 1.8) => {
  for (let i = 0; i < n; i++) {
    const px = x + r() * w, py = y + r() * h, s = size * (0.6 + r());
    c.fillStyle = `rgba(${rgb},${0.3 + r() * 0.45})`;
    c.beginPath();
    c.arc(px, py, s, 0, TAU);
    c.fill();
  }
};
const tufts = (c, x, y, w, h, r, n) => {
  for (let i = 0; i < n; i++) {
    const px = x + r() * w, py = y + r() * h;
    for (let k = 0; k < 4; k++) blade(c, px + k * 3 - 5, py, 4 + r() * 7, r() > 0.5);
  }
};

export const PANTANO_TEX = {
  swamp(c, x, y, w, h, r) { // fango oscuro con musgo, charcos verdosos y esporas
    patches(c, x, y, w, h, r, (w * h) / 2600, ['rgba(40,70,52,.3)', 'rgba(16,30,24,.3)', 'rgba(70,92,60,.16)'], [8, 26], [5, 14]);
    patches(c, x, y, w, h, r, (w * h) / 11000, ['rgba(70,150,120,.2)'], [12, 26], [6, 10]);
    c.strokeStyle = 'rgba(190,240,215,.12)';
    c.lineWidth = 1.5;
    for (let i = 0; i < (w * h) / 16000; i++) {
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 8 + r() * 16, 3 + r() * 7, 0, 0, TAU);
      c.stroke();
    }
    tufts(c, x, y, w, h, r, (w * h) / 22000);
    dots(c, x, y, w, h, r, (w * h) / 26000, '170,255,220', 1.6);
  },
  bog(c, x, y, w, h, r) { // orilla turbosa: tierra negra, musgo y juncos
    patches(c, x, y, w, h, r, (w * h) / 2200, ['rgba(20,26,18,.34)', 'rgba(70,96,56,.22)', 'rgba(104,92,56,.14)'], [8, 24], [5, 13]);
    patches(c, x, y, w, h, r, (w * h) / 9000, ['rgba(74,150,126,.22)'], [10, 20], [5, 9]);
    tufts(c, x, y, w, h, r, (w * h) / 15000);
    dots(c, x, y, w, h, r, (w * h) / 30000, '190,255,205', 1.5);
  },
  murk(c, x, y, w, h, r) { // agua verdosa y turbia, con ripples, algas y nenúfares
    const g = c.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, Math.max(w, h) * 0.62);
    g.addColorStop(0, 'rgba(10,40,34,.55)');
    g.addColorStop(1, 'rgba(40,110,88,.18)');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    patches(c, x, y, w, h, r, (w * h) / 1500, ['rgba(120,200,160,.1)', 'rgba(14,46,40,.22)', 'rgba(150,170,70,.08)'], [14, 34], [4, 12]);
    c.strokeStyle = 'rgba(205,250,225,.2)';
    c.lineWidth = 1.8;
    for (let i = 0; i < (w * h) / 6000; i++) {
      const px = x + r() * w, py = y + r() * h, rx = 8 + r() * 20;
      c.beginPath();
      c.ellipse(px, py, rx, rx * 0.36, 0, 0.1, Math.PI - 0.1);
      c.stroke();
    }
    // nenúfares: hoja redonda con su muesca y, a veces, una flor rosa
    for (let i = 0; i < (w * h) / 22000; i++) {
      const px = x + r() * w, py = y + r() * h, rad = 9 + r() * 11, a = r() * TAU;
      c.fillStyle = r() > 0.5 ? '#3f8a52' : '#2f7447';
      c.beginPath();
      c.moveTo(px, py);
      c.arc(px, py, rad, a + 0.4, a + TAU - 0.4);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(150,230,150,.3)';
      c.lineWidth = 1;
      c.stroke();
      if (r() > 0.7) {
        c.fillStyle = '#f3a6cf';
        c.beginPath();
        c.arc(px + 2, py - 2, 3.2, 0, TAU);
        c.fill();
        c.fillStyle = '#ffe9a8';
        c.beginPath();
        c.arc(px + 2, py - 2, 1.3, 0, TAU);
        c.fill();
      }
    }
  },
  boards(c, x, y, w, h, r) { // tablas de muelle: madera mojada, juntas oscuras, clavos y moho
    const vertical = w >= h; // las tablas cruzan el ancho de la pasarela
    const step = 26;
    const len = vertical ? w : h;
    for (let p = 0; p < len; p += step) {
      const tone = r();
      c.fillStyle = tone > 0.66 ? '#7e6540' : tone > 0.33 ? '#6d5636' : '#5c4a30';
      if (vertical) c.fillRect(x + p, y, step - 2, h); else c.fillRect(x, y + p, w, step - 2);
      c.fillStyle = 'rgba(255,230,180,.08)';
      if (vertical) c.fillRect(x + p, y, step - 2, 3); else c.fillRect(x, y + p, w, 3);
      c.fillStyle = 'rgba(8,16,12,.6)'; // la junta, con el agua oscura debajo
      if (vertical) c.fillRect(x + p + step - 2, y, 2, h); else c.fillRect(x, y + p + step - 2, w, 2);
    }
    patches(c, x, y, w, h, r, (w * h) / 3600, ['rgba(20,36,24,.3)', 'rgba(70,110,60,.22)'], [8, 20], [4, 9]);
    for (let i = 0; i < (w * h) / 5200; i++) {
      c.fillStyle = 'rgba(30,22,14,.55)';
      c.beginPath();
      c.arc(x + r() * w, y + r() * h, 1.6, 0, TAU);
      c.fill();
    }
    dots(c, x, y, w, h, r, (w * h) / 40000, '150,255,200', 1.5);
  },
  cabin(c, x, y, w, h, r) { // suelo de cabaña podrido: tablas torcidas, moho y charcos
    for (let p = 0; p < h; p += 30) {
      c.fillStyle = r() > 0.5 ? '#6a5a42' : '#5b4c37';
      c.fillRect(x, y + p, w, 28);
      c.fillStyle = 'rgba(0,0,0,.32)';
      c.fillRect(x, y + p + 28, w, 2);
      for (let q = x + r() * 90; q < x + w; q += 90 + r() * 120) {
        c.fillStyle = 'rgba(0,0,0,.28)';
        c.fillRect(q, y + p, 2, 28);
      }
    }
    patches(c, x, y, w, h, r, (w * h) / 4200, ['rgba(36,60,38,.3)', 'rgba(20,16,10,.3)', 'rgba(90,130,84,.14)'], [10, 26], [5, 12]);
    c.fillStyle = 'rgba(10,18,14,.7)'; // un agujero en el suelo, con el agua debajo
    if (w > 200 && h > 200) for (let i = 0; i < Math.floor((w * h) / 150000); i++) { blob(c, x + 40 + r() * (w - 80), y + 40 + r() * (h - 80), 18 + r() * 12, 9, i * 2.3, 0.8); c.fill(); }
    dots(c, x, y, w, h, r, (w * h) / 38000, '140,255,190', 1.6);
  },
  cavefloor(c, x, y, w, h, r) { // roca húmeda con charcos, vetas y puntos de luz
    patches(c, x, y, w, h, r, (w * h) / 2600, ['rgba(255,255,255,.035)', 'rgba(0,0,0,.2)'], [10, 30], [6, 16]);
    patches(c, x, y, w, h, r, (w * h) / 16000, ['rgba(60,150,170,.22)'], [14, 26], [6, 10]);
    c.strokeStyle = 'rgba(140,200,210,.14)';
    c.lineWidth = 2;
    for (let i = 0; i < (w * h) / 13000; i++) {
      const px = x + r() * w, py = y + r() * h;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + r() * 44 - 22, py + r() * 26 - 13);
      c.stroke();
    }
    dots(c, x, y, w, h, r, (w * h) / 5200, '120,230,255', 1.7);
    dots(c, x, y, w, h, r, (w * h) / 20000, '200,150,255', 1.9);
  },
  glowfield(c, x, y, w, h, r) { // el campo de setas: tierra negra con micelio y esporas de colores
    patches(c, x, y, w, h, r, (w * h) / 2600, ['rgba(16,30,28,.34)', 'rgba(46,80,70,.2)'], [10, 30], [6, 14]);
    const cols = ['255,120,200', '90,230,235', '255,200,110', '170,140,255', '150,240,110'];
    for (let i = 0; i < (w * h) / 14000; i++) glow(c, x + r() * w, y + r() * h, 24 + r() * 46, cols[Math.floor(r() * cols.length)], 0.12);
    c.lineWidth = 1.6;
    for (let i = 0; i < (w * h) / 15000; i++) {
      c.strokeStyle = `rgba(${cols[Math.floor(r() * cols.length)]},.2)`;
      const px = x + r() * w, py = y + r() * h;
      c.beginPath();
      c.moveTo(px, py);
      c.quadraticCurveTo(px + r() * 70 - 35, py + r() * 70 - 35, px + r() * 90 - 45, py + r() * 90 - 45);
      c.stroke();
    }
    for (const rgb of cols) dots(c, x, y, w, h, r, (w * h) / 60000, rgb, 1.8);
  },
  deadland(c, x, y, w, h, r) { // tierra agrietada, ceniza y raíces pálidas
    patches(c, x, y, w, h, r, (w * h) / 2600, ['rgba(70,64,52,.26)', 'rgba(20,18,14,.3)', 'rgba(150,140,118,.1)'], [10, 28], [5, 13]);
    c.strokeStyle = 'rgba(10,8,6,.5)';
    c.lineWidth = 1.6;
    for (let i = 0; i < (w * h) / 9000; i++) {
      const px = x + r() * w, py = y + r() * h;
      c.beginPath();
      c.moveTo(px, py);
      for (let k = 0; k < 3; k++) c.lineTo(px + (k + 1) * (6 + r() * 12) * (r() > 0.5 ? 1 : -1), py + (k + 1) * (5 + r() * 10));
      c.stroke();
    }
    c.strokeStyle = 'rgba(205,195,170,.2)';
    c.lineWidth = 2.2;
    for (let i = 0; i < (w * h) / 20000; i++) {
      const px = x + r() * w, py = y + r() * h;
      c.beginPath();
      c.moveTo(px, py);
      c.quadraticCurveTo(px + 20 + r() * 20, py - 10 + r() * 20, px + 40 + r() * 40, py + r() * 20 - 10);
      c.stroke();
    }
    dots(c, x, y, w, h, r, (w * h) / 50000, '170,230,200', 1.4);
  },
  rootsoil(c, x, y, w, h, r) { // tierra revuelta por las raíces gigantes
    patches(c, x, y, w, h, r, (w * h) / 2400, ['rgba(34,24,14,.3)', 'rgba(60,84,44,.2)', 'rgba(20,34,22,.3)'], [8, 26], [5, 13]);
    c.strokeStyle = 'rgba(70,48,28,.5)';
    c.lineWidth = 3;
    for (let i = 0; i < (w * h) / 24000; i++) {
      const px = x + r() * w, py = y + r() * h;
      c.beginPath();
      c.moveTo(px, py);
      c.bezierCurveTo(px + 30, py - 20, px + 60 + r() * 30, py + 30, px + 100 + r() * 40, py + r() * 20 - 10);
      c.stroke();
    }
    tufts(c, x, y, w, h, r, (w * h) / 26000);
    dots(c, x, y, w, h, r, (w * h) / 40000, '160,255,190', 1.5);
  },
};
export const PANTANO_ROOM_TEX = {};
export const PANTANO_DEFAULT_TEX = 'swamp';

/* ---------------- el muro: arboleda de pantano y madera podrida ---------------- */

function swampWallCell(c, x, y, s, r, style = 'forest') {
  if (style === 'rot') {
    c.fillStyle = '#2a2219';
    c.fillRect(x, y, 20, 20);
    c.fillStyle = r() > 0.5 ? '#6c5e47' : '#5f523d';
    c.fillRect(x + 1, y + 1, 18, 18);
    c.fillStyle = 'rgba(30,22,12,.3)';
    for (let i = 0; i < 3; i++) c.fillRect(x + 3 + i * 6 + r() * 2, y + 1, 1.5, 18);
    c.fillStyle = 'rgba(255,240,205,.08)';
    c.fillRect(x + 1, y + 1, 18, 3);
    if (r() > 0.7) { c.fillStyle = 'rgba(70,120,70,.5)'; c.fillRect(x + 1 + r() * 10, y + 1 + r() * 10, 6 + r() * 6, 4 + r() * 5); }
    if (s.so) { c.fillStyle = 'rgba(14,10,4,.4)'; c.fillRect(x, y + 13, 20, 7); }
    return;
  }
  if (style !== 'forest') return villageWallCell(c, x, y, s, r, style);
  c.fillStyle = '#12261f';
  c.fillRect(x, y, 20, 20);
  c.fillStyle = r() > 0.5 ? 'rgba(80,160,130,.04)' : 'rgba(0,0,0,.08)';
  c.fillRect(x, y, 20, 20);
  for (let i = 0; i < 4; i++) blade(c, x + r() * 20, y + r() * 20, 4 + r() * 6, r() > 0.5);
  if (s.so) { c.fillStyle = 'rgba(4,10,8,.34)'; c.fillRect(x, y + 13, 20, 7); }
}

/* Árbol retorcido de la linde: tronco nudoso con raíces al aire, copa turbia y musgo colgante. */
function twistedTree(c, cx, cy, R, r, lit) {
  c.strokeStyle = '#2a2018';
  c.lineWidth = 5;
  c.lineCap = 'round';
  for (let i = 0; i < 6; i++) { // raíces aéreas
    const a = (i / 6) * TAU + r() * 0.5;
    c.beginPath();
    c.moveTo(cx, cy + R * 0.1);
    c.quadraticCurveTo(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.3 - R * 0.2, cx + Math.cos(a) * R * 0.95, cy + R * 0.5 + Math.sin(a) * R * 0.2);
    c.stroke();
  }
  c.lineCap = 'butt';
  c.fillStyle = 'rgba(4,12,10,.34)';
  c.beginPath();
  c.ellipse(cx + 2, cy + R * 0.34, R * 0.95, R * 0.5, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#1b3a35';
  c.beginPath();
  c.arc(cx - R * 0.3, cy + 2, R * 0.72, 0, TAU);
  c.arc(cx + R * 0.32, cy, R * 0.66, 0, TAU);
  c.fill();
  c.fillStyle = '#285448';
  c.beginPath();
  c.arc(cx - R * 0.08, cy - R * 0.16, R * 0.62, 0, TAU);
  c.arc(cx + R * 0.4, cy - R * 0.08, R * 0.44, 0, TAU);
  c.fill();
  c.fillStyle = lit ? '#3d7d63' : '#33695a';
  c.beginPath();
  c.arc(cx - R * 0.04, cy - R * 0.3, R * 0.42, 0, TAU);
  c.fill();
  c.strokeStyle = 'rgba(170,215,170,.3)'; // musgo colgante
  c.lineWidth = 1.6;
  for (let i = 0; i < 7; i++) {
    const px = cx + (r() - 0.5) * R * 1.5, py = cy + R * 0.1 + r() * R * 0.2;
    c.beginPath();
    c.moveTo(px, py);
    c.quadraticCurveTo(px + 3, py + R * 0.25, px - 2, py + R * 0.4 + r() * R * 0.2);
    c.stroke();
  }
  if (r() > 0.55) dots(c, cx - R * 0.6, cy - R * 0.5, R * 1.2, R, r, 3, '170,255,210', 2);
}
function deadTreeTop(c, cx, cy, R, r) {
  c.fillStyle = 'rgba(4,10,8,.3)';
  c.beginPath();
  c.ellipse(cx + 2, cy + 6, R * 0.8, R * 0.4, 0, 0, TAU);
  c.fill();
  c.strokeStyle = '#2d261f';
  c.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + r();
    c.lineWidth = 4.5;
    c.beginPath();
    c.moveTo(cx, cy);
    const mx = cx + Math.cos(a) * R * 0.55, my = cy + Math.sin(a) * R * 0.5;
    c.quadraticCurveTo(cx + Math.cos(a + 0.4) * R * 0.3, cy + Math.sin(a + 0.4) * R * 0.3, mx, my);
    c.lineTo(mx + Math.cos(a - 0.5) * R * 0.5, my + Math.sin(a - 0.5) * R * 0.5);
    c.stroke();
  }
  c.lineCap = 'butt';
  c.fillStyle = '#3a3128';
  c.beginPath();
  c.arc(cx, cy, 6, 0, TAU);
  c.fill();
}
function glowCluster(c, cx, cy, R, r) {
  const cols = [['255,120,200', '#d9529e'], ['90,230,235', '#35b9c4'], ['255,200,110', '#e3a042'], ['170,140,255', '#7d62d6']];
  const [rgb, cap] = cols[Math.floor(r() * cols.length)];
  glow(c, cx, cy, R * 1.5, rgb, 0.32);
  for (let i = 0; i < 3; i++) {
    const px = cx + (r() - 0.5) * R, py = cy + (r() - 0.3) * R * 0.6, s = 0.6 + r() * 0.7;
    c.fillStyle = '#e3dfc9';
    c.fillRect(px - 1.6 * s, py - 4 * s, 3.2 * s, 8 * s);
    c.fillStyle = cap;
    dome(c, px, py - 4 * s, 7 * s, 6 * s);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)';
    c.beginPath();
    c.arc(px - 2 * s, py - 7 * s, 1.2 * s, 0, TAU);
    c.fill();
  }
}

function swampCanopy(c, border, r) {
  // las salas con muro propio (cueva...) y la cabaña podrida
  const rooms = border.filter((b) => b[6] && b[6] !== 'forest');
  villageWallTop(c, rooms.filter((b) => b[6] !== 'rot'), r);
  for (const [x, y, n, so, w, e, style] of rooms) {
    if (style !== 'rot') continue;
    const cx = x + 10, cy = y + 10;
    if (((x + y) / 20) % 5 === 0) { // viga
      c.fillStyle = '#3d3020';
      c.fillRect(x + 4, y + 1, 12, 18);
      c.fillStyle = 'rgba(255,240,205,.08)';
      c.fillRect(x + 4, y + 1, 12, 2);
    }
    if (((x * 3 + y * 7) / 20) % 11 === 0) { // ventanuco roto con luz verdosa
      c.fillStyle = '#17120c';
      c.beginPath(); c.arc(cx, cy, 7, 0, TAU); c.fill();
      c.fillStyle = 'rgba(150,255,190,.55)';
      c.beginPath(); c.arc(cx, cy, 4.6, 0, TAU); c.fill();
    }
    if (r() > 0.93) { c.fillStyle = '#e3dfc9'; dome(c, cx + 5, cy + 6, 4, 3); c.fill(); } // hongo de yesca
    if (r() > 0.8) { c.fillStyle = 'rgba(80,140,80,.45)'; c.fillRect(x, y + 17 * (so ? 1 : 0), 20, 3); }
  }
  for (const [x, y, n, so, w, e, style] of border) {
    if (style && style !== 'forest') continue;
    const cx = x + 10 + (w ? 7 : e ? -7 : 0), cy = y + 10 + (n ? 7 : so ? -7 : 0);
    const pick = r();
    if (pick < 0.5) twistedTree(c, cx, cy, 20 + r() * 12, r, r() > 0.5);
    else if (pick < 0.66) deadTreeTop(c, cx, cy, 24 + r() * 10, r);
    else if (pick < 0.82) glowCluster(c, cx, cy, 14 + r() * 8, r);
    else { // juncos y espadañas
      for (let i = 0; i < 6; i++) {
        const px = cx + (r() - 0.5) * 22, h = 14 + r() * 14;
        c.strokeStyle = r() > 0.5 ? '#3f7a54' : '#2f5f45';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(px, cy + 8);
        c.quadraticCurveTo(px + (r() - 0.5) * 8, cy - h * 0.4, px + (r() - 0.5) * 10, cy - h);
        c.stroke();
        if (r() > 0.7) { c.fillStyle = '#5a3d22'; c.fillRect(px - 1.8 + (r() - 0.5) * 8, cy - h - 5, 3.6, 9); }
      }
    }
  }
}

export const PANTANO_WALL = { kind: 'nature', styleAt: wallStyleAt, cell: swampWallCell, canopy: swampCanopy };

/* ---------------- objetos del escenario ---------------- */

const SHROOMS = {
  A: { cap: '#c2418c', hi: '#ff9ad6', rim: '#7a1d58', rgb: '255,120,200', stem: '#eadbe3' },
  B: { cap: '#1f9aa8', hi: '#86f4ff', rim: '#0d5560', rgb: '90,230,235', stem: '#d6ece9' },
  C: { cap: '#d98a2b', hi: '#ffd98a', rim: '#8a5112', rgb: '255,200,110', stem: '#efe4cc' },
  D: { cap: '#6b4fd0', hi: '#c1b0ff', rim: '#3a2686', rgb: '170,140,255', stem: '#e2dcef' },
  E: { cap: '#4fb04a', hi: '#caff98', rim: '#276b25', rgb: '150,240,110', stem: '#e1ecd0' },
};
function shroom(c, w, h, p) { // seta luminosa gigante: halo, pie, sombrero con láminas y lunares
  glow(c, 0, 0, Math.max(w, h) * 0.72, p.rgb, 0.3);
  const cw = w * 0.5, cy = -h * 0.08;
  c.fillStyle = p.stem;
  rr(c, -w * 0.1, cy + h * 0.1, w * 0.2, h * 0.4, 9);
  c.fill();
  c.fillStyle = 'rgba(80,60,60,.22)';
  rr(c, -w * 0.1, cy + h * 0.1, w * 0.05, h * 0.4, 6);
  c.fill();
  c.fillStyle = 'rgba(0,0,0,.2)';
  c.beginPath();
  c.ellipse(0, cy + h * 0.42, w * 0.22, h * 0.05, 0, 0, TAU);
  c.fill();
  const g = c.createRadialGradient(-cw * 0.3, cy - h * 0.2, 4, 0, cy, cw);
  g.addColorStop(0, p.hi);
  g.addColorStop(0.55, p.cap);
  g.addColorStop(1, p.rim);
  c.fillStyle = g;
  dome(c, 0, cy, cw, h * 0.36);
  c.fill();
  c.fillStyle = 'rgba(0,0,0,.28)'; // las láminas bajo el borde
  c.beginPath();
  c.ellipse(0, cy + h * 0.02, cw * 0.98, h * 0.06, 0, 0, Math.PI);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,.14)';
  c.lineWidth = 1.4;
  for (let i = -4; i <= 4; i++) {
    c.beginPath();
    c.moveTo(i * cw * 0.2, cy + h * 0.02);
    c.lineTo(i * cw * 0.25, cy + h * 0.05);
    c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,.7)';
  for (const [dx, dy, s] of [[-0.42, -0.26, 1], [0.3, -0.3, 0.8], [0.02, -0.12, 0.6], [-0.66, -0.04, 0.5], [0.6, -0.04, 0.55]]) {
    c.beginPath();
    c.ellipse(dx * cw, cy + dy * h * 0.36, 6 * s * (w / 180), 4.4 * s * (w / 180), 0.2, 0, TAU);
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.34)';
  c.beginPath();
  c.ellipse(-cw * 0.3, cy - h * 0.2, cw * 0.28, h * 0.05, -0.3, 0, TAU);
  c.fill();
}

export const PANTANO_OBST = {
  deadtree(c, w, h) { // árbol muerto: tronco hueco y partido, ramas gruesas que se ahúsan
    const R0 = Math.min(w, h) * 0.5;
    c.fillStyle = 'rgba(4,10,8,.34)';
    c.beginPath();
    c.ellipse(3, R0 * 0.2, R0 * 0.95, R0 * 0.55, 0, 0, TAU);
    c.fill();
    const limb = (x, y, ang, len, th, depth) => {
      const mx = x + Math.cos(ang) * len * 0.5 + (rnd() - 0.5) * 8, my = y + Math.sin(ang) * len * 0.5 + (rnd() - 0.5) * 8;
      const ex = x + Math.cos(ang + (rnd() - 0.5) * 0.7) * len, ey = y + Math.sin(ang + (rnd() - 0.5) * 0.7) * len;
      for (const [col, k, dy] of [['#1d1812', 1.25, 2], ['#3a3027', 1, 0], ['#5a4d3f', 0.3, -1]]) {
        c.strokeStyle = col;
        c.lineWidth = Math.max(1.6, th * k);
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, y + dy);
        c.quadraticCurveTo(mx, my + dy, ex, ey + dy);
        c.stroke();
      }
      if (depth < 2) {
        limb(ex, ey, ang + 0.5 + rnd() * 0.5, len * 0.6, th * 0.55, depth + 1);
        if (rnd() > 0.35) limb(ex, ey, ang - 0.5 - rnd() * 0.5, len * 0.55, th * 0.5, depth + 1);
      }
    };
    const n = 5 + Math.floor(rnd() * 2), a0 = rnd() * TAU;
    for (let i = 0; i < n; i++) limb(0, 0, a0 + (i / n) * TAU + (rnd() - 0.5) * 0.5, R0 * (0.6 + rnd() * 0.45), 11, 0);
    c.lineCap = 'butt';
    const tr = c.createRadialGradient(-4, -4, 2, 0, 0, R0 * 0.3);
    tr.addColorStop(0, '#6a5b49');
    tr.addColorStop(1, '#2f271f');
    c.fillStyle = tr;
    blob(c, 0, 0, R0 * 0.27, 9, rnd() * 5, 1);
    c.fill();
    c.fillStyle = '#0d0a07'; // el hueco del tronco partido
    blob(c, 1, 1, R0 * 0.13, 8, rnd() * 5, 1);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,.4)';
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, R0 * 0.2, 0, TAU); c.stroke();
    if (rnd() > 0.5) { c.fillStyle = '#d9d3bd'; dome(c, R0 * 0.24, -R0 * 0.06, 6, 4); c.fill(); dome(c, R0 * 0.3, R0 * 0.02, 4, 3); c.fill(); } // yesqueros
    moss(c, -R0 * 0.12, R0 * 0.14, 11, 5, 0.45);
  },
  swamptree(c, w, h) { // árbol del pantano: raíces aéreas, copa turbia y musgo colgante
    twistedTree(c, 0, -h * 0.04, Math.min(w, h) * 0.34, rnd, rnd() > 0.5);
  },
  bigroot(c, w, h) { // raíces gigantes arqueadas sobre el barro
    const arch = (x0, y0, cxp, cyp, x1, y1, th) => {
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(0,0,0,.3)';
      c.lineWidth = th + 6;
      c.beginPath(); c.moveTo(x0, y0 + 5); c.quadraticCurveTo(cxp, cyp + 12, x1, y1 + 5); c.stroke();
      c.strokeStyle = '#3a2a1b';
      c.lineWidth = th;
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cxp, cyp, x1, y1); c.stroke();
      c.strokeStyle = '#5b4228';
      c.lineWidth = th * 0.42;
      c.beginPath(); c.moveTo(x0, y0 - 2); c.quadraticCurveTo(cxp, cyp - 5, x1, y1 - 2); c.stroke();
      c.strokeStyle = 'rgba(190,150,100,.22)';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(x0, y0 - th * 0.3); c.quadraticCurveTo(cxp, cyp - th * 0.4, x1, y1 - th * 0.3); c.stroke();
      c.lineCap = 'butt';
    };
    arch(-w * 0.46, h * 0.22, -w * 0.25, -h * 0.75, 0, h * 0.28, 24);
    arch(-w * 0.04, h * 0.3, w * 0.22, -h * 0.85, w * 0.46, h * 0.2, 22);
    arch(-w * 0.3, h * 0.35, -w * 0.12, h * 0.02, w * 0.1, h * 0.38, 12);
    for (let i = 0; i < 6; i++) moss(c, (rnd() - 0.5) * w * 0.7, -h * 0.3 + rnd() * h * 0.3, 10 + rnd() * 8, 4, 0.5);
    dots(c, -w * 0.4, -h * 0.4, w * 0.8, h * 0.6, rnd, 4, '170,255,200', 2);
  },
  shroomA(c, w, h) { shroom(c, w, h, SHROOMS.A); },
  shroomB(c, w, h) { shroom(c, w, h, SHROOMS.B); },
  shroomC(c, w, h) { shroom(c, w, h, SHROOMS.C); },
  shroomD(c, w, h) { shroom(c, w, h, SHROOMS.D); },
  shroomE(c, w, h) { shroom(c, w, h, SHROOMS.E); },
  crystal(c, w, h) { // racimo de cristales de la cueva
    glow(c, 0, 0, Math.max(w, h) * 0.7, '110,230,255', 0.3);
    const spikes = [[-0.28, 0.1, 0.5, 0.2, '#4fc8e0'], [0.05, 0.06, 0.8, 0.26, '#7ee8ff'], [0.3, 0.14, 0.55, 0.2, '#8c7ae8'], [-0.05, 0.2, 0.38, 0.18, '#a894ff']];
    for (const [px, py, k, ww, col] of spikes) {
      const bx = px * w, by = py * h, hh = k * h, hw = ww * w * 0.5;
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(bx - hw, by);
      c.lineTo(bx - hw * 0.4, by - hh);
      c.lineTo(bx + hw * 0.2, by - hh * 1.08);
      c.lineTo(bx + hw, by);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)';
      c.beginPath();
      c.moveTo(bx - hw * 0.4, by - hh);
      c.lineTo(bx + hw * 0.2, by - hh * 1.08);
      c.lineTo(bx - hw * 0.05, by - hh * 0.3);
      c.closePath();
      c.fill();
    }
  },
  stalag(c, w, h) { // estalagmita: roca mojada con el brillo de una gota
    const g = c.createRadialGradient(-w * 0.12, -h * 0.15, 3, 0, 0, w * 0.5);
    g.addColorStop(0, '#6d7473');
    g.addColorStop(1, '#2b302f');
    c.fillStyle = g;
    blob(c, 0, 0, Math.min(w, h) * 0.5, 9, rnd() * 6, 0.9);
    c.fill();
    c.fillStyle = 'rgba(160,230,240,.34)';
    c.beginPath();
    c.ellipse(-w * 0.1, -h * 0.16, w * 0.1, h * 0.06, -0.4, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)';
    c.beginPath();
    c.ellipse(w * 0.1, h * 0.14, w * 0.3, h * 0.12, 0, 0, TAU);
    c.fill();
  },
  rowboat(c, w, h) { // barca de remos varada, vista desde arriba
    c.fillStyle = '#3a2a1b';
    c.beginPath();
    c.moveTo(-w * 0.5, 0);
    c.quadraticCurveTo(-w * 0.3, -h * 0.55, w * 0.1, -h * 0.5);
    c.quadraticCurveTo(w * 0.42, -h * 0.4, w * 0.5, 0);
    c.quadraticCurveTo(w * 0.42, h * 0.4, w * 0.1, h * 0.5);
    c.quadraticCurveTo(-w * 0.3, h * 0.55, -w * 0.5, 0);
    c.closePath();
    c.fill();
    c.fillStyle = '#6a5034';
    c.beginPath();
    c.moveTo(-w * 0.44, 0);
    c.quadraticCurveTo(-w * 0.28, -h * 0.38, w * 0.1, -h * 0.36);
    c.quadraticCurveTo(w * 0.36, -h * 0.28, w * 0.43, 0);
    c.quadraticCurveTo(w * 0.36, h * 0.28, w * 0.1, h * 0.36);
    c.quadraticCurveTo(-w * 0.28, h * 0.38, -w * 0.44, 0);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(30,20,10,.55)';
    c.lineWidth = 2.4;
    for (const t of [-0.22, 0.04, 0.28]) { c.beginPath(); c.moveTo(w * t, -h * 0.34); c.lineTo(w * t, h * 0.34); c.stroke(); }
    c.fillStyle = 'rgba(20,40,30,.55)';
    c.beginPath();
    c.ellipse(w * 0.04, h * 0.1, w * 0.18, h * 0.12, 0, 0, TAU);
    c.fill();
    c.strokeStyle = '#8a6a42';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(-w * 0.1, -h * 0.36); c.lineTo(-w * 0.22, -h * 0.74); c.moveTo(w * 0.08, h * 0.36); c.lineTo(w * 0.2, h * 0.74); c.stroke();
    c.lineCap = 'butt';
  },
  stove(c, w, h) { // estufa de hierro oxidada con su tubo
    c.fillStyle = '#1e1d1b';
    rr(c, -w * 0.46, -h * 0.4, w * 0.92, h * 0.82, 6);
    c.fill();
    c.fillStyle = '#3a3733';
    rr(c, -w * 0.42, -h * 0.4, w * 0.84, h * 0.62, 5);
    c.fill();
    c.fillStyle = 'rgba(150,80,30,.4)';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse((rnd() - 0.5) * w * 0.7, (rnd() - 0.6) * h * 0.5, 7, 4, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#16130f';
    c.beginPath(); c.arc(w * 0.18, -h * 0.18, w * 0.13, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,150,60,.55)';
    rr(c, -w * 0.22, h * 0.02, w * 0.3, h * 0.12, 3);
    c.fill();
  },
  chest(c, w, h) { // arcón de madera con herrajes
    c.fillStyle = '#2f2114';
    rr(c, -w * 0.5, -h * 0.5, w, h, 6);
    c.fill();
    c.fillStyle = '#6b4c2c';
    rr(c, -w * 0.46, -h * 0.46, w * 0.92, h * 0.64, 5);
    c.fill();
    c.fillStyle = 'rgba(255,230,180,.1)';
    rr(c, -w * 0.46, -h * 0.46, w * 0.92, h * 0.14, 4);
    c.fill();
    c.fillStyle = '#7d8277';
    c.fillRect(-w * 0.28, -h * 0.46, w * 0.08, h * 0.64);
    c.fillRect(w * 0.2, -h * 0.46, w * 0.08, h * 0.64);
    c.fillStyle = '#d4b45a';
    c.fillRect(-w * 0.05, -h * 0.1, w * 0.1, h * 0.2);
    moss(c, w * 0.3, h * 0.3, 8, 4, 0.5);
  },
  lanternpost(c, w, h) { // farol de pantano: poste de madera y llama verdosa
    glow(c, 0, 0, Math.max(w, h) * 1.5, '190,255,150', 0.28);
    c.fillStyle = '#3a2a1b';
    c.beginPath(); c.arc(0, h * 0.2, w * 0.26, 0, TAU); c.fill();
    c.fillStyle = '#6a5034';
    c.beginPath(); c.arc(-1, h * 0.17, w * 0.18, 0, TAU); c.fill();
    c.fillStyle = '#3a3226';
    rr(c, -w * 0.2, -h * 0.4, w * 0.4, h * 0.44, 4);
    c.fill();
    c.fillStyle = '#d6ff9a';
    rr(c, -w * 0.13, -h * 0.34, w * 0.26, h * 0.3, 3);
    c.fill();
    c.fillStyle = 'rgba(255,255,230,.8)';
    c.beginPath(); c.arc(-1, -h * 0.2, 3, 0, TAU); c.fill();
  },
  fishrack(c, w, h) { // tendedero de pescado con redes
    c.fillStyle = '#4a3622';
    c.fillRect(-w * 0.48, -h * 0.4, 6, h * 0.8);
    c.fillRect(w * 0.48 - 6, -h * 0.4, 6, h * 0.8);
    c.fillStyle = '#6a5034';
    c.fillRect(-w * 0.48, -h * 0.4, w * 0.96, 5);
    for (const t of [-0.3, 0, 0.3]) {
      c.fillStyle = '#8fa3a0';
      c.beginPath(); c.ellipse(w * t, h * 0.05, 5, 13, 0, 0, TAU); c.fill();
      c.fillStyle = '#4c5e5c';
      c.beginPath(); c.moveTo(w * t, h * 0.28); c.lineTo(w * t - 5, h * 0.4); c.lineTo(w * t + 5, h * 0.4); c.closePath(); c.fill();
    }
  },
};

/* Los objetos de Micelaria que valen tal cual (mesa, cama, barril, roca, helecho...) se toman de
   su catálogo en render.js; aquí solo se añade lo propio del pantano. */
export const PANTANO_PROPS = {};

/* ---------------- adornos del suelo (debajo de los objetos) ---------------- */

const reedsAt = (c, x, y, r) => {
  for (let i = 0; i < 5; i++) {
    const px = x + (r() - 0.5) * 16, h = 18 + r() * 22;
    c.strokeStyle = r() > 0.5 ? '#3f7a54' : '#2f5f45';
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(px, y + 4);
    c.quadraticCurveTo(px + (r() - 0.5) * 10, y - h * 0.5, px + (r() - 0.5) * 14, y - h);
    c.stroke();
    if (r() > 0.62) { c.fillStyle = '#5a3d22'; c.fillRect(px + (r() - 0.5) * 12 - 2, y - h - 6, 4, 10); }
  }
};

export function pantanoDecor(c, floors, r) {
  // senderos de barro pisado: solo sobre tierra firme (ni agua, ni salas, ni muelles)
  masked(c, (t) => {
    t.lineCap = 'round';
    t.lineJoin = 'round';
    for (const p of PATHS) {
      t.strokeStyle = 'rgba(20,18,12,.3)';
      t.lineWidth = 84;
      t.beginPath(); p.forEach((q, i) => (i ? t.lineTo(q[0], q[1]) : t.moveTo(q[0], q[1]))); t.stroke();
      t.strokeStyle = 'rgba(110,98,66,.2)';
      t.lineWidth = 56;
      t.beginPath(); p.forEach((q, i) => (i ? t.lineTo(q[0], q[1]) : t.moveTo(q[0], q[1]))); t.stroke();
    }
  }, [...WATERS, ...roomPolys(floors), ...DOCKS]);
  // juncos y espadañas en las orillas del agua (no sobre los muelles)
  for (const wp of WATERS) {
    const step = wp === POND ? 3 : 2;
    for (let i = 0; i < wp.length; i += step) {
      const [x0, y0] = wp[i], [x1, y1] = wp[(i + 1) % wp.length];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      const dx = mx - (wp.reduce((s, q) => s + q[0], 0) / wp.length), dy = my - (wp.reduce((s, q) => s + q[1], 0) / wp.length);
      const l = Math.hypot(dx, dy) || 1;
      const px = mx + (dx / l) * 24, py = my + (dy / l) * 24;
      if (onDock(px, py) || onDock(mx, my)) continue;
      if (r() > 0.55) reedsAt(c, px, py, r);
    }
  }
  // muelles: sombra sobre el agua, travesaños y postes con cuerda
  for (const d of DOCKS) {
    c.save();
    c.beginPath();
    d.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
    c.closePath();
    c.strokeStyle = 'rgba(2,10,8,.5)';
    c.lineWidth = 16;
    c.stroke();
    c.strokeStyle = 'rgba(255,225,170,.16)';
    c.lineWidth = 2;
    c.stroke();
    c.restore();
  }
  for (const d of DOCKS) {
    const n = d.length;
    if (n > 5) continue; // los arcos y la plataforma no llevan poste: se verían como puntos sueltos
    for (let i = 0; i < n; i++) {
      const [x0, y0] = d[i], [x1, y1] = d[(i + 1) % n];
      const len = Math.hypot(x1 - x0, y1 - y0);
      for (let t = 0; t <= len; t += 110) {
        const px = x0 + ((x1 - x0) * t) / len, py = y0 + ((y1 - y0) * t) / len;
        c.fillStyle = 'rgba(0,0,0,.35)';
        c.beginPath(); c.arc(px + 2, py + 3, 8, 0, TAU); c.fill();
        c.fillStyle = '#3a2a1b';
        c.beginPath(); c.arc(px, py, 7, 0, TAU); c.fill();
        c.fillStyle = '#7a5f3a';
        c.beginPath(); c.arc(px - 1, py - 1, 4.5, 0, TAU); c.fill();
      }
    }
  }
  // el campo de setas: halos de micelio de colores
  const cols = ['255,120,200', '90,230,235', '255,200,110', '170,140,255', '150,240,110'];
  for (let i = 0; i < 160; i++) {
    const x = 2480 + r() * 1150, y = 230 + r() * 840;
    if (!inPoly(CAMPO, x, y)) continue;
    glow(c, x, y, 40 + r() * 70, cols[Math.floor(r() * cols.length)], 0.1);
  }
  // el suelo de la zona muerta: ceniza clara y huesos de raíz
  for (let i = 0; i < 120; i++) {
    const x = 210 + r() * 1050, y = 960 + r() * 900;
    if (!inPoly(MUERTOS, x, y)) continue;
    c.fillStyle = 'rgba(170,160,140,.07)';
    c.beginPath(); c.ellipse(x, y, 20 + r() * 40, 8 + r() * 14, r() * TAU, 0, TAU); c.fill();
  }
  // venas de raíz gigante bajo las raíces
  c.strokeStyle = 'rgba(80,56,32,.45)';
  c.lineWidth = 5;
  for (let i = 0; i < 40; i++) {
    const x = 1800 + r() * 850, y = 1800 + r() * 450;
    if (!inPoly(RAICES, x, y)) continue;
    c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 40, y - 30, x + 90, y + 30, x + 140, y + r() * 30 - 15); c.stroke();
  }
  // charcos de luz en el suelo de la cueva
  for (let i = 0; i < 14; i++) glow(c, 2800 + r() * 520, 1620 + r() * 560, 30 + r() * 40, i % 2 ? '120,230,255' : '190,150,255', 0.14);
}

/* ---------------- por encima de objetos y tareas ---------------- */

export function pantanoOverlay(c, floors, obst, r) {
  // el agua, más oscura y turbia, y una orilla lisa de barro que tapa el escalón de la rejilla
  masked(c, (t) => {
    for (const wp of WATERS) {
      t.beginPath();
      wp.forEach((q, i) => (i ? t.lineTo(q[0], q[1]) : t.moveTo(q[0], q[1])));
      t.closePath();
      t.fillStyle = 'rgba(4,34,26,.46)';
      t.fill();
      t.lineJoin = 'round';
      t.strokeStyle = 'rgba(14,26,18,.9)';
      t.lineWidth = 30;
      t.stroke();
      t.strokeStyle = 'rgba(60,92,60,.5)';
      t.lineWidth = 9;
      t.stroke();
      t.strokeStyle = 'rgba(170,235,205,.22)';
      t.lineWidth = 2;
      t.stroke();
    }
  }, DOCKS);
  // bruma baja pegada al agua: manchas blandas sobre la charca y la laguna
  for (const wp of WATERS) {
    const xs = wp.map((q) => q[0]), ys = wp.map((q) => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const n = Math.round(((x1 - x0) * (y1 - y0)) / 26000) + 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
      glow(c, x, y, 50 + r() * 90, '190,235,215', 0.07 + r() * 0.06);
    }
  }
  // esporas y luciérnagas sueltas (un punto de luz, no un objeto)
  const cols = ['170,255,220', '255,230,150', '255,160,220'];
  for (let i = 0; i < 260; i++) {
    const x = 160 + r() * 3480, y = 200 + r() * 2000;
    if (inWater(x, y) || !inPoly(OUTDOORS, x, y)) continue;
    glow(c, x, y, 7 + r() * 8, cols[Math.floor(r() * cols.length)], 0.5);
  }
}

/* ---------------- la niebla que se desliza (se pinta cada fotograma) ---------------- */

let FOG = null;
function fogSprite() {
  if (FOG) return FOG;
  const s = document.createElement('canvas');
  s.width = 640;
  s.height = 360;
  const g = s.getContext('2d');
  const r = (() => { let a = 7; return () => { a = (Math.imul(a, 1103515245) + 12345) >>> 0; return a / 4294967296; }; })();
  for (let i = 0; i < 26; i++) glow(g, 90 + r() * 460, 70 + r() * 220, 70 + r() * 110, '205,238,222', 0.2);
  FOG = s;
  return s;
}

/* Dos capas de bruma que cruzan a distinta velocidad, en coordenadas del mundo. Van por debajo de
   los jugadores y son tan tenues que no tapan nada: solo dan ambiente. */
export function pantanoAtmos(ctx, v) {
  const sp = fogSprite();
  ctx.save();
  for (const [scale, speed, alpha, off] of [[2.4, 14, 0.2, 0], [3.4, -9, 0.14, 0.5]]) {
    const tw = sp.width * scale, th = sp.height * scale;
    const ox = ((v.T * speed + off * tw) % tw + tw) % tw, oy = ((v.T * speed * 0.3 + off * th) % th + th) % th;
    ctx.globalAlpha = alpha;
    const x0 = Math.floor((v.cx - ox) / tw), y0 = Math.floor((v.cy - oy) / th);
    for (let gx = x0; gx * tw + ox < v.cx + v.vw; gx++) {
      for (let gy = y0; gy * th + oy < v.cy + v.vh; gy++) ctx.drawImage(sp, gx * tw + ox, gy * th + oy, tw, th);
    }
  }
  ctx.restore();
}
