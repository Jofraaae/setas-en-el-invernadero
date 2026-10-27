/* ================================================================
   Navegación de los bots: caminos por la rejilla de colisión del mapa.
   - walkGrid: celdas por las que cabe el círculo del jugador con margen.
   - findPath: A* sobre esa rejilla + alisado de la ruta (sin esquinas inútiles).
   Todo es independiente del motor: se le pasan las funciones que necesita.
   ================================================================ */

const CELL = 20;
const EXACT_R = 17;  // radio con el que se valida cada tramo recto (el jugador mide 16)

// Rejilla transitable de un mapa (se calcula una vez por mapa). r = margen con las paredes:
// cuanto más grande, más centrados van los bots por los pasillos (el jugador mide 16).
export function buildWalk(M, gridHit, r = 22) {
  const { gw, gh } = M.grid;
  const cells = new Uint8Array(gw * gh);
  for (let ty = 0; ty < gh; ty++) {
    for (let tx = 0; tx < gw; tx++) {
      if (!M.grid.cells[ty * gw + tx]) continue;
      if (!gridHit(M.grid, tx * CELL + CELL / 2, ty * CELL + CELL / 2, r)) cells[ty * gw + tx] = 1;
    }
  }
  return { gw, gh, cells, grid: M.grid, gridHit, r };
}

// Celdas tapadas por las puertas cerradas (con el margen del jugador): se recalcula al pedir ruta.
export function doorBlock(walk, closed) {
  if (!closed || !closed.length) return null;
  const blocked = new Uint8Array(walk.gw * walk.gh);
  const pad = walk.r + 2;
  for (const d of closed) {
    const x0 = Math.max(0, Math.floor((d.x - pad) / CELL)), x1 = Math.min(walk.gw - 1, Math.floor((d.x + d.w + pad) / CELL));
    const y0 = Math.max(0, Math.floor((d.y - pad) / CELL)), y1 = Math.min(walk.gh - 1, Math.floor((d.y + d.h + pad) / CELL));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) blocked[ty * walk.gw + tx] = 1;
  }
  return blocked;
}

const ok = (walk, blocked, tx, ty) => tx >= 0 && ty >= 0 && tx < walk.gw && ty < walk.gh
  && walk.cells[ty * walk.gw + tx] === 1 && !(blocked && blocked[ty * walk.gw + tx]);

// Celda transitable más cercana a un punto (en anillos); null si no hay ninguna cerca.
export function nearestWalkable(walk, blocked, x, y, maxR = 8) {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  if (ok(walk, blocked, cx, cy)) return [cx, cy];
  let best = null, bd = Infinity;
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = cx + dx, ty = cy + dy;
        if (!ok(walk, blocked, tx, ty)) continue;
        const d = Math.hypot(tx * CELL + CELL / 2 - x, ty * CELL + CELL / 2 - y);
        if (d < bd) { bd = d; best = [tx, ty]; }
      }
    }
    if (best) return best;
  }
  return null;
}

// Montículo binario mínimo para el A*.
class Heap {
  constructor() { this.a = []; }
  push(k, v) {
    const a = this.a; a.push([k, v]);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

// ¿Se puede ir en línea recta de a a b con el círculo del jugador? (comprobación exacta)
export function lineClear(walk, closedBoxes, a, b, boxHit) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(d / 8));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    if (walk.gridHit(walk.grid, x, y, EXACT_R)) return false;
    if (closedBoxes && closedBoxes.length && boxHit(closedBoxes, x, y, EXACT_R)) return false;
  }
  return true;
}

/* Ruta de (sx, sy) a (gx, gy). Devuelve { pts, reached } o null:
   pts  = puntos por los que pasar (en píxeles), alisados;
   reached = false si el destino no era transitable y la ruta acaba en lo más cercano. */
export function findPath(walk, closedBoxes, sx, sy, gx, gy, boxHit) {
  const blocked = doorBlock(walk, closedBoxes);
  const s = nearestWalkable(walk, blocked, sx, sy, 6);
  const g = nearestWalkable(walk, blocked, gx, gy, 10);
  if (!s || !g) return null;
  const W = walk.gw;
  const sIdx = s[1] * W + s[0], gIdx = g[1] * W + g[0];
  const total = walk.gw * walk.gh;
  const gScore = new Float32Array(total).fill(Infinity);
  const from = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const heap = new Heap();
  const h = (tx, ty) => { const dx = Math.abs(tx - g[0]), dy = Math.abs(ty - g[1]); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
  gScore[sIdx] = 0; heap.push(h(s[0], s[1]), sIdx);
  let found = false, iters = 0;
  while (heap.size && iters++ < 60000) {
    const [, cur] = heap.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === gIdx) { found = true; break; }
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy, c] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!ok(walk, blocked, nx, ny)) continue;
      if (dx && dy && (!ok(walk, blocked, cx + dx, cy) || !ok(walk, blocked, cx, cy + dy))) continue; // sin cortar esquinas
      const ni = ny * W + nx;
      if (closed[ni]) continue;
      const ng = gScore[cur] + c;
      if (ng < gScore[ni]) { gScore[ni] = ng; from[ni] = cur; heap.push(ng + h(nx, ny), ni); }
    }
  }
  if (!found) return null;
  const cellsPath = [];
  for (let i = gIdx; i !== -1; i = from[i]) cellsPath.push({ x: (i % W) * CELL + CELL / 2, y: ((i / W) | 0) * CELL + CELL / 2 });
  cellsPath.reverse();
  // el destino exacto cierra la ruta si se puede llegar en línea recta desde la última celda
  const goalPt = { x: gx, y: gy };
  const reachedExact = lineClear(walk, closedBoxes, cellsPath[cellsPath.length - 1], goalPt, boxHit);
  if (reachedExact) cellsPath.push(goalPt);
  // alisado: desde cada punto se salta al más lejano al que se llega en línea recta
  const out = [];
  let i = 0;
  const start = { x: sx, y: sy };
  let anchor = start;
  while (i < cellsPath.length) {
    let j = cellsPath.length - 1;
    while (j > i && !lineClear(walk, closedBoxes, anchor, cellsPath[j], boxHit)) j--;
    // si ni el siguiente punto se ve en línea recta, se avanza igualmente al siguiente de la ruta
    const nxt = cellsPath[Math.max(j, i)];
    out.push(nxt);
    anchor = nxt;
    i = Math.max(j, i) + 1;
  }
  return { pts: out, reached: reachedExact };
}
