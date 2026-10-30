
/* ================================================================
   Sala de partida de "Among Shrooms".
   Una instancia = una sala (el id de instancia es el código de 4 letras).
   El motor de la partida vive aquí: el servidor manda, los clientes solo
   envían órdenes (movimiento, tareas, votos...) y reciben su estado.
   ================================================================ */

import { MICELARIA } from './mapMicelaria.mjs';
import { BotManager } from './bots.mjs';
import { say } from './botChat.mjs';

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 15;
const TICK_MS = 50;
const SPEED = 250;
const RADIUS = 16;
const KILL_RANGE = 80;
const KILL_SLACK = 24; // margen de red al matar
const USE_RANGE = 90;
const REPORT_RANGE = 120;
const INTERROG_RANGE = 110; // alcance del Detective: hay que tener a alguien al lado para interrogarle
const TRACK_RANGE = 120;    // alcance del Localizador: hay que tener a alguien al lado para marcarle
const ENG_VENT_MS = 15000; // el ingeniero no puede quedarse más tiempo dentro de una rejilla
const SCI_BATTERY_MS = 25000; // el panel del científico dura esto en total por partida
const RESULT_MS = 9000;
const ROLES_MS = 5000;        // pantalla de reparto de roles antes de jugar
const INPUT_SILENCE_MS = 800; // si el cliente deja de mandar órdenes, el jugador se frena
const MV_EXTRA_CAP = 300;     // ms de más sobre el reloj real que un cliente puede reclamar al mover
const REACTOR_MS = 30000;     // tiempo para resolver el sabotaje del reactor
const REACTOR_HOLD_MS = 5000; // hay que mantener las dos consolas a la vez
const SHIFT_MORPH_MS = 1500;  // la transformación tarda un momento: hasta aquí la skin y el nombre son los tuyos
const SHIFT_MS = 15000;       // cuánto dura la transformación ya visible
const SHIFT_FREEZE_MS = 1000; // congelado mientras recupera su propia forma
const ALERT_MS = 10000;       // el Alertador avisa a todos durante este tiempo al caer
const VIPER_FX_MS = 1500;     // el veneno de la Víbora solo avisa al caer el cuerpo: el resto es el propio cuerpo
const GUARD_MS = 40000;       // el escudo del Ángel Guardián dura esto, o hasta que aguanta un golpe
const GUARD_RANGE = 110;      // alcance del Ángel para escudar a un tripulante
const FAIL_KILL_CD_MS = 10000; // si el impostor intenta matar y el escudo lo impide, su recarga es fija
const JUDGE_RESULT_MS = 15000; // el resultado del Juez tiene una secuencia con varias frases
const INVIS_MS = 10000;       // el Espectro se vuelve invisible durante este tiempo
const BLIND_RANGE = 130;      // alcance del Cegador: hay que tener a un tripulante vivo al lado para cegarle
const GHOST_CREW = ['angel', 'lantern', 'keymaster']; // roles de fantasma de la tripulación (secretos hasta morir)
const GHOST_IMP = ['blinder'];                        // roles de fantasma de los impostores
const HOLD_RANGE = 90;        // distancia para mantener una consola
const OFFLINE_GRACE_MS = 60000; // margen para volver: una pestaña en segundo plano no te saca de la sala
const WATCH_MS = 15000;
const SAVE_EVERY_MS = 2500;
const ROOM_SYNC_MS = 15000;   // cada cuánto se refresca el anuncio de esta sala en el listado
const LOBBY_CHAT_MAX = 40;

// [mínimo, máximo, paso]. imps 0 = automático.
const DEFAULTS = { imps: 0, killCd: 40, sabCd: 40, reactorCd: 60, btnCd: 20, meetSec: 20, voteSec: 40, tasks: 5, speed: 100, vision: 100, shifter: 1, shiftCd: 40, viper: 1, rotSec: 15, engineer: 1, engCd: 15, alerter: 1, judge: 1, angel: 1, angelCd: 60, scientist: 1, scientistCd: 10, spectre: 1, spectreCd: 40, detective: 1, tracker: 1, trackerMs: 40, trackerCd: 30, lantern: 1, lanternR: 250, keymaster: 1, keyCd: 40, blinder: 1, blindCd: 30, blindSec: 5 };
// Los roles llevan una cantidad (0 = fuera de la partida). El tope real lo pone cada sala según sus
// jugadores (ver roleLimit): aquí solo va el máximo posible con la sala llena.
const RANGES = { imps: [0, 7, 1], killCd: [5, 60, 5], sabCd: [10, 90, 5], reactorCd: [10, 180, 10], btnCd: [0, 60, 5], meetSec: [10, 180, 5], voteSec: [20, 90, 5], tasks: [1, 8, 1], speed: [60, 140, 10], vision: [50, 200, 10], shifter: [0, 7, 1], shiftCd: [10, 90, 5], viper: [0, 7, 1], rotSec: [5, 45, 5], engineer: [0, 14, 1], engCd: [5, 60, 5], alerter: [0, 14, 1], judge: [0, 14, 1], angel: [0, 14, 1], angelCd: [10, 180, 10], scientist: [0, 14, 1], scientistCd: [5, 60, 5], spectre: [0, 7, 1], spectreCd: [10, 90, 5], detective: [0, 14, 1], tracker: [0, 14, 1], trackerMs: [10, 90, 5], trackerCd: [10, 90, 5], lantern: [0, 14, 1], lanternR: [150, 400, 50], keymaster: [0, 14, 1], keyCd: [10, 120, 5], blinder: [0, 7, 1], blindCd: [10, 120, 5], blindSec: [2, 15, 1] };
// Qué ajustes son una cantidad de jugadores con ese rol, y de qué bando salen.
const CREW_ROLE_KEYS = ['engineer', 'alerter', 'judge', 'scientist', 'detective', 'tracker', 'angel', 'lantern', 'keymaster'];
const IMP_ROLE_KEYS = ['shifter', 'viper', 'spectre', 'blinder'];

// El invernadero de siempre ocupa la izquierda; a su derecha queda una franja ancha donde
// viven las tres salas nuevas, cada una al final de su pasillo y con holgura por delante,
// sin tocar el borde del mapa. El mapa no es cuadrado: es bastante más ancho que alto.
const WORLD_BASE = { w: 4100, h: 1800 };
const FLOORS_BASE = [
  [540, 820, 460, 120, '#34402c', null],
  [300, 580, 120, 160, '#34402c', null],
  [780, 240, 220, 120, '#34402c', null],
  [1380, 480, 120, 180, '#34402c', null],
  [1760, 280, 300, 120, '#34402c', null],
  [2300, 560, 120, 200, '#34402c', null],
  [1600, 900, 540, 120, '#34402c', null],
  [1920, 1020, 120, 260, '#34402c', null],
  [2360, 1060, 100, 220, '#34402c', null],
  [1120, 1160, 120, 200, '#34402c', null],
  [800, 1480, 100, 120, '#34402c', null],
  [260, 1040, 120, 200, '#34402c', null],
  [1460, 1500, 440, 120, '#34402c', null],
  [640, 780, 120, 40, '#34402c', null],
  [140, 120, 640, 460, '#2b4a2f', 'Semillero'],
  [1000, 100, 760, 380, '#25503a', 'Vivero'],
  [2060, 140, 560, 420, '#3a2e57', 'Luces UV'],
  [1000, 660, 600, 500, '#3b4a33', 'Sala Principal'],
  [2140, 760, 380, 300, '#4a4030', 'Almacén'],
  [1900, 1280, 740, 420, '#27464f', 'Cámara fría'],
  [180, 1240, 620, 440, '#4a3a26', 'Compost'],
  [900, 1360, 560, 320, '#4a2f36', 'Comedor'],
  [100, 740, 440, 300, '#3a3f48', 'Sala de máquinas'],
  [640, 620, 260, 160, '#43392b', 'Herramientas'],
  [1560, 1380, 280, 240, '#2a4a4c', 'Riego'],
  // Tres salas más, con lo mismo que las demás: suelo propio, nombre, adornos con colisión y
  // sus misiones. Van en medidas base, como el resto. Cada una a la derecha del invernadero,
  // con sitio de sobra alrededor para que se vean bien en el mapa y ningún borde pegado.
  [2725, 758.33, 366.67, 333.33, '#4d4224', 'Embalaje'],
  [2875, 1141.67, 366.67, 333.33, '#2e4a35', 'Esquejes'],
  [3475, 1141.67, 366.67, 333.33, '#234250', 'Depósito'],
  // Los tres pasillos que llevan hasta ellas (sin nombre: los pasillos no tienen puertas).
  // Cada uno arranca justo en la pared de la sala de la que sale y llega hasta la puerta de
  // la siguiente: son pasillos largos, no un simple hueco en el muro.
  [2541.67, 825, 166.67, 100, '#34402c', null],     // del Almacén a Embalaje
  [2658.33, 1325, 200, 100, '#34402c', null],       // de la Cámara fría a Esquejes
  [3258.33, 1275, 200, 100, '#34402c', null],       // de Esquejes a Depósito
];
// [x, y, ancho, alto, tipo de objeto]: el tipo solo decide cómo se dibuja.
const OBST_BASE = [
  [1260, 860, 80, 80, 'machine'],
  [1500, 1060, 60, 60, 'barrel'], [1040, 1080, 80, 40, 'crate'], [1060, 700, 60, 60, 'barrel'],
  [240, 240, 240, 40, 'beds'], [240, 400, 240, 40, 'beds'], [580, 300, 40, 160, 'pipe'],
  // Vivero: los tres bancales repartidos por la sala (arriba al centro, a media altura a la
  // derecha y abajo a la izquierda), ni en columna ni arrimados a las paredes
  [1250, 130, 160, 40, 'beds'], [1520, 245, 200, 40, 'beds'], [1130, 380, 200, 40, 'beds'],
  [2260, 300, 160, 80, 'machine'],
  [2200, 800, 60, 60, 'crate'], [2320, 928.33, 60, 60, 'crate'],
  [2000, 1340, 200, 60, 'freezer'], [2380, 1580, 200, 60, 'crate'], [2200, 1460, 60, 120, 'freezer'],
  [300, 1320, 120, 80, 'compost'], [560, 1500, 120, 100, 'compost'],
  [1060, 1440, 200, 100, 'table'],
  [320, 880, 120, 80, 'machine'],
  [1640, 1460, 80, 80, 'machine'],
  [680, 640, 120, 40, 'bench'],
  [188, 762, 64, 58, 'panel'],   // cuadro de luces: objeto propio, con colisión
  [1990, 1590, 120, 60, 'core'], // núcleo del reactor: objeto propio, con colisión
];
// Cada tarea tiene su objeto propio (kind) y su minijuego (game).
const TASKS_BASE = [
  { id: 0, name: 'Clasificar semillas', x: 260, y: 170, game: 'sort', kind: 'tray' },
  { id: 1, name: 'Reparar cables', x: 700, y: 200, game: 'seq', kind: 'cables' },
  { id: 2, name: 'Etiquetar macetas', x: 700, y: 470, game: 'match', kind: 'crate' },
  { id: 3, name: 'Limpiar filtro de riego', x: 200, y: 520, game: 'pipe', kind: 'filter' },
  { id: 4, name: 'Regar plantones', x: 1125, y: 233, game: 'hold', kind: 'valve' },
  { id: 5, name: 'Recoger esporas', x: 1658, y: 200, game: 'spots', kind: 'tray' },
  { id: 6, name: 'Descargar datos de cultivo', x: 1583, y: 392, game: 'code', kind: 'terminal' },
  { id: 7, name: 'Ajustar nutrientes', x: 1417, y: 367, game: 'dose', kind: 'valve' },
  { id: 8, name: 'Calibrar luces UV', x: 2140, y: 220, game: 'timing', kind: 'panel' },
  { id: 9, name: 'Reparar panel solar', x: 2500, y: 200, game: 'memory', kind: 'panel' },
  { id: 10, name: 'Cambiar tubo UV', x: 2520, y: 480, game: 'hold', kind: 'lamp' },
  { id: 11, name: 'Limpiar cristales', x: 1200, y: 730, game: 'spots', kind: 'glass' },
  { id: 12, name: 'Pesar la cosecha', x: 1520, y: 1000, game: 'dose', kind: 'scale' },
  { id: 13, name: 'Activar ventilación', x: 1200, y: 1100, game: 'order', kind: 'switchbox' },
  { id: 14, name: 'Inventariar cajas', x: 2420, y: 820, game: 'sort', kind: 'crate' },
  { id: 15, name: 'Subir inventario', x: 2240, y: 1000, game: 'seq', kind: 'terminal' },
  { id: 16, name: 'Descongelar muestras', x: 1960, y: 1440, game: 'seq', kind: 'valve' },
  { id: 17, name: 'Ajustar termostato', x: 2300, y: 1330, game: 'code', kind: 'keypad' },
  { id: 18, name: 'Sellar filtro de frío', x: 2100, y: 1520, game: 'spots', kind: 'filter' },
  { id: 19, name: 'Voltear compost', x: 240, y: 1620, game: 'hold', kind: 'compost' },
  { id: 20, name: 'Reparar bomba', x: 700, y: 1300, game: 'pipe', kind: 'machine' },
  { id: 21, name: 'Fregar la mesa', x: 1280, y: 1400, game: 'spots', kind: 'table' },
  { id: 22, name: 'Ajustar la radio', x: 1400, y: 1620, game: 'match', kind: 'radio' },
  { id: 23, name: 'Revisar generador', x: 480, y: 980, game: 'timing', kind: 'machine' },
  { id: 24, name: 'Limpiar filtro de aire', x: 360, y: 830, game: 'spots', kind: 'filter' },
  { id: 25, name: 'Afilar herramientas', x: 840, y: 700, game: 'memory', kind: 'bench' },
  { id: 26, name: 'Conectar riego', x: 1780, y: 1480, game: 'pipe', kind: 'valve' },
  { id: 27, name: 'Purgar tuberías', x: 700, y: 858, game: 'pipe', kind: 'valve' },
  { id: 28, name: 'Emparejar las llaves', x: 700, y: 740, game: 'match', kind: 'bench' },
  { id: 29, name: 'Cambiar la boquilla', x: 1620, y: 1430, game: 'memory', kind: 'valve' },
  { id: 30, name: 'Escribir la etiqueta', x: 340, y: 500, game: 'type', kind: 'tray' },
  { id: 31, name: 'Trazar el riego', x: 480, y: 1450, game: 'route', kind: 'valve' },
  { id: 32, name: 'Regular la humedad', x: 1167, y: 350, game: 'slider', kind: 'panel' },
  { id: 33, name: 'Calibrar la presión', x: 200, y: 900, game: 'slider', kind: 'machine' },
  { id: 34, name: 'Escribir el pedido', x: 1000, y: 1620, game: 'type', kind: 'radio' },
  { id: 35, name: 'Recablear el montacargas', x: 2208.33, y: 916.67, game: 'route', kind: 'terminal' },
  // Misiones largas: recoger la variedad indicada y clasificar.
  { id: 36, name: 'Cosechar los plantones listos', x: 1350, y: 250, game: 'harvest', kind: 'tray' },
  { id: 37, name: 'Recoger las setas marcadas', x: 2470, y: 330, game: 'harvest', kind: 'lamp' },
  { id: 38, name: 'Apartar las setas del compost', x: 520, y: 1630, game: 'harvest', kind: 'compost' },
  // Misiones de las salas nuevas: cada una con su minijuego y su objeto propio.
  { id: 39, name: 'Preparar los esquejes', x: 3016.67, y: 1266.67, game: 'spots', kind: 'tray' },
  { id: 40, name: 'Repartir los esquejes', x: 3150, y: 1233.33, game: 'match', kind: 'crate' },
  { id: 41, name: 'Precintar las cajas', x: 2825, y: 933.33, game: 'sort', kind: 'crate' },
  { id: 42, name: 'Escribir el albarán', x: 2933.33, y: 883.33, game: 'type', kind: 'radio' },
  { id: 43, name: 'Llenar el depósito', x: 3583.33, y: 1300, game: 'hold', kind: 'valve' },
  { id: 44, name: 'Limpiar el filtro del depósito', x: 3675, y: 1283.33, game: 'spots', kind: 'filter' },
  // Misiones de los tres minijuegos nuevos: buscar la colonia a base de sondas (sonar),
  // sostener la presión en su banda (valves) y atrapar esporas al vuelo (catch).
  { id: 45, name: 'Rastrear la colonia de esporas', x: 2925, y: 1366.67, game: 'sonar', kind: 'terminal' },
  { id: 46, name: 'Sondear el banco de esporas', x: 1233.33, y: 250, game: 'sonar', kind: 'terminal' },
  { id: 47, name: 'Ajustar la presión del riego', x: 1691.67, y: 1416.67, game: 'valves', kind: 'valve' },
  { id: 48, name: 'Regular el frío de la cámara', x: 2525, y: 1400, game: 'valves', kind: 'valve' },
  { id: 49, name: 'Atrapar las esporas del depósito', x: 3658.33, y: 1416.67, game: 'catch', kind: 'bench' },
  // Esquejes y Depósito se quedaban con pocas misiones: cada sala suma tres más, repartidas
  // por su suelo libre y con minijuegos que aún no había en ellas.
  { id: 50, name: 'Rociar las bandejas', x: 3016.67, y: 1183.33, game: 'spots', kind: 'tray' },
  { id: 51, name: 'Etiquetar los esquejes', x: 2925, y: 1283.33, game: 'type', kind: 'crate' },
  { id: 52, name: 'Replantar los esquejes', x: 3125, y: 1316.67, game: 'match', kind: 'bench' },
  { id: 53, name: 'Cebar la bomba del depósito', x: 3775, y: 1325, game: 'hold', kind: 'valve' },
  { id: 54, name: 'Dosificar el tratamiento', x: 3641.67, y: 1183.33, game: 'dose', kind: 'scale' },
  { id: 55, name: 'Ventilar el depósito', x: 3658.33, y: 1350, game: 'order', kind: 'switchbox' },
];
// Redes de rejillas: el impostor entra en una y viaja entre las de su misma red.
const VENTS_BASE = [
  { id: 0, net: 'A', name: 'Semillero', x: 620, y: 520 },
  { id: 1, net: 'A', name: 'Compost', x: 740, y: 1600 },
  { id: 2, net: 'A', name: 'Riego', x: 1780, y: 1580 },
  { id: 3, net: 'B', name: 'Máquinas', x: 160, y: 980 },
  { id: 4, net: 'B', name: 'Sala Principal', x: 1264, y: 690 },
  { id: 5, net: 'B', name: 'Almacén', x: 2329, y: 863 },
  { id: 6, net: 'C', name: 'Cámara fría', x: 2320, y: 1390 },
  { id: 7, net: 'C', name: 'Luces UV', x: 2480, y: 460 },
  // Las salas nuevas se meten en las redes que ya existían, para que sus rejillas sirvan de
  // verdad: desde Esquejes se sale junto a la Cámara fría o las Luces UV, y desde el Depósito
  // se cruza el invernadero de un salto hasta el Almacén.
  { id: 8, net: 'C', name: 'Esquejes', x: 3158.33, y: 1191.67 },
  { id: 9, net: 'B', name: 'Depósito', x: 3783.33, y: 1416.67 },
];
const BUTTON_BASE = { x: 1300, y: 900 };
const PANEL_BASE = { x: 220, y: 790 };
// Reactor: núcleo en la Cámara fría y dos consolas separadas que hay que mantener a la vez.
const REACTOR_BASE = { x: 2050, y: 1620 };
const REACTOR_PTS_BASE = [
  { side: 'a', name: 'Consola A', x: 2020, y: 1490 },
  { side: 'b', name: 'Consola B', x: 1300, y: 1600 },
];

/* El invernadero se dibuja a escala: las salas son la mitad más grandes que la
   cuadrícula de arriba. Crece solo el espacio (salas, pasillos, distancias y el
   tamaño del mundo); el personaje, los objetos, los alcances y las velocidades
   conservan su tamaño, así que el juego se ve igual pero con mucho más sitio. */
const SCALE = 1.2;
const SOLID_INSET = 11; // lo que se encoge el choque de un adorno por cada lado
const solidBox = (o) => [o[0] + SOLID_INSET, o[1] + SOLID_INSET, Math.max(8, o[2] - SOLID_INSET * 2), Math.max(8, o[3] - SOLID_INSET * 2), o[4]];
/* Todos los escenarios se arman igual: cada uno trae sus medidas base y buildMap las pasa a
   la escala del invernadero, ajusta las salas a la rejilla y calcula rejillas de paso, luz,
   puertas y las cajas con las que se dibuja cada objeto. */

/* Adorno de cada sala: al ampliar el invernadero sobraba suelo, así que cada
   cuarto se llena con lo que le pega. Son objetos con colisión, como los del
   mapa original. Van en medidas base, como el resto del mapa: [x, y, ancho, alto, tipo]. */
const DECOR = [
  // Semillero: sacos y depósito en fila contra la pared de arriba
  [311, 144, 70, 70, 'sack'],
  [394, 144, 70, 70, 'barrel'],
  [474, 141, 110, 110, 'tank'],
  // Vivero: un saco arriba, lejos de la puerta del pasillo
  [1010, 110, 70, 70, 'sack'],
  // Luces UV: los dos focos colgados, en fila
  [2193, 157, 80, 120, 'lamp'],
  [2293, 157, 80, 120, 'lamp'],
  // Cámara fría: una caja de muestras abajo, apartada de la entrada
  [2144, 1629, 70, 50, 'crate'],
  // Compost: un barril junto a la pared izquierda, otro en el centro y un saco al fondo
  [173, 1432, 70, 70, 'barrel'],
  [544, 1365, 70, 70, 'barrel'],
  [315, 1482, 70, 70, 'sack'],
  // Comedor: un banco pegado a la pared de arriba, a la izquierda del todo: abajo, en el
  // centro, tapaba el nombre de la sala pintado en el suelo
  [897, 1348, 140, 40, 'bench'],
  // Esquejes: la caja de macetas arriba a la izquierda y, al fondo, la caja y el saco de
  // sustrato, dejando libres la puerta del pasillo y la franja del nombre
  [2886.67, 1161.67, 60, 60, 'crate'],
  [3020, 1378.33, 60, 60, 'crate'],
  [3135.83, 1377.5, 70, 70, 'sack'],
  // Embalaje: la caja y la precintadora arriba y el barril al fondo a la derecha, sin tapar
  // la puerta del pasillo ni el nombre pintado en el suelo
  [2870, 786.67, 60, 60, 'crate'],
  [2952.5, 977.5, 70, 70, 'barrel'],
  [3010.33, 787.17, 76, 54, 'machine'],
  // Depósito: la caja arriba, el barril a media altura a la derecha y otra caja al fondo,
  // con la puerta del pasillo y el nombre libres
  [3486.67, 1161.67, 60, 60, 'crate'],
  [3752.5, 1177.5, 70, 70, 'barrel'],
  [3486.67, 1378.33, 60, 60, 'crate'],
];

/* El invernadero de siempre: sus medidas base son las de arriba, así que el mapa que ya
   conocen los jugadores se arma igual que antes (escala, salas, objetos, misiones, rejillas). */
const GREENHOUSE = {
  world: WORLD_BASE,
  floors: FLOORS_BASE,
  obst: OBST_BASE.concat(DECOR),
  tasks: TASKS_BASE,
  vents: VENTS_BASE,
  button: BUTTON_BASE,
  panel: PANEL_BASE,
  reactor: REACTOR_BASE,
  rpts: REACTOR_PTS_BASE,
};

/* Arma un escenario: misma escala para todos, salas ajustadas a la rejilla de colisión,
   rejillas de paso y de luz, puertas y las cajas con las que se dibuja cada objeto. */
function buildMap(def) {
  // el invernadero va en medidas base y se escala; Micelaria ya viene a su tamaño (scale: 1)
  const k = def.scale || SCALE;
  const lo2 = (v) => Math.floor((v * k) / 20) * 20, hi2 = (v) => Math.ceil((v * k) / 20) * 20;
  const rect = (r) => { const x = lo2(r[0]), y = lo2(r[1]); return [x, y, hi2(r[0] + r[2]) - x, hi2(r[1] + r[3]) - lo2(r[1]), ...r.slice(4)]; };
  const at = (p) => ({ ...p, x: p.x * k, y: p.y * k });
  const box = (o) => [(o[0] + o[2] / 2) * k - o[2] / 2, (o[1] + o[3] / 2) * k - o[3] / 2, o[2], o[3], o[4]];
  const world = { w: hi2(def.world.w), h: hi2(def.world.h) };
  const floors = def.floors.map(rect);
  const tasks = def.tasks.map(at);
  const obst = def.obst.map(box);
  // Los adornos del bosque frenan un poco menos de lo que ocupan: el seta pasa por los huecos
  // entre dos troncos y no se queda enganchado en las esquinas del dibujo. El invernadero
  // conserva su choque de siempre, que allí las cajas son muebles y miden lo que se ve.
  const solid = def.softCollide ? obst.map(solidBox) : obst;
  return {
    id: def.id, name: def.name, world, floors, tasks, obst, solid,
    vents: def.vents.map(at),
    button: at(def.button),
    spawn: def.spawn ? at(def.spawn) : null, // dónde se reparte a los jugadores; por defecto, junto al botón
    panel: at(def.panel),
    reactor: at(def.reactor),
    rpts: def.rpts.map(at),
    props: tasks.map((t) => propBox(t, def.propScale || 1)),
    grid: makeGrid(world, floors, solid),
    sight: makeGrid(world, floors, []),
    doors: [], byRoom: new Map(),
    explicitDoors: def.doors || null, // Micelaria dice dónde están sus puertas; el invernadero las deduce
  };
}
function withDoors(M) {
  if (M.explicitDoors) {
    // puertas dibujadas a mano: cada una dice a qué salas (índices de suelo) pertenece
    M.doors = M.explicitDoors.map((d, id) => ({ id, x: d.x, y: d.y, w: d.w, h: d.h, rooms: d.rooms.slice() }));
    M.byRoom = new Map();
    for (const d of M.doors) for (const r of d.rooms) {
      if (!M.byRoom.has(r)) M.byRoom.set(r, []);
      M.byRoom.get(r).push(d.id);
    }
    return M;
  }
  const d = makeDoors(M.floors, M.sight);
  M.doors = d.doors;
  M.byRoom = d.byRoom;
  return M;
}
/* Los dos escenarios se arman más abajo, cuando ya están definidas las piezas que usan. */

// Paleta elegida para que ninguna pareja se confunda: ni a simple vista (se separan
// mucho en tono y en claridad) ni con daltonismo rojo-verde, y todas se ven bien sobre
// los suelos oscuros del invernadero.
const COLORS = ['#E69F00', '#a0c4ff', '#2CA02C', '#ff6b6b', '#f2c14e', '#9ef01a', '#ffffff', '#c084fc', '#f4a261',
  '#3ddc97', '#999999', '#fdc4c4', '#17BECF', '#b5e48c', '#caffbf'];
const CODE_RE = /^[A-Z]{4}$/;

// Rejilla de 20 px: 1 = suelo, 0 = muro o caja. Los rectángulos se ajustan a la
// cuadrícula para que ninguno se quede sin colisión por no estar alineado a 20 px.
// Un suelo puede traer, como octavo elemento, un objeto de opciones (solo Micelaria):
//   poly   contorno libre en vez de rectángulo (el rectángulo x, y, w, h es su caja)
//   carve  en vez de abrir suelo, lo cierra (ríos, estanques)
//   room   el contorno es el exterior de un edificio: los 2 anillos de celdas del borde son
//          muro y lo de dentro, suelo. El cliente repite exactamente lo mismo (grid.js).
function polyHas(pts, px, py) {
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
function makeGrid(world, floors, obst) {
  const gw = Math.ceil(world.w / 20), gh = Math.ceil(world.h / 20), cells = new Uint8Array(gw * gh);
  const fill = (r, v) => {
    const tx0 = Math.max(0, Math.floor(r[0] / 20)), tx1 = Math.min(gw, Math.ceil((r[0] + r[2]) / 20));
    const ty0 = Math.max(0, Math.floor(r[1] / 20)), ty1 = Math.min(gh, Math.ceil((r[1] + r[3]) / 20));
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) cells[ty * gw + tx] = v;
  };
  floors.forEach((r) => {
    const o = r[7];
    if (!o) { fill(r, 1); return; }
    if (!o.poly) { fill(r, o.carve ? 0 : 1); return; }
    // contorno libre: una celda es del suelo si su centro cae dentro del polígono
    const tx0 = Math.max(0, Math.floor(r[0] / 20) - 1), tx1 = Math.min(gw, Math.ceil((r[0] + r[2]) / 20) + 1);
    const ty0 = Math.max(0, Math.floor(r[1] / 20) - 1), ty1 = Math.min(gh, Math.ceil((r[1] + r[3]) / 20) + 1);
    const mw = tx1 - tx0, mh = ty1 - ty0;
    const m = new Uint8Array(mw * mh);
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) if (polyHas(o.poly, tx * 20 + 10, ty * 20 + 10)) m[(ty - ty0) * mw + (tx - tx0)] = 1;
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
function gridHit(g, x, y, r) {
  const x0 = Math.floor((x - r) / 20), x1 = Math.floor((x + r) / 20), y0 = Math.floor((y - r) / 20), y1 = Math.floor((y + r) / 20);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tx >= 0 && ty >= 0 && tx < g.gw && ty < g.gh && g.cells[ty * g.gw + tx]) continue;
    const cx = Math.max(tx * 20, Math.min(x, tx * 20 + 20)), cy = Math.max(ty * 20, Math.min(y, ty * 20 + 20));
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}
// Cada tarea trae su propio objeto, y su caja se calcula sola para dibujarlo con el
// tamaño justo. Esa caja no entra en las colisiones.
const PROP_SIZE = {
  tray: [64, 44], cables: [64, 40], crate: [60, 50], filter: [48, 48], valve: [46, 46],
  terminal: [60, 48], panel: [64, 36], lamp: [40, 64], switchbox: [48, 40], scale: [56, 44],
  keypad: [44, 56], machine: [76, 54], bench: [70, 40], table: [64, 40], radio: [48, 40],
  glass: [72, 28], compost: [64, 48],
  // objetos propios de las tareas de Micelaria
  cauldron: [64, 56], teaset: [60, 44], clothesline: [96, 36], jars: [60, 48], hearth: [70, 56],
  mortar: [52, 48], sprouts: [64, 48], chime: [48, 60],
};
function propBox(t, k = 1) {
  const [w0, h0] = PROP_SIZE[t.kind] || [56, 44];
  const w = Math.round(w0 * k), h = Math.round(h0 * k);
  return [Math.round(t.x - w / 2), Math.round(t.y - h / 2), w, h, 'prop'];
}
/* Los dos escenarios, ya armados: la sala elige uno y todo lo que dibuja y choca sale de ahí. */
const MAPS = {
  greenhouse: withDoors(buildMap({ ...GREENHOUSE, id: 'greenhouse', name: 'El Invernadero' })),
  micelaria: withDoors(buildMap({ ...MICELARIA, id: 'micelaria', name: 'Micelaria' })),
};
const DEFAULT_MAP = 'greenhouse';
// La luz no tiene tope circular: llega hasta donde la dejen los muros, y las cajas, barriles
// y máquinas no dan sombra, así que para la vista la rejilla es solo de muros.
const SIGHT_BASE = 1500; // alcance de vista al 100 %: de sobra para ver la sala entera y lo que asoma por la puerta
const DARK_VISION = 0.18; // con las luces apagadas la tripulación casi no ve nada: solo un círculo muy corto

/* Puertas de cada sala: nacen donde el muro de la sala está abierto, es decir, donde la
   celda que hay justo fuera de su borde es suelo por el que se pasa. No se ven hasta que el
   impostor las cierra desde el mapa, y se abren solas al cumplirse su tiempo. */
function makeDoors(floors, sight) {
  const CELL = 20, gw = sight.gw, gh = sight.gh;
  const open = (tx, ty) => tx >= 0 && ty >= 0 && tx < gw && ty < gh && sight.cells[ty * gw + tx] === 1;
  const doors = [];
  const idx = new Map();  // caja → puerta: dos salas que comparten un paso comparten puerta
  const byRoom = new Map();
  floors.forEach((R, ri) => {
    if (!R[5]) return; // los pasillos no tienen puertas: solo las salas con nombre
    const x0 = Math.floor(R[0] / CELL), y0 = Math.floor(R[1] / CELL);
    const x1 = Math.ceil((R[0] + R[2]) / CELL), y1 = Math.ceil((R[1] + R[3]) / CELL);
    const add = (x, y, w, h) => {
      const key = `${x}:${y}:${w}:${h}`;
      let d = idx.get(key);
      if (!d) { d = { id: doors.length, x, y, w, h, rooms: [] }; idx.set(key, d); doors.push(d); }
      if (!d.rooms.includes(ri)) d.rooms.push(ri);
      if (!byRoom.has(ri)) byRoom.set(ri, []);
      if (!byRoom.get(ri).includes(d.id)) byRoom.get(ri).push(d.id);
    };
    // los cuatro lados: se buscan los tramos seguidos de suelo al otro lado del muro
    const sides = [
      { find: () => { const out = []; for (let ty = y0; ty < y1; ty++) if (open(x0 - 1, ty)) out.push(ty); return out; }, box: (a, b) => [x0 - 1, a, 1, b - a + 1] },
      { find: () => { const out = []; for (let ty = y0; ty < y1; ty++) if (open(x1, ty)) out.push(ty); return out; }, box: (a, b) => [x1, a, 1, b - a + 1] },
      { find: () => { const out = []; for (let tx = x0; tx < x1; tx++) if (open(tx, y0 - 1)) out.push(tx); return out; }, box: (a, b) => [a, y0 - 1, b - a + 1, 1] },
      { find: () => { const out = []; for (let tx = x0; tx < x1; tx++) if (open(tx, y1)) out.push(tx); return out; }, box: (a, b) => [a, y1, b - a + 1, 1] },
    ];
    for (const side of sides) {
      const cs = side.find();
      for (let i = 0; i < cs.length;) {
        let j = i;
        while (j + 1 < cs.length && cs[j + 1] === cs[j] + 1) j++;
        const [bx, by, bw, bh] = side.box(cs[i], cs[j]);
        add(bx * CELL, by * CELL, bw * CELL, bh * CELL);
        i = j + 1;
      }
    }
  });
  return { doors, byRoom };
}
const DOOR_MS = 10000; // las puertas se abren solas pasado este rato: nadie puede abrirlas antes
const DOOR_CD_MS = 20000; // y una vez abiertas, esa sala tarda esto en poder volver a cerrarlas

// ¿El círculo (x, y, r) toca alguna de estas cajas? Es lo que frena el paso por una puerta cerrada.
function boxHit(boxes, x, y, r) {
  for (const b of boxes) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w)), cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

// ¿Se ve el punto b desde a? Un muro de por medio lo tapa, una caja no, y una puerta cerrada sí.
function sees(M, a, b, maxDist, closed) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d > maxDist) return false;
  const steps = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = a.x + dx * t, py = a.y + dy * t;
    if (closed && closed.length && boxHit(closed, px, py, 1)) return false;
    const tx = Math.floor(px / 20), ty = Math.floor(py / 20);
    if (tx < 0 || ty < 0 || tx >= M.sight.gw || ty >= M.sight.gh) continue; // fuera del mundo nada corta
    if (!M.sight.cells[ty * M.sight.gw + tx]) return false;
  }
  return true;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const [x, y] = [a[i], a[j]];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}
function cleanName(n) {
  const s = String(n || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 12);
  return s || 'Seta';
}
function hitsWall(M, x, y, closed) { return gridHit(M.grid, x, y, RADIUS) || (!!closed && closed.length && boxHit(closed, x, y, RADIUS)); }
// Punto libre más cercano: nadie aparece dentro de un objeto.
function freeSpot(M, x, y, closed) {
  if (!hitsWall(M, x, y, closed)) return { x, y };
  for (let r = 10; r <= 240; r += 10) {
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const cx = clamp(x + Math.cos(a) * r, RADIUS, M.world.w - RADIUS);
      const cy = clamp(y + Math.sin(a) * r, RADIUS, M.world.h - RADIUS);
      if (!hitsWall(M, cx, cy, closed)) return { x: cx, y: cy };
    }
  }
  return { x, y };
}
// Reparte las tareas por tipo: cada jugador recibe minijuegos distintos.
function pickTasks(M, n) {
  const pool = new Map();
  for (const t of M.tasks) {
    if (!pool.has(t.game)) pool.set(t.game, []);
    pool.get(t.game).push(t.id);
  }
  const groups = shuffle([...pool.values()].map((ids) => shuffle(ids)));
  const out = [];
  while (out.length < n) {
    let added = false;
    for (const gr of groups) {
      if (gr.length && out.length < n) { out.push(gr.shift()); added = true; }
    }
    if (!added) break;
  }
  return shuffle(out);
}

// Movimiento por círculo: avanza en pasos cortos y, tras cada uno, saca al jugador de todo lo que
// pisa empujándolo por la normal del contacto. Así DESLIZA por paredes curvas y esquinas sin
// engancharse, y si queda incrustado (una puerta que se cierra encima) sale solo. Es idéntico al
// del cliente (src/lib/game/grid.js) para que la predicción coincida con la sala.
const CELLPX = 20;
const MOVE_STEP = 3;
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
function resolveCircle(M, x, y, r, boxes) {
  const g = M.grid;
  for (let pass = 0; pass < 5; pass++) {
    let moved = false;
    const x0 = Math.floor((x - r) / CELLPX), x1 = Math.floor((x + r) / CELLPX);
    const y0 = Math.floor((y - r) / CELLPX), y1 = Math.floor((y + r) / CELLPX);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tx >= 0 && ty >= 0 && tx < g.gw && ty < g.gh && g.cells[ty * g.gw + tx]) continue;
      const q = pushFromRect(x, y, r, tx * CELLPX, ty * CELLPX, CELLPX, CELLPX);
      if (q) { x = q[0]; y = q[1]; moved = true; }
    }
    if (boxes && boxes.length) for (const b of boxes) {
      const q = pushFromRect(x, y, r, b.x, b.y, b.w, b.h);
      if (q) { x = q[0]; y = q[1]; moved = true; }
    }
    if (!moved) return { x, y, ok: true };
  }
  return { x, y, ok: !gridHit(g, x, y, r - 0.05) && !(boxes && boxes.length && boxHit(boxes, x, y, r - 0.05)) };
}
function moveCircle(M, x, y, dx, dy, closed) {
  const p = resolveCircle(M, x, y, RADIUS, closed);
  let px = p.x, py = p.y;
  const dist = Math.hypot(dx, dy);
  if (!dist) return { x: px, y: py };
  const n = Math.max(1, Math.ceil(dist / MOVE_STEP));
  const sx = dx / n, sy = dy / n;
  for (let i = 0; i < n; i++) {
    const q = resolveCircle(M, px + sx, py + sy, RADIUS, closed);
    if (!q.ok) break;
    px = q.x; py = q.y;
  }
  return { x: px, y: py };
}
function stepPlayer(M, p, dt, speed, closed) {
  if (p.inVent) return; // dentro de una rejilla no se mueve
  const l = Math.hypot(p.dx, p.dy);
  if (!l) return;
  const d = speed * dt;
  const dx = (p.dx / l) * d, dy = (p.dy / l) * d;
  if (!p.alive) { // los fantasmas atraviesan muros (y puertas cerradas)
    p.x = clamp(p.x + dx, RADIUS, M.world.w - RADIUS);
    p.y = clamp(p.y + dy, RADIUS, M.world.h - RADIUS);
    return;
  }
  const m = moveCircle(M, p.x, p.y, dx, dy, closed);
  p.x = m.x; p.y = m.y;
}

/* ================================================================
   Runtime propio (sin Base44): el servidor (server/index.js) crea una
   sala por codigo y le pasa un entorno `rt` con:
     rt.storage         -> { get(key), put(key, value) }  persistencia
     rt.registry        -> anuncio de salas para el listado del menu
                           { update(code,row), remove(code), list() }
     rt.getConnections()-> [{ id, send(msg) }] conexiones WebSocket abiertas
     rt.closeConn(id)   -> corta una conexion (kick/ban)
     rt.schedule/cancelSchedule -> latidos diferidos (setTimeout)
   El protocolo de mensajes es identico al del actor original.
   ================================================================ */

// Lo que los bots necesitan del motor (se les pasa para no importar este archivo desde el suyo).
const BOT_ENV = {
  sees, gridHit, boxHit, say, RADIUS, KILL_RANGE, USE_RANGE, REPORT_RANGE, INTERROG_RANGE, TRACK_RANGE, HOLD_RANGE,
  SIGHT_BASE, DARK_VISION,
};

class GameRoom {
  constructor(code, rt = {}) {
    this.code = code || null;
    this.rt = rt;
    if (!rt.storage) {
      const mem = new Map();
      rt.storage = {
        async get(k) { return mem.get(k) ?? null; },
        async put(k, v) { mem.set(k, JSON.parse(JSON.stringify(v))); },
      };
    }
    if (!rt.registry) {
      const rooms = new Map();
      rt.registry = {
        update(code, row) { rooms.set(code, { ...row, updated_at: Date.now() }); },
        remove(code) { rooms.delete(code); },
        list() { return [...rooms.values()]; },
      };
    }
    if (!rt.getConnections) rt.getConnections = () => [];
    if (!rt.closeConn) rt.closeConn = () => {};
    if (!rt.schedule) rt.schedule = (key, at) => setTimeout(() => this.handleWake(key), Math.max(0, at - Date.now()));
    if (!rt.cancelSchedule) rt.cancelSchedule = () => {};
  }

  /* ---------- API del ciclo de vida que usa el servidor ---------- */

  onOpen(conn) { return this.handleConnect(conn); }

  onClose(conn) { return this.handleClose(conn); }

  onMessage(conn, msg) { return this.handleMessage(conn, msg); }

  code = null;
  visibility = 'public'; // 'public': sale en 'Salas activas'; 'private': solo se entra con el código
  country = '';          // país (ISO-2) desde donde se creó la sala
  createdAt = 0;
  capacity = MAX_PLAYERS; // máximo de jugadores (personas + bots) que eligió el anfitrión al crear la sala
  want = 'random';       // salas de bots: el bando que pide el anfitrión ('random' | 'impostor' | 'crew')
  mode = 'online';        // 'online': sale en el listado · 'bots': sala privada pensada para jugar con bots
  lang = 'es';            // idioma en el que hablan los bots si no se sabe el de cada jugador
  bots = new BotManager(this, BOT_ENV);
  map = DEFAULT_MAP; // escenario elegido en la sala de espera: cada mapa trae sus salas, objetos, misiones y rejillas
  hostSeat = null;
  nextSeat = 1;
  phase = 'lobby';
  settings = { ...DEFAULTS };
  players = new Map();
  bodies = [];
  taskDone = 0;
  taskTotal = 0;
  dark = false; // apagón en curso: solo se apaga cuando alguien repara el cuadro
  reactor = null;
  meeting = null;
  meetCallerId = null;
  meetReason = null;
  meetBody = null;
  resultUntil = 0;
  rolesUntil = 0;
  lastResult = null;
  lastEnd = null;
  timer = null;
  lastTick = 0;
  savedAt = 0;
  sabLockAt = 0; // espera del apagón: es del equipo impostor, no de cada jugador. Empieza al REPARAR las luces
  rtLockAt = 0;  // espera del reactor: independiente de la del apagón
  lobbyChat = [];
  roomSyncedAt = 0;
  banned = new Set(); // conexiones baneadas por el anfitrión: no vuelven a esta sala
  doorAt = new Map(); // puertas cerradas: id de puerta → instante en el que se abre sola
  doorReady = new Map(); // salas que acaban de abrir: sala → instante en el que se pueden volver a cerrar
  syncing = false;   // una sola escritura del listado a la vez: evita filas duplicadas
  syncErr = null;    // último error del anuncio, para poder diagnosticarlo

  /* El escenario de la partida: todo lo que se dibuja y todo lo que frena el paso sale de
     aquí, así que elegir mapa no toca ninguna regla del juego. */
  get m() { return MAPS[this.map] || MAPS[DEFAULT_MAP]; }

  /* ---------- ciclo de vida ---------- */

  async handleStart() {
    await this.hydrate();
  }

  async handleWake(key) {
    // handleStart ya restaura una instancia recién despertada. Un latido nunca
    // debe reemplazar la partida viva por la última copia guardada.
    if (key === 'room') {
      this.pruneOffline(); // el latido de la sala también barre a quien lleva rato sin aparecer
      await this.syncRoom();
      if (this.players.size > 0 && this.phase !== 'ended') this.armRoomSync();
    } else if (key === 'watch') {
      this.ensureLoop();
    }
  }

  async handleConnect(conn) {
    const p = this.findByConn(conn.id);
    if (!p) return; // jugador nuevo: espera a que envíe create/join
    p.offline = false;
    p.offlineSince = 0;
    this.sendState(p, conn);
  }

  async handleClose(conn) {
    const p = this.findByConn(conn.id);
    if (!p) return;
    // Perder la conexión no te saca de la sala: al volver a la pestaña el socket se rehace
    // con el mismo id y la sala te reconoce con tu sitio y tu rol. La plaza solo se libera
    // cuando pasa el margen sin aparecer.
    p.offline = true;
    p.offlineSince = Date.now();
    p.dx = 0;
    p.dy = 0;
    if (this.phase === 'lobby' || this.phase === 'ended') {
      this.broadcast(this.lobbyInfo());
      this.armRoomSync();
    }
    await this.save();
  }

  async handleMessage(conn, msg) {
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
    if (msg.t === 'create') return this.onCreate(conn, msg);
    if (msg.t === 'join') return this.onJoin(conn, msg);
    const p = this.findByConn(conn.id);
    if (!p) return;
    p.offline = false;
    p.offlineSince = 0;
    const now = Date.now();

    switch (msg.t) {
      case 'lang': {
        if (msg.lang === 'es' || msg.lang === 'en') p.lang = msg.lang;
        return;
      }
      case 'addBot': {
        if (this.phase !== 'lobby' || this.hostSeat !== p.id) return;
        const want = Math.max(1, Math.min(15, Math.round(Number(msg.n)) || 1));
        let added = 0;
        for (let i = 0; i < want; i++) if (this.addBot()) added++;
        if (!added) return conn.send({ t: 'error', msg: 'La sala está llena.' });
        return this.save();
      }
      case 'ping':
        // Contesta siempre: con esta respuesta el cliente sabe si su conexión sigue viva y,
        // si la sala ha dejado de responder, la rehace por su cuenta.
        conn.send({ t: 'pong' });
        if (this.players.size > 0 && this.phase !== 'ended' && now - this.roomSyncedAt > 30000) await this.syncRoom();
        return;
      case 'quit': {
        this.removePlayer(p);
        this.rt.closeConn(conn.id); // el cliente ya pidió salir: se suelta el socket
        return this.save();
      }
      case 'color': {
        if (this.phase !== 'lobby') return;
        if (!COLORS.includes(msg.color)) return;
        for (const q of this.players.values()) if (q.color === msg.color) return;
        p.color = msg.color;
        this.broadcast(this.lobbyInfo());
        return this.save();
      }
      case 'start': {
        if (this.phase !== 'lobby' || this.hostSeat !== p.id) return;
        if (this.players.size < MIN_PLAYERS) return conn.send({ t: 'error', msg: `Hacen falta al menos ${MIN_PLAYERS} jugadores.` });
        return this.startGame();
      }
      case 'want': {
        // salas de bots: el anfitrión elige si quiere ser impostor, tripulante o dejarlo al azar
        if (this.phase !== 'lobby' || this.hostSeat !== p.id || this.mode !== 'bots') return;
        if (msg.v !== 'random' && msg.v !== 'impostor' && msg.v !== 'crew') return;
        this.want = msg.v;
        this.broadcast(this.lobbyInfo());
        return this.save();
      }
      case 'vis': {
        // el anfitrión puede hacer la sala pública o privada también desde la sala de espera
        if (this.phase !== 'lobby' || this.hostSeat !== p.id) return;
        if (msg.vis !== 'public' && msg.vis !== 'private') return;
        if (this.mode === 'bots') return; // las salas de bots son siempre privadas
        this.visibility = msg.vis;
        this.broadcast(this.lobbyInfo());
        this.syncRoom();
        return this.save();
      }
      case 'map': {
        // el anfitrión elige escenario en la sala de espera; la partida lo usa al arrancar
        if (this.phase !== 'lobby' || this.hostSeat !== p.id) return;
        if (!MAPS[msg.map]) return;
        this.map = msg.map;
        this.broadcast(this.lobbyInfo());
        return this.save();
      }
      case 'settings': {
        if (this.phase !== 'lobby' || this.hostSeat !== p.id) return;
        if (!Object.prototype.hasOwnProperty.call(RANGES, msg.k)) return;
        const r = RANGES[msg.k];
        let v = Math.round(Number(msg.v));
        if (!Number.isFinite(v)) return;
        v = Math.max(r[0], Math.min(r[1], v));
        v = Math.min(r[1], r[0] + Math.round((v - r[0]) / r[2]) * r[2]);
        // las cantidades de cada rol no pueden pasar de los jugadores de la sala ahora mismo
        const lim = this.roleLimit(msg.k);
        if (lim !== null) v = Math.min(v, lim);
        this.settings[msg.k] = v;
        this.broadcast(this.lobbyInfo());
        return this.save();
      }
      case 'lobby': {
        if (this.phase !== 'ended' || this.hostSeat !== p.id) return;
        for (const q of this.players.values()) {
          q.alive = true; q.role = 'crew'; q.done = []; q.inVent = false; q.ventId = null; q.meetUsed = false;
          q.shifter = false; q.viper = false; q.engineer = false; q.alerter = false; q.judge = false; q.judgeUsed = false; q.judgeTarget = null; q.shiftTo = null; q.shiftAt = 0; q.shiftUntil = 0; q.frozenUntil = 0; q.shiftReadyAt = 0; q.ventReadyAt = 0; q.spectre = false; q.invisUntil = 0; q.invisReadyAt = 0;
          q.ghost = ''; q.guardReadyAt = 0; q.shieldUntil = 0; q.keyReadyAt = 0; q.blindReadyAt = 0; q.blindUntil = 0;
          q.scientist = false; q.sciReadyAt = 0; q.sciLeft = SCI_BATTERY_MS; q.sciOn = false;
          q.detective = false; q.detectiveUsed = false; q.detectiveTarget = null;
          q.tracker = false; q.trackerTarget = null; q.trackerUntil = 0; q.trackerReadyAt = 0;
        }
        this.phase = 'lobby';
        this.bodies = [];
        this.dark = false; // un sabotaje de la partida anterior no pasa a la siguiente
        this.reactor = null;
        this.lastEnd = null;
        this.armRoomSync();
        this.syncRoom();
        this.broadcast(this.lobbyInfo());
        this.ensureLoop();
        return this.save();
      }
      case 'kick': {
        // solo el anfitrión, y solo en la sala de espera: una vez empieza la partida no se expulsa.
        // 'kick' lo echa una vez (puede volver a entrar con el código); 'ban' lo aparta de esta
        // sala para siempre.
        if (this.phase !== 'lobby' || this.hostSeat !== p.id) return;
        const target = this.players.get(String(msg.id));
        if (!target || target.id === p.id) return;
        const mode = msg.mode === 'ban' ? 'ban' : 'kick';
        if (target.bot) { this.removePlayer(target, 'kick'); return this.save(); } // un bot se quita sin más
        if (mode === 'ban') this.banned.add(target.connId);
        this.sendTo(target, { t: 'kicked', ban: mode === 'ban' });
        this.rt.closeConn(target.connId); // sin cortar el socket, el expulsado seguiría jugando
        this.removePlayer(target, mode);
        return this.save();
      }
      case 'input': {
        // Cada orden lleva un número de secuencia: una orden vieja nunca pisa a una nueva.
        const seq = Number(msg.seq);
        if (Number.isInteger(seq)) {
          if (seq <= (p.seq || 0)) return;
          p.seq = seq;
        }
        this.applyInput(p, clamp(Number(msg.dx) || 0, -1, 1), clamp(Number(msg.dy) || 0, -1, 1), msg.ms, now);
        p.lastInputAt = now;
        return;
      }
      case 'task': {
        if (this.phase !== 'playing' || this.frozen(p, now) || (p.blindUntil || 0) > now) return; // los fantasmas también terminan sus misiones; un cegado no ve la misión
        if (!Number.isInteger(msg.id) || !p.tasks.includes(msg.id) || p.done.includes(msg.id) || p.inVent) return;
        if (dist(p, this.m.tasks[msg.id]) > USE_RANGE + 20) return;
        p.done.push(msg.id);
        if (p.role === 'crew') this.taskDone++; // las tareas del impostor son de mentira
        conn.send({ t: 'taskAck', id: msg.id });
        const w = this.checkWin();
        if (w) return this.finish(w);
        return this.save();
      }
      case 'kill': {
        if (this.phase !== 'playing' || p.role !== 'impostor' || !p.alive || p.inVent || this.frozen(p, now) || now < p.killReadyAt || (p.invisUntil || 0) > now) return;
        // un pequeño margen sobre el alcance del cliente: con el retardo de red, quien va andando
        // llega a la sala unos píxeles más lejos de donde pulsó el botón
        let best = null, bd = KILL_RANGE + KILL_SLACK;
        for (const q of this.players.values()) {
          if (!q.alive || q.role === 'impostor') continue;
          const d = dist(p, q);
          if (d <= bd) { bd = d; best = q; }
        }
        if (!best) return;
        if ((best.shieldUntil || 0) > now) {
          // el escudo del Ángel Guardián aguanta el golpe: el tripulante no muere y el
          // escudo se gasta; el impostor recarga su muerte con la espera fija del fallo
          best.shieldUntil = 0;
          p.killReadyAt = now + FAIL_KILL_CD_MS;
          this.broadcast({ t: 'saved', id: best.id, x: best.x, y: best.y, by: p.id });
          return this.save();
        }
        // Como en el Among Us de verdad, el impostor se lanza sobre la víctima: acaba en el sitio
        // donde cae el cuerpo (el cliente lo ve como un deslizamiento rápido). Solo si no hay un
        // muro o una puerta cerrada por medio.
        const lungeFrom = { x: p.x, y: p.y };
        if (sees(this.m, p, best, KILL_RANGE + KILL_SLACK, this.closedDoors(now))) {
          p.x = best.x;
          p.y = best.y;
          this.markSeg(p, now); // el tramo de movimiento en vigor empieza ya en el nuevo punto
          this.sendTo(p, { t: 'lunge', id: p.id, fx: Math.round(lungeFrom.x), fy: Math.round(lungeFrom.y), x: Math.round(p.x), y: Math.round(p.y) });
        }
        best.alive = false;
        best.dx = best.dy = 0;
        // si le ha pillado dentro de una rejilla, sale de ella: un fantasma no puede quedarse
        // encerrado ahí (no andaría y el panel no le dejaría salir)
        best.inVent = false;
        best.ventAt = 0;
        best.sciOn = false; // muerto no se sigue mirando el panel
        // La Víbora no deja un cuerpo cualquiera: el suyo va echando veneno, se deshace en
        // tres fases y desaparece, así que al final nadie puede verlo ni reportarlo. Su
        // habilidad no tiene espera propia: siempre que mata, el cuerpo sale así.
        const rot = p.viper ? this.settings.rotSec * 1000 : 0;
        this.bodies.push({ id: best.id, x: best.x, y: best.y, color: best.color, name: best.name, at: now, rot });
        this.bots.onKill(p, best, now); // los bots que lo vean lo recordarán
        if (rot) this.broadcast({ t: 'venom', x: best.x, y: best.y, id: best.id, ms: VIPER_FX_MS });
        p.killReadyAt = now + this.settings.killCd * 1000;
        // aviso privado de muerte: solo lo recibe quien ha caído, y con quién lo ha matado
        this.sendTo(best, { t: 'died', by: p.id, name: p.name, color: p.color, ghost: best.ghost || '', angel: best.ghost === 'angel' }); // su rol de fantasma lo descubre ahora
        // el Alertador avisa a todos al morir: una flecha señala dónde está su cuerpo
        if (best.alerter) this.broadcast({ t: 'alertDeath', x: best.x, y: best.y, name: best.name, color: best.color, ms: ALERT_MS });
        // y si alguien le tenía puesto el localizador, se apaga en el mismo instante de la muerte
        for (const q of this.players.values()) {
          if (q.trackerTarget !== best.id) continue;
          q.trackerTarget = null;
          q.trackerUntil = 0;
          this.sendTo(q, { t: 'trkOff', id: best.id });
        }
        const w = this.checkWin();
        if (w) return this.finish(w);
        return this.save();
      }
      case 'report': {
        // Reportar un cuerpo sí se puede con un sabotaje en marcha: solo el botón de
        // emergencia queda bloqueado mientras hay luces apagadas o reactor.
        // Reportar cuerpos es libre: las veces que quieras. Solo el botón de emergencia
        // gasta la reunión única por partida (meetUsed no se mira aquí).
        if (this.phase !== 'playing' || !p.alive || p.inVent || this.frozen(p, now)) return;
        const body = this.bodies.find((b) => dist(p, b) <= REPORT_RANGE);
        if (!body) return;
        return this.startMeeting(p, 'body', body.name);
      }
      case 'button': {
        // el botón de emergencia gasta la reunión propia de quien lo pulsa
        if (this.phase !== 'playing' || !p.alive || p.inVent || this.frozen(p, now)) return;
        if (now < (p.btnReadyAt || 0)) return conn.send({ t: 'error', msg: 'El botón de emergencia aún no está listo.' });
        if (this.sabotageActive()) return conn.send({ t: 'error', msg: 'Sabotaje activo: no se puede convocar una reunión.' });
        if (p.meetUsed) return conn.send({ t: 'error', msg: 'Ya has convocado tu reunión de esta partida.' });
        if (dist(p, this.m.button) > REPORT_RANGE) return;
        p.meetUsed = true;
        return this.startMeeting(p, 'button', null);
      }
      case 'sabotage': {
        if (this.phase !== 'playing' || p.role !== 'impostor') return; // un impostor muerto sigue saboteando
        if (this.frozen(p, now)) return;
        // Solo cuenta SU espera (la que enseña el botón, scd). Antes también exigía que hubiera
        // acabado la del reactor, que al empezar es más larga: el botón se veía listo y la X
        // no hacía nada hasta pasados unos segundos más.
        if (this.dark || this.reactor) return conn.send({ t: 'error', msg: 'Ya hay un sabotaje en marcha.' });
        if (now < this.sabLockAt) return conn.send({ t: 'error', msg: `El apagón aún se está recargando (${Math.ceil((this.sabLockAt - now) / 1000)} s).` });
        // el apagón no caduca: la luz no vuelve hasta que alguien repare el cuadro. Su espera
        // no corre mientras dura: empieza a contar cuando se arreglan las luces (case 'fix').
        this.dark = true;
        return this.save();
      }
      case 'fix': {
        // el arreglo llega al terminar el minijuego del cuadro, siempre junto al panel
        // el impostor también puede arreglar las luces: le sirve para fingir que ayuda
        if (this.phase !== 'playing' || !p.alive) return;
        if (!this.dark || dist(p, this.m.panel) > USE_RANGE + 20) return;
        this.dark = false;
        this.startSabCooldown(now); // al arreglar las luces empieza la espera de TODOS los sabotajes
        return this.save();
      }
      case 'reactor': {
        // sabotaje del reactor: un impostor vivo, un sabotaje a la vez y la espera compartida
        if (this.phase !== 'playing' || p.role !== 'impostor') return; // un impostor muerto sigue saboteando
        if (this.frozen(p, now)) return;
        // igual que el apagón: solo cuenta su propia espera (rcd), la que enseña el botón
        if (this.dark || this.reactor) return conn.send({ t: 'error', msg: 'Ya hay un sabotaje en marcha.' });
        if (now < this.rtLockAt) return conn.send({ t: 'error', msg: `El reactor aún se está recargando (${Math.ceil((this.rtLockAt - now) / 1000)} s).` });
        this.reactor = { until: now + REACTOR_MS, a: null, b: null, hold: 0 };
        // su espera no corre mientras está en marcha: empieza al resolverlo (como la del apagón)
        this.rtLockAt = now;
        this.ensureLoop();
        return this.save();
      }
      case 'doors': {
        // el impostor cierra desde el mapa todas las puertas de una sala: se abren solas a
        // los 10 s y no las abre nadie antes. Con un sabotaje en marcha no se pueden cerrar.
        if (this.phase !== 'playing' || p.role !== 'impostor') return; // un impostor muerto sigue saboteando
        if (this.frozen(p, now) || this.sabotageActive()) return conn.send({ t: 'error', msg: 'Con un sabotaje en marcha no se pueden cerrar puertas.' });
        const room = Math.round(Number(msg.room));
        const ids = this.m.byRoom.get(room);
        if (!ids || !ids.length) return;
        // su sala acaba de abrirlas: hay que esperar antes de volver a cerrarlas
        if (ids.every((id) => (this.doorAt.get(id) || 0) > now)) return conn.send({ t: 'error', msg: 'Las puertas de esa sala ya están cerradas.' });
        const wait = (this.doorReady.get(room) || 0) - now;
        if (wait > 0) return conn.send({ t: 'error', msg: `Las puertas de esa sala se acaban de abrir: podrás cerrarlas en ${Math.ceil(wait / 1000)} s.` });
        this.closeDoors(room, now);
        this.broadcast({ t: 'doorFx', room });
        return this.save();
      }
      case 'hold': {
        // hace falta un jugador distinto en cada consola y nadie puede con las dos; el
        // impostor también puede sujetarlas (le sirve para fingir que ayuda)
        if (this.phase !== 'playing' || !this.reactor || !p.alive || p.inVent || this.frozen(p, now)) return;
        const side = msg.side === 'b' ? 'b' : 'a';
        const other = side === 'a' ? 'b' : 'a';
        if (this.reactor[side] === p.id) { this.reactor[side] = null; this.reactor.hold = 0; return this.save(); }
        if (this.reactor[other] === p.id) return;
        const pt = side === 'a' ? this.m.rpts[0] : this.m.rpts[1];
        if (dist(p, pt) > HOLD_RANGE || this.reactor[side]) return;
        this.reactor[side] = p.id;
        this.reactor.hold = 0;
        return this.save();
      }
      case 'vent': {
        if (this.phase !== 'playing' || !this.canVent(p) || !p.alive || p.inVent || this.frozen(p, now) || (p.invisUntil || 0) > now) return;
        if (now < (p.ventReadyAt || 0)) return; // tras salir, el ingeniero espera antes de volver a entrar
        let vent = null, bd = USE_RANGE;
        const shut = this.closedDoors(now);
        for (const v of this.m.vents) {
          const d = Math.hypot(v.x - p.x, v.y - p.y);
          // con un muro (o una puerta cerrada) por medio no se llega a la rejilla: solo desde su misma sala
          if (d <= bd && sees(this.m, p, v, USE_RANGE, shut)) { bd = d; vent = v; }
        }
        if (!vent) return;
        this.bots.onVent(p, true, now); // quien lo tenga a la vista lo ve entrar
        p.inVent = true;
        p.ventId = vent.id;
        p.ventAt = now; // el reloj de la estancia: el ingeniero no puede quedarse más de ENG_VENT_MS
        p.dx = p.dy = 0;
        p.x = vent.x;
        p.y = vent.y;
        conn.send({ t: 'vent', in: true, id: vent.id, net: vent.net, vents: this.m.vents.filter((v) => v.net === vent.net) });
        this.broadcast({ t: 'ventFx', ids: [vent.id] }); // la rejilla se abre: lo ve cualquiera que la tenga a la vista
        return this.save();
      }
      case 'ventTo': {
        if (this.phase !== 'playing' || !this.canVent(p) || !p.alive || !p.inVent) return;
        const cur = this.m.vents.find((v) => v.id === p.ventId);
        const to = this.m.vents.find((v) => v.id === msg.id && cur && v.net === cur.net);
        if (!to || to.id === p.ventId) return;
        p.ventId = to.id;
        p.x = to.x;
        p.y = to.y;
        conn.send({ t: 'vent', in: true, id: to.id, net: to.net, vents: this.m.vents.filter((v) => v.net === to.net) });
        // viajar por dentro de la red no se anuncia: sigue metido, no ha salido ni entrado
        if (now - this.savedAt > 1000) return this.save();
        return;
      }
      case 'ventOut': {
        if (this.phase !== 'playing' || !this.canVent(p) || !p.alive || !p.inVent) return;
        p.inVent = false;
        // el ingeniero paga cada salida: hasta que pase su espera no puede volver a entrar
        if (p.engineer) p.ventReadyAt = now + this.settings.engCd * 1000;
        conn.send({ t: 'vent', in: false });
        this.bots.onVent(p, false, now); // y quien lo tenga a la vista lo ve salir
        this.broadcast({ t: 'ventFx', ids: [p.ventId] }); // y al salir se cierra
        return this.save();
      }
      case 'guard': {
        // el Ángel Guardián ya ha caído: escuda a un tripulante vivo que tenga cerca. Al
        // protegido no se le avisa: el escudo solo se nota si un impostor intenta matarlo.
        if (this.phase !== 'playing' || p.ghost !== 'angel' || p.alive) return;
        if (now < (p.guardReadyAt || 0)) return;
        let ward = null, wd = GUARD_RANGE;
        for (const q of this.players.values()) {
          if (q === p || !q.alive || q.role !== 'crew') continue; // a un impostor no se escuda
          const d = dist(p, q);
          if (d <= wd) { wd = d; ward = q; }
        }
        if (!ward) return; // sin tripulante al lado no se gasta la habilidad
        ward.shieldUntil = now + GUARD_MS;
        p.guardReadyAt = now + this.settings.angelCd * 1000;
        conn.send({ t: 'guardAck', ms: GUARD_MS });
        return this.save();
      }
      case 'blind': {
        // el Cegador (impostor ya caído) ciega 5 s a un tripulante vivo que tenga al lado: el
        // cegado no ve nada y su misión se cierra. Lo notan todos: sus ojos se ven nublados.
        if (this.phase !== 'playing' || p.ghost !== 'blinder' || p.alive || p.role !== 'impostor') return;
        if (now < (p.blindReadyAt || 0)) return conn.send({ t: 'error', msg: 'El cegador todavía se está recargando.' });
        let best = null, bd = BLIND_RANGE;
        for (const q of this.players.values()) {
          if (q === p || !q.alive || q.role !== 'crew' || (q.blindUntil || 0) > now) continue;
          const d = dist(p, q);
          if (d <= bd) { bd = d; best = q; }
        }
        if (!best) return conn.send({ t: 'error', msg: 'Acércate a un tripulante para cegarle.' });
        const ms = this.settings.blindSec * 1000;
        best.blindUntil = now + ms;
        best.sciOn = false; // sin vista tampoco se mira el panel del científico
        p.blindReadyAt = now + this.settings.blindCd * 1000;
        this.sendTo(best, { t: 'blinded', ms }); // se le cierra lo que tuviera abierto
        conn.send({ t: 'blindAck', name: best.name, color: best.color, ms });
        return this.save();
      }
      case 'unlock': {
        // el Guardallaves (tripulante ya caído) abre las puertas que el impostor ha cerrado en una
        // sala. Solo vale si de verdad hay alguna cerrada; después debe esperar su recarga.
        if (this.phase !== 'playing' || p.ghost !== 'keymaster' || p.alive || p.role !== 'crew') return;
        if (now < (p.keyReadyAt || 0)) return conn.send({ t: 'error', msg: 'La llave todavía se está recargando.' });
        const ids = this.m.byRoom.get(Math.round(Number(msg.room)));
        const shut = (ids || []).filter((id) => (this.doorAt.get(id) || 0) > now);
        if (!shut.length) return conn.send({ t: 'error', msg: 'Esa sala no tiene puertas cerradas.' });
        for (const id of shut) {
          this.doorAt.delete(id);
          const d = this.m.doors[id];
          if (d) for (const r of d.rooms || []) this.doorReady.set(r, now + DOOR_CD_MS); // como si se abrieran solas
        }
        p.keyReadyAt = now + this.settings.keyCd * 1000;
        this.broadcast({ t: 'doorsOpen', ids: shut });
        conn.send({ t: 'unlockAck', ms: this.settings.keyCd * 1000 });
        return this.save();
      }
      case 'invis': {
        // el Espectro se vuelve invisible: no mata ni entra en rejillas mientras dura
        if (this.phase !== 'playing' || !p.spectre || !p.alive || p.inVent || this.frozen(p, now)) return;
        if ((p.invisUntil || 0) > now) return; // ya está invisible
        if (now < (p.invisReadyAt || 0)) return;
        p.invisUntil = now + INVIS_MS;
        p.invisReadyAt = now + this.settings.spectreCd * 1000;
        return this.save();
      }
      case 'interrogate': {
        // el Detective tiene una sola consulta por partida y solo con sus misiones hechas:
        // hay que tener a alguien vivo al lado. Lo que averigüe se sabrá en la próxima reunión.
        if (this.phase !== 'playing' || !p.detective || !p.alive || p.inVent || p.detectiveUsed || this.frozen(p, now)) return;
        if (p.done.length < p.tasks.length) return conn.send({ t: 'error', msg: 'Termina todas tus misiones antes de interrogar.' });
        let best = null, bd = INTERROG_RANGE;
        for (const q of this.players.values()) {
          if (q === p || !q.alive) continue;
          const d = dist(p, q);
          if (d <= bd) { bd = d; best = q; }
        }
        if (!best) return conn.send({ t: 'error', msg: 'Acércate a alguien para interrogarle.' });
        p.detectiveUsed = true;
        p.detectiveTarget = best.id;
        conn.send({ t: 'interroAck', name: best.name, color: best.color });
        return this.save();
      }
      case 'track': {
        // el Localizador planta su localizador en el jugador que tenga al lado: lo seguirá en
        // el mapa mientras dure. La espera para poner otro empieza al acabarse el tiempo.
        if (this.phase !== 'playing' || !p.tracker || !p.alive || p.inVent || this.frozen(p, now)) return;
        if (p.trackerTarget) return conn.send({ t: 'error', msg: 'Ya tienes un localizador activo.' });
        if (now < (p.trackerReadyAt || 0)) return conn.send({ t: 'error', msg: 'El localizador todavía no está listo.' });
        let best = null, bd = TRACK_RANGE;
        for (const q of this.players.values()) {
          if (q === p || !q.alive) continue; // a un fantasma no se le sigue: ya no va a ningún sitio
          const d = dist(p, q);
          if (d <= bd) { bd = d; best = q; }
        }
        if (!best) return conn.send({ t: 'error', msg: 'Acércate a alguien para ponerle el localizador.' });
        p.trackerTarget = best.id;
        p.trackerUntil = now + this.settings.trackerMs * 1000;
        p.trackerReadyAt = p.trackerUntil + this.settings.trackerCd * 1000;
        conn.send({ t: 'trackAck', name: best.name, color: best.color, ms: this.settings.trackerMs * 1000 });
        return this.save();
      }
      case 'vitals': {
        // el científico abre su panel de constantes vitales: ve quién sigue vivo a cambio de
        // ir gastando la batería mientras lo tiene delante
        if (this.phase !== 'playing' || !p.scientist || !p.alive || p.inVent || p.sciOn || this.frozen(p, now)) return;
        if ((p.sciLeft ?? SCI_BATTERY_MS) <= 0) return conn.send({ t: 'error', msg: 'La batería del panel está agotada.' });
        if (now < (p.sciReadyAt || 0)) return;
        p.sciOn = true;
        conn.send({ t: 'vitals', on: true });
        return this.save();
      }
      case 'vitalsOff': {
        if (!p.sciOn) return;
        p.sciOn = false;
        p.sciReadyAt = now + this.settings.scientistCd * 1000;
        conn.send({ t: 'vitals', on: false, cd: this.settings.scientistCd * 1000 });
        return this.save();
      }
      case 'shiftPick': {
        // el shapeshifter pide la lista de a quién puede imitar: solo los vivos
        if (this.phase !== 'playing' || !p.shifter || !p.alive) return;
        conn.send({
          t: 'shiftTargets',
          players: [...this.players.values()]
            .filter((q) => q.alive && q.id !== p.id)
            .map((q) => ({ id: q.id, name: q.name, color: q.color })),
        });
        return;
      }
      case 'shift': {
        // el shapeshifter adopta la identidad de otro jugador; al volver a su forma se queda
        // congelado unos segundos, sin poder moverse ni actuar
        if (this.phase !== 'playing' || !p.shifter || !p.alive || p.inVent || p.shiftTo) return;
        if (this.frozen(p, now) || now < (p.shiftReadyAt || 0)) return;
        const form = this.players.get(String(msg.id));
        if (!form || form.id === p.id || !form.alive) return;
        p.shiftTo = form.id;
        p.shiftAt = now + SHIFT_MORPH_MS;    // hasta aquí nadie ve el cambio: la skin sigue siendo la tuya
        p.shiftUntil = p.shiftAt + SHIFT_MS; // y desde ahí dura la transformación
        p.frozenUntil = p.shiftAt;           // mientras se transforma se queda quieto
        p.shiftReadyAt = now + this.settings.shiftCd * 1000;
        p.dx = 0;
        p.dy = 0;
        return this.save();
      }
      case 'lchat': {
        // chat de la sala de espera: solo existe dentro de esta instancia (esta sala)
        if (this.phase !== 'lobby') return;
        if (now - (p.lastChatAt || 0) < 500) return;
        const text = String(msg.text || '').replace(/\s+/g, ' ').trim().slice(0, 140);
        if (!text) return;
        p.lastChatAt = now;
        const m = { id: p.id, name: p.name, color: p.color, text };
        this.lobbyChat = [...this.lobbyChat, m].slice(-LOBBY_CHAT_MAX);
        this.broadcast({ t: 'lchat', ...m });
        return this.save();
      }
      case 'chat': {
        // los muertos también hablan en la reunión, pero solo entre ellos: su mensaje no
        // sale hacia los vivos. El chat de los vivos sí lo ven los fantasmas.
        if (this.phase !== 'meeting') return;
        if (now - (p.lastChatAt || 0) < 500) return; // mismo freno que el chat de la sala
        const text = String(msg.text || '').replace(/\s+/g, ' ').trim().slice(0, 140);
        if (!text) return;
        p.lastChatAt = now;
        const m = { t: 'chat', id: p.id, name: p.name, color: p.color, text, dead: p.alive ? 0 : 1 };
        if (p.alive) this.broadcast(m);
        else for (const q of this.players.values()) if (!q.alive) this.sendTo(q, m);
        return;
      }
      case 'vote': {
        // durante la fase de espera no se vota; los muertos tampoco votan nunca
        if (this.phase !== 'meeting' || !this.meeting || !p.alive) return;
        if (Date.now() < this.meeting.discussUntil) return;
        if (this.meeting.votes.has(p.id)) return;
        // El Juez que acaba de sentenciar no vota además en esta misma ronda: su decisión hace
        // de voto. En las rondas siguientes vota como cualquiera, aunque ya no le quede sentencia.
        if (p.judgeTarget) return;
        const target = String(msg.target);
        if (target !== 'skip') {
          const q = this.players.get(target);
          if (!q || !q.alive || q.id === p.id) return;
        }
        this.meeting.votes.set(p.id, target);
        this.broadcast({ t: 'voted', id: p.id });
        if (this.allVoted()) this.endMeeting();
        return this.save();
      }
      case 'judge': {
        // el Juez gasta su única sentencia: su decisión decide la expulsión, por encima de los votos
        if (this.phase !== 'meeting' || !this.meeting || !p.alive || !p.judge || p.judgeUsed) return;
        if (this.meeting.votes.has(p.id)) return; // si ya votó normal, no puede sentenciar
        if (Date.now() < this.meeting.discussUntil) return; // solo durante la votación
        const target = this.players.get(String(msg.target));
        if (!target || !target.alive || target.id === p.id) return;
        p.judgeUsed = true;
        p.judgeTarget = target.id;
        p.judgeAt = Date.now(); // si hay varios jueces, decide el primero en sentenciar
        this.broadcast({ t: 'voted', id: p.id }); // su sentencia cuenta como voto: el resto lo ve votado
        conn.send({ t: 'judgeAck' });
        if (this.allVoted()) this.endMeeting();
        return this.save();
      }
    }
  }

  /* ---------- entrada / salida ---------- */

  async onCreate(conn, msg) {
    if (this.findByConn(conn.id)) return;
    const code = String(msg.code || '').toUpperCase().trim();
    if (!CODE_RE.test(code)) return conn.send({ t: 'error', msg: 'Código de sala no válido.' });
    // el registro global dice si otra sala viva tiene ese código
    const other = this.rt.registry.list().find((r) => r.code === code && r.status !== 'gone');
    if (other || this.players.size > 0) return conn.send({ t: 'error', msg: 'Ese código ya está ocupado. Generando otro…' });
    this.reset(code);
    // lo elegido en la pantalla de crear sala: aforo, mapa y tipo de sala
    this.capacity = clamp(Math.round(Number(msg.cap)) || MAX_PLAYERS, MIN_PLAYERS, MAX_PLAYERS);
    if (MAPS[msg.map]) this.map = msg.map;
    this.mode = msg.mode === 'bots' ? 'bots' : 'online';
    this.lang = msg.lang === 'en' ? 'en' : 'es';
    // pública o privada: sin indicar nada, las salas de bots eran privadas y las demás públicas
    // Una sala de bots es siempre privada: nadie más puede entrar. Las demás, lo que se pida (públicas por defecto).
    this.visibility = this.mode === 'bots' ? 'private' : msg.vis === 'private' ? 'private' : 'public';
    // el país lo manda la cabecera del proxy (si la hay); si no, la pista del cliente (su zona horaria)
    this.country = cleanCountry(conn.country) || cleanCountry(msg.country);
    this.createdAt = Date.now();
    this.addPlayer(conn, msg.name, msg.lang);
    // una sala de bots arranca ya con compañía: el anfitrión puede quitarlos o añadir más
    if (this.mode === 'bots') for (let i = 0; i < 5 && this.players.size < this.capacity; i++) this.addBot();
    await this.save();
  }

  async onJoin(conn, msg) {
    if (this.findByConn(conn.id)) return;
    // 'out' avisa de que la sala ya no te tiene: el cliente vuelve al menú con el código
    // puesto (y sin recargar) en vez de quedarse mirando una partida que ya no es suya.
    if (this.banned.has(conn.id)) return conn.send({ t: 'error', msg: 'El anfitrión te ha baneado de esta sala.', out: true });
    const code = String(msg.code || '').toUpperCase().trim();
    if (!this.code || this.players.size === 0) return conn.send({ t: 'error', msg: 'No existe esa sala. Comprueba el código.', out: true });
    if (code !== this.code) return conn.send({ t: 'error', msg: 'No existe esa sala. Comprueba el código.' });
    if (this.mode === 'bots') return conn.send({ t: 'error', msg: 'Es una sala de bots: es privada y nadie más puede entrar.', out: true });
    if (this.phase !== 'lobby') return conn.send({ t: 'error', msg: 'La partida ya ha empezado.', out: true });
    if (this.players.size >= this.capacity) return conn.send({ t: 'error', msg: 'La sala está llena.' });
    this.addPlayer(conn, msg.name, msg.lang);
    await this.save();
  }

  addPlayer(conn, name, lang) {
    const p = this.makePlayer(conn.id, name);
    if (lang === 'es' || lang === 'en') p.lang = lang;
    this.players.set(p.id, p);
    if (!this.hostSeat) this.hostSeat = p.id;
    conn.send({ t: 'joined', id: p.id, code: this.code });
    this.broadcast(this.lobbyInfo());
    this.syncRoom();
    this.armRoomSync();
    return p;
  }

  // Un bot es un jugador más (con bot:true) que no tiene socket: lo maneja server/bots.mjs.
  addBot() {
    if (this.phase !== 'lobby' || this.players.size >= this.capacity) return null;
    const p = this.makePlayer('bot:' + this.code + ':' + this.nextSeat, this.bots.newName());
    p.bot = true;
    this.players.set(p.id, p);
    this.bots.afterAdd(p);
    this.broadcast(this.lobbyInfo());
    this.syncRoom();
    return p;
  }

  makePlayer(connId, name) {
    const used = new Set([...this.players.values()].map((p) => p.color));
    const spot = this.spawnSpot(Math.max(4, this.players.size + 1), [...this.players.values()].map((q) => ({ x: q.x, y: q.y })), this.closedDoors());
    const p = {
      id: 'p' + this.nextSeat++, connId, name: cleanName(name),
      color: COLORS.find((c) => !used.has(c)) || COLORS[0],
      x: spot.x, y: spot.y, dx: 0, dy: 0, face: 1,
      role: 'crew', alive: true, tasks: [], done: [],
      killReadyAt: 0, btnReadyAt: 0, lastInputAt: 0, lastChatAt: 0, seq: 0, offline: false, offlineSince: 0,
      inVent: false, ventId: null, meetUsed: false,
      shifter: false, viper: false, engineer: false, alerter: false, judge: false, judgeUsed: false, judgeTarget: null, shiftTo: null, shiftAt: 0, shiftUntil: 0, frozenUntil: 0, shiftReadyAt: 0, ventReadyAt: 0,
      spectre: false, invisUntil: 0, invisReadyAt: 0,
      ghost: '', guardReadyAt: 0, shieldUntil: 0, keyReadyAt: 0, blindReadyAt: 0, blindUntil: 0,
      scientist: false, sciReadyAt: 0, sciLeft: SCI_BATTERY_MS, sciOn: false,
      detective: false, detectiveUsed: false, detectiveTarget: null,
      tracker: false, trackerTarget: null, trackerUntil: 0, trackerReadyAt: 0,
    };
    return p;
  }

  removePlayer(p, kicked = false) {
    if (!this.players.has(p.id)) return;
    this.players.delete(p.id);
    if (p.bot) this.bots.forget(p);
    // sin personas la sala no tiene sentido: los bots solos no juegan
    else if (![...this.players.values()].some((q) => !q.bot)) this.players.clear();
    this.syncRoom(); // actualiza (o retira) el anuncio de la sala
    if (this.players.size === 0) {
      this.reset(this.code);
      return;
    }
    if (this.hostSeat === p.id) this.hostSeat = [...this.players.values()].find((q) => !q.bot).id;
    if (this.phase === 'lobby' || this.phase === 'ended') {
      this.broadcast(this.lobbyInfo());
      return;
    }
    if (p.role === 'crew') {
      this.taskTotal = Math.max(0, this.taskTotal - this.settings.tasks);
      this.taskDone = Math.max(0, this.taskDone - p.done.length);
    }
    this.broadcast({ t: 'left', id: p.id, hostId: this.hostSeat, kicked: !!kicked, ban: kicked === 'ban' });
    if (this.phase === 'meeting' && this.meeting) this.meeting.votes.delete(p.id);
    const w = this.checkWin();
    if (w && (this.phase === 'playing' || this.phase === 'meeting')) return this.finish(w);
    if (this.phase === 'meeting' && this.meeting && this.allVoted()) this.endMeeting();
  }

  // Quien lleva demasiado sin conexión pierde su plaza: así una sala no se queda con
  // jugadores fantasma para siempre, pero volver a la pestaña a tiempo siempre cuenta.
  pruneOffline(now = Date.now()) {
    for (const p of [...this.players.values()]) {
      if (!p.bot && p.offline && now - (p.offlineSince || 0) > OFFLINE_GRACE_MS) this.removePlayer(p);
    }
  }

  /* ---------- flujo de partida ---------- */

  startGame() {
    const list = shuffle([...this.players.values()]);
    const S = this.settings;
    const nImp = this.impCount(list.length);
    // sala de bots: el anfitrión puede pedir bando. Los impostores son los primeros de la lista, así que
    // se le sube al principio (impostor) o se le baja al final (tripulante); con 'random' no se toca.
    if (this.mode === 'bots' && this.want !== 'random' && nImp > 0 && nImp < list.length) {
      const hi = list.findIndex((q) => q.id === this.hostSeat);
      if (hi >= 0) {
        const [h] = list.splice(hi, 1);
        if (this.want === 'impostor') list.unshift(h); else list.push(h);
      }
    }
    const now = Date.now();
    list.forEach((p, i) => {
      p.role = i < nImp ? 'impostor' : 'crew';
      p.alive = true;
      p.done = [];
      p.tasks = pickTasks(this.m, S.tasks);
      p.meetUsed = false; // cada jugador arranca con su propia reunión disponible
      p.seq = 0;          // y su contador de órdenes, igual que el de su cliente
      // roles especiales: un impostor cambia de forma y un tripulante usa las rejillas
      p.shifter = false;
      p.viper = false;
      p.engineer = false;
      p.alerter = false;
      p.judge = false;
      p.judgeUsed = false;
      p.judgeTarget = null;
      p.shiftTo = null;
      p.shiftAt = 0;
      p.shiftUntil = 0;
      p.frozenUntil = 0;
      p.shiftReadyAt = 0;
      p.ventReadyAt = 0;
      p.spectre = false;
      p.invisUntil = 0;
      p.invisReadyAt = 0;
      p.ghost = '';
      p.guardReadyAt = 0;
      p.shieldUntil = 0;
      p.keyReadyAt = 0;
      p.blindReadyAt = 0;
      p.blindUntil = 0;
      p.detective = false;
      p.detectiveUsed = false;
      p.detectiveTarget = null;
      p.tracker = false;
      p.trackerTarget = null;
      p.trackerUntil = 0;
      p.trackerReadyAt = 0;
      p.scientist = false;
      p.sciReadyAt = 0;
      p.sciLeft = SCI_BATTERY_MS;
      p.sciOn = false;
    });
    // Cada rol lleva su cantidad (los ajustes de la sala). Se reparten al azar entre quienes aún
    // no tienen rol de ese tipo: si piden más de los que caben, los que sobran se quedan fuera
    // y el resto son tripulantes (o impostores) corrientes.
    const deal = (pool, keys, give) => {
      const bag = [];
      for (const k of keys) for (let i = 0; i < Math.min(S[k] || 0, pool.length); i++) bag.push(k);
      const order = shuffle(pool.slice());
      shuffle(bag).slice(0, order.length).forEach((k, i) => give(order[i], k));
    };
    const crewList = list.filter((p) => p.role === 'crew');
    const impList = list.filter((p) => p.role === 'impostor');
    // Roles en vida: el cambiaformas, la víbora, el espectro, el ingeniero, el alertador, el juez...
    deal(impList, ['shifter', 'viper', 'spectre'], (p, k) => { p[k] = true; });
    deal(crewList, ['engineer', 'alerter', 'judge', 'scientist', 'detective', 'tracker'], (p, k) => { p[k] = true; });
    // Roles de fantasma: otro reparto aparte, también al azar y también secreto. Cada jugador puede
    // tener uno (da igual cuál lleve en vida) y no lo sabe hasta que muere.
    deal(crewList, GHOST_CREW, (p, k) => { p.ghost = k; });
    deal(impList, GHOST_IMP, (p, k) => { p.ghost = k; });
    this.bodies = [];
    this.dark = false;
    this.reactor = null;
    this.openAllDoors(); // un cierre de la partida anterior no pasa a la siguiente
    this.taskDone = 0;
    this.taskTotal = (list.length - nImp) * S.tasks;
    this.spawn();
    this.phase = 'roles';
    this.rolesUntil = now + ROLES_MS;
    const roster = list.map((p) => ({ id: p.id, name: p.name, color: p.color }));
    const imps = list.filter((p) => p.role === 'impostor').map((p) => p.id);
    for (const p of list) {
      this.sendTo(p, {
        t: 'start', role: p.role, phase: this.phase, mates: p.role === 'impostor' ? imps : [], roster, done: p.done,
        shifter: !!p.shifter, viper: !!p.viper, engineer: !!p.engineer, alerter: !!p.alerter, judge: !!p.judge, judgeUsed: !!p.judgeUsed, ghost: '', angel: false /* el rol de fantasma queda oculto hasta morir */, scientist: !!p.scientist, spectre: !!p.spectre, detective: !!p.detective, tracker: !!p.tracker,
        tasks: p.tasks.map((id) => ({ ...this.m.tasks[id], box: this.m.props[id] })),         vents: this.m.vents, world: this.m.world, floors: this.m.floors, obst: this.m.obst, sol: this.m.solid, doors: this.m.doors, button: this.m.button, panel: this.m.panel, map: this.map,
        rmeta: { core: this.m.reactor, pts: this.m.rpts, hold: REACTOR_HOLD_MS, ms: REACTOR_MS, range: HOLD_RANGE },
        speed: SPEED * S.speed / 100, radius: RADIUS, killRange: KILL_RANGE, useRange: USE_RANGE, reportRange: REPORT_RANGE, trackRange: TRACK_RANGE, blindRange: BLIND_RANGE,
        bu: 0,
        tms: S.trackerMs, tcd: S.trackerCd, // el Localizador enseña sus tiempos en su carta de rol
        you: [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10], // tu punto de salida: el cliente arranca ahí, nunca dentro de un objeto
      });
    }
    this.bots.onStart(); // cada bot empieza la partida con la cabeza en blanco
    this.ensureLoop();
    this.syncRoom(); // la sala pasa a "partida en curso": ya no admite jugadores nuevos
    return this.save();
  }

  /* fin del reparto de roles: aquí empieza de verdad la partida */
  beginPlay() {
    const now = Date.now();
    this.sabLockAt = now + this.settings.sabCd * 1000;
    this.rtLockAt = now + this.settings.reactorCd * 1000;
    for (const p of this.players.values()) {
      p.killReadyAt = now + this.settings.killCd * 1000;
      p.shiftReadyAt = now + this.settings.shiftCd * 1000;
      p.ventReadyAt = 0;
      p.invisReadyAt = now + this.settings.spectreCd * 1000; // al empezar, el Espectro espera su cooldown como los demás
      p.invisUntil = 0;
      p.btnReadyAt = now + this.settings.btnCd * 1000; // al empezar, el botón central no se puede pulsar de inmediato
      p.lastInputAt = now;
      p.dx = 0;
      p.dy = 0;
    }
    this.phase = 'playing';
    this.broadcast({ t: 'go' });
    this.ensureLoop();
    return this.save();
  }

  /* Punto de aparición: un corro alrededor del botón, abierto en anillos hasta encontrar
     hueco. Así nadie nace dentro de un adorno ni encima de otro jugador, que era lo que
     pasaba al apretarse todos en el mismo corro de siempre. */
  spawnSpot(n, taken, closed) {
    const c = this.m.spawn || this.m.button;
    const steps = Math.max(8, n * 2 + 4);
    for (let ring = 0; ring < 5; ring++) {
      const rad = 150 + ring * 74;
      for (let k = 0; k < steps; k++) {
        const a = ((k + ring * 0.5) / steps) * Math.PI * 2;
        const spot = freeSpot(this.m, c.x + Math.cos(a) * rad, c.y + Math.sin(a) * rad, closed);
        if (taken.every((t) => dist(t, spot) > 46)) return spot;
      }
    }
    return freeSpot(this.m, c.x, c.y, closed);
  }

  spawn() {
    const list = [...this.players.values()];
    const closed = this.closedDoors();
    const taken = [];
    for (const p of list) {
      const spot = this.spawnSpot(list.length, taken, closed);
      taken.push(spot);
      p.x = spot.x;
      p.y = spot.y;
      p.dx = p.dy = 0;
    }
  }

  allVoted() {
    for (const p of this.players.values()) {
      if (!p.alive) continue;
      if (p.judgeTarget) continue; // el Juez que sentenció en esta ronda ya ha "votado" con su decisión
      if (!this.meeting.votes.has(p.id)) return false;
    }
    return true;
  }

  // Quién puede usar las rejillas: los impostores y el ingeniero de la tripulación.
  canVent(p) {
    return p.role === 'impostor' || !!p.engineer;
  }

  // Congelado: el shapeshifter que acaba de volver a su forma no se mueve ni actúa.
  frozen(p, now) {
    return (p.frozenUntil || 0) > now;
  }

  // Un cuerpo de la Víbora pasa por tres fases dentro de su tiempo de desaparición:
  // 1 entero con veneno, 2 medio cuerpo y 3 casi deshecho. Cumplido el tiempo, se retira.
  bodyPhase(bd, now) {
    if (!bd.rot) return 0;
    const el = now - (bd.at || 0);
    if (el < bd.rot / 3) return 1;
    if (el < (bd.rot * 2) / 3) return 2;
    return 3;
  }

  // con un sabotaje en marcha (luces o reactor) no se pueden convocar reuniones
  sabotageActive() {
    return this.dark || !!this.reactor;
  }

  /* ---------- movimiento ---------- */

  // Marca el punto en el que empieza un tramo de movimiento (el tiempo que una orden lleva
  // aplicada). La posición de ese punto es la que el cliente usa para reconciliarse.
  markSeg(p, now) {
    p.segX = p.x; p.segY = p.y; p.segT0 = now; p.intT = now;
    p.lastIntX = p.x; p.lastIntY = p.y;
  }

  // Llega una orden nueva. El tramo anterior se cierra con la duración que midió el CLIENTE
  // (msg.ms), no con el instante en que llega el mensaje: si no, la sala sigue moviendo al
  // jugador durante todo el retardo de red y se pasa de donde soltó la tecla (eso era el
  // "resbalón" al parar). Se rehace el tramo desde su inicio, así que tanto un exceso como
  // un defecto quedan corregidos. Sin `ms` (clientes viejos) se cuenta hasta la llegada.
  applyInput(p, dx, dy, ms, now) {
    const moving = !!(p.dx || p.dy);
    if (moving && this.phase === 'playing' && !p.inVent && !this.frozen(p, now)
      && p.segT0 !== undefined && Math.hypot(p.x - p.lastIntX, p.y - p.lastIntY) <= 1) {
      const byArrival = Math.max(0, Math.min(1000, now - p.segT0));
      let owed = byArrival;
      const claimed = Number(ms);
      if (Number.isFinite(claimed) && claimed >= 0) {
        // La suma de lo que el cliente dice de más sobre el reloj real tiene un tope: así no
        // se puede ganar velocidad mandando duraciones infladas. Se va olvidando poco a poco.
        const extra = clamp(Math.min(claimed, 400) - byArrival, -1000, MV_EXTRA_CAP - (p.mvExtra || 0));
        p.mvExtra = (p.mvExtra || 0) + extra;
        owed = Math.max(0, byArrival + extra);
      }
      p.x = p.segX; p.y = p.segY;
      const closed = this.closedDoors(now);
      const spd = SPEED * this.settings.speed / 100;
      let rem = owed / 1000;
      while (rem > 1e-6) { const h = Math.min(0.04, rem); stepPlayer(this.m, p, h, spd, closed); rem -= h; }
    }
    p.dx = dx;
    p.dy = dy;
    this.markSeg(p, now);
  }

  /* ---------- puertas de sala ---------- */

  // Las puertas cerradas frenan el paso y cortan la vista igual que un muro.
  closedDoors(now = Date.now()) {
    const out = [];
    for (const [id, until] of this.doorAt) if (now < until) { const d = this.m.doors[id]; if (d) out.push(d); }
    return out;
  }

  closeDoors(room, now) {
    const ids = this.m.byRoom.get(room);
    if (!ids || !ids.length) return false;
    const until = now + DOOR_MS;
    for (const id of ids) this.doorAt.set(id, until);
    this.doorReady.set(room, until + DOOR_CD_MS); // abiertas a los 10 s, y 20 s más sin poder cerrarlas
    return true;
  }

  // Nadie abre una puerta a mano: se abren cuando se cumple su tiempo (y en las reuniones,
  // para que nadie se quede encerrado durante una votación).
  openAllDoors(now = Date.now()) {
    // se abran solas, en una reunión o al empezar otra partida, la sala que las tenía
    // cerradas se queda 20 s sin poder volver a cerrarlas
    for (const id of this.doorAt.keys()) {
      const d = this.m.doors[id];
      if (d) for (const r of d.rooms || []) this.doorReady.set(r, now + DOOR_CD_MS);
    }
    this.doorAt.clear();
  }

  startMeeting(caller, reason, bodyName) {
    this.phase = 'meeting';
    this.meetCallerId = caller.id;
    this.meetReason = reason;
    this.meetBody = bodyName || null;
    for (const p of this.players.values()) {
      p.dx = 0;
      p.dy = 0;
      // la reunión corta cualquier transformación y saca a todos de las rejillas
      p.shiftTo = null;
      p.shiftAt = 0;
      p.shiftUntil = 0;
      p.frozenUntil = 0;
      p.invisUntil = 0; // la reunión corta la invisibilidad del Espectro
      p.blindUntil = 0; // y la ceguera: se vota viendo
      p.judgeTarget = null; // la diana del Juez se reinicia cada reunión (el uso ya gastado sigue quemado)
      // el panel del científico se cierra al convocarse la reunión: al volver toca esperar su recarga
      if (p.sciOn) {
        p.sciOn = false;
        p.sciReadyAt = Date.now() + this.settings.scientistCd * 1000;
        this.sendTo(p, { t: 'vitals', on: false, cd: this.settings.scientistCd * 1000 });
      }
      if (p.inVent) {
        p.inVent = false;
        if (p.engineer) p.ventReadyAt = Date.now() + this.settings.engCd * 1000;
        this.sendTo(p, { t: 'vent', in: false });
      }
    }
    // Una reunión para el reactor, pero NO devuelve la luz: un apagón sigue hasta que alguien
    // repare el cuadro, también después de reportar un cuerpo.
    this.reactor = null;
    this.openAllDoors(); // y abre las puertas: nadie se queda encerrado durante la votación
    // Dos fases: primero deliberación (nadie vota) y después votación.
    const t0 = Date.now();
    const disc = this.settings.meetSec * 1000;
    const vot = this.settings.voteSec * 1000;
    this.meeting = { votes: new Map(), discussUntil: t0 + disc, voteUntil: t0 + disc + vot, open: false };
    this.broadcast(this.meetingMsg(caller.id, reason, bodyName));
    // El Detective recibe aquí su informe: en esta reunión se le revela el rol del jugador
    // que interrogó. La consulta se gasta al contarla (solo se revela una vez).
    for (const d of this.players.values()) {
      if (!d.detective || !d.detectiveTarget) continue;
      const t = this.players.get(d.detectiveTarget);
      d.detectiveTarget = null;
      if (t) this.sendTo(d, { t: 'interroReveal', name: t.name, color: t.color, impostor: t.role === 'impostor', role: this.roleTitle(t) });
    }
    this.ensureLoop();
    return this.save();
  }

  // Un jugador que acaba de morir (expulsado) descubre ahora su rol de fantasma, si lo tenía.
  revealGhost(p) {
    if (p.ghost) this.sendTo(p, { t: 'ghostOn', ghost: p.ghost });
  }

  // Cómo se llama el rol de un jugador, para el informe del Detective.
  roleTitle(p) {
    if (p.role === 'impostor') {
      return p.shifter ? 'Impostor · Cambiaformas' : p.viper ? 'Impostor · Víbora' : p.spectre ? 'Impostor · Espectro' : 'Impostor';
    }
    return p.engineer ? 'Tripulante · Ingeniero' : p.alerter ? 'Tripulante · Alertador' : p.judge ? 'Tripulante · Juez'
      : p.scientist ? 'Tripulante · Científico' : p.detective ? 'Tripulante · Detective'
        : p.tracker ? 'Tripulante · Localizador' : 'Tripulante';
  }

  meetingMsg(callerId, reason, bodyName) {
    const now = Date.now();
    const m = this.meeting || { discussUntil: now, voteUntil: now + this.settings.voteSec * 1000 };
    return {
      t: 'meeting', caller: callerId, reason, bodyName: bodyName || null,
      voting: now >= m.discussUntil,
      discussMs: Math.max(0, m.discussUntil - now),
      voteMs: this.settings.voteSec * 1000,
      ms: Math.max(0, m.voteUntil - now),
      endsAt: m.voteUntil,
      players: [...this.players.values()].map((p) => ({ id: p.id, name: p.name, color: p.color, alive: p.alive })),
    };
  }

  endMeeting() {
    if (this.phase !== 'meeting' || !this.meeting) return;
    const votes = [...this.meeting.votes].map(([from, to]) => ({ from, to }));
    // el Juez que ha gastado su sentencia decide la expulsión por encima de los votos
    // con varios jueces decide uno solo, el primero que sentenció: la sentencia de los demás no se gasta
    const judges = [...this.players.values()].filter((p) => p.judge && p.judgeTarget).sort((a, b) => (a.judgeAt || 0) - (b.judgeAt || 0));
    const judge = judges[0] || null;
    for (const j of judges) if (j !== judge) { j.judgeTarget = null; j.judgeUsed = false; this.sendTo(j, { t: 'judgeRefund' }); }
    let ejected = null;
    let judgeInfo = null;
    let tie = false;
    if (judge) {
      const target = this.players.get(judge.judgeTarget);
      const success = !!(target && target.role === 'impostor');
      // acertó: se va el impostor señalado; falló: el Juez paga con su propia expulsión
      const ep = success ? target : judge;
      ep.alive = false;
      this.revealGhost(ep); // expulsado: ahora descubre su rol de fantasma
      ejected = { id: ep.id, name: ep.name, color: ep.color, wasImpostor: ep.role === 'impostor' };
      judgeInfo = {
        judgeName: judge.name, judgeColor: judge.color,
        target: target ? { id: target.id, name: target.name, color: target.color } : null,
        success,
      };
      judge.judgeTarget = null;
    } else {
      const counts = new Map();
      for (const target of this.meeting.votes.values()) counts.set(target, (counts.get(target) || 0) + 1);
      let best = 0, bestT = [];
      for (const [t, c] of counts) {
        if (c > best) { best = c; bestT = [t]; }
        else if (c === best) bestT.push(t);
      }
      tie = bestT.length > 1;
      if (bestT.length === 1 && bestT[0] !== 'skip') {
        const ep = this.players.get(bestT[0]);
        if (ep) {
          ep.alive = false;
          this.revealGhost(ep);
          ejected = { id: ep.id, name: ep.name, color: ep.color, wasImpostor: ep.role === 'impostor' };
        }
      }
    }
    const ms = judgeInfo ? JUDGE_RESULT_MS : RESULT_MS;
    this.phase = 'result';
    this.lastResult = { t: 'result', judge: judgeInfo, ejected, votes, tie, ms };
    this.resultUntil = Date.now() + ms;
    this.meeting = null;
    this.broadcast(this.lastResult);
    this.ensureLoop();
    return this.save();
  }

  /* Espera de los sabotajes: es del equipo impostor y compartida. Cuando se arregla uno (luces o
     reactor) empieza a contar la de los dos, cada una con su duración de los ajustes de la sala. */
  startSabCooldown(now) {
    this.sabLockAt = now + this.settings.sabCd * 1000;
    this.rtLockAt = now + this.settings.reactorCd * 1000;
  }

  resume() {
    this.bodies = [];
    // el apagón sobrevive a la reunión: las luces siguen apagadas hasta que se reparen
    this.reactor = null;
    this.openAllDoors();
    this.spawn();
    const now = Date.now();
    if (!this.dark) this.sabLockAt = now + this.settings.sabCd * 1000;
    this.rtLockAt = now + this.settings.reactorCd * 1000;
    for (const p of this.players.values()) {
      p.killReadyAt = now + this.settings.killCd * 1000;
      p.shiftReadyAt = now + this.settings.shiftCd * 1000;
      p.ventReadyAt = 0;
      p.invisUntil = 0;
      p.invisReadyAt = now + this.settings.spectreCd * 1000;
      p.btnReadyAt = now + this.settings.btnCd * 1000; // tras una reunión, el botón central también tarda en reactivarse
    }
    this.phase = 'playing';
    this.broadcast({ t: 'resume' });
    this.ensureLoop();
    return this.save();
  }

  // Los muertos siguen pudiendo terminar sus misiones, así que sus tareas pendientes no
  // salen del total: la barra de progreso se puede llenar igual con su trabajo.

  checkWin() {
    let imp = 0, crew = 0;
    for (const p of this.players.values()) {
      if (!p.alive) continue;
      if (p.role === 'impostor') imp++; else crew++;
    }
    if (imp === 0) return 'crew';
    if (imp >= crew) return 'impostors';
    if (this.taskTotal > 0 && this.taskDone >= this.taskTotal) return 'crew';
    return null;
  }

  finish(winner) {
    this.phase = 'ended';
    this.meeting = null;
    this.reactor = null;
    this.lastEnd = {
      t: 'end', winner,
      roles: [...this.players.values()].map((p) => ({ id: p.id, name: p.name, color: p.color, role: p.role, alive: p.alive, shifter: !!p.shifter, viper: !!p.viper, engineer: !!p.engineer, alerter: !!p.alerter, judge: !!p.judge, ghost: p.ghost || '', angel: p.ghost === 'angel', scientist: !!p.scientist, spectre: !!p.spectre, detective: !!p.detective, tracker: !!p.tracker })),
    };
    this.broadcast(this.lastEnd);
    this.syncRoom(); // partida terminada: la sala sale del listado hasta que el anfitrión reabra
    this.ensureLoop();
    return this.save();
  }

  /* ---------- bucle del juego ---------- */

  ensureLoop() {
    const want = this.phase === 'playing' || this.phase === 'roles' || this.phase === 'meeting' || this.phase === 'result';
    if (want && !this.timer) {
      this.lastTick = Date.now();
      this.timer = setInterval(() => this.tick(), TICK_MS);
    } else if (!want && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (want) this.armWatch();
  }

  armWatch() { this.rt.schedule('watch', Date.now() + WATCH_MS); }

  tick() {
    const now = Date.now();
    const dtTotal = Math.min(1, (now - this.lastTick) / 1000); // tiempo real: no se queda atrás
    this.lastTick = now;
    this.bots.tick(now); // los bots deciden y mandan sus órdenes antes de que se mueva nadie
    if (now - this.roomSyncedAt > ROOM_SYNC_MS) this.syncRoom(); // mantiene el anuncio al día
    if (this.phase === 'roles') {
      if (now >= this.rolesUntil) this.beginPlay();
      return;
    }
    if (this.phase === 'meeting') {
      if (!this.meeting) return;
      if (now >= this.meeting.voteUntil) { this.endMeeting(); return; }
      // al acabar la deliberación se abre la votación para todos a la vez
      if (!this.meeting.open && now >= this.meeting.discussUntil) {
        this.meeting.open = true;
        this.broadcast({ t: 'voteOpen', ms: Math.max(0, this.meeting.voteUntil - now) });
      }
      return;
    }
    if (this.phase === 'result') {
      if (now >= this.resultUntil) {
        const w = this.checkWin();
        if (w) this.finish(w); else this.resume();
      }
      return;
    }
    if (this.phase !== 'playing') return;

    this.pruneOffline(now);
    if (this.phase !== 'playing') return;

    // El localizador del Localizador se cuelga de un jugador vivo: si el marcado cae o se
    // acaba su tiempo, deja de verse (la espera ya quedó fijada al ponerlo).
    for (const p of this.players.values()) {
      if (!p.trackerTarget) continue;
      const tt = this.players.get(p.trackerTarget);
      // si el marcado cae (o le expulsan en una reunión) el localizador se apaga solo
      if (!tt || !tt.alive || now >= p.trackerUntil) { p.trackerTarget = null; p.trackerUntil = 0; }
    }

    // Las puertas se abren solas al cumplirse su tiempo, y al abrirse se oyen.
    if (this.doorAt.size) {
      const out = [];
      for (const [id, until] of this.doorAt) if (now >= until) out.push(id);
      for (const id of out) {
        this.doorAt.delete(id);
        // al abrirse, su sala se queda sin poder cerrarlas 20 s más
        const d = this.m.doors[id];
        if (d) for (const r of d.rooms || []) this.doorReady.set(r, now + DOOR_CD_MS);
      }
      if (out.length) this.broadcast({ t: 'doorsOpen', ids: out });
    }
    const closed = this.closedDoors(now); // puertas cerradas: frenan el paso y cortan la vista
    // salas que acaban de abrir: hasta que pase su espera no se pueden cerrar otra vez
    const dcd = [];
    for (const [room, until] of this.doorReady) {
      if (until > now) dcd.push([room, until - now]);
      else this.doorReady.delete(room);
    }

    // los cuerpos de la Víbora se deshacen en su tiempo: pasado, ya no existen para nadie
    if (this.bodies.some((b) => b.rot)) this.bodies = this.bodies.filter((b) => !b.rot || now - (b.at || 0) < b.rot);

    // Sabotaje del reactor: exige dos tripulantes vivos, distintos y quietos en sus consolas.
    if (this.reactor) {
      if (now >= this.reactor.until) {
        this.reactor = null;
        return this.finish('impostors'); // nadie lo ha resuelto a tiempo: pierde la tripulación
      }
      let both = true;
      for (const side of ['a', 'b']) {
        const h = this.reactor[side] ? this.players.get(this.reactor[side]) : null;
        const pt = side === 'a' ? this.m.rpts[0] : this.m.rpts[1];
        // si se muere, se desconecta o abandona su punto, deja de contar
        if (!h || !h.alive || h.offline || h.inVent || dist(h, pt) > HOLD_RANGE) { this.reactor[side] = null; both = false; }
      }
      if (both && this.reactor.a && this.reactor.b && this.reactor.a !== this.reactor.b) {
        this.reactor.hold += TICK_MS;
        if (this.reactor.hold >= REACTOR_HOLD_MS) { // resuelto entre los dos
          this.reactor = null;
          this.startSabCooldown(now); // al resolver el reactor empieza la espera de TODOS los sabotajes
        }
      } else {
        this.reactor.hold = 0;
      }
    }

    // El ingeniero no puede acampar en las rejillas: pasados ENG_VENT_MS se le saca solo,
    // con la misma espera que si hubiera salido a mano.
    for (const p of this.players.values()) {
      if (!p.inVent || !p.engineer || !p.alive) continue;
      if (now - (p.ventAt || 0) < ENG_VENT_MS) continue;
      const ventId = p.ventId;
      p.inVent = false;
      p.ventAt = 0;
      p.ventReadyAt = now + this.settings.engCd * 1000;
      this.sendTo(p, { t: 'vent', in: false });
      this.broadcast({ t: 'ventFx', ids: [ventId] });
    }

    // La batería del panel del científico se gasta mientras lo tiene abierto; sin batería el
    // panel se cierra solo y en lo que queda de partida ya no vuelve a abrirse.
    for (const p of this.players.values()) {
      if (!p.sciOn) continue;
      p.sciLeft = Math.max(0, (p.sciLeft ?? SCI_BATTERY_MS) - TICK_MS);
      if (p.sciLeft <= 0) {
        p.sciOn = false;
        p.sciReadyAt = now + this.settings.scientistCd * 1000;
        this.sendTo(p, { t: 'vitals', on: false, cd: this.settings.scientistCd * 1000, empty: true });
      }
    }

    // El shapeshifter vuelve a su propia forma en cuanto se acaba su tiempo.
    for (const p of this.players.values()) {
      if (p.shiftTo && now >= p.shiftUntil) {
        p.shiftTo = null;
        p.frozenUntil = now + SHIFT_FREEZE_MS; // al recuperar su forma se queda congelado un instante
        p.dx = 0;
        p.dy = 0;
      }
    }
    const prevTick = now - dtTotal * 1000;
    for (const p of this.players.values()) {
      // una puerta que se cierra encima de alguien no lo deja atrapado: se le saca por el lado más cercano
      if (closed.length && p.alive && !p.inVent) { const q = resolveCircle(this.m, p.x, p.y, RADIUS, closed); if (q.ok && (q.x !== p.x || q.y !== p.y)) { p.x = q.x; p.y = q.y; } }
      if (p.mvExtra) p.mvExtra *= 0.998; // el margen de duraciones infladas se va olvidando
      if (this.frozen(p, now)) { p.dx = 0; p.dy = 0; this.markSeg(p, now); continue; } // congelado: quieto y sin acciones
      if ((p.dx || p.dy) && now - (p.lastInputAt || 0) > INPUT_SILENCE_MS) { p.dx = 0; p.dy = 0; }
      // quieto, o movido por otra vía (aparecer, salir de una rejilla…): el tramo empieza aquí
      if (!(p.dx || p.dy) || p.lastIntX === undefined || Math.hypot(p.x - p.lastIntX, p.y - p.lastIntY) > 1) this.markSeg(p, now);
      // Se avanza desde que llegó su última orden, no desde el tick anterior: así cada orden
      // cuenta justo el tiempo que ha estado en vigor.
      let rem = Math.max(0, now - Math.max(p.intT || 0, prevTick)) / 1000;
      while (rem > 1e-6) { const h = Math.min(0.04, rem); stepPlayer(this.m, p, h, SPEED * this.settings.speed / 100, closed); rem -= h; }
      p.intT = now; p.lastIntX = p.x; p.lastIntY = p.y;
    }
    const dark = this.dark;
    const rx = this.reactor;
    // identidades visibles: el transformado se dibuja como su objetivo, y mientras se
    // transforma (los primeros instantes) todavía se le ve con su propia skin
    const sh = {};
    const mo = {};
    for (const q of this.players.values()) {
      if (!q.shiftTo || now >= q.shiftUntil) continue;
      if (now < q.shiftAt) mo[q.id] = q.shiftTo;
      else sh[q.id] = q.shiftTo;
    }
    const prog = this.taskTotal ? this.taskDone / this.taskTotal : 0;
    // Faroles: con el apagón, cada fantasma Farol ilumina a su alrededor un círculo de luz (varias
    // veces lo que ve un tripulante a oscuras). La luz sigue las paredes: no atraviesa muros.
    const lampR = Math.round(Math.round(420 * this.settings.vision / 100) * DARK_VISION * this.settings.lanternR / 100);
    const lamps = dark
      ? [...this.players.values()].filter((q) => !q.alive && q.ghost === 'lantern' && !q.offline).map((q) => ({ x: Math.round(q.x), y: Math.round(q.y), r: lampR }))
      : [];
    const conns = new Map(this.getConnections().map((c) => [c.id, c]));
    for (const p of this.players.values()) {
      const conn = conns.get(p.connId);
      if (!conn) continue;
      const ghost = !p.alive;
      // localizador: dónde está ahora el jugador que este Localizador tiene marcado
      const tt = p.trackerTarget ? this.players.get(p.trackerTarget) : null;
      const trk = tt && tt.alive && p.trackerUntil > now
        ? { id: tt.id, x: Math.round(tt.x), y: Math.round(tt.y), left: Math.max(0, p.trackerUntil - now) }
        : null;
      // Con apagón la tripulación apenas ve: un círculo muy corto a su alrededor, que se
      // come el ajuste de visión de la sala. Con luz, en cambio, la vista no tiene tope
      // circular: llega a todo lo que no tape un muro, así que la sala se ve entera y, por
      // una puerta abierta, el pasillo de enfrente.
      const base = Math.round(420 * this.settings.vision / 100);
      const darkCrew = dark && p.role === 'crew';
      const vr = ghost ? 0 : darkCrew ? Math.round(base * DARK_VISION) : base;
      const sr = ghost ? 0 : darkCrew ? vr : Math.round(SIGHT_BASE * this.settings.vision / 100);
      const blind = (p.blindUntil || 0) > now; // el Cegador le ha cegado: no ve a nadie ni nada
      const fullSr = Math.round(SIGHT_BASE * this.settings.vision / 100);
      // a oscuras, además de su círculo corto, se ve lo que alumbre un Farol (y ella lo vea)
      const lit = (o) => lamps.some((l) => Math.hypot(o.x - l.x, o.y - l.y) <= l.r && sees(this.m, l, o, l.r, closed) && sees(this.m, p, o, fullSr, closed));
      const seen = (o) => !blind && (ghost || sees(this.m, p, o, sr, closed) || (darkCrew && lamps.length > 0 && lit(o)));
      const ps = [];
      for (const q of this.players.values()) {
        if (q === p) continue;
        if (q.inVent) continue; // quien está en una rejilla no se ve
        if (!q.alive && !ghost) continue; // los vivos no ven fantasmas
        const qInvis = (q.invisUntil || 0) > now;
        // el Espectro invisible no lo ven los tripulantes (ni los fantasmas): como si no estuviera
        if (qInvis && p.role !== 'impostor') continue;
        if (seen(q)) ps.push([q.id, Math.round(q.x), Math.round(q.y), q.alive ? 1 : 0, qInvis ? 1 : 0, (q.blindUntil || 0) > now ? 1 : 0]);
      }
      const b = [];
      for (const bd of this.bodies) if (seen(bd)) b.push([bd.id, Math.round(bd.x), Math.round(bd.y), bd.color, this.bodyPhase(bd, now), Math.max(0, Math.min(60000, now - (bd.at || now)))]); // el 6º: ms desde que cayó (para la animación)
      conn.send({
        // bx/by: dónde empezó la orden en vigor (sq). El cliente reconstruye su posición a
        // partir de ahí con la duración de cada orden, igual que hace esta sala.
        t: 's', x: p.x, y: p.y, bx: Math.round((p.segX ?? p.x) * 10) / 10, by: Math.round((p.segY ?? p.y) * 10) / 10,
        a: p.alive ? 1 : 0, ps, b, prog, dark, vr, sr, vi: p.inVent ? 1 : 0,
        vleft: p.inVent && p.engineer ? Math.max(0, ENG_VENT_MS - (now - (p.ventAt || 0))) : 0,
        sciOn: p.sciOn ? 1 : 0,
        sciL: Math.max(0, p.sciLeft ?? SCI_BATTERY_MS),
        sciCd: Math.max(0, (p.sciReadyAt || 0) - now),
        // con el panel abierto la sala manda el estado de todos: ahí se ve quién sigue vivo
        vt: p.sciOn ? [...this.players.values()].map((q) => [q.id, q.alive ? 1 : 0]) : null,
        bu: p.meetUsed ? 1 : 0,
        sq: p.seq || 0,
        tm: now, // instante del cálculo: el cliente estira su predicción hasta aquí
        sh: Object.keys(sh).length ? sh : null,
        mo: Object.keys(mo).length ? mo : null,
        form: p.shiftTo ? { id: p.shiftTo, left: Math.max(0, p.shiftUntil - now), morph: now < p.shiftAt } : null,
        fz: this.frozen(p, now) && !(p.shiftTo && now < p.shiftAt) ? Math.max(0, p.frozenUntil - now) : 0,
        vcd: Math.max(0, (p.ventReadyAt || 0) - now),
        shcd: Math.max(0, (p.shiftReadyAt || 0) - now),
        inv: (p.invisUntil || 0) > now ? Math.max(0, p.invisUntil - now) : 0,
        icd: Math.max(0, (p.invisReadyAt || 0) - now),
        rx: rx ? { a: rx.a, b: rx.b, hold: rx.hold, left: Math.max(0, rx.until - now) } : null,
        kcd: Math.max(0, p.killReadyAt - now),
        scd: Math.max(0, this.sabLockAt - now),
        rcd: Math.max(0, this.rtLockAt - now),
        bcd: Math.max(0, (p.btnReadyAt || 0) - now),
        du: p.detectiveUsed ? 1 : 0,
        trk,
        trkcd: Math.max(0, (p.trackerReadyAt || 0) - now),
        gcd: Math.max(0, (p.guardReadyAt || 0) - now),
        kycd: Math.max(0, (p.keyReadyAt || 0) - now),     // espera del Guardallaves para volver a abrir una puerta
        blcd: Math.max(0, (p.blindReadyAt || 0) - now),   // espera del Cegador
        bl: blind ? Math.max(0, p.blindUntil - now) : 0,  // lo que le queda de ceguera
        lamps: lamps.length ? lamps.map((l) => [l.x, l.y, l.r]) : null,
        // puertas cerradas ahora mismo, con lo que les queda para abrirse
        drs: closed.map((d) => [d.id, Math.max(0, (this.doorAt.get(d.id) || 0) - now)]),
        // salas que no se pueden cerrar todavía: [sala, ms que le quedan]
        dcd: dcd.length ? dcd : null,
      });
    }
    if (now - this.savedAt > SAVE_EVERY_MS) this.save();
  }

  /* ---------- estado / persistencia ---------- */

  /* Cuántos impostores habrá con los jugadores de ahora: "auto" reparte 1 (2 a partir de 7) y
     nunca son tantos que la tripulación empiece en minoría. */
  impCount(n = this.players.size) {
    const maxImp = Math.max(1, Math.floor((n - 1) / 2));
    return Math.min(this.settings.imps === 0 ? (n >= 7 ? 2 : 1) : this.settings.imps, maxImp);
  }

  /* Tope de un ajuste de cantidad según los jugadores que hay: los roles de tripulante, tantos como
     tripulantes; los de impostor, tantos como impostores. Siempre cabe al menos uno (para poder
     encenderlo mientras los demás aún no han entrado). null = el ajuste no es una cantidad. */
  roleLimit(k, n = this.players.size) {
    if (k === 'imps') return Math.max(1, Math.floor((n - 1) / 2));
    const nImp = this.impCount(n);
    if (CREW_ROLE_KEYS.includes(k)) return Math.max(1, n - nImp);
    if (IMP_ROLE_KEYS.includes(k)) return Math.max(1, nImp);
    return null;
  }

  lobbyInfo() {
    return {
      t: 'lobby', phase: this.phase, code: this.code, hostId: this.hostSeat, map: this.map,
      min: MIN_PLAYERS, max: this.capacity, mode: this.mode, vis: this.visibility, want: this.want, country: this.country, colors: COLORS, settings: this.settings, ranges: RANGES,
      limits: { imps: this.roleLimit('imps'), crew: this.roleLimit('engineer'), imp: this.roleLimit('shifter'), nImp: this.impCount() },
      players: [...this.players.values()].map((p) => ({ id: p.id, name: p.name, color: p.color, offline: !!p.offline, bot: !!p.bot })),
      chat: this.lobbyChat,
    };
  }

  // Una reconexión conserva posición, secuencia y tareas; no es otra partida.
  sendState(p, conn) {
    conn.send({ t: 'joined', id: p.id, code: this.code });
    if (this.phase === 'lobby' || this.phase === 'ended') {
      conn.send(this.lobbyInfo());
      if (this.phase === 'ended' && this.lastEnd) conn.send(this.lastEnd);
      return;
    }
    const roster = [...this.players.values()].map((q) => ({ id: q.id, name: q.name, color: q.color }));
    const imps = [...this.players.values()].filter((q) => q.role === 'impostor').map((q) => q.id);
    conn.send({
      t: 'start', resync: true, seq: p.seq || 0, alive: p.alive, dark: this.dark,
      you: [p.x, p.y], role: p.role, phase: this.phase, mates: p.role === 'impostor' ? imps : [], roster, done: p.done,
      shifter: !!p.shifter, viper: !!p.viper, engineer: !!p.engineer, alerter: !!p.alerter, judge: !!p.judge, judgeUsed: !!p.judgeUsed, ghost: p.alive ? '' : (p.ghost || ''), angel: !!(p.ghost === 'angel' && !p.alive) /* el rol de fantasma solo se sabe al morir */, scientist: !!p.scientist, spectre: !!p.spectre, detective: !!p.detective, tracker: !!p.tracker, du: p.detectiveUsed ? 1 : 0,
      tasks: p.tasks.map((id) => ({ ...this.m.tasks[id], box: this.m.props[id] })),         vents: this.m.vents, world: this.m.world, floors: this.m.floors, obst: this.m.obst, sol: this.m.solid, doors: this.m.doors, button: this.m.button, panel: this.m.panel, map: this.map,
      rmeta: { core: this.m.reactor, pts: this.m.rpts, hold: REACTOR_HOLD_MS, ms: REACTOR_MS, range: HOLD_RANGE },
      speed: SPEED * this.settings.speed / 100, radius: RADIUS, killRange: KILL_RANGE, useRange: USE_RANGE, reportRange: REPORT_RANGE, trackRange: TRACK_RANGE, blindRange: BLIND_RANGE,
      bu: p.meetUsed ? 1 : 0,
    });
    const cur = p.inVent ? this.m.vents.find((v) => v.id === p.ventId) : null;
    if (cur) conn.send({ t: 'vent', in: true, id: cur.id, net: cur.net, vents: this.m.vents.filter((v) => v.net === cur.net) });
    if (p.sciOn) conn.send({ t: 'vitals', on: true }); // el panel seguía abierto: se le devuelve tal cual
    if (this.phase === 'meeting' && this.meeting) {
      conn.send(this.meetingMsg(this.meetCallerId, this.meetReason, this.meetBody));
    }
    if (this.phase === 'result' && this.lastResult) conn.send(this.lastResult);
    // El reloj del motor pertenece a la sala, no a la conexión de un jugador.
  }

  async save() {
    this.savedAt = Date.now();
    await this.rt.storage.put('st', {
      code: this.code, map: this.map, capacity: this.capacity, mode: this.mode, visibility: this.visibility, want: this.want, country: this.country, createdAt: this.createdAt, lang: this.lang, hostSeat: this.hostSeat, nextSeat: this.nextSeat, phase: this.phase,
      settings: this.settings, bodies: this.bodies, taskDone: this.taskDone, taskTotal: this.taskTotal,
      dark: this.dark, reactor: this.reactor, resultUntil: this.resultUntil, rolesUntil: this.rolesUntil,
      sabLockAt: this.sabLockAt, rtLockAt: this.rtLockAt,
      lastResult: this.lastResult, lastEnd: this.lastEnd, lobbyChat: this.lobbyChat, banned: [...this.banned], doorAt: [...this.doorAt], doorReady: [...this.doorReady], savedAt: this.savedAt,
      meeting: this.meeting
        ? { votes: [...this.meeting.votes.entries()], discussUntil: this.meeting.discussUntil, voteUntil: this.meeting.voteUntil, open: this.meeting.open }
        : null,
      players: [...this.players.values()].map((p) => ({ ...p, done: [...p.done] })),
    });
  }

  restore(s) {
    this.savedAt = s.savedAt || 0;
    this.code = s.code || null;
    this.hostSeat = s.hostSeat || null;
    this.nextSeat = s.nextSeat || 1;
    this.phase = s.phase || 'lobby';
    this.map = MAPS[s.map] ? s.map : DEFAULT_MAP;
    this.capacity = clamp(Number(s.capacity) || MAX_PLAYERS, MIN_PLAYERS, MAX_PLAYERS);
    this.mode = s.mode === 'bots' ? 'bots' : 'online';
    this.visibility = this.mode === 'bots' ? 'private' : s.visibility === 'private' || s.visibility === 'public' ? s.visibility : 'public';
    this.want = s.want === 'impostor' || s.want === 'crew' ? s.want : 'random';
    this.country = cleanCountry(s.country);
    this.createdAt = Number(s.createdAt) || 0;
    this.lang = s.lang === 'en' ? 'en' : 'es';
    this.settings = { ...DEFAULTS, ...(s.settings || {}) };
    this.bodies = Array.isArray(s.bodies) ? s.bodies : [];
    this.taskDone = s.taskDone || 0;
    this.taskTotal = s.taskTotal || 0;
    this.dark = !!s.dark;
    this.reactor = s.reactor || null;
    this.sabLockAt = s.sabLockAt || 0;
    this.rtLockAt = s.rtLockAt || 0;
    this.resultUntil = s.resultUntil || 0;
    this.rolesUntil = s.rolesUntil || 0;
    this.lastResult = s.lastResult || null;
    this.lastEnd = s.lastEnd || null;
    this.lobbyChat = Array.isArray(s.lobbyChat) ? s.lobbyChat : [];
    this.banned = new Set(Array.isArray(s.banned) ? s.banned : []);
    this.doorAt = new Map(Array.isArray(s.doorAt) ? s.doorAt : []);
    this.doorReady = new Map(Array.isArray(s.doorReady) ? s.doorReady : []);
    this.players = new Map();
    for (const p of s.players || []) {
      const q = { ...p, done: Array.isArray(p.done) ? p.done : [] };
      if (q.angel && !q.ghost) q.ghost = 'angel'; // partidas guardadas antes de los roles de fantasma
      delete q.angel;
      this.players.set(q.id, q);
    }
    this.bots.sync();
    this.meeting = s.meeting
      ? {
        votes: new Map(s.meeting.votes || []),
        discussUntil: s.meeting.discussUntil || 0,
        voteUntil: s.meeting.voteUntil || 0,
        open: !!s.meeting.open,
      }
      : null;
  }

  reset(code) {
    this.code = code || null;
    this.map = DEFAULT_MAP;
    this.capacity = MAX_PLAYERS;
    this.mode = 'online';
    this.want = 'random';
    this.visibility = 'public';
    this.country = '';
    this.createdAt = 0;
    this.lang = 'es';
    this.bots.clear();
    this.hostSeat = null;
    this.nextSeat = 1;
    this.phase = 'lobby';
    this.settings = { ...DEFAULTS };
    this.players = new Map();
    this.bodies = [];
    this.taskDone = 0;
    this.taskTotal = 0;
    this.dark = false;
    this.reactor = null;
    this.sabLockAt = 0;
    this.rtLockAt = 0;
    this.meeting = null;
    this.resultUntil = 0;
    this.rolesUntil = 0;
    this.lastResult = null;
    this.lastEnd = null;
    this.lobbyChat = [];
    this.banned = new Set();
    this.doorAt.clear();
    this.doorReady.clear();
    try { this.rt.cancelSchedule('room'); } catch (e) { /* no había latido pendiente */ }
    this.ensureLoop();
  }

  async hydrate() {
    const s = await this.rt.storage.get('st');
    if (s) this.restore(s);
    const live = new Map(this.rt.getConnections().map((c) => [c.id, c]));
    for (const p of this.players.values()) {
      if (p.bot) continue; // los bots no tienen socket: nunca "se desconectan"
      const conn = live.get(p.connId);
      if (conn) {
        p.offline = false;
        p.offlineSince = 0;
        this.sendState(p, conn);
      } else if (!p.offline) {
        p.offline = true;
        p.offlineSince = Date.now();
        p.dx = 0;
        p.dy = 0;
      }
    }
    // Fuera de la partida no hay bucle que barra a los desconectados: si la sala despertó
    // con jugadores fantasma, se retiran aquí para que no quede anunciada para siempre.
    this.pruneOffline();
    // Limpieza de salas abandonadas.
    if (this.phase !== 'lobby' && this.phase !== 'ended' && this.players.size === 0) this.reset(this.code);
    this.ensureLoop();
    // El anuncio de la sala y su latido tienen que sobrevivir a la hibernación.
    if (this.players.size > 0 && this.phase !== 'ended') this.armRoomSync();
    this.syncRoom();
  }

  /* ---------- anuncio de la sala (listado del menú) ---------- */
  /* El registro es solo publicidad: la autoridad sigue siendo esta instancia, que
     decide la admisión en onJoin. Ningún estado de partida pasa por aquí. */
  async syncRoom() {
    if (this.syncing) return; // ya hay una escritura en marcha: se reutiliza la siguiente pasada
    this.syncing = true;
    const code = this.code;
    this.roomSyncedAt = Date.now(); // se marca antes de escribir: evita ráfagas de llamadas
    try {
      if (!code) return;
      if (this.players.size === 0 || this.phase === 'ended' || this.visibility === 'private') {
        this.rt.registry.remove(code); // las salas privadas no salen en el listado
        return;
      }
      const host = this.players.get(this.hostSeat);
      this.rt.registry.update(code, {
        code,
        player_count: this.players.size,
        max_players: this.capacity,
        min_players: MIN_PLAYERS,
        status: this.phase === 'lobby' ? 'lobby' : 'playing',
        owner: host ? host.name : '',
        country: this.country,
        map: this.map,
        lang: this.lang,
        bots: [...this.players.values()].filter((q) => q.bot).length,
        created: this.createdAt || Date.now(),
      });
      this.syncErr = null;
    } catch (e) {
      // el listado es informativo: un fallo aquí nunca debe tumbar la partida
      this.syncErr = String((e && e.message) || e);
    } finally {
      this.syncing = false;
    }
  }

  armRoomSync() {
    try {
      this.rt.schedule('room', Date.now() + ROOM_SYNC_MS);
    } catch (e) {
      // sin latido: el anuncio se refresca igual cada vez que cambia algo
    }
  }

  /* ---------- envío a las conexiones WebSocket ---------- */

  getConnections() { return this.rt.getConnections(); }

  broadcast(msg) {
    for (const c of this.getConnections()) {
      try { c.send(msg); } catch (e) { /* conexión cerrada a media tanda */ }
    }
    this.bots.onBroadcast(msg); // los bots "oyen" lo mismo que todos (reuniones, resultados…)
  }

  /* Un bot habla: cada persona recibe la frase en SU idioma (y los demás bots, la frase ya entendida). */
  botSay(p, texts, struct) {
    const now = Date.now();
    if (!texts || now - (p.lastChatAt || 0) < 500) return false;
    const lobby = this.phase === 'lobby';
    if (!lobby && !(this.phase === 'meeting' && p.alive)) return false;
    if (!lobby) {
      // ni repetir palabra por palabra lo que otro bot acaba de escribir (salvo si es una prueba directa)
      const es = texts.es;
      this.botRecent = this.botRecent || [];
      if (!(struct && struct.kind === 'witness') && es && this.botRecent.includes(es)) return 'dup'; // ya se dijo: se descarta
      // los bots no pueden inundar el chat: un hueco entre mensajes de bots y un tope por reunión
      if (now - (this.botSayAt || 0) < 2200 || (this.botSayN || 0) >= 9) return false;
      this.botSayAt = now;
      this.botSayN = (this.botSayN || 0) + 1;
      if (es) this.botRecent = [...this.botRecent, es].slice(-10);
    }
    p.lastChatAt = now;
    const base = { id: p.id, name: p.name, color: p.color };
    const pick = (q) => texts[q.lang || this.lang] || texts.es;
    if (lobby) {
      const m = { ...base, text: texts[this.lang] || texts.es };
      this.lobbyChat = [...this.lobbyChat, m].slice(-LOBBY_CHAT_MAX);
      for (const q of this.players.values()) if (!q.bot) this.sendTo(q, { t: 'lchat', ...base, text: pick(q) });
    } else {
      for (const q of this.players.values()) if (!q.bot) this.sendTo(q, { t: 'chat', ...base, text: pick(q), dead: 0 });
      this.bots.onChatStruct(p, struct, now);
    }
    return true;
  }

  findByConn(connId) {
    for (const p of this.players.values()) if (p.connId === connId) return p;
    return null;
  }

  sendTo(p, msg) {
    if (p.bot) { this.bots.onPrivate(p, msg); return; }
    for (const c of this.getConnections()) if (c.id === p.connId) { c.send(msg); return; }
  }
}

/* País (ISO-2 en mayúsculas) o '' si no es un código válido. */
function cleanCountry(c) {
  const v = String(c || '').toUpperCase().trim();
  return /^[A-Z]{2}$/.test(v) && v !== 'XX' && v !== 'T1' ? v : '';
}

/* Ficha de la sala para el listado del menú (solo lectura: la autoridad sigue
   siendo la propia sala, que decide la admisión en onJoin). */
export function roomInfo(room) {
  return {
    code: room.code,
    players: room.players.size,
    max_players: room.capacity,
    min_players: MIN_PLAYERS,
    status: room.phase === 'lobby' ? 'lobby' : (room.phase === 'ended' ? 'ended' : 'playing'),
  };
}

export { MIN_PLAYERS, MAX_PLAYERS, CODE_RE };
export default GameRoom;
