/* Catálogo de escenarios. El motor de la sala manda el mapa de la partida por su id
   ('greenhouse' o 'micelaria'); aquí solo vive lo que enseña la interfaz: nombre,
   descripción y miniatura. El Invernadero es el de siempre y el que viene por defecto. */

export const MAPS = [
  {
    id: 'greenhouse',
    name: 'El Invernadero',
    blurb: 'Naves de cultivo, cámaras frías y maquinaria de laboratorio.',
    thumb: '/maps/greenhouse.svg',
  },
  {
    id: 'micelaria',
    name: 'Micelaria',
    blurb: 'Dentro de la seta madre, entre arroyos, cascadas y luciérnagas.',
    thumb: '/maps/micelaria.svg',
  },
];

export const DEFAULT_MAP = 'greenhouse';

export function mapName(id) {
  const m = MAPS.find((x) => x.id === id);
  return m ? m.name : MAPS[0].name;
}