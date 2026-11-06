/* Modelos 3D de los objetos del mapa y de las tareas para la primera persona.
   Cada función recibe el tamaño de la huella (w × d, en px del mapa) y devuelve un grupo centrado en
   ella. Se montan con formas básicas, pero con sus partes (patas, tapas, aros, pantallas…) para que
   no sean cubos sin más. Lo que se mueve lleva `userData.tick(T)`. */

import * as THREE from 'three';
import {
  bx, cy, cone, sp, ico, dome, tor, lathe, tube, halo, blob, mat, glowMat, glass, shade, mix, rnd, tex,
} from './fp3dKit';

const WOOD = '#8a6a45', DWOOD = '#5e4630', LWOOD = '#b08a5a', METAL = '#6c7480', DMETAL = '#3a4048', STONE = '#8a8f95';

const woodTex = () => tex('wood', 128, 64, (c, w, h) => {
  c.fillStyle = '#9a7648'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) {
    c.fillStyle = i % 2 ? 'rgba(60,35,15,.18)' : 'rgba(255,230,180,.08)';
    c.fillRect(0, i * (h / 8), w, h / 8 - 1);
  }
  c.strokeStyle = 'rgba(50,30,10,.35)'; c.lineWidth = 1;
  for (let i = 0; i < 26; i++) { const y = rnd(i) * h, x = rnd(i + 9) * w; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18 + rnd(i + 3) * 26, y + (rnd(i + 5) - 0.5) * 3); c.stroke(); }
}, { repeat: true });
const woodMat = (tint = '#ffffff') => mat(tint, { map: woodTex() });

const stoneTex = () => tex('stone', 128, 128, (c, w, h) => {
  c.fillStyle = '#7d838b'; c.fillRect(0, 0, w, h);
  for (let r = 0; r < 4; r++) {
    let x = (r % 2) * -16;
    while (x < w) {
      const bw = 28 + rnd(r * 13 + x) * 22;
      c.fillStyle = `hsl(210 6% ${44 + rnd(x + r * 7) * 18}%)`;
      c.fillRect(x + 1, r * 32 + 1, bw - 2, 30);
      x += bw;
    }
  }
}, { repeat: true });
const stoneMat = (tint = '#ffffff') => mat(tint, { map: stoneTex() });

function leg4(g, w, d, h, t, col, y = 0) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, t, h, t, col, sx * (w / 2 - t / 2), y, sz * (d / 2 - t / 2));
}

/* ---------------- objetos del mapa ---------------- */

const OBST = {
  crate(g, w, d, s) {
    const h = Math.min(46, Math.max(28, Math.min(w, d) * 0.85));
    bx(g, w, h, d, woodMat(), 0, 0, 0);
    // listones: marco por las cuatro esquinas y cruz en las caras
    const t = 5;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, t, h + 1, t, DWOOD, sx * (w / 2 - t / 2 + 0.3), 0, sz * (d / 2 - t / 2 + 0.3));
    bx(g, w + 1, 4, d + 1, DWOOD, 0, 0, 0); bx(g, w + 1, 4, d + 1, DWOOD, 0, h - 4, 0);
    const dg = Math.atan2(h, w);
    for (const sz of [-1, 1]) { const b = bx(g, Math.hypot(w, h) * 0.86, 3, 1.5, DWOOD, 0, h / 2, sz * (d / 2 + 0.4)); b.rotation.z = dg; }
    if (s % 3 === 0) bx(g, w * 0.5, 3, d * 0.5, '#d9c9a0', w * 0.1, h, 0); // un paño encima
  },
  barrel(g, w, d, s) {
    const r = Math.min(w, d) / 2, h = Math.min(52, r * 2.1);
    const body = [[r * 0.82, 0], [r * 0.96, h * 0.2], [r, h * 0.5], [r * 0.96, h * 0.8], [r * 0.82, h]];
    lathe(g, body, woodMat());
    cy(g, r * 0.8, r * 0.8, 1.5, '#4a3320', 0, h - 0.2, 0);
    for (const k of [0.16, 0.84]) tor(g, r * (0.82 + 0.16 * (1 - Math.abs(k - 0.5) * 2)) + 0.5, 1.6, DMETAL, 0, h * k, 0, Math.PI / 2);
    if (s % 2) cy(g, r * 0.7, r * 0.7, 1, '#2a6a8a', 0, h + 0.1, 0); // agua / tapa
  },
  sack(g, w, d, s) {
    const n = Math.max(1, Math.min(3, Math.round(w / 34)));
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * (w / n), c = i % 2 ? '#cdb88f' : '#bfa97a';
      sp(g, Math.min(w / n, d) * 0.5, c, x, 12, 0, 1, 0.72, 0.9);
      cone(g, 4, 9, c, x, 22, 0, 8);
      tor(g, 3.4, 0.9, '#6b4a2f', x, 22, 0, Math.PI / 2, 10);
    }
  },
  lamp(g, w, d) {
    // lámpara de cultivo UV: pórtico con tres tubos violeta colgando
    const H = 86;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      cy(g, 2.6, 3, H, '#59616d', sx * (w / 2 - 6), 0, sz * (d / 2 - 8), 8);
      cy(g, 6, 7, 3, DMETAL, sx * (w / 2 - 6), 0, sz * (d / 2 - 8), 10);
    }
    for (const sx of [-1, 1]) bx(g, 5, 5, d - 10, '#59616d', sx * (w / 2 - 6), H, 0);
    bx(g, w - 8, 5, 5, '#59616d', 0, H, -d / 2 + 8); bx(g, w - 8, 5, 5, '#59616d', 0, H, d / 2 - 8);
    for (let i = -1; i <= 1; i++) {
      bx(g, 6, 4, d - 22, DMETAL, i * (w / 4), H - 6, 0);
      bx(g, 3.6, 3.6, d - 26, glowMat('#c77dff'), i * (w / 4), H - 10, 0);
    }
    halo(g, '#c77dff', 190, 0, H - 14, 0, 0.55);
    halo(g, '#c77dff', 120, 0, H - 14, d * 0.28, 0.35);
    halo(g, '#c77dff', 120, 0, H - 14, -d * 0.28, 0.35);
  },
  tank(g, w, d) {
    const r = Math.min(w, d) / 2;
    lathe(g, [[r * 0.95, 0], [r, 8], [r, 62], [r * 0.9, 74], [r * 0.45, 80]], mat('#6b8a99'));
    for (const y of [14, 36, 58]) tor(g, r + 0.4, 1.8, DMETAL, 0, y, 0, Math.PI / 2, 24);
    bx(g, 5, 44, 2, '#cfe8f5', r * 0.94, 16, 0);
    cy(g, 3, 3, 8, '#b08a3a', r + 3, 10, 0, 8).rotation.z = Math.PI / 2;
    for (let i = 0; i < 6; i++) bx(g, 2, 3, 12, DMETAL, -r * 0.7, 6 + i * 11, 0); // escalera
  },
  machine(g, w, d, s) {
    const h = 58;
    bx(g, w, h, d, '#7b8794', 0, 4, 0);
    bx(g, w + 3, 6, d + 3, DMETAL, 0, 0, 0);
    bx(g, w + 2, 3, d + 2, '#59616d', 0, h + 4, 0);
    // frente (+z): pantalla, mandos y rejilla
    bx(g, w * 0.55, h * 0.3, 1.6, '#1e2a33', 0, h * 0.52, d / 2 + 0.4);
    bx(g, w * 0.5, h * 0.24, 1, glowMat('#6fe3ff'), 0, h * 0.55, d / 2 + 1.2);
    for (let i = 0; i < 3; i++) cy(g, 2.6, 2.6, 3, i === 1 ? glowMat('#4ade80') : glowMat('#e63946'), -w * 0.3 + i * 9, h * 0.22, d / 2 + 1.4, 8).rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) bx(g, w * 0.7, 1.5, 1, DMETAL, 0, h * 0.9 - i * 3.2, d / 2 + 0.6);
    // costados y espalda: rejillas de ventilación y paneles atornillados
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 5; i++) bx(g, 1, 2, d * 0.6, DMETAL, sx * (w / 2 + 0.3), h * 0.7 - i * 5, 0);
      bx(g, 1, h * 0.28, d * 0.7, '#6a7480', sx * (w / 2 + 0.2), 10, 0);
    }
    for (let i = 0; i < 4; i++) bx(g, w * 0.6, 2, 1, DMETAL, 0, h * 0.72 - i * 6, -d / 2 - 0.3);
    cy(g, 4, 4, 18, METAL, w * 0.28, h + 7, -d * 0.2);
    cy(g, 5.4, 5.4, 3, DMETAL, w * 0.28, h + 25, -d * 0.2);
    tube(g, [[-w * 0.3, h + 7, d * 0.1], [-w * 0.3, h + 20, d * 0.1], [w * 0.1, h + 22, -d * 0.2]], 2, '#2b3038', 10);
    const l = sp(g, 3, glowMat('#ff4d5e'), -w * 0.38, h + 10, d * 0.3);
    l.userData.tick = (T) => { l.visible = Math.sin(T * 5 + s) > -0.2; };
  },
  beds(g, w, d, s) {
    bx(g, w, 14, d, DWOOD, 0, 0, 0);
    bx(g, w - 8, 3, d - 8, '#3a2a1c', 0, 13, 0);
    const nx = Math.max(2, Math.round(w / 18)), nz = Math.max(1, Math.round(d / 22));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = (i + 0.5) * (w - 14) / nx - (w - 14) / 2, z = (j + 0.5) * (d - 14) / nz - (d - 14) / 2;
      const h = 12 + rnd(s + i * 7 + j) * 12;
      cy(g, 0.8, 1, h, '#3f8f4a', x, 16, z, 5);
      cone(g, 6, 10, mix('#4aa85a', '#8fd96a', rnd(i + j * 3)), x, 16 + h, z, 7);
    }
  },
  pipe(g, w, d) {
    const r = 6;
    const a = cy(g, r, r, w, '#8a6f4a', 0, r, 0, 12); a.rotation.z = Math.PI / 2; a.position.set(0, r + 12, 0);
    for (const x of [-w / 2 + 6, 0, w / 2 - 6]) cy(g, 2.2, 2.2, 12, DMETAL, x, 0, 0, 6);
    for (const x of [-w / 2, w / 2]) { const f = cy(g, r + 2, r + 2, 3, DMETAL, x, 0, 0, 12); f.rotation.z = Math.PI / 2; f.position.set(x, r + 12, 0); }
    cy(g, 8, 8, 8, '#b02a3a', 0, 0, 0, 10).position.y = r + 12 + 9; // llave de paso
  },
  freezer(g, w, d) {
    const h = 64;
    bx(g, w, h, d, '#dbe7ee', 0, 0, 0);
    bx(g, w - 4, 4, d - 4, '#9fb4c0', 0, h, 0);
    bx(g, w * 0.9, 1.5, 1, '#8aa0ad', 0, h * 0.5, d / 2 + 0.6);
    bx(g, 3, 26, 3, '#4a5a66', w * 0.38, h * 0.55, d / 2 + 2);
    bx(g, w * 0.3, 5, 1, glowMat('#6fe3ff'), -w * 0.2, h * 0.85, d / 2 + 0.6);
    halo(g, '#8fe3ff', 70, 0, h + 8, 0, 0.35);
    // espalda y costados: rejillas del compresor
    for (let i = 0; i < 6; i++) bx(g, w * 0.7, 2, 1, '#8aa0ad', 0, h * 0.2 + i * 4.5, -d / 2 - 0.5);
    for (const sx of [-1, 1]) { bx(g, 1, h * 0.7, d * 0.7, '#c5d4dc', sx * (w / 2 + 0.4), 8, 0); bx(g, 1, 1.5, d * 0.8, '#8aa0ad', sx * (w / 2 + 0.9), h * 0.5, 0); }
    cy(g, 7, 7, 3, '#4a5a66', -w * 0.25, h, -d * 0.2, 14);
  },
  compost(g, w, d, s) {
    const h = 30;
    for (const sz of [-1, 1]) bx(g, w, h, 3, woodMat(), 0, 0, sz * (d / 2 - 1.5));
    for (const sx of [-1, 1]) bx(g, 3, h, d, woodMat(), sx * (w / 2 - 1.5), 0, 0);
    ico(g, Math.min(w, d) * 0.42, '#3b2a1c', 0, h - 4, 0, 1.1, 0.5, 1, 1);
    for (let i = 0; i < 5; i++) ico(g, 4, ['#6a8f3a', '#c9a23a', '#9a3a2a'][i % 3], (rnd(s + i) - 0.5) * w * 0.6, h + 1, (rnd(s + i + 7) - 0.5) * d * 0.5, 1, 0.6, 1, 0);
  },
  table(g, w, d) {
    const h = 34;
    bx(g, w, 5, d, woodMat(), 0, h - 5, 0);
    leg4(g, w - 4, d - 4, h - 5, 5, DWOOD);
    bx(g, w - 14, 2, 3, DWOOD, 0, 6, 0);
  },
  bench(g, w, d) {
    const h = 24;
    bx(g, w, 4, d * 0.7, woodMat(), 0, h - 4, 0);
    for (const sx of [-1, 1]) { bx(g, 4, h - 4, d * 0.65, DWOOD, sx * (w / 2 - 6), 0, 0); }
    bx(g, w - 12, 3, 3, DWOOD, 0, 8, 0);
    if (d > 24) bx(g, w, 14, 3, woodMat(), 0, h + 4, -d * 0.3); // respaldo
  },
  shelf(g, w, d, s) {
    const H = 78, tt = 3;
    const alongX = w >= d;
    const L = alongX ? w : d, T = alongX ? d : w;
    const grp = new THREE.Group();
    for (const sx of [-1, 1]) bx(grp, tt * 1.4, H, T, DWOOD, sx * (L / 2 - tt * 0.7), 0, 0);
    for (let k = 0; k < 4; k++) {
      const y = 2 + k * (H - 6) / 3;
      bx(grp, L, tt, T, woodMat(), 0, y, 0);
      if (k < 3) {
        const n = Math.max(2, Math.round(L / 20));
        for (let i = 0; i < n; i++) {
          const x = (i + 0.5) * L / n - L / 2, r = rnd(s + k * 9 + i);
          const col = ['#c9a23a', '#8a5a2a', '#4a8a5a', '#b04a4a', '#4a7aa8'][Math.floor(r * 5)];
          if (r > 0.5) bx(grp, L / n * 0.7, 8 + r * 8, T * 0.6, col, x, y + tt, 0);
          else cy(grp, 4, 4.5, 8 + r * 10, col, x, y + tt, 0, 8);
        }
      }
    }
    if (!alongX) grp.rotation.y = Math.PI / 2;
    g.add(grp);
  },
  fan(g, w, d) {
    const r = Math.min(w, d) / 2;
    bx(g, r * 2, r * 2, 5, DMETAL, 0, 6, 0);
    tor(g, r * 0.85, 2.2, METAL, 0, 6 + r, 3, 0, 20);
    const bl = new THREE.Group(); bl.position.set(0, 6 + r, 3);
    for (let i = 0; i < 4; i++) { const b = bx(bl, r * 0.75, 2, 6, '#9aa4ae', 0, 0, 0); b.position.set(Math.cos(i * 1.57) * r * 0.38, Math.sin(i * 1.57) * r * 0.38, 0); b.rotation.z = i * 1.57; }
    g.add(bl);
    bl.userData.tick = (T) => { bl.rotation.z = T * 6; };
    bx(g, 14, 12, 12, DMETAL, 0, 0, 0);
  },
  pot(g, w, d, s) {
    const n = Math.max(2, Math.round(w / 26));
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * w / n - w / 2;
      lathe(g, [[7, 0], [10, 14], [11, 16]], '#b5653a', x, 0, 0, 12);
      ico(g, 11, '#3f8f4a', x, 26, 0, 1, 1, 1, 1);
      if (rnd(s + i) > 0.5) sp(g, 2.5, '#f2c14e', x + 3, 33, 2);
    }
  },
  bush(g, w, d, s) {
    const r = Math.min(w, d) / 2;
    for (let i = 0; i < 5; i++) ico(g, r * (0.45 + rnd(s + i) * 0.25), mix('#2f7a3a', '#5aa04a', rnd(s + i * 3)), (rnd(i + s) - 0.5) * r, r * 0.4 + rnd(i * 5 + s) * r * 0.4, (rnd(i * 7 + s) - 0.5) * r, 1, 0.85, 1, 1);
  },
  rock(g, w, d, s) {
    const r = Math.min(w, d) / 2;
    ico(g, r, '#7c8088', 0, r * 0.55, 0, 1, 0.65, 0.9, 1);
    ico(g, r * 0.55, '#8a8f95', r * 0.5, r * 0.3, r * 0.2, 1, 0.7, 1, 1);
    ico(g, r * 0.5, '#4f7a3f', -r * 0.1, r * 0.95, 0, 1, 0.35, 1, 0); // musgo
  },
  shrooms(g, w, d, s) {
    for (let i = 0; i < 5; i++) {
      const x = (rnd(s + i) - 0.5) * w * 0.7, z = (rnd(s + i * 3) - 0.5) * d * 0.7, hh = 14 + rnd(i + s) * 16;
      mush(g, 5 + rnd(i * 2 + s) * 4, hh, ['#e8c7a0', '#d9a441', '#c46a4a'][i % 3], x, z, false);
    }
  },
  legacy(g, w, d, s) { OBST.crate(g, w, d, s); },

  // ---- sala de espera ----
  computer(g, w, d) {
    bx(g, w, 6, d, woodMat(), 0, 34, 0);
    leg4(g, w - 8, d - 8, 34, 6, DWOOD);
    bx(g, w * 0.62, 30, 4, '#1e2a33', 0, 40, -d * 0.1);
    bx(g, w * 0.56, 24, 1, glowMat('#7ee0ff'), 0, 43, -d * 0.1 + 2.6);
    bx(g, 4, 8, 6, DMETAL, 0, 40, -d * 0.1);
    bx(g, w * 0.5, 2, 12, '#2a2f36', 0, 40, d * 0.22);
    halo(g, '#7ee0ff', 120, 0, 56, 0, 0.35);
  },
  wardrobe(g, w, d) {
    const h = 110;
    bx(g, w, h, d, '#7a5a3a', 0, 0, 0);
    bx(g, w + 6, 6, d + 4, DWOOD, 0, h, 0);
    bx(g, w + 2, 6, d + 2, DWOOD, 0, 0, 0);
    for (const sx of [-1, 1]) {
      bx(g, w / 2 - 6, h - 22, 2, '#946d44', sx * (w / 4), 10, d / 2 + 0.8);
      bx(g, w / 2 - 16, h - 36, 1.2, '#7a5a3a', sx * (w / 4), 17, d / 2 + 1.8);
      sp(g, 2.6, '#e9c46a', sx * 5, h * 0.5, d / 2 + 3);
    }
    halo(g, '#e9c46a', 90, 0, h * 0.6, d / 2 + 6, 0.25);
  },
  planter(g, w, d, s) {
    bx(g, w, 18, d, '#8a6a45', 0, 0, 0);
    bx(g, w - 6, 3, d - 6, '#3a2a1c', 0, 18, 0);
    for (let i = 0; i < 4; i++) ico(g, Math.min(w, d) * 0.28, mix('#2f7a3a', '#5aa04a', rnd(i + s)), (rnd(i + s) - 0.5) * w * 0.5, 30, (rnd(i * 3 + s) - 0.5) * d * 0.5, 1, 0.9, 1, 1);
    for (let i = 0; i < 4; i++) sp(g, 2.6, ['#e63946', '#f2c14e', '#ffffff'][i % 3], (rnd(i * 5 + s) - 0.5) * w * 0.6, 38 + rnd(i) * 6, (rnd(i * 9 + s) - 0.5) * d * 0.6);
  },

  // ---- Micelaria y Pantano ----
  lantern(g) {
    cy(g, 2.5, 3.5, 54, DMETAL, 0, 0, 0, 8);
    bx(g, 14, 14, 14, glowMat('#ffd98a'), 0, 54, 0);
    cone(g, 12, 9, DMETAL, 0, 68, 0, 4).rotation.y = Math.PI / 4;
    bx(g, 16, 2, 16, DMETAL, 0, 52, 0);
    halo(g, '#ffd98a', 130, 0, 61, 0, 0.7);
  },
  lanternpost(g) {
    cy(g, 2.6, 3.4, 92, '#444a52', 0, 0, 0, 8);
    bx(g, 16, 3, 16, DMETAL, 0, 90, 0);
    bx(g, 11, 14, 11, glowMat('#ffd98a'), 0, 92, 0);
    cone(g, 10, 8, DMETAL, 0, 106, 0, 4).rotation.y = Math.PI / 4;
    halo(g, '#ffd98a', 170, 0, 99, 0, 0.75);
  },
  stall(g, w, d, s) {
    const h = 82, cols = ['#c94a4a', '#f3e9d2'];
    bx(g, w, 26, d * 0.6, woodMat(), 0, 0, d * 0.18);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, 2.5, 2.5, h, DWOOD, sx * (w / 2 - 3), 0, sz * (d / 2 - 3), 6);
    const n = 6;
    for (let i = 0; i < n; i++) {
      const sl = bx(g, w / n + 0.4, 3, d + 6, cols[i % 2], -w / 2 + (i + 0.5) * w / n, h, 0);
      sl.rotation.x = 0.12;
    }
    for (let i = 0; i < 4; i++) sp(g, 4.5, ['#e63946', '#f2a541', '#8ac24a'][i % 3], -w * 0.3 + i * w * 0.2, 31, d * 0.18);
  },
  bonfire(g, w, d) {
    const r = Math.min(w, d) / 2;
    for (let i = 0; i < 8; i++) ico(g, 5.5, '#6b7078', Math.cos(i * 0.785) * r * 0.85, 4, Math.sin(i * 0.785) * r * 0.85, 1, 0.7, 1, 0);
    for (let i = 0; i < 5; i++) { const l = cy(g, 3.4, 3.4, r * 1.3, '#4a3320', 0, 6, 0, 8); l.rotation.z = 1.2; l.rotation.y = i * 1.26; l.position.y = 8; }
    const fl = [];
    for (let i = 0; i < 4; i++) { const c = cone(g, 9 - i, 26 + i * 6, i % 2 ? '#ffd24a' : '#ff8a1f', (rnd(i) - 0.5) * 10, 8, (rnd(i + 4) - 0.5) * 10, 8); c.material = glowMat(i % 2 ? '#ffd24a' : '#ff8a1f', 0.9); fl.push(c); }
    const h2 = halo(g, '#ff9a3a', 200, 0, 26, 0, 0.8);
    g.userData.tick = (T) => { fl.forEach((c, i) => { const k = 0.85 + 0.3 * Math.sin(T * 9 + i * 2); c.scale.set(k, 0.8 + 0.4 * Math.sin(T * 7 + i), k); }); h2.material.opacity = 0.65 + 0.2 * Math.sin(T * 11); };
  },
  stump(g, w, d, s) {
    const r = Math.min(w, d) / 2, h = 18 + rnd(s) * 14;
    lathe(g, [[r * 1.12, 0], [r, 5], [r * 0.92, h]], mat('#6e5238'));
    cy(g, r * 0.9, r * 0.9, 1.2, '#c9a373', 0, h, 0, 18);
    tor(g, r * 0.6, 0.6, '#9a7a50', 0, h + 1.3, 0, Math.PI / 2, 18); tor(g, r * 0.3, 0.6, '#9a7a50', 0, h + 1.3, 0, Math.PI / 2, 14);
  },
  bed(g, w, d) {
    bx(g, w, 16, d, DWOOD, 0, 0, 0);
    bx(g, w - 6, 9, d - 6, '#d9d2bd', 0, 16, 0);
    bx(g, w * 0.55, 3, d - 4, '#4a6aa8', w * 0.18, 25, 0);
    bx(g, w * 0.2, 7, d * 0.7, '#f3efe3', -w * 0.34, 25, 0);
    bx(g, 5, 30, d, DWOOD, -w / 2 + 2.5, 0, 0);
  },
  baskets(g, w, d, s) {
    const n = Math.max(1, Math.round(w / 36));
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * w / n - w / 2;
      lathe(g, [[10, 0], [13, 8], [14, 18]], '#b8894f', x, 0, 0, 12);
      tor(g, 14, 1.4, '#8a6a3a', x, 18, 0, Math.PI / 2, 14);
      for (let j = 0; j < 5; j++) sp(g, 4.5, ['#e63946', '#f2a541', '#8ac24a'][(i + j) % 3], x + (rnd(j + s) - 0.5) * 12, 19 + rnd(j) * 3, (rnd(j * 3 + s) - 0.5) * 12);
    }
  },
  millwheel(g, w, d) {
    const R = Math.min(w, d) * 0.45 + 22;
    bx(g, 8, R * 2 + 16, 8, DWOOD, -w / 2 + 4, 0, 0).scale.y = 1;
    const wh = new THREE.Group(); wh.position.set(0, R + 4, 0);
    tor(wh, R, 4, DWOOD, 0, 0, 0, 0, 28);
    for (let i = 0; i < 8; i++) { const sp2 = bx(wh, R * 2, 3, 3, DWOOD, 0, 0, 0); sp2.rotation.z = i * 0.39; }
    for (let i = 0; i < 12; i++) { const a = i * 0.5236; bx(wh, 5, 12, 22, WOOD, Math.cos(a) * R, 0, 0).position.set(Math.cos(a) * R, Math.sin(a) * R, 0); }
    g.add(wh);
    wh.userData.tick = (T) => { wh.rotation.z = T * 0.5; };
    bx(g, 5, 5, 40, DMETAL, 0, R + 1.5, 0);
  },
  haystack(g, w, d) {
    const r = Math.min(w, d) / 2;
    dome(g, r, '#d9b84a', 0, 0, 0, 1.05);
    cone(g, r * 0.5, r * 0.5, '#c9a53a', 0, r * 0.95, 0, 12);
    for (let i = 0; i < 14; i++) { const a = i * 0.9; bx(g, 1.2, r * 0.5, 1.2, '#e9d070', Math.cos(a) * r * (0.5 + rnd(i) * 0.4), r * 0.2, Math.sin(a) * r * (0.5 + rnd(i) * 0.4)).rotation.z = (rnd(i) - 0.5); }
  },
  telescope(g) {
    for (let i = 0; i < 3; i++) { const l = cy(g, 1.6, 1.6, 52, DWOOD, Math.cos(i * 2.09) * 9, 0, Math.sin(i * 2.09) * 9, 6); l.rotation.z = Math.cos(i * 2.09) * 0.2; l.rotation.x = -Math.sin(i * 2.09) * 0.2; }
    const t = cy(g, 4, 5, 46, '#b08a3a', 0, 0, 0, 12); t.rotation.z = -0.9; t.position.set(8, 66, 0);
    cy(g, 5.4, 5.4, 4, '#e9c46a', 0, 0, 0, 12).position.set(26, 82, 0);
  },
  totem(g, w, d) {
    const cols = ['#8a6a45', '#a0522d', '#c9a23a', '#6a8f6a'];
    for (let i = 0; i < 4; i++) {
      const r = Math.min(w, d) * 0.4;
      bx(g, r * 2, 26, r * 1.8, cols[i], 0, i * 26, 0);
      bx(g, 7, 7, 1, glowMat('#1b1410'), -6, i * 26 + 14, d * 0.45); bx(g, 7, 7, 1, glowMat('#1b1410'), 6, i * 26 + 14, d * 0.45);
      bx(g, 12, 3, 1, glowMat('#1b1410'), 0, i * 26 + 6, d * 0.45);
    }
    bx(g, w * 1.7, 5, 6, '#a0522d', 0, 100, 0);
    cone(g, 8, 12, '#e9c46a', 0, 104, 0, 4);
  },
  glowshroom(g, w, d, s) {
    mush(g, Math.min(w, d) * 0.42 + 6, 30 + rnd(s) * 14, '#8ab4ff', 0, 0, true);
  },
  boulder(g, w, d, s) {
    const r = Math.min(w, d) / 2;
    ico(g, r, '#6f747c', 0, r * 0.5, 0, 1, 0.62 + rnd(s) * 0.2, 0.9, 1);
    ico(g, r * 0.6, '#80858c', r * 0.55, r * 0.28, r * 0.3, 1, 0.7, 1, 1);
    ico(g, r * 0.5, '#45703a', -r * 0.2, r * 0.78, 0, 1, 0.3, 1, 0);
  },
  cropbed(g, w, d, s) {
    bx(g, w, 8, d, '#4a3322', 0, 0, 0);
    const nx = Math.max(3, Math.round(w / 14)), nz = Math.max(2, Math.round(d / 20));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = (i + 0.5) * w / nx - w / 2, z = (j + 0.5) * d / nz - d / 2;
      cone(g, 4, 16 + rnd(s + i * 3 + j) * 8, mix('#5aa04a', '#d9b84a', rnd(i + j) * 0.6), x, 8, z, 5);
    }
  },
  cart(g, w, d) {
    bx(g, w * 0.8, 4, d * 0.8, woodMat(), 0, 16, 0);
    for (const sz of [-1, 1]) bx(g, w * 0.8, 14, 3, woodMat(), 0, 18, sz * d * 0.4);
    bx(g, 3, 14, d * 0.8, woodMat(), -w * 0.4, 18, 0);
    for (const sz of [-1, 1]) { const wh = cy(g, 14, 14, 4, DWOOD, 0, 0, 0, 14); wh.rotation.x = Math.PI / 2; wh.position.set(0, 14, sz * (d * 0.45)); tor(g, 11, 1.2, '#2a2018', 0, 14, sz * (d * 0.45), 0, 14); }
    bx(g, w * 0.5, 3, 3, DWOOD, w * 0.6, 18, 0);
    for (let i = 0; i < 4; i++) sp(g, 6, ['#e8a23a', '#c0553a', '#8ac24a'][i % 3], (i - 1.5) * 10, 28, (rnd(i) - 0.5) * 14);
  },
  mushring(g, w, d, s) {
    const r = Math.min(w, d) / 2 * 0.85;
    for (let i = 0; i < 9; i++) mush(g, 4.5, 9 + rnd(s + i) * 6, i % 2 ? '#e8d9b0' : '#d9824a', Math.cos(i * 0.7) * r, Math.sin(i * 0.7) * r, false);
  },
  signpost(g) {
    cy(g, 2.5, 3, 70, DWOOD, 0, 0, 0, 6);
    const a = bx(g, 28, 9, 2, LWOOD, 10, 54, 0); a.rotation.y = 0.2;
    cone(g, 6, 8, LWOOD, 26, 54, 0, 3).rotation.z = -Math.PI / 2;
    const b = bx(g, 24, 9, 2, LWOOD, -8, 40, 0); b.rotation.y = -0.15;
  },
  fern(g, w, d, s) {
    const r = Math.min(w, d) / 2;
    for (let i = 0; i < 9; i++) {
      const c = cone(g, 4, r * 1.2, mix('#2f7a3a', '#6ab04a', rnd(s + i)), 0, 0, 0, 4);
      c.position.set(Math.cos(i * 0.7) * r * 0.5, r * 0.5, Math.sin(i * 0.7) * r * 0.5);
      c.rotation.z = Math.cos(i * 0.7) * 0.9; c.rotation.x = -Math.sin(i * 0.7) * 0.9;
      c.scale.set(1, 1, 0.25);
    }
  },
  tallgrass(g, w, d, s) {
    const n = 16, r = Math.min(w, d) / 2;
    for (let i = 0; i < n; i++) {
      const x = (rnd(s + i) - 0.5) * r * 1.6, z = (rnd(s + i * 3) - 0.5) * r * 1.6;
      const c = cone(g, 1.6, 26 + rnd(i + s) * 14, mix('#4f8a3a', '#a0c04a', rnd(i * 2 + s)), x, 0, z, 3);
      c.rotation.z = (rnd(i + 4) - 0.5) * 0.4;
    }
  },
  well(g, w, d) {
    const r = Math.min(w, d) / 2 * 0.8;
    lathe(g, [[r, 0], [r, 30], [r * 0.78, 30], [r * 0.78, 4]], stoneMat());
    for (const sx of [-1, 1]) cy(g, 2.5, 2.5, 66, DWOOD, sx * r * 0.95, 0, 0, 6);
    bx(g, r * 2.4, 3, 10, DWOOD, 0, 66, 0);
    const rf = bx(g, r * 2.6, 3, 16, '#7a4a2a', 0, 69, -4); rf.rotation.x = 0.4;
    const rf2 = bx(g, r * 2.6, 3, 16, '#7a4a2a', 0, 69, 4); rf2.rotation.x = -0.4;
    cy(g, 4, 3.4, 7, '#8a6a3a', 0, 38, 0, 10);
    cy(g, 0.5, 0.5, 26, '#6a5a3a', 0, 40, 0, 4);
  },
  tree(g, w, d, s) {
    const tr = Math.max(6, Math.min(w, d) * 0.34), H = 130 + rnd(s) * 30;
    lathe(g, [[tr * 1.5, 0], [tr * 1.1, 14], [tr, H * 0.5], [tr * 0.7, H * 0.8]], mat('#6e4c2e'), 0, 0, 0, 10);
    const cr = Math.max(34, Math.max(w, d) * 0.78);
    const cols = ['#2f6b3a', '#3a7d42', '#27582f'];
    ico(g, cr, cols[s % 3], 0, H * 0.78, 0, 1, 0.72, 1, 1);
    ico(g, cr * 0.7, cols[(s + 1) % 3], cr * 0.5, H * 0.9, cr * 0.2, 1, 0.8, 1, 1);
    ico(g, cr * 0.65, cols[(s + 2) % 3], -cr * 0.45, H * 0.86, -cr * 0.25, 1, 0.8, 1, 1);
    ico(g, cr * 0.5, cols[s % 3], 0, H * 1.0, -cr * 0.2, 1, 0.8, 1, 1);
  },
  deadtree(g, w, d, s) { deadTree(g, w, d, s, false); },
  swamptree(g, w, d, s) { deadTree(g, w, d, s, true); },
  stove(g, w, d) {
    bx(g, w, 44, d, '#3a3d42', 0, 6, 0);
    for (const sx of [-1, 1]) bx(g, 4, 6, 4, DMETAL, sx * (w / 2 - 4), 0, 0);
    bx(g, w * 0.5, 16, 1, glowMat('#ff8a1f'), 0, 16, d / 2 + 0.6);
    halo(g, '#ff8a1f', 80, 0, 22, d / 2 + 6, 0.5);
    cy(g, 4.5, 4.5, 56, DMETAL, -w * 0.25, 48, -d * 0.2, 8);
    for (let i = 0; i < 2; i++) cy(g, 8, 8, 1.6, '#25282c', (i - 0.5) * 20, 50, 0, 12);
  },
  chest(g, w, d) {
    bx(g, w, 18, d, '#7a4a22', 0, 0, 0);
    const lid = cy(g, d / 2, d / 2, w, '#8a5a2a', 0, 0, 0, 14); lid.rotation.z = Math.PI / 2; lid.position.set(0, 18, 0); lid.scale.set(0.8, 1, 1);
    for (const x of [-w * 0.3, w * 0.3]) bx(g, 4, 20, d + 1, DMETAL, x, 0, 0);
    bx(g, 5, 7, 2, '#e9c46a', 0, 11, d / 2 + 1);
  },
  rowboat(g, w, d) {
    const hull = sp(g, 1, '#6b4a2f', 0, 12, 0, w / 2, 0.55 * 22 / 1, d / 2);
    hull.scale.set(w / 2, 14, d / 2);
    bx(g, w * 0.78, 2, d * 0.7, '#9a7a4a', 0, 18, 0);
    for (const x of [-w * 0.25, w * 0.1]) bx(g, 4, 3, d * 0.8, WOOD, x, 24, 0);
    const o = cy(g, 1.2, 1.2, 46, DWOOD, 0, 20, d * 0.3, 5); o.rotation.x = 1.2;
  },
  fishrack(g, w, d, s) {
    for (const sx of [-1, 1]) cy(g, 2.5, 2.5, 66, DWOOD, sx * (w / 2 - 3), 0, 0, 6);
    bx(g, w, 3, 3, DWOOD, 0, 62, 0);
    const n = Math.max(3, Math.round(w / 12));
    for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n - w / 2; cy(g, 0.4, 0.4, 8, '#aaa', x, 54, 0, 3); sp(g, 6, mix('#9aa8b0', '#c9d3d8', rnd(s + i)), x, 46, 0, 0.32, 1, 0.5); }
  },
  crystal(g, w, d, s) {
    const cols = ['#8ae0ff', '#b48aff', '#8affc9'];
    for (let i = 0; i < 5; i++) {
      const hh = 34 + rnd(s + i) * 40, r = 6 + rnd(i + s) * 5;
      const c = cone(g, r, hh, glowMat(cols[(s + i) % 3], 0.9), (rnd(s + i * 3) - 0.5) * w * 0.6, 0, (rnd(s + i * 5) - 0.5) * d * 0.6, 5);
      c.rotation.z = (rnd(i + 2) - 0.5) * 0.4;
    }
    halo(g, cols[s % 3], 150, 0, 32, 0, 0.55);
  },
  stalag(g, w, d, s) {
    const r = Math.min(w, d) / 2;
    cone(g, r * 0.9, 90 + rnd(s) * 30, '#7c7f86', 0, 0, 0, 7);
    cone(g, r * 0.5, 55, '#8a8d94', r * 0.7, 0, r * 0.3, 6);
  },
  log(g, w, d) {
    const horiz = w >= d, L = horiz ? w : d, r = (horiz ? d : w) / 2;
    const l = cy(g, r * 0.95, r, L, '#6a4a2e', 0, 0, 0, 12);
    l.position.y = r;
    if (horiz) l.rotation.z = Math.PI / 2; else l.rotation.x = Math.PI / 2;
    const e = cy(g, r * 0.85, r * 0.85, 1, '#c9a373', 0, 0, 0, 12);
    e.position.set(horiz ? L / 2 : 0, r, horiz ? 0 : L / 2); if (horiz) e.rotation.z = Math.PI / 2; else e.rotation.x = Math.PI / 2;
  },
  shroomA(g, w, d, s) { mush(g, Math.min(w, d) * 0.6 + 10, 70, '#c04a4a', 0, 0, false, true); },
  shroomB(g, w, d, s) { mush(g, Math.min(w, d) * 0.6 + 14, 54, '#d9a441', 0, 0, false, false, 0.45); },
  shroomC(g, w, d, s) { mush(g, Math.min(w, d) * 0.5 + 8, 92, '#9a6ad0', 0, 0, false, true, 0.9); },
  shroomD(g, w, d, s) { mush(g, Math.min(w, d) * 0.55 + 8, 62, '#4aa0a0', 0, 0, false, true); },
  shroomE(g, w, d, s) { mush(g, Math.min(w, d) * 0.55 + 10, 80, '#4aa0c0', 0, 0, true, true); },
  bigroot(g, w, d, s) {
    for (let i = 0; i < 6; i++) { const a = i * 1.05, c = cone(g, 8, 70 + rnd(s + i) * 30, '#4a3a2a', Math.cos(a) * 18, 0, Math.sin(a) * 18, 6); c.rotation.z = Math.cos(a) * 0.9; c.rotation.x = -Math.sin(a) * 0.9; c.position.y = 24; }
  },

  // ---- aparatos de la partida ----
  panel(g, w, d, s) { fuseBox(g, w, d, s); },
  core(g, w, d, s) { reactorCore(g, w, d, s); },
};
OBST.sacks = OBST.sack;
OBST.shrooms = OBST.shrooms;
OBST.bunch = OBST.shrooms;

function mush(g, r, h, col, x, z, glowing, spots = true, flat = 0.6) {
  const sub = new THREE.Group(); sub.position.set(x, 0, z);
  const st = Math.max(2.5, r * 0.32);
  lathe(sub, [[st * 1.25, 0], [st, h * 0.3], [st * 0.85, h * 0.8]], '#efe3c4', 0, 0, 0, 10);
  const capM = glowing ? mat(col, { emissive: col, emissiveIntensity: 0.7 }) : mat(col);
  dome(sub, r, capM, 0, h * 0.72, 0, flat);
  cy(sub, r * 0.92, r * 0.92, 1.2, shade(col, 0.55), 0, h * 0.72, 0, 14);
  if (spots) for (let i = 0; i < 6; i++) { const a = i * 1.1 + h, e = 0.45 + rnd(i + h) * 0.4; sp(sub, r * 0.13, '#f4f0e0', Math.cos(a) * r * 0.8 * Math.sqrt(1 - e * e), h * 0.72 + e * r * flat * 0.95, Math.sin(a) * r * 0.8 * Math.sqrt(1 - e * e), 1, 0.35, 1); }
  if (glowing) halo(sub, col, r * 4, 0, h * 0.8, 0, 0.45);
  g.add(sub);
}

function deadTree(g, w, d, s, swamp) {
  const tr = Math.max(6, Math.min(w, d) * 0.3), H = 120 + rnd(s) * 30;
  const trunk = mat(swamp ? '#3e4a30' : '#4a3a2a');
  lathe(g, [[tr * 1.7, 0], [tr * 1.1, 12], [tr * 0.8, H * 0.6], [tr * 0.4, H]], trunk, 0, 0, 0, 8);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + s, hh = 50 + rnd(s + i) * 40, len = 34 + rnd(i + s) * 30;
    const b = cy(g, 1.2, 3, len, trunk, 0, 0, 0, 5);
    b.position.set(Math.cos(a) * 8, H * 0.4 + i * 14, Math.sin(a) * 8);
    b.rotation.z = Math.cos(a) * 1.0; b.rotation.x = -Math.sin(a) * 1.0;
    void hh;
  }
  if (swamp) {
    for (let i = 0; i < 7; i++) { const a = i * 0.9; cone(g, 1.8, 32 + rnd(i + s) * 26, '#5d7a4a', Math.cos(a) * 24, 70 + rnd(i * 3) * 30, Math.sin(a) * 24, 4).rotation.x = Math.PI; }
    ico(g, 26, '#3f5a35', 0, H * 0.95, 0, 1, 0.5, 1, 1);
  }
}

/* cuadro eléctrico: caja metálica con puerta, avisos y palanca */
function fuseBox(g, w, d, s) {
  const h = 92;
  bx(g, w, h, d, '#59616d', 0, 6, 0);
  bx(g, w + 4, 6, d + 4, DMETAL, 0, 0, 0);
  bx(g, w - 8, h - 22, 1.6, '#6d7683', 0, 14, d / 2 + 0.8);
  bx(g, w - 14, 5, 1, glowMat('#ffd60a'), 0, h - 14, d / 2 + 1.8);
  for (let i = 0; i < 3; i++) cy(g, 3, 3, 2, glowMat(['#e63946', '#ffd60a', '#4ade80'][i]), -w * 0.25 + i * w * 0.25, h * 0.55, d / 2 + 1.6, 8).rotation.x = Math.PI / 2;
  bx(g, 4, 22, 3, '#c9ced4', 0, h * 0.18, d / 2 + 2); // palanca
  sp(g, 3.4, '#e63946', 0, h * 0.18 + 24, d / 2 + 2);
  for (let i = 0; i < 3; i++) tube(g, [[-w * 0.35 + i * 8, h, 0], [-w * 0.35 + i * 8, h + 14, 0], [-w * 0.45 + i * 14, h + 24, d * 0.3]], 1.6, ['#2b3038', '#7a2a2a', '#2a4a7a'][i], 10);
  halo(g, '#ffd60a', 100, 0, h - 8, d / 2 + 8, 0.25);
  // espalda y costados: tapas atornilladas, rejillas y conductos
  bx(g, w - 10, h - 26, 1.4, '#66707c', 0, 14, -d / 2 - 0.7);
  for (let i = 0; i < 5; i++) bx(g, w - 20, 2, 1, DMETAL, 0, h * 0.78 - i * 7, -d / 2 - 1.4);
  for (const sx of [-1, 1]) {
    bx(g, 1.4, h - 30, d - 10, '#66707c', sx * (w / 2 + 0.7), 14, 0);
    for (let i = 0; i < 4; i++) bx(g, 1, 2, d - 22, DMETAL, sx * (w / 2 + 1.4), h * 0.7 - i * 8, 0);
    for (const sz of [-1, 1]) for (const yy of [20, h - 20]) cy(g, 1.6, 1.6, 1.6, '#c9ced4', sx * (w / 2 + 1.4), yy, sz * (d / 2 - 8), 6).rotation.z = Math.PI / 2;
  }
  tube(g, [[w * 0.3, h, -d * 0.2], [w * 0.3, h + 12, -d * 0.2], [w * 0.1, h + 18, -d * 0.45]], 2, '#2b3038', 10);
}

/* reactor: plataforma, tubo central con el núcleo y anillos */
function reactorCore(g, w, d, s) {
  const r = Math.min(w, d) / 2;
  lathe(g, [[r * 1.05, 0], [r * 1.05, 10], [r * 0.85, 14]], mat('#4b515b'), 0, 0, 0, 24);
  cy(g, r * 0.6, r * 0.7, 6, DMETAL, 0, 14, 0, 20);
  cy(g, r * 0.42, r * 0.42, 70, glass('#9bf0c0', 0.38), 0, 20, 0, 20);
  const core = cy(g, r * 0.26, r * 0.26, 54, glowMat('#4ade80'), 0, 24, 0, 14);
  for (const y of [28, 52, 76]) tor(g, r * 0.5, 2.4, '#7b8794', 0, y, 0, Math.PI / 2, 22);
  cy(g, r * 0.56, r * 0.5, 8, DMETAL, 0, 90, 0, 20);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + 0.78;
    cy(g, 3, 3, 52, '#39413a', Math.cos(a) * r * 0.9, 12, Math.sin(a) * r * 0.9, 6);
    tube(g, [[Math.cos(a) * r * 0.9, 60, Math.sin(a) * r * 0.9], [Math.cos(a) * r * 0.7, 94, Math.sin(a) * r * 0.7], [0, 98, 0]], 2.4, '#39413a', 12);
  }
  const hl = halo(g, '#4ade80', 190, 0, 50, 0, 0.55);
  hl.material = hl.material.clone(); // propio: cambia de color en la alarma
  hl.userData.ownMat = true;
  g.userData.core = core; g.userData.halo = hl;
  g.userData.tick = (T) => {
    if (g.userData.alarm) return;
    core.material = glowMat('#4ade80'); hl.material.color.set('#4ade80');
    hl.material.opacity = 0.45 + 0.12 * Math.sin(T * 2);
  };
}

/* ---------------- objetos de las tareas ---------------- */

const PROP = {
  tray(g, w, d, s) {
    bx(g, w, 6, d, '#6b4a29', 0, 0, 0);
    bx(g, w - 6, 3, d - 6, '#3a2a1c', 0, 5, 0);
    for (let i = 0; i < 9; i++) sp(g, 3.2, ['#e9c46a', '#c9a23a', '#8a5a2a', '#6a8f3a'][i % 4], (rnd(s + i) - 0.5) * (w - 14), 9, (rnd(s + i * 3) - 0.5) * (d - 14), 1, 0.6, 1);
  },
  cables(g, w, d, s) {
    bx(g, 18, 36, 12, '#59616d', -w / 2 + 12, 0, 0);
    bx(g, 12, 6, 1, glowMat('#ffd60a'), -w / 2 + 12, 26, 6.5);
    const cols = ['#e63946', '#2a7ae6', '#f2c14e', '#4ade80'];
    cols.forEach((c, i) => tube(g, [[-w / 2 + 14, 20 - i * 3, 6], [-w / 4, 8, d * 0.2 - i * 5], [w / 6, 4, d * 0.1 - i * 4], [w / 2 - 4, 3, -d * 0.2 + i * 3]], 1.8, c, 18));
  },
  crate(g, w, d, s) { OBST.crate(g, w * 0.85, d * 0.85, s); bx(g, 14, 9, 1, '#f3e9d2', 0, 18, d * 0.43 + 0.5); },
  filter(g, w, d) {
    const r = Math.min(w, d) / 2 * 0.62;
    cy(g, r * 1.1, r * 1.1, 5, DMETAL, 0, 0, 0, 16);
    cy(g, r, r, 38, glass('#9fd8ff', 0.4), 0, 5, 0, 16);
    cy(g, r * 0.7, r * 0.7, 32, '#5a7a8a', 0, 7, 0, 12);
    cy(g, r * 1.1, r * 1.1, 5, DMETAL, 0, 43, 0, 16);
    cy(g, 3, 3, 12, METAL, 0, 48, 0, 8);
    const p = cy(g, 3, 3, w * 0.6, METAL, 0, 0, 0, 8); p.rotation.z = Math.PI / 2; p.position.set(w * 0.25, 56, 0);
  },
  valve(g, w, d) {
    cy(g, 4, 4, 34, '#6a7480', 0, 0, 0, 10);
    const p = cy(g, 4, 4, w, '#6a7480', 0, 0, 0, 10); p.rotation.z = Math.PI / 2; p.position.set(0, 12, 0);
    cy(g, 6, 6, 5, DMETAL, 0, 12, 0, 10);
    const wh = new THREE.Group(); wh.position.set(0, 40, 0);
    tor(wh, 11, 1.8, '#d63a3a', 0, 0, 0, Math.PI / 2, 18);
    for (let i = 0; i < 3; i++) { const sp2 = bx(wh, 22, 2, 2, '#d63a3a', 0, 0, 0); sp2.rotation.y = i * 1.05; }
    g.add(wh);
    cy(g, 2, 2, 8, METAL, 0, 34, 0, 6);
  },
  terminal(g, w, d, s) {
    bx(g, w * 0.7, 30, d * 0.6, '#59616d', 0, 0, 0);
    const sc = bx(g, w * 0.66, 24, 4, '#1e2a33', 0, 30, -d * 0.1); sc.rotation.x = -0.25;
    const face = bx(g, w * 0.58, 18, 1, glowMat('#7ee0ff'), 0, 33, -d * 0.1 + 2.6); face.rotation.x = -0.25;
    bx(g, w * 0.55, 2, 12, '#2a2f36', 0, 30, d * 0.2);
    halo(g, '#7ee0ff', 100, 0, 44, d * 0.1, 0.3);
  },
  panel(g, w, d) {
    bx(g, w, 52, d * 0.6, '#59616d', 0, 0, 0);
    bx(g, w - 8, 40, 1.4, '#6d7683', 0, 6, d * 0.3 + 0.7);
    for (let i = 0; i < 4; i++) bx(g, 5, 5, 1, glowMat(['#e63946', '#ffd60a', '#4ade80', '#4ade80'][i]), -w * 0.3 + i * 11, 38, d * 0.3 + 1.6);
    bx(g, w * 0.5, 10, 1, glowMat('#7ee0ff'), 0, 22, d * 0.3 + 1.4);
  },
  lamp(g, w, d) {
    cy(g, 8, 10, 4, DMETAL, 0, 0, 0, 12);
    cy(g, 2, 2, 50, METAL, 0, 4, 0, 6);
    sp(g, 8, glowMat('#fff2b0'), 0, 62, 0);
    cone(g, 12, 10, '#7a5a3a', 0, 66, 0, 12);
    halo(g, '#fff2b0', 120, 0, 62, 0, 0.6);
  },
  switchbox(g, w, d) {
    bx(g, w, 34, d * 0.6, '#59616d', 0, 0, 0);
    for (let i = 0; i < 4; i++) { bx(g, 5, 9, 2, '#e8e8e8', -w * 0.3 + i * 11, 18, d * 0.3 + 1); bx(g, 3, 5, 3, i % 2 ? '#e63946' : '#4ade80', -w * 0.3 + i * 11, i % 2 ? 22 : 16, d * 0.3 + 2); }
  },
  scale(g, w, d) {
    cy(g, 7, 9, 4, DMETAL, 0, 0, 0, 10);
    cy(g, 2, 2, 46, '#b08a3a', 0, 4, 0, 6);
    bx(g, w * 0.8, 2.5, 3, '#b08a3a', 0, 48, 0);
    for (const sx of [-1, 1]) { cy(g, 0.5, 0.5, 14, '#b08a3a', sx * w * 0.38, 34, 0, 3); cy(g, 10, 6, 3, '#d9b84a', sx * w * 0.38, 31, 0, 12); }
    cy(g, 2, 2, 2, '#b08a3a', 0, 48, 0, 6);
  },
  keypad(g, w, d) {
    cy(g, 8, 10, 4, DMETAL, 0, 0, 0, 10);
    cy(g, 4, 4, 30, '#59616d', 0, 4, 0, 8);
    const hd = bx(g, w * 0.8, 26, 12, '#3a4048', 0, 34, 0); hd.rotation.x = -0.35;
    bx(g, w * 0.55, 7, 1, glowMat('#4ade80'), 0, 54, 4).rotation.x = -0.35;
    for (let i = 0; i < 9; i++) bx(g, 5, 4, 1.5, '#cfd5db', ((i % 3) - 1) * 7, 37 + Math.floor(i / 3) * 5.5, 6.4).rotation.x = -0.35;
  },
  machine(g, w, d, s) { OBST.machine(g, w, d, s); },
  bench(g, w, d, s) {
    bx(g, w, 6, d * 0.8, woodMat(), 0, 28, 0);
    leg4(g, w - 6, d * 0.8 - 4, 28, 5, DWOOD);
    bx(g, w * 0.3, 8, 10, '#9aa4ae', -w * 0.2, 34, 0); // un tornillo de banco
    for (let i = 0; i < 3; i++) bx(g, 2, 2, 14, '#c9ced4', w * 0.1 + i * 6, 34, 0);
  },
  table(g, w, d, s) { OBST.table(g, w, d, s); bx(g, w * 0.4, 1.5, d * 0.5, '#f3e9d2', 0, 34, 0); },
  radio(g, w, d) {
    bx(g, w * 0.8, 22, d * 0.6, '#7a5a3a', 0, 0, 0);
    cy(g, 7, 7, 2, '#2a2f36', -w * 0.18, 10, d * 0.3, 14).rotation.x = Math.PI / 2;
    bx(g, w * 0.3, 8, 1, glowMat('#ffd98a'), w * 0.18, 12, d * 0.3 + 0.6);
    for (let i = 0; i < 2; i++) cy(g, 2, 2, 2, '#e9c46a', w * 0.08 + i * 9, 5, d * 0.3 + 1, 6).rotation.x = Math.PI / 2;
    cy(g, 0.8, 0.8, 40, '#c9ced4', w * 0.3, 22, -d * 0.2, 4);
  },
  glass(g, w, d) {
    bx(g, w, 3, d * 0.6, DMETAL, 0, 0, 0);
    bx(g, w - 4, 38, 1.6, glass('#bfe9ff', 0.4), 0, 3, 0);
    for (const sx of [-1, 1]) bx(g, 3, 40, 3, DMETAL, sx * (w / 2 - 2), 0, 0);
    bx(g, w, 3, 4, DMETAL, 0, 40, 0);
  },
  compost(g, w, d, s) { OBST.compost(g, w, d, s); },
  cauldron(g, w, d) {
    const r = Math.min(w, d) / 2 * 0.8;
    for (let i = 0; i < 3; i++) { const l = cy(g, 1.8, 1.8, 40, DMETAL, Math.cos(i * 2.09) * r * 0.8, 0, Math.sin(i * 2.09) * r * 0.8, 5); l.rotation.z = -Math.cos(i * 2.09) * 0.2; l.rotation.x = Math.sin(i * 2.09) * 0.2; }
    lathe(g, [[r * 0.5, 14], [r * 0.9, 24], [r, 34], [r * 0.88, 42]], mat('#2a2f36'), 0, 0, 0, 16);
    cy(g, r * 0.84, r * 0.84, 0.6, glowMat('#7aff6a'), 0, 40, 0, 16);
    tor(g, r * 0.9, 1.6, DMETAL, 0, 42, 0, Math.PI / 2, 16);
    halo(g, '#7aff6a', 130, 0, 46, 0, 0.55);
    const bb = [];
    for (let i = 0; i < 3; i++) bb.push(sp(g, 3, glowMat('#b8ffb0'), 0, 42, 0));
    g.userData.tick = (T) => bb.forEach((b, i) => { const k = (T * 0.6 + i / 3) % 1; b.position.set(Math.cos(i * 2.4) * r * 0.4, 42 + k * 7, Math.sin(i * 2.4) * r * 0.4); b.scale.setScalar(2.2 * (1 - k)); });
  },
  teaset(g, w, d) {
    cy(g, 16, 16, 3, woodMat(), 0, 24, 0, 16);
    cy(g, 2.5, 2.5, 24, DWOOD, 0, 0, 0, 6);
    cy(g, 8, 10, 3, DWOOD, 0, 0, 0, 10);
    sp(g, 6, '#f3e9d2', 0, 33, 0, 1, 0.9, 1);
    cy(g, 2, 2, 3, '#f3e9d2', 0, 37, 0, 6);
    cy(g, 1.2, 1.2, 8, '#f3e9d2', 6, 31, 0, 5).rotation.z = 1.0;
    for (const a of [1.8, 3.9]) { cy(g, 3.2, 2.4, 4, '#c9d9e6', Math.cos(a) * 11, 27, Math.sin(a) * 11, 8); }
  },
  clothesline(g, w, d, s) {
    for (const sx of [-1, 1]) cy(g, 2.5, 3, 78, DWOOD, sx * (w / 2 - 3), 0, 0, 6);
    tube(g, [[-w / 2 + 3, 72, 0], [0, 66, 0], [w / 2 - 3, 72, 0]], 0.7, '#cfc6a8', 12);
    const cols = ['#d9534f', '#5b8def', '#f0c040', '#6cc080'];
    for (let i = 0; i < 4; i++) { const x = -w * 0.36 + i * w * 0.24; const c = bx(g, 15, 22, 1, cols[i], x, 42, 0); c.rotation.z = (i % 2 ? 1 : -1) * 0.05; }
  },
  jars(g, w, d, s) {
    bx(g, w, 3, d * 0.8, woodMat(), 0, 26, 0);
    leg4(g, w - 4, d * 0.8 - 2, 26, 4, DWOOD);
    const n = Math.max(3, Math.round(w / 14));
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * w / n - w / 2, c = ['#e63946', '#4ade80', '#7ae0ff', '#f2c14e', '#c77dff'][i % 5];
      cy(g, 5, 5, 16, glass('#d9f0ff', 0.4), x, 29, 0, 10);
      cy(g, 4.2, 4.2, 10 + rnd(s + i) * 5, glowMat(c, 0.85), x, 29.5, 0, 10);
      cy(g, 3.6, 3.6, 3, '#b08a3a', x, 45, 0, 8);
    }
  },
  hearth(g, w, d) {
    bx(g, w, 8, d * 0.8, stoneMat(), 0, 0, 0);
    for (const sx of [-1, 1]) bx(g, 9, 52, d * 0.7, stoneMat(), sx * (w / 2 - 5), 8, 0);
    bx(g, w, 12, d * 0.7, stoneMat(), 0, 56, 0);
    bx(g, w - 24, 38, 3, '#1a1410', 0, 8, -d * 0.25);
    const fl = [];
    for (let i = 0; i < 3; i++) fl.push(cone(g, 8 - i, 24 + i * 4, glowMat(i % 2 ? '#ffd24a' : '#ff8a1f', 0.9), (i - 1) * 9, 10, 0, 8));
    const h2 = halo(g, '#ff9a3a', 170, 0, 26, 8, 0.8);
    g.userData.tick = (T) => { fl.forEach((c, i) => c.scale.set(0.9 + 0.2 * Math.sin(T * 9 + i * 2), 0.8 + 0.4 * Math.sin(T * 7 + i), 1)); h2.material.opacity = 0.65 + 0.2 * Math.sin(T * 11); };
  },
  mortar(g, w, d) {
    cy(g, 11, 14, 14, WOOD, 0, 0, 0, 12);
    cy(g, 10, 10, 1, DWOOD, 0, 14, 0, 12);
    lathe(g, [[5, 14], [10, 22], [11, 26], [8, 26], [3.5, 17]], mat('#c9c2b0'), 0, 0, 0, 14);
    cy(g, 1.8, 2.6, 24, '#d9d2c0', 4, 16, 0, 8).rotation.z = 0.5;
    sp(g, 2.2, '#8ac24a', -3, 19, 2);
  },
  sprouts(g, w, d, s) { OBST.beds(g, w, d, s); },
  chime(g, w, d) {
    cy(g, 2.6, 3, 70, DWOOD, -w * 0.3, 0, 0, 6);
    bx(g, w * 0.8, 3, 3, DWOOD, 0, 68, 0);
    const bars = [];
    for (let i = 0; i < 5; i++) { const x = -w * 0.3 + 4 + i * (w * 0.5 / 4), L = 24 + (i % 3) * 8; cy(g, 0.4, 0.4, 66 - L - 6, '#cfc6a8', x, 66 - (66 - L - 6) + 0, 0, 3).position.y = 66 - (66 - L - 6) / 2 - 0; const t = cy(g, 1.8, 1.8, L, '#d9b84a', x, 0, 0, 8); t.position.y = 66 - 8 - L / 2; bars.push(t); }
    g.userData.tick = (T) => bars.forEach((b, i) => { b.rotation.z = Math.sin(T * 1.8 + i) * 0.06; });
  },
};

// objetos con un frente (puerta, pantalla, mandos): se giran hacia el lado por donde se puede llegar
export const FRONTAL = new Set(['panel', 'machine', 'freezer', 'computer', 'wardrobe', 'stove', 'chest', 'stall', 'bench', 'table', 'bed', 'totem', 'signpost', 'fishrack', 'tank', 'cart', 'stump']);
const TURN = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

/* dir: 0 = el frente mira a +z (sur), 1 = +x, 2 = -z, 3 = -x */
export function buildObstacle(type, x, y, w, d, seed, dir = 0) {
  const grp = new THREE.Group();
  grp.position.set(x + w / 2, 0, y + d / 2);
  const make = OBST[type] || OBST.crate;
  let body = grp, sw = w, sd = d;
  if (dir) {
    body = new THREE.Group();
    body.rotation.y = TURN[dir];
    grp.add(body);
    if (dir % 2) { sw = d; sd = w; }
  }
  try { make(body, sw, sd, seed); } catch (e) { OBST.crate(body, sw, sd, seed); }
  grp.add(blob(w * 1.25 + 8, d * 1.25 + 8, type === 'tallgrass' || type === 'fern' ? 0.25 : 0.4));
  return grp;
}

export function buildProp(kind, x, y, w, d, seed) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, y);
  const make = PROP[kind] || PROP.crate;
  try { make(grp, w, d, seed); } catch (e) { PROP.crate(grp, w, d, seed); }
  grp.add(blob(w * 1.15 + 6, d * 1.15 + 6, 0.35));
  return grp;
}

/* consola del reactor (A y B): pupitre con pantalla y botón de mantener */
export function buildConsole(x, y, side) {
  const g = new THREE.Group();
  g.position.set(x, 0, y);
  bx(g, 50, 30, 40, '#4b515b', 0, 0, 0);
  bx(g, 56, 5, 46, DMETAL, 0, 0, 0);
  // una pantalla inclinada por cada lado: se ve desde donde llegues
  const faces = [];
  for (const sz of [-1, 1]) {
    const a = bx(g, 42, 28, 4, '#1e2a33', 0, 30, sz * 11); a.rotation.x = sz * -0.35;
    const f = bx(g, 36, 21, 1, glowMat('#2a6a8a'), 0, 34, sz * 13.2); f.rotation.x = sz * -0.35;
    faces.push(f);
    cy(g, 7, 7, 3, glowMat('#ffd60a'), -14, 29.5, sz * 17, 14);
    cy(g, 9, 9, 2, DMETAL, -14, 28.5, sz * 17, 14);
  }
  cy(g, 1.6, 1.6, 48, DMETAL, 18, 28, 0, 6);
  const lamp = sp(g, 4.5, glowMat('#3a1418'), 18, 80, 0);
  const h = halo(g, '#ff4d5e', 110, 18, 80, 0, 0.5);
  h.visible = false;
  g.add(blob(70, 60, 0.4));
  g.userData = { face: faces[0], face2: faces[1], lamp, halo: h, side };
  return g;
}

/* rejilla de ventilación en el suelo con su tapa */
export function buildVent(x, y) {
  const g = new THREE.Group();
  g.position.set(x, 0, y);
  bx(g, 56, 5, 46, '#59616d', 0, 0, 0);
  bx(g, 48, 1, 38, '#07090b', 0, 5, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, 2.2, 2.2, 3, '#aab2bb', sx * 24, 5, sz * 19, 6);
  const lid = new THREE.Group(); lid.position.set(0, 7, -18);
  bx(lid, 46, 3, 36, '#8a929c', 0, 0, 18);
  for (let i = -4; i <= 4; i++) bx(lid, 3, 6, 32, '#2a3038', i * 5, 2, 18);
  g.add(lid);
  const ring = tor(g, 27, 1.8, glowMat('#9d4edd', 0.9), 0, 6, 0, Math.PI / 2, 4);
  ring.rotation.z = Math.PI / 4;
  ring.scale.set(1.25, 1.05, 1);
  ring.visible = false;
  g.userData = { lid, ring };
  return g;
}

/* botón de emergencia: pedestal con el botón rojo */
export function buildButton(x, y) {
  const g = new THREE.Group();
  g.position.set(x, 0, y);
  cy(g, 40, 46, 10, '#3a3f46', 0, 0, 0, 24);
  cy(g, 30, 34, 24, '#59616d', 0, 10, 0, 24);
  tor(g, 31, 3, '#e9c46a', 0, 34, 0, Math.PI / 2, 24);
  dome(g, 24, glowMat('#e63946'), 0, 34, 0, 0.6);
  for (let i = 0; i < 8; i++) bx(g, 3, 3, 3, i % 2 ? '#e9c46a' : '#222', Math.cos(i * 0.785) * 40, 10, Math.sin(i * 0.785) * 40);
  halo(g, '#e63946', 190, 0, 44, 0, 0.45);
  g.add(blob(120, 120, 0.4));
  return g;
}
