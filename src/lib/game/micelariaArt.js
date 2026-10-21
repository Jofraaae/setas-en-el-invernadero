/* Micelaria: la aldea de setas gigantes. Todo el vocabulario visual del segundo mapa vive
   aquí: suelos, objetos del escenario, aparatos y objetos de las tareas. Se dibuja con el
   mismo sistema que el invernadero (Canvas 2D, perspectiva cenital), pero con materiales
   orgánicos: tierra, musgo, madera, raíces y luces de hongo. Ninguna función de este
   archivo toca la lógica del juego: solo pinta, igual que las del invernadero. */

const TAU = Math.PI * 2;

export function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// sombrero de seta: media cúpula cerrada por abajo
export function dome(c, x, y, rx, ry) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, Math.PI, 0);
  c.quadraticCurveTo(x, y + ry * 0.28, x - rx, y);
  c.closePath();
}

// un toque de musgo suave, reutilizado por varios objetos
export function moss(c, x, y, rx, ry, a = 0.45) {
  c.fillStyle = `rgba(96,150,84,${a})`;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
}

/* Silueta irregular: el radio respira alrededor del centro, así que piedras, montones y
   charcas salen con el canto roto en vez de con un rectángulo. `sy` la achata o la estira. */
export function blob(c, x, y, r, n, seed, sy = 1) {
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const k = 0.76 + 0.26 * Math.abs(Math.sin(seed + i * 2.3));
    const px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k * sy;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
}

// brizna de hierba suelta: la usan el terreno, los muros y varios objetos
export function blade(c, x, y, k, a) {
  c.strokeStyle = `rgba(${a ? '112,172,92' : '74,124,70'},.42)`;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(x, y + k);
  c.quadraticCurveTo(x + k * 0.5, y, x - k * 0.2, y - k * 0.8);
  c.stroke();
}

/* ---------------- suelos ---------------- */

export const MICELARIA_TEX = {
  path(c, x, y, w, h, r) { // camino de tierra apisonada
    c.fillStyle = 'rgba(30,20,10,.16)';
    c.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 2200; i++) {
      const k = r();
      c.fillStyle = k > 0.72 ? 'rgba(255,240,205,.07)' : k > 0.4 ? 'rgba(0,0,0,.14)' : 'rgba(150,120,82,.18)';
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 3 + r() * 12, 2 + r() * 8, r() * TAU, 0, TAU);
      c.fill();
    }
    c.strokeStyle = 'rgba(255,235,200,.06)';
    c.lineWidth = 3;
    for (let i = 0; i < w / 120; i++) {
      const px = x + r() * w, py = y + r() * h, len = 30 + r() * 80;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + len, py + r() * 10 - 5);
      c.stroke();
    }
  },
  plaza(c, x, y, w, h, r) { // empedrado musgoso de la plaza
    const S = 46;
    for (let ty = y; ty < y + h; ty += S) {
      for (let tx = x; tx < x + w; tx += S) {
        const px = tx + r() * 6, py = ty + r() * 6;
        c.fillStyle = r() > 0.5 ? 'rgba(120,130,112,.35)' : 'rgba(96,106,96,.4)';
        c.beginPath();
        c.ellipse(px + S / 2, py + S / 2, S * 0.42, S * 0.38, r() * 0.6, 0, TAU);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.05)';
        c.beginPath();
        c.ellipse(px + S / 2 - 3, py + S / 2 - 4, S * 0.3, S * 0.22, 0, 0, TAU);
        c.fill();
        if (r() > 0.62) moss(c, px + S * 0.7, py + S * 0.75, S * 0.22, S * 0.16, 0.3);
      }
    }
  },
  planks(c, x, y, w, h, r) { // entarimado de madera cálida
    const ph = 44;
    for (let ry = y; ry < y + h; ry += ph) {
      const hh = Math.min(ph, y + h - ry);
      c.fillStyle = r() > 0.5 ? 'rgba(255,230,180,.06)' : 'rgba(40,24,10,.12)';
      c.fillRect(x, ry, w, hh);
      c.fillStyle = 'rgba(30,18,8,.3)';
      c.fillRect(x, ry, w, 2);
      c.strokeStyle = 'rgba(60,40,20,.18)';
      c.lineWidth = 1.5;
      for (let i = 0; i < w / 90; i++) {
        const px = x + r() * w;
        c.beginPath();
        c.moveTo(px, ry + 3);
        c.lineTo(px + r() * 30 - 15, ry + hh - 3);
        c.stroke();
      }
      if (r() > 0.75) {
        c.fillStyle = 'rgba(40,26,12,.55)';
        c.beginPath();
        c.arc(x + r() * w, ry + hh - 4, 2.6, 0, TAU);
        c.fill();
      }
    }
  },
  forest(c, x, y, w, h, r) { // suelo del bosque: musgo, hojas y ramitas
    for (let i = 0; i < (w * h) / 1800; i++) {
      const k = r();
      c.fillStyle = k > 0.7 ? 'rgba(150,190,120,.13)' : k > 0.35 ? 'rgba(40,60,30,.2)' : 'rgba(90,70,40,.16)';
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 5 + r() * 16, 3 + r() * 9, r() * TAU, 0, TAU);
      c.fill();
    }
    c.strokeStyle = 'rgba(120,96,58,.35)';
    c.lineWidth = 2;
    for (let i = 0; i < (w * h) / 9000; i++) {
      const px = x + r() * w, py = y + r() * h;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + 12 + r() * 26, py + r() * 14 - 7);
      c.stroke();
    }
  },
  mud(c, x, y, w, h, r) { // barro del pantano, con charcos
    for (let i = 0; i < (w * h) / 2600; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(50,60,40,.3)' : 'rgba(24,30,20,.25)';
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 8 + r() * 26, 5 + r() * 14, r() * TAU, 0, TAU);
      c.fill();
    }
    for (let i = 0; i < (w * h) / 9000; i++) {
      c.fillStyle = 'rgba(80,150,140,.28)';
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 10 + r() * 18, 6 + r() * 10, r() * TAU, 0, TAU);
      c.fill();
      c.strokeStyle = 'rgba(190,240,225,.16)';
      c.lineWidth = 1.6;
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 8 + r() * 14, 4 + r() * 8, 0, 0, TAU);
      c.stroke();
    }
  },
  water(c, x, y, w, h, r) { // vado: agua somera por la que se puede cruzar
    for (let i = 0; i < (w * h) / 1400; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(120,205,200,.16)' : 'rgba(40,90,105,.2)';
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 12 + r() * 26, 4 + r() * 10, r() * TAU, 0, TAU);
      c.fill();
    }
    c.strokeStyle = 'rgba(215,245,240,.2)';
    c.lineWidth = 2;
    for (let i = 0; i < w / 50; i++) {
      const px = x + r() * w, py = y + r() * h;
      c.beginPath();
      c.moveTo(px, py);
      c.quadraticCurveTo(px + 12, py - 5, px + 26, py);
      c.stroke();
    }
  },
  crop(c, x, y, w, h, r) { // huerto: caballones de tierra con setas en fila
    for (let ry = y + 16; ry < y + h - 18; ry += 64) {
      c.fillStyle = 'rgba(24,16,8,.3)';
      rr(c, x + 16, ry, w - 32, 34, 14);
      c.fill();
      c.fillStyle = 'rgba(255,240,210,.06)';
      rr(c, x + 16, ry, w - 32, 6, 3);
      c.fill();
      for (let px = x + 30; px < x + w - 26; px += 34) {
        const k = r();
        const cap = k > 0.66 ? '#c9573f' : k > 0.33 ? '#d9a15a' : '#a86b9c';
        c.fillStyle = 'rgba(235,225,200,.9)';
        c.fillRect(px - 2, ry + 14, 4, 10);
        c.fillStyle = cap;
        dome(c, px, ry + 15, 11, 9);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.28)';
        c.beginPath();
        c.arc(px - 3.5, ry + 11, 2, 0, TAU);
        c.fill();
      }
    }
  },
  cave(c, x, y, w, h, r) { // roca de la cueva, con vetas y cristales
    for (let i = 0; i < (w * h) / 2400; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.16)';
      c.beginPath();
      c.moveTo(x + r() * w, y + r() * h);
      for (let k = 0; k < 4; k++) c.lineTo(x + r() * w, y + r() * h);
      c.closePath();
      c.fill();
    }
    c.strokeStyle = 'rgba(150,190,200,.14)';
    c.lineWidth = 2;
    for (let i = 0; i < (w * h) / 12000; i++) {
      const px = x + r() * w, py = y + r() * h;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + r() * 40 - 20, py + r() * 26 - 13);
      c.stroke();
      c.fillStyle = 'rgba(150,225,235,.3)';
      c.beginPath();
      c.arc(px, py, 2.4, 0, TAU);
      c.fill();
    }
  },
  glow(c, x, y, w, h, r) { // suelo bioluminiscente de la estación de energía
    for (let i = 0; i < (w * h) / 2000; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(80,225,215,.1)' : 'rgba(150,120,240,.12)';
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 10 + r() * 30, 7 + r() * 18, r() * TAU, 0, TAU);
      c.fill();
    }
    c.strokeStyle = 'rgba(130,240,230,.22)';
    c.lineWidth = 2.4;
    for (let i = 0; i < (w * h) / 11000; i++) {
      const px = x + r() * w, py = y + r() * h;
      c.beginPath();
      c.moveTo(px, py);
      c.bezierCurveTo(px + 20, py + 14, px + 40, py - 14, px + 62, py + r() * 8 - 4);
      c.stroke();
    }
  },
  mill(c, x, y, w, h, r) { // molino: tablones con polvo de seta
    MICELARIA_TEX.planks(c, x, y, w, h, r);
    for (let i = 0; i < (w * h) / 2600; i++) {
      c.fillStyle = 'rgba(240,232,205,.13)';
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 6 + r() * 20, 4 + r() * 12, r() * TAU, 0, TAU);
      c.fill();
    }
  },
  dirt(c, x, y, w, h, r) { // tierra apisonada del almacén, con paja
    c.fillStyle = 'rgba(30,22,12,.14)';
    c.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 2000; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(200,180,130,.14)' : 'rgba(0,0,0,.12)';
      c.beginPath();
      c.ellipse(x + r() * w, y + r() * h, 4 + r() * 14, 2 + r() * 6, r() * TAU, 0, TAU);
      c.fill();
    }
  },
  gill(c, x, y, w, h, r) { // dentro del sombrero de la seta madre: lamelas radiales
    const cx = x + w / 2, cy = y + h / 2, rad = Math.max(w, h) * 0.66;
    const g = c.createRadialGradient(cx, cy, 24, cx, cy, rad);
    g.addColorStop(0, '#f0dcb0');
    g.addColorStop(0.45, '#dcc191');
    g.addColorStop(1, '#9c7f52');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * TAU + 0.04 * Math.sin(i * 1.7);
      c.strokeStyle = i % 2 ? 'rgba(120,84,44,.18)' : 'rgba(255,246,220,.18)';
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
      c.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      c.stroke();
    }
    for (let i = 0; i < 90; i++) {
      c.fillStyle = `rgba(255,244,214,${0.04 + 0.16 * r()})`;
      c.beginPath();
      c.arc(x + r() * w, y + r() * h, 1 + r() * 2.6, 0, TAU);
      c.fill();
    }
    c.fillStyle = 'rgba(120,80,40,.2)';
    c.beginPath();
    c.arc(cx, cy, 34, 0, TAU);
    c.fill();
    c.restore();
  },
  clover(c, x, y, w, h, r) { // claro del bosque: hierba corta, tréboles y florecillas
    c.fillStyle = '#41603a';
    c.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 1500; i++) {
      const px = x + r() * w, py = y + r() * h;
      blade(c, px, py, 3 + r() * 4, r() > 0.5);
      if (r() > 0.9) {
        c.fillStyle = ['rgba(246,238,190,.55)', 'rgba(226,178,214,.5)', 'rgba(180,224,255,.4)'][Math.floor(r() * 3)];
        c.beginPath();
        c.arc(px + r() * 6 - 3, py + r() * 6 - 3, 1.5 + r(), 0, TAU);
        c.fill();
      }
    }
  },
  shingle(c, x, y, w, h, r) { // cascada: piedras sueltas y arena mojada
    c.fillStyle = '#4e5c58';
    c.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 800; i++) {
      const px = x + r() * w, py = y + r() * h, q = 3 + r() * 8;
      c.fillStyle = ['rgba(154,162,154,.5)', 'rgba(112,124,118,.55)', 'rgba(186,192,182,.32)'][Math.floor(r() * 3)];
      c.beginPath();
      c.ellipse(px, py, q, q * (0.55 + r() * 0.45), r() * 3, 0, TAU);
      c.fill();
    }
    for (let i = 0; i < 6; i++) {
      const px = x + r() * w, py = y + r() * h;
      c.fillStyle = 'rgba(120,200,215,.16)';
      blob(c, px, py, 14 + r() * 26, 9, i * 2.4, 0.6);
      c.fill();
    }
  },
};

export const MICELARIA_ROOM_TEX = {
  'Corazón de Seta': 'gill',            // dentro del sombrero de la seta madre
  'Casa Seta': 'planks',
  'Casa del Té': 'planks',
  'Claro de Luciérnagas': 'clover',
  'Bosque de Micelio': 'forest',
  'Puente de las Raíces': 'planks',
  'Pantano de Esporas': 'mud',
  'Cascada de Esporas': 'shingle',
  'Molino de Polvo de Seta': 'mill',
  'Huerto de Hongos': 'crop',
  'Cueva del Micelio': 'cave',
  'Almacén de la Aldea': 'dirt',
  'Estación de Energía': 'glow',
};
export const MICELARIA_DEFAULT_TEX = 'path';
export const MICELARIA_BG = '#101f16';
/* Los muros de Micelaria son arboleda: se pintan en micelariaNature, junto al terreno. */

/* ---------------- objetos del escenario ---------------- */

export const MICELARIA_OBST = {
  giant(c, w, h) { // seta gigante: el volumen que sobresale del plano
    const cw = w * 0.62;
    const cy = -h * 0.06;
    // pie
    c.fillStyle = '#e3d6b4';
    rr(c, -w * 0.1, cy + h * 0.1, w * 0.2, h * 0.42, 9);
    c.fill();
    c.fillStyle = 'rgba(120,100,70,.25)';
    rr(c, -w * 0.1, cy + h * 0.1, w * 0.05, h * 0.42, 6);
    c.fill();
    // anillo del pie
    c.fillStyle = '#cbbd97';
    rr(c, -w * 0.14, cy + h * 0.42, w * 0.28, h * 0.1, 8);
    c.fill();
    // sombrero
    c.fillStyle = '#a83f36';
    dome(c, 0, cy, cw, h * 0.34);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.22)';
    c.beginPath();
    c.ellipse(0, cy + h * 0.02, cw * 0.98, h * 0.06, 0, 0, Math.PI);
    c.fill();
    c.fillStyle = '#f6ecd2';
    for (const [dx, dy, s] of [[-0.42, -0.3, 1], [0.3, -0.36, 0.8], [0.05, -0.14, 0.62], [-0.68, -0.06, 0.5], [0.62, -0.02, 0.55]]) {
      c.beginPath();
      c.ellipse(dx * cw, cy + dy * h * 0.34, 6 * s, 4.4 * s, 0.2, 0, TAU);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.16)';
    c.beginPath();
    c.ellipse(-cw * 0.34, cy - h * 0.28, cw * 0.3, h * 0.07, -0.5, 0, TAU);
    c.fill();
    // borde inferior del sombrero: la sombra que le da volumen
    c.fillStyle = 'rgba(30,16,12,.35)';
    c.beginPath();
    c.ellipse(0, cy + h * 0.015, cw * 0.94, h * 0.05, 0, 0, TAU);
    c.fill();
    moss(c, -w * 0.28, h * 0.42, w * 0.16, h * 0.07, 0.35);
    moss(c, w * 0.32, h * 0.4, w * 0.14, h * 0.06, 0.3);
  },
  cap(c, w, h) { // sombrero grande: el tejado de las casas seta
    c.fillStyle = 'rgba(0,0,0,.25)';
    c.beginPath();
    c.ellipse(0, h * 0.34, w * 0.48, h * 0.14, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#8f4a6d';
    dome(c, 0, h * 0.3, w * 0.5, h * 0.62);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.24)';
    c.beginPath();
    c.ellipse(0, h * 0.3, w * 0.5, h * 0.1, 0, 0, Math.PI);
    c.fill();
    c.fillStyle = '#f0e2c8';
    for (const [dx, dy, s] of [[-0.3, -0.34, 1], [0.26, -0.4, 0.85], [0.02, -0.16, 0.6], [-0.62, -0.06, 0.5]]) {
      c.beginPath();
      c.ellipse(dx * w, h * 0.3 + dy * h * 0.6, 7 * s, 5 * s, 0.2, 0, TAU);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.14)';
    c.beginPath();
    c.ellipse(-w * 0.22, h * 0.3 - h * 0.36, w * 0.22, h * 0.08, -0.5, 0, TAU);
    c.fill();
    // borde del tejado, con el alero en sombra
    c.fillStyle = '#5d3350';
    rr(c, -w * 0.52, h * 0.28, w * 1.04, h * 0.1, 6);
    c.fill();
  },
  log(c, w, h) { // tronco caído con musgo y setas
    c.fillStyle = '#6a4b2c';
    rr(c, -w * 0.5, -h * 0.34, w, h * 0.68, h * 0.32);
    c.fill();
    c.fillStyle = 'rgba(255,235,200,.08)';
    rr(c, -w * 0.46, -h * 0.3, w * 0.92, h * 0.2, h * 0.15);
    c.fill();
    c.strokeStyle = 'rgba(42,26,12,.5)';
    c.lineWidth = 2;
    for (let i = 0; i < w / 60; i++) {
      const px = -w * 0.42 + i * 60;
      c.beginPath();
      c.moveTo(px, -h * 0.28);
      c.lineTo(px + 6, h * 0.28);
      c.stroke();
    }
    c.fillStyle = '#8a6a44';
    c.beginPath();
    c.ellipse(w * 0.46, 0, w * 0.06, h * 0.3, 0, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(60,40,20,.6)';
    c.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      c.beginPath();
      c.ellipse(w * 0.46, 0, w * 0.06 * (1 - i * 0.22), h * 0.3 * (1 - i * 0.22), 0, 0, TAU);
      c.stroke();
    }
    moss(c, -w * 0.2, -h * 0.28, w * 0.24, h * 0.13, 0.4);
    moss(c, w * 0.12, -h * 0.26, w * 0.16, h * 0.1, 0.3);
    c.fillStyle = '#d9a15a';
    dome(c, -w * 0.3, -h * 0.3, 9, 7);
    c.fill();
    c.fillStyle = '#e8dcbf';
    c.fillRect(-w * 0.3 - 2, -h * 0.3, 4, 9);
  },
  stump(c, w, h) { // tocón cortado
    const R = Math.min(w, h) / 2;
    c.fillStyle = '#5d4128';
    c.beginPath();
    c.arc(0, 0, R, 0, TAU);
    c.fill();
    c.fillStyle = '#9a7a4e';
    c.beginPath();
    c.arc(0, -2, R * 0.82, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(70,48,24,.7)';
    c.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      c.beginPath();
      c.arc(0, -2, R * 0.2 * i, 0, TAU);
      c.stroke();
    }
    moss(c, -R * 0.5, R * 0.3, R * 0.4, R * 0.22, 0.45);
  },
  boulder(c, w, h) { // peñasco musgoso
    c.fillStyle = '#5f665f';
    c.beginPath();
    c.moveTo(-w * 0.5, h * 0.26);
    c.lineTo(-w * 0.32, -h * 0.28);
    c.lineTo(w * 0.06, -h * 0.5);
    c.lineTo(w * 0.44, -h * 0.08);
    c.lineTo(w * 0.5, h * 0.3);
    c.lineTo(w * 0.1, h * 0.5);
    c.lineTo(-w * 0.36, h * 0.42);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)';
    c.beginPath();
    c.moveTo(-w * 0.32, -h * 0.28);
    c.lineTo(w * 0.06, -h * 0.5);
    c.lineTo(w * 0.44, -h * 0.08);
    c.lineTo(w * 0.04, -h * 0.02);
    c.closePath();
    c.fill();
    moss(c, -w * 0.16, h * 0.26, w * 0.22, h * 0.13, 0.5);
    moss(c, w * 0.2, h * 0.08, w * 0.14, h * 0.09, 0.35);
  },
  fern(c, w, h) { // helecho
    const rx = w * 0.5, ry = h * 0.5;
    c.fillStyle = '#21401f';
    c.beginPath();
    c.ellipse(0, ry * 0.3, rx * 0.9, ry * 0.7, 0, 0, TAU);
    c.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.4;
      const L = rx * (i % 2 ? 0.66 : 0.94);
      c.fillStyle = i % 2 ? '#3f7a33' : '#4f9140';
      c.beginPath();
      c.moveTo(0, ry * 0.5);
      c.quadraticCurveTo(Math.cos(a) * L * 0.5, ry * 0.1 + Math.sin(a) * L * 0.3, Math.cos(a) * L, Math.sin(a) * L * 0.7);
      c.quadraticCurveTo(Math.cos(a) * L * 0.4, ry * 0.2 + Math.sin(a) * L * 0.15, 0, ry * 0.5);
      c.fill();
    }
    c.fillStyle = 'rgba(180,225,140,.28)';
    c.beginPath();
    c.ellipse(-rx * 0.3, -ry * 0.28, rx * 0.26, ry * 0.16, -0.5, 0, TAU);
    c.fill();
  },
  glowshroom(c, w, h) { // racimo de setas luminosas
    const glow = c.createRadialGradient(0, 0, 4, 0, 0, Math.max(w, h) * 0.62);
    glow.addColorStop(0, 'rgba(120,255,235,.34)');
    glow.addColorStop(1, 'rgba(90,200,220,0)');
    c.fillStyle = glow;
    c.beginPath();
    c.arc(0, 0, Math.max(w, h) * 0.62, 0, TAU);
    c.fill();
    const list = [[-w * 0.24, h * 0.16, 0.78], [w * 0.05, h * 0.02, 1], [w * 0.3, h * 0.2, 0.66]];
    for (const [px, py, s] of list) {
      c.fillStyle = '#dff2e4';
      rr(c, px - 3.4 * s, py - 12 * s, 6.8 * s, 16 * s, 3);
      c.fill();
      c.fillStyle = '#4fe3d0';
      dome(c, px, py - 12 * s, 13 * s, 11 * s);
      c.fill();
      c.fillStyle = 'rgba(230,255,250,.75)';
      c.beginPath();
      c.arc(px - 4 * s, py - 16 * s, 2.2 * s, 0, TAU);
      c.fill();
    }
    moss(c, 0, h * 0.3, w * 0.3, h * 0.1, 0.3);
  },
  lantern(c, w, h) { // farol de la aldea
    const gy = -h * 0.16;
    c.fillStyle = '#5f4a2c';
    c.fillRect(-3, gy, 6, h * 0.62);
    c.fillStyle = 'rgba(255,235,190,.1)';
    c.fillRect(-3, gy, 2, h * 0.62);
    c.fillStyle = 'rgba(255,205,120,.22)';
    c.beginPath();
    c.arc(0, gy - 4, w * 0.5, 0, TAU);
    c.fill();
    c.fillStyle = '#4a3b24';
    rr(c, -w * 0.3, gy - 16, w * 0.6, 22, 4);
    c.fill();
    c.fillStyle = 'rgba(255,214,120,.92)';
    rr(c, -w * 0.24, gy - 12, w * 0.48, 14, 3);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)';
    rr(c, -w * 0.18, gy - 10, w * 0.18, 5, 2);
    c.fill();
    c.fillStyle = '#3f3220';
    rr(c, -w * 0.36, gy + 6, w * 0.72, 5, 2);
    c.fill();
  },
  fence(c, w, h) { // valla de madera
    c.fillStyle = '#7a5a35';
    for (let px = -w * 0.46; px <= w * 0.46; px += Math.max(40, w / 4)) {
      c.fillRect(px - 4, -h * 0.5, 8, h);
      c.fillStyle = 'rgba(255,240,200,.1)';
      c.fillRect(px - 4, -h * 0.5, 2.5, h);
      c.fillStyle = '#7a5a35';
    }
    c.fillStyle = '#8a6a44';
    rr(c, -w * 0.5, -h * 0.34, w, 7, 3);
    c.fill();
    rr(c, -w * 0.5, h * 0.1, w, 7, 3);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.22)';
    rr(c, -w * 0.5, h * 0.04, w, 3, 2);
    c.fill();
  },
  water(c, w, h) { // arroyo y charcas: no se puede cruzar por aquí
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, 'rgba(64,140,150,.9)');
    g.addColorStop(0.5, 'rgba(42,104,124,.92)');
    g.addColorStop(1, 'rgba(28,72,92,.92)');
    c.fillStyle = g;
    rr(c, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.35);
    c.fill();
    c.fillStyle = 'rgba(190,240,235,.14)';
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.ellipse(-w * 0.3 + i * w * 0.15, -h * 0.2 + (i % 3) * h * 0.2, w * 0.1, h * 0.05, 0.2, 0, TAU);
      c.fill();
    }
    c.strokeStyle = 'rgba(225,250,245,.24)';
    c.lineWidth = 2;
    for (let i = 0; i < Math.max(2, w / 90); i++) {
      const px = -w * 0.4 + i * 70, py = -h * 0.3 + (i % 3) * h * 0.3;
      c.beginPath();
      c.moveTo(px, py);
      c.quadraticCurveTo(px + 14, py - 6, px + 30, py);
      c.stroke();
    }
    c.fillStyle = '#3f7a3c';
    c.beginPath();
    c.ellipse(-w * 0.16, h * 0.12, 12, 7, 0.3, 0, TAU);
    c.fill();
    c.fillStyle = '#d989c4';
    c.beginPath();
    c.arc(-w * 0.16, h * 0.08, 4, 0, TAU);
    c.fill();
  },
  cropbed(c, w, h) { // caballón del huerto: tierra y setas en fila
    c.fillStyle = '#4a3520';
    rr(c, -w / 2, -h / 2, w, h, 16);
    c.fill();
    c.fillStyle = 'rgba(255,240,205,.07)';
    rr(c, -w / 2 + 4, -h / 2 + 3, w - 8, 7, 4);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.24)';
    rr(c, -w / 2 + 6, h / 2 - 12, w - 12, 9, 4);
    c.fill();
    const n = Math.max(2, Math.round(w / 44));
    for (let i = 0; i < n; i++) {
      const px = -w / 2 + (w / n) * (i + 0.5);
      const k = (i * 7) % 3;
      c.fillStyle = '#e6dcc4';
      c.fillRect(px - 2.5, -4, 5, 14);
      c.fillStyle = k === 0 ? '#c9573f' : k === 1 ? '#d9a15a' : '#9c6bb0';
      dome(c, px, -4, 13, 11);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.3)';
      c.beginPath();
      c.arc(px - 4, -8, 2.4, 0, TAU);
      c.fill();
    }
  },
  cart(c, w, h) { // carretilla de la cosecha
    c.fillStyle = '#7a5a35';
    rr(c, -w * 0.42, -h * 0.4, w * 0.84, h * 0.6, 7);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.2)';
    for (let px = -w * 0.38; px < w * 0.38; px += 22) c.fillRect(px, -h * 0.4, 2, h * 0.6);
    c.fillStyle = '#8a6a44';
    rr(c, -w * 0.46, -h * 0.46, w * 0.92, 7, 3);
    c.fill();
    for (const dx of [-w * 0.34, 0, w * 0.34]) {
      c.fillStyle = '#e8dcbf';
      dome(c, dx, -h * 0.42, 14, 12);
      c.fill();
      c.fillStyle = '#c9573f';
      dome(c, dx, -h * 0.46, 15, 13);
      c.fill();
    }
    c.fillStyle = '#3f3220';
    for (const dx of [-w * 0.3, w * 0.3]) {
      c.beginPath();
      c.arc(dx, h * 0.24, h * 0.18, 0, TAU);
      c.fill();
      c.fillStyle = '#8a6a44';
      c.beginPath();
      c.arc(dx, h * 0.24, h * 0.1, 0, TAU);
      c.fill();
      c.fillStyle = '#3f3220';
    }
  },
  millwheel(c, w, h) { // rueda del molino de polvo de seta
    const R = Math.min(w, h) / 2;
    c.fillStyle = '#5f4a2c';
    c.beginPath();
    c.arc(0, 0, R, 0, TAU);
    c.fill();
    c.strokeStyle = '#8a6a44';
    c.lineWidth = 7;
    c.beginPath();
    c.arc(0, 0, R - 5, 0, TAU);
    c.stroke();
    c.strokeStyle = '#cbbd97';
    c.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      c.beginPath();
      c.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
      c.lineTo(Math.cos(a) * (R - 8), Math.sin(a) * (R - 8));
      c.stroke();
    }
    c.fillStyle = '#3f3220';
    c.beginPath();
    c.arc(0, 0, R * 0.22, 0, TAU);
    c.fill();
    // aspas de madera alrededor
    c.fillStyle = '#7a5a35';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.3;
      c.save();
      c.translate(Math.cos(a) * (R + 6), Math.sin(a) * (R + 6));
      c.rotate(a);
      rr(c, -10, -6, 20, 12, 3);
      c.fill();
      c.restore();
    }
  },
  roots(c, w, h) { // raíces retorcidas
    c.strokeStyle = '#6a4b2c';
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      c.lineWidth = 12 - i * 2;
      c.beginPath();
      c.moveTo(-w * 0.5, -h * 0.3 + i * h * 0.22);
      c.bezierCurveTo(-w * 0.1, -h * 0.45 + i * h * 0.2, w * 0.15, h * 0.3 - i * h * 0.18, w * 0.5, -h * 0.1 + i * h * 0.18);
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,235,200,.1)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-w * 0.5, -h * 0.3);
    c.bezierCurveTo(-w * 0.1, -h * 0.45, w * 0.15, h * 0.3, w * 0.5, -h * 0.1);
    c.stroke();
    moss(c, -w * 0.2, h * 0.32, w * 0.24, h * 0.09, 0.4);
  },
  totem(c, w, h) { // tótem tallado de la aldea
    c.fillStyle = '#6a4b2c';
    rr(c, -w * 0.28, -h * 0.5, w * 0.56, h, 8);
    c.fill();
    c.fillStyle = 'rgba(255,235,200,.09)';
    rr(c, -w * 0.24, -h * 0.46, w * 0.16, h * 0.92, 6);
    c.fill();
    c.strokeStyle = 'rgba(42,26,12,.55)';
    c.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const yy = -h * 0.34 + i * h * 0.22;
      c.beginPath();
      c.moveTo(-w * 0.22, yy);
      c.lineTo(w * 0.22, yy);
      c.stroke();
      c.fillStyle = i % 2 ? 'rgba(120,235,225,.7)' : 'rgba(255,205,120,.6)';
      c.beginPath();
      c.arc(0, yy - h * 0.08, 3, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#8f4a6d';
    dome(c, 0, -h * 0.48, w * 0.4, h * 0.16);
    c.fill();
    moss(c, 0, h * 0.44, w * 0.34, h * 0.07, 0.4);
  },
  baskets(c, w, h) { // cestones de la cosecha apilados
    const bw = w * 0.74, bh = h * 0.34;
    for (let i = 0; i < 2; i++) {
      const y = h * 0.16 + i * bh * 0.72;
      c.fillStyle = '#a98652';
      rr(c, -bw / 2, y - bh / 2, bw, bh, 6);
      c.fill();
      c.strokeStyle = 'rgba(80,58,30,.6)';
      c.lineWidth = 2;
      for (let k = -bw / 2 + 6; k < bw / 2 - 2; k += 9) {
        c.beginPath();
        c.moveTo(k, y - bh / 2 + 3);
        c.lineTo(k, y + bh / 2 - 3);
        c.stroke();
      }
      c.fillStyle = '#e8dcbf';
      dome(c, -bw * 0.2, y - bh * 0.52, 11, 9);
      c.fill();
      c.fillStyle = '#c9573f';
      dome(c, bw * 0.14, y - bh * 0.52, 13, 11);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.3)';
      c.beginPath();
      c.arc(-bw * 0.22, y - bh * 0.56, 2.4, 0, TAU);
      c.fill();
    }
  },
};

/* ---------------- objetos de las tareas ---------------- */

export const MICELARIA_PROPS = {
  tray(c, w, h) { // cesta de mimbre con esporas
    c.fillStyle = '#a98652';
    rr(c, -w / 2, -h / 2, w, h, 8);
    c.fill();
    c.strokeStyle = 'rgba(80,58,30,.65)';
    c.lineWidth = 2;
    for (let i = -w / 2 + 6; i < w / 2 - 2; i += 8) {
      c.beginPath();
      c.moveTo(i, -h / 2 + 3);
      c.lineTo(i, h / 2 - 3);
      c.stroke();
    }
    c.strokeStyle = 'rgba(90,66,36,.8)';
    c.lineWidth = 3;
    rr(c, -w / 2, -h / 2, w, h, 8);
    c.stroke();
    for (let i = 0; i < 3; i++) {
      const px = -w / 2 + 14 + i * ((w - 28) / 2);
      c.fillStyle = '#e8dcbf';
      dome(c, px, -2 + i * 4, 8, 7);
      c.fill();
      c.fillStyle = ['#c9573f', '#4fe3d0', '#d9a15a'][i];
      dome(c, px, -4 + i * 4, 9, 8);
      c.fill();
    }
  },
  crate(c, w, h) { // caja de madera con el sello de la aldea
    c.fillStyle = '#8a6a44';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.18)';
    for (let px = -w / 2; px < w / 2; px += 15) c.fillRect(px, -h / 2, 2.5, h);
    c.fillStyle = 'rgba(255,240,200,.08)';
    c.fillRect(-w / 2, -h / 2, w, 4);
    c.strokeStyle = 'rgba(56,38,18,.6)';
    c.lineWidth = 3;
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.stroke();
    c.fillStyle = '#e8dcbf';
    dome(c, 4, 4, 9, 7);
    c.fill();
    c.fillStyle = '#c9573f';
    dome(c, 4, 2, 10, 8);
    c.fill();
  },
  bench(c, w, h) { // banco de taller
    c.fillStyle = '#6a4b2c';
    rr(c, -w / 2, -h / 2, w, h, 5);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.2)';
    for (let px = -w / 2; px < w / 2; px += 20) c.fillRect(px, -h / 2, 2, h);
    c.fillStyle = '#cbbd97';
    rr(c, -w / 2 + 8, -4, 26, 5, 2);
    c.fill();
    c.fillStyle = '#5f4a2c';
    rr(c, 4, -6, 22, 4, 2);
    c.fill();
    c.fillStyle = '#d9a15a';
    dome(c, w / 2 - 14, 2, 8, 7);
    c.fill();
    c.fillStyle = '#4fe3d0';
    c.beginPath();
    c.arc(-w / 2 + 12, h / 2 - 9, 4, 0, TAU);
    c.fill();
  },
  table(c, w, h) { // mesa con cuencos de setas
    c.fillStyle = '#4a3520';
    rr(c, -w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 9);
    c.fill();
    c.fillStyle = '#8a6a44';
    rr(c, -w / 2, -h / 2, w, h, 7);
    c.fill();
    c.fillStyle = 'rgba(255,240,200,.1)';
    rr(c, -w / 2 + 3, -h / 2 + 3, w - 6, 5, 3);
    c.fill();
    for (const dx of [-w / 4, w / 4]) {
      c.fillStyle = '#e8dcbf';
      c.beginPath();
      c.ellipse(dx, 0, 11, 8, 0, 0, TAU);
      c.fill();
      c.fillStyle = '#c9573f';
      c.beginPath();
      c.ellipse(dx, 0, 7, 5, 0, 0, TAU);
      c.fill();
    }
  },
  valve(c, w, h) { // válvula de raíz
    c.strokeStyle = '#6a4b2c';
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(0, -h / 2);
    c.lineTo(0, h / 2);
    c.stroke();
    c.fillStyle = '#4a3520';
    rr(c, -16, -h / 2 + 2, 32, 11, 4);
    c.fill();
    rr(c, -16, h / 2 - 13, 32, 11, 4);
    c.fill();
    const R = Math.min(w, h) / 2 - 4;
    c.fillStyle = '#5f4a2c';
    c.beginPath();
    c.arc(0, 0, R, 0, TAU);
    c.fill();
    c.strokeStyle = '#cbbd97';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, R - 3, 0, TAU);
    c.stroke();
    c.strokeStyle = '#8a6a44';
    c.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * R, Math.sin(a) * R);
      c.stroke();
    }
    c.fillStyle = '#4fe3d0';
    c.beginPath();
    c.arc(0, 0, 3.6, 0, TAU);
    c.fill();
  },
  filter(c, w, h) { // filtro de raíces tejidas
    c.fillStyle = '#8a6a44';
    c.beginPath();
    c.arc(0, 0, Math.min(w, h) / 2, 0, TAU);
    c.fill();
    c.fillStyle = '#4a3520';
    c.beginPath();
    c.arc(0, 0, Math.min(w, h) / 2 - 5, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(210,190,150,.45)';
    c.lineWidth = 2;
    for (let i = -Math.min(w, h) / 2 + 6; i <= Math.min(w, h) / 2 - 6; i += 7) {
      c.beginPath();
      c.moveTo(i, -Math.min(w, h) / 2 + 8);
      c.lineTo(i, Math.min(w, h) / 2 - 8);
      c.stroke();
      c.beginPath();
      c.moveTo(-Math.min(w, h) / 2 + 8, i);
      c.lineTo(Math.min(w, h) / 2 - 8, i);
      c.stroke();
    }
    c.fillStyle = 'rgba(120,235,225,.4)';
    c.beginPath();
    c.arc(2, 3, 7, 0, TAU);
    c.fill();
    c.fillStyle = '#cbbd97';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      c.beginPath();
      c.arc(Math.cos(a) * (Math.min(w, h) / 2 - 3), Math.sin(a) * (Math.min(w, h) / 2 - 3), 2.4, 0, TAU);
      c.fill();
    }
  },
  terminal(c, w, h) { // piedra rúnica
    c.fillStyle = '#6b6f66';
    rr(c, -w / 2, -h / 2, w, h, 10);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.09)';
    rr(c, -w / 2 + 4, -h / 2 + 4, w - 8, h / 2, 8);
    c.fill();
    for (let i = 0; i < 3; i++) {
      c.strokeStyle = 'rgba(120,240,230,.85)';
      c.lineWidth = 3;
      const y = -h / 2 + 13 + i * 11;
      c.beginPath();
      c.moveTo(-w / 2 + 12, y);
      c.lineTo(-w / 2 + 20, y + 5);
      c.lineTo(-w / 2 + 27, y - 4);
      c.lineTo(w / 2 - 12, y);
      c.stroke();
    }
    c.fillStyle = 'rgba(120,240,230,.22)';
    rr(c, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 8);
    c.fill();
    c.strokeStyle = 'rgba(40,44,38,.6)';
    c.lineWidth = 2;
    rr(c, -w / 2, -h / 2, w, h, 10);
    c.stroke();
  },
  panel(c, w, h) { // tabla con luciérnagas
    c.fillStyle = '#6a4b2c';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = 'rgba(255,240,200,.1)';
    rr(c, -w / 2 + 4, -h / 2 + 4, w - 8, h / 2 - 2, 4);
    c.fill();
    for (let i = 0; i < 3; i++) {
      const px = -w / 2 + 13 + i * 18;
      c.fillStyle = 'rgba(255,205,110,.32)';
      c.beginPath();
      c.arc(px, -h / 2 + 13, 8, 0, TAU);
      c.fill();
      c.fillStyle = ['#ffd86a', '#8ef0c0', '#7cd8ff'][i];
      c.beginPath();
      c.arc(px, -h / 2 + 13, 3.4, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#4a3520';
    rr(c, -w / 2 + 6, h / 2 - 12, w - 12, 8, 3);
    c.fill();
    c.strokeStyle = 'rgba(48,32,14,.55)';
    c.lineWidth = 2;
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.stroke();
  },
  lamp(c, w, h) { // farol de hongo luminoso
    c.fillStyle = '#5f4a2c';
    rr(c, -w / 2 + 4, -h / 2, w - 8, h, 5);
    c.fill();
    const g = c.createLinearGradient(0, -h / 2 + 8, 0, h / 2 - 6);
    g.addColorStop(0, 'rgba(190,255,240,.95)');
    g.addColorStop(0.5, 'rgba(120,240,225,.85)');
    g.addColorStop(1, 'rgba(60,190,205,.9)');
    c.fillStyle = g;
    rr(c, -w / 2 + 9, -h / 2 + 8, w - 18, h - 20, 8);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.fillRect(-w / 2 + 13, -h / 2 + 13, 3, h - 32);
    c.fillStyle = 'rgba(120,240,225,.2)';
    c.beginPath();
    c.ellipse(0, 0, w * 0.9, h * 0.7, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#4a3520';
    rr(c, -w / 2 + 2, h / 2 - 12, w - 4, 12, 4);
    c.fill();
  },
  switchbox(c, w, h) { // palancas de madera
    c.fillStyle = '#6a4b2c';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = '#4a3520';
    rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 4);
    c.fill();
    for (let i = 0; i < 4; i++) {
      const px = -w / 2 + 10 + i * ((w - 20) / 3);
      c.fillStyle = '#cbbd97';
      rr(c, px - 3, -6, 6, 14, 3);
      c.fill();
      c.fillStyle = i === 1 ? '#ffd86a' : '#7cd8ff';
      c.beginPath();
      c.arc(px, 7, 2.6, 0, TAU);
      c.fill();
    }
    c.strokeStyle = 'rgba(48,32,14,.5)';
    c.lineWidth = 2;
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.stroke();
  },
  scale(c, w, h) { // balanza de madera
    c.fillStyle = '#5f4a2c';
    rr(c, -6, -h / 2, 12, h - 8, 4);
    c.fill();
    c.fillStyle = '#8a6a44';
    rr(c, -w / 2, -h / 2, w, 7, 3);
    c.fill();
    for (const dx of [-w * 0.32, w * 0.32]) {
      c.strokeStyle = 'rgba(200,190,150,.5)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(dx, -h / 2 + 4);
      c.lineTo(dx, -h / 2 + 16);
      c.stroke();
      c.fillStyle = '#a98652';
      c.beginPath();
      c.ellipse(dx, -h / 2 + 20, 14, 6, 0, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#c9573f';
    dome(c, w * 0.32, -h / 2 + 14, 8, 7);
    c.fill();
    c.fillStyle = '#e8dcbf';
    dome(c, -w * 0.32, -h / 2 + 14, 7, 6);
    c.fill();
    c.fillStyle = '#4a3520';
    rr(c, -w / 2 + 10, h / 2 - 12, w - 20, 12, 4);
    c.fill();
  },
  keypad(c, w, h) { // piedra con teclas talladas
    c.fillStyle = '#6b6f66';
    rr(c, -w / 2, -h / 2, w, h, 8);
    c.fill();
    c.fillStyle = '#2c322c';
    rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, 11, 3);
    c.fill();
    c.fillStyle = 'rgba(120,240,230,.9)';
    c.fillRect(-w / 2 + 8, -h / 2 + 9, 11, 3);
    for (let r2 = 0; r2 < 4; r2++) {
      for (let k = 0; k < 3; k++) {
        c.fillStyle = (r2 + k) % 3 === 0 ? 'rgba(230,120,110,.85)' : 'rgba(190,185,160,.75)';
        rr(c, -w / 2 + 7 + k * 10, -h / 2 + 21 + r2 * 7, 9, 6, 2);
        c.fill();
      }
    }
    c.strokeStyle = 'rgba(40,44,38,.6)';
    c.lineWidth = 2;
    rr(c, -w / 2, -h / 2, w, h, 8);
    c.stroke();
  },
  machine(c, w, h) { // molino de polvo de seta
    c.fillStyle = '#7a5a35';
    rr(c, -w / 2, -h / 2, w, h, 8);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.18)';
    for (let px = -w / 2; px < w / 2; px += 18) c.fillRect(px, -h / 2, 2.5, h);
    c.fillStyle = '#cbbd97';
    c.beginPath();
    c.moveTo(-w * 0.2, -h / 2);
    c.lineTo(w * 0.2, -h / 2);
    c.lineTo(w * 0.3, -h * 0.16);
    c.lineTo(-w * 0.3, -h * 0.16);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(240,232,205,.85)';
    c.beginPath();
    c.ellipse(0, -h * 0.16, w * 0.3, 5, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#5f4a2c';
    c.beginPath();
    c.arc(w * 0.26, h * 0.26, 11, 0, TAU);
    c.fill();
    c.strokeStyle = '#cbbd97';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(w * 0.26, h * 0.26, 8, 0, TAU);
    c.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      c.beginPath();
      c.moveTo(w * 0.26, h * 0.26);
      c.lineTo(w * 0.26 + Math.cos(a) * 8, h * 0.26 + Math.sin(a) * 8);
      c.stroke();
    }
    c.fillStyle = '#4fe3d0';
    c.beginPath();
    c.arc(-w * 0.3, h * 0.3, 3, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(48,32,14,.5)';
    c.lineWidth = 2;
    rr(c, -w / 2, -h / 2, w, h, 8);
    c.stroke();
  },
  radio(c, w, h) { // cuerno de llamada
    c.fillStyle = '#8a6a44';
    c.beginPath();
    c.moveTo(-w / 2, -h * 0.3);
    c.quadraticCurveTo(w * 0.1, -h * 0.5, w / 2, -h * 0.34);
    c.quadraticCurveTo(w * 0.1, -h * 0.04, -w / 2, h * 0.06);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(56,38,18,.5)';
    c.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(-w * 0.28, -h * 0.12, 10 + i * 7, -0.9, 0.9);
      c.stroke();
    }
    c.fillStyle = '#5f4a2c';
    rr(c, -w / 2 - 2, -h * 0.34, 14, h * 0.44, 4);
    c.fill();
    c.fillStyle = '#4fe3d0';
    c.beginPath();
    c.arc(w / 2 - 6, -h * 0.3, 4, 0, TAU);
    c.fill();
    moss(c, w * 0.1, h * 0.1, w * 0.2, h * 0.08, 0.3);
  },
  glass(c, w, h) { // cristal con marco de raíces
    c.fillStyle = '#6a4b2c';
    rr(c, -w / 2, -h / 2, w, h, 4);
    c.fill();
    c.fillStyle = 'rgba(190,240,240,.34)';
    rr(c, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 3);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.24)';
    c.beginPath();
    c.arc(-6, 0, 4, 0, TAU);
    c.arc(8, 1, 3, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.4)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-w / 2 + 6, h / 2 - 5);
    c.lineTo(-2, -h / 2 + 5);
    c.stroke();
    moss(c, -w / 2 + 8, h / 2 - 4, 7, 3.4, 0.5);
    c.strokeStyle = 'rgba(48,32,14,.5)';
    c.lineWidth = 2;
    rr(c, -w / 2, -h / 2, w, h, 4);
    c.stroke();
  },
  compost(c, w, h) { // montón de abono con setas
    c.fillStyle = '#3f2c18';
    rr(c, -w / 2, -h / 2, w, h, 12);
    c.fill();
    c.fillStyle = 'rgba(120,160,90,.5)';
    c.beginPath();
    c.ellipse(-2, h / 4, w / 2 - 5, h / 3, 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(96,72,44,.75)';
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.ellipse(-w / 2 + 8 + ((i * 41) % (w - 16)), -h / 2 + 8 + ((i * 57) % (h - 16)), 4.4, 3.2, i, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#e8dcbf';
    c.fillRect(-w * 0.2 - 2, -h / 2 + 8, 4, 10);
    c.fillStyle = '#c9573f';
    dome(c, -w * 0.2, -h / 2 + 8, 9, 8);
    c.fill();
    c.fillStyle = '#4fe3d0';
    dome(c, w * 0.18, -h / 2 + 12, 7, 6);
    c.fill();
    c.strokeStyle = '#8a6a44';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(w / 2 - 12, -h / 2);
    c.lineTo(w / 4, h / 2 - 6);
    c.stroke();
    c.strokeStyle = 'rgba(48,32,14,.5)';
    c.lineWidth = 2;
    rr(c, -w / 2, -h / 2, w, h, 12);
    c.stroke();
  },
  cables(c, w, h) { // lianas colgantes
    for (let i = 0; i < 3; i++) {
      const px = -w / 2 + 14 + i * 11;
      c.strokeStyle = ['#4f9140', '#3f7a55', '#7fae4a'][i];
      c.lineWidth = 3.4;
      c.beginPath();
      c.moveTo(px, -h / 2 - 12);
      c.bezierCurveTo(px + 8, -h / 2 - 2, px - 8, -h / 2 + 6, px, -h / 2 + 12);
      c.stroke();
    }
    c.fillStyle = '#4a3520';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = '#2f2412';
    rr(c, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 4);
    c.fill();
    for (let i = 0; i < 3; i++) {
      const px = -w / 2 + 14 + i * 11;
      c.fillStyle = ['#8ef0c0', '#7cd8ff', '#ffd86a'][i];
      c.beginPath();
      c.arc(px, -h / 2 + 14, 3.4, 0, TAU);
      c.fill();
    }
    c.strokeStyle = 'rgba(48,32,14,.5)';
    c.lineWidth = 2;
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.stroke();
  },
};

/* ---------------- aparatos: botón, panel y corazón de micelio ---------------- */

export function micelariaButton(ctx, bx, by, T, used, blocked) {
  const off = used || blocked;
  const glow = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(T * 3));
  ctx.save();
  // círculo de tierra apisonada
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(bx, by + 14, 30, 12, 0, 0, TAU);
  ctx.fill();
  // pedestal de piedra con raíces
  ctx.fillStyle = '#6b6f66';
  rr(ctx, bx - 24, by - 10, 48, 30, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.1)';
  rr(ctx, bx - 20, by - 7, 40, 9, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,54,40,.5)';
  ctx.lineWidth = 2;
  rr(ctx, bx - 24, by - 10, 48, 30, 8);
  ctx.stroke();
  // la seta de la reunión, que late mientras está disponible
  ctx.globalAlpha = off ? 0.55 : 1;
  ctx.fillStyle = '#e8dcbf';
  rr(ctx, bx - 8, by - 20, 16, 16, 7);
  ctx.fill();
  ctx.fillStyle = off ? '#5a3038' : '#e63946';
  dome(ctx, bx, by - 20, 20, 16);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.arc(bx - 7, by - 27, 3.2, 0, TAU);
  ctx.arc(bx + 6, by - 24, 2.4, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = '800 11px system-ui';
  ctx.textAlign = 'center';
  if (off) {
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - 8, by - 30);
    ctx.lineTo(bx + 8, by - 12);
    ctx.moveTo(bx + 8, by - 30);
    ctx.lineTo(bx - 8, by - 12);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.fillText(blocked ? 'BLOQUEADA' : 'USADA', bx, by + 34);
  } else {
    ctx.globalAlpha = glow;
    ctx.strokeStyle = '#ffd86a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by - 18, 26, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.fillText('REUNIÓN', bx, by + 34);
  }
  ctx.restore();
}

// panel de luciérnagas: aquí se reparan las luces de la aldea
export function micelariaPanel(c, p) {
  if (!p) return;
  c.save();
  c.translate(p.x, p.y);
  c.fillStyle = 'rgba(0,0,0,.4)';
  rr(c, -33, -21, 72, 60, 10);
  c.fill();
  c.fillStyle = '#6a4b2c';
  rr(c, -36, -30, 72, 62, 10);
  c.fill();
  c.fillStyle = 'rgba(255,240,200,.1)';
  rr(c, -32, -26, 64, 20, 7);
  c.fill();
  c.strokeStyle = 'rgba(48,32,14,.5)';
  c.lineWidth = 2;
  for (let i = -26; i <= 26; i += 13) {
    c.beginPath();
    c.moveTo(i, 26);
    c.lineTo(i + 3, 8);
    c.stroke();
  }
  // nidos de luciérnagas
  for (let i = 0; i < 3; i++) {
    const bx = -22 + i * 22;
    c.fillStyle = 'rgba(255,214,120,.25)';
    c.beginPath();
    c.arc(bx, -12, 12, 0, TAU);
    c.fill();
    c.fillStyle = '#2f2412';
    rr(c, bx - 9, -22, 18, 26, 7);
    c.fill();
    c.fillStyle = i === 2 ? '#ffd86a' : ['#8ef0c0', '#7cd8ff'][i];
    c.beginPath();
    c.arc(bx, -10, 5, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)';
    c.beginPath();
    c.arc(bx - 2, -12, 1.8, 0, TAU);
    c.fill();
  }
  // placa tallada
  c.fillStyle = '#3f3220';
  rr(c, -30, 6, 28, 15, 4);
  c.fill();
  c.fillStyle = '#8ef0c0';
  c.fillRect(-26, 10, 18, 3);
  c.fillRect(-26, 15, 12, 3);
  moss(c, -36, 24, 12, 6, 0.4);
  moss(c, 34, -18, 10, 6, 0.3);
  c.font = '800 11px system-ui';
  c.textAlign = 'center';
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.fillText('LUCES', 0, 42);
  c.restore();
}

// corazón de micelio: el núcleo del sabotaje, y las dos consolas de raíz
function micelariaConsole(c, pt) {
  c.save();
  c.translate(pt.x, pt.y);
  c.fillStyle = 'rgba(0,0,0,.34)';
  rr(c, -20, -18, 46, 44, 10);
  c.fill();
  c.fillStyle = '#5f4a2c';
  rr(c, -25, -26, 50, 46, 10);
  c.fill();
  c.fillStyle = 'rgba(255,240,200,.1)';
  rr(c, -21, -22, 42, 14, 6);
  c.fill();
  for (let i = 0; i < 3; i++) {
    c.fillStyle = '#3f3220';
    rr(c, -19 + i * 14, -20, 10, 18, 3);
    c.fill();
  }
  c.font = '900 13px system-ui';
  c.textAlign = 'center';
  c.fillStyle = '#8ef0c0';
  c.fillText(String(pt.side || '').toUpperCase(), 0, 8);
  c.fillStyle = pt.side === 'a' ? '#e63946' : '#4361ee';
  c.beginPath();
  c.arc(0, 18, 8, 0, TAU);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)';
  c.beginPath();
  c.arc(-2.5, 15.5, 2.6, 0, TAU);
  c.fill();
  c.strokeStyle = 'rgba(48,32,14,.5)';
  c.lineWidth = 2;
  rr(c, -24, -25, 48, 44, 10);
  c.stroke();
  c.restore();
}

export function micelariaReactor(c, core, pts) {
  if (core) {
    c.save();
    c.translate(core.x, core.y);
    c.fillStyle = 'rgba(0,0,0,.42)';
    rr(c, -70, -36, 148, 80, 14);
    c.fill();
    // raíces que salen del corazón
    c.strokeStyle = '#6a4b2c';
    c.lineCap = 'round';
    for (const [dx, dy, tx, ty] of [[-70, -8, -98, -18], [70, -8, 98, -18], [-60, 26, -92, 34], [60, 26, 92, 34]]) {
      c.lineWidth = 9;
      c.beginPath();
      c.moveTo(dx, dy);
      c.lineTo(tx, ty);
      c.stroke();
    }
    // bulbo luminoso
    c.fillStyle = '#3f3220';
    c.beginPath();
    c.ellipse(0, 26, 76, 16, 0, 0, TAU);
    c.fill();
    const halo = c.createRadialGradient(0, -4, 6, 0, -4, 62);
    halo.addColorStop(0, 'rgba(150,255,235,.5)');
    halo.addColorStop(1, 'rgba(80,200,220,0)');
    c.fillStyle = halo;
    c.beginPath();
    c.arc(0, -4, 62, 0, TAU);
    c.fill();
    c.fillStyle = '#e8dcbf';
    rr(c, -22, 6, 44, 26, 12);
    c.fill();
    c.fillStyle = '#5f4a2c';
    dome(c, 0, 2, 58, 44);
    c.fill();
    const gr = c.createRadialGradient(0, -6, 4, 0, -6, 26);
    gr.addColorStop(0, 'rgba(240,255,250,.95)');
    gr.addColorStop(1, 'rgba(90,225,215,.5)');
    c.fillStyle = gr;
    c.beginPath();
    c.arc(0, -4, 18, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath();
    c.arc(-8, -12, 4, 0, TAU);
    c.arc(7, -6, 3, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(48,32,14,.5)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.ellipse(0, 2, 58, 44, 0, Math.PI, 0);
    c.stroke();
    c.font = '800 12px system-ui';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(255,255,255,.7)';
    c.fillText('CORAZÓN DE MICELIO', 0, 44);
    c.restore();
  }
  for (const pt of pts || []) micelariaConsole(c, pt);
}

export function micelariaReactorLive(c, meta, rx, T) {
  if (!meta || !meta.core) return;
  const pulse = 0.5 + 0.5 * Math.sin(T * 6);
  c.save();
  c.translate(meta.core.x, meta.core.y);
  c.globalAlpha = 0.3 + 0.5 * pulse;
  c.fillStyle = '#ff4d5e';
  c.beginPath();
  c.arc(0, -4, 18, 0, TAU);
  c.fill();
  c.globalAlpha = 1;
  c.restore();
  if (rx.hold > 0) {
    const p = Math.min(1, rx.hold / (meta.hold || 1));
    c.save();
    c.strokeStyle = '#8ef0c0';
    c.lineWidth = 7;
    c.beginPath();
    c.arc(meta.core.x, meta.core.y, 66, -Math.PI / 2, -Math.PI / 2 + TAU * p);
    c.stroke();
    c.restore();
  }
  for (const pt of meta.pts || []) {
    const held = !!rx[pt.side];
    c.save();
    c.globalAlpha = held ? 0.95 : 0.3 + 0.55 * pulse;
    c.strokeStyle = held ? '#8ef0c0' : '#ff4d5e';
    c.lineWidth = 4;
    rr(c, pt.x - 30, pt.y - 32, 60, 58, 12);
    c.stroke();
    c.restore();
  }
}

// puerta de una sala: tablones y raíces que tapan el hueco del muro
export function micelariaDoor(c, d) {
  const vertical = d.h >= d.w;
  const n = Math.max(2, Math.round((vertical ? d.h : d.w) / 20));
  c.save();
  c.fillStyle = '#6a4b2c';
  c.fillRect(d.x, d.y, d.w, d.h);
  c.fillStyle = 'rgba(255,240,200,.12)';
  for (let i = 0; i < n; i++) {
    if (vertical) c.fillRect(d.x, d.y + (i * d.h) / n + 1, d.w, (d.h / n) * 0.42);
    else c.fillRect(d.x + (i * d.w) / n + 1, d.y, (d.w / n) * 0.42, d.h);
  }
  c.strokeStyle = 'rgba(40,26,10,.7)';
  c.lineWidth = 3;
  c.beginPath();
  for (let i = 0; i < 3; i++) {
    if (vertical) {
      c.moveTo(d.x, d.y + (d.h / 3) * i);
      c.bezierCurveTo(d.x + d.w * 0.6, d.y + (d.h / 3) * i + 8, d.x + d.w * 0.4, d.y + (d.h / 3) * i - 8, d.x + d.w, d.y + (d.h / 3) * i);
    } else {
      c.moveTo(d.x + (d.w / 3) * i, d.y);
      c.bezierCurveTo(d.x + (d.w / 3) * i + 8, d.y + d.h * 0.6, d.x + (d.w / 3) * i - 8, d.y + d.h * 0.4, d.x + (d.w / 3) * i, d.y + d.h);
    }
  }
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.55)';
  c.lineWidth = 2;
  c.strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
  c.strokeStyle = 'rgba(230,57,70,.6)';
  c.beginPath();
  if (vertical) { c.moveTo(d.x + d.w / 2, d.y + 4); c.lineTo(d.x + d.w / 2, d.y + d.h - 4); }
  else { c.moveTo(d.x + 4, d.y + d.h / 2); c.lineTo(d.x + d.w - 4, d.y + d.h / 2); }
  c.stroke();
  c.restore();
}