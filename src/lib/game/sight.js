/* Luz con línea de vista: hasta dónde llega la vista del jugador sin topar con un muro.
   Usa la misma rejilla de colisión que el movimiento, así que la luz se corta justo en
   los muros y se cuela por los huecos abiertos (puertas y pasillos): estando en una sala
   con la puerta abierta se ve el pasillo, y una pared tapa lo que hay detrás.
   Devuelve el polígono de luz en coordenadas del mundo, como lista [x, y, x, y…]. */

const CELL = 20;   // lado de celda, igual que la rejilla de colisión
const RAYS = 360;  // rayos por vuelta (1°): bordes rectos y coste bajo
const SLACK = 6;   // margen de movimiento antes de recalcular la luz

function solid(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= grid.gw || ty >= grid.gh) return true; // fuera del mundo: muro
  return !grid.cells[ty * grid.gw + tx];
}

/* Un rayo que avanza celda a celda hasta chocar o llegar a su alcance. */
function cast(grid, x0, y0, dx, dy, radius) {
  let tx = Math.floor(x0 / CELL), ty = Math.floor(y0 / CELL);
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
  const dX = dx === 0 ? Infinity : Math.abs(CELL / dx);
  const dY = dy === 0 ? Infinity : Math.abs(CELL / dy);
  let mX = dx === 0 ? Infinity : (dx > 0 ? (tx + 1) * CELL - x0 : tx * CELL - x0) / dx;
  let mY = dy === 0 ? Infinity : (dy > 0 ? (ty + 1) * CELL - y0 : ty * CELL - y0) / dy;
  let t = 0;
  while (t < radius) {
    if (mX < mY) { t = mX; tx += stepX; mX += dX; }
    else { t = mY; ty += stepY; mY += dY; }
    if (t > radius) break;
    if (solid(grid, tx, ty)) return t; // el muro corta la luz en su borde
  }
  return radius;
}

function visibilityPolygon(grid, x0, y0, radius) {
  const pts = new Array(RAYS * 2);
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    const d = cast(grid, x0, y0, dx, dy, radius);
    pts[i * 2] = x0 + dx * d;
    pts[i * 2 + 1] = y0 + dy * d;
  }
  return pts;
}

// Mientras el jugador apenas se mueve, el polígono se reaprovecha: mismo dibujo con
// un tercio de trabajo. Al cambiar de partida la rejilla es otra y se recalcula solo.
let cache = null;

export function lightPolygon(grid, x, y, radius) {
  const c = cache;
  if (c && c.grid === grid && c.r === radius && Math.abs(c.x - x) < SLACK && Math.abs(c.y - y) < SLACK) return c.pts;
  const pts = visibilityPolygon(grid, x, y, radius);
  cache = { grid, x, y, r: radius, pts };
  return pts;
}