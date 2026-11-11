import { trMark } from '@/lib/i18n';

/* Catálogo de escenarios. El motor de la sala manda el mapa de la partida por su id
   ('greenhouse', 'micelaria' o 'pantano'); aquí solo vive lo que enseña la interfaz: nombre,
   descripción y emblema (una ilustración simbólica por escenario, en public/maps/emblem-*.svg). El Invernadero es el de siempre y el que viene por defecto. */

export const MAPS = [
  {
    id: 'greenhouse',
    name: trMark('El Invernadero'),
    blurb: trMark('Naves de cultivo, cámaras frías y maquinaria de laboratorio.'),
    thumb: '/maps/emblem-greenhouse.svg',
  },
  {
    id: 'micelaria',
    name: trMark('Micelaria'),
    blurb: trMark('Una aldea de setas: casas con sombrero, plaza, arroyo, molino y cueva.'),
    thumb: '/maps/emblem-micelaria.svg',
  },
  {
    id: 'pantano',
    name: trMark('Pantano Esporado'),
    blurb: trMark('Un pantano misterioso: niebla, agua verdosa, muelles, árboles retorcidos, setas luminosas y una cueva.'),
    thumb: '/maps/emblem-pantano.svg',
  },
];

export const DEFAULT_MAP = 'greenhouse';

export function mapName(id) {
  const m = MAPS.find((x) => x.id === id);
  return m ? m.name : MAPS[0].name;
}