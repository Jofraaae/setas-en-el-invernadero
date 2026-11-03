/* Geometría común de los mapas de contorno libre (los usa mapPantano.mjs). Son las mismas
   herramientas que lleva Micelaria dentro de su archivo: círculos, contornos suavizados, bandas
   alrededor de una línea, puntos dentro de un polígono y cortes de un contorno con una recta. */

export const TAU = Math.PI * 2;
export const R = Math.round;

export const circle = (cx, cy, r, n = 44, rot = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + (i / n) * TAU) * r, cy + Math.sin(rot + (i / n) * TAU) * r]);
export const poly = (pts) => pts.map((q) => [R(q[0]), R(q[1])]);

// suaviza un contorno cerrado (cada pasada recorta las esquinas)
export function chaikin(pts, it = 2) {
  let p = pts;
  for (let k = 0; k < it; k++) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = out;
  }
  return p;
}

// círculo con el borde irregular: una charca, un peñasco, una cueva
export function blob(cx, cy, r, seed, amp = 0.14, n = 44) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const k = 1 + amp * (Math.sin(3 * a + seed) + 0.6 * Math.sin(5 * a + seed * 2.3) + 0.4 * Math.sin(8 * a + seed * 0.7));
    return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k];
  });
}

// banda alrededor de una línea: anchos por punto
export function band(line, widths) {
  const left = [], right = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, w = widths[i] / 2;
    left.push([line[i][0] + nx * w, line[i][1] + ny * w]);
    right.push([line[i][0] - nx * w, line[i][1] - ny * w]);
  }
  return left.concat(right.reverse());
}

export const bbox = (pts) => {
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const x0 = Math.floor(Math.min(...xs)), y0 = Math.floor(Math.min(...ys));
  return [x0, y0, Math.ceil(Math.max(...xs)) - x0, Math.ceil(Math.max(...ys)) - y0];
};

export const inPoly = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
export const segDist = (px, py, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
};
export const polyDist = (pts, x, y) => {
  let d = 1e9;
  for (let i = 0; i < pts.length; i++) d = Math.min(d, segDist(x, y, pts[i], pts[(i + 1) % pts.length]));
  return d;
};
export const lineDist = (pts, x, y) => {
  let d = 1e9;
  for (let i = 0; i + 1 < pts.length; i++) d = Math.min(d, segDist(x, y, pts[i], pts[i + 1]));
  return d;
};

// cortes de un contorno con una recta: para poner las puertas justo en el muro
export const crossX = (pts, y) => { const o = []; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y)) o.push(xi + ((y - yi) * (xj - xi)) / (yj - yi)); } return o.sort((a, b) => a - b); };
export const crossY = (pts, x) => { const o = []; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((xi > x) !== (xj > x)) o.push(yi + ((x - xi) * (yj - yi)) / (xj - xi)); } return o.sort((a, b) => a - b); };
export const snap = (v) => Math.round(v / 20) * 20;

// generador con semilla: el mapa es el mismo en cada partida
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
