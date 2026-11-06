/* Texturas de los muros y los techos de la primera persona. Cada estilo de muro del mapa (cabaña de
   troncos, cristal de invernadero, entramado, piedra, madera podrida, seto de bosque, seta…) se pinta
   una vez en un lienzo y se estira por la pared con coordenadas del mundo, para que las juntas casen
   entre celdas contiguas. */

import * as THREE from 'three';
import { tex, rnd } from './fp3dKit';

export const WALL_H = 130;
export const TILE_W = 128; // ancho en px del mapa que cubre una repetición de la textura

// alto de cada estilo (el seto del bosque es más alto; la valla, baja)
export const STYLE_H = { forest: 156, fence: 54 };
export const styleH = (s) => STYLE_H[s] || WALL_H;

const CAPS = { capRed: '#c0392b', capBlue: '#2a6ad0', capOrange: '#e08a2a', capViolet: '#7a4ad0' };

function grainy(c, w, h, n, a) {
  for (let i = 0; i < n; i++) {
    c.fillStyle = `rgba(${rnd(i) > 0.5 ? '255,255,255' : '0,0,0'},${a * rnd(i + 3)})`;
    c.fillRect(rnd(i + 1) * w, rnd(i + 2) * h, 1 + rnd(i + 5) * 2, 1 + rnd(i + 7) * 4);
  }
}

const DRAW = {
  // invernadero: panel de chapa verde abajo, cristales con marcos arriba
  glass(c, W, H) {
    const base = H * 0.34;
    c.fillStyle = '#2f4a3c'; c.fillRect(0, 0, W, H);
    // cristales (parte alta)
    const g = c.createLinearGradient(0, 0, 0, H - base);
    g.addColorStop(0, '#9fd0c4'); g.addColorStop(1, '#4e7f74');
    c.fillStyle = g; c.fillRect(0, 0, W, H - base);
    // vaho y siluetas de plantas tras el cristal
    c.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(rnd(i) * W, rnd(i + 9) * (H - base), 2 + rnd(i + 4) * 5, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(20,60,35,.38)';
    for (let i = 0; i < 7; i++) { const x = rnd(i + 20) * W, h = 30 + rnd(i + 22) * 60; c.beginPath(); c.ellipse(x, H - base - h / 2, 11 + rnd(i) * 10, h / 2, 0, 0, 7); c.fill(); }
    // marcos
    c.fillStyle = '#26382d';
    for (const x of [0, W / 3, (2 * W) / 3]) c.fillRect(x - 3, 0, 6, H - base);
    c.fillRect(0, (H - base) * 0.5 - 2, W, 4);
    c.fillRect(0, H - base - 5, W, 8);
    c.fillStyle = 'rgba(255,255,255,.16)';
    for (const x of [W * 0.08, W * 0.41, W * 0.74]) { c.fillRect(x, 6, 4, (H - base) * 0.4); }
    // chapa inferior con remaches
    const y0 = H - base;
    c.fillStyle = '#35564a'; c.fillRect(0, y0, W, base);
    for (let i = 0; i < 2; i++) { c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(0, y0 + 6 + i * (base / 2 - 4), W, 3); }
    c.fillStyle = 'rgba(255,255,255,.18)';
    for (let x = 8; x < W; x += 24) for (const y of [y0 + 12, y0 + base - 12]) { c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(80,120,60,.4)';
    for (let x = 0; x < W; x += 6) c.fillRect(x, H - 18 - rnd(x) * 14, 5, 22);
    c.fillStyle = '#1e2b24'; c.fillRect(0, H - 8, W, 8); // zócalo
    c.fillStyle = '#7b9a86'; c.fillRect(0, 0, W, 6); // tapa
  },
  // sala de espera: troncos verticales y ventanas con luz cálida
  cabin(c, W, H) {
    c.fillStyle = '#4a3220'; c.fillRect(0, 0, W, H);
    const n = 8, lw = W / n;
    for (let i = 0; i < n; i++) {
      const x = i * lw, hue = 22 + rnd(i) * 6, l = 24 + rnd(i + 3) * 8;
      const g = c.createLinearGradient(x, 0, x + lw, 0);
      g.addColorStop(0, `hsl(${hue} 42% ${l - 8}%)`); g.addColorStop(0.45, `hsl(${hue} 44% ${l + 6}%)`); g.addColorStop(1, `hsl(${hue} 40% ${l - 10}%)`);
      c.fillStyle = g; c.fillRect(x, 0, lw - 1, H);
      c.strokeStyle = 'rgba(30,16,6,.35)'; c.lineWidth = 1;
      for (let k = 0; k < 7; k++) { const y = rnd(i * 11 + k) * H; c.beginPath(); c.moveTo(x + 3 + rnd(k) * 6, y); c.lineTo(x + 3 + rnd(k) * 6, y + 14 + rnd(k + 5) * 30); c.stroke(); }
      if (rnd(i + 40) > 0.6) { c.fillStyle = 'rgba(20,10,4,.5)'; c.beginPath(); c.ellipse(x + lw / 2, rnd(i + 8) * H, 3, 5, 0, 0, 7); c.fill(); }
    }
    // ventana
    const wx = W * 0.28, wy = H * 0.28, ww = W * 0.44, wh = H * 0.34;
    c.fillStyle = '#24160c'; c.fillRect(wx - 7, wy - 7, ww + 14, wh + 14);
    const g = c.createLinearGradient(0, wy, 0, wy + wh);
    g.addColorStop(0, '#ffe3a0'); g.addColorStop(1, '#ffb45a');
    c.fillStyle = g; c.fillRect(wx, wy, ww, wh);
    c.fillStyle = '#24160c'; c.fillRect(wx + ww / 2 - 2, wy, 4, wh); c.fillRect(wx, wy + wh / 2 - 2, ww, 4);
    c.fillStyle = 'rgba(80,40,10,.4)'; c.fillRect(wx + 6, wy + wh * 0.6, 14, wh * 0.4);
    c.fillStyle = '#6b4a2f'; c.fillRect(wx - 10, wy + wh + 6, ww + 20, 6);
    c.fillStyle = '#2a1a0e'; c.fillRect(0, H - 10, W, 10); c.fillRect(0, 0, W, 8);
  },
  // casa de entramado: yeso, vigas oscuras y zócalo de piedra
  timber(c, W, H) {
    c.fillStyle = '#d8c9a3'; c.fillRect(0, 0, W, H);
    grainy(c, W, H, 500, 0.08);
    const base = H * 0.2;
    c.fillStyle = '#7d838b'; c.fillRect(0, H - base, W, base);
    c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2;
    for (let r = 0; r < 2; r++) for (let x = (r % 2) * 20; x < W; x += 40) c.strokeRect(x, H - base + r * (base / 2), 40, base / 2);
    c.fillStyle = '#4a3322';
    for (const x of [0, W / 2]) c.fillRect(x - 5, 0, 10, H - base);
    c.fillRect(0, 0, W, 12); c.fillRect(0, H * 0.42, W, 9); c.fillRect(0, H - base - 8, W, 9);
    c.strokeStyle = '#4a3322'; c.lineWidth = 8;
    c.beginPath(); c.moveTo(6, H * 0.42 + 8); c.lineTo(W / 2 - 6, 12); c.moveTo(W - 6, H * 0.42 + 8); c.lineTo(W / 2 + 6, 12); c.stroke();
    // ventanita con postigos
    const wx = W * 0.18, wy = H * 0.5, ww = W * 0.2, wh = H * 0.2;
    c.fillStyle = '#2a1a0e'; c.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
    c.fillStyle = '#ffd98a'; c.fillRect(wx, wy, ww, wh);
    c.fillStyle = '#2a1a0e'; c.fillRect(wx + ww / 2 - 1, wy, 2, wh);
    c.fillStyle = '#5a7a4a'; c.fillRect(wx - 12, wy, 8, wh); c.fillRect(wx + ww + 4, wy, 8, wh);
    c.fillStyle = '#4a3322'; c.fillRect(0, 0, W, 8);
  },
  // sillar
  rock(c, W, H) {
    c.fillStyle = '#6b7078'; c.fillRect(0, 0, W, H);
    const rows = 6, rh = H / rows;
    for (let r = 0; r < rows; r++) {
      let x = -((r * 37) % 40);
      while (x < W) {
        const bw = 36 + rnd(r * 17 + x) * 34;
        const l = 38 + rnd(r * 5 + x * 3) * 16;
        const g = c.createLinearGradient(0, r * rh, 0, (r + 1) * rh);
        g.addColorStop(0, `hsl(215 6% ${l + 8}%)`); g.addColorStop(1, `hsl(215 6% ${l - 8}%)`);
        c.fillStyle = g; c.fillRect(x + 2, r * rh + 2, bw - 4, rh - 4);
        x += bw;
      }
    }
    for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(80,140,70,${0.15 + rnd(i) * 0.25})`; c.beginPath(); c.ellipse(rnd(i + 2) * W, H - rnd(i + 9) * H * 0.5, 8 + rnd(i) * 14, 4 + rnd(i + 1) * 8, 0, 0, 7); c.fill(); }
    c.fillStyle = '#4a7a40'; c.fillRect(0, 0, W, 5);
  },
  // tablones podridos del pantano
  rot(c, W, H) {
    c.fillStyle = '#1c1f1a'; c.fillRect(0, 0, W, H);
    const n = 7, pw = W / n;
    for (let i = 0; i < n; i++) {
      const l = 17 + rnd(i) * 9;
      const g = c.createLinearGradient(i * pw, 0, i * pw + pw, 0);
      g.addColorStop(0, `hsl(85 16% ${l - 4}%)`); g.addColorStop(0.5, `hsl(80 18% ${l + 3}%)`); g.addColorStop(1, `hsl(85 14% ${l - 5}%)`);
      c.fillStyle = g; c.fillRect(i * pw + 1, rnd(i + 5) * 10, pw - 2, H);
      c.strokeStyle = 'rgba(0,0,0,.45)';
      for (let k = 0; k < 5; k++) { const y = rnd(i * 9 + k) * H; c.beginPath(); c.moveTo(i * pw + 5, y); c.lineTo(i * pw + 5 + rnd(k) * 6, y + 10 + rnd(k + 2) * 40); c.stroke(); }
    }
    c.fillStyle = 'rgba(88,130,60,.55)';
    for (let i = 0; i < 30; i++) { const x = rnd(i + 7) * W; c.fillRect(x, 0, 3 + rnd(i) * 3, 20 + rnd(i + 3) * H * 0.45); }
    for (let i = 0; i < 24; i++) { c.fillStyle = `rgba(110,170,80,${0.2 + rnd(i) * 0.3})`; c.beginPath(); c.ellipse(rnd(i + 3) * W, H - rnd(i + 11) * 40, 10 + rnd(i) * 14, 6, 0, 0, 7); c.fill(); }
    c.fillStyle = '#2a2e24'; c.fillRect(0, 0, W, 6);
  },
  // pared de luz: hongos fosforescentes
  glow(c, W, H) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3a2a6a'); g.addColorStop(1, '#161a3a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) {
      const x = rnd(i) * W, y = rnd(i + 3) * H, r = 3 + rnd(i + 5) * 9;
      const rg = c.createRadialGradient(x, y, 0, x, y, r * 3);
      rg.addColorStop(0, 'rgba(160,255,230,.95)'); rg.addColorStop(0.35, 'rgba(110,220,230,.5)'); rg.addColorStop(1, 'rgba(110,220,230,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(x, y, r * 3, 0, 7); c.fill();
    }
    c.fillStyle = '#6a4ad0'; c.fillRect(0, 0, W, 6);
  },
  // seta gigante: pie de seta con aro de sombrero de color
  stalk(c, W, H, col = '#c0392b') {
    const g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#d8c9a0'); g.addColorStop(0.5, '#f1e6c6'); g.addColorStop(1, '#cbb98c');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(120,96,56,.3)'; c.lineWidth = 2;
    for (let x = 6; x < W; x += 14) { c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 4, H * 0.3, x - 4, H * 0.6, x + 2, H); c.stroke(); }
    c.fillStyle = 'rgba(140,110,60,.22)';
    for (let i = 0; i < 20; i++) { c.beginPath(); c.ellipse(rnd(i) * W, rnd(i + 5) * H, 3 + rnd(i) * 4, 2 + rnd(i + 2) * 3, 0, 0, 7); c.fill(); }
    // puerta/ventana redonda
    c.fillStyle = '#4a3322'; c.beginPath(); c.arc(W * 0.5, H * 0.58, 22, 0, 7); c.fill();
    c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(W * 0.5, H * 0.58, 16, 0, 7); c.fill();
    c.fillStyle = '#4a3322'; c.fillRect(W * 0.5 - 1.5, H * 0.58 - 16, 3, 32); c.fillRect(W * 0.5 - 16, H * 0.58 - 1.5, 32, 3);
    // sombrero (borde superior)
    const cg = c.createLinearGradient(0, 0, 0, H * 0.26);
    cg.addColorStop(0, col); cg.addColorStop(1, '#00000055');
    c.fillStyle = col; c.fillRect(0, 0, W, H * 0.22);
    c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(0, H * 0.2, W, H * 0.03);
    c.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(rnd(i + 30) * W, rnd(i + 31) * H * 0.18 + 6, 4 + rnd(i) * 4, 0, 7); c.fill(); }
    c.fillStyle = col; c.fillRect(0, 0, W, 5);
  },
  // arboleda: follaje oscuro y troncos
  forest(c, W, H) {
    c.fillStyle = '#16301c'; c.fillRect(0, 0, W, H);
    for (const x of [W * 0.15, W * 0.62]) {
      const g = c.createLinearGradient(x, 0, x + 26, 0);
      g.addColorStop(0, '#2e2218'); g.addColorStop(0.5, '#4a3826'); g.addColorStop(1, '#241a12');
      c.fillStyle = g; c.fillRect(x, H * 0.3, 24, H);
    }
    for (let i = 0; i < 160; i++) {
      const x = rnd(i) * W, y = rnd(i + 7) * H * (0.2 + 0.8 * rnd(i + 2)), r = 6 + rnd(i + 3) * 14;
      const l = 14 + rnd(i + 4) * 20;
      c.fillStyle = `hsl(${105 + rnd(i + 8) * 40} 42% ${l}%)`;
      c.beginPath(); c.ellipse(x, y, r, r * 0.8, rnd(i) * 3, 0, 7); c.fill();
    }
    const g2 = c.createLinearGradient(0, 0, 0, H);
    g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.5)');
    c.fillStyle = g2; c.fillRect(0, 0, W, H);
    c.fillStyle = '#2f5a30'; c.fillRect(0, 0, W, 6);
  },
  // valla: estacas con huecos (el hueco es transparente)
  fence(c, W, H) {
    c.clearRect(0, 0, W, H);
    const n = 8, pw = W / n;
    for (let i = 0; i < n; i++) {
      const g = c.createLinearGradient(i * pw, 0, i * pw + pw, 0);
      g.addColorStop(0, '#6b4a2f'); g.addColorStop(0.5, '#9a7648'); g.addColorStop(1, '#5a3d26');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(i * pw + 3, H); c.lineTo(i * pw + 3, 28 + rnd(i) * 10); c.lineTo(i * pw + pw / 2 - 1, 8 + rnd(i + 2) * 6); c.lineTo(i * pw + pw - 3, 28 + rnd(i) * 10); c.lineTo(i * pw + pw - 3, H); c.fill();
    }
    c.fillStyle = '#4a3322'; c.fillRect(0, H * 0.42, W, 12); c.fillRect(0, H * 0.74, W, 12);
  },
};

const STYLE_TEX = { glass: 'glass', cabin: 'cabin', timber: 'timber', rock: 'rock', rot: 'rot', glow: 'glow', forest: 'forest', fence: 'fence' };
const mats = new Map();

/* material de muro de un estilo: la textura se reparte por coordenadas del mundo */
export function wallMaterial(style) {
  let m = mats.get(style);
  if (m) return m;
  const cap = CAPS[style];
  const key = cap ? 'stalk' : STYLE_TEX[style] || 'rock';
  const t = tex(`wall:${style}`, 256, 256, (c, W, H) => DRAW[key](c, W, H, cap), { repeat: true });
  const fence = key === 'fence';
  m = new THREE.MeshLambertMaterial({ map: t, color: 0xffffff, alphaTest: fence ? 0.5 : 0, side: fence ? THREE.DoubleSide : THREE.FrontSide });
  const h = styleH(style);
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
#ifdef USE_INSTANCING
      vec4 wpos4 = modelMatrix * instanceMatrix * vec4(position, 1.0);
#else
      vec4 wpos4 = modelMatrix * vec4(position, 1.0);
#endif
      vec3 an = abs(normal);
      float uu = an.x > 0.5 ? wpos4.z : wpos4.x;
      vMapUv = an.y > 0.5 ? vec2(0.5, 0.995) : vec2(uu / ${TILE_W.toFixed(1)}, clamp(wpos4.y / ${h.toFixed(1)}, 0.0, 0.999));`);
  };
  m.customProgramCacheKey = () => `wall${style}`;
  mats.set(style, m);
  return m;
}

/* techo de las salas cerradas: cristal con vigas (invernadero) o tablas con vigas (cabaña) */
export function roofMaterial(kind) {
  const t = tex(`roof:${kind}`, 256, 256, (c, W, H) => {
    if (kind === 'glass') {
      c.fillStyle = '#16251c'; c.fillRect(0, 0, W, H);
      const g = c.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#2c5a4a'); g.addColorStop(1, '#1c3c32');
      c.fillStyle = g; c.fillRect(8, 8, W - 16, H - 16);
      c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(14, 14, 20, H - 28);
      c.fillStyle = '#0d1812'; c.fillRect(W / 2 - 3, 0, 6, H); c.fillRect(0, H / 2 - 3, W, 6);
    } else {
      c.fillStyle = '#34220f'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#3d2a16' : '#47321b'; c.fillRect(0, i * (H / 6), W, H / 6 - 2); }
      c.fillStyle = '#2a1a0c'; c.fillRect(0, 0, 18, H);
    }
  }, { repeat: true, repeatY: true });
  t.repeat.set(1, 1);
  return t;
}

export function skyTexture(top, bottom, stars = false) {
  return tex(`sky:${top}|${bottom}|${stars}`, 8, 256, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); g.addColorStop(0.55, bottom); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
}

export function disposeWalls() {
  for (const m of mats.values()) m.dispose();
  mats.clear();
}
