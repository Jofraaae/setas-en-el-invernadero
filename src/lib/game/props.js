import { tr } from '@/lib/i18n';
/* Objetos del invernadero: props de tareas, cajas del mapa, botón y marcadores.
   Se dibujan con la misma caja que usa el servidor para las colisiones, así que
   lo que se ve y lo que bloquea coinciden siempre. */

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

const shadow = (c, x, y, w, h, r = 8) => {
  c.fillStyle = 'rgba(0,0,0,.34)';
  rr(c, x + 3, y + 6, w, h, r);
  c.fill();
};

/* Sombra de suelo de los escenarios naturales (Micelaria): un óvalo difuso bajo el objeto.
   La caja oscura de antes hacía que todo se viera cuadrado, como si cada objeto llevase
   una peana debajo. */
const groundShadow = (c, w, h) => {
  const rx = Math.max(12, w * 0.5), ry = Math.max(5, h * 0.26), cy = h * 0.34;
  const g = c.createRadialGradient(0, cy, 1, 0, cy, rx);
  g.addColorStop(0, 'rgba(6,14,9,.5)');
  g.addColorStop(0.6, 'rgba(6,14,9,.22)');
  g.addColorStop(1, 'rgba(6,14,9,0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, cy, rx, ry, 0, 0, 7);
  c.fill();
};

const outline = (c, x, y, w, h, r = 8) => {
  c.strokeStyle = 'rgba(0,0,0,.45)';
  c.lineWidth = 2;
  rr(c, x, y, w, h, r);
  c.stroke();
};

const screws = (c, x, y, w, h, pad = 8) => {
  c.fillStyle = 'rgba(215,225,215,.32)';
  for (const [dx, dy] of [[pad, pad], [w - pad, pad], [pad, h - pad], [w - pad, h - pad]]) {
    c.beginPath();
    c.arc(x + dx, y + dy, 2, 0, 7);
    c.fill();
  }
};

/* ---------------- objetos de las tareas ---------------- */

export const ART = {
  tray(c, w, h) {
    c.fillStyle = '#6b4a29';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = '#2f2214';
    rr(c, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 4);
    c.fill();
    for (let i = 0; i < 4; i++) {
      const px = -w / 2 + 12 + i * ((w - 24) / 3);
      c.fillStyle = 'rgba(140,200,120,.92)';
      c.beginPath();
      c.arc(px, 0, 4.5, 0, 7);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.22)';
      c.beginPath();
      c.arc(px - 1.5, -1.5, 1.6, 0, 7);
      c.fill();
    }
    outline(c, -w / 2, -h / 2, w, h, 6);
  },
  cables(c, w, h) {
    for (let i = 0; i < 3; i++) {
      const px = -w / 2 + 14 + i * 11;
      c.strokeStyle = ['#e63946', '#4cc9f0', '#ffd60a'][i];
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(px, -h / 2 - 12);
      c.bezierCurveTo(px + 7, -h / 2 - 2, px - 7, -h / 2 + 6, px, -h / 2 + 12);
      c.stroke();
    }
    c.fillStyle = '#4b5560';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = '#22262c';
    rr(c, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 4);
    c.fill();
    for (let i = 0; i < 3; i++) {
      const px = -w / 2 + 14 + i * 11;
      c.fillStyle = ['#e63946', '#4cc9f0', '#ffd60a'][i];
      c.beginPath();
      c.arc(px, -h / 2 + 14, 3.4, 0, 7);
      c.fill();
    }
    screws(c, -w / 2, -h / 2, w, h, 7);
    outline(c, -w / 2, -h / 2, w, h, 6);
  },
  crate(c, w, h) {
    c.fillStyle = '#6f4f2e';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.save();
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.clip();
    for (let px = -w / 2; px < w / 2; px += 14) {
      c.fillStyle = 'rgba(0,0,0,.22)';
      c.fillRect(px, -h / 2, 3, h);
      c.fillStyle = 'rgba(255,255,255,.07)';
      c.fillRect(px + 3, -h / 2, 2, h);
    }
    c.restore();
    c.fillStyle = 'rgba(240,235,215,.85)';
    rr(c, -10, -8, 20, 16, 3);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.4)';
    c.fillRect(-7, -4, 14, 2);
    c.fillRect(-7, 0, 14, 2);
    c.fillRect(-7, 4, 9, 2);
    outline(c, -w / 2, -h / 2, w, h, 6);
  },
  filter(c, w, h) {
    c.fillStyle = '#5b6470';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = '#2a2f36';
    rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 4);
    c.fill();
    c.strokeStyle = 'rgba(190,205,215,.35)';
    c.lineWidth = 1.5;
    for (let i = -w / 2 + 8; i <= w / 2 - 8; i += 7) {
      c.beginPath();
      c.moveTo(i, -h / 2 + 8);
      c.lineTo(i, h / 2 - 8);
      c.stroke();
    }
    for (let j = -h / 2 + 8; j <= h / 2 - 8; j += 7) {
      c.beginPath();
      c.moveTo(-w / 2 + 8, j);
      c.lineTo(w / 2 - 8, j);
      c.stroke();
    }
    c.fillStyle = 'rgba(180,170,140,.4)';
    c.beginPath();
    c.ellipse(4, 3, 9, 6, 0.4, 0, 7);
    c.fill();
    screws(c, -w / 2, -h / 2, w, h, 6);
    outline(c, -w / 2, -h / 2, w, h, 6);
  },
  valve(c, w, h) {
    c.fillStyle = '#4b5560';
    c.fillRect(-6, -h / 2, 12, h);
    c.fillStyle = 'rgba(255,255,255,.08)';
    c.fillRect(-6, -h / 2, 4, h);
    c.fillStyle = '#39413a';
    rr(c, -14, -h / 2 + 2, 28, 10, 3);
    c.fill();
    rr(c, -14, h / 2 - 12, 28, 10, 3);
    c.fill();
    const R = Math.min(w, h) / 2 - 4;
    c.strokeStyle = '#e63946';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(0, 0, R, 0, 7);
    c.stroke();
    c.strokeStyle = '#c1121f';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-R + 3, 0);
    c.lineTo(R - 3, 0);
    c.moveTo(0, -R + 3);
    c.lineTo(0, R - 3);
    c.stroke();
    c.fillStyle = '#8d99ae';
    c.beginPath();
    c.arc(0, 0, 3.5, 0, 7);
    c.fill();
  },
  terminal(c, w, h) {
    c.fillStyle = '#3c4450';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = '#0d1a26';
    rr(c, -w / 2 + 6, -h / 2 + 5, w - 12, h - 18, 4);
    c.fill();
    c.fillStyle = '#5ee6a8';
    for (let i = 0; i < 3; i++) c.fillRect(-w / 2 + 10, -h / 2 + 10 + i * 6, (w - 24) * (0.35 + i * 0.22), 2.5);
    c.fillStyle = 'rgba(94,230,168,.14)';
    rr(c, -w / 2 + 6, -h / 2 + 5, w - 12, h - 18, 4);
    c.fill();
    c.fillStyle = '#20262e';
    rr(c, -w / 2 + 8, h / 2 - 11, w - 16, 7, 2);
    c.fill();
    screws(c, -w / 2, -h / 2, w, h, 6);
    outline(c, -w / 2, -h / 2, w, h, 6);
  },
  panel(c, w, h) {
    c.fillStyle = '#59616d';
    rr(c, -w / 2, -h / 2, w, h, 5);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.07)';
    rr(c, -w / 2 + 4, -h / 2 + 4, w - 8, h / 2 - 2, 4);
    c.fill();
    for (let i = 0; i < 3; i++) {
      const px = -w / 2 + 13 + i * 18;
      c.fillStyle = '#2b3038';
      rr(c, px - 6, -h / 2 + 7, 12, 12, 3);
      c.fill();
      c.fillStyle = ['#80ed99', '#ffd60a', '#4cc9f0'][i];
      c.beginPath();
      c.arc(px, -h / 2 + 13, 3, 0, 7);
      c.fill();
    }
    c.fillStyle = '#20262e';
    rr(c, -w / 2 + 6, h / 2 - 11, w - 12, 7, 3);
    c.fill();
    screws(c, -w / 2, -h / 2, w, h, 5);
    outline(c, -w / 2, -h / 2, w, h, 5);
  },
  lamp(c, w, h) {
    c.fillStyle = '#3c4450';
    rr(c, -w / 2, -h / 2, w, h, 5);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)';
    c.fillRect(-w / 2 + 3, -h / 2 + 3, 3, h - 6);
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, 'rgba(180,120,255,.95)');
    g.addColorStop(0.5, 'rgba(226,190,255,.98)');
    g.addColorStop(1, 'rgba(150,90,230,.95)');
    c.fillStyle = g;
    rr(c, -w / 2 + 9, -h / 2 + 6, w - 18, h - 12, 6);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.fillRect(-w / 2 + 12, -h / 2 + 10, 3, h - 20);
    outline(c, -w / 2, -h / 2, w, h, 5);
  },
  switchbox(c, w, h) {
    c.fillStyle = '#4b5560';
    rr(c, -w / 2, -h / 2, w, h, 5);
    c.fill();
    c.fillStyle = '#22262c';
    rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 4);
    c.fill();
    for (let i = 0; i < 4; i++) {
      const px = -w / 2 + 10 + i * ((w - 20) / 3);
      c.fillStyle = '#8d99ae';
      rr(c, px - 3, -5, 6, 13, 2);
      c.fill();
      c.fillStyle = '#ffd60a';
      c.beginPath();
      c.arc(px, 6, 2.4, 0, 7);
      c.fill();
    }
    screws(c, -w / 2, -h / 2, w, h, 6);
    outline(c, -w / 2, -h / 2, w, h, 5);
  },
  scale(c, w, h) {
    c.fillStyle = '#3c4450';
    rr(c, -w / 2 + 8, h / 2 - 16, w - 16, 14, 4);
    c.fill();
    c.fillStyle = '#8d99ae';
    rr(c, -w / 2, -h / 2, w, h - 20, 6);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.14)';
    rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, 8, 4);
    c.fill();
    c.fillStyle = '#0d1a26';
    rr(c, w / 2 - 26, -h / 2 + 8, 20, 12, 3);
    c.fill();
    c.fillStyle = '#5ee6a8';
    c.fillRect(w / 2 - 22, -h / 2 + 13, 12, 2.5);
    outline(c, -w / 2, -h / 2, w, h - 20, 6);
  },
  keypad(c, w, h) {
    c.fillStyle = '#3c4450';
    rr(c, -w / 2, -h / 2, w, h, 5);
    c.fill();
    c.fillStyle = '#0d1a26';
    rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, 11, 3);
    c.fill();
    c.fillStyle = '#5ee6a8';
    c.fillRect(-w / 2 + 8, -h / 2 + 9, 10, 3);
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 3; k++) {
        c.fillStyle = (r + k) % 3 === 0 ? '#e63946' : '#8d99ae';
        rr(c, -w / 2 + 7 + k * 10, -h / 2 + 21 + r * 7, 9, 6, 2);
        c.fill();
      }
    }
    outline(c, -w / 2, -h / 2, w, h, 5);
  },
  machine(c, w, h) {
    c.fillStyle = '#4b515b';
    rr(c, -w / 2, -h / 2, w, h, 7);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.07)';
    rr(c, -w / 2 + 4, -h / 2 + 4, w - 8, h / 3, 5);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.3)';
    for (let i = -w / 2 + 8; i < 0; i += 6) c.fillRect(i, -h / 2 + 8, 3, h / 2 - 10);
    c.fillStyle = '#20262e';
    c.beginPath();
    c.arc(w / 2 - 18, h / 2 - 16, 11, 0, 7);
    c.fill();
    c.strokeStyle = '#8d99ae';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(w / 2 - 18, h / 2 - 16, 8, 0, 7);
    c.stroke();
    c.beginPath();
    c.moveTo(w / 2 - 26, h / 2 - 16);
    c.lineTo(w / 2 - 10, h / 2 - 16);
    c.stroke();
    c.fillStyle = '#80ed99';
    c.beginPath();
    c.arc(-w / 2 + 12, h / 2 - 12, 3, 0, 7);
    c.fill();
    screws(c, -w / 2, -h / 2, w, h, 8);
    outline(c, -w / 2, -h / 2, w, h, 7);
  },
  bench(c, w, h) {
    c.fillStyle = '#6f4f2e';
    rr(c, -w / 2, -h / 2, w, h, 5);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.18)';
    for (let px = -w / 2; px < w / 2; px += 18) c.fillRect(px, -h / 2, 2, h);
    c.fillStyle = '#8d99ae';
    rr(c, -w / 2 + 8, -6, 16, 4, 2);
    c.fill();
    rr(c, 2, -4, 18, 4, 2);
    c.fill();
    c.fillStyle = '#e63946';
    rr(c, -w / 2 + 10, 4, 10, 6, 2);
    c.fill();
    c.fillStyle = '#ffd60a';
    c.beginPath();
    c.arc(w / 2 - 12, 2, 5, 0, 7);
    c.fill();
    outline(c, -w / 2, -h / 2, w, h, 5);
  },
  table(c, w, h) {
    c.fillStyle = '#4a4030';
    rr(c, -w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 8);
    c.fill();
    c.fillStyle = '#6b5638';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.08)';
    rr(c, -w / 2 + 3, -h / 2 + 3, w - 6, 5, 3);
    c.fill();
    for (const dx of [-w / 4, w / 4]) {
      c.fillStyle = '#e8e2d2';
      c.beginPath();
      c.ellipse(dx, 0, 11, 8, 0, 0, 7);
      c.fill();
      c.fillStyle = 'rgba(0,0,0,.15)';
      c.beginPath();
      c.ellipse(dx, 0, 7, 5, 0, 0, 7);
      c.fill();
    }
    outline(c, -w / 2, -h / 2, w, h, 6);
  },
  radio(c, w, h) {
    c.fillStyle = '#6f4f2e';
    rr(c, -w / 2, -h / 2, w, h, 5);
    c.fill();
    c.fillStyle = '#2f2214';
    rr(c, -w / 2 + 4, -h / 2 + 4, w / 2 - 4, h - 8, 3);
    c.fill();
    c.fillStyle = 'rgba(200,190,160,.35)';
    for (let j = -h / 2 + 9; j < h / 2 - 8; j += 5) c.fillRect(-w / 2 + 7, j, w / 2 - 10, 2);
    for (let i = 0; i < 2; i++) {
      c.fillStyle = '#8d99ae';
      c.beginPath();
      c.arc(w / 2 - 13 - i * 14, -3, 7, 0, 7);
      c.fill();
      c.fillStyle = '#20262e';
      c.beginPath();
      c.arc(w / 2 - 13 - i * 14, -3, 2, 0, 7);
      c.fill();
    }
    c.fillStyle = '#ffd60a';
    c.fillRect(w / 2 - 30, h / 2 - 12, 24, 4);
    outline(c, -w / 2, -h / 2, w, h, 5);
  },
  glass(c, w, h) {
    c.fillStyle = '#5b6470';
    rr(c, -w / 2, -h / 2, w, h, 3);
    c.fill();
    c.fillStyle = 'rgba(180,225,255,.35)';
    rr(c, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.22)';
    c.beginPath();
    c.arc(-6, 0, 4, 0, 7);
    c.arc(7, 2, 3, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-w / 2 + 5, h / 2 - 5);
    c.lineTo(-2, -h / 2 + 5);
    c.stroke();
    outline(c, -w / 2, -h / 2, w, h, 3);
  },
  compost(c, w, h) {
    c.fillStyle = '#3a2a18';
    rr(c, -w / 2, -h / 2, w, h, 10);
    c.fill();
    c.fillStyle = 'rgba(120,150,80,.55)';
    c.beginPath();
    c.ellipse(-4, h / 4, w / 2 - 6, h / 3, 0, 0, 7);
    c.fill();
    c.fillStyle = 'rgba(90,65,40,.7)';
    for (let i = 0; i < 10; i++) {
      c.beginPath();
      c.ellipse(-w / 2 + 8 + ((i * 37) % (w - 16)), -h / 2 + 8 + ((i * 53) % (h - 16)), 4, 3, i, 0, 7);
      c.fill();
    }
    c.strokeStyle = '#6f4f2e';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(w / 2 - 14, -h / 2);
    c.lineTo(w / 4, h / 2 - 6);
    c.stroke();
    c.fillStyle = '#8d99ae';
    c.fillRect(w / 4 - 6, h / 2 - 10, 12, 5);
    outline(c, -w / 2, -h / 2, w, h, 10);
  },
};

/* ---------------- objetos fijos del mapa ---------------- */

export const OBST_ART = {
  // objetos sin tipo declarado (por ejemplo, justo antes de sincronizar el motor de la sala)
  legacy(c, w, h) {
    const wood = Math.abs(Math.round(w + h)) % 3 !== 2;
    c.fillStyle = wood ? '#6f4f2e' : '#4b515b';
    rr(c, -w / 2, -h / 2, w, h, 10);
    c.fill();
    c.save();
    rr(c, -w / 2, -h / 2, w, h, 10);
    c.clip();
    if (wood) {
      for (let py = -h / 2; py < h / 2; py += 24) {
        c.fillStyle = 'rgba(0,0,0,.2)';
        c.fillRect(-w / 2, py, w, 2);
        c.fillStyle = 'rgba(255,255,255,.06)';
        c.fillRect(-w / 2, py + 2, w, 4);
      }
    } else {
      for (let px = -w / 2; px < w / 2; px += 28) {
        c.fillStyle = 'rgba(0,0,0,.16)';
        c.fillRect(px, -h / 2, 2, h);
      }
    }
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.16)';
    rr(c, -w / 2 + 5, -h / 2 + 5, Math.max(10, w - 10), Math.max(8, h * 0.24), 6);
    c.fill();
    outline(c, -w / 2, -h / 2, w, h, 10);
  },
  crate: ART.crate,
  table: ART.table,
  bench: ART.bench,
  machine: ART.machine,
  compost: ART.compost,
  beds(c, w, h) {
    c.fillStyle = '#3a2a18';
    rr(c, -w / 2, -h / 2, w, h, 4);
    c.fill();
    c.fillStyle = '#241a10';
    rr(c, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 3);
    c.fill();
    for (let px = -w / 2 + 13; px < w / 2 - 8; px += 22) {
      c.fillStyle = 'rgba(150,205,125,.75)';
      c.beginPath();
      c.arc(px, 0, 6, 0, 7);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.2)';
      c.beginPath();
      c.arc(px - 2, -2, 2, 0, 7);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.12)';
    c.fillRect(-w / 2, -h / 2, w, 3);
    outline(c, -w / 2, -h / 2, w, h, 4);
  },
  barrel(c, w, h) {
    const R = Math.min(w, h) / 2;
    c.fillStyle = '#5a4a2e';
    c.beginPath();
    c.arc(0, 0, R, 0, 7);
    c.fill();
    c.fillStyle = '#7a6540';
    c.beginPath();
    c.arc(0, -2, R - 5, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(40,32,20,.8)';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, -2, R - 5, 0, 7);
    c.stroke();
    c.strokeStyle = 'rgba(200,200,180,.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-R + 6, -2);
    c.lineTo(R - 6, -2);
    c.stroke();
    c.fillStyle = 'rgba(0,0,0,.28)';
    c.beginPath();
    c.arc(0, -2, 4, 0, 7);
    c.fill();
  },
  pipe(c, w, h) {
    c.fillStyle = '#4b5560';
    c.fillRect(-w / 2 + 2, -h / 2, w - 4, h);
    c.fillStyle = 'rgba(255,255,255,.08)';
    c.fillRect(-w / 2 + 4, -h / 2, 4, h);
    c.fillStyle = '#39413a';
    c.fillRect(-w / 2, -h / 2 + 4, w, 9);
    c.fillRect(-w / 2, h / 2 - 13, w, 9);
    c.fillStyle = 'rgba(0,0,0,.3)';
    c.fillRect(w / 2 - 6, -h / 2, 6, h);
    screws(c, -w / 2, -h / 2, w, h, 8);
  },
  freezer(c, w, h) {
    c.fillStyle = '#8d99ae';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.22)';
    rr(c, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 4);
    c.fill();
    c.fillStyle = 'rgba(120,180,220,.32)';
    rr(c, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 3);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)';
    c.fillRect(w / 2 - 14, -h / 2 + 10, 3, h - 20);
    c.fillStyle = 'rgba(230,245,255,.5)';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.arc(-w / 2 + 10 + ((i * 29) % (w - 20)), -h / 2 + 8 + ((i * 17) % (h - 16)), 3 + (i % 3), 0, 7);
      c.fill();
    }
    outline(c, -w / 2, -h / 2, w, h, 6);
  },
  /* --- adorno temático de las salas --- */
  shelf(c, w, h) { // estantería de taller con baldas y bultos guardados
    c.fillStyle = '#4b5560';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = '#22262c';
    rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 4);
    c.fill();
    const rows = Math.max(3, Math.round(h / 48));
    const rh = (h - 12) / rows;
    const slot = (w - 20) / 2;
    for (let i = 0; i < rows; i++) {
      const y = -h / 2 + 6 + i * rh;
      for (let k = 0; k < 2; k++) {
        const bx = -w / 2 + 10 + k * slot;
        if ((i + k) % 2) {
          c.fillStyle = '#6f4f2e';
          rr(c, bx, y + 3, slot - 4, rh - 10, 3);
          c.fill();
          c.fillStyle = 'rgba(240,235,215,.7)';
          c.fillRect(bx + 3, y + 7, slot - 10, 3);
        } else {
          c.fillStyle = 'rgba(150,205,125,.6)';
          rr(c, bx + 1, y + rh - 14, slot - 6, 9, 3);
          c.fill();
        }
      }
      c.fillStyle = '#5b6470';
      c.fillRect(-w / 2 + 6, y + rh - 5, w - 12, 5);
    }
    screws(c, -w / 2, -h / 2, w, h, 7);
    outline(c, -w / 2, -h / 2, w, h, 5);
  },
  tank(c, w, h) { // depósito de agua con su nivel y el grifo
    c.fillStyle = '#3c4450';
    rr(c, -w / 2, -h / 2 + 8, w, h - 8, 10);
    c.fill();
    const g = c.createLinearGradient(0, -h / 2 + 16, 0, h / 2 - 6);
    g.addColorStop(0, 'rgba(115,195,225,.85)');
    g.addColorStop(1, 'rgba(38,105,145,.92)');
    c.fillStyle = g;
    rr(c, -w / 2 + 7, -h / 2 + 18, w - 14, h - 32, 8);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)';
    c.fillRect(-w / 2 + 7, -h / 2 + 18, w - 14, 4);
    c.fillStyle = 'rgba(0,0,0,.25)';
    for (const yy of [-h / 2 + 30, h / 2 - 26]) c.fillRect(-w / 2 - 1, yy, w + 2, 6);
    c.fillStyle = '#59616d';
    rr(c, -w / 2 - 3, -h / 2 + 2, w + 6, 14, 6);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.1)';
    rr(c, -w / 2 - 1, -h / 2 + 4, w + 2, 4, 3);
    c.fill();
    c.fillStyle = '#8d99ae';
    rr(c, w / 2 - 6, h / 2 - 34, 16, 9, 4);
    c.fill();
    c.fillStyle = '#e63946';
    c.beginPath();
    c.arc(w / 2 + 8, h / 2 - 29, 4, 0, 7);
    c.fill();
    outline(c, -w / 2, -h / 2 + 8, w, h - 8, 10);
  },
  sack(c, w, h) { // sacos de sustrato apilados
    const bag = (bx, by, bw, bh) => {
      c.fillStyle = '#8a7048';
      c.beginPath();
      c.ellipse(bx, by, bw / 2, bh / 2, 0, 0, 7);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.1)';
      c.beginPath();
      c.ellipse(bx - bw / 8, by - bh / 8, bw / 3.2, bh / 3.2, 0, 0, 7);
      c.fill();
      c.strokeStyle = 'rgba(60,44,26,.8)';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(bx, by, bw / 2, bh / 2, 0, 0, 7);
      c.stroke();
    };
    const s = Math.min(w, h);
    bag(0, h / 2 - s * 0.24, w, s * 0.5);
    bag(-w * 0.22, h / 2 - s * 0.62, w * 0.6, s * 0.48);
    bag(w * 0.24, h / 2 - s * 0.6, w * 0.55, s * 0.46);
    c.strokeStyle = 'rgba(70,52,30,.85)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(-w * 0.12, h / 2 - s * 0.88);
    c.lineTo(w * 0.1, h / 2 - s * 0.82);
    c.stroke();
    c.fillStyle = 'rgba(240,235,215,.85)';
    rr(c, -9, h / 2 - s * 0.26, 18, 11, 2);
    c.fill();
    c.fillStyle = 'rgba(90,70,45,.85)';
    c.fillRect(-6, h / 2 - s * 0.22, 12, 2);
    c.fillRect(-6, h / 2 - s * 0.18, 7, 2);
  },
  lamp(c, w, h) { // foco de luz UV encendido
    c.fillStyle = '#3c4450';
    rr(c, -w / 2, -h / 2, w, h, 6);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.09)';
    rr(c, -w / 2 + 4, -h / 2 + 4, w - 8, 12, 5);
    c.fill();
    const g = c.createLinearGradient(0, -h / 2 + 18, 0, h / 2 - 8);
    g.addColorStop(0, 'rgba(190,130,255,.95)');
    g.addColorStop(0.5, 'rgba(232,205,255,.98)');
    g.addColorStop(1, 'rgba(150,90,230,.95)');
    c.fillStyle = g;
    rr(c, -w / 2 + 8, -h / 2 + 18, w - 16, h - 34, 8);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)';
    c.fillRect(-w / 2 + 12, -h / 2 + 26, 4, h - 50);
    c.fillStyle = 'rgba(0,0,0,.22)';
    for (let i = -w / 2 + 10; i < w / 2 - 8; i += 9) c.fillRect(i, h / 2 - 16, 4, 9);
    screws(c, -w / 2, -h / 2, w, h, 7);
    outline(c, -w / 2, -h / 2, w, h, 6);
  },
  fan(c, w, h) { // extractor de aire con aspas y rejilla
    c.fillStyle = '#3c4450';
    rr(c, -w / 2, -h / 2, w, h, 8);
    c.fill();
    const R = Math.min(w, h) / 2 - 6;
    c.fillStyle = '#22262c';
    c.beginPath();
    c.arc(0, 0, R, 0, 7);
    c.fill();
    c.fillStyle = '#8d99ae';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      c.beginPath();
      c.ellipse(Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42, R * 0.42, R * 0.2, a, 0, 7);
      c.fill();
    }
    c.fillStyle = '#5b6470';
    c.beginPath();
    c.arc(0, 0, R * 0.2, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(200,215,225,.35)';
    c.lineWidth = 2;
    for (let i = -R + 5; i < R - 2; i += 9) {
      c.beginPath();
      c.moveTo(i, -R + 2);
      c.lineTo(i, R - 2);
      c.stroke();
    }
    c.fillStyle = '#80ed99';
    c.beginPath();
    c.arc(-w / 2 + 10, h / 2 - 10, 3, 0, 7);
    c.fill();
    screws(c, -w / 2, -h / 2, w, h, 8);
    outline(c, -w / 2, -h / 2, w, h, 8);
  },
  pot(c, w, h) { // banco de macetas con plantones
    c.fillStyle = '#4a4030';
    rr(c, -w / 2, -h / 2 + h * 0.45, w, h * 0.55, 6);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.07)';
    rr(c, -w / 2 + 3, -h / 2 + h * 0.45 + 3, w - 6, 6, 3);
    c.fill();
    const n = Math.max(2, Math.round(w / 42));
    const R = Math.min(h * 0.3, (w / n) * 0.34);
    for (let i = 0; i < n; i++) {
      const px = -w / 2 + (w / n) * (i + 0.5);
      const py = -h / 2 + h * 0.42;
      c.fillStyle = '#8a5a34';
      c.beginPath();
      c.moveTo(px - R, py - R * 0.5);
      c.lineTo(px + R, py - R * 0.5);
      c.lineTo(px + R * 0.7, py + R);
      c.lineTo(px - R * 0.7, py + R);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.12)';
      c.fillRect(px - R, py - R * 0.5, R * 2, 3);
      c.fillStyle = 'rgba(150,205,125,.9)';
      c.beginPath();
      c.ellipse(px, py - R * 1.05, R * 0.6, R * 0.45, 0, 0, 7);
      c.fill();
      c.beginPath();
      c.ellipse(px - R * 0.55, py - R * 0.9, R * 0.4, R * 0.3, -0.5, 0, 7);
      c.fill();
    }
    outline(c, -w / 2, -h / 2 + h * 0.45, w, h * 0.55, 6);
  },
  bush(c, w, h) { // mata de hierba alta del patio
    const rx = w * 0.5, ry = h * 0.5;
    c.fillStyle = '#2e4724';
    c.beginPath();
    c.ellipse(0, ry * 0.3, rx * 0.94, ry * 0.74, 0, 0, 7);
    c.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.5;
      c.fillStyle = i % 2 ? '#4d8137' : '#3f6d2e';
      c.beginPath();
      c.ellipse(Math.cos(a) * rx * 0.5, Math.sin(a) * ry * 0.42, rx * 0.44, ry * 0.4, a, 0, 7);
      c.fill();
    }
    c.fillStyle = 'rgba(180,225,140,.4)';
    c.beginPath();
    c.ellipse(-rx * 0.32, -ry * 0.34, rx * 0.3, ry * 0.22, -0.6, 0, 7);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.2)';
    c.beginPath();
    c.ellipse(rx * 0.34, ry * 0.44, rx * 0.26, ry * 0.16, 0, 0, 7);
    c.fill();
  },
  rock(c, w, h) { // peñasco con una cara al sol y musgo
    c.fillStyle = '#5a615d';
    c.beginPath();
    c.moveTo(-w * 0.5, h * 0.26);
    c.lineTo(-w * 0.34, -h * 0.26);
    c.lineTo(w * 0.02, -h * 0.5);
    c.lineTo(w * 0.42, -h * 0.1);
    c.lineTo(w * 0.5, h * 0.3);
    c.lineTo(w * 0.12, h * 0.5);
    c.lineTo(-w * 0.34, h * 0.44);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.13)';
    c.beginPath();
    c.moveTo(-w * 0.34, -h * 0.26);
    c.lineTo(w * 0.02, -h * 0.5);
    c.lineTo(w * 0.42, -h * 0.1);
    c.lineTo(w * 0.02, -h * 0.04);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(96,140,86,.45)';
    c.beginPath();
    c.ellipse(-w * 0.18, h * 0.3, w * 0.18, h * 0.11, 0, 0, 7);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,.22)';
    c.beginPath();
    c.ellipse(w * 0.24, h * 0.18, w * 0.14, h * 0.08, 0.5, 0, 7);
    c.fill();
  },
  shrooms(c, w, h) { // rodal de setas silvestres
    const R = Math.min(w / 3.2, h * 0.34);
    for (let i = 0; i < 3; i++) {
      const px = -w * 0.28 + i * w * 0.28;
      const py = h * 0.1 - Math.abs(i - 1) * 5;
      const cr = R * (i === 1 ? 1.12 : 0.86);
      c.fillStyle = '#e6dcc4';
      c.fillRect(px - cr * 0.26, py, cr * 0.52, cr * 1.35);
      c.fillStyle = i === 1 ? '#c9483a' : '#d76a50';
      c.beginPath();
      c.ellipse(px, py, cr, cr * 0.72, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.45)';
      c.beginPath();
      c.arc(px - cr * 0.42, py - cr * 0.34, cr * 0.16, 0, 7);
      c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,.2)';
    c.beginPath();
    c.ellipse(0, h * 0.38, w * 0.34, h * 0.12, 0, 0, 7);
    c.fill();
  },
};

// `art` es el juego de dibujos del escenario: el invernadero (por defecto) o Micelaria.
export function drawObstacle(c, o, art, soft) {
  const [x, y, w, h, kind] = o;
  if (kind === 'panel' || kind === 'core' || kind === 'prop') return; // se dibujan aparte
  const set = art || OBST_ART;
  c.save();
  c.translate(x + w / 2, y + h / 2);
  if (soft) groundShadow(c, w, h); else shadow(c, -w / 2, -h / 2, w, h, 10);
  (set[kind] || OBST_ART.legacy)(c, w, h);
  c.restore();
}

export function drawProp(c, t, art, soft) {
  const box = t.box || [t.x - 28, t.y - 22, 56, 44];
  const w = box[2], h = box[3];
  const set = art || ART;
  c.save();
  c.translate(t.x, t.y);
  if (soft) groundShadow(c, w, h); else shadow(c, -w / 2, -h / 2, w, h, 8);
  (set[t.kind] || ART.crate)(c, w, h);
  c.restore();
}

/* indicador de tarea: el objeto manda, el símbolo solo avisa */
export function drawTaskMark(ctx, t, T, done) {
  const box = t.box || [t.x - 28, t.y - 22, 56, 44];
  const rad = Math.max(box[2], box[3]) / 2 + 8;
  const pulse = 0.5 + 0.5 * Math.sin(T * 4);
  ctx.save();
  ctx.globalAlpha = done ? 0.22 : 0.3 + 0.3 * pulse;
  ctx.fillStyle = done ? '#80ed99' : '#ffd60a';
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 4, rad + 6, 11, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = done ? 0.5 : 0.9;
  ctx.strokeStyle = done ? 'rgba(128,237,153,.9)' : 'rgba(255,220,90,.95)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(t.x, t.y, rad + (done ? 0 : pulse * 3), 0, 7);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const ty = t.y - box[3] / 2 - 14 - (done ? 0 : Math.abs(Math.sin(T * 4)) * 4);
  ctx.font = '900 22px system-ui';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.strokeText(done ? '✔' : '!', t.x, ty);
  ctx.fillStyle = done ? '#80ed99' : '#ffd60a';
  ctx.fillText(done ? '✔' : '!', t.x, ty);
  ctx.restore();
}

/* botón de emergencia: pedestal con seta, apagado cuando ya lo has usado.
   Cada escenario puede traer el suyo (por ejemplo, el pedestal de piedra de Micelaria). */
export function drawButton(ctx, bx, by, T, used, blocked, fn) {
  if (fn) { fn(ctx, bx, by, T, used, blocked); return; }
  const off = used || blocked; // gastada, o bloqueada mientras hay un sabotaje
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(bx, by + 12, 26, 10, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#39413a';
  rr(ctx, bx - 21, by - 8, 42, 28, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  rr(ctx, bx - 18, by - 6, 36, 8, 4);
  ctx.fill();
  ctx.fillStyle = off ? '#5a3038' : '#e63946';
  rr(ctx, bx - 18, by + 12, 36, 7, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, by - 8, 16, 0, 7);
  ctx.fillStyle = '#2b3038';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, by - 10, 13, 0, 7);
  ctx.fillStyle = off ? '#4b2530' : '#e63946';
  ctx.fill();
  ctx.globalAlpha = off ? 0.25 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(T * 3));
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.arc(bx - 4, by - 14, 4, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = '800 11px system-ui';
  ctx.textAlign = 'center';
  if (off) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - 8, by - 22);
    ctx.lineTo(bx + 8, by - 2);
    ctx.moveTo(bx + 8, by - 22);
    ctx.lineTo(bx - 8, by - 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText(blocked ? tr('BLOQUEADA') : tr('USADA'), bx, by + 34);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillText(tr('REUNIÓN'), bx, by + 34);
  }
  ctx.restore();
}