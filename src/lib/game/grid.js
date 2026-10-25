export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const CELL = 20;
const MOVE_STEP = 3; // lo más que avanza el jugador entre dos comprobaciones de choque

// Rejilla de celdas de 20 px: 1 = suelo transitable, 0 = muro o caja.
// Los rectángulos se ajustan a la cuadrícula para que ninguno se quede sin colisión
// por no estar alineado (el servidor usa exactamente el mismo criterio).
// Un suelo puede traer un octavo elemento con opciones (Micelaria): `poly` (contorno libre),
// `carve` (cierra en vez de abrir: ríos y estanques) y `room` (el contorno es el exterior de
// un edificio: dos anillos de celdas de muro y suelo dentro). Es idéntico al del servidor.
export function polyHas(pts, px, py) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function erodeMask(m, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (m[i] && m[i - 1] && m[i + 1] && m[i - w] && m[i + w] && m[i - w - 1] && m[i - w + 1] && m[i + w - 1] && m[i + w + 1]) out[i] = 1;
  }
  return out;
}

export function makeGrid(world, floors, obst) {
  const gw = Math.ceil(world.w / CELL), gh = Math.ceil(world.h / CELL), cells = new Uint8Array(gw * gh);
  const fill = (r, v) => {
    const tx0 = Math.max(0, Math.floor(r[0] / CELL)), tx1 = Math.min(gw, Math.ceil((r[0] + r[2]) / CELL));
    const ty0 = Math.max(0, Math.floor(r[1] / CELL)), ty1 = Math.min(gh, Math.ceil((r[1] + r[3]) / CELL));
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) cells[ty * gw + tx] = v;
  };
  floors.forEach((r) => {
    const o = r[7];
    if (!o) { fill(r, 1); return; }
    if (!o.poly) { fill(r, o.carve ? 0 : 1); return; }
    const tx0 = Math.max(0, Math.floor(r[0] / CELL) - 1), tx1 = Math.min(gw, Math.ceil((r[0] + r[2]) / CELL) + 1);
    const ty0 = Math.max(0, Math.floor(r[1] / CELL) - 1), ty1 = Math.min(gh, Math.ceil((r[1] + r[3]) / CELL) + 1);
    const mw = tx1 - tx0, mh = ty1 - ty0;
    const m = new Uint8Array(mw * mh);
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) if (polyHas(o.poly, tx * CELL + 10, ty * CELL + 10)) m[(ty - ty0) * mw + (tx - tx0)] = 1;
    if (o.room) {
      let inner = m;
      for (let k = 0; k < (o.wallT || 2); k++) inner = erodeMask(inner, mw, mh);
      for (let i = 0; i < m.length; i++) {
        if (!m[i]) continue;
        cells[(ty0 + Math.floor(i / mw)) * gw + tx0 + (i % mw)] = inner[i] ? 1 : 0;
      }
      return;
    }
    const v = o.carve ? 0 : 1;
    for (let i = 0; i < m.length; i++) if (m[i]) cells[(ty0 + Math.floor(i / mw)) * gw + tx0 + (i % mw)] = v;
  });
  obst.forEach((r) => fill(r, 0));
  return { gw, gh, cells };
}

export function gridHit(g, x, y, r) {
  const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
  const y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tx >= 0 && ty >= 0 && tx < g.gw && ty < g.gh && g.cells[ty * g.gw + tx]) continue;
    const cx = Math.max(tx * CELL, Math.min(x, tx * CELL + CELL));
    const cy = Math.max(ty * CELL, Math.min(y, ty * CELL + CELL));
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

// Un círculo contra un rectángulo: si lo pisa, lo saca por la normal del punto más cercano.
// Devuelve la nueva posición o null si no se tocan. Dentro del rectángulo sale por el borde más cercano.
function pushFromRect(x, y, r, rx, ry, rw, rh) {
  const cx = Math.max(rx, Math.min(x, rx + rw)), cy = Math.max(ry, Math.min(y, ry + rh));
  const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2), k = (r + 0.001) / d;
    return [cx + dx * k, cy + dy * k];
  }
  const l = x - rx, rg = rx + rw - x, t = y - ry, b = ry + rh - y, m = Math.min(l, rg, t, b);
  if (m === l) return [rx - r - 0.001, y];
  if (m === rg) return [rx + rw + r + 0.001, y];
  if (m === t) return [x, ry - r - 0.001];
  return [x, ry + rh + r + 0.001];
}

// Saca al círculo de todo lo que pisa (muros, objetos y puertas cerradas): como empuja por la
// normal de cada contacto, el jugador DESLIZA por paredes curvas y esquinas en vez de engancharse,
// y si alguna vez queda dentro de algo (una puerta que se cierra encima) sale solo.
// Devuelve { x, y, ok }: ok = false si tras varios empujes sigue pisando algo.
export function resolveCircle(g, x, y, r, boxes) {
  for (let pass = 0; pass < 5; pass++) {
    let moved = false;
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tx >= 0 && ty >= 0 && tx < g.gw && ty < g.gh && g.cells[ty * g.gw + tx]) continue;
      const q = pushFromRect(x, y, r, tx * CELL, ty * CELL, CELL, CELL);
      if (q) { x = q[0]; y = q[1]; moved = true; }
    }
    if (boxes) for (const b of boxes) {
      const q = pushFromRect(x, y, r, b.x, b.y, b.w, b.h);
      if (q) { x = q[0]; y = q[1]; moved = true; }
    }
    if (!moved) return { x, y, ok: true };
  }
  return { x, y, ok: !gridHit(g, x, y, r - 0.05) && !(boxes && boxes.some((b) => {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w)), cy = Math.max(b.y, Math.min(y, b.y + b.h));
    return (x - cx) ** 2 + (y - cy) ** 2 < (r - 0.05) ** 2;
  })) };
}

// Avanza (dx, dy) en pasos cortos; tras cada paso se resuelve el choque. Si el jugador ya
// estaba incrustado, primero se le saca. `boxes` son las puertas cerradas (rectángulos exactos).
export function stepMove(g, x, y, dx, dy, r, boxes = g.boxes) {
  let p = resolveCircle(g, x, y, r, boxes);
  let px = p.x, py = p.y;
  const dist = Math.hypot(dx, dy);
  if (!dist) return { x: px, y: py };
  const n = Math.max(1, Math.ceil(dist / MOVE_STEP));
  const sx = dx / n, sy = dy / n;
  for (let i = 0; i < n; i++) {
    const q = resolveCircle(g, px + sx, py + sy, r, boxes);
    if (!q.ok) break; // un rincón imposible: se queda donde estaba
    px = q.x; py = q.y;
  }
  return { x: px, y: py };
}
