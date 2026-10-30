import { makeGrid } from './grid';
import { lightPolygon } from './sight';
import { drawObstacle, drawProp, drawTaskMark, drawButton, OBST_ART, ART } from './props';
import {
  MICELARIA_TEX, MICELARIA_ROOM_TEX, MICELARIA_DEFAULT_TEX, MICELARIA_BG,
  MICELARIA_OBST, MICELARIA_PROPS,
  micelariaButton, micelariaPanel, micelariaReactor, micelariaReactorLive, micelariaDoor,
} from './micelariaArt';
import {
  MICELARIA_FOREST_WALL, MICELARIA_OBST_EXTRA, MICELARIA_PROPS_EXTRA, micelariaGround,
} from './micelariaNature';
import { VILLAGE_TEX, VILLAGE_OBST, VILLAGE_PROPS, villageDecor, villageOverlay } from './micelariaVillage';
import { tr } from '@/lib/i18n';

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* ---------------- texturas del invernadero ---------------- */

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAINT = {
  gravel(c, x, y, w, h, r) {
    for (let i = 0; i < (w * h) / 700; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.16)';
      c.beginPath();
      c.arc(x + r() * w, y + r() * h, 1.4 + r() * 3, 0, 7);
      c.fill();
    }
  },
  beds(c, x, y, w, h, r) {
    for (let ry = y + 12; ry < y + h - 14; ry += 68) {
      const hh = Math.min(40, y + h - 14 - ry);
      if (hh < 10) break;
      c.fillStyle = 'rgba(0,0,0,.24)';
      c.fillRect(x + 14, ry, w - 28, hh);
      c.fillStyle = 'rgba(255,255,255,.06)';
      c.fillRect(x + 14, ry, w - 28, 4);
      for (let px = x + 22; px < x + w - 22; px += 28) {
        c.fillStyle = r() > 0.45 ? 'rgba(150,205,125,.55)' : 'rgba(205,185,115,.45)';
        c.beginPath();
        c.arc(px, ry + hh * 0.55, 2.6, 0, 7);
        c.fill();
      }
    }
  },
  tiles(c, x, y, w, h, r) {
    const TS = 64;
    for (let ty = y; ty < y + h; ty += TS) {
      for (let tx = x; tx < x + w; tx += TS) {
        const tw = Math.min(TS, x + w - tx), th = Math.min(TS, y + h - ty);
        c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)';
        c.fillRect(tx, ty, tw, th);
        c.strokeStyle = 'rgba(0,0,0,.18)';
        c.lineWidth = 2;
        c.strokeRect(tx + 1, ty + 1, tw - 2, th - 2);
      }
    }
  },
  wood(c, x, y, w, h, r) {
    const pw = 128, ph = 46;
    let row = 0;
    for (let ry = y; ry < y + h; ry += ph, row++) {
      const hh = Math.min(ph, y + h - ry);
      const shift = row % 2 ? pw / 2 : 0;
      for (let px = x - shift; px < x + w; px += pw) {
        const x0 = Math.max(px, x), x1 = Math.min(px + pw, x + w);
        c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.055)' : 'rgba(0,0,0,.09)';
        c.fillRect(x0, ry, x1 - x0, hh);
        c.fillStyle = 'rgba(0,0,0,.22)';
        c.fillRect(x0, ry, 2, hh);
      }
      c.fillStyle = 'rgba(0,0,0,.22)';
      c.fillRect(x, ry, w, 2);
    }
    c.strokeStyle = 'rgba(0,0,0,.12)';
    c.lineWidth = 1.5;
    for (let i = 0; i < (w * h) / 18000; i++) {
      const px = x + r() * w, py = y + r() * h, len = 20 + r() * 70;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + len, py + r() * 6 - 3);
      c.stroke();
    }
  },
  metal(c, x, y, w, h) {
    const PS = 96;
    for (let ty = y; ty < y + h; ty += PS) {
      for (let tx = x; tx < x + w; tx += PS) {
        const tw = Math.min(PS, x + w - tx), th = Math.min(PS, y + h - ty);
        c.fillStyle = 'rgba(0,0,0,.1)';
        c.fillRect(tx, ty, tw, th);
        c.fillStyle = 'rgba(255,255,255,.05)';
        c.fillRect(tx + 2, ty + 2, tw - 4, 3);
        c.fillStyle = 'rgba(0,0,0,.24)';
        c.fillRect(tx, ty, tw, 2);
        c.fillRect(tx, ty, 2, th);
        c.fillStyle = 'rgba(190,200,210,.35)';
        for (const [dx, dy] of [[7, 7], [tw - 7, 7], [7, th - 7], [tw - 7, th - 7]]) {
          if (dx > 4 && dy > 4 && dx < tw - 4 && dy < th - 4) {
            c.beginPath();
            c.arc(tx + dx, ty + dy, 2.2, 0, 7);
            c.fill();
          }
        }
      }
    }
  },
  frost(c, x, y, w, h, r) {
    for (let i = 0; i < (w * h) / 900; i++) {
      c.fillStyle = 'rgba(225,245,255,.08)';
      c.beginPath();
      c.arc(x + r() * w, y + r() * h, 3 + r() * 13, 0, 7);
      c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,.1)';
    c.lineWidth = 2;
    for (let i = 0; i < w / 70; i++) {
      const px = x + r() * w, py = y + r() * h, len = 26 + r() * 90;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + len, py + len * 0.28);
      c.stroke();
    }
  },
  compost(c, x, y, w, h, r) {
    for (let i = 0; i < (w * h) / 2400; i++) {
      const k = r();
      c.fillStyle = k > 0.66 ? 'rgba(100,130,65,.4)' : k > 0.33 ? 'rgba(58,40,25,.42)' : 'rgba(150,120,80,.3)';
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 4 + r() * 12, 3 + r() * 9, r() * 3, 0, 7);
      c.fill();
    }
  },
  grass(c, x, y, w, h, r) {
    // el patio: manchas de tierra y briznas de hierba
    for (let i = 0; i < (w * h) / 2600; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(58,44,24,.2)' : 'rgba(120,160,90,.14)';
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 10 + r() * 30, 6 + r() * 16, r() * 3, 0, 7);
      c.fill();
    }
    c.lineWidth = 2;
    for (let i = 0; i < (w * h) / 900; i++) {
      const px = x + r() * w, py = y + 4 + r() * (h - 8);
      c.strokeStyle = r() > 0.5 ? 'rgba(150,205,115,.3)' : 'rgba(95,155,80,.3)';
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + r() * 6 - 3, py - 5 - r() * 8);
      c.stroke();
    }
  },
};

const ROOM_TEX = {
  Semillero: 'beds',
  Vivero: 'beds',
  Riego: 'tiles',
  'Sala Principal': 'tiles',
  Comedor: 'tiles',
  Almacén: 'wood',
  Herramientas: 'wood',
  'Sala de máquinas': 'metal',
  'Luces UV': 'metal',
  Compost: 'compost',
  'Cámara fría': 'frost',
  Esquejes: 'beds',
  Embalaje: 'wood',
  Depósito: 'tiles',
  Exterior: 'grass',
};

// muros del invernadero: tablones con musgo y tornillos
const GREENHOUSE_WALL = {
  base: '#2b332c', alt1: 'rgba(255,255,255,.035)', alt2: 'rgba(0,0,0,.07)', line: 'rgba(0,0,0,.28)',
  top: '#57634f', topHi: 'rgba(255,255,255,.1)', bottom: 'rgba(0,0,0,.34)', side: '#4c5847',
  moss: 'rgba(96,140,86,.32)', rivet: true, round: false,
};

/* Muros: la masa sólida que rodea cada suelo, con la cara iluminada arriba, la de abajo en
   sombra y la sombra proyectada al suelo de al lado. Cada escenario trae su estilo: tablones
   de invernadero, o tierra y raíces prensadas en Micelaria. */
function paintWalls(c, world, floors, W) {
  const g = makeGrid(world, floors, []);
  const fl = (tx, ty) => tx >= 0 && ty >= 0 && tx < g.gw && ty < g.gh && g.cells[ty * g.gw + tx] === 1;
  const border = []; // celdas de muro pegadas a un suelo: en el bosque son la arboleda
  for (let ty = 0; ty < g.gh; ty++) for (let tx = 0; tx < g.gw; tx++) {
    if (fl(tx, ty)) continue;
    const n = fl(tx, ty - 1), so = fl(tx, ty + 1), w = fl(tx - 1, ty), e = fl(tx + 1, ty);
    if (!(n || so || w || e || fl(tx - 1, ty - 1) || fl(tx + 1, ty - 1) || fl(tx - 1, ty + 1) || fl(tx + 1, ty + 1))) continue;
    const x = tx * 20, y = ty * 20;
    const rnd = rng(tx * 73856093 ^ ty * 19349663);
    c.fillStyle = 'rgba(0,0,0,.16)';
    if (n) c.fillRect(x, y - 6, 20, 6);
    if (so) c.fillRect(x, y + 20, 20, 6);
    if (w) c.fillRect(x - 6, y, 6, 20);
    if (e) c.fillRect(x + 20, y, 6, 20);
    // escenarios naturales: el muro es arboleda, no una masa maciza (se pinta en dos pasadas)
    if (W.kind === 'nature') {
      const style = W.styleAt ? W.styleAt(floors, x + 10, y + 10) : 'forest';
      border.push([x, y, n, so, w, e, style]);
      W.cell(c, x, y, { n, so, w, e }, rnd, style);
      continue;
    }
    c.fillStyle = W.base;
    c.fillRect(x, y, 20, 20);
    c.fillStyle = rnd() > 0.5 ? W.alt1 : W.alt2;
    c.fillRect(x, y, 20, 20);
    if (W.round) {
      // tierra prensada: un nudo de raíz y una veta curva en vez del tablón recto
      c.strokeStyle = 'rgba(255,235,200,.06)';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x, y + 4 + rnd() * 12);
      c.quadraticCurveTo(x + 10, y + 2 + rnd() * 16, x + 20, y + 4 + rnd() * 12);
      c.stroke();
      c.fillStyle = W.line;
      c.beginPath();
      c.arc(x + 5 + rnd() * 10, y + 6 + rnd() * 9, 2 + rnd() * 2.6, 0, 7);
      c.fill();
    } else {
      c.fillStyle = W.line;
      c.fillRect(x, y + 9, 20, 2);
    }
    if (n) {
      c.fillStyle = W.top;
      c.fillRect(x, y, 20, 5);
      c.fillStyle = W.topHi;
      c.fillRect(x, y, 20, 2);
    }
    if (so) {
      c.fillStyle = W.bottom;
      c.fillRect(x, y + 15, 20, 5);
    }
    if (w) {
      c.fillStyle = W.side;
      c.fillRect(x, y, 4, 20);
    }
    if (e) {
      c.fillStyle = W.side;
      c.fillRect(x + 16, y, 4, 20);
    }
    if (rnd() > (W.round ? 0.58 : 0.7)) {
      c.fillStyle = W.moss;
      c.beginPath();
      c.arc(x + 4 + rnd() * 12, y + 4 + rnd() * 12, 2 + rnd() * 3, 0, 7);
      c.fill();
    }
    if (W.rivet && rnd() > 0.86) {
      c.fillStyle = 'rgba(205,215,205,.28)';
      c.beginPath();
      c.arc(x + 10, y + 10, 1.7, 0, 7);
      c.fill();
    }
  }
  // segunda pasada: las copas de los árboles, encima de toda la franja
  if (W.kind === 'nature' && W.canopy) W.canopy(c, border, rng(1337));
}

/* rejilla de ventilación */
function drawVent(c, x, y, glow) {
  c.save();
  c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.45)';
  rr(c, -19, -16, 38, 32, 7);
  c.fill();
  c.fillStyle = '#5d6672';
  rr(c, -16, -13, 32, 26, 5);
  c.fill();
  c.fillStyle = '#2a3038';
  for (let i = -12; i <= 12; i += 6) c.fillRect(i - 1.5, -9, 3, 18);
  c.strokeStyle = 'rgba(255,255,255,.3)';
  c.lineWidth = 1.5;
  rr(c, -16, -13, 32, 26, 5);
  c.stroke();
  if (glow) {
    c.strokeStyle = 'rgba(157,78,221,.95)';
    c.lineWidth = 3;
    rr(c, -21, -18, 42, 36, 9);
    c.stroke();
  }
  c.restore();
}

/* rejilla abierta: la tapa bascula sobre su bisagra y deja ver el conducto.
   Dura un instante: se abre al entrar o salir y vuelve a cerrarse sola. */
export const VENT_ANIM_MS = 520;
function drawVentOpen(c, x, y, k) {
  c.save();
  c.translate(x, y);
  // hueco del conducto
  c.fillStyle = 'rgba(0,0,0,.45)';
  rr(c, -19, -16, 38, 32, 7);
  c.fill();
  c.fillStyle = '#0b1116';
  rr(c, -16, -13, 32, 26, 5);
  c.fill();
  const fondo = c.createLinearGradient(0, -13, 0, 13);
  fondo.addColorStop(0, 'rgba(0,0,0,.9)');
  fondo.addColorStop(1, 'rgba(90,112,132,.5)');
  c.fillStyle = fondo;
  rr(c, -13, -10, 26, 20, 4);
  c.fill();
  c.strokeStyle = 'rgba(190,210,230,.22)';
  c.lineWidth = 2;
  for (let i = -9; i <= 9; i += 6) { c.beginPath(); c.moveTo(i, -9); c.lineTo(i, 9); c.stroke(); }
  // la tapa, girada sobre su bisagra superior y apagándose al abrirse
  c.save();
  c.translate(0, -13);
  c.rotate(-1.15 * k);
  c.globalAlpha = 0.5 + 0.5 * (1 - k);
  c.fillStyle = '#5d6672';
  rr(c, -16, 0, 32, 26, 5);
  c.fill();
  c.fillStyle = '#2a3038';
  for (let i = -12; i <= 12; i += 6) c.fillRect(i - 1.5, 4, 3, 18);
  c.strokeStyle = 'rgba(255,255,255,.3)';
  c.lineWidth = 1.5;
  rr(c, -16, 0, 32, 26, 5);
  c.stroke();
  c.restore();
  // filo iluminado mientras está abierta
  c.globalAlpha = 0.3 + 0.7 * k;
  c.strokeStyle = 'rgba(157,78,221,.95)';
  c.lineWidth = 3;
  rr(c, -21, -18, 42, 36, 9);
  c.stroke();
  c.globalAlpha = 1;
  c.restore();
}

/* -------- cuadro eléctrico (su caja de colisión está en OBST) -------- */
function drawPanel(c, p) {
  if (!p) return;
  c.save();
  c.translate(p.x, p.y);
  c.fillStyle = 'rgba(0,0,0,.42)';
  rr(c, -33, -23, 72, 62, 8);
  c.fill();
  c.fillStyle = '#59616d';
  rr(c, -36, -30, 72, 62, 8);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.07)';
  rr(c, -32, -26, 64, 20, 6);
  c.fill();
  // conductos de cables bajando del cuadro
  c.strokeStyle = '#2b3038';
  c.lineWidth = 3;
  for (const dx of [-24, 0, 24]) {
    c.beginPath();
    c.moveTo(dx, 26);
    c.quadraticCurveTo(dx + 4, 14, dx, 6);
    c.stroke();
  }
  // interruptores automáticos
  for (let i = 0; i < 3; i++) {
    const bx = -22 + i * 22;
    c.fillStyle = '#2b3038';
    rr(c, bx - 8, -24, 16, 32, 4);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.06)';
    rr(c, bx - 6, -22, 12, 4, 2);
    c.fill();
    c.fillStyle = i === 2 ? '#ffd60a' : '#8d99ae';
    rr(c, bx - 5, -20, 10, 11, 3);
    c.fill();
  }
  // pantalla de estado
  c.fillStyle = '#0d1a26';
  rr(c, -30, 6, 26, 14, 3);
  c.fill();
  c.fillStyle = '#5ee6a8';
  c.fillRect(-26, 10, 16, 3);
  c.fillRect(-26, 15, 11, 3);
  // franja de aviso inferior
  c.fillStyle = '#f2c14e';
  c.fillRect(-36, 24, 72, 8);
  c.fillStyle = 'rgba(0,0,0,.5)';
  for (let i = -36; i < 36; i += 12) {
    c.beginPath();
    c.moveTo(i, 32);
    c.lineTo(i + 6, 24);
    c.lineTo(i + 12, 24);
    c.lineTo(i + 6, 32);
    c.closePath();
    c.fill();
  }
  c.fillStyle = 'rgba(220,230,240,.5)';
  for (const [dx, dy] of [[-30, -24], [30, -24], [-30, 18], [30, 18]]) {
    c.beginPath();
    c.arc(dx, dy, 2.4, 0, 7);
    c.fill();
  }
  c.strokeStyle = 'rgba(0,0,0,.45)';
  c.lineWidth = 2;
  rr(c, -35, -29, 70, 60, 8);
  c.stroke();
  c.font = '800 11px system-ui';
  c.textAlign = 'center';
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.fillText(tr('LUCES'), 0, 42);
  c.restore();
}

/* -------- consola del reactor -------- */
function drawConsole(c, pt) {
  c.save();
  c.translate(pt.x, pt.y);
  c.fillStyle = 'rgba(0,0,0,.36)';
  rr(c, -22, -20, 50, 46, 8);
  c.fill();
  c.fillStyle = '#545b66';
  rr(c, -25, -26, 50, 46, 8);
  c.fill();
  c.fillStyle = '#22262c';
  rr(c, -19, -20, 38, 20, 5);
  c.fill();
  c.font = '900 13px system-ui';
  c.textAlign = 'center';
  c.fillStyle = '#7fd3f7';
  c.fillText(String(pt.side || '').toUpperCase(), 0, -6);
  c.fillStyle = pt.side === 'a' ? '#e63946' : '#4361ee';
  c.beginPath();
  c.arc(0, 9, 8, 0, 7);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)';
  c.beginPath();
  c.arc(-2.5, 6.5, 2.6, 0, 7);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,.45)';
  c.lineWidth = 2;
  rr(c, -24, -25, 48, 44, 8);
  c.stroke();
  c.restore();
}

/* -------- reactor: núcleo (colisión) y sus dos puntos -------- */
function drawReactor(c, core, pts) {
  if (core) {
    c.save();
    c.translate(core.x, core.y);
    c.fillStyle = 'rgba(0,0,0,.45)';
    rr(c, -69, -37, 146, 78, 12);
    c.fill();
    c.fillStyle = '#4b515b';
    rr(c, -75, -46, 150, 78, 12);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.07)';
    rr(c, -69, -40, 138, 22, 8);
    c.fill();
    // tuberías de entrada
    c.strokeStyle = '#39413a';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(-75, -6);
    c.lineTo(-94, -6);
    c.moveTo(75, -6);
    c.lineTo(94, -6);
    c.stroke();
    // cúpula con el núcleo
    c.fillStyle = '#2b3038';
    c.beginPath();
    c.arc(0, -6, 30, 0, 7);
    c.fill();
    c.fillStyle = 'rgba(125,226,160,.2)';
    c.beginPath();
    c.arc(0, -6, 26, 0, 7);
    c.fill();
    const gr = c.createRadialGradient(0, -6, 4, 0, -6, 22);
    gr.addColorStop(0, 'rgba(225,255,240,.95)');
    gr.addColorStop(1, 'rgba(90,220,140,.5)');
    c.fillStyle = gr;
    c.beginPath();
    c.arc(0, -6, 16, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, -6, 26, 0, 7);
    c.stroke();
    // rejillas de ventilación
    c.fillStyle = 'rgba(0,0,0,.35)';
    for (let i = -66; i <= 66; i += 14) c.fillRect(i, 16, 8, 14);
    c.fillStyle = 'rgba(210,220,230,.4)';
    for (const [dx, dy] of [[-68, -40], [68, -40], [-68, 26], [68, 26]]) {
      c.beginPath();
      c.arc(dx, dy, 3, 0, 7);
      c.fill();
    }
    // franjas de aviso
    c.fillStyle = '#f2c14e';
    for (let i = -72; i < 66; i += 18) {
      c.beginPath();
      c.moveTo(i, 32);
      c.lineTo(i + 8, 32);
      c.lineTo(i + 14, 24);
      c.lineTo(i + 6, 24);
      c.closePath();
      c.fill();
    }
    c.strokeStyle = 'rgba(0,0,0,.4)';
    c.lineWidth = 2.5;
    rr(c, -74, -45, 148, 76, 12);
    c.stroke();
    c.font = '800 12px system-ui';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(255,255,255,.7)';
    c.fillText(tr('REACTOR'), 0, 42);
    c.restore();
  }
  for (const pt of pts || []) drawConsole(c, pt);
}

/* reactor en vivo: núcleo, anillo de progreso y estado de cada consola */
function drawReactorLive(c, meta, rx, T) {
  if (!meta || !meta.core) return;
  const pulse = 0.5 + 0.5 * Math.sin(T * 6);
  c.save();
  c.translate(meta.core.x, meta.core.y);
  c.globalAlpha = 0.35 + 0.5 * pulse;
  c.fillStyle = '#ff4d5e';
  c.beginPath();
  c.arc(0, -6, 16, 0, 7);
  c.fill();
  c.globalAlpha = 1;
  c.restore();
  if (rx.hold > 0) {
    const p = Math.min(1, rx.hold / (meta.hold || 1));
    c.save();
    c.strokeStyle = '#80ed99';
    c.lineWidth = 7;
    c.beginPath();
    c.arc(meta.core.x, meta.core.y, 48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    c.stroke();
    c.restore();
  }
  for (const pt of meta.pts || []) {
    const held = !!rx[pt.side];
    c.save();
    c.globalAlpha = held ? 0.95 : 0.3 + 0.55 * pulse;
    c.strokeStyle = held ? '#80ed99' : '#ff4d5e';
    c.lineWidth = 4;
    rr(c, pt.x - 30, pt.y - 32, 60, 58, 10);
    c.stroke();
    c.restore();
  }
}

/* Cada escenario trae su juego de dibujos: fondo, suelos, muros, objetos y aparatos. La sala
   manda el id del mapa en el estado de la partida, así que el lienzo pinta uno u otro pero
   nunca los mezcla. Añadir un mapa es añadir una entrada aquí. */
const ART_SETS = {
  greenhouse: {
    bg: '#070e0a',
    miniBg: 'rgba(5,10,7,.88)',
    btnGlow: 'rgba(255,255,255,.05)',
    labelBg: 'rgba(0,0,0,.38)',
    labelFg: 'rgba(255,255,255,.5)',
    paint: PAINT,
    roomTex: ROOM_TEX,
    defaultTex: 'gravel',
    wall: GREENHOUSE_WALL,
    obst: OBST_ART,
    prop: ART,
    panel: drawPanel,
    reactor: drawReactor,
    reactorLive: drawReactorLive,
    door: drawDoor,
    button: null, // el botón de siempre
  },
  micelaria: {
    bg: MICELARIA_BG,
    ground: micelariaGround, // el bosque entero: fuera de las salas hay arboleda, no vacío
    soft: true,              // sombras de suelo redondas: ningún objeto lleva caja
    softEdge: true,          // el canto de cada sala se difumina contra la hierba
    miniBg: 'rgba(6,12,9,.9)',
    miniObst: 'rgba(22,38,24,.7)',
    btnGlow: 'rgba(255,225,170,.07)',
    labelBg: 'rgba(28,18,8,.5)',
    labelFg: 'rgba(255,246,225,.62)',
    paint: { ...MICELARIA_TEX, ...VILLAGE_TEX },
    decor: villageDecor,     // alfombras, empedrados y raíces luminosas bajo los objetos
    overlay: villageOverlay, // orillas, barandillas del puente y piedras del vado
    roomTex: MICELARIA_ROOM_TEX,
    defaultTex: MICELARIA_DEFAULT_TEX,
    wall: MICELARIA_FOREST_WALL,
    obst: { ...OBST_ART, ...MICELARIA_OBST, ...MICELARIA_OBST_EXTRA, ...VILLAGE_OBST },
    prop: { ...ART, ...MICELARIA_PROPS, ...MICELARIA_PROPS_EXTRA, ...VILLAGE_PROPS },
    panel: micelariaPanel,
    reactor: micelariaReactor,
    reactorLive: micelariaReactorLive,
    door: micelariaDoor,
    button: micelariaButton,
  },
};

/* Trazo de un suelo: rectángulo, o el contorno libre de las salas de Micelaria (8.º elemento). */
function floorPath(c, f) {
  const o = f[7];
  c.beginPath();
  if (o && o.poly) {
    o.poly.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
    c.closePath();
  } else c.rect(f[0], f[1], f[2], f[3]);
}

export function buildWorld(world, floors, obst, btn, vents, extra) {
  const A = (extra && ART_SETS[extra.map]) || ART_SETS.greenhouse;
  const mapC = document.createElement('canvas');
  mapC.width = world.w;
  mapC.height = world.h;
  const c = mapC.getContext('2d');
  c.fillStyle = A.bg;
  c.fillRect(0, 0, world.w, world.h);
  if (A.ground) A.ground(c, world, rng(90210)); // el terreno de fondo, antes que las salas

  // suelos: color base + textura propia de cada sala
  floors.forEach((f, i) => {
    const [x, y, w, h, col, name] = f;
    const o = f[7] || {};
    if (o.carve && !o.water) return; // solo cierra celdas: el muro lo pinta paintWalls
    const paint = A.paint[f[6] || A.roomTex[name] || A.defaultTex];
    c.save();
    floorPath(c, f);
    c.clip();
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
    if (paint) paint(c, x, y, w, h, rng(i * 7919 + 13));
    c.restore();
  });

  // volumen: luz arriba, sombra abajo y junta perimetral
  for (const f of floors) {
    const [x, y, w, h] = f;
    const o = f[7] || {};
    if (o.carve) continue;
    c.save();
    floorPath(c, f);
    c.clip();
    const g2 = c.createLinearGradient(0, y, 0, y + h);
    g2.addColorStop(0, 'rgba(255,255,255,.09)');
    g2.addColorStop(0.14, 'rgba(255,255,255,0)');
    g2.addColorStop(0.86, 'rgba(0,0,0,0)');
    g2.addColorStop(1, 'rgba(0,0,0,.3)');
    c.fillStyle = g2;
    c.fillRect(x, y, w, h);
    c.restore();
    // canto de la sala: duro en el invernadero, difuminado contra la hierba en el bosque
    c.strokeStyle = A.softEdge ? 'rgba(8,18,12,.2)' : 'rgba(0,0,0,.38)';
    c.lineWidth = A.softEdge ? 11 : 3;
    if (o.poly) {
      if (!o.noEdge) { floorPath(c, f); c.stroke(); }
    } else {
      const pe = A.softEdge ? 5.5 : 1.5;
      c.strokeRect(x + pe, y + pe, w - pe * 2, h - pe * 2);
    }
  }

  // adornos del suelo propios del escenario (alfombras, empedrados...), debajo de los objetos
  if (A.decor) A.decor(c, floors, rng(777));

  // etiquetas de sala (las de contorno libre traen su sitio en las opciones)
  c.font = '700 28px system-ui';
  c.textAlign = 'center';
  for (const f of floors) {
    if (!f[5]) continue;
    const [x, y, w, h, , name] = f;
    const o = f[7] || {};
    const lx = o.label ? o.label[0] : x + w / 2;
    const ly = o.label ? o.label[1] : y + h - 23;
    const label = tr(name);
    const tw = c.measureText(label).width;
    c.fillStyle = A.labelBg;
    rr(c, lx - tw / 2 - 18, ly - 25, tw + 36, 34, 8);
    c.fill();
    c.fillStyle = A.labelFg;
    c.fillText(label, lx, ly);
  }

  // botón de emergencia
  c.fillStyle = A.btnGlow;
  c.beginPath();
  c.arc(btn.x, btn.y, 110, 0, 7);
  c.fill();

  // muros del escenario: rodean cada suelo y le proyectan su sombra encima
  paintWalls(c, world, floors, A.wall);

  // cajas, setas gigantes y demás objetos: cada uno con su propio dibujo
  obst.forEach((o) => drawObstacle(c, o, A.obst, A.soft));

  // lo que va por encima de objetos y tareas: orillas, barandillas, piedras del vado
  if (A.overlay) A.overlay(c, floors, obst, rng(4242));

  // rejillas de ventilación
  for (const v of vents || []) drawVent(c, v.x, v.y, false);

  // cuadro eléctrico y reactor, encima de sus cajas de colisión
  A.panel(c, extra && extra.panel);
  A.reactor(c, extra && extra.rcore, (extra && extra.rpts) || []);

  // objetos de las tareas: integrados en el mapa, no solo un símbolo
  for (const t of (extra && extra.tasks) || []) drawProp(c, t, A.prop, A.soft);

  const sc = 220 / world.w;
  const miniC = document.createElement('canvas');
  miniC.width = 220;
  miniC.height = Math.round(world.h * sc);
  const m = miniC.getContext('2d');
  m.fillStyle = A.miniBg;
  m.fillRect(0, 0, miniC.width, miniC.height);
  m.save();
  m.scale(sc, sc);
  for (const f of floors) {
    const o = f[7] || {};
    if (o.carve && !o.water) continue;
    m.fillStyle = f[4];
    floorPath(m, f);
    m.fill();
  }
  m.restore();
  m.fillStyle = A.miniObst || 'rgba(0,0,0,.5)';
  for (const o of obst) m.fillRect(o[0] * sc, o[1] * sc, o[2] * sc, o[3] * sc);
  return { mapC, miniC };
}

// Puerta cerrada: una compuerta metálica que tapa el hueco del muro. Las puertas no se ven
// mientras están abiertas: solo aparecen cuando el impostor las cierra desde el mapa.
function drawDoor(c, d) {
  const vertical = d.h >= d.w;
  const n = Math.max(2, Math.round((vertical ? d.h : d.w) / 20));
  c.save();
  c.fillStyle = '#414b55';
  c.fillRect(d.x, d.y, d.w, d.h);
  c.fillStyle = 'rgba(255,255,255,.12)';
  for (let i = 0; i < n; i++) {
    if (vertical) c.fillRect(d.x, d.y + (i * d.h) / n + 1, d.w, d.h / n * 0.42);
    else c.fillRect(d.x + (i * d.w) / n + 1, d.y, d.w / n * 0.42, d.h);
  }
  c.strokeStyle = 'rgba(0,0,0,.55)';
  c.lineWidth = 2;
  c.strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
  // franja de aviso: se ve de un vistazo que está cerrada
  c.strokeStyle = 'rgba(230,57,70,.6)';
  c.beginPath();
  if (vertical) { c.moveTo(d.x + d.w / 2, d.y + 4); c.lineTo(d.x + d.w / 2, d.y + d.h - 4); }
  else { c.moveTo(d.x + 4, d.y + d.h / 2); c.lineTo(d.x + d.w - 4, d.y + d.h / 2); }
  c.stroke();
  c.restore();
}

function drawDoors(ctx, g, doorArt) {
  const drs = g.st && g.st.drs;
  if (!drs || !drs.length || !g.doors) return;
  const closed = new Set(drs.map((d) => d[0]));
  const paint = doorArt || drawDoor; // cada escenario tiene su puerta
  for (const d of g.doors) if (closed.has(d.id)) paint(ctx, d);
}

// Hacia qué lado cae cada cuerpo: sale del id, así que todo el mundo lo ve igual.
function bodyDir(id) {
  let h = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return (h & 1) ? 1 : -1;
}

// k: cuánto ha crecido el charco de sangre (0..1); dir: hacia qué lado yace
function drawBody(c, x, y, color, dir = 1, k = 1) {
  c.save();
  c.translate(x, y);
  // charco de sangre debajo (crece mientras cae)
  if (k > 0) {
    c.fillStyle = 'rgba(122,14,28,.62)';
    c.beginPath();
    c.ellipse(-2 * dir, 7, 30 * k, 11 * k, 0, 0, 7);
    c.ellipse(10 * dir, 10, 14 * k, 6 * k, 0, 0, 7);
    c.fill();
  }
  c.scale(dir, 1);
  c.fillStyle = 'rgba(0,0,0,.3)';
  c.beginPath();
  c.ellipse(0, 6, 24, 8, 0, 0, 7);
  c.fill();
  c.fillStyle = '#f3e9d2';
  c.beginPath();
  c.ellipse(20, 2, 11, 7, 0, 0, 7);
  c.fill();
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(-4, 0, 22, 12, 0, 0, 7);
  c.fill();
  c.strokeStyle = '#1b1b1b';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(18, -1);
  c.lineTo(23, 4);
  c.moveTo(23, -1);
  c.lineTo(18, 4);
  c.stroke();
  c.restore();
}

/* ---------- el golpe: la caída del cuerpo y la sangre ---------- */
export const DASH_MS = 90; // lo que dura el salto del impostor sobre su víctima
export const BODY_FX_MS = 1500; // lo que dura todo el efecto desde que cae
const FALL_MS = 520; // lo que tarda en caer el seta
const ss = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// Las gotas salen de una sola vez, con valores al azar fijados al crear el efecto
function makeGore() {
  const parts = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  // salpicón del golpe: sale en todas direcciones, algo más hacia arriba
  for (let i = 0; i < 30; i++) {
    const a = rnd(0, Math.PI * 2);
    const sp = rnd(60, 230);
    parts.push({ d: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - rnd(40, 120), r: rnd(1.6, 4.6), c: Math.random() < 0.28 ? '#d62839' : '#8f1424', oy: -14 });
  }
  // al tocar el suelo, otro chorro más corto y bajo
  for (let i = 0; i < 14; i++) {
    const a = rnd(-Math.PI, 0);
    const sp = rnd(40, 150);
    parts.push({ d: FALL_MS * 0.8 / 1000, vx: Math.cos(a) * sp * 1.3, vy: Math.sin(a) * sp * 0.7, r: rnd(1.4, 3.6), c: '#a3162a', oy: 4 });
  }
  return parts;
}

// Dibuja la caída (el seta de pie que se desploma, luego ya tumbado) y devuelve true mientras dure
function drawFall(c, fx, id, x, y, color, el) {
  const dir = bodyDir(id);
  const p = Math.min(1, el / FALL_MS);
  // cae acelerando y rebota un poco al tocar el suelo
  let ang = (Math.PI / 2) * Math.min(1, p * p * 1.05);
  if (p > 0.85) ang -= Math.sin(((p - 0.85) / 0.15) * Math.PI) * 0.1;
  const standing = 1 - ss(0.72, 1, p); // el seta de pie se va
  const lying = ss(0.55, 1, p); // el cuerpo tumbado aparece
  // el seta se empuja un poco hacia atrás al recibir el golpe
  const knock = (1 - p) * Math.sin(Math.min(1, el / 140) * Math.PI) * 6 * -dir;
  if (standing > 0.01) {
    c.save();
    c.globalAlpha = standing;
    c.translate(x + knock, y + 14);
    c.rotate(-dir * ang);
    drawShroom(c, 0, -14, color, { alive: true, t: 0, face: -dir, moving: false });
    c.restore();
  }
  if (lying > 0.01) {
    c.save();
    c.globalAlpha = lying;
    drawBody(c, x, y, color, dir, ss(0.3, 1, p));
    c.restore();
  }
  // golpe de aire al aterrizar: un anillo de polvo que se abre
  if (el > FALL_MS * 0.78 && el < FALL_MS * 0.78 + 320) {
    const q = (el - FALL_MS * 0.78) / 320;
    c.save();
    c.globalAlpha = 0.45 * (1 - q);
    c.strokeStyle = '#f3e9d2';
    c.lineWidth = 3 * (1 - q) + 1;
    c.beginPath();
    c.ellipse(x, y + 8, 14 + q * 38, 5 + q * 12, 0, 0, 7);
    c.stroke();
    c.restore();
  }
}

// Las gotas de sangre: salen disparadas, caen con la gravedad y se quedan en el suelo un momento
function drawGore(c, fx, x, y, el) {
  if (!fx.parts) fx.parts = makeGore();
  const t = el / 1000;
  // fogonazo rojo del golpe, solo un instante
  if (el < 170) {
    const q = el / 170;
    c.save();
    c.globalAlpha = 0.55 * (1 - q);
    const gr = c.createRadialGradient(x, y - 6, 2, x, y - 6, 20 + q * 52);
    gr.addColorStop(0, 'rgba(255,80,90,.95)');
    gr.addColorStop(1, 'rgba(160,10,30,0)');
    c.fillStyle = gr;
    c.beginPath();
    c.arc(x, y - 6, 20 + q * 52, 0, 7);
    c.fill();
    // tres rayas del zarpazo
    c.globalAlpha = 0.9 * (1 - q);
    c.strokeStyle = '#ffe3e6';
    c.lineWidth = 2.5;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(x - 22 + i * 7 + q * 8, y - 26 + i * 5 - q * 4);
      c.lineTo(x + 20 + i * 7 + q * 14, y + 4 + i * 5 + q * 6);
      c.stroke();
    }
    c.restore();
  }
  // aro rojo que se abre alrededor de la víctima, como en el Among Us de verdad
  if (el < 380) {
    const q = el / 380;
    c.save();
    c.globalAlpha = 0.85 * (1 - q);
    c.strokeStyle = '#e0283c';
    c.lineWidth = 5 * (1 - q) + 1;
    c.beginPath();
    c.arc(x, y - 4, 16 + q * 34, 0, 7);
    c.stroke();
    c.restore();
  }
  const fade = 1 - ss(BODY_FX_MS - 500, BODY_FX_MS, el);
  c.save();
  for (const q of fx.parts) {
    const tt = t - q.d;
    if (tt < 0) continue;
    const gy = y + 10; // el suelo
    let px = x + q.vx * tt;
    let py = y + q.oy + q.vy * tt + 0.5 * 620 * tt * tt;
    let r = q.r;
    if (py >= gy) {
      // ya ha caído: se queda como una mancha un poco achatada
      const tl = (-q.vy + Math.sqrt(q.vy * q.vy + 2 * 620 * (gy - (y + q.oy)))) / 620; // instante en que toca
      px = x + q.vx * Math.min(tt, tl) * 0.9;
      py = gy + ((q.vx * 7) % 5);
      c.globalAlpha = fade * 0.85;
      c.fillStyle = q.c;
      c.beginPath();
      c.ellipse(px, py, r * 1.3, r * 0.7, 0, 0, 7);
      c.fill();
    } else {
      c.globalAlpha = fade;
      c.fillStyle = q.c;
      c.beginPath();
      c.arc(px, py, r, 0, 7);
      c.fill();
    }
  }
  c.restore();
}

export function drawShroom(c, x, y, color, o) {
  // El muñeco se dibuja al ancho de su círculo de choque (32 px de diámetro): el sombrero
  // mide 50 px de ancho sin escalar, así que con 0.64 encaja justo. Antes se dibujaba más
  // grande que su choque y parecía que las máquinas (el botón central) lo "enganchaban".
  const s = 0.64;
  c.save();
  c.translate(x, y);
  if (o.invis && o.alive) c.globalAlpha = 0.38; // el Espectro se vuelve translúcido al invisibilizarse
  if (!o.alive) { c.globalAlpha = 0.55; c.translate(0, Math.sin(o.t * 3) * 4 - 8); }
  else { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 14, 14, 5, 0, 0, 7); c.fill(); }
  c.translate(0, -(o.moving && o.alive ? Math.abs(Math.sin(o.t * 12)) * 3 : 0));
  c.scale(s * (o.face || 1), s);
  c.fillStyle = '#f3e9d2';
  rr(c, -11, -4, 22, 24, 9);
  c.fill();
  c.fillStyle = '#d8caa6';
  c.beginPath();
  c.ellipse(-6, 19, 6, 3.5, 0, 0, 7);
  c.ellipse(6, 19, 6, 3.5, 0, 0, 7);
  c.fill();
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-25, -2);
  c.bezierCurveTo(-25, -36, 25, -36, 25, -2);
  c.quadraticCurveTo(0, 5, -25, -2);
  c.fill();
  c.fillStyle = 'rgba(0,0,0,.18)';
  c.beginPath();
  c.moveTo(-25, -2);
  c.quadraticCurveTo(0, 5, 25, -2);
  c.quadraticCurveTo(0, -4, -25, -2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.beginPath();
  c.arc(-11, -14, 4, 0, 7);
  c.moveTo(7, -22);
  c.arc(4, -22, 3.4, 0, 7);
  c.moveTo(19, -10);
  c.arc(16, -10, 3, 0, 7);
  c.moveTo(-1, -9);
  c.arc(-3, -9, 2.2, 0, 7);
  c.fill();
  c.fillStyle = '#1b1b1b';
  c.beginPath();
  c.arc(1, 8, 2.3, 0, 7);
  c.arc(9, 8, 2.3, 0, 7);
  c.fill();
  // cegado por un Cegador: los ojos se ven cubiertos por una nube lechosa que da vueltas
  if (o.blind && o.alive) {
    const gr = c.createRadialGradient(5, 8, 1, 5, 8, 17);
    gr.addColorStop(0, 'rgba(240,244,255,.97)');
    gr.addColorStop(0.55, 'rgba(205,214,240,.8)');
    gr.addColorStop(1, 'rgba(190,200,232,0)');
    c.fillStyle = gr;
    c.beginPath();
    c.ellipse(5, 8, 17, 12, 0, 0, 7);
    c.fill();
    for (let i = 0; i < 5; i++) {
      const a = o.t * 3.2 + i * 1.26;
      const rad = 9 + 3 * Math.sin(o.t * 4 + i);
      c.fillStyle = i % 2 ? 'rgba(225,230,250,.78)' : 'rgba(170,180,220,.7)';
      c.beginPath();
      c.arc(5 + Math.cos(a) * rad, 8 + Math.sin(a) * rad * 0.55, 3.4, 0, 7);
      c.fill();
    }
  }
  c.restore();
  // Espectro invisible: aura fantasmal morada con volutas de humo que ascienden
  if (o.invis && o.alive) {
    c.save();
    c.translate(x, y - 8);
    const pulse = 0.5 + 0.5 * Math.sin(o.t * 3);
    const gr = c.createRadialGradient(0, 0, 6, 0, 0, 42 + 7 * pulse);
    gr.addColorStop(0, `rgba(150,90,220,${0.22 + 0.12 * pulse})`);
    gr.addColorStop(0.6, 'rgba(90,50,160,0.07)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr;
    c.beginPath();
    c.arc(0, 0, 42 + 7 * pulse, 0, 7);
    c.fill();
    for (let i = 0; i < 7; i++) {
      const ph = o.t * 1.6 + i * 0.9;
      const rise = ((o.t * 14 + i * 30) % 46);
      const rad = 8 + 4 * Math.sin(ph * 2);
      c.globalAlpha = 0.5 * (1 - rise / 46);
      c.fillStyle = i % 2 ? '#b79cff' : '#7d4fd6';
      c.beginPath();
      c.arc(Math.cos(ph) * rad, -rise - 6, 3.4 + 2 * (1 - rise / 46), 0, 7);
      c.fill();
    }
    c.restore();
  }
  // transformándose: una nube de esporas cubre al jugador hasta que cambia de skin
  if (o.morph) {
    c.save();
    c.translate(x, y - 10);
    for (let i = 0; i < 8; i++) {
      const a = o.t * 2.4 + i * 0.8;
      const rad = 12 + ((i * 6 + o.t * 26) % 24);
      c.fillStyle = `rgba(157,78,221,${0.16 + 0.22 * (0.5 + 0.5 * Math.sin(o.t * 12 + i))})`;
      c.beginPath();
      c.arc(Math.cos(a) * rad, Math.sin(a * 1.3) * rad * 0.75, 6 + 4 * (0.5 + 0.5 * Math.sin(o.t * 9 + i)), 0, 7);
      c.fill();
    }
    c.restore();
  }
  if (o.name) {
    c.font = '700 13px system-ui';
    c.textAlign = 'center';
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(0,0,0,.8)';
    c.strokeText(o.name, x, y - 30);
    c.fillStyle = o.red ? '#ff6b78' : '#fff';
    c.fillText(o.name, x, y - 30);
  }
}

function camera(world, me, W, H, zoom) {
  const vw = W / zoom, vh = H / zoom;
  // El seta va siempre en el centro de la pantalla. Antes la vista se frenaba en el borde del
  // mapa y, en las salas de los extremos, el jugador se quedaba descentrado; ahora la vista
  // asoma fuera del mapa cuando hace falta, donde solo sigue el mismo fondo oscuro.
  return { cx: me.x - vw / 2, cy: me.y - vh / 2, vw, vh };
}

/* Efecto del cambiaformas: al imitar, una onda expansiva con esporas que salen disparadas;
   al volver a su forma, la misma onda recogiéndose con un destello. */
function drawShiftFx(c, x, y, p, kind, T) {
  const out = kind === 'out';
  const k = out ? 1 - p : p; // 0 → 1: hacia fuera al imitar, hacia dentro al volver
  const a = 1 - p;           // se apaga con el tiempo
  const R = 14 + 66 * k;
  c.save();
  c.translate(x, y - 8);
  const gr = c.createRadialGradient(0, 0, 1, 0, 0, Math.max(10, R));
  gr.addColorStop(0, out ? `rgba(255,255,255,${0.45 * a})` : `rgba(186,120,255,${0.5 * a})`);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr;
  c.beginPath();
  c.arc(0, 0, Math.max(10, R), 0, 7);
  c.fill();
  c.globalAlpha = 0.85 * a;
  c.strokeStyle = out ? '#e7d6ff' : '#b06bff';
  c.lineWidth = 2 + 5 * a;
  c.beginPath();
  c.ellipse(0, 0, R, R * 0.7, 0, 0, 7);
  c.stroke();
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + T * 1.1;
    const d = 14 + 58 * k;
    c.globalAlpha = a;
    c.fillStyle = i % 3 ? '#c79bff' : '#ffffff';
    c.beginPath();
    c.arc(Math.cos(ang) * d, Math.sin(ang) * d * 0.72, 2 + 2.6 * a, 0, 7);
    c.fill();
  }
  c.restore();
}

/* El Alertador, al morir, deja una flecha en el borde de la pantalla apuntando a su
   cuerpo. Si el cuerpo está a la vista, un marcador lo señala encima. Dura unos
   segundos y se desvanece al final. */
function drawAlertArrow(c, g, cx, cy, s, W, H, dpr, T) {
  const a = g.alert;
  if (!a) return;
  const now = performance.now();
  if (now >= a.expire) { g.alert = null; return; }
  const left = (a.expire - now) / 1000;
  const fade = left < 2 ? Math.max(0, left / 2) : 1;
  const sx = (a.x - cx) * s;
  const sy = (a.y - cy) * s;
  const Wd = W * dpr, Hd = H * dpr;
  const pulse = 0.55 + 0.45 * Math.abs(Math.sin(T * 7));
  // la flecha aparece un poco por debajo del jugador, apuntando al cuerpo
  const ax = Wd / 2;
  const ay = Hd / 2 + 74 * dpr;
  const ang = Math.atan2(sy - ay, sx - ax);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = fade * (0.55 + 0.45 * pulse);
  c.translate(ax, ay);
  c.rotate(ang);
  c.fillStyle = '#ff3b3b';
  c.strokeStyle = '#fff';
  c.lineWidth = 2.5 * dpr;
  c.beginPath();
  c.moveTo(26 * dpr, 0);
  c.lineTo(-14 * dpr, -16 * dpr);
  c.lineTo(-5 * dpr, 0);
  c.lineTo(-14 * dpr, 16 * dpr);
  c.closePath();
  c.fill();
  c.stroke();
  c.restore();
}

/* El Ángel Guardián escuda a un tripulante: cuando un impostor intenta matarlo, el
   golpe no entra y el escudo se ve un instante alrededor del salvado. La protección
   en sí (40 s) no dibuja nada: solo se nota al fallar la muerte. */
const SAVE_MS = 1900;
function drawSaveShield(c, x, y, p, T) {
  const e = 1 - Math.pow(1 - p, 3);
  const r = 22 + 30 * e;
  const a = 1 - p;
  c.save();
  c.globalAlpha = a * 0.2;
  c.fillStyle = '#7ff0ff';
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = a * 0.9;
  c.strokeStyle = '#cdf3ff';
  c.lineWidth = 3.2;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.stroke();
  // el arco de arriba, latiendo como una cúpula
  c.globalAlpha = a * (0.55 + 0.45 * Math.abs(Math.sin(T * 6)));
  c.strokeStyle = '#c9b8ff';
  c.lineWidth = 2.6;
  c.beginPath();
  c.arc(x, y, r + 5, Math.PI * 1.08, Math.PI * 1.92);
  c.stroke();
  c.restore();
}

/* La Víbora deja cuerpos venenosos: burbujas verdes y el cuerpo deshaciéndose en tres
   fases (entero con veneno, medio cuerpo y casi desaparecido) hasta que no queda nada. */
const VIPER_CUT = [1, 1, 0.5, 0.2]; // parte del cuerpo que sigue ahí en cada fase
function drawViperBody(c, x, y, color, ph, T) {
  const cut = VIPER_CUT[ph] || 1;
  const top = y + 16 - 30 * cut; // el cuerpo se recorta por abajo: queda esa franja
  c.save();
  // Mancha de veneno en el suelo: plana, pequeña y sin latido. Antes era un charco grande
  // que palpitaba y daba la sensación de que el cuerpo tiraba del jugador hacia él.
  c.globalAlpha = 0.22;
  c.fillStyle = '#3ddc5a';
  c.beginPath();
  c.ellipse(x, y + 10, 26 + (1 - cut) * 8, 9 + (1 - cut) * 3, 0, 0, 7);
  c.fill();
  c.globalAlpha = 1;
  c.save();
  c.beginPath();
  c.rect(x - 36, top, 72, 30 * cut + 2);
  c.clip();
  drawBody(c, x, y, color, 1, 0);
  c.globalAlpha = 0.35; // el toque verde de la Víbora
  drawBody(c, x, y, '#38d95e', 1, 0);
  c.restore();
  // burbujas: suben y estallan mientras el cuerpo dura
  for (let i = 0; i < 5; i++) {
    const t = (T * 0.5 + i * 0.21) % 1;
    c.globalAlpha = (1 - t) * 0.55 * cut + 0.18;
    c.fillStyle = i % 2 ? '#7bf59a' : '#38d95e';
    c.beginPath();
    c.arc(x - 20 + ((i * 13) % 40), y + 6 - t * 34, 2 + (1 - t) * 4.5, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

const VENOM_MS = 1500;
function drawVenomBurst(c, x, y, p) {
  const e = 1 - Math.pow(1 - p, 2);
  c.save();
  c.globalAlpha = (1 - p) * 0.45;
  c.fillStyle = '#3ddc5a';
  c.beginPath();
  c.ellipse(x, y + 8, 18 + 46 * e, 9 + 20 * e, 0, 0, 7);
  c.fill();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + (i % 2 ? 0.3 : -0.3);
    const d = (14 + 42 * e) * (0.7 + (i % 3) * 0.18);
    c.globalAlpha = (1 - p) * 0.75;
    c.fillStyle = i % 2 ? '#7bf59a' : '#2fbf52';
    c.beginPath();
    c.arc(x + Math.cos(a) * d, y + 4 + Math.sin(a) * d * 0.55 - 12 * (1 - e), 2 + 3 * (1 - p), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

export function drawFrame(o) {
  const { ctx, fctx, fogC, g, mapC, W, H, dpr, zoom, T } = o;
  const A = ART_SETS[g.map] || ART_SETS.greenhouse;
  const world = g.world;
  const { cx, cy } = camera(world, g.me, W, H, zoom);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#050a07';
  ctx.fillRect(0, 0, W * dpr, H * dpr);
  const s = dpr * zoom;
  ctx.setTransform(s, 0, 0, s, -cx * s, -cy * s);
  if (mapC) ctx.drawImage(mapC, 0, 0);
  drawDoors(ctx, g, A.door); // compuertas cerradas: tapan el hueco del muro mientras dura el cierre
  if (g.role === 'impostor' || g.engineer) for (const v of g.vents || []) drawVent(ctx, v.x, v.y, true);
  // rejillas: se abren y se cierran en el instante en que alguien entra o sale
  if (g.ventFx && g.ventFx.size) {
    const nowMs = performance.now();
    for (const [id, at] of g.ventFx) {
      const el = nowMs - at;
      if (el > VENT_ANIM_MS) continue;
      const v = (g.vents || []).find((q) => q.id === id);
      if (!v) continue;
      const p = el / VENT_ANIM_MS;
      const k = p < 0.42 ? p / 0.42 : Math.max(0, 1 - (p - 0.42) / 0.58);
      drawVentOpen(ctx, v.x, v.y, k);
    }
  }
  // con apagón, el cuadro eléctrico destaca para que se encuentre
  if (g.st.dark) {
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(T * 4));
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 4;
    rr(ctx, g.pnl.x - 42, g.pnl.y - 40, 84, 80, 12);
    ctx.stroke();
    ctx.restore();
  }
  // reactor: núcleo y consolas avisan mientras el sabotaje está activo
  if (g.st.rx && g.rmeta) A.reactorLive(ctx, g.rmeta, g.st.rx, T);
  // botón de emergencia con su propio objeto, y marcador sobre cada tarea
  drawButton(ctx, g.btn.x, g.btn.y, T, g.meetUsed, !!(g.st.dark || g.st.rx), A.button);
  for (const t of g.tasks) drawTaskMark(ctx, t, T, g.done.has(t.id));
  // los cuerpos de la Víbora se deshacen con veneno verde: el resto de cuerpos siguen igual
  const fxNow = performance.now();
  const gored = [];
  for (const b of g.bodies) {
    const ph = b[4] || 0;
    const bf = g.bodyFx && g.bodyFx.get(b[0]);
    const el = bf ? fxNow - bf.at : Infinity;
    if (ph) drawViperBody(ctx, b[1], b[2], b[3], ph, T);
    else if (el < FALL_MS) drawFall(ctx, bf, b[0], b[1], b[2], b[3], el);
    else drawBody(ctx, b[1], b[2], b[3], bodyDir(b[0]));
    if (bf && el < BODY_FX_MS) gored.push([bf, b[1], b[2], el]);
  }
  for (const [bf, bx, by, el] of gored) drawGore(ctx, bf, bx, by, el);
  // estela del salto del impostor: copias que se desvanecen por el camino que ha recorrido
  if (g.trail) {
    const tel = fxNow - g.trail.at;
    if (tel > 320) g.trail = null;
    else {
      const col = (g.roster.get(g.myId) || {}).color || '#e63946';
      for (let i = 0; i < 5; i++) {
        const f = i / 5;
        const a = (1 - tel / 320) * (0.45 - f * 0.3);
        if (a <= 0) continue;
        ctx.save();
        ctx.globalAlpha = a;
        drawShroom(ctx, g.trail.fx + (g.trail.tx - g.trail.fx) * f, g.trail.fy + (g.trail.ty - g.trail.fy) * f, col, { alive: true, t: 0, face: g.trail.face, moving: true, red: true });
        ctx.restore();
      }
    }
  }
  const list = [];
  let myFx = null;
  // efectos en curso (transformación y vuelta a su forma): segundos desde el cambio
  const fxOf = (id) => {
    const f = g.fx && g.fx.get(id);
    if (!f) return null;
    const el = (performance.now() - f.at) / 1000;
    const dur = f.kind === 'in' ? 1.6 : 1.05;
    if (el < 0 || el >= dur) return null;
    return { kind: f.kind, target: f.target, el, p: el / dur };
  };
  const alt = Math.floor(T * 10) % 2 === 0; // parpadeo rápido entre las dos skins
  // Identidad que se dibuja: la propia, la imitada, o un parpadeo entre las dos en pleno cambio.
  const ident = (id, fx) => {
    const own = g.roster.get(id) || {};
    const fakeId = (g.st.sh && g.st.sh[id]) || (g.st.mo && g.st.mo[id]);
    if (fakeId) {
      const t = g.roster.get(fakeId) || {};
      // ya lleva la skin imitada; mientras se transforma, alterna con la suya
      return g.st.mo && g.st.mo[id] && !alt ? own : t;
    }
    // acaba de volver: un par de parpadeos con la skin que deja atrás
    if (fx && fx.kind === 'out' && fx.el < 0.45 && alt) return g.roster.get(fx.target) || own;
    return own;
  };
  const add = (id, x, y, o) => {
    const fx = fxOf(id);
    if (id === g.myId) myFx = fx;
    const r = ident(id, fx);
    list.push({
      x, y, c: r.color || '#fff',
      o: { ...o, name: r.name, morph: !!(g.st.mo && g.st.mo[id]), fx },
    });
  };
  if (!(g.vent && g.vent.in)) add(g.myId, g.me.x, g.me.y, {
    alive: g.me.alive, t: T, face: g.me.face, moving: g.me.moving, red: g.role === 'impostor',
    invis: g.st.inv > 0, blind: g.st.bl > 0,
  });
  for (const [id, op] of g.others) {
    add(id, op.x, op.y, {
      alive: op.alive, t: T, face: op.face, moving: op.moving,
      red: g.role === 'impostor' && g.mates.includes(id),
      invis: !!op.inv, blind: !!op.bl,
    });
  }
  list.sort((a, b) => a.y - b.y);
  for (const p of list) {
    drawShroom(ctx, p.x, p.y, p.c, p.o);
    if (p.fx) drawShiftFx(ctx, p.x, p.y, p.fx.p, p.fx.kind, T);
  }
  // escudo del Ángel Guardián: solo en el instante en que salva a alguien
  if (g.saves && g.saves.length) {
    const nowMs = performance.now();
    for (const sv of g.saves) {
      const el = nowMs - sv.at;
      if (el < 0 || el > SAVE_MS) continue;
      drawSaveShield(ctx, sv.x, sv.y, el / SAVE_MS, T);
    }
  }
  // veneno de la Víbora: el borboteo verde al caer el cuerpo
  if (g.puffs && g.puffs.length) {
    const nowMs = performance.now();
    for (const pf of g.puffs) {
      const el = nowMs - pf.at;
      if (el < 0 || el > VENOM_MS) continue;
      drawVenomBurst(ctx, pf.x, pf.y, el / VENOM_MS);
    }
  }
  if (g.st.vr > 0 && g.me.alive) {
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.globalCompositeOperation = 'source-over';
    fctx.clearRect(0, 0, fogC.width, fogC.height);
    const blackout = g.st.dark && g.role !== 'impostor';
    // Fuera de la vista queda una penumbra suave: se intuye el suelo y los objetos, nunca a nadie.
    fctx.fillStyle = blackout ? 'rgba(4,10,7,.86)' : 'rgba(4,10,7,.6)';
    fctx.fillRect(0, 0, fogC.width, fogC.height);
    fctx.globalCompositeOperation = 'destination-out';
    const px = (g.me.x - cx) * s, py = (g.me.y - cy) * s, R = g.st.vr * s;
    if (blackout) {
      // apagón: el círculo corto de siempre, la sala también queda a oscuras
      const grad = fctx.createRadialGradient(px, py, R * 0.5, px, py, R);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      fctx.fillStyle = grad;
      fctx.fillRect(0, 0, fogC.width, fogC.height);
    } else {
      // Con luz, se ilumina justo lo que alcanza la vista: los muros cortan la luz y las
      // puertas la dejan pasar, así que desde una sala con la puerta abierta se ve el
      // pasillo y desde ahí la sala de enfrente, pero nunca lo que hay tras una pared.
      const pts = g.sightGrid ? lightPolygon(g.sightGrid, g.me.x, g.me.y, g.st.sr || g.st.vr) : null;
      if (pts && pts.length > 4) {
        fctx.save();
        fctx.shadowColor = 'rgba(0,0,0,1)';
        fctx.shadowBlur = 26 * (dpr || 1); // apenas un fleco: el borde queda limpio y sin dientes de sierra
        fctx.fillStyle = 'rgba(0,0,0,1)';
        fctx.beginPath();
        fctx.moveTo((pts[0] - cx) * s, (pts[1] - cy) * s);
        for (let i = 2; i < pts.length; i += 2) fctx.lineTo((pts[i] - cx) * s, (pts[i + 1] - cy) * s);
        fctx.closePath();
        fctx.fill();
        fctx.restore();
      }
    }
    // Faroles: con el apagón, cada fantasma Farol abre un círculo de luz que respeta las paredes
    if (blackout && g.st.lamps && g.sightGrid) {
      g.st.lamps.forEach(([lx, ly, lr], i) => {
        const lp = lightPolygon(g.sightGrid, lx, ly, lr, i + 1);
        if (!lp || lp.length <= 4) return;
        const gx = (lx - cx) * s, gy = (ly - cy) * s, gR = lr * s;
        const lg = fctx.createRadialGradient(gx, gy, gR * 0.15, gx, gy, gR);
        lg.addColorStop(0, 'rgba(0,0,0,.95)');
        lg.addColorStop(0.6, 'rgba(0,0,0,.78)');
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        fctx.fillStyle = lg;
        fctx.beginPath();
        fctx.moveTo((lp[0] - cx) * s, (lp[1] - cy) * s);
        for (let k = 2; k < lp.length; k += 2) fctx.lineTo((lp[k] - cx) * s, (lp[k + 1] - cy) * s);
        fctx.closePath();
        fctx.fill();
      });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fogC, 0, 0);
  }
  // el brillo cálido de cada farol se nota (a quien vea su luz y al propio fantasma)
  if (g.st.dark && g.st.lamps && g.sightGrid) drawLampGlow(ctx, g, cx, cy, s, T);

  // destello propio: el cambio también se nota en tus propios ojos
  if (myFx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = myFx.kind === 'in'
      ? `rgba(157,78,221,${0.32 * (1 - myFx.p)})`
      : `rgba(231,214,255,${0.26 * (1 - myFx.p)})`;
    ctx.fillRect(0, 0, W * dpr, H * dpr);
  }
  // cegado por un Cegador: nada se ve durante unos segundos
  if (g.st.bl > 0 && g.me.alive) drawBlindness(ctx, g, W * dpr, H * dpr, T);
  // el Alertador avisa a todos al morir: flecha en el borde señalando su cuerpo
  drawAlertArrow(ctx, g, cx, cy, s, W, H, dpr, T);
  // y el reactor sabotaleado: luz roja y flechas a las consolas A y B
  drawReactorAlarm(ctx, g, cx, cy, s, W, H, dpr, T);
}

/* Luz cálida de los faroles: un resplandor suave que sigue las paredes (misma luz que abre la niebla). */
function drawLampGlow(ctx, g, cx, cy, s, T) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  g.st.lamps.forEach(([lx, ly, lr], i) => {
    const lp = lightPolygon(g.sightGrid, lx, ly, lr, i + 1);
    if (!lp || lp.length <= 4) return;
    const gx = (lx - cx) * s, gy = (ly - cy) * s, gR = lr * s;
    const pulse = 0.5 + 0.5 * Math.sin(T * 2.2 + i);
    const lg = ctx.createRadialGradient(gx, gy, gR * 0.05, gx, gy, gR);
    lg.addColorStop(0, `rgba(255,214,120,${0.2 + 0.06 * pulse})`);
    lg.addColorStop(0.6, 'rgba(255,170,70,.07)');
    lg.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo((lp[0] - cx) * s, (lp[1] - cy) * s);
    for (let k = 2; k < lp.length; k += 2) ctx.lineTo((lp[k] - cx) * s, (lp[k + 1] - cy) * s);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

/* Ceguera: la pantalla se cubre de una niebla oscura y lechosa en movimiento. No se ve el mundo. */
function drawBlindness(c, g, Wd, Hd, T) {
  const a = Math.min(1, g.st.bl / 450); // se aclara solo en el último momento
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = `rgba(7,5,14,${0.995 * a})`;
  c.fillRect(0, 0, Wd, Hd);
  const m = Math.max(Wd, Hd);
  for (let i = 0; i < 9; i++) {
    const t = T * (0.25 + 0.05 * i) + i * 2.1;
    const x = Wd * (0.5 + 0.42 * Math.sin(t * 1.1 + i));
    const y = Hd * (0.5 + 0.4 * Math.cos(t * 0.9 + i * 1.7));
    const r = m * (0.22 + 0.08 * Math.sin(t * 1.7 + i));
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${i % 2 ? '120,126,170' : '86,70,130'},${0.3 * a})`);
    gr.addColorStop(1, 'rgba(60,50,100,0)');
    c.fillStyle = gr;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  c.restore();
}

/* Alarma del reactor, en pantalla para todos (vivos, muertos, impostores): borde rojo que parpadea y una
   flecha amarilla hacia cada consola (A y B) que aún no tiene a nadie sujetándola. Si la consola
   está a la vista la flecha se posa encima; si no, se pega al borde de la pantalla señalando hacia ella. */
function drawReactorAlarm(c, g, cx, cy, s, W, H, dpr, T) {
  const rx = g.st.rx;
  if (!rx) return;
  const Wd = W * dpr, Hd = H * dpr;
  const k = 0.5 + 0.5 * Math.sin(T * 6.5);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  // luz roja intermitente: un velo suave y, sobre todo, el borde de la pantalla
  c.fillStyle = `rgba(255,30,40,${0.03 + 0.08 * k})`;
  c.fillRect(0, 0, Wd, Hd);
  const grad = c.createRadialGradient(Wd / 2, Hd / 2, Math.min(Wd, Hd) * 0.32, Wd / 2, Hd / 2, Math.hypot(Wd, Hd) * 0.55);
  grad.addColorStop(0, 'rgba(255,0,20,0)');
  grad.addColorStop(1, `rgba(255,0,20,${0.2 + 0.33 * k})`);
  c.fillStyle = grad;
  c.fillRect(0, 0, Wd, Hd);
  // flechas amarillas a las consolas
  const m = 54 * dpr;
  const bob = Math.sin(T * 7) * 5 * dpr;
  for (const pt of (g.rmeta && g.rmeta.pts) || []) {
    if (rx[pt.side]) continue; // ya hay alguien sujetándola
    const sx = (pt.x - cx) * s, sy = (pt.y - cy) * s;
    const label = String(pt.side || '').toUpperCase();
    const inside = sx > m && sx < Wd - m && sy > m && sy < Hd - m;
    c.fillStyle = '#ffd60a';
    c.strokeStyle = '#3a2c00';
    c.lineWidth = 3 * dpr;
    c.font = `900 ${18 * dpr}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.save();
    if (inside) {
      // flecha que bota sobre la consola, apuntando hacia abajo
      c.translate(sx, sy - 52 * dpr + bob);
      c.beginPath();
      c.moveTo(0, 26 * dpr);
      c.lineTo(-18 * dpr, -4 * dpr);
      c.lineTo(-7 * dpr, -4 * dpr);
      c.lineTo(-7 * dpr, -18 * dpr);
      c.lineTo(7 * dpr, -18 * dpr);
      c.lineTo(7 * dpr, -4 * dpr);
      c.lineTo(18 * dpr, -4 * dpr);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = '#ffd60a';
      c.strokeStyle = '#3a2c00';
      c.strokeText(label, 0, -32 * dpr);
      c.fillText(label, 0, -32 * dpr);
    } else {
      // fuera de pantalla: pegada al borde, apuntando hacia ella
      const dx = sx - Wd / 2, dy = sy - Hd / 2;
      const ang = Math.atan2(dy, dx);
      const kx = dx ? (Wd / 2 - m) / Math.abs(dx) : Infinity;
      const ky = dy ? (Hd / 2 - m) / Math.abs(dy) : Infinity;
      const t = Math.min(kx, ky);
      c.translate(Wd / 2 + dx * t, Hd / 2 + dy * t);
      c.save();
      c.rotate(ang);
      c.translate(bob, 0);
      c.beginPath();
      c.moveTo(26 * dpr, 0);
      c.lineTo(-4 * dpr, -18 * dpr);
      c.lineTo(-4 * dpr, -7 * dpr);
      c.lineTo(-18 * dpr, -7 * dpr);
      c.lineTo(-18 * dpr, 7 * dpr);
      c.lineTo(-4 * dpr, 7 * dpr);
      c.lineTo(-4 * dpr, 18 * dpr);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
      // la letra, un poco hacia dentro de la pantalla para que no tape la flecha
      c.fillStyle = '#ffd60a';
      c.strokeStyle = '#3a2c00';
      const lx = -Math.cos(ang) * 34 * dpr, ly = -Math.sin(ang) * 34 * dpr;
      c.strokeText(label, lx, ly);
      c.fillText(label, lx, ly);
    }
    c.restore();
  }
  c.restore();
}

export function drawMiniMap(el, miniC, g, T) {
  if (!el || !miniC) return;
  if (el.width !== miniC.width) { el.width = miniC.width; el.height = miniC.height; }
  const m = el.getContext('2d');
  const sc = miniC.width / g.world.w;
  m.clearRect(0, 0, el.width, el.height);
  m.drawImage(miniC, 0, 0);
  for (const t of g.tasks) if (!g.done.has(t.id)) {
    m.fillStyle = '#ffd60a';
    m.beginPath();
    m.arc(t.x * sc, t.y * sc, 3.5, 0, 7);
    m.fill();
  }
  m.fillStyle = g.meetUsed ? '#7a4450' : '#e63946';
  m.beginPath();
  m.arc(g.btn.x * sc, g.btn.y * sc, 4, 0, 7);
  m.fill();
  if (g.st.dark && Math.sin(T * 8) > 0) {
    m.fillStyle = '#ffd60a';
    m.fillRect(g.pnl.x * sc - 5, g.pnl.y * sc - 3, 10, 6);
  }
  if (g.st.rx && g.rmeta && g.rmeta.pts) {
    m.fillStyle = '#ff4d5e';
    for (const pt of g.rmeta.pts) {
      m.beginPath();
      m.arc(pt.x * sc, pt.y * sc, 4, 0, 7);
      m.fill();
    }
  }
  if (g.role === 'impostor' || g.engineer) {
    m.fillStyle = '#9d4edd';
    for (const v of g.vents || []) {
      m.beginPath();
      m.arc(v.x * sc, v.y * sc, 3, 0, 7);
      m.fill();
    }
  }
  m.fillStyle = (g.roster.get(g.myId) || {}).color || '#fff';
  m.strokeStyle = '#fff';
  m.lineWidth = 1.5;
  m.beginPath();
  m.arc(g.me.x * sc, g.me.y * sc, 5, 0, 7);
  m.fill();
  m.stroke();
}