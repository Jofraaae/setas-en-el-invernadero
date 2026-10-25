/* Micelaria: una aldea de setas, al estilo de los mapas con edificios y un exterior (Polus).

   El pueblo es un claro del bosque con un arroyo que lo cruza de norte a sur. En el centro está
   la plaza de la Asamblea, con el gong de las reuniones; alrededor, los edificios (casas con
   tejado de seta, molino, almacén, taller, observatorio, estación de energía y una cueva) y por
   fuera, caminos, prados, el huerto, la poza y el vado. Las salas no son cuadradas: unas son
   redondas, otras en L, en T, hexagonales o con el contorno de una cueva.

   Todo va en píxeles reales. Un suelo puede traer un octavo elemento con opciones:
     poly    contorno libre (el rectángulo x, y, w, h es su caja)
     room    el contorno es el exterior de un edificio: dos anillos de celdas son el muro
     carve   cierra suelo en vez de abrirlo (arroyo, estanque)
     wall    cómo se pinta el muro del edificio (tejado de seta, roca, empalizada...)
     label   dónde se escribe el nombre de la sala
   El motor (engine.mjs) y el cliente (grid.js) rasterizan esas opciones igual. */

const TAU = Math.PI * 2;
const R = Math.round;
/* Todo el mapa se diseñó a 4400×2800 y se encoge con este factor: posiciones, contornos y
   caminos se multiplican; el tamaño de los objetos, el grosor de los muros y los huecos de las
   puertas no (los jugadores miden lo mismo en cualquier mapa). */
const S = 0.85;
const sp = (pts) => pts.map(([x, y]) => [x * S, y * S]);

/* ---------------- geometría ---------------- */

const circle = (cx, cy, r, n = 44, rot = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + (i / n) * TAU) * r, cy + Math.sin(rot + (i / n) * TAU) * r]);
const poly = (pts) => pts.map((q) => [R(q[0]), R(q[1])]);
// suaviza un contorno cerrado (cada pasada recorta las esquinas)
function chaikin(pts, it = 2) {
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
// círculo con el borde irregular: un peñasco, una cueva
function blob(cx, cy, r, seed, amp = 0.14, n = 44) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const k = 1 + amp * (Math.sin(3 * a + seed) + 0.6 * Math.sin(5 * a + seed * 2.3) + 0.4 * Math.sin(8 * a + seed * 0.7));
    return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k];
  });
}
// banda alrededor de una línea (el arroyo): anchos por punto
function band(line, widths) {
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
const bbox = (pts) => {
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const x0 = Math.floor(Math.min(...xs)), y0 = Math.floor(Math.min(...ys));
  return [x0, y0, Math.ceil(Math.max(...xs)) - x0, Math.ceil(Math.max(...ys)) - y0];
};
function floor(key, pts, color, name, tex, opts = {}) {
  const p = poly(pts);
  const o = { poly: p, key, ...opts };
  if (o.label) o.label = o.label.map((v) => R(v * S));
  return [...bbox(p), color, name, tex, o];
}
const rect = (key, x, y, w, h, color, name, tex, opts = {}) => [x, y, w, h, color, name, tex, { key, ...opts }];

const inPoly = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const segDist = (px, py, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
};
const polyDist = (pts, x, y) => {
  let d = 1e9;
  for (let i = 0; i < pts.length; i++) d = Math.min(d, segDist(x, y, pts[i], pts[(i + 1) % pts.length]));
  return d;
};
const lineDist = (pts, x, y) => {
  let d = 1e9;
  for (let i = 0; i + 1 < pts.length; i++) d = Math.min(d, segDist(x, y, pts[i], pts[i + 1]));
  return d;
};

// cortes de un contorno con una recta: para poner las puertas justo en el muro
const crossX = (pts, y) => { const o = []; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y)) o.push(xi + ((y - yi) * (xj - xi)) / (yj - yi)); } return o.sort((a, b) => a - b); };
const crossY = (pts, x) => { const o = []; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((xi > x) !== (xj > x)) o.push(yi + ((x - xi) * (yj - yi)) / (xj - xi)); } return o.sort((a, b) => a - b); };
const snap = (v) => Math.round(v / 20) * 20;

// generador con semilla: el mapa es el mismo en cada partida
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ---------------- el mundo ---------------- */

const WORLD = { w: R((4400 * S) / 20) * 20, h: R((2800 * S) / 20) * 20 };

// el claro de la aldea: todo el suelo exterior, de borde irregular
const OUTDOORS = chaikin(sp([
  [560, 300], [1500, 230], [2600, 240], [3300, 190], [4000, 320], [4260, 720], [4300, 1400], [4240, 2100],
  [3960, 2500], [3200, 2640], [2400, 2690], [1500, 2710], [700, 2700], [300, 2500], [170, 1700], [210, 1000], [320, 560],
]), 3);

// el arroyo: baja de la cascada del norte y cruza la aldea; el puente y el vado lo salvan
const RIVER_LINE = sp([[3300, 100], [3220, 480], [3300, 800], [3150, 1120], [3050, 1420], [3120, 1720], [3050, 2020], [2900, 2320], [2830, 2740]]);
const RIVER = chaikin(band(RIVER_LINE, [140, 150, 150, 160, 170, 180, 180, 190, 200].map((w) => w * S)), 2);
const POND = chaikin(blob(3770 * S, 450 * S, 140 * S, 1.7, 0.1, 24), 1);
// las dos charcas del pantano, al noroeste
const CHARCA_A = chaikin(blob(400 * S, 470 * S, 92 * S, 0.6, 0.16, 20), 1);
const CHARCA_B = chaikin(blob(690 * S, 400 * S, 68 * S, 2.4, 0.16, 18), 1);

/* ---------------- edificios ---------------- */

const PLAZA_C = { x: 1900 * S, y: 1400 * S };
const PLAZA_R = 340 * S;
const CASA_SETA = circle(900 * S, 860 * S, 340 * S, 48);
const CASA_TE = sp([[1560, 380], [2000, 380], [2000, 300], [2440, 300], [2440, 540], [2800, 540], [2800, 880], [1560, 880]]);
// el molino: un rectángulo con dos esquinas cortadas, pegado al arroyo
const MOLINO = sp([[2440, 1040], [2800, 1040], [2900, 1140], [2900, 1440], [2540, 1440], [2440, 1340]]);
const ALMACEN = sp([[1640, 1900], [2040, 1900], [2040, 2040], [2640, 2040], [2640, 2560], [1640, 2560]]);
const TALLER = sp([[340, 1380], [1020, 1380], [1020, 1740], [860, 1740], [860, 2000], [500, 2000], [500, 1740], [340, 1740]]);
const OBSERVATORIO = circle(1300 * S, 1850 * S, 240 * S, 40);
const ESTACION = circle(3750 * S, 1000 * S, 340 * S, 6, Math.PI / 6);
const CUEVA = chaikin(blob(3700 * S, 2000 * S, 355 * S, 0.9, 0.12, 24), 1);
const HUERTO = sp([[420, 2200], [1100, 2200], [1100, 2500], [940, 2600], [540, 2590], [420, 2490]]);

const FLOORS = [
  floor('aldea', OUTDOORS, '#4d7a3f', null, 'grass', { noEdge: true }),
  floor('plaza', circle(PLAZA_C.x, PLAZA_C.y, PLAZA_R, 48), '#b9a273', 'Plaza de la Asamblea', 'plaza', { noEdge: true, label: [1900, 1590] }),
  floor('arroyo', RIVER, '#2f7f8e', null, 'river', { carve: true, water: true, wall: 'water' }),
  floor('poza', POND, '#2f7f8e', null, 'river', { carve: true, water: true, wall: 'water' }),
  floor('charcaA', CHARCA_A, '#2f7f8e', null, 'river', { carve: true, water: true, wall: 'water' }),
  floor('charcaB', CHARCA_B, '#2f7f8e', null, 'river', { carve: true, water: true, wall: 'water' }),
  floor('casaSeta', CASA_SETA, '#8a6a42', 'Casa Seta', 'planks', { room: true, wall: 'capRed', label: [900, 1075] }),
  floor('casaTe', CASA_TE, '#8a6a42', 'Casa del Té', 'planks', { room: true, wall: 'capViolet', label: [1900, 790] }),
  floor('molino', MOLINO, '#7d6340', 'Molino de Setas', 'mill', { room: true, wall: 'timber', label: [2705, 1386] }),
  floor('almacen', ALMACEN, '#6b5236', 'Almacén de la Aldea', 'dirt', { room: true, wall: 'timber', label: [2190, 2510] }),
  floor('taller', TALLER, '#7a5c38', 'Taller de Esporas', 'planks', { room: true, wall: 'capOrange', label: [680, 1690] }),
  floor('observatorio', OBSERVATORIO, '#3d4a6b', 'Observatorio', 'stars', { room: true, wall: 'capBlue', label: [1280, 1992] }),
  floor('estacion', ESTACION, '#2a6a68', 'Estación de Energía', 'glow', { room: true, wall: 'glow', label: [3750, 842] }),
  floor('cueva', CUEVA, '#555a58', 'Cueva del Micelio', 'cave', { room: true, wall: 'rock', label: [3640, 2200] }),
  floor('huerto', HUERTO, '#5a4228', 'Huerto de Hongos', 'crop', { room: true, wall: 'fence', label: [790, 2495] }),
];
const FIDX = Object.fromEntries(FLOORS.map((f, i) => [f[7].key, i]));
const roomPoly = (key) => FLOORS[FIDX[key]][7].poly;

/* Puertas: cada una abre un hueco de 120 px en el muro de su edificio. Se calculan sobre el
   contorno para que el hueco caiga justo en el muro. `floor` es el suelo que lo abre; `box`,
   lo que cierra el impostor. */
const DOOR_DEFS = [];
function addDoor(key, poly_, side, pos, len = 120) {
  pos *= S;
  let box, fl;
  if (side === 'W') { const x = snap(Math.min(...crossX(poly_, pos))); box = [x, snap(pos - len / 2), 40, len]; fl = [x - 40, box[1], 120, len]; }
  if (side === 'E') { const x = snap(Math.max(...crossX(poly_, pos))) - 40; box = [x, snap(pos - len / 2), 40, len]; fl = [x - 40, box[1], 120, len]; }
  if (side === 'N') { const y = snap(Math.min(...crossY(poly_, pos))); box = [snap(pos - len / 2), y, len, 40]; fl = [box[0], y - 40, len, 120]; }
  if (side === 'S') { const y = snap(Math.max(...crossY(poly_, pos))) - 40; box = [snap(pos - len / 2), y, len, 40]; fl = [box[0], y - 40, len, 120]; }
  DOOR_DEFS.push({ key, side, box, floor: fl });
}
addDoor('casaSeta', CASA_SETA, 'E', 860);
addDoor('casaSeta', CASA_SETA, 'S', 900);
addDoor('casaTe', CASA_TE, 'S', 2120);
addDoor('casaTe', CASA_TE, 'W', 640);
addDoor('molino', MOLINO, 'W', 1160);
addDoor('almacen', ALMACEN, 'N', 2260);
addDoor('almacen', ALMACEN, 'E', 2300);
addDoor('taller', TALLER, 'E', 1500);
addDoor('taller', TALLER, 'S', 680);
addDoor('observatorio', OBSERVATORIO, 'N', 1300);
addDoor('estacion', ESTACION, 'W', 1000);
addDoor('estacion', ESTACION, 'E', 1000);
addDoor('cueva', CUEVA, 'W', 2000);
addDoor('cueva', CUEVA, 'N', 3700);
addDoor('huerto', HUERTO, 'N', 800);

// los huecos se abren después de todos los edificios (último en el orden = gana)
for (const d of DOOR_DEFS) FLOORS.push(rect(`puerta-${d.key}-${d.side}`, ...d.floor, '#8a6c44', null, 'planks', { door: true }));

// el puente de las raíces y el vado, sobre el arroyo
FLOORS.push(rect('puente', R(2900 * S), R(1460 * S), R(320 * S), 120, '#8a6538', 'Puente de las Raíces', 'planks', { label: [R(3060 * S), R(1555 * S)], bridge: true }));
FLOORS.push(rect('vado', R(2880 * S), R(1960 * S), R(320 * S), 120, '#6f9aa8', null, 'water', { ford: true }));

const DOORS = DOOR_DEFS.map((d) => ({ x: d.box[0], y: d.box[1], w: d.box[2], h: d.box[3], rooms: [FIDX[d.key]] }));

/* ---------------- caminos (solo dibujo y espacio libre de adornos) ---------------- */

const PATHS = ([
  // Casa Seta y Casa del Té con la plaza
  [[1260, 860], [1360, 880], [1480, 980], [1600, 1110], [1720, 1240], [1860, 1370]],
  [[1540, 640], [1420, 700], [1360, 880]],
  [[2120, 900], [2110, 1000], [2000, 1100], [1930, 1330]],
  // el cruce del oeste: Casa Seta (sur), taller, observatorio y la plaza
  [[900, 1220], [960, 1340], [1100, 1440], [1250, 1490]],
  [[1040, 1500], [1250, 1490]],
  [[1300, 1580], [1280, 1530], [1250, 1490]],
  [[1250, 1490], [1420, 1470], [1580, 1420], [1860, 1400]],
  // molino, puente y la orilla este
  [[2420, 1160], [2360, 1230], [2260, 1310], [1980, 1380]],
  [[1960, 1420], [2240, 1470], [2500, 1500], [2896, 1520]],
  [[3224, 1520], [3300, 1510], [3340, 1360], [3380, 1180], [3420, 1020], [3440, 1000]],
  [[3300, 1510], [3480, 1530], [3640, 1560], [3700, 1620]],
  [[4060, 1000], [4170, 1080], [4190, 1300], [4000, 1500], [3760, 1610], [3700, 1620]],
  // almacén, vado y cueva
  [[2260, 2020], [2230, 1900], [2130, 1790], [2020, 1700], [1930, 1480]],
  [[2660, 2300], [2760, 2200], [2860, 2030], [2876, 2020]],
  [[3204, 2020], [3340, 2010], [3400, 2000]],
  // taller y huerto
  [[680, 1980], [690, 2080], [780, 2160], [800, 2190]],
  // la senda de la cascada, por el callejón entre la Casa del Té y el molino
  [[2160, 1230], [2300, 1000], [2500, 960], [2760, 950], [2900, 860], [2960, 700], [3000, 560]],
  // sendas del bosque y el pantano, al oeste
  [[960, 1340], [760, 1300], [560, 1220], [400, 1100], [340, 960]],
  [[340, 960], [420, 760], [500, 560], [560, 440]],
  // el claro de las luciérnagas
  [[2040, 1640], [2300, 1700], [2500, 1760], [2640, 1840]],
]).map(sp);

// puntos justo fuera de cada puerta, para no plantar nada delante
const DOOR_OUT = DOOR_DEFS.map((d) => {
  const [x, y, w, h] = d.box;
  const cx = x + w / 2, cy = y + h / 2;
  const o = { W: [-80, 0], E: [80, 0], N: [0, -80], S: [0, 80] }[d.side];
  return [cx + o[0], cy + o[1]];
});

/* ---------------- objetos con colisión ---------------- */
/* [x, y, ancho, alto, tipo]. Dentro de cada edificio va todo a mano, pegado a las paredes y
   con el centro libre. El exterior (árboles, rocas, matas) se reparte con semilla al final. */

const OBST = [];
// los objetos se colocan en coordenadas de diseño: se mueve su centro, no su tamaño
const put = (x, y, w, h, t) => {
  if (t === 'cropbed') { const cx = (x + w / 2) * S; w = R(w * S); OBST.push([R(cx - w / 2), R((y + h / 2) * S - h / 2), w, h, t]); return; }
  OBST.push([R((x + w / 2) * S - w / 2), R((y + h / 2) * S - h / 2), w, h, t]);
};

/* ---- Plaza de la Asamblea: faroles en dos lados y el pozo; el gong va en el centro (botón) ---- */
put(1580, 1380, 40, 40, 'lantern'); put(2180, 1380, 40, 40, 'lantern');
put(1500, 1230, 140, 80, 'stall'); put(2200, 1480, 140, 80, 'stall');

/* ---- Casa Seta ---- */
put(630, 820, 80, 80, 'bonfire');
put(850, 820, 160, 56, 'table'); put(800, 900, 46, 46, 'stump'); put(990, 900, 46, 46, 'stump');
put(1010, 950, 130, 80, 'bed');

/* ---- Casa del Té ---- */
put(2250, 360, 140, 46, 'shelf');
put(2180, 600, 170, 56, 'table'); put(1760, 520, 160, 56, 'table');
put(2140, 680, 46, 46, 'stump'); put(2340, 680, 46, 46, 'stump');
put(1640, 420, 150, 46, 'shelf');
put(2520, 780, 90, 50, 'planter'); put(2310, 430, 70, 70, 'baskets');

/* ---- Molino de Setas ---- */
put(2755, 1210, 100, 130, 'millwheel');
put(2680, 1180, 46, 46, 'sacks');

/* ---- Almacén de la Aldea ---- */
put(1690, 2090, 64, 58, 'panel');
put(1700, 2420, 90, 80, 'haystack'); put(1830, 2440, 90, 80, 'haystack');
put(2540, 2380, 60, 60, 'barrel'); put(2470, 2390, 60, 60, 'barrel');
put(2500, 2090, 70, 70, 'sacks'); put(2380, 2090, 100, 70, 'baskets');
put(1960, 2200, 70, 70, 'sacks'); put(1810, 2270, 100, 70, 'baskets');

/* ---- Taller de Esporas ---- */
put(400, 1430, 150, 46, 'shelf'); put(740, 1430, 130, 46, 'shelf');
put(610, 1580, 140, 56, 'table'); put(440, 1610, 60, 60, 'barrel');
put(890, 1600, 70, 60, 'sacks');

/* ---- Observatorio ---- */
put(1255, 1805, 90, 90, 'totem');

/* ---- Estación de Energía ---- */
put(3690, 970, 120, 60, 'core');
put(3940, 880, 60, 90, 'totem');
put(3560, 880, 90, 70, 'glowshroom'); put(3900, 1100, 90, 70, 'glowshroom');

/* ---- Cueva del Micelio ---- */
put(3480, 1900, 130, 90, 'boulder'); put(3870, 1950, 120, 90, 'boulder');
put(3640, 1990, 100, 80, 'roots');


/* ---- Huerto de Hongos ---- */
put(480, 2320, 240, 44, 'cropbed'); put(480, 2400, 240, 44, 'cropbed');
put(970, 2340, 90, 80, 'cart');

/* ---- Pantano de Esporas (noroeste) ---- */
put(900, 330, 90, 90, 'glowshroom');

/* ---- Cascada de Esporas: la cabecera del arroyo y los juncos de la poza ---- */
put(3040, 280, 90, 90, 'mushring'); put(3430, 300, 60, 60, 'signpost');


/* ---- Bosque de Micelio (oeste) ---- */
put(300, 900, 170, 60, 'log'); put(440, 1240, 120, 110, 'boulder');
put(430, 880, 130, 120, 'fern'); put(260, 1180, 120, 120, 'fern');

/* ---- Claro de Luciérnagas (sur de la plaza) ---- */
put(2380, 1690, 120, 90, 'mushring'); put(2700, 1700, 110, 90, 'tallgrass');
put(2580, 1960, 120, 90, 'bonfire'); put(2320, 1930, 85, 85, 'glowshroom');
put(1850, 1790, 100, 90, 'well');

/* ---------------- tareas ---------------- */
/* Cada una con su objeto propio (kind) y su minijuego (game). Las hay corrientes y las hay
   propias de la aldea (sopa, té, colada, brotes...). */
const TASKS = [
  // Plaza de la Asamblea
  { name: 'Encender los faroles de la plaza', x: 1900, y: 1160, game: 'order', kind: 'lamp' },
  { name: 'Repartir las esporas del día', x: 2090, y: 1250, game: 'sort', kind: 'tray' },
  { name: 'Afinar el carillón de setas', x: 1710, y: 1260, game: 'memory', kind: 'chime' },
  { name: 'Regar las jardineras de la plaza', x: 1690, y: 1520, game: 'hold', kind: 'valve' },
  { name: 'Contar las cestas del mercado', x: 2090, y: 1470, game: 'count', kind: 'tray' },
  { name: 'Marcar el mapa de la aldea', x: 1900, y: 1650, game: 'route', kind: 'panel' },
  // Casa Seta
  { name: 'Preparar la sopa de setas', x: 740, y: 700, game: 'brew', kind: 'cauldron' },
  { name: 'Tender la colada de esporas', x: 1050, y: 640, game: 'match', kind: 'clothesline' },
  { name: 'Ordenar los frascos de la alacena', x: 1100, y: 770, game: 'seq', kind: 'jars' },
  { name: 'Cortar leña para la chimenea', x: 760, y: 1020, game: 'seq', kind: 'crate' },
  // Casa del Té
  { name: 'Preparar la infusión de hongos', x: 2170, y: 400, game: 'brew', kind: 'teaset' },
  { name: 'Etiquetar las tazas', x: 2640, y: 700, game: 'type', kind: 'tray' },
  { name: 'Colgar la vajilla', x: 1700, y: 770, game: 'match', kind: 'bench' },
  { name: 'Moler las hierbas del té', x: 2000, y: 450, game: 'dose', kind: 'mortar' },
  // Molino de Setas
  { name: 'Encender el horno del molino', x: 2620, y: 1110, game: 'hold', kind: 'hearth' },
  { name: 'Cerner el polvo de seta', x: 2760, y: 1120, game: 'dose', kind: 'scale' },
  { name: 'Engrasar los engranajes', x: 2650, y: 1310, game: 'pipe', kind: 'valve' },
  { name: 'Escribir el pedido del molino', x: 2540, y: 1270, game: 'scramble', kind: 'panel' },
  // Almacén de la Aldea
  { name: 'Inventariar las cajas', x: 1780, y: 1960, game: 'count', kind: 'crate' },
  { name: 'Escribir el albarán', x: 1920, y: 1950, game: 'type', kind: 'panel' },
  { name: 'Atar los fardos de paja', x: 2020, y: 2400, game: 'seq', kind: 'bench' },
  { name: 'Limpiar el filtro de la cisterna', x: 2300, y: 2200, game: 'spots', kind: 'filter' },
  { name: 'Pesar los sacos de esporas', x: 2200, y: 2400, game: 'dose', kind: 'scale' },
  // Taller de Esporas
  { name: 'Cribar las esporas', x: 470, y: 1540, game: 'sort', kind: 'tray' },
  { name: 'Afilar las herramientas', x: 590, y: 1830, game: 'timing', kind: 'switchbox' },
  { name: 'Montar el telar de micelio', x: 690, y: 1525, game: 'pipe', kind: 'valve' },
  { name: 'Pesar el hilo de seda', x: 770, y: 1830, game: 'slider', kind: 'scale' },
  // Observatorio
  { name: 'Alinear el telescopio', x: 1150, y: 1920, game: 'slider', kind: 'panel' },
  { name: 'Cartografiar las estrellas', x: 1410, y: 1740, game: 'sonar', kind: 'terminal' },
  { name: 'Encender las lámparas del cielo', x: 1450, y: 1850, game: 'order', kind: 'lamp' },
  // Estación de Energía
  { name: 'Alimentar el corazón de micelio', x: 3580, y: 1020, game: 'hold', kind: 'valve' },
  { name: 'Recargar las lámparas de esporas', x: 3880, y: 960, game: 'seq', kind: 'lamp' },
  { name: 'Purgar las tuberías de savia', x: 3640, y: 1180, game: 'pipe', kind: 'valve' },
  { name: 'Sondear la red de raíces', x: 3790, y: 905, game: 'sonar', kind: 'terminal' },
  // Cueva del Micelio
  { name: 'Sellar las grietas de la cueva', x: 3530, y: 2100, game: 'spots', kind: 'filter' },
  { name: 'Pintar las runas del fondo', x: 3790, y: 2090, game: 'scramble', kind: 'keypad' },
  { name: 'Recoger los cristales sueltos', x: 3730, y: 1790, game: 'sort', kind: 'tray' },
  { name: 'Despertar a las luciérnagas', x: 3590, y: 1750, game: 'order', kind: 'switchbox' },
  // Huerto de Hongos
  { name: 'Recoger la cosecha de setas', x: 540, y: 2270, game: 'harvest', kind: 'tray' },
  { name: 'Regar los caballones', x: 960, y: 2270, game: 'valves', kind: 'valve' },
  { name: 'Cazar los brotes nuevos', x: 560, y: 2500, game: 'sprout', kind: 'sprouts' },
  { name: 'Tapar los brotes tiernos', x: 1010, y: 2490, game: 'memory', kind: 'crate' },
  // Cascada de Esporas (los dos lados del arroyo)
  { name: 'Canalizar la cascada', x: 2980, y: 600, game: 'valves', kind: 'valve' },
  { name: 'Contar los saltos de agua', x: 2960, y: 780, game: 'sonar', kind: 'terminal' },
  { name: 'Recoger agua de la poza', x: 3540, y: 660, game: 'hold', kind: 'valve' },
  { name: 'Ajustar el cauce', x: 3440, y: 440, game: 'slider', kind: 'panel' },
  // Bosque de Micelio
  { name: 'Recoger leña del bosque', x: 330, y: 1010, game: 'seq', kind: 'crate' },
  { name: 'Podar los helechos', x: 430, y: 800, game: 'spots', kind: 'filter' },
  { name: 'Atrapar luciérnagas', x: 610, y: 1135, game: 'timing', kind: 'lamp' },
  { name: 'Medir las setas del claro', x: 700, y: 1320, game: 'slider', kind: 'scale' },
  // Pantano de Esporas
  { name: 'Filtrar el agua del pantano', x: 600, y: 590, game: 'pipe', kind: 'filter' },
  { name: 'Sondear el fondo del pantano', x: 440, y: 620, game: 'sonar', kind: 'terminal' },
  { name: 'Recoger setas luminosas', x: 830, y: 450, game: 'sort', kind: 'tray' },
  // Claro de Luciérnagas
  { name: 'Atrapar luciérnagas en el claro', x: 2460, y: 1860, game: 'timing', kind: 'lamp' },
  { name: 'Encender el corro de luces', x: 2640, y: 1820, game: 'order', kind: 'switchbox' },
  { name: 'Sembrar tréboles', x: 2270, y: 1680, game: 'sprout', kind: 'sprouts' },
].map((t, id) => ({ id, ...t, x: R(t.x * S), y: R(t.y * S) }));

/* ---------------- rejillas de ventilación ---------------- */
const VENTS = [
  { id: 0, net: 'A', name: 'Molino', x: 2630, y: 1205 },
  { id: 1, net: 'A', name: 'Huerto', x: 790, y: 2440 },
  { id: 2, net: 'A', name: 'Almacén', x: 2380, y: 2410 },
  { id: 3, net: 'B', name: 'Observatorio', x: 1390, y: 1930 },
  { id: 4, net: 'B', name: 'Casa Seta', x: 690, y: 940 },
  { id: 5, net: 'B', name: 'Cueva', x: 3760, y: 1900 },
  { id: 6, net: 'C', name: 'Estación', x: 3730, y: 1085 },
  { id: 7, net: 'C', name: 'Pantano', x: 330, y: 760 },
  { id: 8, net: 'C', name: 'Bosque', x: 240, y: 1500 },
  { id: 9, net: 'C', name: 'Cascada', x: 3550, y: 390 },
  { id: 10, net: 'A', name: 'Casa del Té', x: 2500, y: 680 },
].map((v) => ({ ...v, x: R(v.x * S), y: R(v.y * S) }));

/* Rótulos de las zonas del exterior (las salas ya traen el suyo en el suelo). */
const CAPTIONS = [
  { name: 'Pantano de Esporas', x: 458, y: 690 },
  { name: 'Bosque de Micelio', x: 385, y: 1100 },
  { name: 'Cascada de Esporas', x: 2880, y: 470 },
  { name: 'Claro de Luciérnagas', x: 2560, y: 1590 },
].map((t) => ({ ...t, x: R(t.x * S), y: R(t.y * S) }));

/* ---------------- adornos del exterior (con semilla, sin pisar nada) ---------------- */

// el punto del cuadro de luces: justo debajo de su caja, como en el invernadero
const PANEL_BOX = OBST.find((o) => o[4] === 'panel');
const PANEL = { x: PANEL_BOX[0] + PANEL_BOX[2] / 2, y: PANEL_BOX[1] + PANEL_BOX[3] + 22 };
const SPOTS = [ // sitios que no se pueden tapar: tareas, rejillas, panel y botón
  ...TASKS.map((t) => [t.x, t.y]), ...VENTS.map((v) => [v.x, v.y]), [PANEL.x, PANEL.y], [PLAZA_C.x, PLAZA_C.y],
];
const BUILDINGS = ['casaSeta', 'casaTe', 'molino', 'almacen', 'taller', 'observatorio', 'estacion', 'cueva', 'huerto'].map(roomPoly);
function freeAt(x, y, rad, margin = 0) {
  if (!inPoly(OUTDOORS, x, y) || polyDist(OUTDOORS, x, y) < 40 + rad * 0.6) return false;
  if (Math.hypot(x - PLAZA_C.x, y - PLAZA_C.y) < PLAZA_R + 40 + rad) return false;
  for (const b of BUILDINGS) if (inPoly(b, x, y) || polyDist(b, x, y) < 70 + rad * 0.7) return false;
  if (inPoly(RIVER, x, y) || polyDist(RIVER, x, y) < 60 + rad * 0.6) return false;
  if (inPoly(POND, x, y) || polyDist(POND, x, y) < 70 + rad) return false;
  for (const p of PATHS) if (lineDist(p, x, y) < 70 + rad * 0.7 + margin) return false;
  for (const d of DOOR_OUT) if (Math.hypot(x - d[0], y - d[1]) < 150 + rad) return false;
  for (const w of [CHARCA_A, CHARCA_B]) if (inPoly(w, x, y) || polyDist(w, x, y) < 60 + rad) return false;
  for (const t of CAPTIONS) if (Math.abs(x - t.x) < 170 + rad && Math.abs(y - t.y) < 40 + rad) return false;
  for (const s of SPOTS) if (Math.hypot(x - s[0], y - s[1]) < 90 + rad * 0.8) return false;
  for (const o of OBST) if (x > o[0] - 50 - rad * 0.8 && x < o[0] + o[2] + 50 + rad * 0.8 && y > o[1] - 50 - rad * 0.8 && y < o[1] + o[3] + 50 + rad * 0.8) return false;
  return true;
}
// el puente y el vado dejan sus orillas libres
const CROSSINGS = [[2780, 1400, 560, 260], [2760, 1900, 560, 260]].map((c) => c.map((v) => v * S));
{
  const r = rng(20261024);
  const kinds = [ // tipo, ancho, alto, cuántos
    ['tree', 150, 150, 90], ['giant', 150, 150, 10], ['boulder', 90, 80, 10], ['log', 150, 50, 5],
    ['fern', 100, 100, 16], ['glowshroom', 80, 80, 9], ['tallgrass', 100, 70, 10], ['stump', 60, 60, 6], ['mushring', 100, 100, 4],
  ];
  for (const [t, w, h, n] of kinds) {
    let placed = 0;
    for (let tries = 0; placed < n && tries < n * 160; tries++) {
      const x = 150 + r() * (WORLD.w - 300), y = 190 + r() * (WORLD.h - 360);
      const rad = Math.max(w, h) / 2;
      if (CROSSINGS.some((c) => x > c[0] && x < c[0] + c[2] && y > c[1] && y < c[1] + c[3])) continue;
      if (!freeAt(x, y, rad)) continue;
      OBST.push([R((x - w / 2) / 20) * 20, R((y - h / 2) / 20) * 20, w, h, t]);
      placed++;
    }
  }
}

export const MICELARIA = {
  scale: 1,
  propScale: 1.25,
  world: WORLD,
  floors: FLOORS,
  doors: DOORS,
  softCollide: true,
  obst: OBST,
  tasks: TASKS,
  vents: VENTS,
  button: { x: PLAZA_C.x, y: PLAZA_C.y },
  spawn: { x: PLAZA_C.x, y: PLAZA_C.y - 70 },
  panel: { x: PANEL.x, y: PANEL.y },
  reactor: { x: R(3750 * S), y: R(1000 * S) },
  rpts: [
    { side: 'a', name: 'Consola A', x: R(3560 * S), y: R(870 * S) },
    { side: 'b', name: 'Consola B', x: R(3940 * S), y: R(1140 * S) },
  ],
};

// datos para dibujar (los usa el cliente): geometría de los edificios, caminos y zonas
export const MICELARIA_ART = { OUTDOORS, RIVER, POND, RIVER_LINE, DOOR_DEFS, PATHS, CAPTIONS, WATERS: [RIVER, POND, CHARCA_A, CHARCA_B], PLAZA: PLAZA_C, PLAZA_R, S, WORLD };
