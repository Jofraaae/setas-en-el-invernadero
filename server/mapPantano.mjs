/* Pantano Esporado: un pantano misterioso de agua verdosa, árboles retorcidos, niebla, raíces
   gigantes y setas luminosas. Se arma igual que Micelaria (contornos libres, muros de edificio de
   dos celdas, puertas con hueco en el muro) y el motor lo trata como otro escenario más.

   En el centro está la CHARCA CENTRAL, con una plataforma de MUELLES DE MADERA donde suena el
   gong de las reuniones: cuatro pasarelas la unen con las orillas y un anillo de tablas rodea la
   plataforma (rutas alternativas por encima del agua). Alrededor:
     · Cabaña abandonada (noroeste, tres puertas)         · Cobertizo de las barcas (este)
     · Cueva subterránea (sureste, dos bocas)             · Campo de setas gigantes (noreste)
     · Zona de árboles muertos (oeste)                    · Raíces gigantes (sur)
     · Sendero de las luciérnagas (norte)                 · una laguna con su embarcadero (suroeste)
   Todo va en píxeles reales (mundo de 3800×2400) y con la misma semilla en cada partida. */

import {
  TAU, R, circle, poly, chaikin, blob, band, bbox, inPoly, polyDist, lineDist, crossX, crossY, snap, rng,
} from './mapGeo.mjs';

const WORLD = { w: 3800, h: 2400 };
const C = { x: 1900, y: 1220 }; // centro de la charca: ahí va la plataforma con el botón

/* ---------------- geometría ---------------- */

const floor = (key, pts, color, name, tex, opts = {}) => {
  const p = poly(pts);
  return [...bbox(p), color, name, tex, { poly: p, key, ...opts }];
};
const rect = (key, x, y, w, h, color, name, tex, opts = {}) => [x, y, w, h, color, name, tex, { key, ...opts }];

// el pantano entero: todo el suelo exterior, de borde irregular
const OUTDOORS = chaikin([
  [330, 290], [1300, 200], [2300, 220], [3200, 190], [3580, 340], [3690, 900], [3710, 1500], [3610, 2100], [3320, 2290],
  [2500, 2270], [1700, 2310], [900, 2290], [400, 2160], [170, 1600], [190, 900],
], 3);

// zonas abiertas con nombre (sin muro): el tipo de terreno y los objetos las distinguen
const CAMPO = chaikin([[2500, 260], [3480, 230], [3600, 620], [3520, 1000], [3060, 1060], [2680, 980], [2470, 640]], 2);
const MUERTOS = chaikin([[210, 1010], [860, 990], [1170, 1200], [1240, 1660], [950, 1860], [430, 1840], [230, 1540]], 2);
const RAICES = chaikin([[1800, 1830], [2600, 1790], [2650, 2250], [1800, 2250]], 2);
const SENDERO = chaikin([[1300, 270], [2380, 260], [2330, 600], [1850, 690], [1350, 620]], 2);
const SHORE = circle(C.x, C.y, 470, 56);

// el agua: la charca central, la laguna del suroeste y cuatro pozas
const POND = chaikin(blob(C.x, C.y, 330, 1.3, 0.05, 40), 1);
const LAGOON = chaikin(blob(1450, 2060, 240, 2.1, 0.08, 30), 1);
const POOLS = [
  chaikin(blob(3300, 1180, 90, 0.7, 0.14, 18), 1),
  chaikin(blob(650, 1330, 90, 1.9, 0.14, 18), 1),
  chaikin(blob(2230, 2050, 85, 2.8, 0.14, 18), 1),
  chaikin(blob(2300, 500, 80, 0.2, 0.14, 18), 1),
];
const WATERS = [POND, LAGOON, ...POOLS];

/* ---------------- edificios ---------------- */

const CABANA = [[380, 400], [1080, 400], [1080, 540], [1220, 540], [1220, 920], [380, 920]];
const COBERTIZO = [[2580, 1060], [3000, 1060], [3000, 1400], [2580, 1400]];
const CUEVA = chaikin(blob(3060, 1900, 320, 0.9, 0.12, 26), 1);

const FLOORS = [
  floor('pantano', OUTDOORS, '#2d4a3a', null, 'swamp', { noEdge: true }),
  floor('campo', CAMPO, '#2a4a46', 'Campo de setas gigantes', 'glowfield', { noEdge: true, label: [3040, 1010] }),
  floor('muertos', MUERTOS, '#3a3a34', 'Zona de árboles muertos', 'deadland', { noEdge: true, label: [720, 1810] }),
  floor('raices', RAICES, '#2e3f2c', 'Raíces gigantes', 'rootsoil', { noEdge: true, label: [2220, 2210] }),
  floor('sendero', SENDERO, '#2f4a3b', 'Sendero de las luciérnagas', 'bog', { noEdge: true, label: [1840, 300] }),
  floor('orilla', SHORE, '#35503f', 'Charca central', 'bog', { noEdge: true, label: [1690, 1610] }),
  floor('charca', POND, '#2c6b57', null, 'murk', { carve: true, water: true, wall: 'water' }),
  floor('laguna', LAGOON, '#2c6b57', null, 'murk', { carve: true, water: true, wall: 'water' }),
  ...POOLS.map((p, i) => floor('poza' + i, p, '#2c6b57', null, 'murk', { carve: true, water: true, wall: 'water' })),
  floor('cabana', CABANA, '#6b5a40', 'Cabaña abandonada', 'cabin', { room: true, wall: 'rot', label: [800, 880] }),
  floor('cobertizo', COBERTIZO, '#5d4b36', 'Cobertizo de las barcas', 'boards', { room: true, wall: 'rot', label: [2790, 1370] }),
  floor('cueva', CUEVA, '#3d4443', 'Cueva subterránea', 'cavefloor', { room: true, wall: 'rock', label: [3060, 2105] }),
];
const FIDX = Object.fromEntries(FLOORS.map((f, i) => [f[7].key, i]));
const roomPoly = (key) => FLOORS[FIDX[key]][7].poly;

/* Puertas: cada una abre un hueco de 120 px en el muro de su edificio (como en Micelaria). */
const DOOR_DEFS = [];
function addDoor(key, poly_, side, pos, len = 120) {
  let box, fl;
  if (side === 'W') { const x = snap(Math.min(...crossX(poly_, pos))); box = [x, snap(pos - len / 2), 40, len]; fl = [x - 40, box[1], 120, len]; }
  if (side === 'E') { const x = snap(Math.max(...crossX(poly_, pos))) - 40; box = [x, snap(pos - len / 2), 40, len]; fl = [x - 40, box[1], 120, len]; }
  if (side === 'N') { const y = snap(Math.min(...crossY(poly_, pos))); box = [snap(pos - len / 2), y, len, 40]; fl = [box[0], y - 40, len, 120]; }
  if (side === 'S') { const y = snap(Math.max(...crossY(poly_, pos))) - 40; box = [snap(pos - len / 2), y, len, 40]; fl = [box[0], y - 40, len, 120]; }
  DOOR_DEFS.push({ key, side, box, floor: fl });
}
addDoor('cabana', CABANA, 'E', 740);
addDoor('cabana', CABANA, 'S', 900);
addDoor('cabana', CABANA, 'N', 700);
addDoor('cobertizo', COBERTIZO, 'W', 1230);
addDoor('cobertizo', COBERTIZO, 'S', 2800);
addDoor('cueva', CUEVA, 'W', 1900);
addDoor('cueva', CUEVA, 'N', 3060);

// los huecos se abren después de todos los edificios (último en el orden = gana)
for (const d of DOOR_DEFS) FLOORS.push(rect(`puerta-${d.key}-${d.side}`, ...d.floor, '#6b5a40', null, 'cabin', { door: true }));

/* Muelles de madera: la plataforma del botón, cuatro pasarelas hasta las orillas, un anillo de
   tablas alrededor de la plataforma y el embarcadero de la laguna. Se abren sobre el agua. */
const DOCKS = [];
// todos los tramos se llaman igual (para los bots), pero el rótulo se pinta solo en el embarcadero
const dock = (key, pts) => { DOCKS.push(pts); FLOORS.push(floor(key, pts, '#7a5f3a', 'Muelles de madera', 'boards', { bridge: true, noLabel: true })); };
const dockRect = (key, x, y, w, h) => { DOCKS.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); FLOORS.push(rect(key, x, y, w, h, '#7a5f3a', 'Muelles de madera', 'boards', { bridge: true, noLabel: key !== 'embarcadero' })); };
dock('plataforma', circle(C.x, C.y, 120, 28));
dockRect('muelleN', C.x - 60, C.y - 420, 120, 420);
dockRect('muelleS', C.x - 60, C.y, 120, 420);
dockRect('muelleO', C.x - 520, C.y - 60, 520, 120);
dockRect('muelleE', C.x, C.y - 60, 520, 120);
// el anillo: cuatro arcos entre las pasarelas (unas rutas alternativas por encima del agua)
const arc = (a0, a1, r0 = 215) => {
  const line = [];
  for (let a = a0; a <= a1 + 1e-6; a += (7 * Math.PI) / 180) line.push([C.x + Math.cos(a) * r0, C.y + Math.sin(a) * r0]);
  return band(line, line.map(() => 100));
};
for (let q = 0; q < 4; q++) dock('anillo' + q, arc((q * Math.PI) / 2 + (12 * Math.PI) / 180, ((q + 1) * Math.PI) / 2 - (12 * Math.PI) / 180));
dockRect('embarcadero', 1090, 2005, 730, 110);

const DOORS = DOOR_DEFS.map((d) => ({ x: d.box[0], y: d.box[1], w: d.box[2], h: d.box[3], rooms: [FIDX[d.key]] }));

/* ---------------- senderos (dibujo y espacio libre de adornos) ---------------- */

const PATHS = [
  [[1290, 740], [1450, 800], [1560, 900], [1650, 1000]],                       // cabaña (este) -> orilla
  [[900, 960], [960, 1060], [1060, 1140], [1260, 1230], [1390, 1230]],          // cabaña (sur) -> muelle oeste
  [[700, 360], [760, 300], [1000, 280], [1300, 320], [1500, 360]],              // la puerta de atrás de la cabaña
  [[2430, 1230], [2540, 1230]],                                                 // muelle este -> cobertizo
  [[2800, 1440], [2850, 1530], [2960, 1530], [3060, 1520]],                     // cobertizo (sur) -> cueva (norte)
  [[2740, 1900], [2550, 1900], [2330, 1920], [2100, 1800], [1900, 1700]],       // cueva (oeste) -> orilla sur
  [[2620, 1000], [2520, 1100], [2430, 1200]],                                   // campo -> muelle este
  [[2700, 1000], [2760, 1040], [2800, 1050]],                                   // campo -> cobertizo
  [[1250, 1330], [1330, 1270], [1390, 1230]],                                   // árboles muertos -> muelle oeste
  [[1100, 2060], [1010, 1990], [950, 1890]],                                    // embarcadero -> árboles muertos
  [[1820, 2060], [1960, 1930], [1900, 1700]],                                   // embarcadero -> orilla sur
  [[1450, 700], [1500, 540], [1700, 440], [2000, 410], [2300, 450], [2500, 600], [2600, 800]], // sendero del norte
  [[1900, 760], [1900, 640], [1900, 560]],                                      // muelle norte -> sendero
];

const DOOR_OUT = DOOR_DEFS.map((d) => {
  const [x, y, w, h] = d.box;
  const cx = x + w / 2, cy = y + h / 2;
  const o = { W: [-80, 0], E: [80, 0], N: [0, -80], S: [0, 80] }[d.side];
  return [cx + o[0], cy + o[1]];
});

/* ---------------- objetos con colisión ---------------- */
/* [x, y, ancho, alto, tipo]. Dentro de cada edificio va todo a mano, pegado a las paredes y con
   el centro libre; el exterior se reparte con semilla al final. */

const OBST = [];
const put = (x, y, w, h, t) => OBST.push([x, y, w, h, t]);

/* ---- Cabaña abandonada ---- */
put(420, 450, 130, 80, 'bed'); put(880, 420, 150, 46, 'shelf');
put(420, 830, 90, 80, 'stove'); put(650, 620, 160, 56, 'table');
put(610, 690, 46, 46, 'stump'); put(800, 690, 46, 46, 'stump');
put(1000, 850, 70, 56, 'chest'); put(1130, 580, 60, 60, 'barrel');

/* ---- Cobertizo de las barcas ---- */
put(2630, 1095, 170, 70, 'rowboat'); put(2830, 1095, 100, 46, 'fishrack');
put(2930, 1320, 50, 50, 'barrel'); put(2870, 1330, 50, 50, 'barrel');
put(2900, 1215, 60, 56, 'panel');

/* ---- Cueva subterránea ---- */
put(2820, 1770, 90, 90, 'crystal'); put(3260, 1780, 100, 90, 'crystal');
put(2900, 2050, 80, 80, 'stalag'); put(3200, 2080, 90, 80, 'stalag');
put(3000, 1700, 120, 90, 'boulder'); put(3330, 1960, 110, 90, 'boulder');
put(2780, 1960, 70, 70, 'stalag'); put(3090, 2200, 80, 70, 'crystal');
put(3000, 1920, 120, 60, 'core');

/* ---- Orilla de la charca: faroles de pantano y juncos ---- */
put(1520, 1020, 40, 40, 'lanternpost'); put(2260, 1020, 40, 40, 'lanternpost');
put(1520, 1420, 40, 40, 'lanternpost'); put(2260, 1420, 40, 40, 'lanternpost');

/* ---------------- tareas ---------------- */
/* Cada una con su objeto propio (kind) y su minijuego (game), de los que ya existen. */
const TASKS = [
  // Cabaña abandonada
  { name: 'Ordenar los frascos del brujo', x: 950, y: 500, game: 'seq', kind: 'jars' },
  { name: 'Encender la estufa oxidada', x: 570, y: 830, game: 'hold', kind: 'hearth' },
  { name: 'Preparar la poción de la ciénaga', x: 650, y: 520, game: 'brew', kind: 'cauldron' },
  { name: 'Tapar las goteras del techo', x: 1000, y: 700, game: 'spots', kind: 'filter' },
  { name: 'Descifrar el diario abandonado', x: 470, y: 660, game: 'scramble', kind: 'terminal' },
  { name: 'Forzar el arcón', x: 1110, y: 790, game: 'code', kind: 'keypad' },
  // Cobertizo de las barcas
  { name: 'Reparar el casco de la barca', x: 2700, y: 1205, game: 'pipe', kind: 'valve' },
  { name: 'Remendar las redes de pesca', x: 2880, y: 1175, game: 'match', kind: 'clothesline' },
  { name: 'Contar los remos', x: 2650, y: 1345, game: 'count', kind: 'tray' },
  { name: 'Encender el farol del cobertizo', x: 2790, y: 1275, game: 'order', kind: 'lamp' },
  // Cueva subterránea
  { name: 'Sellar las goteras de la cueva', x: 2960, y: 1850, game: 'spots', kind: 'filter' },
  { name: 'Recoger cristales luminosos', x: 3200, y: 1860, game: 'sort', kind: 'tray' },
  { name: 'Pintar las runas del fondo', x: 2830, y: 2080, game: 'scramble', kind: 'keypad' },
  { name: 'Despertar a las luciérnagas', x: 3290, y: 2110, game: 'order', kind: 'switchbox' },
  { name: 'Medir el eco de la cueva', x: 3050, y: 1660, game: 'sonar', kind: 'terminal' },
  { name: 'Alimentar el corazón de la cueva', x: 3030, y: 2040, game: 'hold', kind: 'valve' },
  { name: 'Despejar el derrumbe', x: 3220, y: 1930, game: 'seq', kind: 'crate' },
  // Muelles de madera
  { name: 'Atar los cabos del muelle', x: 1900, y: 930, game: 'seq', kind: 'bench' },
  { name: 'Pescar para la cena', x: 1900, y: 1520, game: 'timing', kind: 'lamp' },
  { name: 'Recoger agua de la charca', x: 2250, y: 1220, game: 'hold', kind: 'valve' },
  { name: 'Medir la profundidad', x: 1550, y: 1220, game: 'sonar', kind: 'terminal' },
  { name: 'Encender las lámparas del muelle', x: 2052, y: 1068, game: 'order', kind: 'lamp' },
  // Orilla de la charca
  { name: 'Limpiar los nenúfares', x: 1560, y: 1010, game: 'spots', kind: 'filter' },
  { name: 'Contar las ranas', x: 2290, y: 1490, game: 'count', kind: 'tray' },
  { name: 'Analizar el agua verde', x: 1540, y: 1500, game: 'dose', kind: 'scale' },
  { name: 'Cambiar las velas de los faroles', x: 2290, y: 960, game: 'seq', kind: 'lamp' },
  // Campo de setas gigantes
  { name: 'Recoger setas luminosas', x: 2750, y: 520, game: 'sort', kind: 'tray' },
  { name: 'Medir las setas gigantes', x: 3050, y: 420, game: 'slider', kind: 'scale' },
  { name: 'Polinizar los sombreros', x: 3300, y: 700, game: 'timing', kind: 'lamp' },
  { name: 'Cosechar esporas', x: 2900, y: 800, game: 'harvest', kind: 'tray' },
  { name: 'Regar el micelio', x: 3350, y: 420, game: 'valves', kind: 'valve' },
  { name: 'Contar los círculos de hadas', x: 3150, y: 900, game: 'count', kind: 'tray' },
  { name: 'Cazar brotes nuevos', x: 2600, y: 520, game: 'sprout', kind: 'sprouts' },
  // Zona de árboles muertos
  { name: 'Podar las ramas secas', x: 600, y: 1200, game: 'spots', kind: 'filter' },
  { name: 'Encender las balizas', x: 480, y: 1450, game: 'order', kind: 'lamp' },
  { name: 'Contar los cuervos', x: 800, y: 1500, game: 'count', kind: 'tray' },
  { name: 'Marcar el sendero seguro', x: 1000, y: 1750, game: 'route', kind: 'panel' },
  { name: 'Recoger leña seca', x: 330, y: 1200, game: 'seq', kind: 'crate' },
  { name: 'Desenterrar las raíces muertas', x: 700, y: 1700, game: 'timing', kind: 'switchbox' },
  // Raíces gigantes
  { name: 'Cortar las raíces', x: 2000, y: 2000, game: 'timing', kind: 'switchbox' },
  { name: 'Plantar esquejes', x: 2300, y: 2150, game: 'sprout', kind: 'sprouts' },
  { name: 'Medir las raíces gigantes', x: 2450, y: 1900, game: 'slider', kind: 'scale' },
  { name: 'Reparar la bomba de achique', x: 2100, y: 1920, game: 'pipe', kind: 'valve' },
  { name: 'Sondear el fango', x: 2600, y: 2150, game: 'sonar', kind: 'terminal' },
  // Embarcadero de la laguna
  { name: 'Cebar las cañas', x: 1300, y: 2060, game: 'hold', kind: 'valve' },
  { name: 'Vaciar la barca', x: 1600, y: 2060, game: 'type', kind: 'tray' },
  // Sendero de las luciérnagas
  { name: 'Encender los faroles del sendero', x: 1700, y: 420, game: 'order', kind: 'lamp' },
  { name: 'Atrapar luciérnagas', x: 2050, y: 380, game: 'catch', kind: 'lamp' },
  { name: 'Descifrar el mapa del pantano', x: 1500, y: 520, game: 'route', kind: 'panel' },
].map((t, id) => ({ id, ...t }));

/* ---------------- rejillas de ventilación ---------------- */
const VENTS = [
  { id: 0, net: 'A', name: 'Cabaña', x: 980, y: 600 },
  { id: 1, net: 'A', name: 'Cobertizo', x: 2740, y: 1340 },
  { id: 2, net: 'A', name: 'Raíces', x: 2380, y: 2030 },
  { id: 3, net: 'B', name: 'Cueva', x: 3300, y: 1990 },
  { id: 4, net: 'B', name: 'Árboles muertos', x: 330, y: 1600 },
  { id: 5, net: 'B', name: 'Orilla', x: 2250, y: 1560 },
  { id: 6, net: 'C', name: 'Campo', x: 3480, y: 520 },
  { id: 7, net: 'C', name: 'Sendero', x: 1450, y: 420 },
  { id: 8, net: 'C', name: 'Laguna', x: 1010, y: 2150 },
  { id: 9, net: 'C', name: 'Charca', x: 1640, y: 880 },
];

/* ---------------- adornos del exterior (con semilla, sin pisar nada) ---------------- */

const PANEL_BOX = OBST.find((o) => o[4] === 'panel');
const PANEL = { x: PANEL_BOX[0] + PANEL_BOX[2] / 2, y: PANEL_BOX[1] + PANEL_BOX[3] + 22 };
const REACTOR = { x: 3060, y: 1930 };
const RPTS = [
  { side: 'a', name: 'Consola A', x: 3250, y: 960 },
  { side: 'b', name: 'Consola B', x: 560, y: 1560 },
];
const LABELS = FLOORS.filter((f) => f[5] && f[7].label && !f[7].noLabel).map((f) => f[7].label); // rótulos: que ningún objeto los tape
const SPOTS = [ // sitios que no se pueden tapar: tareas, rejillas, panel, consolas y botón
  ...TASKS.map((t) => [t.x, t.y]), ...VENTS.map((v) => [v.x, v.y]), [PANEL.x, PANEL.y], [C.x, C.y], ...RPTS.map((p) => [p.x, p.y]),
];
const BUILDINGS = [roomPoly('cabana'), roomPoly('cobertizo'), roomPoly('cueva')];
const DOCK_BOXES = DOCKS.map((d) => bbox(d));
function freeAt(x, y, rad, margin = 0) {
  if (!inPoly(OUTDOORS, x, y) || polyDist(OUTDOORS, x, y) < 60 + rad * 0.6) return false;
  for (const b of BUILDINGS) if (inPoly(b, x, y) || polyDist(b, x, y) < 80 + rad * 0.7) return false;
  for (const w of WATERS) if (inPoly(w, x, y) || polyDist(w, x, y) < 70 + rad * 0.7) return false;
  for (const d of DOCK_BOXES) if (x > d[0] - 90 - rad && x < d[0] + d[2] + 90 + rad && y > d[1] - 90 - rad && y < d[1] + d[3] + 90 + rad) {
    if (DOCKS.some((p) => inPoly(p, x, y) || polyDist(p, x, y) < 90 + rad)) return false;
  }
  for (const p of PATHS) if (lineDist(p, x, y) < 75 + rad * 0.6 + margin) return false;
  for (const d of DOOR_OUT) if (Math.hypot(x - d[0], y - d[1]) < 160 + rad) return false;
  for (const l of LABELS) if (Math.abs(x - l[0]) < 200 + rad && y > l[1] - 55 - rad && y < l[1] + 35 + rad) return false;
  for (const s of SPOTS) if (Math.hypot(x - s[0], y - s[1]) < 95 + rad * 0.8) return false;
  for (const o of OBST) if (x > o[0] - 50 - rad * 0.8 && x < o[0] + o[2] + 50 + rad * 0.8 && y > o[1] - 50 - rad * 0.8 && y < o[1] + o[3] + 50 + rad * 0.8) return false;
  return true;
}
{
  const r = rng(20261102);
  // zona (o todo el pantano), tipo, ancho, alto, cuántos
  const scatter = (zone, kinds) => {
    const b = bbox(zone);
    for (const [t, w, h, n] of kinds) {
      let placed = 0;
      for (let tries = 0; placed < n && tries < n * 240; tries++) {
        const x = b[0] + r() * b[2], y = b[1] + r() * b[3];
        if (!inPoly(zone, x, y)) continue;
        const rad = Math.max(w, h) / 2;
        if (!freeAt(x, y, rad)) continue;
        OBST.push([Math.round((x - w / 2) / 20) * 20, Math.round((y - h / 2) / 20) * 20, w, h, t]);
        placed++;
      }
    }
  };
  // el campo: setas gigantes de todos los tamaños y colores, con senderos entre ellas
  scatter(CAMPO, [
    ['shroomA', 220, 200, 3], ['shroomB', 200, 180, 3], ['shroomC', 180, 160, 3], ['shroomD', 210, 190, 3], ['shroomE', 170, 150, 3],
    ['shroomA', 130, 120, 3], ['shroomB', 120, 110, 3], ['shroomC', 110, 100, 3], ['shroomD', 120, 110, 3], ['shroomE', 100, 90, 3],
    ['glowshroom', 80, 80, 8], ['mushring', 100, 100, 3],
  ]);
  // los árboles muertos: troncos retorcidos que forman pasillos
  scatter(MUERTOS, [['deadtree', 120, 120, 30], ['log', 150, 50, 5], ['stump', 60, 60, 6], ['bigroot', 200, 110, 4], ['boulder', 90, 80, 3]]);
  // las raíces gigantes, arqueadas sobre el barro
  scatter(RAICES, [['bigroot', 220, 120, 9], ['swamptree', 150, 150, 5], ['log', 150, 50, 3], ['tallgrass', 100, 70, 6]]);
  scatter(SENDERO, [['swamptree', 150, 150, 4], ['glowshroom', 80, 80, 6], ['tallgrass', 100, 70, 5]]);
  // el resto del pantano
  scatter(OUTDOORS, [
    ['swamptree', 150, 150, 42], ['bigroot', 210, 110, 8], ['boulder', 90, 80, 6], ['log', 150, 50, 5],
    ['fern', 100, 100, 10], ['glowshroom', 80, 80, 12], ['tallgrass', 100, 70, 12], ['deadtree', 120, 120, 8],
  ]);
}

export const PANTANO = {
  scale: 1,
  propScale: 1.25,
  world: WORLD,
  floors: FLOORS,
  doors: DOORS,
  softCollide: true,
  obst: OBST,
  tasks: TASKS,
  vents: VENTS,
  button: { x: C.x, y: C.y },
  spawn: { x: C.x, y: C.y },
  panel: { x: PANEL.x, y: PANEL.y },
  reactor: REACTOR,
  rpts: RPTS,
};

// datos para dibujar (los usa el cliente): contornos, muelles, senderos y zonas
export const PANTANO_ART = { OUTDOORS, POND, LAGOON, POOLS, WATERS, DOCKS, DOOR_DEFS, PATHS, CAMPO, MUERTOS, RAICES, SENDERO, SHORE, CENTER: C, WORLD, TAU, R };
