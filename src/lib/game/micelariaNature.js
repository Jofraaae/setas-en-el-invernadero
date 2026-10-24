/* La naturaleza de Micelaria: el terreno del bosque, la arboleda que hace de muro y los
   objetos que pueblan la aldea (pozo, pajar, cascada, hoguera...) junto a los útiles de las
   tareas, todos de madera, piedra, mimbre y setas. Vive aparte de micelariaArt para que
   aquel archivo siga siendo el catálogo de suelos y aparatos. Solo pinta: no toca la lógica
   del juego ni la colisión (cada objeto se dibuja dentro de la caja que le da la sala). */

import { blob, blade, dome, moss } from './micelariaArt';
import { villageWallCell, villageWallTop, wallStyleAt } from './micelariaVillage';

const TAU = Math.PI * 2;
const HOJA = ['#a83f36', '#c9573f', '#7b4b8f', '#d9a15a'];

/* ---------------- el bosque entero ---------------- */
/* Se pinta antes que las salas, sobre todo el mapa: fuera de los caminos no hay vacío, hay
   arboleda. Hierba, manchas de musgo, calveros y hojarasca, todo con la misma semilla para
   que el mapa no cambie entre partidas. */
export function micelariaGround(c, world, r) {
  const g = c.createLinearGradient(0, 0, world.w * 0.35, world.h);
  g.addColorStop(0, '#172a1c');
  g.addColorStop(0.5, '#122116');
  g.addColorStop(1, '#0d1a12');
  c.fillStyle = g;
  c.fillRect(0, 0, world.w, world.h);

  // manchas grandes de musgo y calveros
  for (let i = 0; i < 240; i++) {
    c.fillStyle = i % 2 ? 'rgba(44,82,50,.18)' : 'rgba(9,18,13,.22)';
    blob(c, r() * world.w, r() * world.h, 60 + r() * 240, 10, i * 1.7, 0.75);
    c.fill();
  }
  // hierba
  const blades = Math.round((world.w * world.h) / 5000);
  for (let i = 0; i < blades; i++) blade(c, r() * world.w, r() * world.h, 4 + r() * 7, r() > 0.5);
  // matojos, helechos y florecillas
  for (let i = 0; i < 460; i++) {
    const px = r() * world.w, py = r() * world.h, rad = 7 + r() * 15;
    c.fillStyle = i % 2 ? 'rgba(56,108,60,.42)' : 'rgba(36,78,46,.46)';
    blob(c, px, py, rad, 8, i * 2.1, 0.8);
    c.fill();
    if (r() > 0.79) {
      c.fillStyle = ['rgba(246,238,190,.5)', 'rgba(226,178,214,.45)', 'rgba(180,224,255,.35)'][Math.floor(r() * 3)];
      c.beginPath();
      c.arc(px + r() * 8 - 4, py + r() * 8 - 4, 1.6 + r(), 0, TAU);
      c.fill();
    }
  }
  // agujas de pino y hojarasca
  for (let i = 0; i < 900; i++) {
    const px = r() * world.w, py = r() * world.h;
    c.strokeStyle = r() > 0.5 ? 'rgba(84,64,38,.3)' : 'rgba(28,20,12,.26)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(px + 3 + r() * 6, py + r() * 4 - 2);
    c.stroke();
  }
}

/* ---------------- el muro: una franja de arboleda ---------------- */
/* Cada celda de muro pegada a un camino es hierba apretada; encima, en una segunda pasada,
   van las copas de los árboles, corridas hacia el lado que no da al camino para no comerse
   la calle. Los troncos asoman justo en el borde, que es lo que marca dónde se choca. */
export function micelariaWallCell(c, x, y, s, r, style = 'forest') {
  if (style !== 'forest') return villageWallCell(c, x, y, s, r, style);
  c.fillStyle = '#1b2f20';
  c.fillRect(x, y, 20, 20);
  c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.06)';
  c.fillRect(x, y, 20, 20);
  for (let i = 0; i < 4; i++) blade(c, x + r() * 20, y + r() * 20, 3 + r() * 5, r() > 0.5);
  if (s.so) { // el canto que da al camino: hierba pisada, más oscura
    c.fillStyle = 'rgba(6,14,9,.3)';
    c.fillRect(x, y + 13, 20, 7);
  }
}

export function micelariaCanopy(c, border, r) {
  // las salas con muro propio (casas, cueva, empalizada...) se pintan aparte
  villageWallTop(c, border.filter((b) => b[6] && b[6] !== 'forest'), r);
  for (const [x, y, n, so, w, e, style] of border) {
    if (style && style !== 'forest') continue;
    const cx = x + 10 + (w ? 7 : e ? -7 : 0), cy = y + 10 + (n ? 7 : so ? -7 : 0);
    const pick = r();
    if (pick < 0.5) {
      // árbol alto: copa en capas, con la luz arriba
      const R = 22 + r() * 12;
      c.fillStyle = 'rgba(6,14,9,.32)';
      c.beginPath();
      c.ellipse(cx + 2, cy + 8, R * 0.95, R * 0.55, 0, 0, TAU);
      c.fill();
      c.fillStyle = '#20402a';
      c.beginPath();
      c.arc(cx - R * 0.3, cy + 2, R * 0.74, 0, TAU);
      c.arc(cx + R * 0.32, cy + 1, R * 0.68, 0, TAU);
      c.fill();
      c.fillStyle = '#2c5f34';
      c.beginPath();
      c.arc(cx - R * 0.1, cy - R * 0.16, R * 0.64, 0, TAU);
      c.arc(cx + R * 0.42, cy - R * 0.08, R * 0.46, 0, TAU);
      c.fill();
      c.fillStyle = '#3d8a44';
      c.beginPath();
      c.arc(cx - R * 0.06, cy - R * 0.3, R * 0.44, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(190,244,170,.22)';
      c.beginPath();
      c.arc(cx - R * 0.26, cy - R * 0.42, R * 0.2, 0, TAU);
      c.fill();
      // el tronco, del lado del camino
      if (so || n) {
        c.fillStyle = '#3d2c1a';
        c.fillRect(cx - 4, cy + R * (so ? 0.1 : -0.5), 8, R * 0.5);
      }
    } else if (pick < 0.78) {
      // seta gigante: el techo de la aldea
      const R = 15 + r() * 9;
      c.fillStyle = '#e3d6b4';
      c.fillRect(cx - R * 0.17, cy - R * 0.12, R * 0.34, R * 0.86);
      c.fillStyle = 'rgba(120,100,70,.25)';
      c.fillRect(cx - R * 0.17, cy - R * 0.12, R * 0.09, R * 0.86);
      c.fillStyle = HOJA[Math.floor(r() * HOJA.length)];
      dome(c, cx, cy, R, R * 0.78);
      c.fill();
      c.fillStyle = 'rgba(246,236,210,.8)';
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.ellipse(cx + (r() - 0.5) * R * 1.1, cy - r() * R * 0.42, 2.4, 1.8, 0, 0, TAU);
        c.fill();
      }
    } else {
      // matojo bajo con helecho
      const R = 12 + r() * 10;
      c.fillStyle = 'rgba(42,90,50,.75)';
      blob(c, cx, cy + 2, R, 8, r() * 6, 0.66);
      c.fill();
      c.fillStyle = 'rgba(74,146,72,.5)';
      blob(c, cx - R * 0.2, cy - 2, R * 0.7, 8, r() * 6, 0.66);
      c.fill();
    }
  }
}

export const MICELARIA_FOREST_WALL = {
  kind: 'nature',
  styleAt: wallStyleAt,
  cell: micelariaWallCell,
  canopy: micelariaCanopy,
};

/* ---------------- objetos del escenario ---------------- */

export const MICELARIA_OBST_EXTRA = {
  stem(c, w, h) { // el tallo de la seta madre, visto desde arriba
    const rx = w * 0.44, ry = h * 0.46;
    const g = c.createRadialGradient(-rx * 0.3, -ry * 0.35, 4, 0, 0, rx);
    g.addColorStop(0, '#f5e9c9');
    g.addColorStop(0.6, '#ddc9a0');
    g.addColorStop(1, '#ad9569');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, 0, rx, ry, 0, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(150,124,84,.26)';
    c.lineWidth = 1.6;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      c.beginPath();
      c.moveTo(Math.cos(a) * rx * 0.24, Math.sin(a) * ry * 0.24);
      c.quadraticCurveTo(
        Math.cos(a + 0.1) * rx * 0.62, Math.sin(a + 0.1) * ry * 0.62,
        Math.cos(a) * rx * 0.94, Math.sin(a) * ry * 0.94,
      );
      c.stroke();
    }
    c.strokeStyle = 'rgba(96,72,42,.45)';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(0, 0, rx, ry, 0, 0, TAU);
    c.stroke();
    c.strokeStyle = 'rgba(255,248,224,.3)';
    c.lineWidth = 7;
    c.beginPath();
    c.ellipse(0, 0, rx * 0.6, ry * 0.6, 0, 0, TAU);
    c.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.3;
      moss(c, Math.cos(a) * rx * 0.85, Math.sin(a) * ry * 0.85, 10, 5, 0.42);
    }
    c.fillStyle = 'rgba(150,255,230,.5)';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.7;
      c.beginPath();
      c.arc(Math.cos(a) * rx * 0.42, Math.sin(a) * ry * 0.42, 2.6, 0, TAU);
      c.fill();
    }
  },

  well(c, w, h) { // pozo de piedra de la aldea
    const R = Math.min(w * 0.42, h * 0.54);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      c.fillStyle = i % 3 ? '#7c8378' : '#66705f';
      blob(c, Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.5, 13, 7, i * 1.9, 0.72);
      c.fill();
      c.strokeStyle = 'rgba(34,42,34,.5)';
      c.lineWidth = 1.6;
      c.stroke();
    }
    c.fillStyle = '#12333a';
    c.beginPath();
    c.ellipse(0, 0, R * 0.6, R * 0.36, 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(130,225,235,.22)';
    c.beginPath();
    c.ellipse(-R * 0.12, -R * 0.06, R * 0.3, R * 0.14, 0.2, 0, TAU);
    c.fill();
    // cigüeña y cubo
    c.fillStyle = '#6a4b2c';
    c.fillRect(-R * 0.92, -h * 0.02, R * 1.84, 7);
    c.fillRect(-R * 0.86, -h * 0.02, 7, h * 0.42);
    c.fillRect(R * 0.78, -h * 0.02, 7, h * 0.42);
    c.strokeStyle = 'rgba(228,220,190,.55)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(R * 0.3, 0);
    c.lineTo(R * 0.3, h * 0.16);
    c.stroke();
    c.fillStyle = '#8a6a44';
    c.beginPath();
    c.moveTo(R * 0.18, h * 0.16);
    c.lineTo(R * 0.44, h * 0.16);
    c.lineTo(R * 0.39, h * 0.31);
    c.lineTo(R * 0.23, h * 0.31);
    c.closePath();
    c.fill();
    moss(c, -R * 0.5, h * 0.16, 12, 5, 0.4);
  },

  haystack(c, w, h) { // pajar de paja dorada con su horca
    c.fillStyle = 'rgba(6,14,9,.28)';
    c.beginPath();
    c.ellipse(2, h * 0.22, w * 0.5, h * 0.24, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#b98f3e';
    blob(c, 0, h * 0.06, Math.min(w, h) * 0.5, 12, 2.4, h / (w * 1.02));
    c.fill();
    c.fillStyle = '#d8ae55';
    blob(c, -w * 0.04, -h * 0.06, Math.min(w, h) * 0.42, 12, 5.1, h / (w * 1.06));
    c.fill();
    c.fillStyle = '#eccd82';
    blob(c, -w * 0.12, -h * 0.14, Math.min(w, h) * 0.28, 10, 8.3, 0.8);
    c.fill();
    c.strokeStyle = 'rgba(120,88,34,.4)';
    c.lineWidth = 1.4;
    for (let i = 0; i < 16; i++) {
      const px = -w * 0.4 + (i / 15) * w * 0.8;
      c.beginPath();
      c.moveTo(px, h * 0.2);
      c.lineTo(px + 4 - (i % 3) * 3, -h * 0.1 - (i % 4) * 4);
      c.stroke();
    }
    c.strokeStyle = '#6a4b2c';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(w * 0.3, h * 0.34);
    c.lineTo(w * 0.42, -h * 0.42);
    c.stroke();
    c.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(w * 0.42, -h * 0.42 + i * 7);
      c.lineTo(w * 0.24, -h * 0.5 + i * 7);
      c.stroke();
    }
    c.fillStyle = '#c9573f';
    dome(c, -w * 0.36, h * 0.26, 8, 7);
    c.fill();
  },

  rockpool(c, w, h) { // charca entre piedras, con juncos
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.4;
      c.fillStyle = i % 3 ? '#69705f' : '#565f52';
      blob(c, Math.cos(a) * w * 0.36, Math.sin(a) * h * 0.34, 11, 7, i * 2.2, 0.8);
      c.fill();
    }
    c.fillStyle = '#17403f';
    blob(c, 0, 0, Math.min(w, h) * 0.42, 12, 4.4, h / w * 1.1);
    c.fill();
    c.fillStyle = 'rgba(120,220,225,.2)';
    blob(c, -w * 0.1, -h * 0.08, Math.min(w, h) * 0.22, 10, 7.7, 0.7);
    c.fill();
    c.strokeStyle = 'rgba(190,240,240,.3)';
    c.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.ellipse(-w * 0.08 + i * 8, h * 0.04 - i * 5, 9 + i * 5, 4 + i * 2, 0.2, 0, TAU);
      c.stroke();
    }
    c.strokeStyle = '#4a6b3c';
    c.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const px = -w * 0.34 + i * (w * 0.17);
      c.beginPath();
      c.moveTo(px, h * 0.4);
      c.quadraticCurveTo(px + 5, h * 0.1, px - 3, -h * 0.28 - (i % 2) * 10);
      c.stroke();
    }
  },

  tallgrass(c, w, h) { // matas altas de hierba
    for (let i = 0; i < 26; i++) {
      const px = -w * 0.46 + (i / 25) * w * 0.92;
      const k = h * (0.5 + (i % 4) * 0.12);
      c.strokeStyle = i % 3 ? 'rgba(102,164,88,.8)' : 'rgba(66,120,70,.85)';
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(px, h * 0.34);
      c.quadraticCurveTo(px + 5, h * 0.34 - k * 0.6, px - 3 + (i % 5), h * 0.34 - k);
      c.stroke();
    }
    c.fillStyle = 'rgba(214,196,120,.7)';
    for (let i = 0; i < 7; i++) {
      const px = -w * 0.36 + i * (w * 0.12);
      c.beginPath();
      c.ellipse(px, h * 0.34 - h * (0.6 + (i % 3) * 0.14), 2.4, 5, 0, 0, TAU);
      c.fill();
    }
  },

  mushring(c, w, h) { // corro de setas sobre el musgo
    c.fillStyle = 'rgba(58,110,62,.42)';
    blob(c, 0, 0, Math.min(w, h) * 0.52, 12, 1.9, 0.7);
    c.fill();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + 0.5;
      const px = Math.cos(a) * w * 0.36, py = Math.sin(a) * h * 0.3;
      const R = 5 + (i % 3) * 2.4;
      c.fillStyle = '#e8dcbf';
      c.fillRect(px - R * 0.16, py - R * 0.1, R * 0.32, R * 0.9);
      c.fillStyle = HOJA[i % HOJA.length];
      dome(c, px, py, R, R * 0.8);
      c.fill();
      c.fillStyle = 'rgba(250,244,222,.75)';
      c.beginPath();
      c.arc(px + 1, py - R * 0.3, 1.2, 0, TAU);
      c.fill();
    }
  },

  waterfall(c, w, h) { // cascada: peñas arriba y el agua cayendo a la poza
    c.fillStyle = '#5b6257';
    blob(c, -w * 0.36, -h * 0.34, Math.min(w, h) * 0.28, 9, 3.3, 0.9);
    c.fill();
    blob(c, w * 0.4, -h * 0.3, Math.min(w, h) * 0.24, 9, 6.1, 0.9);
    c.fill();
    c.fillStyle = '#6e7566';
    blob(c, w * 0.3, -h * 0.4, Math.min(w, h) * 0.18, 8, 8.9, 0.9);
    c.fill();
    // la caída
    const gr = c.createLinearGradient(0, -h * 0.4, 0, h * 0.3);
    gr.addColorStop(0, 'rgba(226,248,255,.85)');
    gr.addColorStop(0.5, 'rgba(150,220,240,.8)');
    gr.addColorStop(1, 'rgba(110,190,215,.7)');
    c.fillStyle = gr;
    c.beginPath();
    c.moveTo(-w * 0.13, -h * 0.22);
    c.quadraticCurveTo(-w * 0.06, h * 0.05, -w * 0.2, h * 0.3);
    c.lineTo(w * 0.2, h * 0.3);
    c.quadraticCurveTo(w * 0.08, h * 0.05, w * 0.13, -h * 0.22);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.5)';
    c.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const px = -w * 0.08 + i * (w * 0.05);
      c.beginPath();
      c.moveTo(px, -h * 0.18);
      c.quadraticCurveTo(px + 3, h * 0.05, px - 2, h * 0.28);
      c.stroke();
    }
    // la poza y la espuma
    c.fillStyle = '#1b4a52';
    blob(c, 0, h * 0.34, Math.min(w, h) * 0.44, 12, 4.7, h / w * 1.2);
    c.fill();
    c.fillStyle = 'rgba(240,252,255,.5)';
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.ellipse(-w * 0.3 + i * (w * 0.075), h * 0.28 + (i % 3) * 6, 5 + (i % 2) * 4, 3, 0, 0, TAU);
      c.fill();
    }
    moss(c, -w * 0.42, h * 0.26, 14, 6, 0.45);
  },

  vine(c, w, h) { // tronco con lianas colgando
    c.fillStyle = '#5a4228';
    blob(c, 0, h * 0.16, Math.min(w, h) * 0.4, 12, 5.5, h / (w * 1.1));
    c.fill();
    c.fillStyle = 'rgba(120,96,60,.5)';
    blob(c, -w * 0.08, h * 0.06, Math.min(w, h) * 0.24, 10, 7.1, 0.8);
    c.fill();
    for (let i = 0; i < 7; i++) {
      const px = -w * 0.42 + i * (w * 0.14);
      const col = ['#4f9140', '#3f7a55', '#7fae4a'][i % 3];
      c.strokeStyle = col;
      c.lineWidth = 3.2;
      c.beginPath();
      c.moveTo(px, h * 0.2);
      c.bezierCurveTo(px + 9, h * 0.02, px - 9, -h * 0.18, px + 2, -h * 0.44 - (i % 3) * 8);
      c.stroke();
      c.fillStyle = col;
      for (let j = 0; j < 3; j++) {
        const t = 0.25 + j * 0.28;
        c.beginPath();
        c.ellipse(px + (j % 2 ? 7 : -7), h * 0.2 - h * t * 1.4, 6, 3.4, j * 0.6, 0, TAU);
        c.fill();
      }
    }
    c.fillStyle = 'rgba(150,255,230,.6)';
    c.beginPath();
    c.arc(w * 0.3, -h * 0.36, 3, 0, TAU);
    c.fill();
  },

  bonfire(c, w, h) { // hoguera de troncos
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      c.strokeStyle = i % 2 ? '#5a4028' : '#6d4f2f';
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(Math.cos(a) * w * 0.3, Math.sin(a) * h * 0.26 + h * 0.14);
      c.lineTo(Math.cos(a + 2.4) * w * 0.3, Math.sin(a + 2.4) * h * 0.26 + h * 0.14);
      c.stroke();
    }
    c.fillStyle = 'rgba(255,170,60,.24)';
    c.beginPath();
    c.arc(0, h * 0.06, Math.min(w, h) * 0.5, 0, TAU);
    c.fill();
    for (let i = 0; i < 3; i++) {
      const s = 1 - i * 0.28;
      c.fillStyle = ['rgba(230,80,40,.9)', 'rgba(255,150,50,.9)', 'rgba(255,225,130,.9)'][i];
      c.beginPath();
      c.moveTo(-w * 0.2 * s, h * 0.14);
      c.quadraticCurveTo(-w * 0.06 * s, -h * (0.1 + i * 0.1), 0, -h * (0.24 + i * 0.12) * s);
      c.quadraticCurveTo(w * 0.06 * s, -h * (0.1 + i * 0.1), w * 0.2 * s, h * 0.14);
      c.closePath();
      c.fill();
    }
    c.fillStyle = 'rgba(255,240,180,.75)';
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.arc(-w * 0.16 + i * (w * 0.08), -h * (0.3 + (i % 3) * 0.12), 2, 0, TAU);
      c.fill();
    }
  },

  signpost(c, w, h) { // poste con las tablillas de la aldea
    c.fillStyle = '#6a4b2c';
    c.fillRect(-5, -h * 0.42, 10, h * 0.82);
    c.fillStyle = 'rgba(0,0,0,.2)';
    c.fillRect(2, -h * 0.42, 3, h * 0.82);
    const tag = (y, dir, col) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(dir * 6, y);
      c.lineTo(dir * (w * 0.46), y - 4);
      c.lineTo(dir * (w * 0.5), y + 7);
      c.lineTo(dir * (w * 0.46), y + 16);
      c.lineTo(dir * 6, y + 12);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(48,32,14,.5)';
      c.lineWidth = 2;
      c.stroke();
    };
    tag(-h * 0.34, -1, '#c9a06a');
    tag(-h * 0.12, 1, '#b98f5a');
    tag(h * 0.1, -1, '#c9a06a');
    moss(c, 6, h * 0.34, 12, 5, 0.5);
    c.fillStyle = '#c9573f';
    dome(c, -12, h * 0.3, 8, 7);
    c.fill();
  },

  table(c, w, h) { // mesa de tablones de las casas: el tablero, sus patas y los cuencos
    const w2 = w * 0.5;
    c.fillStyle = '#4a3520';
    c.fillRect(-w * 0.36, h * 0.04, 11, h * 0.44);
    c.fillRect(w * 0.36 - 11, h * 0.04, 11, h * 0.44);
    c.fillStyle = '#7a5a38';
    c.fillRect(-w2, -h * 0.36, w, h * 0.44);
    c.fillStyle = 'rgba(255,240,200,.14)';
    c.fillRect(-w2, -h * 0.36, w, h * 0.13);
    c.strokeStyle = 'rgba(58,38,18,.5)';
    c.lineWidth = 1.8;
    for (let i = 1; i < 4; i++) {
      const px = -w2 + (w / 4) * i;
      c.beginPath();
      c.moveTo(px, -h * 0.36);
      c.lineTo(px, h * 0.06);
      c.stroke();
    }
    c.strokeRect(-w2, -h * 0.36, w, h * 0.44);
    for (const dx of [-w * 0.26, 0, w * 0.26]) {
      c.fillStyle = '#e8dcbf';
      c.beginPath();
      c.ellipse(dx, -h * 0.22, 9, 6, 0, 0, TAU);
      c.fill();
      c.fillStyle = '#c9573f';
      c.beginPath();
      c.ellipse(dx, -h * 0.26, 6, 4, 0, 0, TAU);
      c.fill();
    }
    moss(c, w2 * 0.58, h * 0.42, 10, 4, 0.45);
  },
};

/* ---------------- objetos de las tareas ---------------- */
/* Los mismos que usa el invernadero (cesta, caja, mesa, panel...) pero de materiales del
   bosque: mimbre, tablones sin cepillar, rodajas de tronco y piedras talladas. Ninguno lleva
   ya una tabla rectangular debajo. */

export const MICELARIA_PROPS_EXTRA = {
  tray(c, w, h) { // cesta redonda de mimbre con esporas
    const R = Math.min(w, h) * 0.5;
    c.fillStyle = '#8a6a44';
    c.beginPath();
    c.ellipse(0, 0, R, R * 0.82, 0, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(74,52,26,.55)';
    c.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo(i * (R / 3.6), -R * 0.72);
      c.quadraticCurveTo(i * (R / 2.6), 0, i * (R / 3.6), R * 0.72);
      c.stroke();
    }
    c.strokeStyle = '#cbbd97';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(0, -R * 0.3, R * 0.96, R * 0.3, 0, 0, TAU);
    c.stroke();
    for (let i = 0; i < 3; i++) {
      const px = -R * 0.42 + i * (R * 0.42);
      c.fillStyle = '#e8dcbf';
      c.fillRect(px - 2.4, -R * 0.5, 4.8, 9);
      c.fillStyle = HOJA[i];
      dome(c, px, -R * 0.5, 9, 7);
      c.fill();
    }
  },

  crate(c, w, h) { // caja de tablones sin cepillar, atada con cuerda
    const w2 = w * 0.5;
    for (let i = 0; i < 4; i++) {
      const px = -w2 + i * (w / 4), ph = h * (0.66 + (i % 2) * 0.1);
      c.fillStyle = i % 2 ? '#8f6d46' : '#7a5a38';
      c.beginPath();
      c.moveTo(px, h * 0.3 - ph);
      c.lineTo(px + w / 4 - 2, h * 0.3 - ph - 1.5);
      c.lineTo(px + w / 4 - 2, h * 0.3);
      c.lineTo(px, h * 0.3 + 1);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(58,38,18,.45)';
      c.lineWidth = 1.4;
      c.stroke();
    }
    c.strokeStyle = '#5d4426';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-w2, -h * 0.12);
    c.quadraticCurveTo(0, -h * 0.24, w2, -h * 0.08);
    c.stroke();
    c.fillStyle = '#4fe3d0';
    c.beginPath();
    c.arc(0, -h * 0.18, 4, 0, TAU);
    c.fill();
    moss(c, -w2 * 0.6, h * 0.26, 11, 5, 0.45);
  },

  bench(c, w, h) { // medio tronco partido, con musgo
    const w2 = w * 0.5;
    c.fillStyle = '#6a4b2c';
    blob(c, 0, 0, w2, 14, 3.1, h / (w * 1.02));
    c.fill();
    c.fillStyle = 'rgba(255,240,200,.12)';
    blob(c, -w2 * 0.22, -h * 0.1, w2 * 0.42, 10, 5.2, 0.5);
    c.fill();
    c.strokeStyle = 'rgba(56,36,16,.5)';
    c.lineWidth = 2;
    blob(c, 0, 0, w2, 14, 3.1, h / (w * 1.02));
    c.stroke();
    c.strokeStyle = 'rgba(96,70,36,.4)';
    c.lineWidth = 1.6;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(i * (w2 / 3), -h * 0.42);
      c.lineTo(i * (w2 / 3) + 3, h * 0.42);
      c.stroke();
    }
    moss(c, w2 * 0.42, h * 0.2, 12, 5, 0.5);
    c.fillStyle = '#e8dcbf';
    c.fillRect(w2 * 0.34, -h * 0.4, 4, 8);
    c.fillStyle = '#c9573f';
    dome(c, w2 * 0.36, -h * 0.4, 8, 6);
    c.fill();
  },

  table(c, w, h) { // rodaja de tronco con anillos y los cuencos encima
    const R = Math.min(w, h) * 0.56;
    c.fillStyle = '#8a6a44';
    c.beginPath();
    c.ellipse(0, 0, R, R * (h / w) * 1.5, 0, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(96,66,32,.45)';
    c.lineWidth = 1.6;
    for (let i = 1; i <= 3; i++) {
      c.beginPath();
      c.ellipse(0, 0, R * (i / 4), R * (h / w) * 1.5 * (i / 4), 0, 0, TAU);
      c.stroke();
    }
    c.strokeStyle = 'rgba(58,38,18,.55)';
    c.lineWidth = 2.4;
    c.beginPath();
    c.ellipse(0, 0, R, R * (h / w) * 1.5, 0, 0, TAU);
    c.stroke();
    c.fillStyle = 'rgba(255,240,200,.1)';
    blob(c, -R * 0.2, -h * 0.06, R * 0.4, 10, 4.4, 0.5);
    c.fill();
    for (const dx of [-R * 0.34, R * 0.32]) {
      c.fillStyle = '#e8dcbf';
      c.beginPath();
      c.ellipse(dx, 0, 10, 7, 0, 0, TAU);
      c.fill();
      c.fillStyle = '#c9573f';
      c.beginPath();
      c.ellipse(dx, -1, 6, 4.4, 0, 0, TAU);
      c.fill();
    }
    moss(c, R * 0.5, h * 0.24, 10, 4, 0.45);
  },

  panel(c, w, h) { // tablón de corteza con luciérnagas, colgado de dos postes
    c.fillStyle = '#6a4b2c';
    c.fillRect(-w * 0.42, -h * 0.2, 7, h * 0.8);
    c.fillRect(w * 0.42 - 7, -h * 0.2, 7, h * 0.8);
    c.fillStyle = '#5a4426';
    blob(c, 0, -h * 0.1, w * 0.5, 12, 2.7, h / (w * 0.9));
    c.fill();
    c.fillStyle = 'rgba(255,240,200,.1)';
    blob(c, -w * 0.1, -h * 0.2, w * 0.32, 10, 6.3, 0.8);
    c.fill();
    c.strokeStyle = 'rgba(48,32,14,.5)';
    c.lineWidth = 2;
    blob(c, 0, -h * 0.1, w * 0.5, 12, 2.7, h / (w * 0.9));
    c.stroke();
    for (let i = 0; i < 4; i++) {
      const px = -w * 0.28 + i * (w * 0.19), py = -h * 0.16 + (i % 2) * 10;
      c.fillStyle = 'rgba(255,205,110,.3)';
      c.beginPath();
      c.arc(px, py, 8, 0, TAU);
      c.fill();
      c.fillStyle = ['#ffd86a', '#8ef0c0', '#7cd8ff', '#ffd86a'][i];
      c.beginPath();
      c.arc(px, py, 3.4, 0, TAU);
      c.fill();
    }
    moss(c, -w * 0.3, h * 0.4, 12, 5, 0.5);
  },

  switchbox(c, w, h) { // poste con las palancas del riego
    c.fillStyle = '#6a4b2c';
    c.fillRect(-w * 0.14, -h * 0.5, w * 0.28, h * 0.92);
    c.fillStyle = 'rgba(0,0,0,.18)';
    c.fillRect(w * 0.04, -h * 0.5, w * 0.1, h * 0.92);
    c.fillStyle = '#4a3520';
    blob(c, 0, -h * 0.3, w * 0.36, 10, 3.9, h / (w * 1.4));
    c.fill();
    for (let i = 0; i < 4; i++) {
      const px = -w * 0.2 + i * (w * 0.13);
      c.strokeStyle = '#cbbd97';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(px, -h * 0.34);
      c.lineTo(px + (i % 2 ? 5 : -5), -h * 0.06);
      c.stroke();
      c.fillStyle = i === 1 ? '#ffd86a' : '#7cd8ff';
      c.beginPath();
      c.arc(px + (i % 2 ? 5 : -5), -h * 0.04, 2.8, 0, TAU);
      c.fill();
    }
    moss(c, w * 0.2, h * 0.3, 11, 5, 0.45);
    c.fillStyle = '#e8dcbf';
    c.fillRect(-w * 0.4, h * 0.28, 4, 9);
    c.fillStyle = '#4fe3d0';
    dome(c, -w * 0.4 + 1, h * 0.28, 8, 7);
    c.fill();
  },

  terminal(c, w, h) { // piedra rúnica, con su musgo y las runas encendidas
    c.fillStyle = '#6d7268';
    blob(c, 0, h * 0.04, Math.min(w, h) * 0.52, 13, 4.1, h / (w * 1.05));
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.09)';
    blob(c, -w * 0.14, -h * 0.16, Math.min(w, h) * 0.34, 10, 7.5, 0.8);
    c.fill();
    c.strokeStyle = 'rgba(34,40,34,.55)';
    c.lineWidth = 2.4;
    blob(c, 0, h * 0.04, Math.min(w, h) * 0.52, 13, 4.1, h / (w * 1.05));
    c.stroke();
    for (let i = 0; i < 3; i++) {
      c.strokeStyle = 'rgba(120,240,230,.85)';
      c.lineWidth = 3;
      const y = -h * 0.16 + i * 11;
      c.beginPath();
      c.moveTo(-w * 0.26, y);
      c.lineTo(-w * 0.16, y + 5);
      c.lineTo(-w * 0.08, y - 4);
      c.lineTo(w * 0.24, y);
      c.stroke();
    }
    c.fillStyle = 'rgba(120,240,230,.16)';
    blob(c, 0, h * 0.06, Math.min(w, h) * 0.38, 11, 9.2, 0.75);
    c.fill();
    moss(c, -w * 0.34, h * 0.3, 12, 5, 0.5);
    moss(c, w * 0.32, -h * 0.28, 10, 4, 0.4);
  },

  keypad(c, w, h) { // piedra baja con las teclas talladas
    c.fillStyle = '#6b7065';
    blob(c, 0, h * 0.06, Math.min(w, h) * 0.5, 12, 6.7, h / (w * 1.15));
    c.fill();
    c.strokeStyle = 'rgba(34,40,34,.55)';
    c.lineWidth = 2.2;
    blob(c, 0, h * 0.06, Math.min(w, h) * 0.5, 12, 6.7, h / (w * 1.15));
    c.stroke();
    c.fillStyle = '#2c322c';
    blob(c, 0, -h * 0.06, Math.min(w, h) * 0.34, 9, 2.9, 0.6);
    c.fill();
    c.fillStyle = 'rgba(120,240,230,.85)';
    c.fillRect(-w * 0.16, -h * 0.14, 12, 3);
    for (let r2 = 0; r2 < 4; r2++) {
      for (let k = 0; k < 3; k++) {
        c.fillStyle = (r2 + k) % 3 === 0 ? 'rgba(230,120,110,.85)' : 'rgba(198,190,164,.75)';
        c.beginPath();
        c.ellipse(-w * 0.14 + k * 10, -h * 0.04 + r2 * 8, 4.4, 3.4, 0, 0, TAU);
        c.fill();
      }
    }
    moss(c, w * 0.28, h * 0.34, 11, 5, 0.5);
  },
};