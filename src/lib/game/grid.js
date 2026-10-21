export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const CELL = 20;
const MOVE_STEP = 2; // resolución del avance: deja al jugador pegado al muro, sin huecos

// Rejilla de celdas de 20 px: 1 = suelo transitable, 0 = muro o caja.
// Los rectángulos se ajustan a la cuadrícula para que ninguno se quede sin colisión
// por no estar alineado (el servidor usa exactamente el mismo criterio).
export function makeGrid(world, floors, obst) {
  const gw = Math.ceil(world.w / CELL), gh = Math.ceil(world.h / CELL), cells = new Uint8Array(gw * gh);
  const fill = (r, v) => {
    const tx0 = Math.max(0, Math.floor(r[0] / CELL)), tx1 = Math.min(gw, Math.ceil((r[0] + r[2]) / CELL));
    const ty0 = Math.max(0, Math.floor(r[1] / CELL)), ty1 = Math.min(gh, Math.ceil((r[1] + r[3]) / CELL));
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) cells[ty * gw + tx] = v;
  };
  floors.forEach((r) => fill(r, 1));
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

// Desplaza en un solo eje con pasos cortos y afina el contacto por búsqueda binaria:
// el jugador queda apoyado exactamente en el muro (mismo punto en cliente y servidor),
// así no tiembla ni se cuela al arrimarse.
export function moveAxis(g, x, y, d, r, axis) {
  if (!d) return { x, y };
  const sign = d < 0 ? -1 : 1;
  const total = Math.abs(d);
  const steps = Math.max(1, Math.ceil(total / MOVE_STEP));
  const inc = total / steps;
  let px = x, py = y;
  for (let i = 0; i < steps; i++) {
    const s = i === steps - 1 ? total - inc * (steps - 1) : inc;
    const nx = axis === 'x' ? px + s * sign : px;
    const ny = axis === 'y' ? py + s * sign : py;
    if (!gridHit(g, nx, ny, r)) { px = nx; py = ny; continue; }
    let lo = 0, hi = s;
    for (let k = 0; k < 8; k++) {
      const mid = (lo + hi) / 2;
      const mx = axis === 'x' ? px + mid * sign : px;
      const my = axis === 'y' ? py + mid * sign : py;
      if (gridHit(g, mx, my, r)) hi = mid; else lo = mid;
    }
    px = axis === 'x' ? px + lo * sign : px;
    py = axis === 'y' ? py + lo * sign : py;
    break;
  }
  return { x: px, y: py };
}

export function stepMove(g, x, y, dx, dy, r) {
  const a = moveAxis(g, x, y, dx, r, 'x');
  return moveAxis(g, a.x, a.y, dy, r, 'y');
}