/* La aldea de Micelaria con más cuerpo: muros propios de cada edificio (tejados de seta,
   tablones, piedra de cueva, empalizada...), texturas de suelo y los objetos de las tareas
   propias de la aldea. Los caminos, la plaza, los tejados y las orillas están en
   micelariaLayout. Solo pinta: ni la colisión ni la lógica del juego pasan por aquí. */

import { blob, blade, dome, rr } from './micelariaArt';
import { treeSprite } from './micelariaLayout';

export { villageDecor, villageOverlay } from './micelariaLayout';

const TAU = Math.PI * 2;

/* ---------------- qué muro lleva cada edificio ---------------- */
// Cada suelo con `room` trae en sus opciones el estilo de su muro (opts.wall); lo que no es de
// ningún edificio (el contorno del claro) es arboleda.
const inPoly = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

export function wallStyleAt(floors, x, y) {
  for (let i = floors.length - 1; i >= 0; i--) {
    const f = floors[i], o = f[7];
    if (!o || !o.wall || !o.poly) continue;
    if (x < f[0] - 4 || y < f[1] - 4 || x > f[0] + f[2] + 4 || y > f[1] + f[3] + 4) continue;
    if (inPoly(o.poly, x, y)) return o.wall;
  }
  return 'forest';
}


/* ---------------- muros ---------------- */

export function villageWallCell(c, x, y, s, r, style) {
  if (style === 'water') return; // el arroyo ya está pintado: la orilla la dibuja la capa de encima
  if (style.startsWith('cap')) return; // el tejado de seta se pinta entero por encima (micelariaLayout)
  if (style === 'timber') {
    c.fillStyle = '#4a3622';
    c.fillRect(x, y, 20, 20);
    c.fillStyle = '#b69a68'; // tablón de tallo, con la luz arriba
    c.fillRect(x + 1, y + 1, 18, 18);
    c.fillStyle = 'rgba(70,46,22,.24)';
    for (let i = 0; i < 3; i++) c.fillRect(x + 3 + i * 6 + r() * 2, y + 1, 1.6, 18);
    c.fillStyle = 'rgba(255,240,205,.16)';
    c.fillRect(x + 1, y + 1, 18, 3);
    if (s.so) { c.fillStyle = 'rgba(40,24,10,.38)'; c.fillRect(x, y + 13, 20, 7); }
    return;
  }
  if (style === 'stalk') {
    c.fillStyle = '#6f5e3c';
    c.fillRect(x, y, 20, 20);
    c.fillStyle = r() > 0.5 ? '#d8c79c' : '#cbb88a';
    c.fillRect(x + 1, y + 1, 18, 18);
    c.fillStyle = 'rgba(140,110,70,.22)';
    c.fillRect(x + 1 + r() * 14, y + 1, 1.6, 18);
    return;
  }
  if (style === 'rock') {
    c.fillStyle = '#2c302e';
    c.fillRect(x, y, 20, 20);
    c.fillStyle = r() > 0.5 ? '#4a504d' : '#3d4340';
    c.fillRect(x + 1, y + 1, 18, 18);
    return;
  }
  if (style === 'glow') {
    c.fillStyle = '#15262a';
    c.fillRect(x, y, 20, 20);
    return;
  }
  if (style === 'fence') {
    c.fillStyle = '#2a2014';
    c.fillRect(x, y, 20, 20);
    c.fillStyle = '#6b5030';
    c.fillRect(x + 1, y + 1, 18, 18);
    return;
  }
}

/* Segunda pasada de los muros que no son arboleda: lo que da el aspecto (postes de la
   empalizada, rocas, setas luminosas, juntas de los tablones). */
export function villageWallTop(c, cells, r) {
  for (const [x, y, n, so, w, e, style] of cells) {
    const cx = x + 10, cy = y + 10;
    if (style === 'timber') {
      // viga cada dos celdas y, de vez en cuando, un ojo de buey con luz cálida
      if (((x + y) / 20) % 6 === 0) {
        c.fillStyle = '#5a3f24';
        c.fillRect(x + 4, y + 1, 12, 18);
        c.fillStyle = 'rgba(255,230,180,.15)';
        c.fillRect(x + 4, y + 1, 12, 2);
      }
      if (((x * 3 + y * 7) / 20) % 13 === 0) {
        c.fillStyle = '#3b2814';
        c.beginPath(); c.arc(cx, cy, 7.5, 0, TAU); c.fill();
        c.fillStyle = '#ffd98a';
        c.beginPath(); c.arc(cx, cy, 5.2, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)';
        c.beginPath(); c.arc(cx - 1.6, cy - 1.8, 1.8, 0, TAU); c.fill();
      }
    } else if (style === 'stalk') {
      if (r() > 0.55) { // manchas del tallo y un poco de musgo
        c.fillStyle = 'rgba(120,150,90,.35)';
        c.beginPath(); c.ellipse(cx + r() * 8 - 4, cy + r() * 8 - 4, 4 + r() * 4, 3 + r() * 3, r() * 3, 0, TAU); c.fill();
      }
    } else if (style === 'rock') {
      const R = 11 + r() * 7;
      const ox = w ? 5 : e ? -5 : 0, oy = n ? 5 : so ? -5 : 0;
      c.fillStyle = 'rgba(0,0,0,.3)';
      blob(c, cx + ox + 2, cy + oy + 4, R, 8, r() * 6, 0.8); c.fill();
      c.fillStyle = r() > 0.5 ? '#656b66' : '#5a605b';
      blob(c, cx + ox, cy + oy, R, 8, r() * 6, 0.8); c.fill();
      c.fillStyle = 'rgba(255,255,255,.14)';
      blob(c, cx + ox - 2, cy + oy - 3, R * 0.55, 7, r() * 6, 0.7); c.fill();
      if (r() > 0.8) { c.fillStyle = 'rgba(110,200,170,.4)'; blob(c, cx + ox + 3, cy + oy + 2, 5, 6, r() * 6, 0.7); c.fill(); }
    } else if (style === 'glow') {
      if (r() > 0.45) {
        const R = 10 + r() * 9;
        const ox = w ? 6 : e ? -6 : 0, oy = n ? 6 : so ? -6 : 0;
        const hue = r() > 0.5 ? ['#3fd8c8', '#8ff2e4'] : ['#8a6be8', '#c1a8ff'];
        const gl = c.createRadialGradient(cx + ox, cy + oy, 1, cx + ox, cy + oy, R * 2.2);
        gl.addColorStop(0, hue[0] + '66'); gl.addColorStop(1, hue[0] + '00');
        c.fillStyle = gl;
        c.beginPath(); c.arc(cx + ox, cy + oy, R * 2.2, 0, TAU); c.fill();
        c.fillStyle = '#d9d2bd';
        c.fillRect(cx + ox - 2, cy + oy, 4, R * 0.7);
        c.fillStyle = hue[0];
        dome(c, cx + ox, cy + oy, R, R * 0.8); c.fill();
        c.fillStyle = hue[1];
        c.beginPath(); c.ellipse(cx + ox - R * 0.25, cy + oy - R * 0.4, R * 0.3, R * 0.16, 0, 0, TAU); c.fill();
      } else {
        c.fillStyle = 'rgba(40,70,70,.9)';
        blob(c, cx, cy, 9 + r() * 4, 7, r() * 5, 0.8); c.fill();
      }
    } else if (style === 'fence') {
      // empalizada: un poste cada 20 px y dos travesaños
      const horiz = n || so;
      c.fillStyle = 'rgba(30,20,10,.4)';
      c.fillRect(x, y + 17, 20, 3);
      c.fillStyle = '#8b6a3e';
      if (horiz) { c.fillRect(x, y + 6, 20, 3); c.fillRect(x, y + 13, 20, 3); }
      else { c.fillRect(x + 6, y, 3, 20); c.fillRect(x + 13, y, 3, 20); }
      c.fillStyle = '#a27c4a';
      c.beginPath(); c.arc(cx, cy, 5.5, 0, TAU); c.fill();
      c.fillStyle = '#5a4026';
      c.beginPath(); c.arc(cx, cy, 5.5, 0, TAU); c.lineWidth = 1.6; c.strokeStyle = '#4a331c'; c.stroke();
      c.fillStyle = 'rgba(255,240,200,.3)';
      c.beginPath(); c.arc(cx - 1.5, cy - 1.5, 2, 0, TAU); c.fill();
    }
  }
}

/* ---------------- suelos ---------------- */

export const VILLAGE_TEX = {
  path(c, x, y, w, h, r) { // camino de lajas con hierba entre las juntas
    c.fillStyle = '#7a6342';
    c.fillRect(x, y, w, h);
    const S = 40;
    for (let ty = y; ty < y + h; ty += S) {
      const off = ((ty - y) / S) % 2 ? S / 2 : 0;
      for (let tx = x - off; tx < x + w; tx += S) {
        const px = Math.max(x, tx), pw = Math.min(x + w, tx + S) - px;
        const ph = Math.min(S, y + h - ty);
        if (pw < 6) continue;
        c.fillStyle = ['#9b8460', '#8d7752', '#a58d68', '#83704c'][Math.floor(r() * 4)];
        rr(c, px + 2, ty + 2, pw - 4, ph - 4, 7);
        c.fill();
        c.fillStyle = 'rgba(255,245,215,.12)';
        rr(c, px + 4, ty + 3, pw - 9, 5, 3);
        c.fill();
        c.fillStyle = 'rgba(30,18,6,.22)';
        c.fillRect(px + 3, ty + ph - 5, pw - 6, 3);
        if (r() > 0.86) { c.fillStyle = 'rgba(96,150,84,.45)'; c.beginPath(); c.ellipse(px + pw * r(), ty + ph - 3, 6, 3, 0, 0, TAU); c.fill(); }
      }
    }
    for (let i = 0; i < (w * h) / 7000; i++) blade(c, x + r() * w, y + r() * h, 3 + r() * 4, r() > 0.5);
  },
  crop(c, x, y, w, h, r) { // huerto: tierra labrada y seca, con surcos finos. Sin setas: las setas son de los bancales
    c.fillStyle = '#8f7350';
    c.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 900; i++) { // terrones claros y oscuros
      c.fillStyle = r() > 0.5 ? 'rgba(255,236,196,.07)' : 'rgba(50,30,12,.10)';
      c.beginPath(); c.ellipse(x + r() * w, y + r() * h, 6 + r() * 14, 3 + r() * 6, r() * 3, 0, TAU); c.fill();
    }
    c.lineCap = 'round';
    for (let ry = y + 14; ry < y + h - 10; ry += 30) { // surcos ondulados, a trozos
      let px = x + 8 + r() * 30;
      while (px < x + w - 20) {
        const len = 50 + r() * 90, wob = (r() - 0.5) * 8;
        c.strokeStyle = 'rgba(55,34,14,.30)'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(px, ry); c.quadraticCurveTo(px + len / 2, ry + wob, px + len, ry); c.stroke();
        c.strokeStyle = 'rgba(255,238,200,.12)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(px, ry + 4); c.quadraticCurveTo(px + len / 2, ry + 4 + wob, px + len, ry + 4); c.stroke();
        px += len + 18 + r() * 40;
      }
    }
    for (let i = 0; i < (w * h) / 5200; i++) { // guijarros y briznas de paja
      const px = x + r() * w, py = y + r() * h;
      if (r() > 0.45) { c.fillStyle = 'rgba(150,140,125,.6)'; c.beginPath(); c.ellipse(px, py, 3 + r() * 3, 2 + r() * 2, 0, 0, TAU); c.fill(); }
      else { c.strokeStyle = 'rgba(214,190,120,.6)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 8 + r() * 6, py - 2 + r() * 4); c.stroke(); }
    }
  },
  planks(c, x, y, w, h, r) { // entarimado: tablas claras con nudos, juntas y clavos
    const ph = 40;
    for (let ry = y; ry < y + h; ry += ph) {
      const hh = Math.min(ph, y + h - ry);
      c.fillStyle = ['#a07a4c', '#aa8454', '#96714a', '#b08a5a'][Math.floor(r() * 4)];
      c.fillRect(x, ry, w, hh);
      c.fillStyle = 'rgba(255,238,200,.12)';
      c.fillRect(x, ry + 2, w, 4);
      c.fillStyle = 'rgba(40,24,10,.45)';
      c.fillRect(x, ry, w, 2);
      c.fillStyle = 'rgba(40,24,10,.16)';
      c.fillRect(x, ry + hh - 5, w, 3);
      // juntas verticales escalonadas
      let px = x + r() * 120;
      while (px < x + w) {
        c.fillStyle = 'rgba(40,24,10,.4)';
        c.fillRect(px, ry, 2, hh);
        c.fillStyle = 'rgba(210,190,150,.5)';
        c.beginPath(); c.arc(px + 7, ry + 8, 1.4, 0, TAU); c.arc(px + 7, ry + hh - 9, 1.4, 0, TAU); c.fill();
        px += 150 + r() * 120;
      }
      // veta y algún nudo
      c.strokeStyle = 'rgba(70,44,20,.2)';
      c.lineWidth = 1.2;
      for (let i = 0; i < w / 80; i++) {
        const gx = x + r() * w, gy = ry + 8 + r() * (hh - 16);
        c.beginPath(); c.moveTo(gx, gy); c.bezierCurveTo(gx + 14, gy - 3, gx + 28, gy + 3, gx + 44 + r() * 30, gy); c.stroke();
      }
      if (r() > 0.7) {
        const kx = x + 20 + r() * (w - 40), ky = ry + hh / 2;
        c.fillStyle = 'rgba(60,36,16,.5)';
        c.beginPath(); c.ellipse(kx, ky, 6, 3.4, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(60,36,16,.3)'; c.lineWidth = 1;
        c.beginPath(); c.ellipse(kx, ky, 10, 5.5, 0, 0, TAU); c.stroke();
      }
    }
  },
  cave(c, x, y, w, h, r) { // cueva: losas de roca oscura con musgo y vetas de cristal
    c.fillStyle = '#3b3f3e';
    c.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 5200; i++) {
      const px = x + r() * w, py = y + r() * h, q = 34 + r() * 40;
      c.fillStyle = r() > 0.5 ? 'rgba(86,92,88,.55)' : 'rgba(54,58,57,.6)';
      blob(c, px, py, q, 9, r() * 9, 0.75); c.fill();
      c.strokeStyle = 'rgba(14,18,18,.5)'; c.lineWidth = 2.4; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.06)';
      blob(c, px - q * 0.2, py - q * 0.25, q * 0.55, 8, r() * 9, 0.7); c.fill();
    }
    for (let i = 0; i < (w * h) / 26000; i++) {
      c.fillStyle = 'rgba(96,150,84,.28)';
      blob(c, x + r() * w, y + r() * h, 16 + r() * 22, 8, r() * 9, 0.7); c.fill();
    }
    c.fillStyle = 'rgba(120,235,225,.55)';
    for (let i = 0; i < (w * h) / 9000; i++) { c.beginPath(); c.arc(x + r() * w, y + r() * h, 1.2 + r() * 1.4, 0, TAU); c.fill(); }
  },
  dirt(c, x, y, w, h, r) { // almacén: tierra batida, pisadas y paja suelta
    c.fillStyle = '#5c4630';
    c.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 1500; i++) {
      const k = r();
      c.fillStyle = k > 0.7 ? 'rgba(200,170,120,.12)' : k > 0.3 ? 'rgba(20,12,4,.14)' : 'rgba(130,100,62,.18)';
      c.beginPath(); c.ellipse(x + r() * w, y + r() * h, 4 + r() * 16, 2 + r() * 8, r() * TAU, 0, TAU); c.fill();
    }
    c.strokeStyle = 'rgba(224,190,100,.55)';
    c.lineWidth = 1.4;
    for (let i = 0; i < (w * h) / 5200; i++) {
      const px = x + r() * w, py = y + r() * h, a = r() * TAU;
      c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9); c.stroke();
    }
  },
  grass(c, x, y, w, h, r) { // pradera de la aldea: manchas de tono, hierba y tréboles
    const area = (w * h) / 1e6;
    for (let i = 0; i < area * 30; i++) {
      c.fillStyle = ['rgba(34,84,42,.2)', 'rgba(150,196,100,.16)', 'rgba(90,150,72,.2)', 'rgba(120,98,52,.1)'][i % 4];
      blob(c, x + r() * w, y + r() * h, 50 + r() * 130, 10, i * 1.9, 0.72); c.fill();
    }
    for (let i = 0; i < area * 2600; i++) {
      c.strokeStyle = r() > 0.5 ? 'rgba(150,212,112,.42)' : 'rgba(70,128,64,.45)';
      c.lineWidth = 1.5;
      const px = x + r() * w, py = y + r() * h;
      c.beginPath(); c.moveTo(px, py); c.lineTo(px + r() * 6 - 3, py - 4 - r() * 8); c.stroke();
    }
    for (let i = 0; i < area * 150; i++) { // tréboles
      const px = x + r() * w, py = y + r() * h;
      c.fillStyle = 'rgba(48,110,56,.5)';
      for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(px + Math.cos(k * 2.1) * 3, py + Math.sin(k * 2.1) * 3, 2.6, 0, TAU); c.fill(); }
    }
  },
  river(c, x, y, w, h, r) { // arroyo: aguas más claras en el centro, corrientes y destellos
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#2c7a8c'); g.addColorStop(0.5, '#3a95a2'); g.addColorStop(1, '#2a7487');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 5200; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(18,60,80,.22)' : 'rgba(140,224,226,.16)';
      blob(c, x + r() * w, y + r() * h, 16 + r() * 34, 9, i, 0.5); c.fill();
    }
    c.lineCap = 'round';
    for (let i = 0; i < (w * h) / 5000; i++) { // líneas de corriente, casi verticales
      const px = x + r() * w, py = y + r() * h, len = 22 + r() * 40;
      c.strokeStyle = 'rgba(214,248,250,.3)'; c.lineWidth = 2 + r() * 1.6;
      c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + 6 * (r() - 0.5), py + len / 2, px + 8 * (r() - 0.5), py + len); c.stroke();
    }
    c.lineCap = 'butt';
    for (let i = 0; i < (w * h) / 16000; i++) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(x + r() * w, y + r() * h, 1.2 + r() * 1.2, 0, TAU); c.fill(); }
  },
  stars(c, x, y, w, h, r) { // observatorio: suelo de noche cerrada con estrellas
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#273560'); g.addColorStop(1, '#161f42');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 5200; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(90,110,190,.18)' : 'rgba(10,14,40,.3)';
      blob(c, x + r() * w, y + r() * h, 20 + r() * 40, 9, i, 0.6); c.fill();
    }
    for (let i = 0; i < (w * h) / 1500; i++) {
      const px = x + r() * w, py = y + r() * h, k = r();
      c.fillStyle = k > 0.9 ? 'rgba(255,236,170,.95)' : 'rgba(220,232,255,.7)';
      c.beginPath(); c.arc(px, py, k > 0.9 ? 2.2 : 1 + r(), 0, TAU); c.fill();
    }
  },
};

/* ---------------- objetos del escenario ---------------- */

function roof(c, w, h, cap, cap2, spot) {
  // sombra sobre el tejado del muro
  c.fillStyle = 'rgba(0,0,0,.28)';
  c.beginPath(); c.ellipse(4, h / 2 + 6, w / 2 + 2, h * 0.22, 0, 0, TAU); c.fill();
  // tallo asomando por debajo
  c.fillStyle = '#d8c79c';
  c.fillRect(-w * 0.42, h / 2 - 12, w * 0.84, 12);
  c.fillStyle = 'rgba(120,96,60,.35)';
  for (let px = -w * 0.42; px < w * 0.42; px += 9) c.fillRect(px, h / 2 - 12, 1.6, 12);
  // sombrero
  const g = c.createRadialGradient(-w * 0.12, -h * 0.1, 8, 0, h * 0.2, w * 0.55);
  g.addColorStop(0, cap2);
  g.addColorStop(1, cap);
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, h / 2 - 8, w / 2, h * 0.92, 0, Math.PI, 0);
  c.quadraticCurveTo(0, h / 2 + 8, -w / 2, h / 2 - 8);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(40,10,20,.35)'; c.lineWidth = 3; c.stroke();
  // láminas del borde y reflejo
  c.strokeStyle = 'rgba(255,235,220,.22)'; c.lineWidth = 2;
  for (let i = -w * 0.46; i < w * 0.46; i += 14) { c.beginPath(); c.moveTo(i, h / 2 - 8); c.lineTo(i * 0.96, h / 2 - 22); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.14)';
  c.beginPath(); c.ellipse(-w * 0.18, -h * 0.18, w * 0.2, h * 0.11, -0.2, 0, TAU); c.fill();
  // manchas
  c.fillStyle = spot;
  const pts = [[-0.3, 0.08, 15], [-0.05, -0.3, 19], [0.24, -0.06, 14], [0.38, 0.14, 9], [-0.4, 0.25, 8], [0.1, 0.2, 10], [-0.17, -0.05, 7]];
  for (const [px, py, s] of pts) { c.beginPath(); c.ellipse(px * w, py * h, s, s * 0.7, 0, 0, TAU); c.fill(); }
}

const wood = (c, x, y, w, h, base, r = 6) => {
  c.fillStyle = 'rgba(0,0,0,.18)'; rr(c, x + 2, y + 4, w, h, r); c.fill();
  c.fillStyle = base; rr(c, x, y, w, h, r); c.fill();
  c.fillStyle = 'rgba(255,238,200,.14)'; rr(c, x + 3, y + 3, w - 6, 4, 2); c.fill();
  c.strokeStyle = 'rgba(40,24,10,.5)'; c.lineWidth = 2; rr(c, x, y, w, h, r); c.stroke();
};

export const VILLAGE_OBST = {
  bed(c, w, h) { // cama con manta de lunares y almohada
    wood(c, -w / 2, -h / 2, w, h, '#6a4b2c', 8);
    c.fillStyle = '#e8dcbf'; rr(c, -w / 2 + 6, -h / 2 + 6, w * 0.26, h - 12, 7); c.fill();
    c.fillStyle = '#a8302c'; rr(c, -w / 2 + w * 0.3, -h / 2 + 6, w * 0.7 - 8, h - 12, 7); c.fill();
    c.fillStyle = 'rgba(255,244,222,.85)';
    for (const [px, py] of [[0.42, 0.3], [0.62, 0.65], [0.8, 0.32], [0.55, 0.45], [0.88, 0.7]]) { c.beginPath(); c.arc(-w / 2 + px * w, -h / 2 + py * h, 4.4, 0, TAU); c.fill(); }
  },
  cropbed(c, w, h) { // bancal elevado: marco de madera, tierra negra y setas grandes
    wood(c, -w / 2, -h / 2, w, h, '#6a4b2c', 7);
    c.fillStyle = '#2b1b0e'; rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 5); c.fill();
    c.fillStyle = 'rgba(255,236,196,.07)'; rr(c, -w / 2 + 8, -h / 2 + 7, w - 16, 4, 2); c.fill();
    const n = Math.max(2, Math.round(w / 52));
    for (let i = 0; i < n; i++) {
      const px = -w / 2 + (w / n) * (i + 0.5);
      const k = (i * 5) % 3;
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(px + 2, 7, 11, 4, 0, 0, TAU); c.fill();
      c.fillStyle = '#f0e8d2'; c.fillRect(px - 3, -3, 6, 11);
      c.fillStyle = k === 0 ? '#d4472f' : k === 1 ? '#e7a33a' : '#a45bc2';
      dome(c, px, -2, 14, 12); c.fill();
      c.fillStyle = 'rgba(255,244,222,.9)';
      for (const [dx, dy] of [[-5, -8], [4, -9], [0, -5]]) { c.beginPath(); c.arc(px + dx, dy, 1.8, 0, TAU); c.fill(); }
    }
  },
  shelf(c, w, h) { // estante de la despensa con frascos y cestas
    wood(c, -w / 2, -h / 2, w, h, '#5a3d24', 4);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(-w / 2 + 4, 2, w - 8, 3);
    const cols = ['#4fe3d0', '#e9c46a', '#c77dff', '#80ed99', '#ff9f68', '#8fc7ff', '#e8dcbf'];
    for (let i = 0; i < Math.floor(w / 24); i++) {
      const px = -w / 2 + 14 + i * 24, py = i % 2 ? h * 0.22 : -h * 0.2;
      c.fillStyle = cols[i % cols.length]; rr(c, px - 6, py - 7, 12, 14, 3); c.fill();
      c.fillStyle = '#8a6a44'; c.fillRect(px - 5, py - 9, 10, 3);
    }
  },
  barrel(c, w, h) { // barril visto desde arriba
    const R = Math.min(w, h) * 0.46;
    c.fillStyle = '#4a331c'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.fillStyle = '#8a6a44'; c.beginPath(); c.arc(0, 0, R - 3, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(50,30,14,.5)'; c.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * R * 0.3, -R * 0.9); c.lineTo(i * R * 0.3, R * 0.9); c.stroke(); }
    c.strokeStyle = '#34363a'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, R * 0.68, 0, TAU); c.stroke();
    shine(c, -R * 0.3, -R * 0.35, R * 0.28, R * 0.14);
  },
  planter(c, w, h) { // jardinera con setas y flores
    wood(c, -w / 2, -h / 2, w, h, '#6a4b2c', 6);
    c.fillStyle = '#3c2a16'; rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 4); c.fill();
    const n = Math.max(2, Math.floor(w / 26));
    for (let i = 0; i < n; i++) {
      const px = -w / 2 + 14 + i * ((w - 28) / Math.max(1, n - 1));
      c.fillStyle = '#e8dcbf'; c.fillRect(px - 1.6, -2, 3.2, 8);
      c.fillStyle = ['#c9573f', '#a86b9c', '#d9a15a'][i % 3]; dome(c, px, 0, 8, 7); c.fill();
      c.fillStyle = ['#f3e8b0', '#e2b2d6', '#b4e0ff'][i % 3]; c.beginPath(); c.arc(px + 6, -h * 0.2, 3, 0, TAU); c.fill();
    }
  },
  stall(c, w, h) { // puesto del mercado con toldo de rayas
    wood(c, -w / 2, -h / 2 + 10, w, h - 10, '#7a5c38', 5);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = ['#c9573f', '#e8dcbf'][i % 2];
      c.fillRect(-w / 2 + i * (w / 4), -h / 2 + 12, w / 4, h * 0.32);
    }
    c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-w / 2, -h / 2 + 12 + h * 0.32 - 3, w, 3);
    for (let i = 0; i < 4; i++) { c.fillStyle = ['#c9573f', '#e8dcbf'][i % 2]; c.beginPath(); c.arc(-w / 2 + w / 8 + i * (w / 4), -h / 2 + 12 + h * 0.32, w / 8, 0, Math.PI); c.fill(); }
    for (let i = 0; i < 3; i++) { c.fillStyle = ['#c9573f', '#d9a15a', '#a86b9c'][i]; dome(c, -w * 0.28 + i * w * 0.28, h * 0.3, 9, 8); c.fill(); }
  },
  sacks(c, w, h) { // sacos de esporas apilados
    for (const [dx, dy, k] of [[-0.2, 0.1, 1], [0.22, -0.05, 0.9], [0.02, -0.2, 0.8]]) {
      const sw = w * 0.42 * k, sh = h * 0.5 * k;
      c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(dx * w + 2, dy * h + 5, sw, sh * 0.9, 0, 0, TAU); c.fill();
      c.fillStyle = '#b79a62'; c.beginPath(); c.ellipse(dx * w, dy * h, sw, sh, 0, 0, TAU); c.fill();
      c.fillStyle = '#cdb27a'; c.beginPath(); c.ellipse(dx * w - 3, dy * h - 3, sw * 0.7, sh * 0.6, 0, 0, TAU); c.fill();
      c.strokeStyle = '#6a4b2c'; c.lineWidth = 2; c.beginPath(); c.moveTo(dx * w - 6, dy * h - sh * 0.3); c.lineTo(dx * w + 6, dy * h - sh * 0.3); c.stroke();
    }
  },
  tree(c, w, h) { // árbol de la aldea, visto desde arriba
    const m = c.getTransform();
    const seed = Math.abs(Math.round(m.e * 0.37 + m.f * 0.91));
    const pal = seed % 11 === 0 ? [ '#3a2a18', '#7a3f1d', '#b8662a', '#e3a04c' ] : [['#173620', '#245530', '#38793e', '#5aa653'], ['#1a3b2b', '#285a42', '#3d8059', '#66aa7e'], ['#1f3d1f', '#31602b', '#4d8a39', '#7ab34c']][seed % 3];
    treeSprite(c, 0, -h * 0.04, Math.min(w, h) * 0.4, pal, seed);
  },
  cap(c, w, h) { roof(c, w, h, '#a8302c', '#d9573f', 'rgba(255,244,222,.92)'); },       // Casa Seta: amanita
  capv(c, w, h) { roof(c, w, h, '#5b3b8c', '#8a62c4', 'rgba(250,236,255,.9)'); },       // Casa del Té: violeta
};

/* ---------------- objetos de las tareas propias de la aldea ---------------- */

const shine = (c, x, y, rx, ry) => { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x, y, rx, ry, -0.5, 0, TAU); c.fill(); };

export const VILLAGE_PROPS = {
  cauldron(c, w, h) { // marmita de hierro con sopa de setas
    const R = Math.min(w, h) * 0.46;
    c.fillStyle = 'rgba(255,120,40,.35)'; c.beginPath(); c.arc(0, 4, R + 9, 0, TAU); c.fill(); // brasas
    c.fillStyle = '#2d2b2c'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.fillStyle = '#44403f'; c.beginPath(); c.arc(0, 0, R - 3, 0, TAU); c.fill();
    c.fillStyle = '#a9743c'; c.beginPath(); c.arc(0, 0, R - 8, 0, TAU); c.fill();
    c.fillStyle = '#c99358'; c.beginPath(); c.arc(-2, -2, R - 13, 0, TAU); c.fill();
    for (const [dx, dy, col] of [[-8, -4, '#c9573f'], [7, 3, '#e8dcbf'], [-2, 9, '#d9a15a'], [9, -8, '#c9573f']]) {
      c.fillStyle = col; dome(c, dx, dy, 6, 5); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.55)';
    for (const [dx, dy] of [[-12, 6], [4, -11], [12, 8]]) { c.beginPath(); c.arc(dx, dy, 2.2, 0, TAU); c.fill(); }
    c.strokeStyle = '#5a3c1e'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(R * 0.2, -R * 0.1); c.lineTo(R + 8, -R - 4); c.stroke(); c.lineCap = 'butt';
    c.fillStyle = '#e8dcbf'; c.beginPath(); c.arc(R + 8, -R - 4, 4.4, 0, TAU); c.fill();
  },
  teaset(c, w, h) { // bandeja con tetera y tazas
    c.fillStyle = '#6a4b2c'; rr(c, -w / 2, -h / 2, w, h, 9); c.fill();
    c.fillStyle = '#8a6a44'; rr(c, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 7); c.fill();
    c.fillStyle = '#e8dcbf'; c.beginPath(); c.ellipse(-8, 1, 13, 11, 0, 0, TAU); c.fill();
    c.fillStyle = '#c9573f'; c.beginPath(); c.ellipse(-8, 1, 9, 7, 0, 0, TAU); c.fill();
    c.fillStyle = '#e8dcbf'; c.fillRect(-23, -3, 8, 4); c.fillRect(3, -5, 7, 3);
    shine(c, -12, -3, 4, 2);
    for (const [dx, dy] of [[18, -8], [18, 9]]) {
      c.fillStyle = '#e8dcbf'; c.beginPath(); c.arc(dx, dy, 6.2, 0, TAU); c.fill();
      c.fillStyle = '#6b3d1c'; c.beginPath(); c.arc(dx, dy, 4.2, 0, TAU); c.fill();
    }
  },
  clothesline(c, w, h) { // tendedero con paños manchados de esporas
    c.fillStyle = '#4a331c';
    for (const sx of [-w / 2 + 4, w / 2 - 4]) { c.beginPath(); c.arc(sx, 0, 5.5, 0, TAU); c.fill(); c.fillStyle = '#6a4b2c'; c.beginPath(); c.arc(sx, -1, 3.8, 0, TAU); c.fill(); c.fillStyle = '#4a331c'; }
    c.strokeStyle = '#d7c8a0'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-w / 2 + 4, -h * 0.28); c.quadraticCurveTo(0, -h * 0.05, w / 2 - 4, -h * 0.28); c.stroke();
    const cols = ['#c9573f', '#e8dcbf', '#6c8fc4', '#d9a15a'];
    for (let i = 0; i < 4; i++) {
      const px = -w / 2 + 16 + i * ((w - 32) / 3);
      c.fillStyle = 'rgba(0,0,0,.2)'; rr(c, px - 9 + 2, -h * 0.2 + 4, 18, 18, 3); c.fill();
      c.fillStyle = cols[i]; rr(c, px - 9, -h * 0.2, 18, 18, 3); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(px - 2, -h * 0.2 + 7, 2, 0, TAU); c.arc(px + 4, -h * 0.2 + 12, 1.6, 0, TAU); c.fill();
    }
  },
  jars(c, w, h) { // estante con frascos luminosos
    c.fillStyle = '#4a331c'; rr(c, -w / 2, -h / 2, w, h, 5); c.fill();
    c.fillStyle = '#6a4b2c'; rr(c, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 4); c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-w / 2 + 3, 0, w - 6, 3);
    const cols = ['#4fe3d0', '#e9c46a', '#c77dff', '#80ed99', '#ff9f68', '#8fc7ff'];
    for (let i = 0; i < 6; i++) {
      const px = -w / 2 + 11 + (i % 3) * ((w - 22) / 2), py = i < 3 ? -h / 4 + 1 : h / 4 - 1;
      c.fillStyle = cols[i] + '55'; c.beginPath(); c.arc(px, py, 10, 0, TAU); c.fill();
      c.fillStyle = cols[i]; rr(c, px - 5, py - 6, 10, 12, 3); c.fill();
      c.fillStyle = '#8a6a44'; c.fillRect(px - 4, py - 8, 8, 3);
      shine(c, px - 2, py - 2, 1.6, 3);
    }
  },
  hearth(c, w, h) { // chimenea de piedra con fuego
    c.fillStyle = '#4b4a46'; rr(c, -w / 2, -h / 2, w, h, 10); c.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      c.fillStyle = i % 2 ? '#8b8a80' : '#74736a';
      blob(c, Math.cos(a) * w * 0.36, Math.sin(a) * h * 0.36, 9, 7, i * 1.7, 0.75); c.fill();
    }
    c.fillStyle = '#1d1514'; c.beginPath(); c.ellipse(0, 0, w * 0.27, h * 0.27, 0, 0, TAU); c.fill();
    const g = c.createRadialGradient(0, 0, 2, 0, 0, w * 0.4);
    g.addColorStop(0, 'rgba(255,220,120,.95)'); g.addColorStop(0.5, 'rgba(255,120,40,.6)'); g.addColorStop(1, 'rgba(255,80,20,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, w * 0.4, 0, TAU); c.fill();
    c.fillStyle = '#ff7b2e'; c.beginPath(); c.moveTo(-7, 6); c.quadraticCurveTo(-6, -8, 0, -14); c.quadraticCurveTo(7, -6, 7, 6); c.fill();
    c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(-3, 6); c.quadraticCurveTo(-3, -3, 0, -7); c.quadraticCurveTo(4, -2, 3, 6); c.fill();
  },
  mortar(c, w, h) { // mortero de piedra con hierbas
    const R = Math.min(w, h) * 0.44;
    c.fillStyle = '#6e6c64'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.fillStyle = '#8f8d83'; c.beginPath(); c.arc(-1, -1, R - 3, 0, TAU); c.fill();
    c.fillStyle = '#3a3d34'; c.beginPath(); c.arc(0, 1, R - 9, 0, TAU); c.fill();
    c.fillStyle = '#5f9a56';
    for (const [dx, dy] of [[-6, 0], [4, 3], [0, -5], [7, -2]]) { c.beginPath(); c.ellipse(dx, dy, 5, 2.6, dx, 0, TAU); c.fill(); }
    c.strokeStyle = '#6a4b2c'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(2, 0); c.lineTo(R + 4, -R * 0.9); c.stroke(); c.lineCap = 'butt';
    c.fillStyle = '#8a6a44'; c.beginPath(); c.arc(R + 4, -R * 0.9, 4.4, 0, TAU); c.fill();
  },
  sprouts(c, w, h) { // bancal con brotes tiernos
    c.fillStyle = '#4a331c'; rr(c, -w / 2, -h / 2, w, h, 9); c.fill();
    c.fillStyle = '#5a3d24'; rr(c, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 7); c.fill();
    c.fillStyle = 'rgba(255,230,190,.1)'; rr(c, -w / 2 + 6, -h / 2 + 5, w - 12, 5, 3); c.fill();
    for (let i = 0; i < 3; i++) {
      const px = -w / 2 + 14 + i * ((w - 28) / 2), py = 2 - (i % 2) * 5;
      c.fillStyle = '#e8dcbf'; c.fillRect(px - 2, py, 4, 11);
      c.fillStyle = ['#c9573f', '#d9a15a', '#a86b9c'][i]; dome(c, px, py + 2, 10, 9); c.fill();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(px - 3, py - 3, 1.9, 0, TAU); c.fill();
      c.strokeStyle = '#6cb35c'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(px + 8, py + 12); c.quadraticCurveTo(px + 14, py + 6, px + 10, py + 1); c.stroke();
    }
  },
  chime(c, w, h) { // carillón de setas colgadas de un travesaño
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, h * 0.4, w * 0.4, h * 0.1, 0, 0, TAU); c.fill();
    c.strokeStyle = '#4a331c'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-w * 0.42, h * 0.42); c.lineTo(-w * 0.42, -h * 0.4); c.lineTo(w * 0.42, -h * 0.4); c.lineTo(w * 0.42, h * 0.42); c.stroke(); c.lineCap = 'butt';
    const cols = ['#c9573f', '#4fe3d0', '#d9a15a', '#a86b9c'];
    for (let i = 0; i < 4; i++) {
      const px = -w * 0.3 + i * (w * 0.2), len = 12 + (i % 2) * 8;
      c.strokeStyle = '#d7c8a0'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px, -h * 0.4); c.lineTo(px, -h * 0.4 + len); c.stroke();
      c.fillStyle = cols[i]; dome(c, px, -h * 0.4 + len + 8, 8, 8); c.fill();
      c.fillStyle = '#e8dcbf'; c.fillRect(px - 1.6, -h * 0.4 + len + 8, 3.2, 7);
    }
  },
};
