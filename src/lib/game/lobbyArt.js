/* Dibujo de la sala de espera: una cabaña de madera con un ordenador (ajustes de la partida) y un
   armario (color del seta). Usa las mismas piezas que Micelaria (entarimado, estantes, bancos,
   macetas) y añade los dos aparatos propios. Cada pintor dibuja centrado en (0, 0) con la caja
   (w, h) que usa el servidor para chocar. */

const TAU = Math.PI * 2;

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export const LOBBY_BG = '#1d140c';

/* Muro de la cabaña: tablones de madera oscura. Es el estilo "liso" de los muros del juego. */
export const LOBBY_WALL = {
  base: '#3b2a1a', alt1: 'rgba(255,225,170,.045)', alt2: 'rgba(0,0,0,.09)', line: 'rgba(0,0,0,.34)',
  top: '#6d4d2f', topHi: 'rgba(255,230,190,.16)', bottom: 'rgba(0,0,0,.42)', side: '#58402a',
  moss: 'rgba(0,0,0,0)', rivet: false, round: false,
};

/* Lo que rodea al suelo: troncos verticales, con ventanas en el muro del norte. */
export function lobbyGround(c, world, r) {
  c.fillStyle = '#2a1d12';
  c.fillRect(0, 0, world.w, world.h);
  for (let x = 0; x < world.w; x += 36) {
    c.fillStyle = r() > 0.5 ? 'rgba(255,225,170,.05)' : 'rgba(0,0,0,.14)';
    c.fillRect(x, 0, 36, world.h);
    c.fillStyle = 'rgba(0,0,0,.3)';
    c.fillRect(x, 0, 2, world.h);
  }
  // ventanas con luz cálida en el muro del norte
  for (const wx of [250, 700, 1150]) {
    c.fillStyle = 'rgba(0,0,0,.45)';
    rr(c, wx - 64, 18, 128, 58, 7);
    c.fill();
    const g = c.createLinearGradient(0, 22, 0, 72);
    g.addColorStop(0, '#fbe3a1');
    g.addColorStop(1, '#e0a24b');
    c.fillStyle = g;
    rr(c, wx - 58, 23, 116, 48, 5);
    c.fill();
    c.fillStyle = '#4b331e';
    c.fillRect(wx - 2, 23, 4, 48);
    c.fillRect(wx - 58, 45, 116, 4);
    c.fillStyle = 'rgba(255,255,255,.28)';
    c.fillRect(wx - 54, 26, 20, 6);
  }
}

/* Alfombra del centro, entre el ordenador y el armario: un corro donde se junta la gente. */
export function lobbyDecor(c, floors, r) {
  const cx = 700, cy = 470;
  c.save();
  c.fillStyle = 'rgba(0,0,0,.22)';
  c.beginPath(); c.ellipse(cx + 4, cy + 8, 330, 190, 0, 0, TAU); c.fill();
  c.fillStyle = '#7b2f2a';
  c.beginPath(); c.ellipse(cx, cy, 326, 186, 0, 0, TAU); c.fill();
  c.strokeStyle = '#e9c46a';
  c.lineWidth = 5;
  c.beginPath(); c.ellipse(cx, cy, 306, 170, 0, 0, TAU); c.stroke();
  c.fillStyle = '#9a413a';
  c.beginPath(); c.ellipse(cx, cy, 282, 152, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(240,215,160,.5)';
  c.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * 190, cy + Math.sin(a) * 104);
    c.lineTo(cx + Math.cos(a) * 270, cy + Math.sin(a) * 146);
    c.stroke();
  }
  // flecos de los extremos
  c.strokeStyle = '#e8d6a8';
  c.lineWidth = 2;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * 326, cy + Math.sin(a) * 186);
    c.lineTo(cx + Math.cos(a) * 340, cy + Math.sin(a) * 195);
    c.stroke();
  }
  c.restore();
}

/* Sin reactor, cuadro eléctrico ni puertas: la sala de espera no los usa. */
export const noop = () => {};

export const LOBBY_OBST = {
  // el ordenador de la partida: un escritorio con monitor, teclado y una taza
  computer(c, w, h) {
    const x0 = -w / 2, y0 = -h / 2;
    // escritorio
    c.fillStyle = '#5c3d22';
    rr(c, x0, y0 + 18, w, h - 18, 8);
    c.fill();
    c.fillStyle = '#7f5632';
    rr(c, x0, y0 + 18, w, h - 34, 8);
    c.fill();
    c.fillStyle = 'rgba(255,230,190,.14)';
    c.fillRect(x0 + 6, y0 + 21, w - 12, 3);
    // cajón
    c.fillStyle = 'rgba(0,0,0,.2)';
    rr(c, x0 + w * 0.58, y0 + h - 30, w * 0.32, 20, 4);
    c.fill();
    c.fillStyle = '#e9c46a';
    c.fillRect(x0 + w * 0.74 - 6, y0 + h - 22, 12, 3);
    // monitor
    c.fillStyle = 'rgba(0,0,0,.35)';
    rr(c, -50, y0 - 12, 104, 66, 8);
    c.fill();
    c.fillStyle = '#26302c';
    rr(c, -52, y0 - 16, 104, 66, 8);
    c.fill();
    const g = c.createLinearGradient(0, y0 - 10, 0, y0 + 40);
    g.addColorStop(0, '#9af7c0');
    g.addColorStop(1, '#3fae7b');
    c.fillStyle = g;
    rr(c, -45, y0 - 10, 90, 52, 5);
    c.fill();
    // el monitor enseña tres ajustes con su deslizador
    c.strokeStyle = 'rgba(10,50,30,.75)';
    c.lineWidth = 3;
    c.fillStyle = 'rgba(10,50,30,.85)';
    [[-0.1, 0.3], [0.1, 0.7], [0.3, 0.5]].forEach(([ty, k]) => {
      const yy = y0 + 12 + ty * 52 * 0.6 + 6;
      c.beginPath(); c.moveTo(-34, yy); c.lineTo(34, yy); c.stroke();
      c.beginPath(); c.arc(-34 + 68 * k, yy, 4.5, 0, TAU); c.fill();
    });
    c.fillStyle = 'rgba(255,255,255,.2)';
    c.beginPath(); c.moveTo(-45, y0 - 10); c.lineTo(-8, y0 - 10); c.lineTo(-30, y0 + 42); c.lineTo(-45, y0 + 42); c.closePath(); c.fill();
    // pie del monitor
    c.fillStyle = '#1b2320';
    c.fillRect(-9, y0 + 50, 18, 6);
    // teclado y ratón
    c.fillStyle = '#d9d2bc';
    rr(c, -34, y0 + 52, 62, 16, 3);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.28)';
    for (let i = 0; i < 9; i++) c.fillRect(-31 + i * 6.6, y0 + 55, 4.6, 3.4);
    for (let i = 0; i < 8; i++) c.fillRect(-28 + i * 6.6, y0 + 60.5, 4.6, 3.4);
    c.fillStyle = '#d9d2bc';
    c.beginPath(); c.ellipse(46, y0 + 60, 6, 8, 0, 0, TAU); c.fill();
    // taza
    c.fillStyle = '#a83f36';
    rr(c, -w / 2 + 12, y0 + 38, 16, 16, 4);
    c.fill();
    c.strokeStyle = '#a83f36';
    c.lineWidth = 3;
    c.beginPath(); c.arc(-w / 2 + 30, y0 + 46, 4.5, -1.2, 1.2); c.stroke();
  },

  // el armario del color: dos puertas, un espejo y gorros de colores colgados
  wardrobe(c, w, h) {
    const x0 = -w / 2, y0 = -h / 2;
    // cuerpo
    c.fillStyle = '#4f351d';
    rr(c, x0 - 4, y0 - 6, w + 8, 18, 5);
    c.fill();
    c.fillStyle = '#74502d';
    rr(c, x0, y0 + 4, w, h - 8, 6);
    c.fill();
    c.fillStyle = 'rgba(255,230,190,.12)';
    c.fillRect(x0 + 4, y0 + 8, w - 8, 3);
    // puertas
    for (let i = 0; i < 2; i++) {
      const px = x0 + 8 + i * (w / 2 - 4);
      c.fillStyle = '#8a6038';
      rr(c, px, y0 + 16, w / 2 - 12, h - 40, 5);
      c.fill();
      c.strokeStyle = 'rgba(40,24,10,.5)';
      c.lineWidth = 2;
      rr(c, px + 5, y0 + 21, w / 2 - 22, h - 50, 3);
      c.stroke();
    }
    // espejo en la puerta derecha
    const g = c.createLinearGradient(0, y0 + 26, 0, y0 + h - 40);
    g.addColorStop(0, '#d8f1ff');
    g.addColorStop(1, '#8cb9d6');
    c.fillStyle = g;
    rr(c, x0 + w / 2 + 6, y0 + 28, w / 2 - 28, h - 64, 3);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath();
    c.moveTo(x0 + w / 2 + 10, y0 + 30); c.lineTo(x0 + w / 2 + 24, y0 + 30); c.lineTo(x0 + w / 2 + 10, y0 + 60); c.closePath(); c.fill();
    // gorros de colores en la puerta izquierda
    ['#e63946', '#a0c4ff', '#9ef01a', '#c084fc'].forEach((col, i) => {
      const hx = x0 + 22 + (i % 2) * 20, hy = y0 + 38 + Math.floor(i / 2) * 26;
      c.fillStyle = col;
      c.beginPath(); c.ellipse(hx, hy, 9, 7, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#f3e9d2';
      c.fillRect(hx - 3, hy, 6, 6);
    });
    // tiradores
    c.fillStyle = '#e9c46a';
    c.beginPath(); c.arc(x0 + w / 2 - 6, y0 + h / 2 + 2, 3.4, 0, TAU); c.fill();
    c.beginPath(); c.arc(x0 + w / 2 + 6, y0 + h / 2 + 2, 3.4, 0, TAU); c.fill();
    // patas
    c.fillStyle = '#3a2614';
    c.fillRect(x0 + 6, y0 + h - 8, 12, 8);
    c.fillRect(x0 + w - 18, y0 + h - 8, 12, 8);
  },
};

/* Marcas flotantes sobre los aparatos: avisan de que se pueden usar. Se dibujan encima de todo. */
export function drawStationMark(c, st, near, T, icon) {
  const bob = Math.sin(T * 3 + st.x) * 3;
  c.save();
  c.globalAlpha = near ? 0.95 : 0.6;
  c.fillStyle = near ? 'rgba(233,196,106,.28)' : 'rgba(233,196,106,.12)';
  c.beginPath();
  c.ellipse(st.x, st.y + 6, near ? 62 : 46, near ? 20 : 14, 0, 0, TAU);
  c.fill();
  c.strokeStyle = near ? '#e9c46a' : 'rgba(233,196,106,.5)';
  c.lineWidth = near ? 3 : 2;
  c.beginPath();
  c.ellipse(st.x, st.y + 6, near ? 62 : 46, near ? 20 : 14, 0, 0, TAU);
  c.stroke();
  c.globalAlpha = 1;
  c.font = '700 26px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(icon, st.x, st.y - 26 + bob);
  c.restore();
}

/* Cuando alguien entra en la sala: cae una columna de luz, el suelo se ondula en un anillo y suben
   esporas brillantes. p va de 0 a 1 durante JOIN_MS. */
export const JOIN_MS = 1700;
export function drawJoinFx(c, x, y, p) {
  const fade = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
  const rise = Math.min(1, p / 0.25); // la columna llega al suelo en el primer cuarto
  c.save();
  // columna de luz
  const top = y - 190 * rise;
  const g = c.createLinearGradient(0, top, 0, y + 6);
  g.addColorStop(0, 'rgba(255,240,170,0)');
  g.addColorStop(1, 'rgba(255,240,170,.55)');
  c.globalAlpha = fade * 0.9;
  c.fillStyle = g;
  const w = 26 * (1 - 0.35 * p);
  c.fillRect(x - w, top, w * 2, y + 6 - top);
  // anillos en el suelo
  for (let i = 0; i < 2; i++) {
    const q = Math.max(0, Math.min(1, (p - i * 0.18) / 0.7));
    if (q <= 0) continue;
    c.globalAlpha = (1 - q) * 0.9 * fade;
    c.strokeStyle = i ? '#9ef0b8' : '#ffe98a';
    c.lineWidth = 4 - 2 * q;
    c.beginPath();
    c.ellipse(x, y + 10, 16 + 70 * q, 7 + 28 * q, 0, 0, TAU);
    c.stroke();
  }
  // esporas que suben
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + i * 0.7;
    const q = Math.max(0, Math.min(1, (p - (i % 5) * 0.05) / 0.85));
    if (q <= 0) continue;
    const d = 12 + 44 * q * (0.6 + (i % 3) * 0.25);
    c.globalAlpha = (1 - q) * 0.95;
    c.fillStyle = i % 3 === 0 ? '#fff6c2' : i % 3 === 1 ? '#9ef0b8' : '#ffd36b';
    c.beginPath();
    c.arc(x + Math.cos(a) * d, y + 8 - 12 - q * (46 + (i % 4) * 14) + Math.sin(a) * d * 0.25, 2.6 * (1 - 0.5 * q), 0, TAU);
    c.fill();
  }
  c.restore();
}
