/* La sala de espera: una cabaña de madera donde esperan los jugadores antes de la partida, como
   la nave de Among Us. Se anda con el mismo motor de movimiento que el resto de mapas.

   Tiene dos aparatos con los que se puede interactuar:
     el ordenador  (stations.computer)  ajustes de la partida: lo abre cualquiera, solo lo edita el anfitrión
     el armario    (stations.wardrobe)  cambiar el color del seta

   Todo va en píxeles reales (scale: 1). El suelo es un rectángulo; el muro es la corona de
   celdas que lo rodea. */

const WORLD = { w: 1400, h: 900 };

// el suelo transitable: 100..1300 × 100..800
const FLOORS = [
  [100, 100, 1200, 700, '#8a6a42', 'Sala de espera', 'planks', { key: 'lobby', noLabel: true }],
];

// [x, y, w, h, tipo]
const OBST = [
  // contra el muro del norte, a un lado el ordenador y al otro el armario
  [420, 100, 160, 80, 'computer'],
  [880, 100, 130, 110, 'wardrobe'],
  // mobiliario: estantes, mesa con bancos y macetas en las esquinas
  [100, 330, 70, 150, 'shelf'],
  [1230, 330, 70, 150, 'shelf'],
  [110, 110, 64, 64, 'planter'],
  [1226, 110, 64, 64, 'planter'],
  [110, 726, 64, 64, 'planter'],
  [1226, 726, 64, 64, 'planter'],
  [580, 640, 240, 40, 'bench'],
  [600, 740, 200, 36, 'bench'],
];

// dónde se pulsa "usar": delante de cada aparato, en el lado por el que se les llega
const STATIONS = {
  computer: { x: 500, y: 215, range: 125 },
  wardrobe: { x: 945, y: 245, range: 125 },
};

export const LOBBY = {
  scale: 1,
  world: WORLD,
  floors: FLOORS,
  obst: OBST,
  tasks: [],
  vents: [],
  doors: [],
  softCollide: false,
  button: { x: 700, y: 470 },
  spawn: { x: 700, y: 470 },
  panel: { x: 700, y: 470 },
  reactor: { x: 700, y: 470 },
  rpts: [],
  stations: STATIONS,
};
