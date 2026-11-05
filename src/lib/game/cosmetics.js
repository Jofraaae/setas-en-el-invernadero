/* El armario: catálogo de accesorios y su dibujo.

   Cada jugador lleva un "aspecto" (look): como mucho un accesorio por categoría, p. ej.
   { hat: 'witch', face: 'glasses', back: 'cape' }. Una categoría sin accesorio no aparece.
   TODOS los accesorios están disponibles para TODOS los jugadores desde el principio: no hay
   desbloqueos, monedas ni tienda.

   Cómo añadir un accesorio nuevo:
     1. Ponlo en la lista de su categoría en ITEMS (id, nombre y función de dibujo).
     2. Añade el mismo id a server/cosmetics.mjs (el servidor solo acepta ids que conoce).
     3. Añade su nombre en inglés a src/lib/i18n/locales/en.json.
     4. `node scripts/checkCosmetics.mjs` comprueba que cliente y servidor coinciden.

   Las funciones de dibujo trabajan en el sistema de coordenadas del seta (ya escalado y con la
   cara mirando a la derecha): el sombrero ocupa de x = -25 a 25 con su parte alta en y = -28, el
   pie va de x = -11 a 11 e y = -4 a 20 y los ojos están en (1, 8) y (9, 8). Dibujar solo ahí,
   y nunca tocar el círculo de choque ni nada de la partida: son adornos. */

import { trMark } from '@/lib/i18n';

const TAU = Math.PI * 2;

/* ---------- ayudas de dibujo ---------- */
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function dot(c, x, y, r, fill) {
  c.fillStyle = fill;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
}
function ell(c, x, y, rx, ry, fill, rot = 0) {
  c.fillStyle = fill;
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
  c.fill();
}
function line(c, x1, y1, x2, y2, col, w) {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}
// el contorno del pie: lo que se pinta dentro de él no se sale del seta
function clipStem(c) {
  rr(c, -11, -4, 22, 24, 9);
  c.clip();
}
function star(c, x, y, r, fill) {
  c.fillStyle = fill;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2;
    const rad = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  c.closePath();
  c.fill();
}
const flap = (t, k = 7) => 1 + 0.12 * Math.sin((t || 0) * k);

/* ---------- Sombreros ---------- */
// h = lo que sobresale por encima del sombrero: los adornos "flotantes" de la cabeza se suben esa altura
const HATS = [
  { id: 'witch', name: trMark('Sombrero de bruja'), h: 36, draw(c) {
    ell(c, 0, -23, 23, 5, '#2b2140');
    c.fillStyle = '#2b2140';
    c.beginPath(); c.moveTo(-13, -24); c.quadraticCurveTo(-4, -40, 4, -48); c.quadraticCurveTo(8, -56, 14, -58); c.quadraticCurveTo(8, -44, 13, -24); c.closePath(); c.fill();
    c.fillStyle = '#7b4fc9'; c.fillRect(-13, -30, 26, 5);
    c.fillStyle = '#f4c542'; c.fillRect(-3, -31, 6, 7);
    c.fillStyle = '#2b2140'; c.fillRect(-1.4, -29.4, 2.8, 4);
  } },
  { id: 'crown', name: trMark('Corona'), h: 14, draw(c) {
    c.fillStyle = '#f4c542';
    c.beginPath(); c.moveTo(-13, -23); c.lineTo(-14, -37); c.lineTo(-7, -31); c.lineTo(0, -40); c.lineTo(7, -31); c.lineTo(14, -37); c.lineTo(13, -23); c.closePath(); c.fill();
    c.strokeStyle = '#b8860b'; c.lineWidth = 1.4; c.stroke();
    dot(c, -7, -27, 2, '#e63946'); dot(c, 0, -28, 2.2, '#4cc9f0'); dot(c, 7, -27, 2, '#e63946');
  } },
  { id: 'tophat', name: trMark('Chistera'), h: 26, draw(c) {
    ell(c, 0, -24, 20, 4.2, '#17171c');
    rr(c, -12, -51, 24, 28, 3); c.fillStyle = '#23232b'; c.fill();
    c.fillStyle = '#a83232'; c.fillRect(-12, -33, 24, 6);
    c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(-9, -49, 4, 22);
  } },
  { id: 'gnome', name: trMark('Gorro de gnomo'), h: 34, draw(c) {
    c.fillStyle = '#d6382f';
    c.beginPath(); c.moveTo(-17, -22); c.quadraticCurveTo(-8, -32, -2, -46); c.quadraticCurveTo(2, -56, 10, -58); c.quadraticCurveTo(10, -44, 17, -22); c.quadraticCurveTo(0, -17, -17, -22); c.fill();
    ell(c, 0, -22, 18, 4, '#f6f1e4');
    dot(c, 10, -58, 3.4, '#f6f1e4');
  } },
  { id: 'straw', name: trMark('Sombrero de paja'), h: 8, draw(c) {
    ell(c, 0, -22, 29, 6, '#e0bd6c');
    c.fillStyle = '#efd186';
    c.beginPath(); c.moveTo(-14, -22); c.quadraticCurveTo(-14, -37, 0, -37); c.quadraticCurveTo(14, -37, 14, -22); c.closePath(); c.fill();
    c.fillStyle = '#c0392b'; c.fillRect(-14, -27, 28, 4);
    c.strokeStyle = 'rgba(150,110,40,.5)'; c.lineWidth = 1;
    for (let i = -20; i <= 20; i += 8) { c.beginPath(); c.moveTo(i, -22.5); c.lineTo(i * 1.12, -20); c.stroke(); }
  } },
  { id: 'acorn', name: trMark('Gorro de bellota'), h: 14, draw(c) {
    c.fillStyle = '#8b5a2b';
    c.beginPath(); c.moveTo(-17, -22); c.bezierCurveTo(-18, -38, 18, -38, 17, -22); c.quadraticCurveTo(0, -17, -17, -22); c.fill();
    c.save(); c.clip(); c.strokeStyle = 'rgba(70,40,15,.55)'; c.lineWidth = 1.2;
    for (let i = -24; i <= 24; i += 6) { c.beginPath(); c.moveTo(i, -40); c.lineTo(i + 14, -18); c.stroke(); c.beginPath(); c.moveTo(i, -18); c.lineTo(i + 14, -40); c.stroke(); }
    c.restore();
    line(c, 0, -35, 1, -42, '#6b4220', 3);
  } },
  { id: 'wizard', name: trMark('Sombrero de mago'), h: 42, draw(c) {
    ell(c, 0, -23, 21, 4.6, '#44307f');
    c.fillStyle = '#5b3fa0';
    c.beginPath(); c.moveTo(-14, -24); c.quadraticCurveTo(-8, -44, 2, -58); c.quadraticCurveTo(6, -66, 14, -64); c.quadraticCurveTo(6, -56, 8, -50); c.quadraticCurveTo(14, -38, 14, -24); c.closePath(); c.fill();
    star(c, -3, -38, 3.2, '#ffd75e'); star(c, 5, -30, 2.4, '#ffd75e'); star(c, 2, -49, 2, '#ffd75e');
  } },
  { id: 'beret', name: trMark('Boina'), h: 10, draw(c) {
    ell(c, -2, -28, 21, 8, '#b5312b', -0.12);
    ell(c, -2, -26, 17, 4, 'rgba(0,0,0,.14)', -0.12);
    line(c, -2, -36, -1, -40, '#8a221d', 2.6);
  } },
];

/* ---------- Accesorios de cabeza ---------- */
const HEADS = [
  { id: 'flower', name: trMark('Flor'), draw(c, t) {
    const x = 16, y = -17, k = 1 + 0.04 * Math.sin((t || 0) * 3);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; dot(c, x + Math.cos(a) * 4.4 * k, y + Math.sin(a) * 4.4 * k, 3.5, '#fff6f8'); }
    dot(c, x, y, 3, '#f4b400');
  } },
  { id: 'sprout', name: trMark('Brote'), float: true, draw(c, t) {
    const sw = Math.sin((t || 0) * 2) * 1.5;
    c.strokeStyle = '#4caf50'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -27); c.quadraticCurveTo(0 + sw, -33, 1 + sw, -38); c.stroke();
    ell(c, -5 + sw, -38, 6, 3, '#6fd46a', -0.5);
    ell(c, 7 + sw, -40, 6, 3, '#4fbf55', 0.5);
  } },
  { id: 'minishroom', name: trMark('Mini seta'), float: true, draw(c) {
    rr(c, -2.2, -34, 4.4, 8, 2); c.fillStyle = '#f3e9d2'; c.fill();
    c.fillStyle = '#e63946';
    c.beginPath(); c.moveTo(-8, -33); c.quadraticCurveTo(0, -46, 8, -33); c.quadraticCurveTo(0, -31, -8, -33); c.fill();
    dot(c, -2.5, -37, 1.4, '#fff'); dot(c, 3, -36, 1.2, '#fff');
  } },
  { id: 'antennae', name: trMark('Antenas'), float: true, draw(c, t) {
    const w = Math.sin((t || 0) * 4) * 2;
    for (const s of [-1, 1]) {
      c.strokeStyle = '#3a3a3a'; c.lineWidth = 1.8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(s * 6, -27); c.quadraticCurveTo(s * 9 + w * s, -37, s * 12 + w * s, -44); c.stroke();
      dot(c, s * 12 + w * s, -45, 3.2, '#ff7ab6');
    }
  } },
  { id: 'antlers', name: trMark('Cuernos de ciervo'), float: true, draw(c) {
    c.strokeStyle = '#7a4a22'; c.lineWidth = 2.8; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 7, -27); c.quadraticCurveTo(s * 13, -34, s * 12, -46); c.stroke();
      c.beginPath(); c.moveTo(s * 11, -35); c.lineTo(s * 18, -38); c.stroke();
      c.beginPath(); c.moveTo(s * 12.4, -42); c.lineTo(s * 17, -48); c.stroke();
    }
  } },
  { id: 'wreath', name: trMark('Corona de flores'), draw(c) {
    const cols = ['#ff8fb1', '#fff3b0', '#9be37c', '#c9a3ff', '#ffb36b'];
    for (let i = 0; i < 11; i++) {
      const a = Math.PI + 0.28 + (i / 10) * (Math.PI - 0.56);
      const x = Math.cos(a) * 22, y = -4 + Math.sin(a) * 25 + 1;
      dot(c, x, y, 3.1, i % 2 ? '#58b957' : cols[(i / 2 | 0) % cols.length]);
      if (!(i % 2)) dot(c, x, y, 1, '#fff');
    }
  } },
  { id: 'firefly', name: trMark('Luciérnaga'), float: true, draw(c, t) {
    const tt = t || 0;
    const x = 15 + Math.sin(tt * 2) * 3, y = -42 + Math.cos(tt * 3) * 2.5;
    const g = c.createRadialGradient(x, y, 0, x, y, 13);
    g.addColorStop(0, 'rgba(255,240,130,.85)'); g.addColorStop(1, 'rgba(255,240,130,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 13, 0, TAU); c.fill();
    dot(c, x, y, 2.4, '#fff7b3');
    ell(c, x - 2.5, y - 2.5, 2.6, 1.2, 'rgba(255,255,255,.7)', -0.6);
  } },
  { id: 'halo', name: trMark('Halo'), float: true, draw(c) {
    const g = c.createRadialGradient(0, -37, 4, 0, -37, 19);
    g.addColorStop(0, 'rgba(255,235,150,.4)'); g.addColorStop(1, 'rgba(255,235,150,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, -37, 19, 9, 0, 0, TAU); c.fill();
    c.strokeStyle = '#ffd75e'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(0, -37, 13, 4, 0, 0, TAU); c.stroke();
  } },
];

/* ---------- Cara (ojos en (1, 8) y (9, 8)) ---------- */
const FACES = [
  { id: 'glasses', name: trMark('Gafas'), draw(c) {
    c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.6;
    for (const x of [1, 9]) { c.fillStyle = 'rgba(200,230,255,.28)'; c.beginPath(); c.arc(x, 8, 5, 0, TAU); c.fill(); c.stroke(); }
    c.beginPath(); c.moveTo(6, 8); c.lineTo(4, 8); c.stroke();
    line(c, -4, 7, -9, 5, '#3a2a1a', 1.6);
  } },
  { id: 'shades', name: trMark('Gafas de sol'), draw(c) {
    c.fillStyle = '#16161a';
    for (const x of [1, 9]) { rr(c, x - 5.2, 4.2, 10.4, 7.6, 3.4); c.fill(); }
    line(c, 4.5, 6.5, 5.5, 6.5, '#16161a', 2);
    line(c, -4.2, 6, -9, 4, '#16161a', 1.8);
    ell(c, -1.5, 6.4, 2.2, 0.9, 'rgba(255,255,255,.45)', -0.5); ell(c, 6.5, 6.4, 2.2, 0.9, 'rgba(255,255,255,.45)', -0.5);
  } },
  { id: 'mustache', name: trMark('Bigote'), draw(c) {
    c.fillStyle = '#4a2c14';
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(5, 12.4); c.bezierCurveTo(5 + s * 4, 10.2, 5 + s * 9, 11.2, 5 + s * 9.4, 14.8); c.bezierCurveTo(5 + s * 6, 13.4, 5 + s * 3, 14.6, 5, 13.6); c.closePath(); c.fill();
    }
  } },
  { id: 'mask', name: trMark('Antifaz'), draw(c) {
    rr(c, -5, 3, 20, 10, 5); c.fillStyle = '#5b3fa0'; c.fill();
    for (const x of [1, 9]) { dot(c, x, 8, 3.2, '#fff'); dot(c, x, 8, 2.3, '#1b1b1b'); }
    line(c, -5, 7, -10, 5, '#5b3fa0', 2);
  } },
  { id: 'monocle', name: trMark('Monóculo'), draw(c) {
    c.strokeStyle = '#d9a520'; c.lineWidth = 1.8;
    c.fillStyle = 'rgba(200,230,255,.3)';
    c.beginPath(); c.arc(9, 8, 5.4, 0, TAU); c.fill(); c.stroke();
    c.lineWidth = 1; c.beginPath(); c.moveTo(12, 12.8); c.quadraticCurveTo(16, 17, 12, 21); c.stroke();
  } },
  { id: 'beard', name: trMark('Barba'), draw(c) {
    c.fillStyle = '#6b4423';
    c.beginPath(); c.moveTo(-10, 10); c.quadraticCurveTo(-11, 24, 0, 25); c.quadraticCurveTo(11, 24, 10, 10); c.quadraticCurveTo(5, 15, 0, 13.5); c.quadraticCurveTo(-5, 15, -10, 10); c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(-3, 18, 3, 5, 0.3, 0, TAU); c.fill();
  } },
  { id: 'eyepatch', name: trMark('Parche pirata'), draw(c) {
    line(c, -10, 3, 14, 5, '#1a1a1a', 1.6);
    ell(c, 1, 8, 4.8, 4.2, '#1a1a1a');
  } },
  { id: 'fangs', name: trMark('Colmillos'), draw(c) {
    line(c, 1, 12.6, 9, 12.6, '#2a1a1a', 1.6);
    c.fillStyle = '#fff';
    for (const x of [2.4, 7]) { c.beginPath(); c.moveTo(x - 1.5, 12.8); c.lineTo(x + 1.5, 12.8); c.lineTo(x, 16.4); c.closePath(); c.fill(); }
  } },
];

/* ---------- Espalda (se dibuja detrás del seta, por el lado de atrás) ---------- */
const BACKS = [
  { id: 'backpack', name: trMark('Mochila'), draw(c) {
    rr(c, -23, -1, 16, 21, 5); c.fillStyle = '#8b5a2b'; c.fill();
    rr(c, -23, -1, 16, 8, 4); c.fillStyle = '#6b4220'; c.fill();
    rr(c, -21, 10, 9, 7, 2); c.fillStyle = '#a7703a'; c.fill();
    dot(c, -15, 5, 1.6, '#f4c542');
    line(c, -8, 2, -3, 8, '#5a3818', 2);
  } },
  { id: 'fairy', name: trMark('Alas de hada'), draw(c, t) {
    const f = flap(t, 9);
    c.save(); c.translate(-9, 2); c.scale(1, f);
    for (const [x, y, rx, ry, rot] of [[-9, -10, 6, 17, -0.55], [-8, 8, 5, 11, 0.5]]) {
      ell(c, x, y, rx, ry, 'rgba(190,236,255,.62)', rot);
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.stroke();
    }
    c.restore();
  } },
  { id: 'butterfly', name: trMark('Alas de mariposa'), draw(c, t) {
    const f = flap(t, 8);
    c.save(); c.translate(-9, 3); c.scale(1, f);
    ell(c, -10, -9, 8, 14, '#ff9f45', -0.55); ell(c, -9, 9, 6, 9, '#ffb86b', 0.5);
    c.strokeStyle = '#2a1a12'; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(-10, -9, 8, 14, -0.55, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(-9, 9, 6, 9, 0.5, 0, TAU); c.stroke();
    dot(c, -12, -12, 2.4, '#2a1a12'); dot(c, -9, 10, 1.8, '#2a1a12');
    c.restore();
  } },
  { id: 'snail', name: trMark('Caparazón de caracol'), draw(c) {
    dot(c, -17, 7, 12, '#c98f5b');
    c.strokeStyle = '#8d5a2e'; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); for (let a = 0; a < 11; a += 0.35) { const r = 1.2 + a * 0.85; c.lineTo(-17 + Math.cos(a) * r, 7 + Math.sin(a) * r); } c.stroke();
    dot(c, -22, 1, 2, 'rgba(255,255,255,.3)');
  } },
  { id: 'cape', name: trMark('Capa'), draw(c, t) {
    const w = Math.sin((t || 0) * 5) * 1.5;
    c.fillStyle = '#c0392b';
    c.beginPath(); c.moveTo(-8, -3); c.quadraticCurveTo(-20, 0, -26 + w, 22); c.quadraticCurveTo(-16, 25 - w, -6, 21); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.18)';
    c.beginPath(); c.moveTo(-8, 3); c.quadraticCurveTo(-18, 8, -22 + w, 21); c.quadraticCurveTo(-14, 23, -7, 20); c.closePath(); c.fill();
  } },
  { id: 'fern', name: trMark('Helechos'), draw(c, t) {
    const sw = Math.sin((t || 0) * 2.4) * 0.05;
    for (const [a, len] of [[-2.55, 22], [-2.95, 24], [3.3, 21]]) {
      c.save(); c.translate(-10, 8); c.rotate(a + sw);
      ell(c, len / 2, 0, len / 2, 3.6, '#3f9b4a');
      line(c, 0, 0, len, 0, '#2c7a37', 1);
      c.restore();
    }
  } },
  { id: 'bat', name: trMark('Alas de murciélago'), draw(c, t) {
    const f = flap(t, 7);
    c.save(); c.translate(-8, 2); c.scale(1, f);
    c.fillStyle = '#3a2a55';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-10, -20); c.lineTo(-14, -9); c.lineTo(-20, -11); c.lineTo(-21, 2); c.lineTo(-16, 12); c.lineTo(-11, 8); c.lineTo(-6, 15); c.closePath(); c.fill();
    c.strokeStyle = '#241838'; c.lineWidth = 1.2;
    for (const [x, y] of [[-10, -20], [-20, -11], [-16, 12]]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(x, y); c.stroke(); }
    c.restore();
  } },
  { id: 'sack', name: trMark('Saco de esporas'), draw(c, t) {
    dot(c, -18, 9, 10.5, '#b98b4f');
    c.fillStyle = '#b98b4f'; c.beginPath(); c.moveTo(-23, 1); c.lineTo(-13, 1); c.lineTo(-15, -4); c.lineTo(-21, -4); c.closePath(); c.fill();
    line(c, -22, 0.5, -14, 0.5, '#6b4220', 2.2);
    dot(c, -21, 8, 1.2, '#8f6a36'); dot(c, -15, 13, 1.2, '#8f6a36');
    for (let i = 0; i < 3; i++) { const p = ((t || 0) * 0.6 + i / 3) % 1; c.globalAlpha = 1 - p; dot(c, -18 + Math.sin(i * 2 + p * 4) * 4, -5 - p * 14, 1.8, '#d6f5a0'); }
    c.globalAlpha = 1;
  } },
];

/* ---------- Trajes ----------
   Cubren solo la parte de abajo del pie (de y = 12 a 21, por debajo de los ojos) y, algunos, un detalle
   en el cuello: la cara y el pecho se siguen viendo. Se recortan a la forma del pie. */
const SUIT_TOP = 12;
const band = (c, fill, top = SUIT_TOP) => { c.fillStyle = fill; c.fillRect(-12, top, 24, 22 - top); };
const SUITS = [
  { id: 'overalls', name: trMark('Mono de jardinero'), draw(c) {
    c.save(); clipStem(c);
    band(c, '#3b6fb6');
    c.fillStyle = '#2d5890'; c.fillRect(-12, SUIT_TOP, 24, 1.6); // cinturilla
    rr(c, -7, 14.5, 7, 5, 1.4); c.fillStyle = '#2d5890'; c.fill(); // bolsillo
    c.fillStyle = '#f4c542'; c.fillRect(-1, 12.2, 2.4, 1.2); // hebilla
    line(c, -9.5, -2, -9.5, SUIT_TOP, '#3b6fb6', 2.6); // un tirante por el lado de atrás
    dot(c, -9.5, SUIT_TOP, 1.3, '#f4c542');
    c.restore();
  } },
  { id: 'knight', name: trMark('Armadura de caballero'), draw(c) {
    c.save(); clipStem(c);
    const g = c.createLinearGradient(-11, 0, 11, 0); g.addColorStop(0, '#8e99a3'); g.addColorStop(0.5, '#d3dae0'); g.addColorStop(1, '#8e99a3');
    c.fillStyle = g; c.fillRect(-12, SUIT_TOP, 24, 10);
    c.strokeStyle = 'rgba(60,70,80,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-12, 16.5); c.lineTo(12, 16.5); c.moveTo(0, SUIT_TOP); c.lineTo(0, 21); c.stroke();
    c.fillStyle = '#6b4220'; c.fillRect(-12, SUIT_TOP, 24, 2.4); dot(c, 0, SUIT_TOP + 1.2, 1.5, '#f4c542');
    rr(c, -12, -1, 24, 4, 2); c.fillStyle = g; c.fill(); // gorjal
    c.restore();
  } },
  { id: 'robe', name: trMark('Túnica de mago'), draw(c) {
    c.save(); clipStem(c);
    band(c, '#6a3fb0');
    c.fillStyle = '#f4c542'; c.fillRect(-12, SUIT_TOP, 24, 1.6); c.fillRect(-12, 19, 24, 2.4);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(-1, SUIT_TOP, 2, 9);
    star(c, -6, 16, 2.2, '#ffd75e'); star(c, 6.5, 15.4, 1.8, '#ffd75e');
    c.fillStyle = '#6a3fb0'; c.fillRect(-12, -1, 24, 3.4); c.fillStyle = '#f4c542'; c.fillRect(-12, 2, 24, 1.2); // cuello
    c.restore();
  } },
  { id: 'leaves', name: trMark('Traje de hojas'), draw(c) {
    c.save(); clipStem(c);
    const gs = ['#3f9b4a', '#58b957', '#2f7d3d', '#6fd46a'];
    for (let row = 0; row < 2; row++) for (let i = -2; i <= 2; i++) ell(c, i * 6 + (row % 2 ? 3 : 0), 14 + row * 4.4, 4.6, 2.9, gs[(row + i + 8) % 4], 0.3 * (i % 2 ? 1 : -1));
    for (let i = -2; i <= 2; i++) ell(c, i * 5.4, 1, 3.6, 2.3, gs[(i + 6) % 4], 0.4 * (i % 2 ? 1 : -1)); // collar de hojas
    c.restore();
  } },
  { id: 'stripes', name: trMark('Jersey de rayas'), draw(c) {
    c.save(); clipStem(c);
    for (let y = SUIT_TOP, i = 0; y < 22; y += 3.4, i++) { c.fillStyle = i % 2 ? '#f6f1e4' : '#d64545'; c.fillRect(-12, y, 24, 3.4); }
    c.fillStyle = '#d64545'; c.fillRect(-12, -1, 24, 3.4); // cuello de punto
    c.restore();
  } },
  { id: 'tuxedo', name: trMark('Esmoquin'), draw(c) {
    c.save(); clipStem(c);
    band(c, '#1d1d24');
    c.fillStyle = '#fafafa'; c.beginPath(); c.moveTo(-4, SUIT_TOP); c.lineTo(4, SUIT_TOP); c.lineTo(0, 17); c.closePath(); c.fill();
    dot(c, 0, 17.5, 0.9, '#9aa'); dot(c, 0, 20, 0.9, '#9aa');
    c.fillStyle = '#c0392b'; // pajarita
    c.beginPath(); c.moveTo(0, 1.4); c.lineTo(-5, -1.4); c.lineTo(-5, 4.2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0, 1.4); c.lineTo(5, -1.4); c.lineTo(5, 4.2); c.closePath(); c.fill();
    dot(c, 0, 1.4, 1.3, '#9b2c20');
    c.restore();
  } },
  { id: 'chef', name: trMark('Chaqueta de cocinero'), draw(c) {
    c.save(); clipStem(c);
    band(c, '#fbfbfb', 11);
    c.strokeStyle = '#cfd2d6'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 11); c.lineTo(0, 21); c.stroke();
    for (const y of [14, 18]) { dot(c, -3, y, 1.1, '#9aa2aa'); dot(c, 3, y, 1.1, '#9aa2aa'); }
    c.fillStyle = '#d64545'; c.beginPath(); c.moveTo(-6, -1); c.lineTo(6, -1); c.lineTo(0, 5); c.closePath(); c.fill(); // pañuelo
    c.restore();
  } },
  { id: 'bee', name: trMark('Traje de abeja'), draw(c) {
    c.save(); clipStem(c);
    band(c, '#f6c445');
    c.fillStyle = '#23201a'; for (const y of [SUIT_TOP + 1.2, 16.2]) c.fillRect(-12, y, 24, 2.6);
    c.fillStyle = '#23201a'; c.fillRect(-12, -1, 24, 2.4); // cuello rayado
    c.restore();
  } },
];

/* ---------- Otros (z: 'pre' = bajo el sombrero, 'post' = por encima de todo, en la mano) ---------- */
const OTHERS = [
  { id: 'scarf', name: trMark('Bufanda'), z: 'pre', draw(c) {
    rr(c, -12.5, -1, 25, 6.4, 3); c.fillStyle = '#d64545'; c.fill();
    c.fillStyle = '#f6f1e4'; for (const x of [-8, -1, 6]) c.fillRect(x, -0.6, 2.6, 5.6);
    rr(c, -11, 4, 6, 12, 2.4); c.fillStyle = '#d64545'; c.fill();
    c.fillStyle = '#f6f1e4'; c.fillRect(-11, 9, 6, 2.4);
  } },
  { id: 'lantern', name: trMark('Farol'), z: 'post', draw(c, t) {
    const fl = 0.8 + 0.2 * Math.sin((t || 0) * 9);
    const g = c.createRadialGradient(17, 15, 1, 17, 15, 20);
    g.addColorStop(0, `rgba(255,222,120,${0.6 * fl})`); g.addColorStop(1, 'rgba(255,222,120,0)');
    c.fillStyle = g; c.beginPath(); c.arc(17, 15, 20, 0, TAU); c.fill();
    line(c, 17, 2, 17, 9, '#5a4a3a', 1.4);
    rr(c, 12.5, 9, 9, 12, 2.2); c.fillStyle = '#e6b53a'; c.fill();
    rr(c, 14.2, 11.4, 5.6, 7.6, 1.4); c.fillStyle = `rgba(255,244,190,${fl})`; c.fill();
    c.fillStyle = '#5a4a3a'; c.fillRect(12, 8, 10, 2.4); c.fillRect(12, 20.2, 10, 2);
  } },
  { id: 'staff', name: trMark('Bastón mágico'), z: 'post', draw(c, t) {
    line(c, 19, 23, 19, -12, '#7a4a22', 3);
    const p = 0.7 + 0.3 * Math.sin((t || 0) * 4);
    const g = c.createRadialGradient(19, -17, 1, 19, -17, 11);
    g.addColorStop(0, `rgba(120,230,255,${0.7 * p})`); g.addColorStop(1, 'rgba(120,230,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(19, -17, 11, 0, TAU); c.fill();
    dot(c, 19, -17, 4.4, '#6fe3ff'); dot(c, 17.8, -18.2, 1.4, '#fff');
  } },
  { id: 'snailpet', name: trMark('Caracol mascota'), z: 'post', draw(c, t) {
    const b = Math.sin((t || 0) * 3) * 0.6;
    ell(c, 26, 19, 7, 2.8, '#d8c9a3');
    c.strokeStyle = '#d8c9a3'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(30, 17); c.lineTo(32, 12 + b); c.moveTo(28, 17); c.lineTo(28.5, 12.5 + b); c.stroke();
    dot(c, 23.5, 15.5, 5.2, '#c98f5b');
    c.strokeStyle = '#8d5a2e'; c.lineWidth = 1.1; c.beginPath(); for (let a = 0; a < 8; a += 0.4) { const r = 0.6 + a * 0.55; c.lineTo(23.5 + Math.cos(a) * r, 15.5 + Math.sin(a) * r); } c.stroke();
  } },
  { id: 'butterflypet', name: trMark('Mariposa amiga'), z: 'post', draw(c, t) {
    const tt = t || 0;
    const x = 22 + Math.sin(tt * 1.6) * 3, y = -12 + Math.cos(tt * 2.2) * 3;
    const f = 0.35 + 0.65 * Math.abs(Math.sin(tt * 11));
    ell(c, x - 3.2, y - 1.5, 3.6 * f, 4, '#6cc4ff', -0.4); ell(c, x + 3.2, y - 1.5, 3.6 * f, 4, '#6cc4ff', 0.4);
    ell(c, x - 2.6, y + 2.6, 2.4 * f, 3, '#4aa3e8', 0.3); ell(c, x + 2.6, y + 2.6, 2.4 * f, 3, '#4aa3e8', -0.3);
    line(c, x, y - 3, x, y + 4, '#23201a', 1.4);
  } },
  { id: 'medal', name: trMark('Medalla'), z: 'post', draw(c) {
    c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(-8, 10); c.lineTo(-5, 10); c.lineTo(-3, 15); c.lineTo(-6, 15); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(1, 10); c.lineTo(-2, 10); c.lineTo(-4, 15); c.lineTo(-1, 15); c.closePath(); c.fill();
    dot(c, -4, 17, 3.6, '#f4c542'); dot(c, -4, 17, 2, '#e0a912');
  } },
  { id: 'bouquet', name: trMark('Ramo de flores'), z: 'post', draw(c) {
    line(c, 14, 20, 17, 9, '#3f9b4a', 1.6); line(c, 14, 20, 21, 10, '#3f9b4a', 1.6); line(c, 14, 20, 13, 9, '#3f9b4a', 1.6);
    dot(c, 17, 7, 3.4, '#ff7ab6'); dot(c, 21.5, 8.5, 3, '#fff3b0'); dot(c, 12.8, 7.8, 3, '#c9a3ff');
    dot(c, 17, 7, 1.1, '#f4b400'); dot(c, 21.5, 8.5, 1, '#e8a31c'); dot(c, 12.8, 7.8, 1, '#f4b400');
  } },
  { id: 'sword', name: trMark('Espada de madera'), z: 'post', draw(c) {
    rr(c, 17.6, -9, 3.6, 22, 1.8); c.fillStyle = '#d7aa6a'; c.fill();
    c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(18.2, -7, 1, 18);
    rr(c, 13.5, 12, 11.6, 3, 1.4); c.fillStyle = '#7a4a22'; c.fill();
    rr(c, 17.6, 14.4, 3.6, 7, 1.6); c.fillStyle = '#5a3818'; c.fill();
  } },
];

/* ---------- Catálogo ---------- */
// zona de dibujo de cada categoría: 'back' detrás del seta · 'suit' sobre el pie · 'face' sobre los ojos ·
// 'top' sobre el sombrero (cabeza y sombreros) · los "otros" traen su propia z ('pre' o 'post')
export const CATEGORIES = [
  { id: 'color', name: trMark('Colores'), icon: '🎨' },
  { id: 'suit', name: trMark('Trajes'), icon: '👔', items: SUITS, zone: 'suit' },
  { id: 'hat', name: trMark('Sombreros'), icon: '🎩', items: HATS, zone: 'top' },
  { id: 'head', name: trMark('Cabeza'), icon: '🌸', items: HEADS, zone: 'top' },
  { id: 'face', name: trMark('Cara'), icon: '🕶️', items: FACES, zone: 'face' },
  { id: 'back', name: trMark('Espalda'), icon: '🎒', items: BACKS, zone: 'back' },
  { id: 'other', name: trMark('Otros'), icon: '✨', items: OTHERS, zone: 'post' },
];
export const LOOK_SLOTS = CATEGORIES.filter((c) => c.items).map((c) => c.id);
const BY_ID = new Map(CATEGORIES.filter((c) => c.items).map((c) => [c.id, new Map(c.items.map((i) => [i.id, i]))]));

export const itemOf = (slot, id) => (BY_ID.get(slot) || new Map()).get(id) || null;

// Deja solo lo que existe (los datos guardados o recibidos pueden ser viejos o inválidos).
export function cleanLook(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const slot of LOOK_SLOTS) if (itemOf(slot, raw[slot])) out[slot] = raw[slot];
  return out;
}
export const hasLook = (look) => !!look && LOOK_SLOTS.some((s) => look[s]);
export const sameLook = (a, b) => LOOK_SLOTS.every((s) => (a && a[s]) === (b && b[s]));

/* ---------- Dibujo de un aspecto ---------- */
// Capas, en el orden en que las llama drawShroom (ver render.js).
export function drawLookLayer(c, look, layer, t) {
  if (!look) return;
  const run = (item, lift = 0) => {
    c.save();
    if (lift) c.translate(0, -lift);
    try { item.draw(c, t); } catch (e) { /* un accesorio roto nunca debe romper el dibujo del juego */ }
    c.restore();
  };
  if (layer === 'back') { const it = itemOf('back', look.back); if (it) run(it); return; }
  if (layer === 'suit') { const it = itemOf('suit', look.suit); if (it) run(it); return; }
  if (layer === 'pre') { const it = itemOf('other', look.other); if (it && it.z === 'pre') run(it); return; }
  if (layer === 'top') {
    // la cabeza va debajo del sombrero; lo que flota (halo, antenas…) se sube lo que sobresale el sombrero
    const hat = itemOf('hat', look.hat);
    const head = itemOf('head', look.head);
    if (head) run(head, hat && head.float ? hat.h : 0);
    if (hat) run(hat);
    return;
  }
  if (layer === 'face') { const it = itemOf('face', look.face); if (it) run(it); return; }
  if (layer === 'post') { const it = itemOf('other', look.other); if (it && it.z === 'post') run(it); }
}
