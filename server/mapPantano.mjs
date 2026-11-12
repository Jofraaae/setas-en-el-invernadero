/* Pantano Esporado: un pantano misterioso de agua verdosa, árboles retorcidos, niebla, raíces
   gigantes y setas luminosas. Se arma igual que Micelaria (contornos libres, muros de edificio de
   dos celdas, puertas con hueco en el muro) y el motor lo trata como otro escenario más.

   Como en la Jungla de Among Us, no hay un descampado: todo lo que no es camino, claro o edificio
   es vegetación espesa que ni se pisa ni deja ver. El juego se recorre por SENDEROS de unos 200 px
   que unen claros y salas, con bifurcaciones y rutas alternativas:
     · Charca central, con la plataforma del botón, cuatro pasarelas y un anillo de MUELLES DE MADERA
     · Salas (9): Cabaña abandonada, Herbolario, Atalaya, Cobertizo de las barcas, Choza del
       ermitaño, Cueva subterránea, Madriguera de raíces, Ruinas hundidas y Mausoleo hundido
     · Claros: Campo de setas gigantes, Zona de árboles muertos, Raíces gigantes y la Laguna
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

// claros con nombre: el tipo de terreno y los objetos los distinguen
const CAMPO = chaikin([[2500, 260], [3480, 230], [3600, 620], [3520, 1000], [3060, 1060], [2680, 980], [2470, 640]], 2);
const MUERTOS = chaikin([[210, 1010], [860, 990], [1170, 1200], [1240, 1660], [950, 1860], [430, 1840], [230, 1540]], 2);
const RAICES = chaikin([[1800, 1800], [2700, 1780], [2720, 2330], [1800, 2330]], 2);
const SHORE = circle(C.x, C.y, 470, 56);
// la laguna del sur se quedaba a 80 px del borde del mundo (y el claro ni cabía): se aprieta en vertical para
// que detrás haya siempre una franja de bosque y no se vea el vacío del final del mapa
const squashY = (poly, y0, yMax) => {
  const bot = Math.max(...poly.map((q) => q[1]));
  const f = bot > yMax ? (yMax - y0) / (bot - y0) : 1;
  return poly.map(([x, y]) => [x, y0 + (y - y0) * f]);
};
const LAGUNA_AREA = squashY(chaikin(blob(1450, 2060, 390, 0.5, 0.05, 40), 1), 1653, 2250);
const ZONES = [CAMPO, MUERTOS, RAICES, SHORE, LAGUNA_AREA];

// el agua: la charca central, la laguna del sur y una poza entre los árboles muertos
const POND = chaikin(blob(C.x, C.y, 330, 1.3, 0.05, 40), 1);
const LAGOON = squashY(chaikin(blob(1450, 2060, 240, 2.1, 0.08, 30), 1), 1817, 2190);
const POOLS = [chaikin(blob(650, 1330, 90, 1.9, 0.14, 18), 1)];
const WATERS = [POND, LAGOON, ...POOLS];

/* ---------------- edificios ---------------- */

const CABANA = [[380, 400], [1080, 400], [1080, 540], [1220, 540], [1220, 920], [380, 920]];
const COBERTIZO = [[2580, 1060], [3000, 1060], [3000, 1400], [2580, 1400]];
const CUEVA = chaikin(blob(3060, 1900, 320, 0.9, 0.12, 26), 1);
const rectP = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const HERBOLARIO = rectP(1440, 330, 1860, 670);
const ATALAYA = rectP(2060, 330, 2400, 660);
const RUINAS = rectP(1120, 1500, 1440, 1780);
const MAUSOLEO = rectP(280, 1500, 620, 1780);
const CHOZA = rectP(3300, 1200, 3600, 1480);
const MADRIGUERA = rectP(2000, 1930, 2380, 2230);

/* ---------------- senderos ---------------- */
/* Cada sendero es una polilínea con su ancho: se abre como suelo (un rectángulo por tramo y un
   círculo en cada codo, así nunca se cruzan los bordes). El resto del mundo es vegetación. */

const LANES = [];
const LANE_FLOORS = [];
function lane(name, pts, w = 220, label = null) {
  LANES.push({ pts, w, name });
  const add = (poly_, k) => LANE_FLOORS.push(floor(`sendero-${LANE_FLOORS.length}`, poly_, '#2f4a3b', name, 'bog', { noEdge: true, ...(label && k === 0 ? { label, noMap: true } : { noLabel: true }) }));
  let k = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i < pts.length - 1) add(band([pts[i], pts[i + 1]], [w, w]), k++);
    add(circle(pts[i][0], pts[i][1], w / 2, 16), k++);
  }
}
const SEND = 'Sendero de las luciérnagas', CEN = 'Camino del cenagal', CUE = 'Camino de la cueva', RAI = 'Senda de las raíces';
lane(SEND, [[700, 340], [720, 260], [1000, 240], [1250, 320], [1340, 500], [1440, 500]], 220); // cabaña (norte) -> herbolario
lane(SEND, [[1860, 500], [2060, 500]], 200);                       // herbolario -> atalaya
lane(SEND, [[2400, 500], [2540, 500]], 200);                       // atalaya -> campo
lane(SEND, [[1650, 670], [1690, 760], [1770, 810]], 200);          // herbolario (sur) -> charca
lane(SEND, [[2230, 660], [2230, 770], [2150, 900]], 200);          // atalaya (sur) -> charca
lane(CEN, [[1230, 740], [1400, 780], [1540, 880], [1620, 980]], 220); // cabaña (este) -> charca
lane(CEN, [[900, 920], [900, 1060]], 200);                         // cabaña (sur) -> árboles muertos
lane(CEN, [[1390, 1230], [1180, 1230]], 200);                      // muelle oeste -> árboles muertos
lane(CEN, [[1100, 2060], [1020, 1990], [960, 1890]], 200);         // embarcadero -> árboles muertos
lane(CEN, [[1440, 1640], [1560, 1600], [1640, 1560]], 200);        // ruinas -> charca
lane(CUE, [[2640, 940], [2540, 1080], [2440, 1210]], 220); // campo -> muelle este
lane(CUE, [[2430, 1230], [2590, 1230]], 200);                      // muelle este -> cobertizo
lane(CUE, [[2800, 1430], [2860, 1530], [3060, 1590]], 200);        // cobertizo (sur) -> cueva
lane(CUE, [[3000, 1150], [3150, 1200], [3300, 1340]], 220);        // cobertizo (este) -> choza
lane(CUE, [[3450, 1200], [3450, 1000]], 200);                      // choza -> campo
lane(CUE, [[2750, 1900], [2600, 1900]], 220);                      // cueva (oeste) -> raíces
lane(RAI, [[2020, 1830], [1990, 1690]], 220);        // raíces -> charca
lane(RAI, [[1830, 2000], [1900, 1850], [1900, 1690]], 220);        // laguna -> charca

const FLOORS = [
  floor('campo', CAMPO, '#2a4a46', 'Campo de setas gigantes', 'glowfield', { noEdge: true, mapOnly: true, label: [3040, 1010] }),
  floor('muertos', MUERTOS, '#3a3a34', 'Zona de árboles muertos', 'deadland', { noEdge: true, mapOnly: true, label: [700, 1240] }),
  floor('raices', RAICES, '#2e3f2c', 'Raíces gigantes', 'rootsoil', { noEdge: true, mapOnly: true, label: [2540, 2290] }),
  floor('laguna-area', LAGUNA_AREA, '#2f4a3b', 'Laguna', 'bog', { noEdge: true, mapOnly: true, label: [1450, 2250] }),
  floor('orilla', SHORE, '#35503f', 'Charca central', 'bog', { noEdge: true, mapOnly: true, label: [1700, 1790] }),
  ...LANE_FLOORS,
  floor('charca', POND, '#2c6b57', null, 'murk', { carve: true, water: true, wall: 'water', seeThrough: true }),
  floor('laguna', LAGOON, '#2c6b57', null, 'murk', { carve: true, water: true, wall: 'water', seeThrough: true }),
  ...POOLS.map((p, i) => floor('poza' + i, p, '#2c6b57', null, 'murk', { carve: true, water: true, wall: 'water', seeThrough: true })),
  floor('cabana', CABANA, '#6b5a40', 'Cabaña abandonada', 'cabin', { room: true, wall: 'rot', label: [800, 880] }),
  floor('herbolario', HERBOLARIO, '#5f5238', 'Herbolario', 'cabin', { room: true, wall: 'rot', label: [1650, 620] }),
  floor('atalaya', ATALAYA, '#5d4b36', 'Atalaya del cenagal', 'boards', { room: true, wall: 'rot', label: [2230, 610] }),
  floor('cobertizo', COBERTIZO, '#5d4b36', 'Cobertizo de las barcas', 'boards', { room: true, wall: 'rot', label: [2790, 1370] }),
  floor('choza', CHOZA, '#6b5a40', 'Choza del ermitaño', 'cabin', { room: true, wall: 'rot', label: [3450, 1440] }),
  floor('cueva', CUEVA, '#3d4443', 'Cueva subterránea', 'cavefloor', { room: true, wall: 'rock', label: [3060, 2105] }),
  floor('madriguera', MADRIGUERA, '#3a2f22', 'Madriguera de raíces', 'rootsoil', { room: true, wall: 'forest', label: [2190, 2195] }),
  floor('ruinas', RUINAS, '#4a4f4c', 'Ruinas hundidas', 'ruin', { room: true, wall: 'rock', label: [1280, 1745] }),
  floor('mausoleo', MAUSOLEO, '#444a48', 'Mausoleo hundido', 'ruin', { room: true, wall: 'rock', label: [450, 1745] }),
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
addDoor('herbolario', HERBOLARIO, 'W', 500);
addDoor('herbolario', HERBOLARIO, 'E', 500);
addDoor('herbolario', HERBOLARIO, 'S', 1650);
addDoor('atalaya', ATALAYA, 'W', 500);
addDoor('atalaya', ATALAYA, 'E', 500);
addDoor('atalaya', ATALAYA, 'S', 2230);
addDoor('cobertizo', COBERTIZO, 'W', 1230);
addDoor('cobertizo', COBERTIZO, 'S', 2800);
addDoor('cobertizo', COBERTIZO, 'E', 1150);
addDoor('choza', CHOZA, 'W', 1340);
addDoor('choza', CHOZA, 'N', 3450);
addDoor('cueva', CUEVA, 'W', 1900);
addDoor('cueva', CUEVA, 'N', 3060);
addDoor('madriguera', MADRIGUERA, 'N', 2190);
addDoor('madriguera', MADRIGUERA, 'W', 2080);
addDoor('ruinas', RUINAS, 'E', 1640);
addDoor('ruinas', RUINAS, 'W', 1640);
addDoor('mausoleo', MAUSOLEO, 'E', 1640);
addDoor('mausoleo', MAUSOLEO, 'N', 450);

// los huecos se abren después de todos los edificios (último en el orden = gana)
for (const d of DOOR_DEFS) FLOORS.push(rect(`puerta-${d.key}-${d.side}`, ...d.floor, '#6b5a40', null, 'cabin', { door: true }));

/* Muelles de madera: la plataforma del botón, cuatro pasarelas hasta las orillas, un anillo de
   tablas alrededor de la plataforma y el embarcadero de la laguna. Se abren sobre el agua. */
const DOCKS = [];
// todos los tramos se llaman igual (para los bots); no llevan rótulo en el mapa
const dock = (key, pts) => { DOCKS.push(pts); FLOORS.push(floor(key, pts, '#7a5f3a', 'Muelles de madera', 'boards', { bridge: true, noLabel: true })); };
const dockRect = (key, x, y, w, h) => { DOCKS.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); FLOORS.push(rect(key, x, y, w, h, '#7a5f3a', 'Muelles de madera', 'boards', { bridge: true, noLabel: true })); };
// orden de dibujo: arcos del anillo (debajo), las cuatro pasarelas encima y la plataforma al final
const arc = (a0, a1, r0 = 215) => {
  const line = [];
  for (let a = a0; a <= a1 + 1e-6; a += (6 * Math.PI) / 180) line.push([C.x + Math.cos(a) * r0, C.y + Math.sin(a) * r0]);
  return band(line, line.map(() => 100));
};
// los arcos entran 6° bajo cada pasarela, así no queda ninguna rendija entre ellos
for (let q = 0; q < 4; q++) dock('anillo' + q, arc((q * Math.PI) / 2 + (6 * Math.PI) / 180, ((q + 1) * Math.PI) / 2 - (6 * Math.PI) / 180));
dockRect('muelleN', C.x - 60, C.y - 420, 120, 420);
dockRect('muelleS', C.x - 60, C.y, 120, 420);
dockRect('muelleO', C.x - 520, C.y - 60, 520, 120);
dockRect('muelleE', C.x, C.y - 60, 520, 120);
dock('plataforma', circle(C.x, C.y, 120, 28));
dockRect('embarcadero', 1090, 2005, 730, 110);

const DOORS = DOOR_DEFS.map((d) => ({ x: d.box[0], y: d.box[1], w: d.box[2], h: d.box[3], rooms: [FIDX[d.key]] }));

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
put(420, 800, 90, 80, 'stove'); put(650, 620, 160, 56, 'table');
put(610, 690, 46, 46, 'stump'); put(800, 690, 46, 46, 'stump');
put(1000, 818, 70, 56, 'chest'); put(1130, 580, 60, 60, 'barrel');

/* ---- Cobertizo de las barcas ---- */
put(2630, 1095, 170, 70, 'rowboat'); put(2830, 1095, 100, 46, 'fishrack');
put(2895, 1296, 50, 50, 'barrel');
put(2900, 1215, 60, 56, 'panel');

/* ---- Cueva subterránea ---- */
put(2840, 1720, 90, 90, 'crystal'); put(3120, 1740, 100, 90, 'crystal');
put(2900, 2050, 80, 80, 'stalag');
put(3000, 1700, 120, 90, 'boulder'); put(3000, 2080, 90, 60, 'boulder');
put(2900, 1940, 60, 60, 'stalag'); put(3090, 2050, 70, 50, 'crystal');
put(3000, 1920, 120, 60, 'core');

/* ---- Herbolario ---- */
put(1500, 375, 140, 46, 'shelf'); put(1690, 375, 110, 46, 'shelf');
put(1500, 570, 56, 56, 'barrel'); put(1764, 570, 56, 56, 'barrel');

/* ---- Atalaya del cenagal ---- */
put(2110, 380, 56, 56, 'barrel'); put(2290, 380, 60, 46, 'chest'); put(2110, 560, 56, 56, 'barrel');

/* ---- Choza del ermitaño ---- */
put(3345, 1380, 110, 56, 'bed'); put(3490, 1385, 70, 50, 'stove'); 

/* ---- Madriguera de raíces ---- */
put(2270, 1985, 80, 60, 'stump'); put(2060, 2130, 150, 50, 'log');

/* ---- Ruinas hundidas ---- */
put(1258, 1545, 44, 44, 'stalag'); put(1258, 1696, 44, 44, 'boulder');

/* ---- Mausoleo hundido ---- */
put(405, 1688, 84, 50, 'chest'); put(520, 1694, 40, 40, 'barrel');

/* ---- Orilla de la charca: faroles de pantano y juncos ---- */
put(1470, 1020, 40, 40, 'lanternpost'); put(2310, 1020, 40, 40, 'lanternpost');
put(1470, 1420, 40, 40, 'lanternpost'); put(2310, 1420, 40, 40, 'lanternpost');

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
  { name: 'Encender el farol del cobertizo', x: 2790, y: 1262, game: 'order', kind: 'lamp' },
  // Cueva subterránea
  { name: 'Sellar las goteras de la cueva', x: 2960, y: 1850, game: 'spots', kind: 'filter' },
  { name: 'Recoger cristales luminosos', x: 3200, y: 1860, game: 'sort', kind: 'tray' },
  { name: 'Pintar las runas del fondo', x: 2830, y: 2080, game: 'scramble', kind: 'keypad' },
  { name: 'Despertar a las luciérnagas', x: 3220, y: 2050, game: 'order', kind: 'switchbox' },
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
  { name: 'Contar las ranas', x: 2250, y: 1480, game: 'count', kind: 'tray' },
  { name: 'Analizar el agua verde', x: 1540, y: 1500, game: 'dose', kind: 'scale' },
  { name: 'Cambiar las velas de los faroles', x: 2250, y: 975, game: 'seq', kind: 'lamp' },
  // Campo de setas gigantes
  { name: 'Recoger setas luminosas', x: 2750, y: 520, game: 'sort', kind: 'tray' },
  { name: 'Medir las setas gigantes', x: 3050, y: 395, game: 'slider', kind: 'scale' },
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
  { name: 'Recoger leña seca', x: 365, y: 1225, game: 'seq', kind: 'crate' },
  { name: 'Desenterrar las raíces muertas', x: 700, y: 1700, game: 'timing', kind: 'switchbox' },
  // Raíces gigantes
  { name: 'Cortar las raíces', x: 1930, y: 2080, game: 'timing', kind: 'switchbox' },
  { name: 'Plantar esquejes', x: 2480, y: 2150, game: 'sprout', kind: 'sprouts' },
  { name: 'Medir las raíces gigantes', x: 2450, y: 1900, game: 'slider', kind: 'scale' },
  { name: 'Reparar la bomba de achique', x: 2100, y: 1860, game: 'pipe', kind: 'valve' },
  { name: 'Sondear el fango', x: 2600, y: 2150, game: 'sonar', kind: 'terminal' },
  // Embarcadero de la laguna
  { name: 'Cebar las cañas', x: 1300, y: 2060, game: 'hold', kind: 'valve' },
  { name: 'Vaciar la barca', x: 1600, y: 2060, game: 'type', kind: 'tray' },
  // Herbolario
  { name: 'Secar las hierbas', x: 1585, y: 545, game: 'match', kind: 'clothesline' },
  { name: 'Moler las raíces', x: 1770, y: 530, game: 'hold', kind: 'mortar' },
  { name: 'Etiquetar los tarros', x: 1560, y: 470, game: 'sort', kind: 'jars' },
  { name: 'Hervir el tónico', x: 1710, y: 465, game: 'brew', kind: 'cauldron' },
  // Atalaya del cenagal
  { name: 'Encender el faro de señales', x: 2200, y: 470, game: 'order', kind: 'lamp' },
  { name: 'Orientar el catalejo', x: 2300, y: 470, game: 'slider', kind: 'scale' },
  { name: 'Anotar el registro de niebla', x: 2310, y: 560, game: 'scramble', kind: 'terminal' },
  // Choza del ermitaño
  { name: 'Preparar el té de musgo', x: 3450, y: 1320, game: 'brew', kind: 'teaset' },
  { name: 'Remendar la manta', x: 3400, y: 1270, game: 'match', kind: 'clothesline' },
  { name: 'Contar las provisiones', x: 3530, y: 1330, game: 'count', kind: 'tray' },
  // Madriguera de raíces
  { name: 'Despejar las raíces', x: 2110, y: 2060, game: 'seq', kind: 'crate' },
  { name: 'Medir la humedad', x: 2200, y: 2070, game: 'dose', kind: 'scale' },
  { name: 'Cavar la salida', x: 2290, y: 2095, game: 'pipe', kind: 'valve' },
  // Ruinas hundidas
  { name: 'Descifrar las inscripciones', x: 1215, y: 1572, game: 'memory', kind: 'terminal' },
  { name: 'Recolocar las piedras', x: 1345, y: 1708, game: 'seq', kind: 'crate' },
  { name: 'Limpiar el altar', x: 1215, y: 1708, game: 'spots', kind: 'filter' },
  { name: 'Encender el brasero antiguo', x: 1345, y: 1572, game: 'hold', kind: 'hearth' },
  // Mausoleo hundido
  { name: 'Encender las velas del mausoleo', x: 350, y: 1700, game: 'order', kind: 'lamp' },
  { name: 'Abrir la losa', x: 360, y: 1585, game: 'code', kind: 'keypad' },
  { name: 'Contar las urnas', x: 540, y: 1565, game: 'count', kind: 'tray' },
].map((t, id) => ({ id, ...t }));

/* ---------------- rejillas de ventilación ---------------- */
const VENTS = [
  { id: 0, net: 'A', name: 'Cabaña', x: 980, y: 600 },
  { id: 1, net: 'A', name: 'Cobertizo', x: 2740, y: 1340 },
  { id: 2, net: 'A', name: 'Madriguera', x: 2300, y: 2160 },
  { id: 3, net: 'A', name: 'Atalaya', x: 2200, y: 520 },
  { id: 4, net: 'B', name: 'Cueva', x: 2850, y: 1900 },
  { id: 5, net: 'B', name: 'Mausoleo', x: 450, y: 1645 },
  { id: 6, net: 'B', name: 'Orilla', x: 2200, y: 1545 },
  { id: 7, net: 'B', name: 'Herbolario', x: 1700, y: 590 },
  { id: 8, net: 'B', name: 'Ruinas', x: 1280, y: 1640 },
  { id: 9, net: 'C', name: 'Campo', x: 3480, y: 520 },
  { id: 10, net: 'C', name: 'Choza', x: 3535, y: 1255 },
  { id: 11, net: 'C', name: 'Laguna', x: 1180, y: 2175 },
  { id: 12, net: 'C', name: 'Charca', x: 1640, y: 880 },
  { id: 13, net: 'C', name: 'Árboles muertos', x: 430, y: 1150 },
];

/* ---------------- adornos del exterior (con semilla, sin pisar nada) ---------------- */

const PANEL_BOX = OBST.find((o) => o[4] === 'panel');
const PANEL = { x: PANEL_BOX[0] + PANEL_BOX[2] / 2, y: PANEL_BOX[1] + PANEL_BOX[3] + 22 };
const REACTOR = { x: 3060, y: 1930 };
const RPTS = [
  { side: 'a', name: 'Consola A', x: 3250, y: 960 },
  { side: 'b', name: 'Consola B', x: 740, y: 1560 },
];
/* Rótulos: cada zona pone su nombre donde no tape nada (tareas, rejillas, objetos, puertas ni otros
   rótulos). Si el nombre cabe dentro del lugar se queda dentro; si no (las salas pequeñas), va
   justo fuera, encima o debajo del edificio. Se calcula una vez, con los objetos hechos a mano. */
const LBL_H = 34;
const lblW = (name) => Math.round(name.length * 14.5 + 56); // la pastilla de 28 px en negrita, con holgura
const lblBox = (x, y, w) => [x - w / 2, y - 25, w, LBL_H];
const lblHit = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
{
  const around = (x, y, r) => [x - r, y - r, r * 2, r * 2];
  const blockers = [
    ...OBST.filter((o) => o[4] !== 'panel').map((o) => [o[0] - 8, o[1] - 8, o[2] + 16, o[3] + 16]),
    ...TASKS.map((t) => around(t.x, t.y, 40)), ...VENTS.map((v) => around(v.x, v.y, 34)),
    around(PANEL.x, PANEL.y, 40), around(C.x, C.y, 60), ...RPTS.map((p) => around(p.x, p.y, 40)),
    ...DOOR_DEFS.map((d) => [d.box[0] - 20, d.box[1] - 20, d.box[2] + 40, d.box[3] + 40]),
    ...DOOR_OUT.map((d) => around(d[0], d[1], 70)),
  ];
  const named = FLOORS.filter((f) => f[5] && f[7].label && !f[7].noLabel && !f[7].mapOnly);
  const placed = [];
  const free = (box) => box[0] > 20 && box[1] > 20 && box[0] + box[2] < WORLD.w - 20 && box[1] + box[3] < WORLD.h - 20
    && !blockers.some((b) => lblHit(box, b)) && !placed.some((b) => lblHit(box, b));
  const insideBox = (poly_, box, inset) => [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5], [0.5, 0], [0.5, 1]].every(([u, v]) => {
    const x = box[0] + box[2] * u, y = box[1] + box[3] * v;
    return inPoly(poly_, x, y) && polyDist(poly_, x, y) >= inset;
  });
  // primero los claros, senderos y muelles (conservan su sitio si está libre); luego las salas
  const order = [...named.filter((f) => !f[7].room), ...named.filter((f) => f[7].room)];
  for (const f of order) {
    const o = f[7], w = lblW(f[5]), poly_ = o.poly || null;
    const [px, py] = o.label;
    const [bx, by, bw, bh] = f.slice(0, 4);
    let best = null;
    const cand = (x, y, pen) => {
      const box = lblBox(x, y, w);
      if (!free(box)) return;
      const d = Math.hypot(x - px, y - py) + pen;
      if (!best || d < best.d) best = { d, x, y, box };
    };
    const inner = (x, y) => (poly_ ? insideBox(poly_, lblBox(x, y, w), o.room ? 46 : 0) : true);
    for (let y = by; y < by + bh + 60; y += 20) for (let x = bx; x < bx + bw + 20; x += 20) if (inner(x, y)) cand(x, y, 0);
    if (!best) { // no cabe dentro: fuera, pegado al borde de arriba o de abajo
      for (let x = bx - w / 2; x < bx + bw + w / 2; x += 20) { cand(x, by - 12, 400); cand(x, by + bh + 38, 400); }
    }
    // en el mapa de la M (a escala pequeña) cada sala se rotula en su centro, aunque en el juego el rótulo vaya fuera
    if (o.room) o.mapLabel = [Math.round(bx + bw / 2), Math.round(by + bh / 2)];
    if (best) { o.label = [Math.round(best.x), Math.round(best.y)]; placed.push(best.box); }
    else placed.push(lblBox(px, py, w)); // sin hueco: se queda donde estaba
  }
}

const LABELS = FLOORS.filter((f) => f[5] && f[7].label && !f[7].noLabel && !f[7].mapOnly).map((f) => f[7].label); // rótulos: que ningún objeto los tape
const SPOTS = [ // sitios que no se pueden tapar: tareas, rejillas, panel, consolas y botón
  ...TASKS.map((t) => [t.x, t.y]), ...VENTS.map((v) => [v.x, v.y]), [PANEL.x, PANEL.y], [C.x, C.y], ...RPTS.map((p) => [p.x, p.y]),
];
const BUILDINGS = ['cabana', 'herbolario', 'atalaya', 'cobertizo', 'choza', 'cueva', 'madriguera', 'ruinas', 'mausoleo'].map(roomPoly);
const DOCK_BOXES = DOCKS.map((d) => bbox(d));
/* Pasillos garantizados: de cada tarea o rejilla del exterior sale una línea hasta el punto de
   sendero o puerta más cercano, y ningún adorno puede caer en ella. Así el reparto con semilla
   nunca encierra una tarea entre setas o troncos. */
const HUBS = [...LANES.flatMap((L) => L.pts), ...DOOR_OUT, [C.x, C.y + 480], [C.x, C.y - 480]];
const AISLES = [...TASKS, ...VENTS]
  .filter((t) => !BUILDINGS.some((b) => inPoly(b, t.x, t.y)) && !WATERS.some((w) => inPoly(w, t.x, t.y)) && !DOCKS.some((d) => inPoly(d, t.x, t.y)))
  .filter((t) => !LANES.some((L) => lineDist(L.pts, t.x, t.y) < L.w / 2) && Math.hypot(t.x - C.x, t.y - C.y) > 480)
  .map((t) => {
    let best = null;
    for (const h of HUBS) { const d = Math.hypot(h[0] - t.x, h[1] - t.y); if (!best || d < best.d) best = { d, h }; }
    return [[t.x, t.y], best.h];
  });
// columna vertebral de la zona de árboles muertos: un camino garantizado que la cruza de punta a punta
// (del sendero de la charca al de la laguna), para que ningún reparto de troncos la deje partida en dos
const MUERTOS_SPINE = [[1180, 1230], [760, 1240], [520, 1380], [560, 1560], [700, 1700], [960, 1890]];
for (let i = 0; i + 1 < MUERTOS_SPINE.length; i++) AISLES.push([MUERTOS_SPINE[i], MUERTOS_SPINE[i + 1]]);
function freeAt(x, y, rad, margin = 0, tight = false) {
  for (const b of BUILDINGS) if (inPoly(b, x, y) || polyDist(b, x, y) < (tight ? 40 + rad * 0.4 : 55 + rad * 0.6)) return false;
  for (const w of WATERS) if (inPoly(w, x, y) || polyDist(w, x, y) < 70 + rad * 0.7) return false;
  for (const d of DOCK_BOXES) if (x > d[0] - 90 - rad && x < d[0] + d[2] + 90 + rad && y > d[1] - 90 - rad && y < d[1] + d[3] + 90 + rad) {
    if (DOCKS.some((p) => inPoly(p, x, y) || polyDist(p, x, y) < 90 + rad)) return false;
  }
  for (const L of LANES) if (lineDist(L.pts, x, y) < L.w / 2 + 25 + rad * 0.6 + margin) return false;
  for (const A of AISLES) if (lineDist(A, x, y) < 75 + rad * 0.5) return false;
  for (const d of DOOR_OUT) if (Math.hypot(x - d[0], y - d[1]) < (tight ? 120 + rad * 0.5 : 160 + rad)) return false;
  for (const l of LABELS) if (Math.abs(x - l[0]) < 200 + rad && y > l[1] - 55 - rad && y < l[1] + 35 + rad) return false;
  for (const s of SPOTS) if (Math.hypot(x - s[0], y - s[1]) < (tight ? 72 + rad * 0.4 : 85 + rad * 0.6)) return false;
  for (const o of OBST) { const m = tight ? 8 + rad * 0.5 : 40 + rad * 0.7; if (x > o[0] - m && x < o[0] + o[2] + m && y > o[1] - m && y < o[1] + o[3] + m) return false; }
  return true;
}
{
  const r = rng(20261102);
  // zona (o todo el pantano), tipo, ancho, alto, cuántos
  const scatter = (zone, kinds, tight = false) => {
    const b = bbox(zone);
    for (const [t, w, h, n] of kinds) {
      let placed = 0;
      for (let tries = 0; placed < n && tries < n * 600; tries++) {
        const x = b[0] + r() * b[2], y = b[1] + r() * b[3];
        if (!inPoly(zone, x, y)) continue;
        const rad = Math.max(w, h) / 2;
        if (!freeAt(x, y, rad, 0, tight)) continue;
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
  // segunda pasada, más apretada: la espesura que rellena cada claro (huecos entre los troncos)
  scatter(CAMPO, [['glowshroom', 80, 80, 10], ['mushring', 100, 100, 2]], true);
  scatter(MUERTOS, [['deadtree', 120, 120, 18], ['stump', 60, 60, 6], ['log', 150, 50, 4], ['bigroot', 200, 110, 3]], true);
  scatter(RAICES, [['bigroot', 170, 95, 9], ['swamptree', 150, 150, 4], ['log', 130, 44, 3], ['tallgrass', 100, 70, 6], ['fern', 100, 100, 4]], true);
  // la laguna y la charca: juncos, helechos y algún árbol en las orillas
  scatter(LAGUNA_AREA, [['swamptree', 150, 150, 6], ['tallgrass', 100, 70, 8], ['fern', 100, 100, 4], ['glowshroom', 80, 80, 5], ['log', 150, 50, 2]]);
  scatter(SHORE, [['tallgrass', 100, 70, 8], ['fern', 100, 100, 4], ['glowshroom', 80, 80, 6], ['swamptree', 150, 150, 3]]);
  scatter(LAGUNA_AREA, [['swamptree', 150, 150, 5], ['tallgrass', 100, 70, 6], ['bigroot', 200, 110, 3]], true);
  scatter(SHORE, [['swamptree', 150, 150, 4], ['fern', 100, 100, 4]], true);
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
const WALK = [...ZONES, ...LANE_FLOORS.map((f) => f[7].poly)]; // todo lo que se pisa fuera de los edificios
export const PANTANO_ART = { POND, LAGOON, POOLS, WATERS, DOCKS, DOOR_DEFS, LANES, WALK, ZONES, CAMPO, MUERTOS, RAICES, SHORE, LAGUNA_AREA, CENTER: C, WORLD, TAU, R };
